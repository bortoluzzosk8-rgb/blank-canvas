import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, MessageCircle, Mail, MapPin, Building2, ShieldBan, ShieldCheck, CreditCard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type SaasLead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  city: string;
  status: string;
  subscription_status: string | null;
  subscription_plan: string | null;
  trial_ends_at: string | null;
  subscription_expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type ClientLead = {
  id: string;
  name: string;
  phone: string;
  created_at: string;
  last_access: string;
  is_client: boolean;
  cart_created: boolean;
  whatsapp_sent: boolean;
};

const Leads = () => {
  const { isSuperAdmin } = useAuth();
  const [saasLeads, setSaasLeads] = useState<SaasLead[]>([]);
  const [clientLeads, setClientLeads] = useState<ClientLead[]>([]);
  const [filteredSaasLeads, setFilteredSaasLeads] = useState<SaasLead[]>([]);
  const [filteredClientLeads, setFilteredClientLeads] = useState<ClientLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "blocked" | "trial">("all");
  const [temperatureFilter, setTemperatureFilter] = useState<"all" | "cold" | "warm" | "hot">("all");

  // Payment drawer state
  const [paymentDrawerOpen, setPaymentDrawerOpen] = useState(false);
  const [selectedFranchise, setSelectedFranchise] = useState<SaasLead | null>(null);
  const [paymentValue, setPaymentValue] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [paymentType, setPaymentType] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid">("pending");
  const [savingPayment, setSavingPayment] = useState(false);

  const formatPhoneDisplay = (phone: string | null) => {
    if (!phone) return "Não informado";
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else if (numbers.length === 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    return phone;
  };

  const getLeadTemperature = (lead: ClientLead): "cold" | "warm" | "hot" => {
    if (lead.whatsapp_sent) return "hot";
    if (lead.cart_created) return "warm";
    return "cold";
  };

  const getTemperatureIcon = (temp: "cold" | "warm" | "hot") => {
    switch (temp) {
      case "hot": return "🔥";
      case "warm": return "🌡️";
      case "cold": return "🧊";
    }
  };

  const getTemperatureLabel = (temp: "cold" | "warm" | "hot") => {
    switch (temp) {
      case "hot": return "Quente";
      case "warm": return "Morno";
      case "cold": return "Frio";
    }
  };

  const getTemperatureColor = (temp: "cold" | "warm" | "hot") => {
    switch (temp) {
      case "hot": return "bg-red-100 text-red-700 border-red-300";
      case "warm": return "bg-orange-100 text-orange-700 border-orange-300";
      case "cold": return "bg-blue-100 text-blue-700 border-blue-300";
    }
  };

  const getSubscriptionBadge = (lead: SaasLead) => {
    const status = lead.subscription_status || "trial";
    switch (status) {
      case "active":
        return { label: "✅ Ativo", className: "bg-green-100 text-green-700 border-green-300" };
      case "blocked":
        return { label: "🚫 Bloqueado", className: "bg-red-100 text-red-700 border-red-300" };
      case "trial": {
        const trialEnd = lead.trial_ends_at ? new Date(lead.trial_ends_at) : null;
        const daysLeft = trialEnd ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
        const expired = daysLeft <= 0;
        return expired
          ? { label: "⏰ Trial expirado", className: "bg-orange-100 text-orange-700 border-orange-300" }
          : { label: `🆓 Trial (${daysLeft}d)`, className: "bg-blue-100 text-blue-700 border-blue-300" };
      }
      case "expired":
        return { label: "⏰ Expirado", className: "bg-orange-100 text-orange-700 border-orange-300" };
      case "cancelled":
        return { label: "❌ Cancelado", className: "bg-gray-100 text-gray-700 border-gray-300" };
      default:
        return { label: status, className: "bg-gray-100 text-gray-700 border-gray-300" };
    }
  };

  const openWhatsApp = (phone: string | null, name: string) => {
    if (!phone) {
      toast.error("Telefone não informado");
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = `Olá ${name}! Tudo bem?`;
    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const openEmail = (email: string | null, name: string) => {
    if (!email) {
      toast.error("Email não informado");
      return;
    }
    const subject = `Contato - ${name}`;
    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}`, '_blank');
  };

  const handleToggleBlock = async (lead: SaasLead) => {
    const isCurrentlyBlocked = lead.subscription_status === "blocked";
    const newStatus = isCurrentlyBlocked ? "active" : "blocked";
    
    try {
      const { error } = await supabase
        .from("franchises")
        .update({ subscription_status: newStatus })
        .eq("id", lead.id);
      
      if (error) throw error;
      
      toast.success(isCurrentlyBlocked ? `${lead.name} desbloqueado!` : `${lead.name} bloqueado!`);
      setSaasLeads(prev => prev.map(l => l.id === lead.id ? { ...l, subscription_status: newStatus } : l));
    } catch (error) {
      console.error("Error toggling block:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const openPaymentDrawer = (lead: SaasLead) => {
    setSelectedFranchise(lead);
    setPaymentValue("");
    setPaymentDueDate("");
    setPaymentType("PIX");
    setPaymentStatus("pending");
    setPaymentDrawerOpen(true);
  };

  const handleSavePayment = async () => {
    if (!selectedFranchise || !paymentValue || !paymentDueDate) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSavingPayment(true);
    try {
      const value = parseFloat(paymentValue.replace(",", "."));
      if (isNaN(value) || value <= 0) {
        toast.error("Valor inválido");
        return;
      }

      // Insert subscription payment
      const { error: paymentError } = await supabase
        .from("subscription_payments")
        .insert({
          franchise_id: selectedFranchise.id,
          value,
          due_date: paymentDueDate,
          billing_type: paymentType,
          status: paymentStatus,
          asaas_payment_id: `manual_${Date.now()}`,
          payment_date: paymentStatus === "paid" ? new Date().toISOString().split("T")[0] : null,
        });

      if (paymentError) throw paymentError;

      // If paid, activate franchise and set expiration to 30 days from due date
      if (paymentStatus === "paid") {
        const expiresAt = new Date(paymentDueDate);
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        const { error: updateError } = await supabase
          .from("franchises")
          .update({
            subscription_status: "active",
            subscription_expires_at: expiresAt.toISOString(),
          })
          .eq("id", selectedFranchise.id);

        if (updateError) throw updateError;

        setSaasLeads(prev =>
          prev.map(l =>
            l.id === selectedFranchise.id
              ? { ...l, subscription_status: "active", subscription_expires_at: expiresAt.toISOString() }
              : l
          )
        );
      }

      toast.success("Pagamento registrado com sucesso!");
      setPaymentDrawerOpen(false);
    } catch (error) {
      console.error("Error saving payment:", error);
      toast.error("Erro ao registrar pagamento");
    } finally {
      setSavingPayment(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchSaasLeads();
    } else {
      fetchClientLeads();
    }
  }, [isSuperAdmin]);

  // Filter effect for SaaS leads (Super Admin)
  useEffect(() => {
    if (!isSuperAdmin) return;
    
    if (searchTerm.trim() === "" && statusFilter === "all") {
      setFilteredSaasLeads(saasLeads);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredSaasLeads(
        saasLeads.filter((lead) => {
          const matchesSearch = 
            lead.name.toLowerCase().includes(term) ||
            (lead.email?.toLowerCase().includes(term) || false) ||
            (lead.phone?.toLowerCase().includes(term) || false) ||
            lead.city.toLowerCase().includes(term);
          
          const subStatus = lead.subscription_status || "trial";
          const matchesStatus = 
            statusFilter === "all" || 
            (statusFilter === "active" && subStatus === "active") ||
            (statusFilter === "blocked" && subStatus === "blocked") ||
            (statusFilter === "trial" && subStatus === "trial");
          
          return matchesSearch && matchesStatus;
        })
      );
    }
  }, [searchTerm, statusFilter, saasLeads, isSuperAdmin]);

  // Filter effect for client leads (Franqueadora)
  useEffect(() => {
    if (isSuperAdmin) return;
    
    if (searchTerm.trim() === "" && temperatureFilter === "all") {
      setFilteredClientLeads(clientLeads);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredClientLeads(
        clientLeads.filter((lead) => {
          const matchesSearch = 
            lead.name.toLowerCase().includes(term) ||
            lead.phone.toLowerCase().includes(term);
          
          const matchesTemperature = 
            temperatureFilter === "all" || 
            getLeadTemperature(lead) === temperatureFilter;
          
          return matchesSearch && matchesTemperature;
        })
      );
    }
  }, [searchTerm, temperatureFilter, clientLeads, isSuperAdmin]);

  const fetchSaasLeads = async () => {
    try {
      // First get franchise IDs that have real users
      const { data: userFranchises, error: ufError } = await supabase
        .from("user_franchises")
        .select("franchise_id");

      if (ufError) throw ufError;

      const franchiseIds = [...new Set((userFranchises || []).map(uf => uf.franchise_id))];

      if (franchiseIds.length === 0) {
        setSaasLeads([]);
        setFilteredSaasLeads([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("franchises")
        .select("id, name, email, phone, city, status, subscription_status, subscription_plan, trial_ends_at, subscription_expires_at, created_at, updated_at")
        .in("id", franchiseIds)
        .is("parent_franchise_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSaasLeads(data || []);
      setFilteredSaasLeads(data || []);
    } catch (error) {
      console.error("Error fetching SaaS leads:", error);
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  };

  const fetchClientLeads = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("last_access", { ascending: false });

      if (error) throw error;
      setClientLeads(data || []);
      setFilteredClientLeads(data || []);
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Erro ao carregar leads");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  // Super Admin view - SaaS customers (franchises)
  if (isSuperAdmin) {
    const activeCount = saasLeads.filter(l => (l.subscription_status || "trial") === "active").length;
    const blockedCount = saasLeads.filter(l => l.subscription_status === "blocked").length;
    const trialCount = saasLeads.filter(l => (l.subscription_status || "trial") === "trial").length;

    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-2">Leads SaaS - Clientes Ativos</h2>
            <p className="text-sm text-muted-foreground">
              Total: {saasLeads.length} usuário{saasLeads.length !== 1 ? "s" : ""} com conta ativa
            </p>
          </div>

          {/* Status Filters */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <Button
              variant={statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("all")}
            >
              Todos ({saasLeads.length})
            </Button>
            <Button
              variant={statusFilter === "active" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("active")}
              className="border-green-300"
            >
              ✅ Ativos ({activeCount})
            </Button>
            <Button
              variant={statusFilter === "trial" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("trial")}
              className="border-blue-300"
            >
              🆓 Trial ({trialCount})
            </Button>
            <Button
              variant={statusFilter === "blocked" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("blocked")}
              className="border-red-300"
            >
              🚫 Bloqueados ({blockedCount})
            </Button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, telefone ou cidade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredSaasLeads.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {searchTerm || statusFilter !== "all"
                ? "Nenhum lead encontrado com esses filtros."
                : "Nenhum lead cadastrado ainda."}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredSaasLeads.map((lead) => {
                const badge = getSubscriptionBadge(lead);
                const isBlocked = lead.subscription_status === "blocked";

                return (
                  <div
                    key={lead.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-semibold text-foreground">{lead.name}</h3>
                        
                        <span className={`text-xs px-2 py-1 rounded-full border ${badge.className}`}>
                          {badge.label}
                        </span>

                        {lead.subscription_plan && (
                          <span className="text-xs px-2 py-1 rounded-full border bg-purple-100 text-purple-700 border-purple-300">
                            📋 {lead.subscription_plan}
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{lead.email || "Email não informado"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{formatPhoneDisplay(lead.phone)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{lead.city}</span>
                        </div>
                      </div>

                      {lead.subscription_expires_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Assinatura expira: {new Date(lead.subscription_expires_at).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Cadastro: {new Date(lead.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      
                      <div className="flex gap-2 items-center">
                        {/* Block/Unblock toggle */}
                        <div className="flex items-center gap-1" title={isBlocked ? "Desbloquear acesso" : "Bloquear acesso"}>
                          {isBlocked ? (
                            <ShieldBan className="h-4 w-4 text-red-500" />
                          ) : (
                            <ShieldCheck className="h-4 w-4 text-green-500" />
                          )}
                          <Switch
                            checked={!isBlocked}
                            onCheckedChange={() => handleToggleBlock(lead)}
                          />
                        </div>

                        {/* Payment button */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPaymentDrawer(lead)}
                          title="Registrar pagamento"
                          className="gap-1"
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>

                        {lead.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openWhatsApp(lead.phone, lead.name)}
                            className="hover:bg-green-50"
                            title="Abrir WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        
                        {lead.email && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEmail(lead.email, lead.name)}
                            className="hover:bg-blue-50"
                            title="Enviar Email"
                          >
                            <Mail className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Payment Drawer */}
        <Drawer open={paymentDrawerOpen} onOpenChange={setPaymentDrawerOpen}>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Registrar Pagamento</DrawerTitle>
              <DrawerDescription>
                {selectedFranchise?.name} — Inserir pagamento de mensalidade
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 space-y-4">
              <div>
                <Label>Valor (R$) *</Label>
                <Input
                  type="text"
                  placeholder="Ex: 149,90"
                  value={paymentValue}
                  onChange={(e) => setPaymentValue(e.target.value)}
                />
              </div>
              <div>
                <Label>Data de vencimento *</Label>
                <Input
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Tipo de cobrança</Label>
                <Select value={paymentType} onValueChange={(v) => setPaymentType(v as "PIX" | "CREDIT_CARD")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">Pix</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as "pending" | "paid")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {paymentStatus === "paid" && (
                <p className="text-xs text-muted-foreground">
                  Ao salvar como "Pago", a assinatura será ativada e expirará 30 dias após a data de vencimento.
                </p>
              )}
            </div>
            <DrawerFooter>
              <Button onClick={handleSavePayment} disabled={savingPayment}>
                {savingPayment ? "Salvando..." : "Salvar Pagamento"}
              </Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  // Franqueadora view - Client leads
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">Leads - Histórico de Acessos</h2>
          <p className="text-sm text-muted-foreground">
            Total: {clientLeads.length} lead{clientLeads.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Temperature Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            variant={temperatureFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setTemperatureFilter("all")}
          >
            Todos ({clientLeads.length})
          </Button>
          <Button
            variant={temperatureFilter === "cold" ? "default" : "outline"}
            size="sm"
            onClick={() => setTemperatureFilter("cold")}
            className="border-blue-300"
          >
            🧊 Frios ({clientLeads.filter(l => getLeadTemperature(l) === "cold").length})
          </Button>
          <Button
            variant={temperatureFilter === "warm" ? "default" : "outline"}
            size="sm"
            onClick={() => setTemperatureFilter("warm")}
            className="border-orange-300"
          >
            🌡️ Mornos ({clientLeads.filter(l => getLeadTemperature(l) === "warm").length})
          </Button>
          <Button
            variant={temperatureFilter === "hot" ? "default" : "outline"}
            size="sm"
            onClick={() => setTemperatureFilter("hot")}
            className="border-red-300"
          >
            🔥 Quentes ({clientLeads.filter(l => getLeadTemperature(l) === "hot").length})
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredClientLeads.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {searchTerm || temperatureFilter !== "all"
              ? "Nenhum lead encontrado com esses filtros."
              : "Nenhum lead cadastrado ainda."}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredClientLeads.map((lead) => {
              const temperature = getLeadTemperature(lead);
              return (
                <div
                  key={lead.id}
                  className="flex items-center justify-between gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground">{lead.name}</h3>
                      
                      <span className={`text-xs px-2 py-1 rounded-full border ${getTemperatureColor(temperature)}`}>
                        {getTemperatureIcon(temperature)} {getTemperatureLabel(temperature)}
                      </span>
                      
                      {lead.is_client && (
                        <span className="text-xs px-2 py-1 rounded-full border bg-green-100 text-green-700 border-green-300">
                          ✅ Cliente
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Telefone: {formatPhoneDisplay(lead.phone)}
                    </p>
                    
                    <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                      {lead.cart_created && <span>🛒 Criou carrinho</span>}
                      {lead.whatsapp_sent && <span>📱 Enviou WhatsApp</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Cadastro: {new Date(lead.created_at).toLocaleDateString("pt-BR")}</p>
                      <p>Último acesso: {new Date(lead.last_access).toLocaleDateString("pt-BR")}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openWhatsApp(lead.phone, lead.name)}
                        className="gap-2 hover:bg-green-50"
                      >
                        <MessageCircle className="h-4 w-4 text-green-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Leads;
