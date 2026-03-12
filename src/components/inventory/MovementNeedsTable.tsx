import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Check, Truck } from "lucide-react";

export type MovementNeed = {
  saleId: string;
  clientName: string;
  rentalStartDate: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  originFranchiseId: string;
  originFranchiseName: string;
  originFranchiseCity: string;
  targetFranchiseId: string;
  targetFranchiseName: string;
  targetFranchiseCity: string;
};

type MovementNeedsTableProps = {
  needs: MovementNeed[];
  onMarkAsMoved: (need: MovementNeed) => void;
  loading?: boolean;
};

export function MovementNeedsTable({ needs, onMarkAsMoved, loading }: MovementNeedsTableProps) {
  if (needs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Nenhuma movimentação pendente</h3>
        <p className="text-muted-foreground max-w-md">
          Todos os equipamentos já estão nas franquias corretas para as locações agendadas.
        </p>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    const [year, month, day] = dateStr.split('-').map(Number);
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
        <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <span className="text-sm text-amber-800 dark:text-amber-200">
          <strong>{needs.length}</strong> equipamento(s) precisam ser movidos para outras franquias
        </span>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipamento</TableHead>
              <TableHead>De (Origem)</TableHead>
              <TableHead className="text-center">→</TableHead>
              <TableHead>Para (Destino)</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data da Locação</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {needs.map((need) => (
              <TableRow key={`${need.saleId}-${need.itemId}`} className="bg-amber-50/50 dark:bg-amber-950/30">
                <TableCell>
                  <div>
                    <div className="font-medium">{need.itemName}</div>
                    <div className="text-xs text-muted-foreground">Código: {need.itemCode}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800">
                    {need.originFranchiseName}
                    {need.originFranchiseCity && ` - ${need.originFranchiseCity}`}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <ArrowRight className="w-4 h-4 mx-auto text-muted-foreground" />
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
                    {need.targetFranchiseName}
                    {need.targetFranchiseCity && ` - ${need.targetFranchiseCity}`}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{need.clientName}</span>
                </TableCell>
                <TableCell>
                  <span>{formatDate(need.rentalStartDate)}</span>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    onClick={() => onMarkAsMoved(need)}
                    disabled={loading}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Movido
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
