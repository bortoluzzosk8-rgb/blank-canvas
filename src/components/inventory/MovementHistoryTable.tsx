import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, ArrowRight } from "lucide-react";
import { Franchise } from "@/types/inventory";

export type GlobalMovementHistory = {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  fromFranchiseId?: string;
  toFranchiseId: string;
  movedAt: string;
  movedBy?: string;
  notes?: string;
  fromFranchiseName?: string;
  fromFranchiseCity?: string;
  toFranchiseName?: string;
  toFranchiseCity?: string;
};

type MovementHistoryTableProps = {
  movements: GlobalMovementHistory[];
  loading: boolean;
  franchises: Franchise[];
  onFilter: (filters: { startDate?: string; endDate?: string; franchiseId?: string }) => void;
};

export function MovementHistoryTable({
  movements,
  loading,
  franchises,
  onFilter,
}: MovementHistoryTableProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [franchiseId, setFranchiseId] = useState("");

  function handleFilter() {
    onFilter({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      franchiseId: franchiseId || undefined,
    });
  }

  function clearFilters() {
    setStartDate("");
    setEndDate("");
    setFranchiseId("");
    onFilter({});
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[140px]">
            <Label className="text-sm">Data Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <Label className="text-sm">Data Fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label className="text-sm">Franquia</Label>
            <Select value={franchiseId} onValueChange={setFranchiseId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Todas as franquias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as franquias</SelectItem>
                {franchises.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.city || f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleFilter} size="sm">
              <Search className="w-4 h-4 mr-1" />
              Filtrar
            </Button>
            <Button onClick={clearFilters} variant="outline" size="sm">
              Limpar
            </Button>
          </div>
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : movements.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhuma movimentação encontrada.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Ajuste os filtros ou realize uma movimentação de equipamento.
          </p>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              📜 <strong>{movements.length}</strong> movimentações encontradas
            </p>
          </div>

          {/* Movement list */}
          <div className="space-y-3">
            {movements.map((movement) => (
              <Card key={movement.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {/* Date */}
                  <div className="text-sm text-muted-foreground min-w-[140px]">
                    📅 {formatDate(movement.movedAt)}
                  </div>

                  {/* Equipment */}
                  <div className="flex-1">
                    <div className="font-medium">{movement.itemName}</div>
                    <div className="text-xs text-muted-foreground">
                      Código: {movement.itemCode}
                    </div>
                  </div>

                  {/* Movement direction */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className="bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-200"
                    >
                      {movement.fromFranchiseName
                        ? `${movement.fromFranchiseName}${movement.fromFranchiseCity ? ` - ${movement.fromFranchiseCity}` : ""}`
                        : "Nova Entrada"}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Badge
                      variant="outline"
                      className="bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200"
                    >
                      {movement.toFranchiseName}
                      {movement.toFranchiseCity && ` - ${movement.toFranchiseCity}`}
                    </Badge>
                  </div>
                </div>

                {/* Notes */}
                {movement.notes && (
                  <div className="mt-3 text-sm p-2 bg-muted rounded">
                    <span className="text-xs text-muted-foreground">Obs: </span>
                    {movement.notes}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
