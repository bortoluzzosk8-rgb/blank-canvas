import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock } from "lucide-react";

type PaymentStatusCellProps = {
  saleId: string;
  totalValue: number;
  rentalStartDate?: string;
  refreshTrigger?: number;
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const PaymentStatusCell = ({ saleId, totalValue, rentalStartDate, refreshTrigger }: PaymentStatusCellProps) => {
  const [totalPaid, setTotalPaid] = useState(0);
  const [hasOverdue, setHasOverdue] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentStatus();
  }, [saleId, refreshTrigger]);

  const loadPaymentStatus = async () => {
    const { data, error } = await supabase
      .from('sale_payments')
      .select('amount, status, due_date')
      .eq('sale_id', saleId);

    if (error) {
      console.error('Erro ao carregar pagamentos:', error);
      setLoading(false);
      return;
    }

    const payments = data || [];
    const paid = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    setTotalPaid(paid);

    // Verificar pagamentos atrasados
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = payments.some(p => {
      if (p.status !== 'pending' || !p.due_date) return false;
      return new Date(p.due_date) < today;
    });

    setHasOverdue(overdue);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground">Carregando...</div>;
  }

  const balance = totalValue - totalPaid;
  const isFullyPaid = balance <= 0;

  // Se totalmente pago
  if (isFullyPaid) {
    return (
      <div className="flex flex-col gap-1">
        <Badge className="bg-green-500 hover:bg-green-600 inline-flex items-center justify-start w-fit">
          <CheckCircle className="w-3 h-3 mr-1" />
          Pago
        </Badge>
        <div className="text-xs font-semibold text-green-600">
          {formatCurrency(totalValue)}
        </div>
      </div>
    );
  }

  // Se tem pagamentos atrasados
  if (hasOverdue) {
    return (
      <div className="flex flex-col gap-1">
        <Badge variant="destructive" className="inline-flex items-center justify-start w-fit">
          <AlertCircle className="w-3 h-3 mr-1" />
          Atrasado
        </Badge>
        <div className="text-xs">
          <span className="text-muted-foreground">Pago: </span>
          <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
        </div>
        <div className="text-xs">
          <span className="text-muted-foreground">Falta: </span>
          <span className="font-semibold text-red-600">{formatCurrency(balance)}</span>
        </div>
      </div>
    );
  }

  // Verificar se é hoje ou passou da data da festa
  if (rentalStartDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rentalDate = new Date(rentalStartDate);
    rentalDate.setHours(0, 0, 0, 0);

    // Passou da data da festa
    if (rentalDate < today) {
      return (
        <div className="flex flex-col gap-1">
          <Badge variant="destructive" className="inline-flex items-center justify-start w-fit">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pendente (festa passou)
          </Badge>
          <div className="text-xs">
            <span className="text-muted-foreground">Pago: </span>
            <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Falta: </span>
            <span className="font-semibold text-red-600">{formatCurrency(balance)}</span>
          </div>
        </div>
      );
    }

    // É hoje
    if (rentalDate.getTime() === today.getTime()) {
      return (
        <div className="flex flex-col gap-1">
          <Badge className="bg-orange-500 hover:bg-orange-600 inline-flex items-center justify-start w-fit">
            <Clock className="w-3 h-3 mr-1" />
            Pendente (hoje)
          </Badge>
          <div className="text-xs">
            <span className="text-muted-foreground">Pago: </span>
            <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="text-xs">
            <span className="text-muted-foreground">Falta: </span>
            <span className="font-semibold text-orange-600">{formatCurrency(balance)}</span>
          </div>
        </div>
      );
    }
  }

  // Pagamento pendente normal
  return (
    <div className="flex flex-col gap-1">
      <Badge variant="secondary" className="inline-flex items-center justify-start w-fit">
        <Clock className="w-3 h-3 mr-1" />
        Pendente
      </Badge>
      <div className="text-xs">
        <span className="text-muted-foreground">Pago: </span>
        <span className="font-semibold text-green-600">{formatCurrency(totalPaid)}</span>
      </div>
      <div className="text-xs">
        <span className="text-muted-foreground">Falta: </span>
        <span className="font-semibold text-orange-600">{formatCurrency(balance)}</span>
      </div>
    </div>
  );
};
