import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const monthOptions = [
  { value: 0, label: "Todos" },
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

const yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CreditCard, Landmark, Search } from "lucide-react";

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  status: string;
  notes: string | null;
  type: "general" | "purchase" | "loan";
  installments?: number;
  installment_number?: number;
  due_date?: string | null;
  parent_expense_id?: string | null;
  credit_card_id?: string | null;
}

interface Purchase {
  id: string;
  purchase_date: string;
  product: string;
  supplier: string;
  total_value: number;
  payment_method: string;
}

interface LoanInstallment {
  id: string;
  loan_id: string;
  installment_number: number;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  loan_name: string;
  loan_installments: number;
}

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  franchise_id: string | null;
  parent_id: string | null;
}

interface CreditCardType {
  id: string;
  name: string;
  bank: string | null;
  last_digits: string | null;
  closing_day: number | null;
  due_day: number | null;
}

// Fallback labels for legacy categories and special types
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

export function ExpenseList() {
  const { userFranchise } = useAuth();
  const franchiseId = userFranchise?.id;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loanInstallments, setLoanInstallments] = useState<LoanInstallment[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    expense_date: format(new Date(), "yyyy-MM-dd"),
    category: "",
    subcategory: "",
    description: "",
    amount: "",
    payment_method: "cash",
    status: "pending",
    notes: "",
    installments: "1",
    due_date: "",
    credit_card_id: "",
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
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

      // Fetch credit cards
      let creditCardsQuery = supabase
        .from("credit_cards")
        .select("*")
        .order("name");

      if (franchiseId) {
        creditCardsQuery = creditCardsQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`);
      }

      // Fetch general expenses
      let expensesQuery = supabase
        .from("expenses")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("expense_date", { ascending: false });

      if (franchiseId) {
        expensesQuery = expensesQuery.eq("franchise_id", franchiseId);
      }

      // Fetch purchases
      let purchasesQuery = supabase
        .from("purchases")
        .select("*")
        .order("purchase_date", { ascending: false });

      if (franchiseId) {
        purchasesQuery = purchasesQuery.eq("franchise_id", franchiseId);
      }

      // Fetch loans and installments for financial preview
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

      const [categoriesResult, creditCardsResult, expensesResult, purchasesResult, loansResult, loanInstallmentsResult] = await Promise.all([
        categoriesQuery,
        creditCardsQuery,
        expensesQuery,
        purchasesQuery,
        loansQuery,
        loanInstallmentsQuery,
      ]);

      setExpenseCategories(categoriesResult.data || []);
      setCreditCards(creditCardsResult.data || []);
      setExpenses(
        expensesResult.data?.map((e) => ({ ...e, type: "general" as const })) || []
      );
      setPurchases(purchasesResult.data || []);

      // Map loan installments with loan info
      const loansMap = new Map(loansResult.data?.map(l => [l.id, l]) || []);
      const installmentsWithLoanInfo = loanInstallmentsResult.data?.map(inst => ({
        ...inst,
        loan_name: loansMap.get(inst.loan_id)?.name || "Empréstimo",
        loan_installments: loansMap.get(inst.loan_id)?.installments || 0,
      })) || [];
      setLoanInstallments(installmentsWithLoanInfo);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get category label from dynamic categories or fallback
  const getCategoryLabel = (categoryName: string): string => {
    const category = expenseCategories.find(c => c.name === categoryName);
    if (category) return `${category.icon} ${category.name}`;
    return FALLBACK_LABELS[categoryName] || categoryName;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.category || !formData.description || !formData.amount) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const isCreditCard = formData.payment_method === "credit_card";
    const installmentsCount = parseInt(formData.installments);

    if (isCreditCard && !formData.credit_card_id) {
      toast.error("Selecione o cartão de crédito");
      return;
    }

    if (isCreditCard && installmentsCount > 1 && !formData.due_date) {
      toast.error("Informe a data de vencimento da primeira parcela");
      return;
    }

    try {
      const creditCardId = isCreditCard && formData.credit_card_id ? formData.credit_card_id : null;
      
      if (editingExpense) {
        // Update existing expense
        const expenseData = {
          expense_date: formData.expense_date,
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method,
          status: formData.status,
          notes: formData.notes || null,
          franchise_id: franchiseId,
          credit_card_id: creditCardId,
        };

        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", editingExpense.id);

        if (error) throw error;
        toast.success("Despesa atualizada com sucesso!");
      } else {
        // Create new expense(s)
        if (isCreditCard && installmentsCount > 1) {
          // Generate installments
          const totalAmount = parseFloat(formData.amount);
          const installmentAmount = totalAmount / installmentsCount;
          const firstDueDate = new Date(formData.due_date);

          // Create first expense (parent)
          const { data: parentExpense, error: parentError } = await supabase
            .from("expenses")
            .insert({
              expense_date: formData.expense_date,
              category: formData.category,
              description: formData.description,
              amount: installmentAmount,
              payment_method: formData.payment_method,
              status: formData.status,
              notes: formData.notes || null,
              franchise_id: franchiseId,
              installments: installmentsCount,
              installment_number: 1,
              due_date: formData.due_date,
              credit_card_id: creditCardId,
            })
            .select()
            .single();

          if (parentError) throw parentError;

          // Create subsequent installments
          const subsequentInstallments = [];
          for (let i = 2; i <= installmentsCount; i++) {
            const dueDate = addMonths(firstDueDate, i - 1);
            subsequentInstallments.push({
              expense_date: formData.expense_date,
              category: formData.category,
              description: formData.description,
              amount: installmentAmount,
              payment_method: formData.payment_method,
              status: "pending",
              notes: formData.notes || null,
              franchise_id: franchiseId,
              installments: installmentsCount,
              installment_number: i,
              due_date: format(dueDate, "yyyy-MM-dd"),
              parent_expense_id: parentExpense.id,
              credit_card_id: creditCardId,
            });
          }

          if (subsequentInstallments.length > 0) {
            const { error: installmentsError } = await supabase
              .from("expenses")
              .insert(subsequentInstallments);

            if (installmentsError) throw installmentsError;
          }

          toast.success(`${installmentsCount} parcelas criadas com sucesso!`);
        } else {
          // Single expense
          const expenseData = {
            expense_date: formData.expense_date,
            category: formData.category,
            description: formData.description,
            amount: parseFloat(formData.amount),
            payment_method: formData.payment_method,
            status: formData.status,
            notes: formData.notes || null,
            franchise_id: franchiseId,
            installments: 1,
            installment_number: 1,
            due_date: isCreditCard && formData.due_date ? formData.due_date : null,
            credit_card_id: creditCardId,
          };

          const { error } = await supabase.from("expenses").insert(expenseData);
          if (error) throw error;
          toast.success("Despesa cadastrada com sucesso!");
        }
      }

      resetForm();
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Erro ao salvar despesa");
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      expense_date: expense.expense_date,
      category: expense.category,
      subcategory: "",
      description: expense.description,
      amount: expense.amount.toString(),
      payment_method: expense.payment_method || "cash",
      status: expense.status,
      notes: expense.notes || "",
      installments: (expense.installments || 1).toString(),
      due_date: expense.due_date || "",
      credit_card_id: expense.credit_card_id || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa? As parcelas vinculadas também serão excluídas.")) return;

    try {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      toast.success("Despesa excluída com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Erro ao excluir despesa");
    }
  };

  const resetForm = () => {
    setFormData({
      expense_date: format(new Date(), "yyyy-MM-dd"),
      category: "",
      subcategory: "",
      description: "",
      amount: "",
      payment_method: "cash",
      status: "pending",
      notes: "",
      installments: "1",
      due_date: "",
      credit_card_id: "",
    });
    setEditingExpense(null);
  };

  // Helper to get card name
  const getCreditCardName = (cardId: string | null | undefined): string => {
    if (!cardId) return "";
    const card = creditCards.find(c => c.id === cardId);
    if (!card) return "";
    return card.last_digits ? `${card.name} (•••• ${card.last_digits})` : card.name;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-500">Pago</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const allExpenses: Expense[] = [
    ...expenses,
    ...purchases.map((p) => ({
      id: p.id,
      expense_date: p.purchase_date,
      category: "compra",
      description: `${p.product} - ${p.supplier}`,
      amount: p.total_value,
      payment_method: p.payment_method || "cash",
      status: "paid" as const,
      notes: null,
      type: "purchase" as const,
      due_date: null,
    })),
    // Add loan installments for financial forecasting
    ...loanInstallments.map((inst) => ({
      id: inst.id,
      expense_date: inst.due_date,
      category: "emprestimo",
      description: `${inst.loan_name} - Parcela ${inst.installment_number}/${inst.loan_installments}`,
      amount: inst.amount,
      payment_method: "boleto",
      status: inst.status === "paid" ? "paid" : "pending",
      notes: null,
      type: "loan" as const,
      due_date: inst.due_date,
      installments: inst.loan_installments,
      installment_number: inst.installment_number,
    })),
  ].sort((a, b) => {
    // Sort by due_date first (if exists), then by expense_date
    const dateA = a.due_date || a.expense_date;
    const dateB = b.due_date || b.expense_date;
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });

  // Apply month filter first
  let filteredExpenses = allExpenses;
  if (selectedMonth !== 0) {
    filteredExpenses = filteredExpenses.filter(e => {
      const expenseDate = e.due_date || e.expense_date;
      if (expenseDate) {
        const date = new Date(expenseDate + "T00:00:00");
        return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear;
      }
      return false;
    });
  }

  // Apply search filter
  if (searchTerm.trim()) {
    const search = searchTerm.toLowerCase();
    filteredExpenses = filteredExpenses.filter(e => 
      e.description.toLowerCase().includes(search) ||
      e.category.toLowerCase().includes(search) ||
      (e.notes && e.notes.toLowerCase().includes(search))
    );
  }

  // Calculate installment preview
  const isCreditCard = formData.payment_method === "credit_card";
  const installmentsCount = parseInt(formData.installments) || 1;
  const totalAmount = parseFloat(formData.amount) || 0;
  const installmentAmount = installmentsCount > 0 ? totalAmount / installmentsCount : 0;

  const getInstallmentPreview = () => {
    if (!isCreditCard || installmentsCount <= 1 || !formData.due_date || !totalAmount) {
      return [];
    }

    const firstDueDate = new Date(formData.due_date);
    const previews = [];

    for (let i = 1; i <= installmentsCount; i++) {
      const dueDate = addMonths(firstDueDate, i - 1);
      previews.push({
        number: i,
        amount: installmentAmount,
        dueDate: format(dueDate, "dd/MM/yyyy", { locale: ptBR }),
      });
    }

    return previews;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Button */}
      <div className="flex flex-wrap gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar despesas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[280px]"
            />
          </div>
          
          <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Despesa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? "Editar Despesa" : "Nova Despesa"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expense_date">Data *</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expense_date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value, subcategory: "" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories
                        .filter((cat) => !cat.parent_id)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subcategory selector - show only if main category has subcategories */}
              {formData.category && (() => {
                const selectedMainCat = expenseCategories.find(
                  c => c.name === formData.category && !c.parent_id
                );
                const subcategories = selectedMainCat 
                  ? expenseCategories.filter(c => c.parent_id === selectedMainCat.id)
                  : [];
                
                if (subcategories.length === 0) return null;
                
                return (
                  <div className="space-y-2">
                    <Label htmlFor="subcategory">Subcategoria</Label>
                    <Select
                      value={formData.subcategory}
                      onValueChange={(value) =>
                        setFormData({ ...formData, subcategory: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma subcategoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.name}>
                            {sub.icon} {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor Total (R$) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Método</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, payment_method: value, installments: value === "credit_card" ? formData.installments : "1" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Dinheiro</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="credit_card">Cartão Crédito</SelectItem>
                      <SelectItem value="debit_card">Cartão Débito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="transfer">Transferência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Credit Card Selection */}
              {isCreditCard && creditCards.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="credit_card_id">Cartão *</Label>
                  <Select
                    value={formData.credit_card_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, credit_card_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {creditCards.map((card) => (
                        <SelectItem key={card.id} value={card.id}>
                          💳 {card.name} {card.last_digits && `(•••• ${card.last_digits})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Credit Card Installment Fields */}
              {isCreditCard && !editingExpense && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Parcelamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="installments">Parcelas</Label>
                        <Select
                          value={formData.installments}
                          onValueChange={(value) =>
                            setFormData({ ...formData, installments: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                              <SelectItem key={n} value={n.toString()}>
                                {n}x {n > 1 && `de ${formatCurrency(totalAmount / n)}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="due_date">Venc. 1ª Parcela</Label>
                        <Input
                          id="due_date"
                          type="date"
                          value={formData.due_date}
                          onChange={(e) =>
                            setFormData({ ...formData, due_date: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {/* Installment Preview */}
                    {getInstallmentPreview().length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Prévia das Parcelas:</Label>
                        <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
                          {getInstallmentPreview().map((p) => (
                            <div key={p.number} className="flex justify-between py-1 border-b border-border/50">
                              <span>Parcela {p.number}/{installmentsCount}</span>
                              <span className="font-medium">{formatCurrency(p.amount)} - {p.dueDate}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingExpense ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Cartão</TableHead>
              <TableHead>Parcela</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma despesa encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((expense) => (
                <TableRow key={`${expense.type}-${expense.id}`}>
                  <TableCell>{formatDate(expense.expense_date)}</TableCell>
                  <TableCell>
                    {(expense as Expense).due_date ? (
                      <span className="text-muted-foreground">
                        {formatDate((expense as Expense).due_date!)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {expense.type === "loan" ? (
                      <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950 gap-1">
                        <Landmark className="h-3 w-3" />
                        Empréstimo
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {getCategoryLabel(expense.category)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {expense.description}
                  </TableCell>
                  <TableCell className="text-red-600 font-medium">
                    {formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell>
                    {expense.credit_card_id ? (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <CreditCard className="h-3 w-3" />
                        {getCreditCardName(expense.credit_card_id)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(expense as Expense).installments && (expense as Expense).installments! > 1 ? (
                      <Badge variant="outline" className="gap-1">
                        <CreditCard className="h-3 w-3" />
                        {(expense as Expense).installment_number}/{(expense as Expense).installments}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(expense.status)}</TableCell>
                  <TableCell>
                    {expense.type === "general" ? (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(expense.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : expense.type === "loan" ? (
                      <span className="text-xs text-muted-foreground">Gerenciar em Empréstimos</span>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
