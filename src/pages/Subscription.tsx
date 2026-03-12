import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, CreditCard, QrCode, Clock, CheckCircle, AlertCircle, XCircle, Loader2, Copy, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const PLAN_PRICES: Record<string, number> = {
  lancamento: 59,
};

const PLAN_NAMES: Record<string, string> = {
  lancamento: "Lançamento",
};

interface SubscriptionPayment {
  id: string;
  asaas_payment_id: string;
  billing_type: string;
  value: number;
  status: string;
  due_date: string;
  payment_date: string | null;
  boleto_url: string | null;
  pix_qrcode: string | null;
  pix_qrcode_image: string | null;
  created_at: string;
}

interface FranchiseData {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  subscription_plan: string | null;
  subscription_status: string | null;
  next_due_date: string | null;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  payment_method: string | null;
}

const Subscription = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscriptionStatus, loading: loadingStatus } = useSubscriptionStatus(user?.id);
  
  const [franchise, setFranchise] = useState<FranchiseData | null>(null);
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('lancamento');
  const [showPixModal, setShowPixModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [currentPaymentData, setCurrentPaymentData] = useState<{
    pixQrcode?: string;
    pixQrcodeImage?: string;
  } | null>(null);

  // Form state for customer info
  const [customerName, setCustomerName] = useState('');
  const [customerCpfCnpj, setCustomerCpfCnpj] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Credit card form state
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiryMonth, setCardExpiryMonth] = useState('');
  const [cardExpiryYear, setCardExpiryYear] = useState('');
  const [cardCcv, setCardCcv] = useState('');
  const [cardPostalCode, setCardPostalCode] = useState('');
  const [cardAddressNumber, setCardAddressNumber] = useState('');

  useEffect(() => {
    if (subscriptionStatus?.franchiseId) {
      fetchFranchiseData();
      fetchPayments();
    }
  }, [subscriptionStatus?.franchiseId]);

  const fetchFranchiseData = async () => {
    if (!subscriptionStatus?.franchiseId) return;
    
    const { data, error } = await supabase
      .from('franchises')
      .select('id, name, cnpj, email, phone, subscription_plan, subscription_status, next_due_date, asaas_customer_id, asaas_subscription_id, payment_method')
      .eq('id', subscriptionStatus.franchiseId)
      .single();
    
    if (data && !error) {
      setFranchise(data);
      setCustomerName(data.name || '');
      setCustomerCpfCnpj(data.cnpj || '');
      setCustomerEmail(data.email || '');
      setCustomerPhone(data.phone || '');
      if (data.subscription_plan) {
        setSelectedPlan(data.subscription_plan);
      }
    }
    setLoading(false);
  };

  const fetchPayments = async () => {
    if (!subscriptionStatus?.franchiseId) return;
    
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('franchise_id', subscriptionStatus.franchiseId)
      .order('created_at', { ascending: false });
    
    if (data && !error) {
      setPayments(data);
    }
  };

  const handleGenerateCharge = async (billingType: 'PIX') => {
    if (!subscriptionStatus?.franchiseId || !customerName || !customerCpfCnpj) {
      toast.error('Preencha o nome e CPF/CNPJ');
      return;
    }

    setProcessingPayment(true);
    
    try {
      const response = await supabase.functions.invoke('asaas-payment', {
        body: {
          action: 'create-charge',
          franchiseId: subscriptionStatus.franchiseId,
          plan: selectedPlan,
          billingType,
          customerName,
          customerCpfCnpj,
          customerEmail,
          customerPhone,
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao gerar cobrança');
      }

      const data = response.data;
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (billingType === 'PIX' && data.pix) {
        setCurrentPaymentData({
          pixQrcode: data.pix.payload,
          pixQrcodeImage: data.pix.encodedImage,
        });
        setShowPixModal(true);
      }

      toast.success('Cobrança gerada com sucesso!');
      fetchPayments();
      fetchFranchiseData();
    } catch (error) {
      console.error('Error generating charge:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar cobrança');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCreditCardPayment = async () => {
    if (!subscriptionStatus?.franchiseId || !customerName || !customerCpfCnpj) {
      toast.error('Preencha os dados de cobrança (nome e CPF/CNPJ)');
      return;
    }

    if (!cardHolderName || !cardNumber || !cardExpiryMonth || !cardExpiryYear || !cardCcv || !cardPostalCode || !cardAddressNumber) {
      toast.error('Preencha todos os campos do cartão');
      return;
    }

    setProcessingPayment(true);

    try {
      const response = await supabase.functions.invoke('asaas-payment', {
        body: {
          action: 'create-subscription',
          franchiseId: subscriptionStatus.franchiseId,
          plan: selectedPlan,
          customerName,
          customerCpfCnpj,
          customerEmail,
          customerPhone,
          creditCard: {
            holderName: cardHolderName,
            number: cardNumber,
            expiryMonth: cardExpiryMonth,
            expiryYear: cardExpiryYear,
            ccv: cardCcv,
          },
          creditCardHolderInfo: {
            name: cardHolderName,
            email: customerEmail,
            cpfCnpj: customerCpfCnpj,
            postalCode: cardPostalCode,
            addressNumber: cardAddressNumber,
            phone: customerPhone,
          },
        },
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar assinatura');
      }

      const data = response.data;

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success('Assinatura criada com sucesso! Seu cartão será cobrado automaticamente todo mês.');
      setShowCardModal(false);
      fetchPayments();
      fetchFranchiseData();
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar assinatura com cartão');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência!');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; label: string }> = {
      trial: { variant: "secondary", icon: <Clock className="h-3 w-3" />, label: "Trial" },
      active: { variant: "default", icon: <CheckCircle className="h-3 w-3" />, label: "Ativo" },
      past_due: { variant: "outline", icon: <AlertCircle className="h-3 w-3" />, label: "Pendente" },
      expired: { variant: "destructive", icon: <XCircle className="h-3 w-3" />, label: "Expirado" },
      blocked: { variant: "destructive", icon: <XCircle className="h-3 w-3" />, label: "Bloqueado" },
      cancelled: { variant: "destructive", icon: <XCircle className="h-3 w-3" />, label: "Cancelado" },
    };
    
    const config = statusConfig[status] || statusConfig.trial;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pendente" },
      paid: { variant: "default", label: "Pago" },
      overdue: { variant: "destructive", label: "Vencido" },
      cancelled: { variant: "secondary", label: "Cancelado" },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading || loadingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isBlocked = subscriptionStatus?.status === 'expired' || subscriptionStatus?.status === 'blocked' || subscriptionStatus?.status === 'cancelled';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!isBlocked && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-xl font-bold">Gerenciar Assinatura</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Status Banner */}
        {isBlocked && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">
                {subscriptionStatus?.status === 'expired' 
                  ? 'Seu período de teste expirou. Escolha uma forma de pagamento para continuar usando o sistema.'
                  : 'Sua assinatura está bloqueada. Regularize seu pagamento para continuar.'}
              </span>
            </div>
          </div>
        )}

        {subscriptionStatus?.status === 'trial' && subscriptionStatus.trialDaysLeft !== null && (
          <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
              <span className="font-medium">
                Você está no teste grátis. Faltam {subscriptionStatus.trialDaysLeft} dias para ativar sua assinatura.
              </span>
            </div>
          </div>
        )}

        {subscriptionStatus?.status === 'active' && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">
                Sua assinatura está ativa{franchise?.next_due_date ? ` até ${format(new Date(franchise.next_due_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}` : ''}.
              </span>
            </div>
          </div>
        )}

        {/* Subscription Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Status da Assinatura</span>
              {getStatusBadge(subscriptionStatus?.status || 'trial')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plano</p>
                <p className="font-medium">{PLAN_NAMES[franchise?.subscription_plan || 'lancamento'] || 'Lançamento'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor</p>
                <p className="font-medium">R$ {PLAN_PRICES[franchise?.subscription_plan || 'lancamento'] || 59}/mês</p>
              </div>
              {franchise?.next_due_date && (
                <div>
                  <p className="text-sm text-muted-foreground">Próximo vencimento</p>
                  <p className="font-medium">{format(new Date(franchise.next_due_date), "dd/MM/yyyy")}</p>
                </div>
              )}
              {franchise?.payment_method && (
                <div>
                  <p className="text-sm text-muted-foreground">Forma de pagamento</p>
                  <p className="font-medium capitalize">{franchise.payment_method === 'card' ? 'Cartão' : franchise.payment_method}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Plan Info */}
        <Card className="mb-6 border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Plano de Lançamento</CardTitle>
              <Badge className="bg-primary text-primary-foreground">Oferta de Lançamento</Badge>
            </div>
            <CardDescription>Acesso total a todas as funcionalidades por 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <span className="text-4xl font-bold text-primary">R$ 59</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
          </CardContent>
        </Card>

        {/* Customer Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Dados para Cobrança</CardTitle>
            <CardDescription>Preencha os dados para gerar a cobrança</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Nome / Razão Social *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Nome completo ou razão social"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerCpfCnpj">CPF / CNPJ *</Label>
                <Input
                  id="customerCpfCnpj"
                  value={customerCpfCnpj}
                  onChange={(e) => setCustomerCpfCnpj(e.target.value)}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerPhone">Telefone</Label>
                <Input
                  id="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Options */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Formas de Pagamento</CardTitle>
            <CardDescription>Escolha como deseja pagar sua assinatura</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-6 flex flex-col gap-2"
                onClick={() => {
                  if (!customerName || !customerCpfCnpj) {
                    toast.error('Preencha o nome e CPF/CNPJ nos dados de cobrança antes de continuar');
                    return;
                  }
                  setShowCardModal(true);
                }}
                disabled={processingPayment}
              >
                <CreditCard className="h-8 w-8" />
                <span className="font-medium">Cartão de Crédito</span>
                <span className="text-xs text-muted-foreground">Recorrente automático</span>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto py-6 flex flex-col gap-2"
                onClick={() => handleGenerateCharge('PIX')}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <QrCode className="h-8 w-8" />
                )}
                <span className="font-medium">PIX</span>
                <span className="text-xs text-muted-foreground">Pagamento instantâneo</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        {payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Cobranças</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{format(new Date(payment.created_at), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="capitalize">{payment.billing_type.toLowerCase()}</TableCell>
                      <TableCell>R$ {payment.value.toFixed(2)}</TableCell>
                      <TableCell>{format(new Date(payment.due_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                      <TableCell>
                        {payment.status === 'pending' && (
                          <div className="flex gap-2">
                            {payment.pix_qrcode && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setCurrentPaymentData({
                                    pixQrcode: payment.pix_qrcode || '',
                                    pixQrcodeImage: payment.pix_qrcode_image || '',
                                  });
                                  setShowPixModal(true);
                                }}
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            )}
                            {payment.boleto_url && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => window.open(payment.boleto_url!, '_blank')}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>

      {/* PIX Modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento via PIX</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código PIX para pagar
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4">
            {currentPaymentData?.pixQrcodeImage && (
              <img 
                src={`data:image/png;base64,${currentPaymentData.pixQrcodeImage}`} 
                alt="QR Code PIX" 
                className="w-64 h-64"
              />
            )}
            {currentPaymentData?.pixQrcode && (
              <div className="w-full">
                <Label>Código PIX (Copia e Cola)</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    value={currentPaymentData.pixQrcode} 
                    readOnly 
                    className="text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(currentPaymentData.pixQrcode!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Após o pagamento, seu acesso será liberado automaticamente em alguns minutos.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Card Modal */}
      <Dialog open={showCardModal} onOpenChange={setShowCardModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento com Cartão de Crédito</DialogTitle>
            <DialogDescription>
              Preencha os dados do cartão para criar sua assinatura recorrente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cardHolderName">Nome no cartão *</Label>
              <Input
                id="cardHolderName"
                value={cardHolderName}
                onChange={(e) => setCardHolderName(e.target.value)}
                placeholder="Nome como está no cartão"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Número do cartão *</Label>
              <Input
                id="cardNumber"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="0000 0000 0000 0000"
                maxLength={19}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cardExpiryMonth">Mês *</Label>
                <Input
                  id="cardExpiryMonth"
                  value={cardExpiryMonth}
                  onChange={(e) => setCardExpiryMonth(e.target.value)}
                  placeholder="MM"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardExpiryYear">Ano *</Label>
                <Input
                  id="cardExpiryYear"
                  value={cardExpiryYear}
                  onChange={(e) => setCardExpiryYear(e.target.value)}
                  placeholder="AAAA"
                  maxLength={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardCcv">CVV *</Label>
                <Input
                  id="cardCcv"
                  value={cardCcv}
                  onChange={(e) => setCardCcv(e.target.value)}
                  placeholder="000"
                  maxLength={4}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cardPostalCode">CEP *</Label>
                <Input
                  id="cardPostalCode"
                  value={cardPostalCode}
                  onChange={(e) => setCardPostalCode(e.target.value)}
                  placeholder="00000-000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardAddressNumber">Nº endereço *</Label>
                <Input
                  id="cardAddressNumber"
                  value={cardAddressNumber}
                  onChange={(e) => setCardAddressNumber(e.target.value)}
                  placeholder="123"
                />
              </div>
            </div>
            <Button 
              className="w-full" 
              onClick={handleCreditCardPayment}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Confirmar Assinatura - R$ {PLAN_PRICES[selectedPlan] || 59}/mês
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Seu cartão será cobrado automaticamente todo mês. Você pode cancelar a qualquer momento.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Subscription;
