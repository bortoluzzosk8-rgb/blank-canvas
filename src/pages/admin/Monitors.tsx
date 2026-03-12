import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Trash2, User, Plus, Phone, MapPin, Building2, PartyPopper } from "lucide-react";

interface Monitor {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  notes: string | null;
  franchise_id: string | null;
  created_at: string;
  franchises?: {
    name: string;
    city: string;
  } | null;
}

interface Franchise {
  id: string;
  name: string;
  city: string;
}

export default function Monitors() {
  const { isFranqueadora, isVendedor, userFranchise } = useAuth();
  const { toast } = useToast();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [monitorPartyCounts, setMonitorPartyCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [franchiseId, setFranchiseId] = useState("");
  
  // Edit state
  const [editingMonitor, setEditingMonitor] = useState<Monitor | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editFranchiseId, setEditFranchiseId] = useState("");
  
  // Delete state
  const [deletingMonitor, setDeletingMonitor] = useState<Monitor | null>(null);

  const canEdit = isFranqueadora || isVendedor;

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // Buscar franquias do tenant primeiro para filtrar monitores
      let tenantFranchiseIds: string[] = [];
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: userFranchiseData } = await supabase
          .from("user_franchises")
          .select("franchise_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (userFranchiseData?.franchise_id) {
          const rootFranchiseId = userFranchiseData.franchise_id;

          // Buscar a franquia raiz + unidades filhas (isolamento multi-tenant)
          const { data: franchisesData, error: franchisesError } = await supabase
            .from("franchises")
            .select("id, name, city")
            .eq("status", "active")
            .or(`id.eq.${rootFranchiseId},parent_franchise_id.eq.${rootFranchiseId}`)
            .order("name");

          if (franchisesError) throw franchisesError;
          setFranchises(franchisesData || []);
          tenantFranchiseIds = (franchisesData || []).map(f => f.id);
        }
      }

      // Fetch monitors filtrados pelo tenant
      let monitorsQuery = supabase
        .from("monitors")
        .select(`*, franchises (name, city)`)
        .order("name");

      if (tenantFranchiseIds.length > 0) {
        monitorsQuery = monitorsQuery.in("franchise_id", tenantFranchiseIds);
      } else {
        // Sem franquias = sem monitores
        setMonitors([]);
        setLoading(false);
        return;
      }

      const { data: monitorsData, error: monitorsError } = await monitorsQuery;
      if (monitorsError) throw monitorsError;
      setMonitors(monitorsData || []);

      // Buscar contagem de festas por monitor
      const { data: partyCountsData, error: partyCountsError } = await supabase
        .from("sale_monitoring_slots")
        .select("monitor_id");

      if (!partyCountsError && partyCountsData) {
        const counts: Record<string, number> = {};
        partyCountsData.forEach(slot => {
          if (slot.monitor_id) {
            counts[slot.monitor_id] = (counts[slot.monitor_id] || 0) + 1;
          }
        });
        setMonitorPartyCounts(counts);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name.trim() || !phone.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const selectedFranchiseId = (isFranqueadora || isVendedor) ? franchiseId : userFranchise?.id;
    
    if (!selectedFranchiseId) {
      toast({
        title: "Unidade não selecionada",
        description: "Selecione uma unidade para o monitor.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("monitors").insert({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim() || null,
        notes: notes.trim() || null,
        franchise_id: selectedFranchiseId,
      });

      if (error) throw error;

      toast({
        title: "Monitor cadastrado",
        description: `${name} foi cadastrado com sucesso.`,
      });

      // Reset form
      setName("");
      setPhone("");
      setAddress("");
      setNotes("");
      setFranchiseId("");
      
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit() {
    if (!editingMonitor) return;
    
    if (!editName.trim() || !editPhone.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Nome e telefone são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const selectedFranchiseId = (isFranqueadora || isVendedor) ? editFranchiseId : editingMonitor.franchise_id;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("monitors")
        .update({
          name: editName.trim(),
          phone: editPhone.trim(),
          address: editAddress.trim() || null,
          notes: editNotes.trim() || null,
          franchise_id: selectedFranchiseId,
        })
        .eq("id", editingMonitor.id);

      if (error) throw error;

      toast({
        title: "Monitor atualizado",
        description: `${editName} foi atualizado com sucesso.`,
      });

      setEditingMonitor(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingMonitor) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("monitors")
        .delete()
        .eq("id", deletingMonitor.id);

      if (error) throw error;

      toast({
        title: "Monitor excluído",
        description: `${deletingMonitor.name} foi excluído com sucesso.`,
      });

      setDeletingMonitor(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(monitor: Monitor) {
    setEditingMonitor(monitor);
    setEditName(monitor.name);
    setEditPhone(monitor.phone);
    setEditAddress(monitor.address || "");
    setEditNotes(monitor.notes || "");
    setEditFranchiseId(monitor.franchise_id || "");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6" />
          Gerenciar Monitores
        </h1>
        {userFranchise && !isFranqueadora && !isVendedor && (
          <p className="text-muted-foreground">
            Monitores da unidade: {userFranchise.name} - {userFranchise.city}
          </p>
        )}
      </div>

      {/* Form de Cadastro */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5" />
              Cadastrar Novo Monitor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    placeholder="Nome do monitor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    placeholder="Endereço (opcional)"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                {(isFranqueadora || isVendedor) && (
                  <div className="space-y-2">
                    <Label htmlFor="franchise">Unidade *</Label>
                    <Select value={franchiseId} onValueChange={setFranchiseId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {franchises.map((franchise) => (
                          <SelectItem key={franchise.id} value={franchise.id}>
                            {franchise.name} - {franchise.city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  placeholder="Observações sobre o monitor (opcional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? "Cadastrando..." : "Cadastrar Monitor"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Monitores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Monitores Cadastrados ({monitors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : monitors.length === 0 ? (
            <p className="text-muted-foreground">Nenhum monitor cadastrado.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead>Festas</TableHead>
                    {(isFranqueadora || isVendedor) && <TableHead>Unidade</TableHead>}
                    {canEdit && <TableHead className="w-[100px]">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitors.map((monitor) => (
                    <TableRow key={monitor.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {monitor.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {monitor.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {monitor.address ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            {monitor.address}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {monitor.notes ? (
                          <span className="text-sm line-clamp-2" title={monitor.notes}>
                            {monitor.notes}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                        </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PartyPopper className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-primary">
                            {monitorPartyCounts[monitor.id] || 0}
                          </span>
                        </div>
                      </TableCell>
                      {(isFranqueadora || isVendedor) && (
                        <TableCell>
                          {monitor.franchises ? (
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              {monitor.franchises.name} - {monitor.franchises.city}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      )}
                      {canEdit && (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(monitor)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingMonitor(monitor)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      <Dialog open={!!editingMonitor} onOpenChange={() => setEditingMonitor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Monitor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone *</Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Endereço</Label>
              <Input
                id="edit-address"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Observações</Label>
              <Textarea
                id="edit-notes"
                placeholder="Observações sobre o monitor"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>
            {(isFranqueadora || isVendedor) && (
              <div className="space-y-2">
                <Label htmlFor="edit-franchise">Unidade *</Label>
                <Select value={editFranchiseId} onValueChange={setEditFranchiseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {franchises.map((franchise) => (
                      <SelectItem key={franchise.id} value={franchise.id}>
                        {franchise.name} - {franchise.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMonitor(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={!!deletingMonitor} onOpenChange={() => setDeletingMonitor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            Tem certeza que deseja excluir o monitor{" "}
            <strong>{deletingMonitor?.name}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingMonitor(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
