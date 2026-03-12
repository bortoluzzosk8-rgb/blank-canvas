import { ArchivedEquipment } from "@/types/inventory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trash2 } from "lucide-react";

type DeletedEquipmentTableProps = {
  arq: ArchivedEquipment[];
  franchiseNameById: (id: string) => string;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
};

export const DeletedEquipmentTable = ({
  arq,
  franchiseNameById,
  onRestore,
  onDelete,
}: DeletedEquipmentTableProps) => {
  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getReasonBadge = (reason: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      vendido: { variant: "default", label: "Vendido" },
      sucateado: { variant: "destructive", label: "Sucateado" },
      outro: { variant: "secondary", label: "Outro" },
    };
    const config = variants[reason] || variants.outro;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (arq.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Nenhum equipamento excluído</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {arq.map((item) => (
        <Card key={item.id} className="p-4">
          <div className="flex items-start gap-4">
            {item.imageUrl?.[0] ? (
              <img
                src={item.imageUrl[0]}
                alt={item.name}
                className="w-16 h-16 object-cover rounded-md border opacity-50"
              />
            ) : (
              <div className="w-16 h-16 flex items-center justify-center bg-muted rounded-md border opacity-50">
                📦
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">Código: {item.code}</p>
                </div>
                {getReasonBadge(item.reason)}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Valor:</p>
                  <p className="font-semibold">{formatCurrency(item.value)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Unidade:</p>
                  <p className="font-semibold">{franchiseNameById(item.franchiseId)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Excluído em:</p>
                  <p className="font-semibold">
                    {new Date(item.deletedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>

              {item.notes && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <p className="text-muted-foreground">
                    <strong>Observação:</strong> {item.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onRestore(item.id)}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Restaurar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(item.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
