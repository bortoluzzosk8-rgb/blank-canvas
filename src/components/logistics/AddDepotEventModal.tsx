import { useState } from "react";
import { Warehouse, Coffee, Truck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DepotEventType = "saida_deposito" | "volta_deposito" | "pausa";

interface AddDepotEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleName: string;
  onConfirm: (data: {
    type: DepotEventType;
    scheduledTime: string;
    notes: string;
  }) => void;
}

const eventTypes = [
  { value: "saida_deposito", label: "Saída do Depósito", icon: Truck, color: "text-blue-600" },
  { value: "volta_deposito", label: "Volta ao Depósito", icon: Warehouse, color: "text-purple-600" },
  { value: "pausa", label: "Pausa / Almoço", icon: Coffee, color: "text-amber-600" },
];

export const AddDepotEventModal = ({
  open,
  onOpenChange,
  vehicleId,
  vehicleName,
  onConfirm,
}: AddDepotEventModalProps) => {
  const [eventType, setEventType] = useState<DepotEventType>("saida_deposito");
  const [scheduledTime, setScheduledTime] = useState("08:00");
  const [notes, setNotes] = useState("");

  const handleConfirm = () => {
    onConfirm({
      type: eventType,
      scheduledTime: scheduledTime + ":00",
      notes,
    });
    
    // Reset form
    setEventType("saida_deposito");
    setScheduledTime("08:00");
    setNotes("");
    onOpenChange(false);
  };

  const selectedEvent = eventTypes.find(e => e.value === eventType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Warehouse className="h-5 w-5" />
            Adicionar Evento - {vehicleName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo de Evento */}
          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as DepotEventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <type.icon className={`h-4 w-4 ${type.color}`} />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview do tipo selecionado */}
          {selectedEvent && (
            <div className={`flex items-center gap-3 p-3 rounded-lg bg-muted`}>
              <selectedEvent.icon className={`h-6 w-6 ${selectedEvent.color}`} />
              <span className="font-medium">{selectedEvent.label}</span>
            </div>
          )}

          {/* Horário */}
          <div className="space-y-2">
            <Label htmlFor="time">Horário</Label>
            <Input
              id="time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Carregar equipamentos para festas da manhã..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Adicionar Evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};