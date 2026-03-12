import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo } from "react";
import { Car, Inbox, Package, Wrench, User, Plus, Warehouse, Coffee, Truck as TruckIcon, Pencil, FileDown } from "lucide-react";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DeliveryRow } from "./DeliveryRow";
import { DepotEventRow } from "./DepotEventRow";
import { generateRoutePdf } from "@/lib/generateRoutePdf";
import { toast } from "sonner";
import type { DeliveryItem, UnavailableEquipment } from "@/pages/admin/Logistics";

interface Driver {
  id: string;
  name: string;
}

interface Vehicle {
  id: string;
  name: string;
  plate: string | null;
  color: string;
  franchise_id?: string | null;
}

interface EquipmentToLoad {
  name: string;
  isUnavailable: boolean;
  unavailableReason?: string;
}

interface VehicleTableProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  color: string;
  items: DeliveryItem[];
  selectedDate?: Date;
  onTimeChange?: (item: DeliveryItem, newTime: string) => void;
  onDateChange?: (item: DeliveryItem, newDate: string) => void;
  onCheckIn?: (item: DeliveryItem) => void;
  onDeleteDepotEvent?: (item: DeliveryItem) => void;
  onAddDepotEvent?: (vehicleId: string, vehicleName: string) => void;
  onEditVehicle?: (vehicle: Vehicle) => void;
  onEditAddress?: (saleId: string, address: { address: string; city: string; state: string; cep: string }) => Promise<void>;
  canDrag?: boolean;
  driverId?: string | null;
  driverName?: string | null;
  drivers?: Driver[];
  onDriverChange?: (vehicleId: string, driverId: string | null) => void;
  vehicleData?: Vehicle;
  unavailableEquipments?: UnavailableEquipment[];
  isMotorista?: boolean;
}

