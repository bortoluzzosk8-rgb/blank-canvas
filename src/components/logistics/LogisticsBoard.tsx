import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "lucide-react";
import { VehicleTable } from "./VehicleTable";
import { VehicleMobileList } from "./VehicleMobileList";
import { DeliveryCard } from "./DeliveryCard";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DeliveryItem, UnavailableEquipment } from "@/pages/admin/Logistics";

interface Vehicle {
  id: string;
  name: string;
  plate: string | null;
  color: string;
  franchise_id?: string | null;
  driverId?: string | null;
  driverName?: string | null;
}

interface Driver {
  id: string;
  name: string;
}

interface LogisticsBoardProps {
  vehicles: Vehicle[];
  deliveryItems: DeliveryItem[];
  loading: boolean;
  selectedDate?: Date;
  onAssignmentChange: (item: DeliveryItem, vehicleId: string | null, time: string, position: number, logisticsDate?: string) => void;
  onCheckIn?: (item: DeliveryItem) => void;
  onDeleteDepotEvent?: (item: DeliveryItem) => void;
  onAddDepotEvent?: (vehicleId: string, vehicleName: string) => void;
  onEditVehicle?: (vehicle: Vehicle) => void;
  onEditAddress?: (saleId: string, address: { address: string; city: string; state: string; cep: string }) => Promise<void>;
  canDrag?: boolean;
  drivers?: Driver[];
  onDriverChange?: (vehicleId: string, driverId: string | null) => void;
  unavailableEquipments?: UnavailableEquipment[];
  isMotorista?: boolean;
}

const TIME_SLOTS = [
  "06:00", "07:00", "08:00", "09:00", "10:00", "11:00",
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
  "18:00", "19:00", "20:00", "21:00", "22:00"
];

