import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, Filter } from "lucide-react";

type Franchise = {
  id: string;
  name: string;
  city: string;
};

export type ExportFilters = {
  fromDate?: string;
  toDate?: string;
  franchiseId?: string;
};

interface ExportExcelModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (filters?: ExportFilters) => void;
  franchises?: Franchise[];
  isFranqueado?: boolean;
  userFranchiseId?: string;
}

export const ExportExcelModal = ({ 
  open, 
  onClose, 
  onExport,
  franchises = [],
  isFranqueado = false,
  userFranchiseId
}: ExportExcelModalProps) => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedFranchiseId, setSelectedFranchiseId] = useState(userFranchiseId || "all");

  const handleExportAll = () => {
    onExport();
    handleClose();
  };

  const handleExportFiltered = () => {
    const filters: ExportFilters = {};
    
    if (fromDate) {
      filters.fromDate = fromDate;
    }
    
    if (toDate) {
      filters.toDate = toDate;
    }
    
    if (selectedFranchiseId && selectedFranchiseId !== "all") {
      filters.franchiseId = selectedFranchiseId;
    }
    
    onExport(filters);
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setFromDate("");
    setToDate("");
    setSelectedFranchiseId(userFranchiseId || "all");
  };

  const hasFilters = fromDate || toDate || (selectedFranchiseId && selectedFranchiseId !== "all");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            Exportar Planilha Excel
          </DialogTitle>
          <DialogDescription>
            Escolha como deseja exportar os dados do histórico de locações.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Filtro de Unidade */}
          {franchises.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="franchise">Unidade Locadora:</Label>
              <Select 
                value={selectedFranchiseId} 
                onValueChange={setSelectedFranchiseId}
              >
                <SelectTrigger id="franchise">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Unidades</SelectItem>
                  {franchises.map((franchise) => (
                    <SelectItem key={franchise.id} value={franchise.id}>
                      {franchise.name} - {franchise.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Filtro de Período */}
          <div className="space-y-2">
            <Label>Período da Data da Festa:</Label>
            <div className="flex gap-2 items-center">
              <div className="flex-1">
                <Label htmlFor="fromDate" className="text-xs text-muted-foreground">De:</Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="toDate" className="text-xs text-muted-foreground">Até:</Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  min={fromDate}
                />
              </div>
            </div>
          </div>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">opções</span>
            </div>
          </div>

          {/* Botões de Exportação */}
          <div className="space-y-3">
            {/* Exportar Filtrado */}
            {hasFilters && (
              <Button 
                onClick={handleExportFiltered}
                className="w-full gap-2"
                variant="default"
              >
                <Filter className="h-4 w-4" />
                Exportar Filtrado
              </Button>
            )}
            
            {hasFilters && (
              <p className="text-xs text-muted-foreground text-center">
                Aplica os filtros selecionados acima
              </p>
            )}

            {/* Exportar Tudo */}
            <Button 
              onClick={handleExportAll}
              className="w-full gap-2"
              variant={hasFilters ? "outline" : "default"}
            >
              <Download className="h-4 w-4" />
              Exportar Tudo
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {hasFilters 
                ? "Ignora os filtros acima e exporta todas as locações visíveis na tabela"
                : "Exporta todas as locações com os filtros ativos na tabela"
              }
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
