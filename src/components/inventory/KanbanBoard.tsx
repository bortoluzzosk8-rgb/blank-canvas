import { Equipment } from "@/types/inventory";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, WrenchIcon, CheckCircle, AlertCircle, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type KanbanBoardProps = {
  columns: {
    disponivel: Equipment[];
    manutencao: Equipment[];
  };
  totals: {
    disponivel: number;
    manutencao: number;
  };
  franchiseNameById: (id: string) => string;
  onMoveStatus: (id: string, status: 'disponivel' | 'manutencao') => void;
  onEdit: (eq: Equipment) => void;
  onDelete: (eq: Equipment) => void;
  onEditMaintenanceNote: (id: string) => void;
  onViewHistory: (itemId: string) => void;
  readOnly?: boolean;
};

export const KanbanBoard = ({
  columns,
  totals,
  franchiseNameById,
  onMoveStatus,
  onEdit,
  onDelete,
  onEditMaintenanceNote,
  onViewHistory,
  readOnly = false,
}: KanbanBoardProps) => {
  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const renderEquipmentCard = (eq: Equipment) => {
    const firstImage = eq.imageUrl?.[0];
    return (
      <Card key={eq.id} className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {firstImage ? (
            <img
              src={firstImage}
              alt={eq.name}
              className="w-16 h-16 object-cover rounded-md border"
            />
          ) : (
            <div className="w-16 h-16 flex items-center justify-center bg-muted rounded-md border">
              📦
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">
              {eq.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              Código: {eq.code}
            </p>
            {!readOnly && (
              <p className="text-sm font-medium text-primary">
                {formatCurrency(eq.value)}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Unidade:</span>
            <Badge variant="outline">{franchiseNameById(eq.franchiseId)}</Badge>
          </div>
          {eq.manufactureDate && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Fabricação:</span>
              <span>{new Date(eq.manufactureDate).toLocaleDateString("pt-BR")}</span>
            </div>
          )}
        </div>

        {eq.status === 'manutencao' && (
          <div className="space-y-2">
            {/* Badge indicando tipo de manutenção */}
            <div className="flex items-center gap-2">
              {eq.blocksReservations ? (
                <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 dark:text-red-400">
                  🚫 Bloqueado para reservas
                </Badge>
              ) : (
                <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-800 dark:text-green-400">
                  🔧 Aceita reservas
                </Badge>
              )}
            </div>
            
            {/* Nota de manutenção */}
            {eq.maintenanceNote && (
              <div className="p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded text-sm">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-yellow-700 dark:text-yellow-300 break-words">
                    {eq.maintenanceNote}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modo somente leitura (franqueado) */}
        {readOnly ? (
          eq.status === 'disponivel' && (
            <div className="flex items-center justify-end pt-2 border-t">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onMoveStatus(eq.id, 'manutencao')}
                className="text-yellow-600"
              >
                <WrenchIcon className="w-4 h-4 mr-1" />
                Solicitar Manutenção
              </Button>
            </div>
          )
        ) : (
          /* Modo completo (franqueadora) */
          <div className="flex items-center justify-between gap-2 pt-2 border-t">
            <div className="flex gap-1">
              {eq.status === 'disponivel' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onMoveStatus(eq.id, 'manutencao')}
                  className="text-yellow-600"
                >
                  <WrenchIcon className="w-4 h-4 mr-1" />
                  Manutenção
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMoveStatus(eq.id, 'disponivel')}
                    className="text-green-600"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Disponível
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEditMaintenanceNote(eq.id)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onViewHistory(eq.id)}
                className="text-blue-600 dark:text-blue-400"
                title="Ver histórico de movimentações"
              >
                <History className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onEdit(eq)}>
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(eq)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <div>
            <h3 className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Disponível
            </h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              {columns.disponivel.length} equipamento(s)
            </p>
          </div>
          {!readOnly && (
            <div className="text-right">
              <p className="text-xs text-green-600 dark:text-green-400">Valor Total</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-300">
                {formatCurrency(totals.disponivel)}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-3">
          {columns.disponivel.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhum equipamento disponível</p>
            </Card>
          ) : (
            columns.disponivel.map(renderEquipmentCard)
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div>
            <h3 className="font-semibold text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
              <WrenchIcon className="w-5 h-5" />
              Em Manutenção
            </h3>
            <p className="text-sm text-yellow-600 dark:text-yellow-400">
              {columns.manutencao.length} equipamento(s)
            </p>
          </div>
          {!readOnly && (
            <div className="text-right">
              <p className="text-xs text-yellow-600 dark:text-yellow-400">Valor Total</p>
              <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                {formatCurrency(totals.manutencao)}
              </p>
            </div>
          )}
        </div>
        <div className="space-y-3">
          {columns.manutencao.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhum equipamento em manutenção</p>
            </Card>
          ) : (
            columns.manutencao.map(renderEquipmentCard)
          )}
        </div>
      </div>
    </div>
  );
};