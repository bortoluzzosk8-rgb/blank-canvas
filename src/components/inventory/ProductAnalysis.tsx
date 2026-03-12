import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronLeft, ChevronRight, ChevronDown, Package, CheckCircle, Wrench, CalendarDays, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Equipment, Franchise } from "@/types/inventory";

interface ProductAnalysisProps {
  equipment: Equipment[];
  franchises: Franchise[];
}

interface ProductGroup {
  name: string;
  totalCount: number;
  availableCount: number;
  maintenanceCount: number;
  totalValue: number;
  franchiseBreakdown: Map<string, { total: number; available: number; maintenance: number }>;
  rentalsInMonth: number;
  demandIndex: number;
}

function getDemandIndex(rentals: number, available: number): number {
  if (available === 0) return rentals > 0 ? 999 : 0;
  return rentals / available;
}

function getRecommendation(index: number): { label: string; bgClass: string; textClass: string; icon: React.ReactNode } {
  if (index >= 4) return { 
    label: "Aumentar", 
    bgClass: "bg-green-100 dark:bg-green-900/30", 
    textClass: "text-green-700 dark:text-green-300",
    icon: <TrendingUp className="h-3 w-3" />
  };
  if (index > 1) return { 
    label: "Manter", 
    bgClass: "bg-yellow-100 dark:bg-yellow-900/30", 
    textClass: "text-yellow-700 dark:text-yellow-300",
    icon: <Minus className="h-3 w-3" />
  };
  return { 
    label: "Diminuir", 
    bgClass: "bg-red-100 dark:bg-red-900/30", 
    textClass: "text-red-700 dark:text-red-300",
    icon: <TrendingDown className="h-3 w-3" />
  };
}

