import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DeliveryCard } from "./DeliveryCard";
import type { DeliveryItem } from "@/pages/admin/Logistics";

interface VehicleColumnProps {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  items: DeliveryItem[];
  onTimeChange?: (item: DeliveryItem, newTime: string) => void;
  onDateChange?: (item: DeliveryItem, newDate: string) => void;
  onCheckIn?: (item: DeliveryItem) => void;
  timeSlots?: string[];
  canDrag?: boolean;
}

export const VehicleColumn = ({
  id,
  title,
  subtitle,
  icon,
  color,
  items,
  onTimeChange,
  onDateChange,
  onCheckIn,
  timeSlots,
  canDrag = true,
}: VehicleColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  // Agrupar itens por hora
  const itemsByTime: Record<string, DeliveryItem[]> = {};
  items.forEach((item) => {
    const hour = item.scheduledTime.substring(0, 5);
    if (!itemsByTime[hour]) {
      itemsByTime[hour] = [];
    }
    itemsByTime[hour].push(item);
  });

  const montagemCount = items.filter((i) => i.type === "montagem").length;
  const desmontagemCount = items.filter((i) => i.type === "desmontagem").length;

  return (
    <Card
      ref={setNodeRef}
      className={`transition-all ${isOver ? "ring-2 ring-primary" : ""}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-emerald-500" />
            {montagemCount}
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded bg-orange-500" />
            {desmontagemCount}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-[500px] pr-2">
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Arraste itens para cá
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <DeliveryCard
                    key={item.id}
                    item={item}
                    onTimeChange={onTimeChange ? (newTime) => onTimeChange(item, newTime) : undefined}
                    onDateChange={onDateChange ? (newDate) => onDateChange(item, newDate) : undefined}
                    onCheckIn={onCheckIn ? () => onCheckIn(item) : undefined}
                    canDrag={canDrag}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
