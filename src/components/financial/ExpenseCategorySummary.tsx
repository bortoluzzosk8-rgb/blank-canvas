import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  amount: number;
  status: string;
  type: "general" | "purchase" | "loan";
  due_date?: string | null;
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  franchise_id: string | null;
  parent_id: string | null;
}

const FALLBACK_LABELS: Record<string, string> = {
  combustivel: "Combustível",
  aluguel: "Aluguel",
  manutencao: "Manutenção",
  salarios: "Salários",
  marketing: "Marketing",
  impostos: "Impostos",
  servicos: "Serviços",
  materiais: "Materiais",
  outros: "Outros",
  emprestimo: "Empréstimo",
  compra: "Compra",
};

export function ExpenseCategorySummary() {
  const { userFranchise } = useAuth();
  const franchiseId = userFranchise?.id;
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryMonth, setSummaryMonth] = useState<number>(new Date().getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState<number>(new Date().getFullYear());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  useEffect(() => {
    fetchData();
  }, [franchiseId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch expense categories
      let categoriesQuery = supabase
        .from("expense_categories")
        .select("*")
        .order("name");

      if (franchiseId) {
        categoriesQuery = categoriesQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`);
      }

      // Fetch general expenses
      let expensesQuery = supabase
        .from("expenses")
        .select("id, expense_date, category, amount, status, due_date")
        .order("due_date", { ascending: true, nullsFirst: false });

      if (franchiseId) {
        expensesQuery = expensesQuery.eq("franchise_id", franchiseId);
      }

      // Fetch purchases
      let purchasesQuery = supabase
        .from("purchases")
        .select("id, purchase_date, total_value")
        .order("purchase_date", { ascending: false });

      if (franchiseId) {
        purchasesQuery = purchasesQuery.eq("franchise_id", franchiseId);
      }

      // Fetch loans and installments
      let loansQuery = supabase
        .from("loans")
        .select("id, name, installments")
        .eq("status", "active");

      let loanInstallmentsQuery = supabase
        .from("loan_installments")
        .select("*")
        .order("due_date", { ascending: true });

      if (franchiseId) {
        loansQuery = loansQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`);
        loanInstallmentsQuery = loanInstallmentsQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`);
      } else {
        loansQuery = loansQuery.is("franchise_id", null);
        loanInstallmentsQuery = loanInstallmentsQuery.is("franchise_id", null);
      }

      const [categoriesResult, expensesResult, purchasesResult, loanInstallmentsResult] = await Promise.all([
        categoriesQuery,
        expensesQuery,
        purchasesQuery,
        loanInstallmentsQuery,
      ]);

      setExpenseCategories(categoriesResult.data || []);

      // Combine all expenses
      const generalExpenses = expensesResult.data?.map((e) => ({ 
        ...e, 
        type: "general" as const 
      })) || [];

      const purchaseExpenses = purchasesResult.data?.map((p) => ({
        id: p.id,
        expense_date: p.purchase_date,
        category: "compra",
        amount: p.total_value,
        status: "paid" as const,
        type: "purchase" as const,
        due_date: null,
      })) || [];

      const loanExpenses = loanInstallmentsResult.data?.map((inst) => ({
        id: inst.id,
        expense_date: inst.due_date,
        category: "emprestimo",
        amount: inst.amount,
        status: inst.status === "paid" ? "paid" : "pending",
        type: "loan" as const,
        due_date: inst.due_date,
      })) || [];

      setAllExpenses([...generalExpenses, ...purchaseExpenses, ...loanExpenses]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (categoryName: string): string => {
    const category = expenseCategories.find(c => c.name === categoryName);
    if (category) return `${category.icon} ${category.name}`;
    return FALLBACK_LABELS[categoryName] || categoryName;
  };

  const getCategorySummary = () => {
    const filtered = allExpenses.filter(expense => {
      const expenseDate = new Date(expense.due_date || expense.expense_date);
      return (
        expenseDate.getMonth() + 1 === summaryMonth &&
        expenseDate.getFullYear() === summaryYear
      );
    });

    const categoryMap = new Map<string, { paid: number; pending: number; total: number }>();

    filtered.forEach(expense => {
      const categoryKey = expense.type === "loan" ? "emprestimo" : expense.category;
      const current = categoryMap.get(categoryKey) || { paid: 0, pending: 0, total: 0 };
      
      if (expense.status === "paid") {
        current.paid += expense.amount;
      } else {
        current.pending += expense.amount;
      }
      current.total += expense.amount;
      
      categoryMap.set(categoryKey, current);
    });

    return Array.from(categoryMap.entries())
      .map(([category, totals]) => ({
        category,
        label: getCategoryLabel(category),
        ...totals,
      }))
      .sort((a, b) => b.total - a.total);
  };

  const categorySummary = getCategorySummary();
  const totalCategorySummary = categorySummary.reduce(
    (acc, cat) => ({
      paid: acc.paid + cat.paid,
      pending: acc.pending + cat.pending,
      total: acc.total + cat.total,
    }),
    { paid: 0, pending: 0, total: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            📊 Resumo por Categoria
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={summaryMonth.toString()}
              onValueChange={(v) => setSummaryMonth(parseInt(v))}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Janeiro</SelectItem>
                <SelectItem value="2">Fevereiro</SelectItem>
                <SelectItem value="3">Março</SelectItem>
                <SelectItem value="4">Abril</SelectItem>
                <SelectItem value="5">Maio</SelectItem>
                <SelectItem value="6">Junho</SelectItem>
                <SelectItem value="7">Julho</SelectItem>
                <SelectItem value="8">Agosto</SelectItem>
                <SelectItem value="9">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={summaryYear.toString()}
              onValueChange={(v) => setSummaryYear(parseInt(v))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025, 2026].map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="py-2">
        {categorySummary.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhuma despesa encontrada para o período selecionado.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Pago</TableHead>
                <TableHead className="text-right">Pendente</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categorySummary.map((cat) => (
                <TableRow key={cat.category}>
                  <TableCell>
                    <Badge variant="outline">{cat.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(cat.paid)}
                  </TableCell>
                  <TableCell className="text-right text-yellow-600">
                    {formatCurrency(cat.pending)}
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                    {formatCurrency(cat.total)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right text-green-600">
                  {formatCurrency(totalCategorySummary.paid)}
                </TableCell>
                <TableCell className="text-right text-yellow-600">
                  {formatCurrency(totalCategorySummary.pending)}
                </TableCell>
                <TableCell className="text-right text-red-600">
                  {formatCurrency(totalCategorySummary.total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
