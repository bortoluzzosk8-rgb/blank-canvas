import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageSquare, TrendingUp, Clock, Building2, UserPlus } from "lucide-react";
import { format, subDays, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import SystemUpdatesManager from "@/components/admin/SystemUpdatesManager";

type SaasClient = {
  user_id: string;
  role: string;
  created_at: string;
  franchise_name?: string;
  franchise_city?: string;
};

type LeadStatus = {
  status: string;
  color: string;
  count: number;
};

const SuperAdminDashboard = () => {
  const [clients, setClients] = useState<SaasClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    newToday: 0,
    pendingMessages: 0,
    inConversation: 0,
    lastWeek: 0,
    totalActive: 0,
    totalFranchises: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar todos os user_roles com role = franqueadora (são os clientes do SaaS)
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role, created_at")
        .eq("role", "franqueadora")
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // Buscar apenas franquias raiz (clientes SaaS principais)
      // parent_franchise_id IS NULL significa que é uma franquia raiz
      const { data: franchises, error: franchisesError } = await supabase
        .from("franchises")
        .select("id, name, city, status, parent_franchise_id")
        .is("parent_franchise_id", null);

      if (franchisesError) throw franchisesError;

      // Buscar user_franchises para mapear user_id -> franchise
      const { data: userFranchises, error: ufError } = await supabase
        .from("user_franchises")
        .select("user_id, franchise_id, name");

      if (ufError) throw ufError;

      // Criar mapa de franchise_id -> franchise
      const franchiseMap = new Map(franchises?.map(f => [f.id, f]) || []);

      // Criar mapa de user_id -> franchise
      const userFranchiseMap = new Map(
        userFranchises?.map(uf => [
          uf.user_id,
          franchiseMap.get(uf.franchise_id)
        ]) || []
      );

      // Enriquecer dados dos clientes
      const enrichedClients: SaasClient[] = (userRoles || []).map(ur => {
        const franchise = userFranchiseMap.get(ur.user_id);
        return {
          user_id: ur.user_id,
          role: ur.role,
          created_at: ur.created_at,
          franchise_name: franchise?.name || "Sem franquia",
          franchise_city: franchise?.city || "-",
        };
      });

      setClients(enrichedClients);

      // Calcular estatísticas
      const now = new Date();
      const today = subHours(now, 24);
      const lastWeekDate = subDays(now, 7);

      const newToday = enrichedClients.filter(c => new Date(c.created_at) >= today).length;
      const lastWeek = enrichedClients.filter(c => new Date(c.created_at) >= lastWeekDate).length;
      const totalActive = enrichedClients.length;
      const totalFranchises = franchises?.filter(f => f.status === "active").length || 0;

      setStats({
        newToday,
        pendingMessages: 0, // Por enquanto sem sistema de mensagens
        inConversation: 0, // Por enquanto sem sistema de leads
        lastWeek,
        totalActive,
        totalFranchises,
      });

    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  const leadStatuses: LeadStatus[] = [
    { status: "Novos", color: "bg-blue-500", count: stats.newToday },
    { status: "Mensagem Enviada", color: "bg-yellow-500", count: 0 },
    { status: "Em Conversa", color: "bg-purple-500", count: 0 },
    { status: "Ativando", color: "bg-orange-500", count: 0 },
    { status: "Ativos", color: "bg-green-500", count: stats.totalActive },
    { status: "Inativos", color: "bg-gray-500", count: 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard SaaS</h2>
        <p className="text-muted-foreground">Gerencie seus clientes e acompanhe o crescimento do sistema</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Novos Hoje</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newToday}</div>
            <p className="text-xs text-muted-foreground">Cadastros nas últimas 24h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens Pendentes</CardTitle>
            <MessageSquare className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingMessages}</div>
            <p className="text-xs text-muted-foreground">Aguardando envio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Conversa</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inConversation}</div>
            <p className="text-xs text-muted-foreground">Leads sendo atendidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Semana</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lastWeek}</div>
            <p className="text-xs text-muted-foreground">Total de novos leads</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de totais */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalActive}</div>
            <p className="text-xs text-muted-foreground">Franqueadoras usando o sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Franquias</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalFranchises}</div>
            <p className="text-xs text-muted-foreground">Unidades ativas no sistema</p>
          </CardContent>
        </Card>
      </div>

      {/* Leads por Status */}
      <Card>
        <CardHeader>
          <CardTitle>Leads por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {leadStatuses.map((item) => (
              <div key={item.status} className="text-center">
                <div className={`${item.color} text-white text-2xl font-bold py-4 rounded-lg`}>
                  {item.count}
                </div>
                <p className="text-sm text-muted-foreground mt-2">{item.status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Últimos Cadastros */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos Cadastros</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cliente cadastrado ainda</p>
            </div>
          ) : (
            <div className="space-y-4">
              {clients.slice(0, 10).map((client, index) => (
                <div
                  key={`${client.user_id}-${index}`}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{client.franchise_name}</p>
                      <p className="text-sm text-muted-foreground">{client.franchise_city}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary">
                      {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(client.created_at), "HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gerenciador de Atualizações */}
      <SystemUpdatesManager />
    </div>
  );
};

export default SuperAdminDashboard;
