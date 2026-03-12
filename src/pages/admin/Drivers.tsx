import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff, Truck } from 'lucide-react';

type Driver = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  franchise_id: string | null;
  created_at: string;
  franchise?: {
    name: string;
    city: string;
  } | null;
};

type Franchise = {
  id: string;
  name: string;
  city: string;
};

const Drivers = () => {
  const { isFranqueadora, isVendedor, userFranchise } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [selectedFranchise, setSelectedFranchise] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editFranchise, setEditFranchise] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);

  const canManageDrivers = isFranqueadora || isVendedor;
  const userFranchiseId = userFranchise?.id;

  useEffect(() => {
    if (canManageDrivers) {
      fetchDrivers();
      if (isFranqueadora || isVendedor) {
        fetchFranchises();
      }
    }
  }, [canManageDrivers, isFranqueadora]);

  useEffect(() => {
    if (!email) {
      setEmailError('');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Email inválido');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const { data } = await supabase
          .from('drivers')
          .select('email')
          .eq('email', email)
          .maybeSingle();

        if (data) {
          setEmailError('Este email já está cadastrado');
        } else {
          setEmailError('');
        }
      } catch (error) {
        console.error('Error checking email:', error);
      } finally {
        setCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [email]);

  async function fetchFranchises() {
    try {
      // Buscar a franquia do usuário logado primeiro
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.id) {
        setFranchises([]);
        return;
      }

      const { data: userFranchiseData } = await supabase
        .from("user_franchises")
        .select("franchise_id")
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (!userFranchiseData?.franchise_id) {
        setFranchises([]);
        return;
      }

      const rootFranchiseId = userFranchiseData.franchise_id;

      // Buscar a franquia raiz + unidades filhas (isolamento multi-tenant)
      const { data, error } = await supabase
        .from('franchises')
        .select('id, name, city')
        .eq('status', 'active')
        .or(`id.eq.${rootFranchiseId},parent_franchise_id.eq.${rootFranchiseId}`)
        .order('name');

      if (error) throw error;
      setFranchises(data || []);
    } catch (error) {
      console.error('Error fetching franchises:', error);
    }
  }

  async function fetchDrivers() {
    try {
      setLoading(true);
      let query = supabase
        .from('drivers')
        .select(`
          *,
          franchise:franchises(name, city)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setDrivers(data || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      toast.error('Erro ao carregar motoristas');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !email || !password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (emailError) {
      toast.error(emailError);
      return;
    }

    // Vendedor e franqueadora podem escolher a franquia
    const franchiseToUse = selectedFranchise === 'none' ? null : selectedFranchise || null;

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-driver', {
        body: { 
          name, 
          email, 
          password, 
          phone,
          franchise_id: franchiseToUse
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar motorista');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success('Motorista criado com sucesso');
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setSelectedFranchise('');
      fetchDrivers();
    } catch (error: unknown) {
      console.error('Error creating driver:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao criar motorista');
    } finally {
      setSaving(false);
    }
  }

  function openEditDialog(driver: Driver) {
    setEditingDriver(driver);
    setEditName(driver.name);
    setEditPhone(driver.phone || '');
    setEditFranchise(driver.franchise_id || '');
    setNewPassword('');
    setEditDialogOpen(true);
  }

  async function handleUpdate() {
    if (!editingDriver || !editName) {
      toast.error('Nome é obrigatório');
      return;
    }

    // Vendedor e franqueadora podem mudar a franquia
    const franchiseToUpdate = editFranchise === 'none' ? null : editFranchise || null;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('drivers')
        .update({
          name: editName,
          phone: editPhone || null,
          franchise_id: franchiseToUpdate,
        })
        .eq('id', editingDriver.id);

      if (updateError) throw updateError;

      if (newPassword) {
        if (newPassword.length < 6) {
          toast.error('A nova senha deve ter no mínimo 6 caracteres');
          setSaving(false);
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        
        const response = await supabase.functions.invoke('reset-driver-password', {
          body: {
            user_id: editingDriver.user_id,
            new_password: newPassword,
          },
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
        });

        if (response.error || response.data?.error) {
          throw new Error(response.data?.error || 'Erro ao resetar senha');
        }

        toast.success('Motorista atualizado e senha resetada');
      } else {
        toast.success('Motorista atualizado');
      }

      setEditDialogOpen(false);
      fetchDrivers();
    } catch (error: unknown) {
      console.error('Error updating driver:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao atualizar motorista');
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(driver: Driver) {
    setDriverToDelete(driver);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!driverToDelete) return;

    setSaving(true);
    try {
      const { error: driverError } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driverToDelete.id);

      if (driverError) throw driverError;

      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', driverToDelete.user_id);

      if (roleError) {
        console.error('Error deleting user role:', roleError);
      }

      // Delete from auth.users via edge function
      const { data: sessionData } = await supabase.auth.getSession();
      const { error: deleteUserError } = await supabase.functions.invoke('delete-user', {
        body: { user_id: driverToDelete.user_id },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (deleteUserError) {
        console.error('Error deleting auth user:', deleteUserError);
      }

      toast.success('Motorista removido completamente');
      setDeleteDialogOpen(false);
      setDriverToDelete(null);
      fetchDrivers();
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error('Erro ao remover motorista');
    } finally {
      setSaving(false);
    }
  }

  if (!canManageDrivers) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso negado. Apenas franqueadoras, franqueados e vendedores podem gerenciar motoristas.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Truck className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Motoristas</h1>
        </div>
      </div>

      {/* Create driver form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Cadastrar Novo Motorista
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className={`grid gap-4 md:grid-cols-2 ${(isFranqueadora || isVendedor) ? 'lg:grid-cols-6' : 'lg:grid-cols-5'}`}>
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do motorista"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                required
                className={emailError ? 'border-destructive' : ''}
              />
              {checkingEmail && <p className="text-xs text-muted-foreground">Verificando...</p>}
              {emailError && <p className="text-xs text-destructive">{emailError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            {/* Mostra seleção de franquia para franqueadora e vendedor */}
            {(isFranqueadora || isVendedor) && (
              <div className="space-y-2">
                <Label htmlFor="franchise">Unidade</Label>
                <Select value={selectedFranchise} onValueChange={setSelectedFranchise}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {franchises.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} - {f.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-end">
              <Button type="submit" disabled={saving || !!emailError} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Motorista
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Drivers list */}
      <Card>
        <CardHeader>
          <CardTitle>Motoristas Cadastrados ({drivers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {drivers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum motorista cadastrado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  {(isFranqueadora || isVendedor) && <TableHead>Unidade</TableHead>}
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell>{driver.email || '-'}</TableCell>
                    <TableCell>{driver.phone || '-'}</TableCell>
                    {(isFranqueadora || isVendedor) && (
                      <TableCell>
                        {driver.franchise ? `${driver.franchise.name} - ${driver.franchise.city}` : '-'}
                      </TableCell>
                    )}
                    <TableCell>
                      {new Date(driver.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(driver)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(driver)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Motorista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do motorista"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                value={editingDriver?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">O email não pode ser alterado</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
            {/* Mostra seleção de franquia para franqueadora e vendedor */}
            {(isFranqueadora || isVendedor) && (
              <div className="space-y-2">
                <Label htmlFor="edit-franchise">Unidade</Label>
                <Select value={editFranchise} onValueChange={setEditFranchise}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {franchises.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} - {f.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha (opcional)</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Deixe vazio para manter a atual"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p>
            Tem certeza que deseja remover o motorista{' '}
            <strong>{driverToDelete?.name}</strong>? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removendo...
                </>
              ) : (
                'Remover'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Drivers;
