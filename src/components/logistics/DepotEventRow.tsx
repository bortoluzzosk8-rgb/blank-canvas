import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Warehouse, Truck, Coffee, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import type { DeliveryItem } from "@/pages/admin/Logistics";

// Estrutura de equipamento para carregar
export interface EquipmentToLoad {
  name: string;
  isUnavailable: boolean;
  unavailableReason?: string;
}

interface DepotEventRowProps {
  item: DeliveryItem;
  onTimeChange?: (item: DeliveryItem, newTime: string) => void;
  onDelete?: (item: DeliveryItem) => void;
  canDrag?: boolean;
  calculatedEquipments?: EquipmentToLoad[];
}

const eventConfig = {
  saida_deposito: {
    label: "SAÍDA DO DEPÓSITO",
    shortLabel: "S",
    icon: Truck,
    bgClass: "bg-blue-50 dark:bg-blue-950/30",
    badgeClass: "bg-blue-600",
    iconClass: "text-blue-600",
  },
  volta_deposito: {
    label: "VOLTA AO DEPÓSITO",
    shortLabel: "V",
    icon: Warehouse,
    bgClass: "bg-purple-50 dark:bg-purple-950/30",
    badgeClass: "bg-purple-600",
    iconClass: "text-purple-600",
  },
  pausa: {
    label: "PAUSA / ALMOÇO",
    shortLabel: "P",
    icon: Coffee,
    bgClass: "bg-amber-50 dark:bg-amber-950/30",
    badgeClass: "bg-amber-600",
    iconClass: "text-amber-600",
  },
};

export const DepotEventRow = ({
  item,
  onTimeChange,
  onDelete,
  canDrag = true,
  calculatedEquipments = [],
}: DepotEventRowProps) => {
  const [editableTime, setEditableTime] = useState(item.scheduledTime.substring(0, 5));

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleTimeUpdate = () => {
    if (onTimeChange && editableTime !== item.scheduledTime.substring(0, 5)) {
      onTimeChange(item, editableTime);
    }
  };

  const config = eventConfig[item.type as keyof typeof eventConfig] || eventConfig.pausa;
  const IconComponent = config.icon;

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={`${config.bgClass} hover:bg-muted/50`}
    >
      {/* Drag handle */}
      {canDrag && (
        <TableCell className="w-8 px-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
        </TableCell>
      )}

      {/* Tipo */}
      <TableCell className="px-2">
        <Badge className={`text-xs ${config.badgeClass}`}>
          {config.shortLabel}
        </Badge>
      </TableCell>

      {/* Evento Nome */}
      <TableCell className="px-2 font-bold">
        <div className="flex items-center gap-2">
          <IconComponent className={`h-5 w-5 ${config.iconClass}`} />
          <span className={config.iconClass}>{config.label}</span>
        </div>
      </TableCell>

      {/* Equipamentos a carregar (para saída do depósito) */}
      <TableCell className="px-2" colSpan={1}>
        {item.type === "saida_deposito" && calculatedEquipments.length > 0 && (
          <TooltipProvider>
            <div className="text-xs max-w-[200px] space-y-0.5">
              <span className="font-semibold text-blue-700 dark:text-blue-400">Carregar:</span>
              {calculatedEquipments.map((equip, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  {equip.isUnavailable ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span>{equip.name}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[250px]">
                        <p className="text-xs">
                          <strong>⚠️ Indisponível no depósito</strong><br />
                          {equip.unavailableReason}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <span className="text-blue-700 dark:text-blue-400">{equip.name}</span>
                  )}
                </div>
              ))}
            </div>
          </TooltipProvider>
        )}
      </TableCell>

      {/* Células vazias para manter alinhamento */}
      <TableCell className="px-2" />
      <TableCell className="px-2" />
      <TableCell className="px-2" />

      {/* Horário Logística (editável) */}
      <TableCell className="px-2">
        <div className="flex items-center gap-1">
          <Input
            type="time"
            value={editableTime}
            onChange={(e) => setEditableTime(e.target.value)}
            onBlur={handleTimeUpdate}
            className="h-7 w-20 text-xs"
            disabled={!onTimeChange}
          />
        </div>
      </TableCell>

      {/* Células vazias */}
      <TableCell className="px-2" />
      <TableCell className="px-2" />
      <TableCell className="px-2" />
      <TableCell className="px-2" />

      {/* Observações */}
      <TableCell className="px-2 text-sm max-w-[100px] truncate" title={item.notes || ""}>
        {item.notes || "-"}
      </TableCell>

      {/* Células vazias para valor e saldo */}
      <TableCell className="px-2" />
      <TableCell className="px-2" />

      {/* Ações */}
      <TableCell className="px-2">
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(item)}
            className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};