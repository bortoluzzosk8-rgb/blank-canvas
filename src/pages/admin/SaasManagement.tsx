import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Users, Building2, Search, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Navigate } from "react-router-dom";

type FranqueadoraUser = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  user_email?: string;
  franchises_count?: number;
};

export default function SaasManagement() {
  const { isSuperAdmin } = useAuth();
  const [search, setSearch] = useState("");

  // Redirecionar se não for super admin
  if (!isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // Buscar todos os usuários com role 'franqueadora'
  const { data: franqueadoraUsers, isLoading } = useQuery({
    queryKey: ["saas-franqueadora-users"],
    queryFn: async () => {
      // Buscar roles de franqueadora
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("role", "franqueadora")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Para cada role, buscar dados adicionais
      const usersWithDetails = await Promise.all(
        (roles || []).map(async (role) => {
          // Buscar quantas franquias o usuário tem
          const { count: franchisesCount } = await supabase
            .from("user_franchises")
            .select("*", { count: "exact", head: true })
            .eq("user_id", role.user_id);

          return {
            ...role,
            franchises_count: franchisesCount || 0,
          };
        })
      );

      return usersWithDetails;
    },
  });

  // Estatísticas gerais
  const { data: stats } = useQuery({
    queryKey: ["saas-stats"],
    queryFn: async () => {
      const [franchisesResult, salesResult, usersResult] = await Promise.all([
        supabase.from("franchises").select("*", { count: "exact", head: true }),
        supabase.from("sales").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "franqueadora"),
      ]);

      return {
        totalFranchises: franchisesResult.count || 0,
        totalSales: salesResult.count || 0,
        totalUsers: usersResult.count || 0,
      };
    },
  });

  const filteredUsers = franqueadoraUsers?.filter((user) =>
    user.user_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gestão do SaaS</h1>
          <p className="text-muted-foreground">Gerencie todos os clientes da plataforma</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Franqueadoras cadastradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Unidades</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFranchises || 0}</div>
            <p className="text-xs text-muted-foreground">Franquias criadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSales || 0}</div>
            <p className="text-xs text-muted-foreground">Vendas na plataforma</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes (Franqueadoras)</CardTitle>
          <CardDescription>Lista de todos os clientes que usam a plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID do Usuário</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead>Franquias</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Nenhum cliente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-mono text-sm">
                        {user.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{user.franchises_count} unidades</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className="bg-green-500">Ativo</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          Ver detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
