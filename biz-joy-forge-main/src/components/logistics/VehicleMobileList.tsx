import { useMemo } from "react";
import { Car, Inbox, Package, Wrench, User, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MobileDeliveryCard } from "./MobileDeliveryCard";
import { generateRoutePdf } from "@/lib/generateRoutePdf";
import { toast } from "sonner";
import type { DeliveryItem, UnavailableEquipment } from "@/pages/admin/Logistics";

interface EquipmentToLoad {
  name: string;
  isUnavailable: boolean;
  unavailableReason?: string;
}

interface VehicleMobileListProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color: string;
  items: DeliveryItem[];
  selectedDate?: Date;
  onCheckIn?: (item: DeliveryItem) => void;
  onDeleteDepotEvent?: (item: DeliveryItem) => void;
  driverId?: string | null;
  driverName?: string | null;
  unavailableEquipments?: UnavailableEquipment[];
  isMotorista?: boolean;
}

export const VehicleMobileList = ({
  id,
  title,
  subtitle,
  icon,
  color,
  items,
  selectedDate,
  onCheckIn,
  onDeleteDepotEvent,
  driverId,
  driverName,
  unavailableEquipments = [],
  isMotorista = false,
}: VehicleMobileListProps) => {
  const montagemCount = useMemo(
    () => items.filter((i) => i.type === "montagem").length,
    [items]
  );
  
  const desmontagemCount = useMemo(
    () => items.filter((i) => i.type === "desmontagem").length,
    [items]
  );

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const timeA = a.scheduledTime.substring(0, 5);
      const timeB = b.scheduledTime.substring(0, 5);
      if (timeA !== timeB) return timeA.localeCompare(timeB);
      return a.orderPosition - b.orderPosition;
    });
  }, [items]);

  // Calcular equipamentos para evento de saída do depósito
  const calculateEquipmentsForDepotEvent = (depotEventIndex: number): EquipmentToLoad[] => {
    const currentEvent = sortedItems[depotEventIndex];
    if (!currentEvent || currentEvent.type !== "saida_deposito") return [];

    const equipments: EquipmentToLoad[] = [];
    const currentTime = currentEvent.scheduledTime.substring(0, 5);

    // Encontrar próxima volta ao depósito ou fim da lista
    let nextVoltaIndex = sortedItems.findIndex(
      (item, idx) => idx > depotEventIndex && item.type === "volta_deposito"
    );
    if (nextVoltaIndex === -1) nextVoltaIndex = sortedItems.length;

    // Coletar todos os produtos de montagem entre saída e volta
    const montagensNoIntervalo: { products: string[]; time: string }[] = [];
    const desmontagensNoIntervalo: { products: string[]; time: string }[] = [];

    for (let i = depotEventIndex + 1; i < nextVoltaIndex; i++) {
      const item = sortedItems[i];
      const itemTime = item.scheduledTime.substring(0, 5);
      
      if (item.type === "montagem") {
        montagensNoIntervalo.push({ products: item.products, time: itemTime });
      } else if (item.type === "desmontagem") {
        desmontagensNoIntervalo.push({ products: item.products, time: itemTime });
      }
    }

    // Para cada montagem, verificar se o produto será pego em uma desmontagem anterior
    montagensNoIntervalo.forEach((montagem) => {
      montagem.products.forEach((product) => {
        // Verificar se existe uma desmontagem deste produto ANTES desta montagem
        const desmontagemAnterior = desmontagensNoIntervalo.find(
          (d) => d.time < montagem.time && d.products.includes(product)
        );

        if (!desmontagemAnterior) {
          // Precisa carregar do depósito
          const unavailableInfo = unavailableEquipments.find(
            (u) => u.productName === product
          );

          equipments.push({
            name: product,
            isUnavailable: !!unavailableInfo,
            unavailableReason: unavailableInfo
              ? `Alugado: ${unavailableInfo.clientName} (devolução: ${unavailableInfo.returnDate})`
              : undefined,
          });
        }
      });
    });

    // Remover duplicatas
    const uniqueEquipments = equipments.filter(
      (eq, idx, self) => self.findIndex((e) => e.name === eq.name) === idx
    );

    return uniqueEquipments;
  };

  // Exportar PDF da rota
  const handleExportPdf = async () => {
    if (sortedItems.length === 0) {
      toast.error("Nenhum item na rota para exportar");
      return;
    }

    try {
      const routeItems = sortedItems.map((item, index) => {
        const equipments = item.type === "saida_deposito" 
          ? calculateEquipmentsForDepotEvent(index) 
          : undefined;
        
        return {
          time: item.scheduledTime,
          type: item.type,
          clientName: item.clientName || undefined,
          products: item.products.length > 0 ? item.products : undefined,
          address: item.address || undefined,
          city: item.city || undefined,
          state: item.state || undefined,
          phone: item.phone || undefined,
          remainingAmount: item.remainingAmount,
          notes: item.notes || undefined,
          equipments,
          partyTime: item.originalTime || undefined,
        };
      });

      await generateRoutePdf({
        vehicleName: title,
        vehiclePlate: subtitle,
        driverName: driverName || undefined,
        date: selectedDate || new Date(),
        items: routeItems,
      });

      toast.success("PDF da rota gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      {/* Header compacto */}
      <div
        className="px-4 py-3 flex flex-col gap-2"
        style={{ backgroundColor: color + "20", borderBottom: `3px solid ${color}` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon || <Car className="h-6 w-6" style={{ color }} />}
            <div>
              <h3 className="font-bold text-lg text-foreground">{title}</h3>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          
          {/* Contadores e botão PDF */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
              <Package className="h-3 w-3 mr-1" />
              {montagemCount}
            </Badge>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
              <Wrench className="h-3 w-3 mr-1" />
              {desmontagemCount}
            </Badge>
            {id !== "unassigned" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                className="h-8 px-2"
                title="Baixar PDF da Rota"
              >
                <FileDown className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Motorista */}
        {id !== "unassigned" && driverName && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="h-4 w-4" />
            <span>{driverName}</span>
          </div>
        )}
      </div>

      {/* Lista de entregas */}
      <div className="p-3 space-y-3">
        {sortedItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma entrega atribuída</p>
          </div>
        ) : (
          sortedItems.map((item, index) => (
            <MobileDeliveryCard
              key={item.id}
              item={item}
              onCheckIn={onCheckIn}
              onDeleteDepotEvent={onDeleteDepotEvent}
              calculatedEquipments={
                item.type === "saida_deposito"
                  ? calculateEquipmentsForDepotEvent(index)
                  : undefined
              }
              isMotorista={isMotorista}
            />
          ))
        )}
      </div>
    </div>
  );
};
