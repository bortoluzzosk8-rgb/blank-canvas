import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AutoSubstituteOptions {
  silent?: boolean; // Se true, não mostra toasts
  franchiseId?: string; // Filtrar por franquia de interesse (item OU venda)
  productName?: string; // Filtrar por produto específico
  maxIterations?: number; // Limite de passadas recursivas (para prevenir loops)
}

/**
 * Converte horário no formato "HH:MM" para minutos desde meia-noite
 */
function timeToMinutes(time: string | null): number | null {
  if (!time) return null;
  const parts = time.split(":");
  if (parts.length < 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

/**
 * Verifica e substitui automaticamente itens emprestados por itens locais disponíveis.
 * Executa em múltiplas passadas para resolver empréstimos cruzados.
 * Considera rotatividade de itens no mesmo dia (horário de devolução vs horário da festa).
 * Retorna a quantidade de substituições realizadas.
 */
export async function autoSubstituteItems(
  options: AutoSubstituteOptions = {}
): Promise<number> {
  const { silent = false, franchiseId, productName, maxIterations } = options;

  try {
    // 1. Buscar TODAS as vendas futuras com itens (incluindo horários)
    const salesQuery = supabase
      .from("sales")
      .select(`
        id,
        client_name,
        rental_start_date,
        return_date,
        party_start_time,
        return_time,
        franchise_id,
        sale_items!inner(
          id,
          inventory_item_id,
          inventory_items!inner(
            id,
            name,
            franchise_id
          )
        )
      `)
      .neq("status", "cancelled")
      .gte("rental_start_date", new Date().toISOString().split("T")[0]);

    const { data: salesData, error: salesError } = await salesQuery;

    if (salesError) throw salesError;

    // 2. Identificar vendas com itens emprestados (item.franchise_id != sale.franchise_id)
    const borrowedItemsToCheck: {
      sale: any;
      saleItem: any;
      invItem: any;
    }[] = [];

    for (const sale of salesData || []) {
      for (const saleItem of sale.sale_items || []) {
        const invItem = saleItem.inventory_items as any;
        if (
          invItem &&
          invItem.franchise_id &&
          invItem.franchise_id !== sale.franchise_id
        ) {
          // Se franchiseId foi especificado, queremos encontrar itens que:
          // 1. PERTENCEM a essa franquia (item emprestado DE lá) OU
          // 2. A VENDA é dessa franquia (para usar item local ao invés de emprestado)
          if (franchiseId) {
            const isItemFromTargetFranchise = invItem.franchise_id === franchiseId;
            const isSaleFromTargetFranchise = sale.franchise_id === franchiseId;
            if (!isItemFromTargetFranchise && !isSaleFromTargetFranchise) {
              continue; // Não relevante para esta franquia
            }
          }

          // Se productName foi especificado, filtrar apenas esse produto
          if (productName && invItem.name !== productName) {
            continue;
          }
          borrowedItemsToCheck.push({ sale, saleItem, invItem });
        }
      }
    }

    if (borrowedItemsToCheck.length === 0) {
      if (!silent) {
        toast.info("Nenhum item emprestado encontrado nas reservas futuras");
      }
      return 0;
    }

    // 3. Obter nomes únicos de itens para busca em lote
    const uniqueItemNames = [
      ...new Set(borrowedItemsToCheck.map((b) => b.invItem.name)),
    ];

    // 4. Buscar todos os itens locais potenciais
    const localItemsQuery = supabase
      .from("inventory_items")
      .select("id, name, franchise_id, status")
      .in("name", uniqueItemNames)
      .eq("status", "disponivel");

    const { data: allLocalItems } = await localItemsQuery;

    if (!allLocalItems || allLocalItems.length === 0) {
      if (!silent) {
        toast.info("Nenhum item local disponível para substituição");
      }
      return 0;
    }

    // 5. Buscar sale_items desses itens locais para verificar conflitos (incluindo horários)
    const localItemIds = allLocalItems.map((i) => i.id);
    const { data: allConflicts } = await supabase
      .from("sale_items")
      .select(
        `
        inventory_item_id,
        sales!inner(
          id,
          rental_start_date,
          return_date,
          party_start_time,
          return_time,
          status
        )
      `
      )
      .in("inventory_item_id", localItemIds);

    // 6. Construir mapa de conflitos por item
    const conflictsMap = new Map<string, any[]>();
    for (const conflict of allConflicts || []) {
      const itemId = conflict.inventory_item_id;
      if (!conflictsMap.has(itemId)) {
        conflictsMap.set(itemId, []);
      }
      conflictsMap.get(itemId)!.push(conflict.sales);
    }

    // 7. Função auxiliar para encontrar item local disponível
    function findAvailableLocalItem(
      itemName: string,
      targetFranchiseId: string,
      rentalStartDate: string,
      returnDate: string,
      partyStartTime: string | null,
      excludeItemId: string
    ): string | null {
      const localItems = (allLocalItems || []).filter(
        (i) =>
          i.name === itemName &&
          i.franchise_id === targetFranchiseId &&
          i.id !== excludeItemId
      );

      for (const localItem of localItems) {
        const itemConflicts = conflictsMap.get(localItem.id) || [];
        const hasConflict = itemConflicts.some((sale: any) => {
          if (!sale || sale.status === "cancelled") return false;
          
          const conflictStart = sale.rental_start_date;
          const conflictEnd = sale.return_date || sale.rental_start_date;
          const queryStart = rentalStartDate;
          const queryEnd = returnDate || rentalStartDate;
          
          // Se não há sobreposição de datas, não há conflito
          if (conflictStart > queryEnd || conflictEnd < queryStart) {
            return false;
          }
          
          // Se a devolução do conflito é no mesmo dia que o início da nova reserva,
          // verificar se há tempo de rotatividade (horário de devolução < horário da festa)
          if (conflictEnd === queryStart) {
            const conflictReturnMinutes = timeToMinutes(sale.return_time);
            const queryPartyMinutes = timeToMinutes(partyStartTime);
            
            // Se ambos os horários existem, verificar rotatividade
            if (conflictReturnMinutes !== null && queryPartyMinutes !== null) {
              // Se a devolução é pelo menos 1 hora antes da festa, permite rotatividade
              if (conflictReturnMinutes + 60 <= queryPartyMinutes) {
                return false; // Sem conflito - há tempo para rotatividade
              }
            }
          }
          
          // Se o início da nova reserva é no mesmo dia que a devolução,
          // verificar se a nova reserva termina antes da festa do conflito
          if (queryEnd === conflictStart) {
            const queryReturnMinutes = timeToMinutes(sale.return_time); // return_time da venda atual
            const conflictPartyMinutes = timeToMinutes(sale.party_start_time);
            
            // Este caso é menos comum, mas cobre quando estamos verificando o fim da nossa reserva
            // Por simplicidade, se as datas são iguais e não temos info suficiente, assumimos conflito
          }
          
          return true; // Há conflito
        });

        if (!hasConflict) {
          return localItem.id;
        }
      }

      return null;
    }

    // 8. Processar substituições
    let substitutionsCount = 0;
    const substitutionsMade: string[] = [];

    for (const { sale, saleItem, invItem } of borrowedItemsToCheck) {
      const localItemId = findAvailableLocalItem(
        invItem.name,
        sale.franchise_id,
        sale.rental_start_date || "",
        sale.return_date || sale.rental_start_date || "",
        sale.party_start_time,
        invItem.id
      );

      if (localItemId) {
        // Realizar a substituição
        const { error: updateError } = await supabase
          .from("sale_items")
          .update({ inventory_item_id: localItemId })
          .eq("id", saleItem.id);

        if (!updateError) {
          substitutionsCount++;
          substitutionsMade.push(`${invItem.name} (${sale.client_name})`);

          // Atualizar mapa de conflitos para incluir a nova atribuição
          if (!conflictsMap.has(localItemId)) {
            conflictsMap.set(localItemId, []);
          }
          conflictsMap.get(localItemId)!.push({
            id: sale.id,
            rental_start_date: sale.rental_start_date,
            return_date: sale.return_date,
            party_start_time: sale.party_start_time,
            return_time: sale.return_time,
            status: "active",
          });
        }
      }
    }

    // 9. Se houve substituições, tentar mais uma vez (pode ter liberado novos itens)
    // Isso resolve empréstimos cruzados onde A->B e B->A
    if (substitutionsCount > 0 && maxIterations === undefined) {
      const additionalSubs = await autoSubstituteItems({
        ...options,
        silent: true,
        maxIterations: 1, // Limitar a uma passada adicional para prevenir loops
      });
      substitutionsCount += additionalSubs;
    }

    if (!silent) {
      if (substitutionsCount > 0) {
        toast.success(
          `${substitutionsCount} item(s) substituído(s) por itens locais`,
          {
            description:
              substitutionsMade.slice(0, 3).join(", ") +
              (substitutionsMade.length > 3 ? "..." : ""),
          }
        );
      } else {
        toast.info("Nenhuma substituição possível no momento");
      }
    }

    return substitutionsCount;
  } catch (error: any) {
    console.error("Error in autoSubstituteItems:", error);
    if (!silent) {
      toast.error("Erro ao verificar substituições");
    }
    return 0;
  }
}
