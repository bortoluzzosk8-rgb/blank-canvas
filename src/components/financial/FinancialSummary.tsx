import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Wallet, Clock, AlertTriangle, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialData {
  totalRevenue: number;
  totalExpenses: number;
  pendingRevenue: number;
  pendingExpenses: number;
  overdueRevenue: number;
}

export function FinancialSummary() {
  const { userFranchise } = useAuth();
  const franchiseId = userFranchise?.id;
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [data, setData] = useState<FinancialData>({
    totalRevenue: 0,
    totalExpenses: 0,
    pendingRevenue: 0,
    pendingExpenses: 0,
    overdueRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  useEffect(() => {
    fetchFinancialData();
  }, [franchiseId, startDate, endDate]);

  const fetchFinancialData = async () => {
    setLoading(true);
    const today = new Date();
    const startDateStr = format(startDate, "yyyy-MM-dd");
    const endDateStr = format(endDate, "yyyy-MM-dd");
    const todayStr = format(today, "yyyy-MM-dd");

    try {
      // Fetch revenue (sale_payments)
      let revenueQuery = supabase
        .from("sale_payments")
        .select("amount, status, due_date, payment_date, sales!inner(franchise_id)");

      if (franchiseId) {
        revenueQuery = revenueQuery.eq("sales.franchise_id", franchiseId);
      }

      const { data: payments } = await revenueQuery;

      // Fetch expenses from purchases
      let purchasesQuery = supabase
        .from("purchases")
        .select("total_value, purchase_date")
        .gte("purchase_date", startDateStr)
        .lte("purchase_date", endDateStr);

      if (franchiseId) {
        purchasesQuery = purchasesQuery.eq("franchise_id", franchiseId);
      }

      const { data: purchases } = await purchasesQuery;

      // Fetch general expenses
      let expensesQuery = supabase
        .from("expenses")
        .select("amount, status, expense_date, due_date");

      if (franchiseId) {
        expensesQuery = expensesQuery.eq("franchise_id", franchiseId);
      }

      const { data: expenses } = await expensesQuery;

      // Fetch loan installments
      let loanInstallmentsQuery = supabase
        .from("loan_installments")
        .select("amount, status, due_date, payment_date");

      if (franchiseId) {
        loanInstallmentsQuery = loanInstallmentsQuery.eq("franchise_id", franchiseId);
      }

      const { data: loanInstallments } = await loanInstallmentsQuery;

      // Calculate totals with date filtering
      let totalRevenue = 0;
      let pendingRevenue = 0;
      let overdueRevenue = 0;

      payments?.forEach((p) => {
        const paymentDate = p.payment_date ? new Date(p.payment_date) : null;
        const dueDate = p.due_date ? new Date(p.due_date) : null;

        if (p.status === "paid" || p.status === "confirmed") {
          // Para receitas pagas, verificar se a data de pagamento está no período
          if (paymentDate && paymentDate >= startDate && paymentDate <= endDate) {
            totalRevenue += Number(p.amount);
          }
        } else if (p.status === "pending") {
          // Para receitas pendentes, verificar se a data de vencimento está no período
          if (dueDate && dueDate >= startDate && dueDate <= endDate) {
            pendingRevenue += Number(p.amount);
            if (p.due_date && p.due_date < todayStr) {
              overdueRevenue += Number(p.amount);
            }
          }
        }
      });

      let totalExpenses = 0;
      let pendingExpenses = 0;

      purchases?.forEach((p) => {
        totalExpenses += Number(p.total_value);
      });

      expenses?.forEach((e) => {
        const expenseDate = new Date(e.expense_date);
        const dueDate = e.due_date ? new Date(e.due_date) : null;

        if (e.status === "paid") {
          // Para despesas pagas, verificar se a data da despesa está no período
          if (expenseDate >= startDate && expenseDate <= endDate) {
            totalExpenses += Number(e.amount);
          }
        } else {
          // Para despesas pendentes, verificar se o vencimento está no período
          const dateToCheck = dueDate || expenseDate;
          if (dateToCheck >= startDate && dateToCheck <= endDate) {
            pendingExpenses += Number(e.amount);
          }
        }
      });

      // Adicionar parcelas de empréstimos
      loanInstallments?.forEach((li) => {
        const dueDate = li.due_date ? new Date(li.due_date) : null;
        const paymentDate = li.payment_date ? new Date(li.payment_date) : null;

        if (li.status === "paid") {
          // Para parcelas pagas, verificar se a data de pagamento está no período
          if (paymentDate && paymentDate >= startDate && paymentDate <= endDate) {
            totalExpenses += Number(li.amount);
          }
        } else if (li.status === "pending") {
          // Para parcelas pendentes, verificar se o vencimento está no período
          if (dueDate && dueDate >= startDate && dueDate <= endDate) {
            pendingExpenses += Number(li.amount);
          }
        }
      });

      setData({
        totalRevenue,
        totalExpenses,
        pendingRevenue,
        pendingExpenses,
        overdueRevenue,
      });
    } catch (error) {
      console.error("Error fetching financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const balance = data.totalRevenue - data.totalExpenses;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seletores de Período */}
      <div className="flex flex-wrap gap-4 items-center">
        <span className="text-sm text-muted-foreground">Período:</span>
        
        {/* Data Início */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[180px] justify-start text-left font-normal",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(startDate, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => date && setStartDate(date)}
              initialFocus
              className="pointer-events-auto"
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>

        <span className="text-sm text-muted-foreground">até</span>

        {/* Data Fim */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[180px] justify-start text-left font-normal",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(endDate, "dd/MM/yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={(date) => date && setEndDate(date)}
              initialFocus
              className="pointer-events-auto"
              locale={ptBR}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Receitas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas Recebidas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.totalRevenue)}
            </div>
          </CardContent>
        </Card>

        {/* Total Despesas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Pagas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(data.totalExpenses)}
            </div>
          </CardContent>
        </Card>

        {/* Saldo */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(balance)}
            </div>
          </CardContent>
        </Card>

        {/* Receitas Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(data.pendingRevenue)}
            </div>
          </CardContent>
        </Card>

        {/* Receitas Atrasadas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas Atrasadas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.overdueRevenue)}
            </div>
          </CardContent>
        </Card>

        {/* Despesas Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Pagar</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(data.pendingExpenses)}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
