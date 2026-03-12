import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Store, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Franchise = {
  id: string;
  name: string;
  city: string;
  state?: string;
  address?: string;
  cnpj?: string;
  cep?: string;
  phone?: string;
  email?: string;
  status: string;
  parent_franchise_id?: string | null;
  created_at: string;
};

const BRAZILIAN_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const Franchises = () => {
  const { isFranqueadora, user } = useAuth();
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [rootFranchiseId, setRootFranchiseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    id: "",
    name: "",
    city: "",
    state: "",
    address: "",
    cnpj: "",
    cep: "",
    phone: "",
    email: "",
    status: "active",
  });

  const isEditing = formData.id !== "";

  useEffect(() => {
    if (!isFranqueadora) {
      toast.error("Acesso negado. Apenas franqueadoras podem gerenciar unidades.");
      return;
    }
    fetchFranchises();
  }, [isFranqueadora, user]);

  const fetchFranchises = async () => {
    try {
      if (!user?.id) return;

      // Buscar a franquia raiz do usuário logado
      const { data: userFranchiseRows, error: userFranchiseError } = await supabase
        .from("user_franchises")
        .select("franchise_id")
        .eq("user_id", user.id)
        .limit(1);
      const userFranchise = userFranchiseRows?.[0] || null;

      if (userFranchiseError) throw userFranchiseError;

      let userRootFranchiseId = userFranchise?.franchise_id || null;

      // Se não tem vínculo, tentar recuperar automaticamente
      if (!userRootFranchiseId) {
        console.log("Usuário sem vínculo em user_franchises, tentando auto-recuperação...");
        
        // Buscar franquias raiz (sem parent_franchise_id) que o usuário pode ter criado
        const { data: orphanFranchises, error: orphanError } = await supabase
          .from("franchises")
          .select("id, name")
          .is("parent_franchise_id", null)
          .order("created_at", { ascending: true })
          .limit(1);

        if (!orphanError && orphanFranchises && orphanFranchises.length > 0) {
          const firstFranchise = orphanFranchises[0];
          
          // Criar o vínculo automaticamente
          const { error: insertError } = await supabase
            .from("user_franchises")
            .insert({
              user_id: user.id,
              franchise_id: firstFranchise.id,
              name: firstFranchise.name
            });

          if (!insertError) {
            console.log("Vínculo criado automaticamente:", firstFranchise.name);
            userRootFranchiseId = firstFranchise.id;
            toast.success("Sua franquia raiz foi vinculada automaticamente");
          } else {
            console.error("Erro ao criar vínculo:", insertError);
          }
        }
      }

      if (!userRootFranchiseId) {
        setFranchises([]);
        setLoading(false);
        toast.info("Nenhuma franquia encontrada. Crie sua primeira unidade.");
        return;
      }

      setRootFranchiseId(userRootFranchiseId);

      // Buscar apenas a franquia raiz e suas unidades filhas
      const { data, error } = await supabase
        .from("franchises")
        .select("*")
        .or(`id.eq.${userRootFranchiseId},parent_franchise_id.eq.${userRootFranchiseId}`)
        .order("name");

      if (error) throw error;
      setFranchises(data || []);
    } catch (error) {
      console.error("Error fetching franchises:", error);
      toast.error("Erro ao carregar unidades");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.city) {
      toast.error("Preencha nome e cidade");
      return;
    }

    try {
      const franchiseData = {
        name: formData.name,
        city: formData.city,
        state: formData.state || null,
        address: formData.address || null,
        cnpj: formData.cnpj || null,
        cep: formData.cep || null,
        phone: formData.phone || null,
        email: formData.email || null,
        status: formData.status,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("franchises")
          .update(franchiseData)
          .eq("id", formData.id);

        if (error) throw error;
        toast.success("Unidade atualizada com sucesso");
      } else {
        // Ao criar nova unidade, vincular à franquia raiz do usuário
        const { error } = await supabase
          .from("franchises")
          .insert({
            ...franchiseData,
            parent_franchise_id: rootFranchiseId, // Vincula como unidade filha
          });

        if (error) throw error;
        toast.success("Unidade criada com sucesso");
      }

      resetForm();
      fetchFranchises();
    } catch (error) {
      console.error("Error saving franchise:", error);
      toast.error("Erro ao salvar unidade");
    }
  };

  const handleEdit = (franchise: Franchise) => {
    setFormData({
      id: franchise.id,
      name: franchise.name,
      city: franchise.city,
      state: franchise.state || "",
      address: franchise.address || "",
      cnpj: franchise.cnpj || "",
      cep: franchise.cep || "",
      phone: franchise.phone || "",
      email: franchise.email || "",
      status: franchise.status,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta unidade?")) return;

    try {
      const { error } = await supabase
        .from("franchises")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Unidade excluída com sucesso");
      fetchFranchises();
    } catch (error) {
      console.error("Error deleting franchise:", error);
      toast.error("Erro ao excluir unidade");
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      city: "",
      state: "",
      address: "",
      cnpj: "",
      cep: "",
      phone: "",
      email: "",
      status: "active",
    });
  };

  if (!isFranqueadora) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-muted-foreground">
          Acesso Negado
        </h2>
        <p className="text-muted-foreground mt-2">
          Esta página é acessível apenas para franqueadoras
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Unidades</h2>
          <p className="text-muted-foreground">
            Gerencie as unidades franqueadas do sistema
          </p>
        </div>
      </div>

      {/* Formulário */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              {isEditing ? "Editar Unidade" : "Nova Unidade"}
            </h3>
            {isEditing && (
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome da Unidade *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: ENGBRINK - Curitiba"
                required
              />
            </div>

            <div>
              <Label htmlFor="city">Cidade *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ex: Curitiba"
                required
              />
            </div>

            <div>
              <Label htmlFor="state">Estado</Label>
              <Select value={formData.state} onValueChange={(value) => setFormData({ ...formData, state: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o estado" />
                </SelectTrigger>
                <SelectContent>
                  {BRAZILIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@unidade.com"
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, número, bairro"
              />
            </div>

            <div>
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={formData.cep}
                onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                placeholder="00000-000"
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            {isEditing ? "Atualizar Unidade" : "Cadastrar Unidade"}
          </Button>
        </form>
      </Card>

      {/* Lista de Unidades */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {franchises.map((franchise) => (
          <Card key={franchise.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Store className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold">{franchise.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {franchise.city}{franchise.state && ` - ${franchise.state}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(franchise)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(franchise.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {franchise.phone && (
              <p className="text-sm text-muted-foreground mt-2">
                📞 {franchise.phone}
              </p>
            )}
            {franchise.email && (
              <p className="text-sm text-muted-foreground">
                ✉️ {franchise.email}
              </p>
            )}

            <div className="mt-3">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  franchise.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {franchise.status === "active" ? "Ativa" : "Inativa"}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {franchises.length === 0 && (
        <div className="text-center py-12">
          <Store className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhuma unidade cadastrada ainda
          </p>
        </div>
      )}
    </div>
  );
};

export default Franchises;