export const VehicleTable = ({
  id,
  title,
  subtitle,
  icon,
  color,
  items,
  selectedDate,
  onTimeChange,
  onDateChange,
  onCheckIn,
  onDeleteDepotEvent,
  onAddDepotEvent,
  onEditVehicle,
  onEditAddress,
  canDrag = true,
  driverId,
  driverName,
  drivers = [],
  onDriverChange,
  vehicleData,
  unavailableEquipments = [],
  isMotorista = false,
}: VehicleTableProps) => {
  const { setNodeRef, isOver } = useDroppable({ id });

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

  // Estrutura de equipamento para carregar com info de disponibilidade
  interface EquipmentToLoad {
    name: string;
    isUnavailable: boolean;
    unavailableReason?: string;
  }

  // Calcular equipamentos para cada saída do depósito
  // Desconta equipamentos que serão coletados em desmontagens anteriores
  const calculateEquipmentsForDepotEvent = (depotEventIndex: number): EquipmentToLoad[] => {
    if (sortedItems[depotEventIndex]?.type !== "saida_deposito") return [];

    // Coletar montagens e desmontagens até a próxima volta ao depósito
    const montagens: { product: string; time: string }[] = [];
    const desmontagens: { product: string; time: string }[] = [];
    
    for (let i = depotEventIndex + 1; i < sortedItems.length; i++) {
      const item = sortedItems[i];
      
      // Parar ao encontrar volta ao depósito
      if (item.type === "volta_deposito") break;
      
      // Registrar produtos das montagens com horário
      if (item.type === "montagem" && item.products.length > 0) {
        item.products.forEach(product => {
          montagens.push({ product, time: item.scheduledTime });
        });
      }
      
      // Registrar produtos das desmontagens com horário
      if (item.type === "desmontagem" && item.products.length > 0) {
        item.products.forEach(product => {
          desmontagens.push({ product, time: item.scheduledTime });
        });
      }
    }
    
    // Para cada montagem, verificar se tem desmontagem do mesmo produto ANTES
    const equipmentosParaCarregar: EquipmentToLoad[] = [];
    const desmontagensUsadas: number[] = [];
    
    montagens.forEach(({ product, time: montagemTime }) => {
      // Procurar desmontagem do mesmo produto ANTES da montagem (que ainda não foi usada)
      const desmontagemIndex = desmontagens.findIndex(
        (d, idx) => d.product === product && d.time < montagemTime && !desmontagensUsadas.includes(idx)
      );
      
      if (desmontagemIndex === -1) {
        // Não tem desmontagem antes, precisa carregar do depósito
        // Verificar se está indisponível (alugado em outro lugar)
        const unavailableInfo = unavailableEquipments.find(
          u => u.productName === product
        );
        
        equipmentosParaCarregar.push({
          name: product,
          isUnavailable: !!unavailableInfo,
          unavailableReason: unavailableInfo 
            ? `Alugado até ${unavailableInfo.returnDate ? new Date(unavailableInfo.returnDate).toLocaleDateString('pt-BR') : '?'} - ${unavailableInfo.clientName}`
            : undefined
        });
      } else {
        // Marcar a desmontagem como usada para não usar novamente
        desmontagensUsadas.push(desmontagemIndex);
      }
    });
    
    return equipmentosParaCarregar;
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
    <div
      ref={setNodeRef}
      className={`rounded-lg border bg-card overflow-hidden ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
    >
      {/* Cabeçalho do veículo */}
      <div
        className="px-4 py-3 flex items-center justify-between flex-wrap gap-2"
        style={{ backgroundColor: color + "20", borderBottom: `3px solid ${color}` }}
      >
        <div className="flex items-center gap-3">
          {icon || <Car className="h-5 w-5" style={{ color }} />}
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Seletor de Motorista - somente para veículos (não para "unassigned") */}
          {id !== "unassigned" && onDriverChange && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <Select
                value={driverId || "none"}
                onValueChange={(value) => onDriverChange(id, value === "none" ? null : value)}
              >
                <SelectTrigger className="w-[180px] h-8 text-sm bg-background">
                  <SelectValue placeholder="Selecionar motorista" />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="none">Sem motorista</SelectItem>
                  {drivers.map((driver) => (
                    <SelectItem key={driver.id} value={driver.id}>
                      {driver.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Exibir nome do motorista quando não pode editar */}
          {id !== "unassigned" && !onDriverChange && driverName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span>{driverName}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm">
              <Package className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-600">{montagemCount}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Wrench className="h-4 w-4 text-orange-600" />
              <span className="font-medium text-orange-600">{desmontagemCount}</span>
            </div>
            
            {/* Botão Editar Veículo */}
            {id !== "unassigned" && onEditVehicle && vehicleData && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEditVehicle(vehicleData)}
                className="h-7 px-2"
                title="Editar veículo"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}

            {/* Botão Adicionar Evento de Depósito */}
            {id !== "unassigned" && onAddDepotEvent && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddDepotEvent(id, title)}
                className="h-7 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Evento
              </Button>
            )}

            {/* Botão Exportar PDF */}
            {id !== "unassigned" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                className="h-7 px-2"
                title="Baixar PDF da Rota"
              >
                <FileDown className="h-3 w-3 mr-1" />
                PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <ScrollArea className="w-full">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {canDrag && <TableHead className="w-8 px-2"></TableHead>}
              <TableHead className="px-2 w-10">Tipo</TableHead>
              <TableHead className="px-2 min-w-[120px]">Cliente</TableHead>
              <TableHead className="px-2 min-w-[150px] bg-primary/10 font-semibold">Produtos</TableHead>
              <TableHead className="px-2 min-w-[150px]">Endereço</TableHead>
              <TableHead className="px-2 min-w-[80px]">Cidade</TableHead>
              <TableHead className="px-2 min-w-[100px]">Telefone</TableHead>
              <TableHead className="px-2 min-w-[90px]">Hr. Log.</TableHead>
              <TableHead className="px-2 min-w-[120px]">Data Log.</TableHead>
              <TableHead className="px-2 min-w-[60px]">Festa</TableHead>
              <TableHead className="px-2 min-w-[60px]">Hr. Comb.</TableHead>
              <TableHead className="px-2 min-w-[60px]">Data Orig.</TableHead>
              <TableHead className="px-2 min-w-[100px]">Obs.</TableHead>
              <TableHead className="px-2 min-w-[100px]">Monitor</TableHead>
              <TableHead className="px-2 min-w-[80px]">Valor</TableHead>
              <TableHead className="px-2 min-w-[90px]">Saldo</TableHead>
              <TableHead className="px-2 w-12">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <SortableContext items={sortedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {sortedItems.length === 0 ? (
                <TableRow>
                  <td colSpan={canDrag ? 17 : 16} className="text-center py-8 text-muted-foreground">
                    Nenhuma entrega atribuída
                  </td>
                </TableRow>
              ) : (
                sortedItems.map((item, index) => {
                  // Verificar se é um evento de depósito
                  const isDepotEvent = ["saida_deposito", "volta_deposito", "pausa"].includes(item.type);
                  
                  if (isDepotEvent) {
                    const equipments = item.type === "saida_deposito" 
                      ? calculateEquipmentsForDepotEvent(index) 
                      : [];
                    
                    return (
                      <DepotEventRow
                        key={item.id}
                        item={item}
                        onTimeChange={onTimeChange}
                        onDelete={onDeleteDepotEvent}
                        canDrag={canDrag}
                        calculatedEquipments={equipments}
                      />
                    );
                  }
                  
                  return (
                    <DeliveryRow
                      key={item.id}
                      item={item}
                      onTimeChange={onTimeChange}
                      onDateChange={onDateChange}
                      onCheckIn={onCheckIn}
                      onEditAddress={onEditAddress}
                      canDrag={canDrag}
                      isMotorista={isMotorista}
                    />
                  );
                })
              )}
            </SortableContext>
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
