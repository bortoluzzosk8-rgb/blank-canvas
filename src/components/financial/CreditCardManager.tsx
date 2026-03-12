import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, CreditCard, ChevronLeft, ChevronRight, Wallet, Receipt, TrendingDown, Check, ShoppingCart, Package } from "lucide-react";

interface ExpenseCategory {
  id: string;
  name: string;
  icon: string;
  franchise_id: string | null;
  parent_id: string | null;
}

interface AssetCategory {
  id: string;
  name: string;
  icon: string;
  franchise_id: string | null;
}

interface CreditCardType {
  id: string;
  name: string;
  bank: string | null;
  last_digits: string | null;
  closing_day: number | null;
  due_day: number | null;
  franchise_id: string | null;
  credit_limit: number | null;
}

interface Expense {
  id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  due_date: string | null;
  installment_number: number | null;
  installments: number | null;
  credit_card_id: string | null;
  notes: string | null;
  status: string | null;
}

export function CreditCardManager() {
  const { userFranchise } = useAuth();
  const franchiseId = userFranchise?.id;
  const [creditCards, setCreditCards] = useState<CreditCardType[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [assetCategories, setAssetCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null);
  const [activeTab, setActiveTab] = useState("invoice");
  
  // Invoice filters
  const [selectedCardId, setSelectedCardId] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Expense dialog state
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    bank: "",
    last_digits: "",
    closing_day: "",
    due_day: "",
    credit_limit: "",
  });

  const [expenseFormData, setExpenseFormData] = useState({
    expense_date: format(new Date(), "yyyy-MM-dd"),
    category: "",
    subcategory: "",
    description: "",
    amount: "",
    status: "pending",
    notes: "",
    installments: "1",
    due_month: new Date().getMonth().toString(),
    due_year: new Date().getFullYear().toString(),
    credit_card_id: "",
    // Asset fields
    is_asset: false,
    asset_category_id: "",
    asset_name: "",
  });

  useEffect(() => {
    fetchData();
  }, [franchiseId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch credit cards
      let cardsQuery = supabase
        .from("credit_cards")
        .select("*")
        .order("name");

      if (franchiseId) {
        cardsQuery = cardsQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`);
      }

      // Fetch expense categories
      let categoriesQuery = supabase
        .from("expense_categories")
        .select("*")
        .order("name");

      if (franchiseId) {
        categoriesQuery = categoriesQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`);
      } else {
        categoriesQuery = categoriesQuery.is("franchise_id", null);
      }

      // Fetch asset categories
      let assetCategoriesQuery = supabase
        .from("asset_categories")
        .select("*")
        .order("name");

      if (franchiseId) {
        assetCategoriesQuery = assetCategoriesQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`);
      } else {
        assetCategoriesQuery = assetCategoriesQuery.is("franchise_id", null);
      }

      // Fetch expenses with credit card
      let expensesQuery = supabase
        .from("expenses")
        .select("*")
        .not("credit_card_id", "is", null)
        .order("due_date");

      if (franchiseId) {
        expensesQuery = expensesQuery.or(`franchise_id.eq.${franchiseId},franchise_id.is.null`);
      }

      const [cardsResult, categoriesResult, assetCategoriesResult, expensesResult] = await Promise.all([
        cardsQuery,
        categoriesQuery,
        assetCategoriesQuery,
        expensesQuery,
      ]);

      if (cardsResult.error) throw cardsResult.error;
      if (categoriesResult.error) throw categoriesResult.error;
      if (assetCategoriesResult.error) throw assetCategoriesResult.error;
      if (expensesResult.error) throw expensesResult.error;

      setCreditCards(cardsResult.data || []);
      setExpenseCategories(categoriesResult.data || []);
      setAssetCategories(assetCategoriesResult.data || []);
      setExpenses(expensesResult.data || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Nome do cartão é obrigatório");
      return;
    }

    try {
      const cardData = {
        name: formData.name,
        bank: formData.bank || null,
        last_digits: formData.last_digits || null,
        closing_day: formData.closing_day ? parseInt(formData.closing_day) : null,
        due_day: formData.due_day ? parseInt(formData.due_day) : null,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
        franchise_id: franchiseId,
      };

      if (editingCard) {
        const { error } = await supabase
          .from("credit_cards")
          .update(cardData)
          .eq("id", editingCard.id);

        if (error) throw error;
        toast.success("Cartão atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("credit_cards").insert(cardData);
        if (error) throw error;
        toast.success("Cartão cadastrado com sucesso!");
      }

      resetForm();
      setDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving credit card:", error);
      toast.error("Erro ao salvar cartão");
    }
  };

  const handleEdit = (card: CreditCardType) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      bank: card.bank || "",
      last_digits: card.last_digits || "",
      closing_day: card.closing_day?.toString() || "",
      due_day: card.due_day?.toString() || "",
      credit_limit: card.credit_limit?.toString() || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este cartão?")) return;

    try {
      const { error } = await supabase.from("credit_cards").delete().eq("id", id);
      if (error) throw error;
      toast.success("Cartão excluído com sucesso!");
      fetchData();
    } catch (error) {
      console.error("Error deleting credit card:", error);
      toast.error("Erro ao excluir cartão");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      bank: "",
      last_digits: "",
      closing_day: "",
      due_day: "",
      credit_limit: "",
    });
    setEditingCard(null);
  };

  // Get expenses for the selected month (invoice - filtered by due_date)
  const getMonthExpenses = () => {
    const monthKey = format(selectedMonth, "yyyy-MM");
    
    return expenses.filter(expense => {
      if (!expense.due_date) return false;
      const expenseMonthKey = format(new Date(expense.due_date), "yyyy-MM");
      const matchesMonth = expenseMonthKey === monthKey;
      const matchesCard = selectedCardId === "all" || expense.credit_card_id === selectedCardId;
      return matchesMonth && matchesCard;
    });
  };

  // Get purchases for the selected month (filtered by expense_date - purchase date)
  const getPurchasesInMonth = () => {
    const monthKey = format(selectedMonth, "yyyy-MM");
    
    // Map to store unique purchases (first installment or non-installment)
    const uniquePurchases = new Map<string, Expense>();
    
    expenses.forEach(expense => {
      const purchaseMonthKey = format(new Date(expense.expense_date), "yyyy-MM");
      const matchesMonth = purchaseMonthKey === monthKey;
      const matchesCard = selectedCardId === "all" || expense.credit_card_id === selectedCardId;
      
      if (matchesMonth && matchesCard) {
        // Use first installment as reference for the total purchase, or non-installment expense
        if (expense.installment_number === 1 || !expense.installment_number || expense.installment_number === null) {
          uniquePurchases.set(expense.id, expense);
        }
      }
    });
    
    return Array.from(uniquePurchases.values()).sort((a, b) => 
      new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    );
  };

  // Calculate totals for purchases in the month
  const getPurchasesTotals = () => {
    const purchases = getPurchasesInMonth();
    const totalPurchased = purchases.reduce((sum, e) => {
      // Total value of purchase = amount * installments
      const totalValue = e.amount * (e.installments || 1);
      return sum + totalValue;
    }, 0);
    
    return {
      count: purchases.length,
      total: totalPurchased,
    };
  };

  // Calculate totals for a specific card
  const getCardTotals = (cardId: string) => {
    const card = creditCards.find(c => c.id === cardId);
    if (!card) return { limit: 0, used: 0, available: 0 };

    const cardExpenses = expenses.filter(e => 
      e.credit_card_id === cardId && 
      e.due_date && 
      new Date(e.due_date) >= new Date()
    );
    
    const usedAmount = cardExpenses.reduce((sum, e) => sum + e.amount, 0);
    const limit = card.credit_limit || 0;
    
    return {
      limit,
      used: usedAmount,
      available: limit - usedAmount
    };
  };

  // Calculate totals for the current month invoice
  const getInvoiceTotals = () => {
    const monthExpenses = getMonthExpenses();
    const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    if (selectedCardId === "all") {
      const totalLimit = creditCards.reduce((sum, c) => sum + (c.credit_limit || 0), 0);
      const allFutureExpenses = expenses.filter(e => 
        e.due_date && new Date(e.due_date) >= new Date()
      );
      const totalUsed = allFutureExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      return {
        limit: totalLimit,
        invoice: total,
        available: totalLimit - totalUsed
      };
    } else {
      const cardTotals = getCardTotals(selectedCardId);
      return {
        limit: cardTotals.limit,
        invoice: total,
        available: cardTotals.available
      };
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Check if all expenses in the month are paid
  const isInvoicePaid = () => {
    const pendingExpenses = monthExpenses.filter(e => e.status !== 'paid');
    return monthExpenses.length > 0 && pendingExpenses.length === 0;
  };

  // Pay all pending expenses in the month
  const handlePayInvoice = async () => {
    if (monthExpenses.length === 0) {
      toast.error("Não há despesas para pagar neste mês");
      return;
    }

    const pendingExpenses = monthExpenses.filter(e => e.status !== 'paid');
    if (pendingExpenses.length === 0) {
      toast.info("Todas as despesas já estão pagas");
      return;
    }

    if (!confirm(`Deseja marcar ${pendingExpenses.length} despesa(s) como pagas?`)) {
      return;
    }

    try {
      const expenseIds = pendingExpenses.map(e => e.id);
      
      const { error } = await supabase
        .from("expenses")
        .update({ 
          status: 'paid',
        })
        .in('id', expenseIds);

      if (error) throw error;
      
      toast.success(`${pendingExpenses.length} despesa(s) marcada(s) como paga(s)!`);
      fetchData();
    } catch (error) {
      console.error("Error paying invoice:", error);
      toast.error("Erro ao pagar fatura");
    }
  };

  const getCardName = (cardId: string | null) => {
    if (!cardId) return "-";
    const card = creditCards.find(c => c.id === cardId);
    return card ? card.name : "-";
  };

  // Calcula o mês/ano do vencimento baseado na data da compra e dia de fechamento do cartão
  const calculateDueMonthYear = (cardId: string, expenseDate: string): { month: number; year: number } => {
    const card = creditCards.find(c => c.id === cardId);
    const expDate = new Date(expenseDate);
    const closingDay = card?.closing_day || 1;
    
    let dueMonth = expDate.getMonth();
    let dueYear = expDate.getFullYear();

    // Se a compra foi após o fechamento, vai para a próxima fatura (mês seguinte)
    if (expDate.getDate() > closingDay) {
      const nextMonth = addMonths(expDate, 1);
      dueMonth = nextMonth.getMonth();
      dueYear = nextMonth.getFullYear();
    }

    return { month: dueMonth, year: dueYear };
  };

  // Monta a due_date completa usando o due_day do cartão + mês/ano selecionados
  const buildDueDate = (cardId: string, month: number, year: number): string => {
    const card = creditCards.find(c => c.id === cardId);
    const dueDay = card?.due_day || 1;
    const dueDate = new Date(year, month, dueDay);
    return format(dueDate, "yyyy-MM-dd");
  };

  // Handle card selection - auto-fill due month/year
  const handleCardSelect = (cardId: string) => {
    const { month, year } = calculateDueMonthYear(cardId, expenseFormData.expense_date);
    setExpenseFormData(prev => ({
      ...prev,
      credit_card_id: cardId,
      due_month: month.toString(),
      due_year: year.toString(),
    }));
  };

  // Handle expense date change - recalculate due month/year if card is selected
  const handleExpenseDateChange = (newDate: string) => {
    let newMonth = expenseFormData.due_month;
    let newYear = expenseFormData.due_year;
    
    if (expenseFormData.credit_card_id) {
      const result = calculateDueMonthYear(expenseFormData.credit_card_id, newDate);
      newMonth = result.month.toString();
      newYear = result.year.toString();
    }

    setExpenseFormData(prev => ({
      ...prev,
      expense_date: newDate,
      due_month: newMonth,
      due_year: newYear,
    }));
  };

  // Expense form functions
  const resetExpenseForm = () => {
    const defaultCardId = selectedCardId !== "all" ? selectedCardId : "";
    const defaultExpenseDate = format(new Date(), "yyyy-MM-dd");
    
    let defaultMonth = new Date().getMonth();
    let defaultYear = new Date().getFullYear();
    
    if (defaultCardId) {
      const result = calculateDueMonthYear(defaultCardId, defaultExpenseDate);
      defaultMonth = result.month;
      defaultYear = result.year;
    }
    
    setExpenseFormData({
      expense_date: defaultExpenseDate,
      category: "",
      subcategory: "",
      description: "",
      amount: "",
      status: "pending",
      notes: "",
      installments: "1",
      due_month: defaultMonth.toString(),
      due_year: defaultYear.toString(),
      credit_card_id: defaultCardId,
      is_asset: false,
      asset_category_id: "",
      asset_name: "",
    });
    setEditingExpense(null);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    // Parse due_date to get month/year
    let dueMonth = new Date().getMonth();
    let dueYear = new Date().getFullYear();
    if (expense.due_date) {
      const dueDateObj = new Date(expense.due_date);
      dueMonth = dueDateObj.getMonth();
      dueYear = dueDateObj.getFullYear();
    }
    
    setExpenseFormData({
      expense_date: expense.expense_date,
      category: expense.category,
      subcategory: "",
      description: expense.description,
      amount: expense.amount.toString(),
      status: expense.status || "pending",
      notes: expense.notes || "",
      installments: (expense.installments || 1).toString(),
      due_month: dueMonth.toString(),
      due_year: dueYear.toString(),
      credit_card_id: expense.credit_card_id || "",
      is_asset: false,
      asset_category_id: "",
      asset_name: "",
    });
    setExpenseDialogOpen(true);
  };

  // Check if selected category is "Patrimônio"
  const isAssetCategory = expenseFormData.category.toLowerCase() === "patrimônio";

  // Handle category change
  const handleCategoryChange = (value: string) => {
    const isPatrimonio = value.toLowerCase() === "patrimônio";
    setExpenseFormData(prev => ({
      ...prev,
      category: value,
      subcategory: "", // Reset subcategory when main category changes
      is_asset: isPatrimonio,
      // Clear asset fields if not patrimônio
      asset_category_id: isPatrimonio ? prev.asset_category_id : "",
      asset_name: isPatrimonio ? prev.asset_name : "",
    }));
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta despesa?")) return;

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

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!expenseFormData.category || !expenseFormData.description || !expenseFormData.amount) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (!expenseFormData.credit_card_id) {
      toast.error("Selecione o cartão de crédito");
      return;
    }

    // Validate asset fields if category is Patrimônio
    if (isAssetCategory && !editingExpense) {
      if (!expenseFormData.asset_name) {
        toast.error("Informe o nome do patrimônio");
        return;
      }
    }

    const installmentsCount = parseInt(expenseFormData.installments);

    // Calcular due_date a partir de mês/ano selecionados + dia do cartão
    const calculatedDueDate = buildDueDate(
      expenseFormData.credit_card_id,
      parseInt(expenseFormData.due_month),
      parseInt(expenseFormData.due_year)
    );

    try {
      let assetId: string | null = null;

      // If it's an asset category, create the asset first
      if (isAssetCategory && !editingExpense && expenseFormData.asset_name) {
        const { data: newAsset, error: assetError } = await supabase
          .from("assets")
          .insert({
            name: expenseFormData.asset_name,
            category_id: expenseFormData.asset_category_id || null,
            purchase_value: parseFloat(expenseFormData.amount),
            purchase_date: expenseFormData.expense_date,
            status: "active",
            franchise_id: franchiseId,
            description: `Compra via cartão de crédito em ${installmentsCount}x`,
          })
          .select()
          .single();

        if (assetError) throw assetError;
        assetId = newAsset.id;
        toast.success(`Patrimônio "${expenseFormData.asset_name}" cadastrado!`);
      }

      if (editingExpense) {
        // Update existing expense
        const expenseData = {
          expense_date: expenseFormData.expense_date,
          category: expenseFormData.category,
          description: expenseFormData.description,
          amount: parseFloat(expenseFormData.amount),
          payment_method: "credit_card",
          status: expenseFormData.status,
          notes: expenseFormData.notes || null,
          franchise_id: franchiseId,
          credit_card_id: expenseFormData.credit_card_id,
          due_date: calculatedDueDate,
        };

        const { error } = await supabase
          .from("expenses")
          .update(expenseData)
          .eq("id", editingExpense.id);

        if (error) throw error;
        toast.success("Despesa atualizada com sucesso!");
      } else {
        // Create new expense(s)
        if (installmentsCount > 1) {
          // Generate installments
          const totalAmount = parseFloat(expenseFormData.amount);
          const installmentAmount = totalAmount / installmentsCount;
          const firstDueDate = new Date(calculatedDueDate);

          // Create first expense (parent)
          const { data: parentExpense, error: parentError } = await supabase
            .from("expenses")
            .insert({
              expense_date: expenseFormData.expense_date,
              category: expenseFormData.category,
              description: expenseFormData.description,
              amount: installmentAmount,
              payment_method: "credit_card",
              status: expenseFormData.status,
              notes: expenseFormData.notes || null,
              franchise_id: franchiseId,
              installments: installmentsCount,
              installment_number: 1,
              due_date: calculatedDueDate,
              credit_card_id: expenseFormData.credit_card_id,
              asset_id: assetId,
            })
            .select()
            .single();

          if (parentError) throw parentError;

          // Create subsequent installments
          const subsequentInstallments = [];
          for (let i = 2; i <= installmentsCount; i++) {
            const dueDate = addMonths(firstDueDate, i - 1);
            subsequentInstallments.push({
              expense_date: expenseFormData.expense_date,
              category: expenseFormData.category,
              description: expenseFormData.description,
              amount: installmentAmount,
              payment_method: "credit_card",
              status: "pending",
              notes: expenseFormData.notes || null,
              franchise_id: franchiseId,
              installments: installmentsCount,
              installment_number: i,
              due_date: format(dueDate, "yyyy-MM-dd"),
              parent_expense_id: parentExpense.id,
              credit_card_id: expenseFormData.credit_card_id,
              asset_id: assetId,
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
            expense_date: expenseFormData.expense_date,
            category: expenseFormData.category,
            description: expenseFormData.description,
            amount: parseFloat(expenseFormData.amount),
            payment_method: "credit_card",
            status: expenseFormData.status,
            notes: expenseFormData.notes || null,
            franchise_id: franchiseId,
            installments: 1,
            installment_number: 1,
            due_date: calculatedDueDate,
            credit_card_id: expenseFormData.credit_card_id,
            asset_id: assetId,
          };

          const { error } = await supabase.from("expenses").insert(expenseData);
          if (error) throw error;
          toast.success("Despesa cadastrada com sucesso!");
        }
      }

      resetExpenseForm();
      setExpenseDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error saving expense:", error);
      toast.error("Erro ao salvar despesa");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const monthExpenses = getMonthExpenses();
  const invoiceTotals = getInvoiceTotals();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Cartões de Crédito
        </h2>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cartão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCard ? "Editar Cartão" : "Novo Cartão"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Cartão *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Itaú Platinum, Nubank"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank">Banco</Label>
                  <Input
                    id="bank"
                    placeholder="Ex: Itaú, Bradesco"
                    value={formData.bank}
                    onChange={(e) =>
                      setFormData({ ...formData, bank: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_digits">Últimos 4 dígitos</Label>
                  <Input
                    id="last_digits"
                    placeholder="1234"
                    maxLength={4}
                    value={formData.last_digits}
                    onChange={(e) =>
                      setFormData({ ...formData, last_digits: e.target.value.replace(/\D/g, "") })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="credit_limit">Limite do Cartão (R$)</Label>
                <Input
                  id="credit_limit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="10000.00"
                  value={formData.credit_limit}
                  onChange={(e) =>
                    setFormData({ ...formData, credit_limit: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="closing_day">Dia de Fechamento</Label>
                  <Input
                    id="closing_day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="15"
                    value={formData.closing_day}
                    onChange={(e) =>
                      setFormData({ ...formData, closing_day: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_day">Dia de Vencimento</Label>
                  <Input
                    id="due_day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="22"
                    value={formData.due_day}
                    onChange={(e) =>
                      setFormData({ ...formData, due_day: e.target.value })
                    }
                  />
                </div>
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
                  {editingCard ? "Salvar" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoice">Fatura do Mês</TabsTrigger>
          <TabsTrigger value="purchases">Compras no Mês</TabsTrigger>
          <TabsTrigger value="cards">Cartões ({creditCards.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="invoice" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedCardId} onValueChange={setSelectedCardId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione um cartão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Cartões</SelectItem>
                {creditCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 py-2 font-medium min-w-[150px] text-center border rounded-md">
                {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Limite Total</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(invoiceTotals.limit)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Fatura do Mês</CardTitle>
                <Receipt className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(invoiceTotals.invoice)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Limite Disponível</CardTitle>
                <TrendingDown className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${invoiceTotals.available >= 0 ? 'text-green-500' : 'text-destructive'}`}>
                  {formatCurrency(invoiceTotals.available)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoice Expenses Table */}
          <Card>
            <CardHeader className="py-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Fatura de {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
              
              <div className="flex items-center gap-2">
                {/* Add Purchase Button */}
                <Dialog
                  open={expenseDialogOpen}
                  onOpenChange={(open) => {
                    setExpenseDialogOpen(open);
                    if (!open) resetExpenseForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        resetExpenseForm();
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Compra
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {editingExpense ? "Editar Compra" : "Nova Compra no Cartão"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleExpenseSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expense_date">Data da Compra *</Label>
                          <Input
                            id="expense_date"
                            type="date"
                            value={expenseFormData.expense_date}
                            onChange={(e) => handleExpenseDateChange(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="credit_card_id">Cartão *</Label>
                          <Select
                            value={expenseFormData.credit_card_id}
                            onValueChange={handleCardSelect}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o cartão" />
                            </SelectTrigger>
                            <SelectContent>
                              {creditCards.map((card) => (
                                <SelectItem key={card.id} value={card.id}>
                                  {card.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Categoria *</Label>
                        <Select
                          value={expenseFormData.category}
                          onValueChange={handleCategoryChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
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

                      {/* Subcategory selector - show only if main category has subcategories */}
                      {expenseFormData.category && (() => {
                        const selectedMainCat = expenseCategories.find(
                          c => c.name === expenseFormData.category && !c.parent_id
                        );
                        const subcategories = selectedMainCat 
                          ? expenseCategories.filter(c => c.parent_id === selectedMainCat.id)
                          : [];
                        
                        if (subcategories.length === 0) return null;
                        
                        return (
                          <div className="space-y-2">
                            <Label htmlFor="subcategory">Subcategoria</Label>
                            <Select
                              value={expenseFormData.subcategory}
                              onValueChange={(value) =>
                                setExpenseFormData({ ...expenseFormData, subcategory: value })
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

                      {/* Asset fields - show when category is Patrimônio */}
                      {isAssetCategory && !editingExpense && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="asset_category_id">Tipo de Patrimônio</Label>
                            <Select
                              value={expenseFormData.asset_category_id}
                              onValueChange={(value) =>
                                setExpenseFormData({ ...expenseFormData, asset_category_id: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                {assetCategories.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.icon} {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="asset_name">Nome do Patrimônio *</Label>
                            <Input
                              id="asset_name"
                              placeholder="Ex: Bebedouro Electrolux"
                              value={expenseFormData.asset_name}
                              onChange={(e) =>
                                setExpenseFormData({ ...expenseFormData, asset_name: e.target.value })
                              }
                              required
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição *</Label>
                        <Input
                          id="description"
                          value={expenseFormData.description}
                          onChange={(e) =>
                            setExpenseFormData({ ...expenseFormData, description: e.target.value })
                          }
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Valor Total *</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            min="0"
                            value={expenseFormData.amount}
                            onChange={(e) =>
                              setExpenseFormData({ ...expenseFormData, amount: e.target.value })
                            }
                            required
                          />
                        </div>
                        {!editingExpense && (
                          <div className="space-y-2">
                            <Label htmlFor="installments">Parcelas</Label>
                            <Select
                              value={expenseFormData.installments}
                              onValueChange={(value) =>
                                setExpenseFormData({ ...expenseFormData, installments: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                                  <SelectItem key={num} value={num.toString()}>
                                    {num}x
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>
                            {!editingExpense && parseInt(expenseFormData.installments) > 1 
                              ? "Mês 1ª Parcela *" 
                              : "Mês Vencimento *"}
                          </Label>
                          <Select
                            value={expenseFormData.due_month}
                            onValueChange={(value) =>
                              setExpenseFormData({ ...expenseFormData, due_month: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Janeiro</SelectItem>
                              <SelectItem value="1">Fevereiro</SelectItem>
                              <SelectItem value="2">Março</SelectItem>
                              <SelectItem value="3">Abril</SelectItem>
                              <SelectItem value="4">Maio</SelectItem>
                              <SelectItem value="5">Junho</SelectItem>
                              <SelectItem value="6">Julho</SelectItem>
                              <SelectItem value="7">Agosto</SelectItem>
                              <SelectItem value="8">Setembro</SelectItem>
                              <SelectItem value="9">Outubro</SelectItem>
                              <SelectItem value="10">Novembro</SelectItem>
                              <SelectItem value="11">Dezembro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Ano *</Label>
                          <Select
                            value={expenseFormData.due_year}
                            onValueChange={(value) =>
                              setExpenseFormData({ ...expenseFormData, due_year: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2024">2024</SelectItem>
                              <SelectItem value="2025">2025</SelectItem>
                              <SelectItem value="2026">2026</SelectItem>
                              <SelectItem value="2027">2027</SelectItem>
                              <SelectItem value="2028">2028</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Preview da data de vencimento */}
                      {expenseFormData.credit_card_id && (
                        <p className="text-sm text-muted-foreground">
                          Vencimento: {format(
                            new Date(
                              parseInt(expenseFormData.due_year),
                              parseInt(expenseFormData.due_month),
                              creditCards.find(c => c.id === expenseFormData.credit_card_id)?.due_day || 1
                            ),
                            "dd/MM/yyyy"
                          )}
                        </p>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={expenseFormData.status}
                          onValueChange={(value) =>
                            setExpenseFormData({ ...expenseFormData, status: value })
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
                          value={expenseFormData.notes}
                          onChange={(e) =>
                            setExpenseFormData({ ...expenseFormData, notes: e.target.value })
                          }
                          rows={2}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setExpenseDialogOpen(false);
                            resetExpenseForm();
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

                {/* Pay Invoice Button */}
                {monthExpenses.length > 0 && (
                  isInvoicePaid() ? (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <Check className="h-4 w-4" />
                      Fatura Paga
                    </div>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={handlePayInvoice}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Pagar Fatura
                    </Button>
                  )
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    {selectedCardId === "all" && <TableHead>Cartão</TableHead>}
                    <TableHead>Categoria</TableHead>
                    <TableHead>Parcela</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="w-[80px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={selectedCardId === "all" ? 7 : 6} className="text-center py-8 text-muted-foreground">
                        Nenhuma despesa encontrada para este mês
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {monthExpenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          {selectedCardId === "all" && (
                            <TableCell>{getCardName(expense.credit_card_id)}</TableCell>
                          )}
                          <TableCell>{expense.category}</TableCell>
                          <TableCell>
                            {expense.installment_number && expense.installments 
                              ? `${expense.installment_number}/${expense.installments}`
                              : "-"
                            }
                          </TableCell>
                          <TableCell>
                            {expense.due_date 
                              ? format(new Date(expense.due_date), "dd/MM/yyyy")
                              : "-"
                            }
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditExpense(expense)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteExpense(expense.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={selectedCardId === "all" ? 6 : 5} className="font-bold text-right">
                          Total da Fatura
                        </TableCell>
                        <TableCell className="text-right font-bold text-destructive">
                          {formatCurrency(invoiceTotals.invoice)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchases" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <Select value={selectedCardId} onValueChange={setSelectedCardId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione um cartão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Cartões</SelectItem>
                {creditCards.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="px-4 py-2 font-medium min-w-[150px] text-center border rounded-md">
                {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Compras Realizadas</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getPurchasesTotals().count}</div>
                <p className="text-xs text-muted-foreground">
                  no mês de {format(selectedMonth, "MMMM", { locale: ptBR })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
                <Package className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(getPurchasesTotals().total)}
                </div>
                <p className="text-xs text-muted-foreground">
                  valor total das compras
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Purchases Table */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">
                Compras de {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border-t">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cartão</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead>Parcelas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPurchasesInMonth().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                          Nenhuma compra registrada neste mês
                        </TableCell>
                      </TableRow>
                    ) : (
                      getPurchasesInMonth().map((purchase) => (
                        <TableRow key={purchase.id}>
                          <TableCell>
                            {format(new Date(purchase.expense_date), "dd/MM")}
                          </TableCell>
                          <TableCell>
                            {getCardName(purchase.credit_card_id)}
                          </TableCell>
                          <TableCell>{purchase.category}</TableCell>
                          <TableCell>{purchase.description}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(purchase.amount * (purchase.installments || 1))}
                          </TableCell>
                          <TableCell>
                            {purchase.installments && purchase.installments > 1 
                              ? `${purchase.installments}x de ${formatCurrency(purchase.amount)}`
                              : "À vista"
                            }
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          {/* Cards Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Final</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Fechamento</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {creditCards.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum cartão cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  creditCards.map((card) => {
                    const cardTotals = getCardTotals(card.id);
                    return (
                      <TableRow key={card.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-primary" />
                            {card.name}
                          </div>
                        </TableCell>
                        <TableCell>{card.bank || "-"}</TableCell>
                        <TableCell>
                          {card.last_digits ? `•••• ${card.last_digits}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{formatCurrency(card.credit_limit || 0)}</span>
                            <span className="text-xs text-muted-foreground">
                              Disp: {formatCurrency(cardTotals.available)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {card.closing_day ? `Dia ${card.closing_day}` : "-"}
                        </TableCell>
                        <TableCell>
                          {card.due_day ? `Dia ${card.due_day}` : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(card)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(card.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
