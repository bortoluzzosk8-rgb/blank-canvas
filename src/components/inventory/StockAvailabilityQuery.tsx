import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Search, Package, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Franchise = {
  id: string;
  name: string;
  city: string;
};

type ReservationInfo = {
  clientName: string;
  rentalStartDate: string;
  returnDate: string;
  partyStartTime: string | null;
  returnTime: string | null;
  deliveryCity: string | null;
  franchiseName: string;
};

type AvailabilityResult = {
  productName: string;
  byFranchise: Record<string, number>;
  total: number;
  reservations: ReservationInfo[];
};

interface StockAvailabilityQueryProps {
  franchises: Franchise[];
}

const timeOptions = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, "0");
  return { value: `${hour}:00`, label: `${hour}:00` };
});

export function StockAvailabilityQuery({ franchises }: StockAvailabilityQueryProps) {
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [deliveryTime, setDeliveryTime] = useState<string>("14:00");
  const [returnTime, setReturnTime] = useState<string>("18:00");
  const [selectedFranchise, setSelectedFranchise] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<AvailabilityResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedReservations, setSelectedReservations] = useState<ReservationInfo[]>([]);

  const franchiseColumns = useMemo(() => {
    return franchises.map(f => ({
      id: f.id,
      name: f.name,
      city: f.city,
    }));
  }, [franchises]);

  // Filtrar colunas visíveis baseado na seleção
  const visibleFranchises = useMemo(() => {
    if (selectedFranchise === "all") {
      return franchiseColumns;
    }
    return franchiseColumns.filter(f => f.id === selectedFranchise);
  }, [selectedFranchise, franchiseColumns]);

  async function handleSearch() {
    if (!deliveryDate || !returnDate) {
      toast.error("Selecione as datas de entrega e retirada");
      return;
    }

    if (returnDate < deliveryDate) {
      toast.error("A data de retirada deve ser igual ou posterior à data de entrega");
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const deliveryDateStr = format(deliveryDate, "yyyy-MM-dd");
      const returnDateStr = format(returnDate, "yyyy-MM-dd");

      // Get all available inventory items
      let itemsQuery = supabase
        .from("inventory_items")
        .select("id, name, franchise_id, status")
        .eq("status", "disponivel");

      // Filtrar por franquia se selecionada
      if (selectedFranchise !== "all") {
        itemsQuery = itemsQuery.eq("franchise_id", selectedFranchise);
      }

      const { data: allItems, error: itemsError } = await itemsQuery;

      if (itemsError) throw itemsError;

      // Get all conflicting sales for the period with client info
      // IMPORTANTE: Quando uma franquia é selecionada, precisamos buscar TODAS as vendas
      // que usam os itens dessa franquia, independente de qual franquia fez a venda
      console.log("🔍 [StockAvailabilityQuery] Selected franchise:", selectedFranchise);
      
      // Criar um Set com os IDs dos itens da franquia selecionada para filtragem posterior
      const selectedFranchiseItemIds = new Set(
        selectedFranchise !== "all" 
          ? (allItems || []).map(item => item.id)
          : []
      );
      console.log("🔍 [StockAvailabilityQuery] Selected franchise item IDs:", selectedFranchiseItemIds.size);
      
      // Buscar TODAS as vendas no período, sem filtrar por franquia
      // A filtragem será feita depois, pelos inventory_item_id dos itens da franquia selecionada
      const salesQuery = supabase
        .from("sales")
        .select(`
          id,
          client_name,
          rental_start_date,
          return_date,
          party_start_time,
          return_time,
          delivery_city,
          franchise_id,
          sale_items!inner(inventory_item_id, product_name)
        `)
        .neq("status", "cancelled")
        .or(`rental_start_date.lte.${returnDateStr},return_date.gte.${deliveryDateStr}`);

      const { data: conflictingSales, error: salesError } = await salesQuery;

      console.log("🔍 [StockAvailabilityQuery] Sales query returned:", conflictingSales?.length, "results");

      if (salesError) throw salesError;

      // Find conflicting item IDs and track reservations by product
      const conflictingItemIds = new Set<string>();
      const reservationsByProduct: Record<string, ReservationInfo[]> = {};

      for (const sale of (conflictingSales || [])) {
        const saleStart = sale.rental_start_date;
        const saleEnd = sale.return_date;
        const salePartyTime = sale.party_start_time;
        const saleReturnTime = sale.return_time; // Horário de retirada da reserva existente

        // Verificar se há sobreposição de datas
        const datesOverlap = 
          saleStart && saleEnd && 
          saleStart <= returnDateStr && 
          saleEnd >= deliveryDateStr;

        // Se as datas se sobrepõem, verificar se há conflito real de horário
        let hasRealConflict = false;

        if (datesOverlap) {
          // Caso 1: Data de término da reserva existente = Data de entrega desejada
          // Verifica se o equipamento já terá sido retirado antes do horário de entrega
          if (saleEnd === deliveryDateStr && saleStart !== deliveryDateStr) {
            if (saleReturnTime && deliveryTime) {
              const existingReturnHour = parseInt(saleReturnTime.split(":")[0], 10);
              const newDeliveryHour = parseInt(deliveryTime.split(":")[0], 10);
              
              // Se a retirada da reserva existente é ANTES da entrega desejada, NÃO há conflito
              hasRealConflict = existingReturnHour >= newDeliveryHour;
            } else {
              // Se não temos informação de horário, assumir conflito por segurança
              hasRealConflict = true;
            }
          }
          // Caso 2: Data de início da reserva existente = Data de retirada desejada
          // Verifica se o equipamento será montado depois do horário de retirada desejado
          else if (saleStart === returnDateStr && saleEnd !== returnDateStr) {
            if (salePartyTime && returnTime) {
              const existingPartyHour = parseInt(salePartyTime.split(":")[0], 10);
              const newReturnHour = parseInt(returnTime.split(":")[0], 10);
              
              // Se a festa da reserva existente é DEPOIS da retirada desejada, NÃO há conflito
              hasRealConflict = existingPartyHour <= newReturnHour;
            } else {
              // Se não temos informação de horário, assumir conflito por segurança
              hasRealConflict = true;
            }
          }
          // Caso 3: Sobreposição total de datas (não são dias de fronteira) ou mesmo dia
          else {
            hasRealConflict = true;
          }
        }

        // Verificação adicional para mesmo dia: verificar horários
        const isSameDay = saleStart === deliveryDateStr && saleEnd === deliveryDateStr;
        let hasSameDayTimeConflict = false;
        
        if (isSameDay && salePartyTime && deliveryTime) {
          const saleHour = parseInt(salePartyTime.split(":")[0], 10);
          const newHour = parseInt(deliveryTime.split(":")[0], 10);
          // Conflito se as festas são muito próximas (menos de 1 hora de diferença)
          hasSameDayTimeConflict = Math.abs(saleHour - newHour) < 1;
        }

        if (hasRealConflict || hasSameDayTimeConflict) {
          for (const item of (sale.sale_items || [])) {
            if (item.inventory_item_id) {
              // CORREÇÃO: Quando uma franquia está selecionada, só marca como conflito
              // se o item de inventário pertence à franquia selecionada
              const shouldConsiderConflict = 
                selectedFranchise === "all" || 
                selectedFranchiseItemIds.has(item.inventory_item_id);
              
              if (shouldConsiderConflict) {
                conflictingItemIds.add(item.inventory_item_id);
              }
            }
            
            // Track reservation info by product name
            // Também só rastreia reservas de itens da franquia selecionada
            const productName = (item.product_name || "").trim();
            const shouldTrackReservation = 
              selectedFranchise === "all" || 
              selectedFranchiseItemIds.has(item.inventory_item_id);
            
            if (productName && shouldTrackReservation) {
              if (!reservationsByProduct[productName]) {
                reservationsByProduct[productName] = [];
              }
              const franchise = franchises.find(f => f.id === sale.franchise_id);
              reservationsByProduct[productName].push({
                clientName: sale.client_name || "Cliente não informado",
                rentalStartDate: sale.rental_start_date,
                returnDate: sale.return_date,
                partyStartTime: sale.party_start_time,
                returnTime: sale.return_time,
                deliveryCity: sale.delivery_city,
                franchiseName: franchise?.city || franchise?.name || "N/A",
              });
            }
          }
        }
      }

      // Group ALL items by product name and franchise (available or not)
      const allGrouped: Record<string, Record<string, { total: number; conflicting: number }>> = {};

      for (const item of (allItems || [])) {
        const name = item.name.trim();
        const franchiseId = item.franchise_id || "unknown";

        if (!allGrouped[name]) {
          allGrouped[name] = {};
        }
        if (!allGrouped[name][franchiseId]) {
          allGrouped[name][franchiseId] = { total: 0, conflicting: 0 };
        }
        
        allGrouped[name][franchiseId].total++;
        
        // Mark if this item is in conflict
        if (conflictingItemIds.has(item.id)) {
          allGrouped[name][franchiseId].conflicting++;
        }
      }

      // Convert to array of results (calculating available = total - conflicting)
      const resultsArray: AvailabilityResult[] = Object.entries(allGrouped)
        .map(([productName, byFranchiseData]) => {
          const byFranchise: Record<string, number> = {};
          let total = 0;
          
          for (const [franchiseId, counts] of Object.entries(byFranchiseData)) {
            const available = counts.total - counts.conflicting;
            byFranchise[franchiseId] = available;
            total += available;
          }
          
          return {
            productName,
            byFranchise,
            total,
            reservations: reservationsByProduct[productName] || [],
          };
        })
        .sort((a, b) => a.productName.localeCompare(b.productName));

      setResults(resultsArray);
    } catch (error: any) {
      console.error("Error searching availability:", error);
      toast.error("Erro ao consultar disponibilidade");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Consultar Disponibilidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            {/* Data de Entrega */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Entrega</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deliveryDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deliveryDate ? (
                      format(deliveryDate, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecionar data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deliveryDate}
                    onSelect={setDeliveryDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Horário de Entrega */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Horário de Entrega</label>
              <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar horário" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data de Retirada */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Retirada</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !returnDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {returnDate ? (
                      format(returnDate, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecionar data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={returnDate}
                    onSelect={setReturnDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Horário de Retirada */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Horário de Retirada</label>
              <Select value={returnTime} onValueChange={setReturnTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar horário" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unidade */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Unidade</label>
              <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as unidades</SelectItem>
                  {franchises.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.city || f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSearch} disabled={loading} className="w-full md:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Consultar Disponibilidade
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {hasSearched && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Disponibilidade para{" "}
              {deliveryDate && format(deliveryDate, "dd/MM/yyyy", { locale: ptBR })} {deliveryTime}
              {" → "}
              {returnDate && format(returnDate, "dd/MM/yyyy", { locale: ptBR })} {returnTime}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum equipamento disponível para o período selecionado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Produto</TableHead>
                    {visibleFranchises.map((f) => (
                      <TableHead key={f.id} className="text-center min-w-[120px]">
                        <div className="flex flex-col items-center">
                          <span className="font-semibold">{f.city || f.name}</span>
                          <span className="text-xs font-normal text-muted-foreground">Disponíveis</span>
                        </div>
                      </TableHead>
                    ))}
                      <TableHead className="text-center font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.productName}>
                        <TableCell className="font-medium">
                          <button
                            onClick={() => {
                              setSelectedProduct(result.productName);
                              setSelectedReservations(result.reservations);
                            }}
                            className="text-left hover:text-primary hover:underline cursor-pointer flex items-center gap-2"
                          >
                            {result.productName}
                            {result.reservations.length > 0 && (
                              <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full">
                                {result.reservations.length} reserva(s)
                              </span>
                            )}
                          </button>
                        </TableCell>
                        {visibleFranchises.map((f) => (
                          <TableCell key={f.id} className="text-center">
                            <span
                              className={cn(
                                "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                                result.byFranchise[f.id] > 0
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              {result.byFranchise[f.id] || 0}
                            </span>
                          </TableCell>
                        ))}
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center w-10 h-8 rounded-full bg-primary/10 text-primary font-bold">
                            {result.total}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Reservas */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Reservas de {selectedProduct}
            </DialogTitle>
          </DialogHeader>
          
          {selectedReservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma reserva encontrada para este período
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Horário Festa</TableHead>
                  <TableHead>Horário Retirada</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Unidade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedReservations.map((res, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{res.clientName}</TableCell>
                    <TableCell>
                      {format(parseISO(res.rentalStartDate), "dd/MM", { locale: ptBR })}
                      {res.rentalStartDate !== res.returnDate && (
                        <> - {format(parseISO(res.returnDate), "dd/MM", { locale: ptBR })}</>
                      )}
                    </TableCell>
                    <TableCell>{res.partyStartTime?.substring(0, 5) || "-"}</TableCell>
                    <TableCell>{res.returnTime?.substring(0, 5) || "-"}</TableCell>
                    <TableCell>{res.deliveryCity || "-"}</TableCell>
                    <TableCell>{res.franchiseName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