export const LogisticsBoard = ({
  vehicles,
  deliveryItems,
  loading,
  selectedDate,
  onAssignmentChange,
  onCheckIn,
  onDeleteDepotEvent,
  onAddDepotEvent,
  onEditVehicle,
  onEditAddress,
  canDrag = true,
  drivers = [],
  onDriverChange,
  unavailableEquipments = [],
  isMotorista = false,
}: LogisticsBoardProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Agrupar itens por veículo
  const itemsByVehicle = useMemo(() => {
    const grouped: Record<string, DeliveryItem[]> = {
      unassigned: [],
    };

    vehicles.forEach((v) => {
      grouped[v.id] = [];
    });

    deliveryItems.forEach((item) => {
      if (item.vehicleId && grouped[item.vehicleId]) {
        grouped[item.vehicleId].push(item);
      } else {
        grouped.unassigned.push(item);
      }
    });

    // Ordenar por horário e posição
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        const timeA = a.scheduledTime.substring(0, 5);
        const timeB = b.scheduledTime.substring(0, 5);
        if (timeA !== timeB) return timeA.localeCompare(timeB);
        return a.orderPosition - b.orderPosition;
      });
    });

    return grouped;
  }, [deliveryItems, vehicles]);

  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return deliveryItems.find((item) => item.id === activeId);
  }, [activeId, deliveryItems]);

  const handleDragStart = (event: DragStartEvent) => {
    if (!canDrag) return;
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!canDrag || !over) return;

    const activeItem = deliveryItems.find((item) => item.id === active.id);
    if (!activeItem) return;

    const overId = over.id as string;

    // Verificar se soltou em um veículo ou em "unassigned"
    let targetVehicleId: string | null = null;
    let targetTime = activeItem.scheduledTime;

    if (overId === "unassigned") {
      targetVehicleId = null;
    } else if (vehicles.find((v) => v.id === overId)) {
      targetVehicleId = overId;
    } else if (overId.startsWith("slot-")) {
      // Formato: slot-vehicleId-HH:MM
      const parts = overId.split("-");
      targetVehicleId = parts[1];
      targetTime = `${parts[2]}:00:00`;
    } else {
      // Pode ser outro card, pegar o veículo dele
      const otherItem = deliveryItems.find((item) => item.id === overId);
      if (otherItem) {
        targetVehicleId = otherItem.vehicleId;
      }
    }

    // Calcular nova posição
    const itemsInTarget = itemsByVehicle[targetVehicleId || "unassigned"] || [];
    const newPosition = itemsInTarget.length;

    if (activeItem.vehicleId !== targetVehicleId || activeItem.scheduledTime !== targetTime) {
      onAssignmentChange(activeItem, targetVehicleId, targetTime, newPosition);
    }
  };

  const handleTimeChange = (item: DeliveryItem, newTime: string) => {
    if (!canDrag) return;
    onAssignmentChange(item, item.vehicleId, `${newTime}:00`, item.orderPosition, item.logisticsDate);
  };

  const handleDateChange = (item: DeliveryItem, newDate: string) => {
    if (!canDrag) return;
    onAssignmentChange(item, item.vehicleId, item.scheduledTime, item.orderPosition, newDate);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Renderização Mobile - Cards empilhados sem drag-and-drop
  if (isMobile) {
    return (
      <div className="flex flex-col gap-4">
        {/* Seção de não atribuídos - ocultar para motoristas */}
        {!isMotorista && (
          <VehicleMobileList
            id="unassigned"
            title="Não Atribuído"
            icon={<Inbox className="w-6 h-6 text-muted-foreground" />}
            color="#6B7280"
            items={itemsByVehicle.unassigned || []}
            selectedDate={selectedDate}
            onCheckIn={onCheckIn}
            onDeleteDepotEvent={onDeleteDepotEvent}
            unavailableEquipments={unavailableEquipments}
            isMotorista={isMotorista}
          />
        )}

        {/* Seções de veículos */}
        {vehicles.map((vehicle) => (
          <VehicleMobileList
            key={vehicle.id}
            id={vehicle.id}
            title={vehicle.name}
            subtitle={vehicle.plate || undefined}
            color={vehicle.color}
            items={itemsByVehicle[vehicle.id] || []}
            selectedDate={selectedDate}
            onCheckIn={onCheckIn}
            onDeleteDepotEvent={onDeleteDepotEvent}
            driverId={vehicle.driverId}
            driverName={vehicle.driverName}
            unavailableEquipments={unavailableEquipments}
            isMotorista={isMotorista}
          />
        ))}
      </div>
    );
  }

  // Renderização Desktop - Tabela com drag-and-drop
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-4">
        {/* Seção de não atribuídos - ocultar para motoristas */}
        {!isMotorista && (
          <VehicleTable
            id="unassigned"
            title="Não Atribuído"
            icon={<Inbox className="w-5 h-5 text-muted-foreground" />}
            color="#6B7280"
            items={itemsByVehicle.unassigned || []}
            selectedDate={selectedDate}
            onTimeChange={canDrag ? handleTimeChange : undefined}
            onDateChange={canDrag ? handleDateChange : undefined}
            onCheckIn={onCheckIn}
            onDeleteDepotEvent={onDeleteDepotEvent}
            onEditAddress={onEditAddress}
            canDrag={canDrag}
            unavailableEquipments={unavailableEquipments}
            isMotorista={isMotorista}
          />
        )}

        {/* Seções de veículos */}
        {vehicles.map((vehicle) => (
          <VehicleTable
            key={vehicle.id}
            id={vehicle.id}
            title={vehicle.name}
            subtitle={vehicle.plate || undefined}
            color={vehicle.color}
            items={itemsByVehicle[vehicle.id] || []}
            selectedDate={selectedDate}
            onTimeChange={canDrag ? handleTimeChange : undefined}
            onDateChange={canDrag ? handleDateChange : undefined}
            onCheckIn={onCheckIn}
            onDeleteDepotEvent={onDeleteDepotEvent}
            onAddDepotEvent={onAddDepotEvent}
            onEditVehicle={onEditVehicle}
            onEditAddress={onEditAddress}
            canDrag={canDrag}
            driverId={vehicle.driverId}
            driverName={vehicle.driverName}
            drivers={drivers}
            onDriverChange={onDriverChange}
            vehicleData={vehicle}
            unavailableEquipments={unavailableEquipments}
            isMotorista={isMotorista}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          <div className="cursor-grabbing">
            <DeliveryCard item={activeItem} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
