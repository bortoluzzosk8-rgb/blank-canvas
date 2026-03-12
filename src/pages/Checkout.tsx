import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CreditCard, DollarSign, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const Checkout = () => {
  const navigate = useNavigate();
  const { cart, cartTotal, clearCart } = useCart();
  const [paymentType, setPaymentType] = useState<"cash" | "installment">("cash");
  const [entryValue, setEntryValue] = useState("");
  const [installments, setInstallments] = useState(1);
  const [settings, setSettings] = useState({
    monthlyInterest: 0,
    maxInstallments: 12,
    whatsappNumber: "",
  });
const [loading, setLoading] = useState(true);

const isMobile = useIsMobile();

const trackWhatsappSent = async () => {
  const phone = localStorage.getItem('client_phone');
  if (!phone) return;

  try {
    await supabase
      .from('clients')
      .update({ whatsapp_sent: true })
      .eq('phone', phone);
  } catch (error) {
    console.error('Erro ao rastrear envio WhatsApp:', error);
  }
};

useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings({
            monthlyInterest: Number(data.monthly_interest),
            maxInstallments: Number(data.max_installments),
            whatsappNumber: data.whatsapp_number || "",
          });
        }
      } catch (error) {
        console.error("Erro ao buscar configurações:", error);
        toast.error("Erro ao carregar configurações de pagamento");
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    if (cart.length === 0) {
      navigate("/catalog");
    }
  }, [cart, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const entry = Number((entryValue || "0").replace(",", ".")) || 0;
  const baseAmount = Math.max(cartTotal() - entry, 0);
  const i = settings.monthlyInterest / 100;

  let installmentValue = 0;
  let totalWithInterest = 0;

  if (paymentType === "installment" && installments > 0 && baseAmount > 0) {
    if (i === 0) {
      installmentValue = baseAmount / installments;
      totalWithInterest = baseAmount;
    } else {
      totalWithInterest = baseAmount * (1 + i * installments);
      installmentValue = totalWithInterest / installments;
    }
  }

  const totalGeneral = entry + (paymentType === "installment" ? totalWithInterest : baseAmount);

const handleFinalizePurchase = async () => {
  if (!settings.whatsappNumber) {
    toast.error("WhatsApp não configurado. Entre em contato com o administrador.");
    return;
  }

  const cleanPhone = settings.whatsappNumber.replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    toast.error("Número de WhatsApp inválido. Entre em contato com o administrador.");
    return;
  }

  // Montar mensagem do pedido
  let message = "🛒 *NOVO PEDIDO*\n\n*Produtos:*\n";
  cart.forEach((item) => {
    const subtotal = item.product.sale_price * item.quantity;
    message += `• ${item.quantity}x ${item.product.name} - ${formatCurrency(subtotal)}\n`;
  });
  message += `\n*Subtotal:* ${formatCurrency(cartTotal())}\n\n`;
  message += `*Forma de Pagamento:* ${paymentType === "cash" ? "À vista" : "Parcelado"}\n`;
  if (paymentType === "installment") {
    message += `💰 Entrada: ${formatCurrency(entry)}\n`;
    message += `📅 ${installments}x de ${formatCurrency(installmentValue)}\n`;
    message += `💳 Total com juros: ${formatCurrency(totalWithInterest)}\n`;
  }
  message += `\n*TOTAL GERAL:* ${formatCurrency(totalGeneral)}`;

  // Limitar tamanho para segurança de URL
  if (message.length > 2000) {
    message = message.slice(0, 2000);
  }

  const encoded = encodeURIComponent(message);
  const url1 = `https://wa.me/55${cleanPhone}?text=${encoded}`;
  const url2 = `https://api.whatsapp.com/send?phone=55${cleanPhone}&text=${encoded}`;
  const url3 = `whatsapp://send?phone=55${cleanPhone}&text=${encoded}`;

  const openHttp = (url: string) => {
    try {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      return !!w;
    } catch {
      return false;
    }
  };

  const openDeepLink = (url: string) => {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch {
      return false;
    }
  };

  // Tentar abrir o WhatsApp (múltiplas tentativas)
  openHttp(url1);
  setTimeout(() => openHttp(url2), 100);
  if (isMobile) {
    setTimeout(() => openDeepLink(url3), 200);
  }

  // Rastrear envio e limpar carrinho
  await trackWhatsappSent();
  toast.success("Pedido enviado! Confira o WhatsApp para finalizar.");
  clearCart();
  navigate("/catalog");
};

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <header className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/catalog")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Catálogo
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Finalizar Compra</h1>
          <p className="text-muted-foreground mt-1">
            Revise seu pedido e escolha a forma de pagamento
          </p>
        </header>

        <div className="space-y-6">
          {/* Resumo do Carrinho */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Resumo do Pedido
            </h2>
            <div className="space-y-3 mb-4">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} x {formatCurrency(item.product.sale_price)}
                    </p>
                  </div>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(item.product.sale_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Subtotal</span>
                <span className="text-primary">{formatCurrency(cartTotal())}</span>
              </div>
            </div>
          </Card>

          {/* Forma de Pagamento */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Forma de Pagamento
            </h2>

            <RadioGroup value={paymentType} onValueChange={(v) => setPaymentType(v as "cash" | "installment")}>
              <div className="flex items-center space-x-2 mb-3">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer">
                  <DollarSign className="w-4 h-4" />
                  À vista
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="installment" id="installment" />
                <Label htmlFor="installment" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="w-4 h-4" />
                  Parcelado
                </Label>
              </div>
            </RadioGroup>

            {paymentType === "installment" && (
              <div className="mt-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="entry">Entrada (R$)</Label>
                    <Input
                      id="entry"
                      type="number"
                      min={0}
                      max={cartTotal()}
                      step="0.01"
                      value={entryValue}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (value >= 0 && value <= cartTotal()) {
                          setEntryValue(e.target.value);
                        }
                      }}
                      placeholder="0,00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Valor que será pago na entrada (máx: {formatCurrency(cartTotal())})
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="installments">Número de Parcelas</Label>
                    <Input
                      id="installments"
                      type="number"
                      min={1}
                      max={settings.maxInstallments}
                      value={installments}
                      onChange={(e) => {
                        const value = Number(e.target.value) || 1;
                        if (value >= 1 && value <= settings.maxInstallments) {
                          setInstallments(value);
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Máximo: {settings.maxInstallments}x
                    </p>
                  </div>
                </div>

                <Card className="p-4 bg-muted/30">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor da entrada:</span>
                      <span className="font-medium">{formatCurrency(entry)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor financiado:</span>
                      <span className="font-medium">{formatCurrency(baseAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor da parcela:</span>
                      <span className="font-medium">{formatCurrency(installmentValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total com juros:</span>
                      <span className="font-medium">{formatCurrency(totalWithInterest)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-semibold">Total geral:</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(totalGeneral)}
                      </span>
                    </div>
                    {settings.monthlyInterest > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Taxa de juros: {settings.monthlyInterest}% ao mês
                      </p>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {paymentType === "cash" && (
              <Card className="p-4 bg-muted/30 mt-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Valor total à vista:</span>
                  <span className="font-bold text-primary text-xl">
                    {formatCurrency(cartTotal())}
                  </span>
                </div>
              </Card>
            )}
          </Card>

          {/* Resumo Final */}
          <Card className="p-6 bg-primary/5">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Forma de pagamento:</span>
                <Badge variant="secondary">
                  {paymentType === "cash" ? "À vista" : `${installments}x no cartão`}
                </Badge>
              </div>
              {paymentType === "installment" && entry > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Entrada:</span>
                  <span className="font-medium">{formatCurrency(entry)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-3 border-t">
                <span className="text-lg font-bold">Total a pagar:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(totalGeneral)}
                </span>
              </div>
            </div>

            <Button
              onClick={handleFinalizePurchase}
              className="w-full mt-6 bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Finalizar Pedido pelo Whats
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Ao finalizar, entraremos em contato para confirmar seu pedido
            </p>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default Checkout;