export function ProductAnalysis({ equipment, franchises }: ProductAnalysisProps) {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedFranchise, setSelectedFranchise] = useState<string>("all");
  const [rentalsData, setRentalsData] = useState<{ [key: string]: number }>({});
  const [loadingRentals, setLoadingRentals] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const franchiseNameById = useMemo(() => {
    return new Map(franchises.map((f) => [f.id, f.city || f.name]));
  }, [franchises]);

  useEffect(() => {
    loadRentalsForMonth(selectedMonth, selectedFranchise);
  }, [selectedMonth, selectedFranchise]);

  async function loadRentalsForMonth(month: Date, franchiseId: string) {
    setLoadingRentals(true);
    try {
      const monthStart = format(startOfMonth(month), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(month), "yyyy-MM-dd");

      let query = supabase
        .from("sale_items")
        .select(`
          inventory_item_id,
          inventory_items!inner(name),
          sales!inner(rental_start_date, status, franchise_id)
        `)
        .not("inventory_item_id", "is", null)
        .neq("sales.status", "cancelled")
        .gte("sales.rental_start_date", monthStart)
        .lte("sales.rental_start_date", monthEnd);

      if (franchiseId !== "all") {
        query = query.eq("sales.franchise_id", franchiseId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading rentals:", error);
        return;
      }

      const rentalsMap: { [key: string]: number } = {};
      for (const item of data || []) {
        const invItem = item.inventory_items as any;
        const name = invItem?.name;
        if (name) {
          rentalsMap[name] = (rentalsMap[name] || 0) + 1;
        }
      }

      setRentalsData(rentalsMap);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoadingRentals(false);
    }
  }

  const filteredEquipment = useMemo(() => {
    if (selectedFranchise === "all") return equipment;
    return equipment.filter(eq => eq.franchiseId === selectedFranchise);
  }, [equipment, selectedFranchise]);

  const productAnalysis = useMemo(() => {
    const grouped = new Map<string, ProductGroup>();

    for (const eq of filteredEquipment) {
      const existing = grouped.get(eq.name) || {
        name: eq.name,
        totalCount: 0,
        availableCount: 0,
        maintenanceCount: 0,
        totalValue: 0,
        franchiseBreakdown: new Map(),
        rentalsInMonth: 0,
        demandIndex: 0,
      };

      existing.totalCount++;
      existing.totalValue += eq.value;

      if (eq.status === "disponivel") existing.availableCount++;
      if (eq.status === "manutencao") existing.maintenanceCount++;

      // Franchise breakdown
      const franchiseData = existing.franchiseBreakdown.get(eq.franchiseId) || {
        total: 0,
        available: 0,
        maintenance: 0,
      };
      franchiseData.total++;
      if (eq.status === "disponivel") franchiseData.available++;
      if (eq.status === "manutencao") franchiseData.maintenance++;
      existing.franchiseBreakdown.set(eq.franchiseId, franchiseData);

      existing.rentalsInMonth = rentalsData[eq.name] || 0;
      existing.demandIndex = getDemandIndex(existing.rentalsInMonth, existing.availableCount);

      grouped.set(eq.name, existing);
    }

    return Array.from(grouped.values()).sort((a, b) => b.demandIndex - a.demandIndex);
  }, [filteredEquipment, rentalsData]);

  const totals = useMemo(() => {
    const increaseCount = productAnalysis.filter(p => p.demandIndex >= 4).length;
    const decreaseCount = productAnalysis.filter(p => p.demandIndex <= 1).length;
    const avgIndex = productAnalysis.length > 0
      ? productAnalysis.reduce((sum, p) => sum + (p.demandIndex === 999 ? 10 : p.demandIndex), 0) / productAnalysis.length
      : 0;

    return {
      types: productAnalysis.length,
      units: productAnalysis.reduce((sum, p) => sum + p.totalCount, 0),
      available: productAnalysis.reduce((sum, p) => sum + p.availableCount, 0),
      maintenance: productAnalysis.reduce((sum, p) => sum + p.maintenanceCount, 0),
      rentals: productAnalysis.reduce((sum, p) => sum + p.rentalsInMonth, 0),
      totalValue: productAnalysis.reduce((sum, p) => sum + p.totalValue, 0),
      avgIndex,
      increaseCount,
      decreaseCount,
    };
  }, [productAnalysis]);

  function toggleRow(name: string) {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(name)) {
      newExpanded.delete(name);
    } else {
      newExpanded.add(name);
    }
    setExpandedRows(newExpanded);
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  }

  return (
    <div className="space-y-6">
      {/* Header with Month Navigation and Franchise Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          📊 Análise de Produtos
        </h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Franchise Filter */}
          <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as Unidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Unidades</SelectItem>
              {franchises.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.city || f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[150px] text-center font-medium capitalize">
              {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Package className="h-4 w-4" />
            Tipos de Produtos
          </div>
          <p className="text-2xl font-bold mt-1">{totals.types}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <CheckCircle className="h-4 w-4 text-green-500" />
            Disponíveis
          </div>
          <p className="text-2xl font-bold mt-1 text-green-600">{totals.available}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <CalendarDays className="h-4 w-4 text-blue-500" />
            Locações no Mês
          </div>
          <p className="text-2xl font-bold mt-1 text-blue-600">
            {loadingRentals ? <Loader2 className="h-6 w-6 animate-spin" /> : totals.rentals}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            📊 Índice Médio
          </div>
          <p className="text-2xl font-bold mt-1">{totals.avgIndex.toFixed(2)}</p>
        </Card>
        <Card className="p-4 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <TrendingUp className="h-4 w-4" />
            Aumentar
          </div>
          <p className="text-2xl font-bold mt-1 text-green-600">{totals.increaseCount}</p>
        </Card>
        <Card className="p-4 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <TrendingDown className="h-4 w-4" />
            Diminuir
          </div>
          <p className="text-2xl font-bold mt-1 text-red-600">{totals.decreaseCount}</p>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Disp.</TableHead>
              <TableHead className="text-center">Locações</TableHead>
              <TableHead className="text-center">Índice</TableHead>
              <TableHead className="text-center">Recomendação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productAnalysis.map((product) => {
              const recommendation = getRecommendation(product.demandIndex);
              return (
                <Collapsible key={product.name} asChild>
                  <>
                    <CollapsibleTrigger asChild>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(product.name)}
                      >
                        <TableCell>
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              expandedRows.has(product.name) ? "rotate-180" : ""
                            }`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{product.totalCount}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                            {product.availableCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {loadingRentals ? (
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          ) : (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                              {product.rentalsInMonth}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono font-bold">
                            {product.demandIndex === 999 ? "∞" : product.demandIndex.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${recommendation.bgClass} ${recommendation.textClass} gap-1`}>
                            {recommendation.icon}
                            {recommendation.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    </CollapsibleTrigger>
                    <CollapsibleContent asChild>
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={7} className="p-0">
                          {expandedRows.has(product.name) && (
                            <div className="p-4 space-y-2">
                              <p className="text-sm font-medium text-muted-foreground mb-2">
                                📍 Distribuição por Franquia
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {Array.from(product.franchiseBreakdown.entries()).map(
                                  ([franchiseId, data]) => (
                                    <Card key={franchiseId} className="p-3">
                                      <p className="font-medium text-sm">
                                        {franchiseNameById.get(franchiseId) || "—"}
                                      </p>
                                      <div className="flex gap-3 mt-1 text-xs">
                                        <span>Total: <strong>{data.total}</strong></span>
                                        <span className="text-green-600">
                                          Disp: <strong>{data.available}</strong>
                                        </span>
                                        {data.maintenance > 0 && (
                                          <span className="text-orange-600">
                                            Manut: <strong>{data.maintenance}</strong>
                                          </span>
                                        )}
                                      </div>
                                    </Card>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </>
                </Collapsible>
              );
            })}
            {productAnalysis.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhum equipamento encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
