import { Outlet, useNavigate, useLocation, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, DollarSign, Calendar, Users, UserPlus, LogOut, Settings, Tag, Warehouse, Store, UserCheck, Truck, User, Building2, Clock, CreditCard, Megaphone, ShoppingBag, RefreshCw } from "lucide-react";
import logoPlaygestor from "@/assets/logo-playgestor-novo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import React from "react";

class AdminErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.error('AdminLayout child error:', error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-muted-foreground">Ocorreu um erro ao carregar esta página.</p>
          <Button
            variant="outline"
            onClick={() => this.setState({ hasError: false })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user, isFranqueadora, isVendedor, isMotorista, isSuperAdmin, userFranchise } = useAuth();
  const { subscriptionStatus } = useSubscriptionStatus(user?.id);
  const isMobile = useIsMobile();

  // Motorista só pode acessar logistics e updates
  const currentPath = location.pathname.split("/admin/")[1] || "";
  if (isMotorista && currentPath && !["logistics", "updates"].includes(currentPath)) {
    return <Navigate to="/admin/logistics" replace />;
  }

  const handleLogout = async () => {
    await signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/");
  };

  const handleTabChange = (value: string) => {
    if (value === "subscription") {
      navigate("/assinatura");
    } else if (value === "catalog") {
      navigate("/catalog");
    } else {
      navigate(`/admin/${value}`);
    }
  };

  const getCurrentTab = () => {
    const path = location.pathname.split("/admin/")[1] || "rentals";
    return path;
  };

  // Menu items para Super Admin (gestão do SaaS)
  const superAdminMenuItems = [
    { value: "leads", label: "Leads SaaS", icon: UserPlus, roles: ["super_admin"] },
    { value: "saas-management", label: "Clientes", icon: Building2, roles: ["super_admin"] },
    { value: "saas-financial", label: "Financeiro", icon: CreditCard, roles: ["super_admin"] },
  ];

  // Menu items para clientes (franqueadoras, vendedores, motoristas)
  const clientMenuItems = [
    { value: "rentals", label: "Locações", icon: Calendar, roles: ["franqueadora", "vendedor"] },
    { value: "stock", label: "Estoque", icon: Warehouse, roles: ["franqueadora", "vendedor"] },
    { value: "logistics", label: "Logística", icon: Truck, roles: ["franqueadora", "vendedor", "motorista"] },
    { value: "clients", label: "Clientes", icon: Users, roles: ["franqueadora", "vendedor"] },
    { value: "monitors", label: "Monitores", icon: User, roles: ["franqueadora", "vendedor"] },
    { value: "drivers", label: "Motoristas", icon: Truck, roles: ["franqueadora", "vendedor"] },
    { value: "catalog", label: "Catálogo", icon: ShoppingBag, roles: ["franqueadora", "vendedor"] },
    { value: "products", label: "Produtos", icon: Package, roles: ["franqueadora"] },
    { value: "categories", label: "Categorias", icon: Tag, roles: ["franqueadora"] },
    { value: "financial", label: "Financeiro", icon: DollarSign, roles: ["franqueadora"] },
    
    { value: "franchises", label: "Unidades", icon: Store, roles: ["franqueadora"] },
    { value: "sellers", label: "Vendedores", icon: UserCheck, roles: ["franqueadora"] },
    { value: "settings", label: "Config", icon: Settings, roles: ["franqueadora"] },
  ];

  // Filtrar menus baseado no role
  const visibleMenuItems = (() => {
    // Super Admin vê apenas menus do SaaS
    if (isSuperAdmin) {
      return superAdminMenuItems;
    }
    
    // Demais roles vêem menus de cliente
    return clientMenuItems.filter((item) => {
      if (isFranqueadora) return item.roles.includes("franqueadora");
      if (isVendedor) return item.roles.includes("vendedor");
      if (isMotorista) return item.roles.includes("motorista");
      return false;
    });
  })();



  return (
    <div className="min-h-screen bg-background">
      {/* Trial Banner */}
      {subscriptionStatus?.status === 'trial' && subscriptionStatus.trialDaysLeft !== null && !isSuperAdmin && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-amber-600 dark:text-amber-400 text-xs sm:text-sm text-center">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                Você tem <strong>{subscriptionStatus.trialDaysLeft} {subscriptionStatus.trialDaysLeft === 1 ? 'dia' : 'dias'}</strong> restantes
              </span>
            </div>
            <Button 
              variant="link" 
              size="sm" 
              className="text-amber-600 dark:text-amber-400 p-0 h-auto text-xs sm:text-sm"
              onClick={() => navigate('/assinatura')}
            >
              Gerenciar assinatura
            </Button>
          </div>
        </div>
      )}

      {/* Past Due Banner */}
      {subscriptionStatus?.status === 'past_due' && !isSuperAdmin && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-4 py-2">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-red-600 dark:text-red-400 text-xs sm:text-sm text-center">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                ⚠️ Pagamento <strong>em aberto</strong>. Regularize.
              </span>
            </div>
            <Button 
              variant="link" 
              size="sm" 
              className="text-red-600 dark:text-red-400 p-0 h-auto text-xs sm:text-sm"
              onClick={() => navigate('/assinatura')}
            >
              Ver cobrança
            </Button>
          </div>
        </div>
      )}

      <div className="border-b bg-card">
        <div className="px-4 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          {/* Linha 1: Logo + Botões de ação */}
          <div className="flex items-center justify-between">
            <img 
              src={logoPlaygestor} 
              alt="PlayGestor" 
              className="h-10 sm:h-14 w-auto"
            />
            <div className="flex items-center gap-1 sm:gap-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/admin/updates')}
                className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 text-[#6C4DF6] hover:text-[#6C4DF6] hover:bg-[#6C4DF6]/10 transition-colors"
              >
                <Megaphone className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Atualizações</span>
              </Button>
              
              {isFranqueadora && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/assinatura')}
                  className="w-9 h-9 sm:w-auto sm:h-auto sm:px-3 text-[#6C4DF6] hover:text-[#6C4DF6] hover:bg-[#6C4DF6]/10 transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1">Assinaturas</span>
                </Button>
              )}
              
              <Button 
                variant="outline" 
                size="icon"
                onClick={handleLogout}
                className="w-9 h-9 sm:w-auto sm:h-auto sm:px-4 border-[#E53935] text-[#E53935] hover:bg-[#E53935] hover:text-white transition-colors"
              >
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </div>
          
          {/* Linha 2: Info do usuário */}
          <div className="flex flex-col gap-0.5">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{user?.email}</p>
            {userFranchise && (
              <p className="text-xs sm:text-sm font-medium text-primary">
                📍 {userFranchise.name} - {userFranchise.city}
              </p>
            )}
          </div>
        </div>

          {isMobile ? (
            <Select value={getCurrentTab()} onValueChange={handleTabChange}>
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Selecione uma seção" />
              </SelectTrigger>
              <SelectContent>
                {visibleMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <SelectItem key={item.value} value={item.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {item.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : (
            <Tabs value={getCurrentTab()} className="w-full">
              <TabsList className="flex flex-wrap h-auto items-center justify-start rounded-md bg-muted p-1 gap-1">
                {visibleMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger 
                      key={item.value} 
                      value={item.value} 
                      onClick={() => handleTabChange(item.value)}
                      className="shrink-0 whitespace-nowrap px-3"
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      {item.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      <div className="px-4 lg:px-8 py-8">
        <AdminErrorBoundary>
          <Outlet />
        </AdminErrorBoundary>
      </div>
    </div>
  );
};

export default AdminLayout;