import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Payment {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  payment_date: string | null;
  due_date: string | null;
  sale_id: string;
  clientName?: string;
  rentalStartDate?: string | null;
}

export function RevenueList() {
  const { userFranchise } = useAuth();
  const franchiseId = userFranchise?.id;
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [monthForecast, setMonthForecast] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = [
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

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  useEffect(() => {
    fetchPayments();
  }, [franchiseId]);

  useEffect(() => {
    fetchMonthForecast();
  }, [franchiseId, selectedMonth, selectedYear]);

  const fetchMonthForecast = async () => {
    try {
      let query = supabase
        .from("sales")
        .select("total_value, rental_start_date, delivery_date, franchise_id, status")
        .not("status", "in", "(cancelled,canceled)");
      
      if (franchiseId) {
        query = query.eq("franchise_id", franchiseId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching month forecast:", error);
        return;
      }
      
      if (data) {
        // Se "Todos" estiver selecionado, soma tudo
        if (selectedMonth === 0) {
          const forecast = data.reduce((sum, sale) => sum + (sale.total_value || 0), 0);
          setMonthForecast(forecast);
          return;
        }
        
        // Usar mês e ano selecionados pelo filtro
        const firstDay = new Date(selectedYear, selectedMonth - 1, 1).toISOString().split("T")[0];
        const lastDay = new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0];
        
        const forecast = data
          .filter(sale => {
            const rentalDate = sale.rental_start_date;
            const deliveryDate = sale.delivery_date;
            const isRentalInMonth = rentalDate && rentalDate >= firstDay && rentalDate <= lastDay;
            const isDeliveryInMonth = deliveryDate && deliveryDate >= firstDay && deliveryDate <= lastDay;
            return isRentalInMonth || isDeliveryInMonth;
          })
          .reduce((sum, sale) => sum + (sale.total_value || 0), 0);
        
        setMonthForecast(forecast);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("sale_payments")
        .select(`
          id,
          amount,
          status,
          payment_method,
          payment_date,
          due_date,
          sale_id,
          sales!inner(client_name, franchise_id, rental_start_date)
        `)
        .order("created_at", { ascending: false });

      if (franchiseId) {
        query = query.eq("sales.franchise_id", franchiseId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching payments:", error);
        return;
      }

      const formattedPayments = data?.map((p: any) => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        payment_method: p.payment_method,
        payment_date: p.payment_date,
        due_date: p.due_date,
        sale_id: p.sale_id,
        clientName: p.sales?.client_name,
        rentalStartDate: p.sales?.rental_start_date,
      })) || [];

      setPayments(formattedPayments);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, dueDate: string | null, rentalStartDate: string | null) => {
    const today = new Date().toISOString().split("T")[0];
    const referenceDate = dueDate || rentalStartDate;
    const isOverdue = referenceDate && referenceDate < today && status === "pending";

    if (isOverdue) {
      return <Badge variant="destructive">Atrasado</Badge>;
    }

    switch (status) {
      case "paid":
      case "confirmed":
        return <Badge className="bg-green-500">Pago</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "cancelled":
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: "Dinheiro",
      pix: "PIX",
      credit_card: "Cartão Crédito",
      debit_card: "Cartão Débito",
      boleto: "Boleto",
      transfer: "Transferência",
    };
    return methods[method] || method;
  };

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesSearch = p.clientName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por mês/ano
    let matchesMonth = true;
    if (selectedMonth !== 0) {
      const paymentDate = p.due_date || p.payment_date || p.rentalStartDate;
      if (paymentDate) {
        const date = new Date(paymentDate + "T00:00:00");
        matchesMonth = (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear;
      } else {
        matchesMonth = false;
      }
    }
    
    return matchesStatus && matchesSearch && matchesMonth;
  });

  const today = new Date().toISOString().split("T")[0];

  const totals = filteredPayments.reduce(
    (acc, p) => {
      if (p.status === "paid" || p.status === "confirmed") {
        acc.received += p.amount;
      } else if (p.status === "pending") {
        // Usa due_date se existir, senão usa rental_start_date
        const referenceDate = p.due_date || p.rentalStartDate;
        const isOverdue = referenceDate && referenceDate < today;
        if (isOverdue) {
          acc.overdue += p.amount;
        } else {
          acc.pending += p.amount;
        }
      }
      return acc;
    },
    { received: 0, pending: 0, overdue: 0 }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <Input
          placeholder="Buscar por cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        
        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Mês" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
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
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="paid">Pagos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Totals */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(totals.received)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Previsão do Mês</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(monthForecast)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Locações agendadas para {selectedMonth === 0 ? "todos os meses" : format(new Date(selectedYear, selectedMonth - 1), "MMMM/yyyy", { locale: ptBR })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-xl font-bold text-red-600">
              {formatCurrency(totals.overdue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pagamentos com vencimento ultrapassado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium">Total Pendente</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="text-xl font-bold text-yellow-600">
              {formatCurrency(totals.pending)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum pagamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.clientName || "-"}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                  <TableCell>{formatDate(payment.due_date)}</TableCell>
                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>{getStatusBadge(payment.status, payment.due_date, payment.rentalStartDate)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
