import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { CalendarDays, DollarSign, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { toast } from "sonner";

type MonthlyEvolution = {
  month: string;
  monthLabel: string;
  festas: number;
  faturamento: number;
};

const SellerDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [sellerName, setSellerName] = useState<string>("");
  
  // Métricas
  const [totalFestas, setTotalFestas] = useState(0);
  const [totalFaturamento, setTotalFaturamento] = useState(0);
  const [monthlyEvolution, setMonthlyEvolution] = useState<MonthlyEvolution[]>([]);

  const months = [
    { value: "all", label: "Todos os meses" },
    { value: "1", label: "Janeiro" },
    { value: "2", label: "Fevereiro" },
    { value: "3", label: "Março" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Maio" },
    { value: "6", label: "Junho" },
    { value: "7", label: "Julho" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Setembro" },
    { value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },
    { value: "12", label: "Dezembro" },
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user?.id, selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Buscar dados do vendedor
      const { data: sellerData } = await supabase
        .from("sellers")
        .select("name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sellerData) {
        setSellerName(sellerData.name);
      }

      // Buscar vendas criadas pelo vendedor
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("id, total_value, sale_date")
        .eq("created_by", user.id)
        .neq("status", "cancelled");

      if (salesError) throw salesError;

      // Processar dados
      const sales = salesData || [];
      
      // Filtrar por mês e ano selecionados (usando sale_date - data da reserva)
      const filteredSales = sales.filter((sale) => {
        if (!sale.sale_date) return false;
        
        const reservationDate = new Date(sale.sale_date);
        const saleYear = reservationDate.getFullYear().toString();
        const saleMonth = (reservationDate.getMonth() + 1).toString();

        if (selectedYear !== saleYear) return false;
        if (selectedMonth !== "all" && selectedMonth !== saleMonth) return false;

        return true;
      });

      // Calcular métricas filtradas
      setTotalFestas(filteredSales.length);
      setTotalFaturamento(filteredSales.reduce((sum, sale) => sum + (sale.total_value || 0), 0));

      // Agrupar por mês para evolução (sempre do ano selecionado)
      const monthlyMap = new Map<string, { festas: number; faturamento: number }>();

      sales
        .filter((sale) => {
          if (!sale.sale_date) return false;
          const reservationDate = new Date(sale.sale_date);
          return reservationDate.getFullYear().toString() === selectedYear;
        })
        .forEach((sale) => {
          const reservationDate = new Date(sale.sale_date!);
          const monthKey = `${reservationDate.getFullYear()}-${String(reservationDate.getMonth() + 1).padStart(2, "0")}`;

          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, { festas: 0, faturamento: 0 });
          }

          const current = monthlyMap.get(monthKey)!;
          current.festas += 1;
          current.faturamento += sale.total_value || 0;
        });

      // Converter para array e ordenar
      const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      
      const evolution = Array.from(monthlyMap.entries())
        .map(([month, data]) => {
          const [year, monthNum] = month.split("-");
          return {
            month,
            monthLabel: `${monthLabels[parseInt(monthNum) - 1]}/${year}`,
            festas: data.festas,
            faturamento: data.faturamento,
          };
        })
        .sort((a, b) => a.month.localeCompare(b.month));

      setMonthlyEvolution(evolution);
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
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

  const ticketMedio = totalFestas > 0 ? totalFaturamento / totalFestas : 0;

  const getPeriodText = () => {
    if (selectedMonth === "all") {
      return `Ano ${selectedYear}`;
    }
    const monthName = months.find((m) => m.value === selectedMonth)?.label;
    return `${monthName} de ${selectedYear}`;
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
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Dashboard {sellerName ? `- ${sellerName}` : ""}
          </h2>
          <p className="text-muted-foreground">
            Suas métricas de vendas • {getPeriodText()}
          </p>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
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
            <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
            <CalendarDays className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalFestas}</div>
            <p className="text-xs text-muted-foreground">
              Reservas feitas por você
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(totalFaturamento)}
            </div>
            <p className="text-xs text-muted-foreground">
              Soma dos valores das locações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(ticketMedio)}
            </div>
            <p className="text-xs text-muted-foreground">
              Faturamento ÷ Festas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução Mensal */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal - {selectedYear}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Quantidade de vendas e faturamento por mês (data da reserva)
          </p>
        </CardHeader>
        <CardContent>
          {monthlyEvolution.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <p className="text-lg font-medium">Nenhuma locação encontrada</p>
                <p className="text-sm">Crie locações para visualizar sua evolução</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={monthlyEvolution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="monthLabel" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => formatCurrency(value)}
                  className="text-xs"
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === "Faturamento") return formatCurrency(value);
                    return value;
                  }}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="festas" fill="hsl(var(--primary))" name="Vendas" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="faturamento" stroke="#22c55e" name="Faturamento" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SellerDashboard;
