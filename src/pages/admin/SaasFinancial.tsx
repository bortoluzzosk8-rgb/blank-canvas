import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Receipt } from "lucide-react";
import { format, subMonths, startOfMonth, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

const SaasFinancial = () => {
  const [period, setPeriod] = useState("current-month");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["saas-financial-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_payments")
        .select("*, franchises(name, city)")
        .eq("status", "paid")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filteredPayments = useMemo(() => {
    const now = new Date();
    let cutoff: Date | null = null;

    if (period === "current-month") {
      cutoff = startOfMonth(now);
    } else if (period === "3-months") {
      cutoff = subMonths(now, 3);
    } else if (period === "6-months") {
      cutoff = subMonths(now, 6);
    }

    if (!cutoff) return payments;
    return payments.filter((p) => p.payment_date && isAfter(new Date(p.payment_date), cutoff!));
  }, [payments, period]);

  const totalRevenue = filteredPayments.reduce((sum, p) => sum + Number(p.value || 0), 0);
  const totalAllTime = payments.reduce((sum, p) => sum + Number(p.value || 0), 0);
  const paymentCount = filteredPayments.length;

  const billingLabel = (type: string) => {
    const map: Record<string, string> = { PIX: "Pix", BOLETO: "Boleto", CREDIT_CARD: "Cartão", UNDEFINED: "—" };
    return map[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Financeiro SaaS</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="current-month">Mês atual</SelectItem>
            <SelectItem value="3-months">Últimos 3 meses</SelectItem>
            <SelectItem value="6-months">Últimos 6 meses</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita no Período</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totalAllTime.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos no Período</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{paymentCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receitas (Pagamentos Recebidos)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : filteredPayments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum pagamento encontrado no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Franquia</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        {(p.franchises as any)?.name || "—"}
                        {(p.franchises as any)?.city && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({(p.franchises as any).city})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-green-600 font-semibold">
                        R$ {Number(p.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {p.payment_date
                          ? format(new Date(p.payment_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{billingLabel(p.billing_type)}</Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(p.due_date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SaasFinancial;
