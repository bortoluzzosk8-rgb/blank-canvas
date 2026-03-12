import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Plus, Edit, Trash2, X, MessageCircle } from "lucide-react";
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
};

type Client = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  empresa?: string;
  cpf?: string;
  cnpj?: string;
  rg?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  created_at: string;
  last_access: string;
  is_client: boolean;
  franchise_id?: string;
};

const Clients = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    empresa: "",
    cpf: "",
    cnpj: "",
    rg: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    franchise_id: "",
  });

  const formatPhoneDisplay = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    if (numbers.length === 11) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else if (numbers.length === 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
    return phone;
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    const message = `Olá ${name}! Tudo bem?`;
    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  useEffect(() => {
    fetchClients();
    fetchFranchises();
  }, []);

  const fetchFranchises = async () => {
    try {
      // Buscar a franquia do usuário logado primeiro
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        setFranchises([]);
        return;
      }

      const { data: userFranchiseData } = await supabase
        .from("user_franchises")
        .select("franchise_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!userFranchiseData?.franchise_id) {
        setFranchises([]);
        return;
      }

      const rootFranchiseId = userFranchiseData.franchise_id;

      // Buscar a franquia raiz + unidades filhas (isolamento multi-tenant)
      const { data, error } = await supabase
        .from("franchises")
        .select("id, name, city")
        .eq("status", "active")
        .or(`id.eq.${rootFranchiseId},parent_franchise_id.eq.${rootFranchiseId}`)
        .order("name");

      if (error) throw error;
      setFranchises(data || []);
    } catch (error) {
      console.error("Error fetching franchises:", error);
    }
  };

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      setFilteredClients(
        clients.filter(
          (client) =>
            client.name.toLowerCase().includes(term) ||
            client.phone.toLowerCase().includes(term) ||
            client.email?.toLowerCase().includes(term) ||
            client.empresa?.toLowerCase().includes(term) ||
            client.cpf?.toLowerCase().includes(term) ||
            client.cnpj?.toLowerCase().includes(term)
        )
      );
    }
  }, [searchTerm, clients]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("is_client", true)
        .order("name");

      if (error) throw error;
      setClients(data || []);
      setFilteredClients(data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicateClient = async (
    cpf: string | null,
    phone: string,
    name: string,
    excludeId?: string
  ): Promise<{ isDuplicate: boolean; field: string | null; existingName?: string }> => {
    // Verificar CPF (se preenchido)
    if (cpf && cpf.trim()) {
      const query = supabase
        .from("clients")
        .select("id, name")
        .eq("cpf", cpf.trim());
      
      if (excludeId) {
        query.neq("id", excludeId);
      }
      
      const { data: existingByCpf } = await query.maybeSingle();
      
      if (existingByCpf) {
        return { isDuplicate: true, field: "CPF", existingName: existingByCpf.name };
      }
    }

    // Verificar telefone
    const phoneQuery = supabase
      .from("clients")
      .select("id, name")
      .eq("phone", phone.trim());
    
    if (excludeId) {
      phoneQuery.neq("id", excludeId);
    }
    
    const { data: existingByPhone } = await phoneQuery.maybeSingle();
    
    if (existingByPhone) {
      return { isDuplicate: true, field: "telefone", existingName: existingByPhone.name };
    }

    // Verificar nome exato (case insensitive)
    const nameQuery = supabase
      .from("clients")
      .select("id, name")
      .ilike("name", name.trim());
    
    if (excludeId) {
      nameQuery.neq("id", excludeId);
    }
    
    const { data: existingByName } = await nameQuery.maybeSingle();
    
    if (existingByName) {
      return { isDuplicate: true, field: "nome", existingName: existingByName.name };
    }

    return { isDuplicate: false, field: null };
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error("Preencha nome e telefone");
      return;
    }

    try {
      // Verificar duplicidade por CPF, telefone ou nome
      const duplicate = await checkDuplicateClient(
        formData.cpf || null,
        formData.phone,
        formData.name
      );

      if (duplicate.isDuplicate) {
        toast.error(
          `Já existe um cliente cadastrado com este ${duplicate.field}: "${duplicate.existingName}"`
        );
        return;
      }

      // Fazer INSERT
      const { error } = await supabase.from("clients").insert({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        empresa: formData.empresa || null,
        cpf: formData.cpf || null,
        cnpj: formData.cnpj || null,
        rg: formData.rg || null,
        endereco: formData.endereco || null,
        cidade: formData.cidade || null,
        estado: formData.estado || null,
        cep: formData.cep || null,
        franchise_id: formData.franchise_id && formData.franchise_id !== "none" ? formData.franchise_id : null,
        is_client: true,
      });

      if (error) throw error;
      toast.success("Cliente cadastrado com sucesso!");

      // Limpar formulário e recarregar lista
      setFormData({
        name: "",
        phone: "",
        email: "",
        empresa: "",
        cpf: "",
        cnpj: "",
        rg: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        franchise_id: "",
      });
      setIsAdding(false);
      fetchClients();
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      toast.error("Erro ao cadastrar cliente");
    }
  };

  const handleEdit = (client: Client) => {
    setEditingId(client.id);
    setFormData({
      name: client.name,
      phone: client.phone,
      email: client.email || "",
      empresa: client.empresa || "",
      cpf: client.cpf || "",
      cnpj: client.cnpj || "",
      rg: client.rg || "",
      endereco: client.endereco || "",
      cidade: client.cidade || "",
      estado: client.estado || "",
      cep: client.cep || "",
      franchise_id: client.franchise_id || "",
    });
    setIsAdding(false);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast.error("Preencha nome e telefone");
      return;
    }

    try {
      // Verificar duplicidade (excluindo o próprio registro)
      const duplicate = await checkDuplicateClient(
        formData.cpf || null,
        formData.phone,
        formData.name,
        editingId!
      );

      if (duplicate.isDuplicate) {
        toast.error(
          `Já existe outro cliente cadastrado com este ${duplicate.field}: "${duplicate.existingName}"`
        );
        return;
      }

      const { error } = await supabase
        .from("clients")
        .update({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          empresa: formData.empresa || null,
          cpf: formData.cpf || null,
          cnpj: formData.cnpj || null,
          rg: formData.rg || null,
          endereco: formData.endereco || null,
          cidade: formData.cidade || null,
          estado: formData.estado || null,
          cep: formData.cep || null,
          franchise_id: formData.franchise_id && formData.franchise_id !== "none" ? formData.franchise_id : null,
        })
        .eq("id", editingId);

      if (error) throw error;
      toast.success("Cliente atualizado com sucesso!");
      setFormData({
        name: "",
        phone: "",
        email: "",
        empresa: "",
        cpf: "",
        cnpj: "",
        rg: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        franchise_id: "",
      });
      setEditingId(null);
      fetchClients();
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      toast.error("Erro ao atualizar cliente");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover "${name}"?`)) return;

    try {
      const { data, error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("Não foi possível remover o cliente. Verifique suas permissões.");
        return;
      }
      toast.success("Cliente removido com sucesso");
      fetchClients();
    } catch (error) {
      console.error("Erro ao remover cliente:", error);
      toast.error("Erro ao remover cliente");
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: "",
      phone: "",
      email: "",
      empresa: "",
      cpf: "",
      cnpj: "",
      rg: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      franchise_id: "",
    });
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-2">Clientes Cadastrados</h2>
            <p className="text-sm text-muted-foreground">
              Total: {clients.length} cliente{clients.length !== 1 ? "s" : ""}
            </p>
          </div>
          {!isAdding && !editingId && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Cliente
            </Button>
          )}
        </div>

        {(isAdding || editingId) && (
          <Card className="p-4 mb-6 bg-muted/50">
            <form onSubmit={editingId ? handleUpdate : handleAddClient} className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">
                  {editingId ? "Editar Cliente" : "Novo Cliente"}
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Dados Básicos */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground border-b pb-2">
                  📋 Dados Básicos *
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome Completo *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Nome completo"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Unidade */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground border-b pb-2">
                  🏪 Unidade (opcional)
                </h4>
                <div>
                  <Label htmlFor="franchise_id">Unidade de Atendimento</Label>
                  <Select
                    value={formData.franchise_id}
                    onValueChange={(value) => setFormData({ ...formData, franchise_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma unidade (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma unidade</SelectItem>
                      {franchises.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name} - {f.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Indica a unidade preferencial do cliente (não limita locações)
                  </p>
                </div>
              </div>

              {/* Contato Adicional */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground border-b pb-2">
                  📧 Contato Adicional
                </h4>
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              {/* Documentos */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground border-b pb-2">
                  🆔 Documentos
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rg">RG</Label>
                    <Input
                      id="rg"
                      value={formData.rg}
                      onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                      placeholder="00.000.000-0"
                    />
                  </div>
                </div>
              </div>

              {/* Dados Empresariais */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground border-b pb-2">
                  🏢 Dados Empresariais (opcional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="empresa">Nome da Empresa</Label>
                    <Input
                      id="empresa"
                      value={formData.empresa}
                      onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                      placeholder="Nome fantasia ou razão social"
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
                </div>
              </div>

              {/* Endereço */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-foreground border-b pb-2">
                  📍 Endereço
                </h4>
                <div>
                  <Label htmlFor="endereco">Endereço Completo</Label>
                  <Input
                    id="endereco"
                    name="endereco_novo"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, número, complemento"
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      name="cidade_nova"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                      placeholder="Nome da cidade"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado (UF)</Label>
                    <Select
                      value={formData.estado}
                      onValueChange={(value) => setFormData({ ...formData, estado: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AC">AC - Acre</SelectItem>
                        <SelectItem value="AL">AL - Alagoas</SelectItem>
                        <SelectItem value="AP">AP - Amapá</SelectItem>
                        <SelectItem value="AM">AM - Amazonas</SelectItem>
                        <SelectItem value="BA">BA - Bahia</SelectItem>
                        <SelectItem value="CE">CE - Ceará</SelectItem>
                        <SelectItem value="DF">DF - Distrito Federal</SelectItem>
                        <SelectItem value="ES">ES - Espírito Santo</SelectItem>
                        <SelectItem value="GO">GO - Goiás</SelectItem>
                        <SelectItem value="MA">MA - Maranhão</SelectItem>
                        <SelectItem value="MT">MT - Mato Grosso</SelectItem>
                        <SelectItem value="MS">MS - Mato Grosso do Sul</SelectItem>
                        <SelectItem value="MG">MG - Minas Gerais</SelectItem>
                        <SelectItem value="PA">PA - Pará</SelectItem>
                        <SelectItem value="PB">PB - Paraíba</SelectItem>
                        <SelectItem value="PR">PR - Paraná</SelectItem>
                        <SelectItem value="PE">PE - Pernambuco</SelectItem>
                        <SelectItem value="PI">PI - Piauí</SelectItem>
                        <SelectItem value="RJ">RJ - Rio de Janeiro</SelectItem>
                        <SelectItem value="RN">RN - Rio Grande do Norte</SelectItem>
                        <SelectItem value="RS">RS - Rio Grande do Sul</SelectItem>
                        <SelectItem value="RO">RO - Rondônia</SelectItem>
                        <SelectItem value="RR">RR - Roraima</SelectItem>
                        <SelectItem value="SC">SC - Santa Catarina</SelectItem>
                        <SelectItem value="SP">SP - São Paulo</SelectItem>
                        <SelectItem value="SE">SE - Sergipe</SelectItem>
                        <SelectItem value="TO">TO - Tocantins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      name="cep_novo"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="00000-000"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2 pt-2">
                <Button type="submit">
                  {editingId ? "Atualizar" : "Cadastrar"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </form>
          </Card>
        )}

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone, email, empresa ou documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredClients.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  {/* Nome e Empresa */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">
                      {client.name}
                      {client.empresa && (
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          ({client.empresa})
                        </span>
                      )}
                    </h3>
                    {client.franchise_id && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        🏪 {franchises.find(f => f.id === client.franchise_id)?.name || "Unidade"}
                      </span>
                    )}
                  </div>

                  {/* Contatos */}
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>📱 {formatPhoneDisplay(client.phone)}</p>
                    {client.email && <p>📧 {client.email}</p>}
                  </div>

                  {/* Documentos */}
                  {(client.cpf || client.cnpj || client.rg) && (
                    <div className="text-sm text-muted-foreground">
                      {client.cpf && <span className="mr-3">CPF: {client.cpf}</span>}
                      {client.cnpj && <span className="mr-3">CNPJ: {client.cnpj}</span>}
                      {client.rg && <span>RG: {client.rg}</span>}
                    </div>
                  )}

                  {/* Endereço */}
                  {(client.endereco || client.cidade || client.estado) && (
                    <div className="text-sm text-muted-foreground">
                      📍 {client.endereco}
                      {client.cidade && `, ${client.cidade}`}
                      {client.estado && `/${client.estado}`}
                      {client.cep && ` - ${client.cep}`}
                    </div>
                  )}
                </div>

                {/* Datas e ações */}
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm text-muted-foreground">
                    <p>Cliente desde: {new Date(client.created_at).toLocaleDateString("pt-BR")}</p>
                    <p>Último acesso: {new Date(client.last_access).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openWhatsApp(client.phone, client.name)}
                      className="gap-2 hover:bg-green-50"
                    >
                      <MessageCircle className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(client)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(client.id, client.name)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Clients;
