import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Vehicle {
  id: string;
  name: string;
  plate: string | null;
  color: string;
  franchise_id: string | null;
}

interface AddVehicleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  franchiseId: string | null;
  onVehicleAdded: (vehicle: Vehicle) => void;
}

const VEHICLE_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
];

export const AddVehicleModal = ({
  open,
  onOpenChange,
  franchiseId,
  onVehicleAdded,
}: AddVehicleModalProps) => {
  const [name, setName] = useState("");
  const [plate, setPlate] = useState("");
  const [color, setColor] = useState(VEHICLE_COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Digite o nome do veículo");
      return;
    }

    if (!franchiseId) {
      toast.error("Selecione uma unidade antes de adicionar veículos");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("logistics_vehicles")
        .insert({
          name: name.trim(),
          plate: plate.trim() || null,
          color,
          franchise_id: franchiseId,
        })
        .select()
        .single();

      if (error) throw error;

      onVehicleAdded(data);
      setName("");
      setPlate("");
      setColor(VEHICLE_COLORS[0]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding vehicle:", error);
      toast.error("Erro ao adicionar veículo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Adicionar Veículo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Veículo *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carro 1, Van Azul, Fiorino"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plate">Placa (opcional)</Label>
            <Input
              id="plate"
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="ABC-1234"
              maxLength={8}
            />
          </div>

          <div className="space-y-2">
            <Label>Cor de Identificação</Label>
            <div className="flex flex-wrap gap-2">
              {VEHICLE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
