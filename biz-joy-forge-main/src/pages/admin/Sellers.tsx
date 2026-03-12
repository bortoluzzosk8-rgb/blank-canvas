import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, Eye, EyeOff, UserCheck } from 'lucide-react';

type Seller = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

const Sellers = () => {
  const { isFranqueadora } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sellerToDelete, setSellerToDelete] = useState<Seller | null>(null);

  useEffect(() => {
    if (isFranqueadora) {
      fetchSellers();
    }
  }, [isFranqueadora]);

  // Email validation with debounce
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
          .from('sellers')
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

  async function fetchSellers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSellers(data || []);
    } catch (error: any) {
      console.error('Error fetching sellers:', error);
      toast.error('Erro ao carregar vendedores');
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

    setSaving(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-seller', {
        body: { name, email, password, phone },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      // Check for errors - the response.data contains the JSON body even on error
      if (response.error || response.data?.error) {
        const errorMessage = response.data?.error || response.error?.message || 'Erro ao criar vendedor';
        throw new Error(errorMessage);
      }

      if (!response.data?.success) {
        throw new Error('Erro ao criar vendedor');
      }

      toast.success('Vendedor criado com sucesso');
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      fetchSellers();
    } catch (error: any) {
      console.error('Error creating seller:', error);
      toast.error(error.message || 'Erro ao criar vendedor');
    } finally {
      setSaving(false);
    }
  }

  function openEditDialog(seller: Seller) {
    setEditingSeller(seller);
    setEditName(seller.name);
    setEditPhone(seller.phone || '');
    setNewPassword('');
    setEditDialogOpen(true);
  }

  async function handleUpdate() {
    if (!editingSeller || !editName) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      // Update seller record
      const { error: updateError } = await supabase
        .from('sellers')
        .update({
          name: editName,
          phone: editPhone || null,
        })
        .eq('id', editingSeller.id);

      if (updateError) throw updateError;

      // Reset password if provided
      if (newPassword) {
        if (newPassword.length < 6) {
          toast.error('A nova senha deve ter no mínimo 6 caracteres');
          setSaving(false);
          return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        
        const response = await supabase.functions.invoke('reset-seller-password', {
          body: {
            user_id: editingSeller.user_id,
            new_password: newPassword,
          },
          headers: {
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
        });

        if (response.error || response.data?.error) {
          throw new Error(response.data?.error || 'Erro ao resetar senha');
        }

        toast.success('Vendedor atualizado e senha resetada');
      } else {
        toast.success('Vendedor atualizado');
      }

      setEditDialogOpen(false);
      fetchSellers();
    } catch (error: any) {
      console.error('Error updating seller:', error);
      toast.error(error.message || 'Erro ao atualizar vendedor');
    } finally {
      setSaving(false);
    }
  }

  function openDeleteDialog(seller: Seller) {
    setSellerToDelete(seller);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!sellerToDelete) return;

    setSaving(true);
    try {
      // Delete from sellers table
      const { error: sellerError } = await supabase
        .from('sellers')
        .delete()
        .eq('id', sellerToDelete.id);

      if (sellerError) throw sellerError;

      // Delete from user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', sellerToDelete.user_id);

      if (roleError) {
        console.error('Error deleting user role:', roleError);
      }

      // Delete from auth.users via edge function
      const { data: sessionData } = await supabase.auth.getSession();
      const { error: deleteUserError } = await supabase.functions.invoke('delete-user', {
        body: { user_id: sellerToDelete.user_id },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (deleteUserError) {
        console.error('Error deleting auth user:', deleteUserError);
        // Still show success since seller record was deleted
      }

      toast.success('Vendedor removido completamente');
      setDeleteDialogOpen(false);
      setSellerToDelete(null);
      fetchSellers();
    } catch (error: any) {
      console.error('Error deleting seller:', error);
      toast.error('Erro ao remover vendedor');
    } finally {
      setSaving(false);
    }
  }

  if (!isFranqueadora) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Acesso negado. Apenas franqueadoras podem gerenciar vendedores.</p>
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
        <UserCheck className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold">Gerenciar Vendedores</h1>
      </div>

      {/* Create seller form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Cadastrar Novo Vendedor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do vendedor"
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
                    Criar Vendedor
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sellers list */}
      <Card>
        <CardHeader>
          <CardTitle>Vendedores Cadastrados ({sellers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sellers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhum vendedor cadastrado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((seller) => (
                  <TableRow key={seller.id}>
                    <TableCell className="font-medium">{seller.name}</TableCell>
                    <TableCell>{seller.email || '-'}</TableCell>
                    <TableCell>{seller.phone || '-'}</TableCell>
                    <TableCell>
                      {new Date(seller.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openEditDialog(seller)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => openDeleteDialog(seller)}
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
            <DialogTitle>Editar Vendedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nome do vendedor"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                value={editingSeller?.email || ''}
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
            Tem certeza que deseja remover o vendedor{' '}
            <strong>{sellerToDelete?.name}</strong>? Esta ação não pode ser desfeita.
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

export default Sellers;
