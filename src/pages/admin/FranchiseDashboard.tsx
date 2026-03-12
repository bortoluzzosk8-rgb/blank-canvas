import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TrendingUp, DollarSign, ShoppingCart, Trophy, Award } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { toast } from "sonner";

type MonthlyEvolution = {
  month: string;
  monthLabel: string;
  vendas: number;
  faturamento: number;
};

type EquipmentRanking = {
  name: string;
  count: number;
  revenue: number;
  codesCount: number;
};

const FranchiseDashboard = () => {
  const { userFranchise } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number | null>(new Date().getFullYear());
  
  // Métricas
  const [totalSales, setTotalSales] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [topByQuantity, setTopByQuantity] = useState<EquipmentRanking[]>([]);
  const [topByRevenue, setTopByRevenue] = useState<EquipmentRanking[]>([]);
  const [evolutionData, setEvolutionData] = useState<MonthlyEvolution[]>([]);

  const months = [
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

  const currentYear = new Date().getFullYear();
  // Anos: 3 futuros + atual + 5 passados (ex: 2028, 2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020)
  const years = Array.from({ length: 9 }, (_, i) => currentYear + 3 - i);

  useEffect(() => {
    if (userFranchise?.id) {
      fetchDashboardData();
    }
  }, [userFranchise?.id, selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    if (!userFranchise?.id) return;

    try {
      setLoading(true);

      // Construir query base para vendas
      let salesQuery = supabase
        .from("sales")
        .select("id, total_value, sale_date, rental_start_date")
        .eq("franchise_id", userFranchise.id)
        .neq("status", "cancelled");

      // Aplicar filtros de data pela data da festa (rental_start_date)
      if (selectedYear && selectedMonth) {
        const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
        const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0];
        salesQuery = salesQuery
          .gte("rental_start_date", startDate)
          .lte("rental_start_date", endDate);
      } else if (selectedYear) {
        salesQuery = salesQuery
          .gte("rental_start_date", `${selectedYear}-01-01`)
          .lte("rental_start_date", `${selectedYear}-12-31`);
      }
      // Se ambos forem null, não aplica filtro (mostra tudo)

      const { data: salesData, error: salesError } = await salesQuery;

      if (salesError) throw salesError;

      setTotalSales(salesData?.length || 0);
      setTotalRevenue(salesData?.reduce((sum, s) => sum + (s.total_value || 0), 0) || 0);

      // Construir query para itens com filtro por rental_start_date
      let itemsQuery = supabase
        .from("sale_items")
        .select(`
          id,
          quantity,
          total_value,
          inventory_item_id,
          sale_id,
          sales!inner (
            sale_date,
            rental_start_date,
            franchise_id,
            status
          ),
          inventory_items (
            id,
            name,
            code
          )
        `)
        .eq("sales.franchise_id", userFranchise.id)
        .neq("sales.status", "cancelled")
        .not("inventory_item_id", "is", null);

      // Aplicar filtros de data pela data da festa (rental_start_date)
      if (selectedYear && selectedMonth) {
        const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
        const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0];
        itemsQuery = itemsQuery
          .gte("sales.rental_start_date", startDate)
          .lte("sales.rental_start_date", endDate);
      } else if (selectedYear) {
        itemsQuery = itemsQuery
          .gte("sales.rental_start_date", `${selectedYear}-01-01`)
          .lte("sales.rental_start_date", `${selectedYear}-12-31`);
      }

      const { data: saleItemsData, error: itemsError } = await itemsQuery;

      if (itemsError) throw itemsError;

      // Agrupar por NOME do produto (não por código individual)
      const equipmentMap = new Map<string, EquipmentRanking>();
      const codesByProduct = new Map<string, Set<string>>();
      
      saleItemsData?.forEach((item) => {
        const invItem = item.inventory_items as { id: string; name: string; code: string } | null;
        if (!invItem) return;

        const productName = invItem.name.trim();
        
        const existing = equipmentMap.get(productName) || {
          name: productName,
          count: 0,
          revenue: 0,
          codesCount: 0,
        };

        existing.count += Number(item.quantity) || 1;
        existing.revenue += item.total_value || 0;
        
        if (!codesByProduct.has(productName)) {
          codesByProduct.set(productName, new Set());
        }
        codesByProduct.get(productName)!.add(invItem.code);
        
        equipmentMap.set(productName, existing);
      });

      // Atualizar contagem de códigos únicos
      equipmentMap.forEach((equipment, name) => {
        equipment.codesCount = codesByProduct.get(name)?.size || 0;
      });

      const equipmentArray = Array.from(equipmentMap.values());
      
      // Top 5 por quantidade
      setTopByQuantity(
        [...equipmentArray].sort((a, b) => b.count - a.count).slice(0, 5)
      );

      // Top 5 por faturamento
      setTopByRevenue(
        [...equipmentArray].sort((a, b) => b.revenue - a.revenue).slice(0, 5)
      );

      // Buscar evolução dos últimos 12 meses (baseado na data da festa)
      const refMonth = selectedMonth || new Date().getMonth() + 1;
      const refYear = selectedYear || new Date().getFullYear();
      const evolutionStartDate = new Date(refYear, refMonth - 12, 1);
      const evolutionEndDate = new Date(refYear, refMonth, 0);

      const { data: evolutionSales, error: evolutionError } = await supabase
        .from("sales")
        .select("id, total_value, rental_start_date")
        .eq("franchise_id", userFranchise.id)
        .neq("status", "cancelled")
        .not("rental_start_date", "is", null)
        .gte("rental_start_date", evolutionStartDate.toISOString().split("T")[0])
        .lte("rental_start_date", evolutionEndDate.toISOString().split("T")[0]);

      if (evolutionError) throw evolutionError;

      // Agrupar por mês (usando rental_start_date)
      const monthMap = new Map<string, { vendas: number; faturamento: number }>();
      
      evolutionSales?.forEach((sale) => {
        if (!sale.rental_start_date) return;
        const monthKey = sale.rental_start_date.substring(0, 7);
        const existing = monthMap.get(monthKey) || { vendas: 0, faturamento: 0 };
        existing.vendas += 1;
        existing.faturamento += sale.total_value || 0;
        monthMap.set(monthKey, existing);
      });

      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const evolution: MonthlyEvolution[] = Array.from(monthMap.entries())
        .map(([month, data]) => {
          const [year, monthNum] = month.split("-");
          return {
            month,
            monthLabel: `${monthNames[parseInt(monthNum) - 1]}/${year.slice(2)}`,
            vendas: data.vendas,
            faturamento: data.faturamento,
          };
        })
        .sort((a, b) => a.month.localeCompare(b.month));

      setEvolutionData(evolution);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const ticketMedio = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Texto do período selecionado
  const getPeriodText = () => {
    if (selectedMonth && selectedYear) {
      return `Festas em ${months[selectedMonth - 1]?.label}/${selectedYear}`;
    } else if (selectedYear) {
      return `Festas em ${selectedYear}`;
    }
    return "Todas as festas";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Dashboard - {userFranchise?.name || "Franquia"}
          </h2>
          <p className="text-muted-foreground">
            Métricas de desempenho da sua unidade
          </p>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <Select
            value={selectedMonth ? String(selectedMonth) : "all"}
            onValueChange={(v) => setSelectedMonth(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {months.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedYear ? String(selectedYear) : "all"}
            onValueChange={(v) => setSelectedYear(v === "all" ? null : Number(v))}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Festas no Período</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              {getPeriodText()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {getPeriodText()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(ticketMedio)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor médio por festa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Evolução Mensal
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Desempenho dos últimos 12 meses (por data da festa)
          </p>
        </CardHeader>
        <CardContent>
          {evolutionData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <p>Nenhum dado de festas encontrado</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="monthLabel" className="text-xs" />
                <YAxis yAxisId="left" tickFormatter={(v) => String(v)} className="text-xs" />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                <Tooltip
                  formatter={(value: number, name: string) => 
                    name === "faturamento" ? formatCurrency(value) : value
                  }
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="vendas" fill="hsl(var(--primary))" name="Festas" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="faturamento" stroke="#22c55e" name="Faturamento" strokeWidth={2} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Rankings */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top por Quantidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Mais Alugados
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Equipamentos por quantidade de festas
            </p>
          </CardHeader>
          <CardContent>
            {topByQuantity.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma festa no período
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topByQuantity.map((item, index) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.codesCount > 1 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({item.codesCount} unidades)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {item.count}x
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top por Faturamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-500" />
              Mais Rentáveis
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Equipamentos por faturamento gerado
            </p>
          </CardHeader>
          <CardContent>
            {topByRevenue.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhuma festa no período
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topByRevenue.map((item, index) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium">
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{item.name}</span>
                          {item.codesCount > 1 && (
                            <span className="text-xs text-muted-foreground ml-2">
                              ({item.codesCount} unidades)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(item.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FranchiseDashboard;
