import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantFranchises } from "@/hooks/useTenantFranchises";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Calendar, DollarSign } from "lucide-react";

type SaleData = {
  id: string;
  sale_date: string;
  rental_start_date: string | null;
  total_value: number;
  franchise_id: string | null;
  status: string;
};

type Franchise = {
  id: string;
  name: string;
  city: string;
};

type ChartDataItem = {
  label: string;
  franchiseId?: string;
  valorRealizado: number;
  valorVendido: number;
  quantidadeRealizada: number;
  quantidadeVendida: number;
  demandIndex?: number;
};

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const chartConfig = {
  valorRealizado: {
    label: "Valor Realizado",
    color: "hsl(var(--primary))",
  },
  valorVendido: {
    label: "Valor Vendido",
    color: "hsl(var(--chart-2))",
  },
};

export function SalesChart() {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(currentDate.getMonth() + 1);
  const [selectedFranchise, setSelectedFranchise] = useState<string>("all");
  const [salesData, setSalesData] = useState<SaleData[]>([]);
  const { franchises } = useTenantFranchises();
  const [inventoryByFranchise, setInventoryByFranchise] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Generate year options (last 5 years + current)
  const yearOptions = useMemo(() => {
    const years = [];
    for (let i = currentDate.getFullYear(); i >= currentDate.getFullYear() - 4; i--) {
      years.push(i);
    }
    return years;
  }, []);

  // Helper function to get franchise display name
  const getFranchiseDisplayName = (franchise: Franchise) => {
    return franchise.city && franchise.city !== "A definir" 
      ? franchise.city 
      : franchise.name;
  };

  // Load inventory data for demand index calculation
  useEffect(() => {
    const loadInventoryData = async () => {
      const { data } = await supabase
        .from("inventory_items")
        .select("franchise_id")
        .eq("status", "disponivel");
      
      if (data) {
        const countByFranchise: Record<string, number> = {};
        for (const item of data) {
          if (item.franchise_id) {
            countByFranchise[item.franchise_id] = (countByFranchise[item.franchise_id] || 0) + 1;
          }
        }
        setInventoryByFranchise(countByFranchise);
      }
    };
    loadInventoryData();
  }, []);

  // Load sales data
  useEffect(() => {
    const loadSalesData = async () => {
      setLoading(true);
      
      let startDate: Date;
      let endDate: Date;
      
      if (selectedMonth === "all") {
        startDate = startOfYear(new Date(selectedYear, 0, 1));
        endDate = endOfYear(new Date(selectedYear, 0, 1));
      } else {
        startDate = startOfMonth(new Date(selectedYear, selectedMonth - 1, 1));
        endDate = endOfMonth(new Date(selectedYear, selectedMonth - 1, 1));
      }

      const { data, error } = await supabase
        .from("sales")
        .select("id, sale_date, rental_start_date, total_value, franchise_id, status")
        .neq("status", "cancelled")
        .or(`sale_date.gte.${format(startDate, "yyyy-MM-dd")},rental_start_date.gte.${format(startDate, "yyyy-MM-dd")}`)
        .or(`sale_date.lte.${format(endDate, "yyyy-MM-dd")},rental_start_date.lte.${format(endDate, "yyyy-MM-dd")}`);

      if (!error && data) {
        setSalesData(data);
      }
      setLoading(false);
    };
    
    loadSalesData();
  }, [selectedYear, selectedMonth]);

  // Process chart data
  const chartData = useMemo(() => {
    let startDate: Date;
    let endDate: Date;
    
    if (selectedMonth === "all") {
      startDate = startOfYear(new Date(selectedYear, 0, 1));
      endDate = endOfYear(new Date(selectedYear, 0, 1));
    } else {
      startDate = startOfMonth(new Date(selectedYear, selectedMonth - 1, 1));
      endDate = endOfMonth(new Date(selectedYear, selectedMonth - 1, 1));
    }

    const grouped = new Map<string, ChartDataItem>();

    // Filter by franchise if selected
    const filteredSales = selectedFranchise === "all" 
      ? salesData 
      : salesData.filter(s => s.franchise_id === selectedFranchise);

    for (const sale of filteredSales) {
      const saleDate = new Date(sale.sale_date);
      const rentalDate = sale.rental_start_date ? new Date(sale.rental_start_date) : null;

      // Determine grouping key
      let key: string;
      let label: string;

      if (selectedFranchise === "all") {
        // Group by franchise
        const franchise = franchises.find(f => f.id === sale.franchise_id);
        key = sale.franchise_id || "sem-unidade";
        label = franchise ? getFranchiseDisplayName(franchise) : "Sem Unidade";
      } else {
        // Group by month
        if (selectedMonth === "all") {
          // Show monthly breakdown
          key = format(saleDate, "yyyy-MM");
          label = format(saleDate, "MMM", { locale: ptBR });
        } else {
          // Single month - group by week or day
          key = format(saleDate, "yyyy-MM-dd");
          label = format(saleDate, "dd/MM");
        }
      }

      if (!grouped.has(key)) {
        grouped.set(key, {
          label,
          franchiseId: selectedFranchise === "all" ? sale.franchise_id || undefined : undefined,
          valorRealizado: 0,
          valorVendido: 0,
          quantidadeRealizada: 0,
          quantidadeVendida: 0,
        });
      }

      const item = grouped.get(key)!;

      // Check if sale_date is in the period (valor vendido)
      if (saleDate >= startDate && saleDate <= endDate) {
        item.valorVendido += sale.total_value;
        item.quantidadeVendida += 1;
      }

      // Check if rental_start_date is in the period (valor realizado)
      if (rentalDate && rentalDate >= startDate && rentalDate <= endDate) {
        item.valorRealizado += sale.total_value;
        item.quantidadeRealizada += 1;
      }
    }

    // Calculate demand index for each franchise
    if (selectedFranchise === "all") {
      for (const [, item] of grouped) {
        if (item.franchiseId) {
          const available = inventoryByFranchise[item.franchiseId] || 0;
          item.demandIndex = available > 0 
            ? item.quantidadeRealizada / available 
            : (item.quantidadeRealizada > 0 ? 999 : 0);
        }
      }
    }

    return Array.from(grouped.values()).sort((a, b) => {
      if (selectedFranchise === "all") {
        return b.valorRealizado - a.valorRealizado; // Sort by value desc
      }
      return a.label.localeCompare(b.label); // Sort by date
    });
  }, [salesData, selectedFranchise, selectedYear, selectedMonth, franchises, inventoryByFranchise]);

  // Calculate totals
  const totals = useMemo(() => {
    const base = chartData.reduce(
      (acc, item) => ({
        valorRealizado: acc.valorRealizado + item.valorRealizado,
        valorVendido: acc.valorVendido + item.valorVendido,
        quantidadeRealizada: acc.quantidadeRealizada + item.quantidadeRealizada,
        quantidadeVendida: acc.quantidadeVendida + item.quantidadeVendida,
      }),
      { valorRealizado: 0, valorVendido: 0, quantidadeRealizada: 0, quantidadeVendida: 0 }
    );

    // Calculate average demand index
    const itemsWithIndex = chartData.filter(item => item.demandIndex !== undefined);
    const avgIndex = itemsWithIndex.length > 0
      ? itemsWithIndex.reduce((sum, item) => sum + ((item.demandIndex === 999 ? 10 : item.demandIndex) || 0), 0) / itemsWithIndex.length
      : undefined;

    return { ...base, avgIndex };
  }, [chartData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const difference = totals.valorVendido - totals.valorRealizado;
  const isPositiveDiff = difference >= 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            📊 Gráfico de Vendas por Unidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Ano</label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Mês</label>
              <Select 
                value={String(selectedMonth)} 
                onValueChange={(v) => setSelectedMonth(v === "all" ? "all" : Number(v))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Meses</SelectItem>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={String(month.value)}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-muted-foreground">Unidade</label>
              <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Unidades</SelectItem>
                  {franchises.map((franchise) => (
                    <SelectItem key={franchise.id} value={franchise.id}>
                      {getFranchiseDisplayName(franchise)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              Realizado
            </div>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totals.valorRealizado)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {totals.quantidadeRealizada} eventos
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="h-4 w-4" />
              Vendido
            </div>
            <div className="text-2xl font-bold" style={{ color: "hsl(var(--chart-2))" }}>
              {formatCurrency(totals.valorVendido)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {totals.quantidadeVendida} reservas
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              📈 Ticket Médio
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(totals.quantidadeRealizada > 0 ? totals.valorRealizado / totals.quantidadeRealizada : 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              por evento
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selectedFranchise === "all" 
              ? "Comparativo por Unidade" 
              : `Detalhamento - ${(() => {
                  const f = franchises.find(f => f.id === selectedFranchise);
                  return f ? getFranchiseDisplayName(f) : "Unidade";
                })()}`
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              Carregando...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground">
              Nenhum dado encontrado para o período selecionado
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis 
                    tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === "valorRealizado" ? "Realizado" : "Vendido"
                    ]}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend 
                    formatter={(value) => value === "valorRealizado" ? "Realizado" : "Vendido"}
                  />
                  <Bar 
                    dataKey="valorRealizado" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    name="valorRealizado"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="valorVendido" 
                    stroke="hsl(var(--chart-2))" 
                    strokeWidth={3}
                    dot={{ fill: "hsl(var(--chart-2))", strokeWidth: 2 }}
                    name="valorVendido"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tabela Detalhada</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{selectedFranchise === "all" ? "Unidade" : "Período"}</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
                <TableHead className="text-right">Vendido</TableHead>
                <TableHead className="text-right">Eventos</TableHead>
                <TableHead className="text-right">Reservas</TableHead>
                {selectedFranchise === "all" && <TableHead className="text-right">Índice</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.label}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.valorRealizado)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.valorVendido)}</TableCell>
                  <TableCell className="text-right">{item.quantidadeRealizada}</TableCell>
                  <TableCell className="text-right">{item.quantidadeVendida}</TableCell>
                  {selectedFranchise === "all" && (
                    <TableCell className="text-right font-medium">
                      {item.demandIndex !== undefined 
                        ? (item.demandIndex === 999 ? "∞" : item.demandIndex.toFixed(2))
                        : "-"}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.valorRealizado)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.valorVendido)}</TableCell>
                <TableCell className="text-right">{totals.quantidadeRealizada}</TableCell>
                <TableCell className="text-right">{totals.quantidadeVendida}</TableCell>
                {selectedFranchise === "all" && (
                  <TableCell className="text-right">
                    {totals.avgIndex !== undefined ? totals.avgIndex.toFixed(2) : "-"}
                  </TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
