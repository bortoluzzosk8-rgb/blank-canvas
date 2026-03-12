import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Shield, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, isAdmin, checkingAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingFranqueadora, setCreatingFranqueadora] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [sessionDeviceInfo, setSessionDeviceInfo] = useState<string | null>(null);

  useEffect(() => {
    if (user && !authLoading && !checkingAdmin && isAdmin) {
      navigate("/admin");
    }
  }, [user, authLoading, checkingAdmin, isAdmin, navigate]);

  const checkActiveSession = async (emailToCheck: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('check-active-session', {
        body: { email: emailToCheck.trim() }
      });
      if (error) return false;
      if (data?.hasActiveSession) {
        setSessionDeviceInfo(data.deviceInfo || null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const performLogin = async (forceDisconnectOthers = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        const msg = error.message;
        if (msg?.toLowerCase().includes('leaked') || msg?.toLowerCase().includes('pwned') || msg?.toLowerCase().includes('breach')) {
          // Ignore leaked password warning
        } else {
          throw error;
        }
      }

      if (data?.user || !error) {
        if (forceDisconnectOthers) {
          await supabase.auth.signOut({ scope: 'others' });
        }
        toast.success("Login realizado com sucesso!");
      }
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Erro ao fazer login");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error("Por favor, preencha email e senha");
      return;
    }

    setLoading(true);
    const hasSession = await checkActiveSession(email);
    setLoading(false);

    if (hasSession) {
      setShowSessionDialog(true);
    } else {
      await performLogin();
    }
  };

  const handleConfirmForceLogin = async () => {
    setShowSessionDialog(false);
    await performLogin(true);
  };

  const handleCreateFranqueadora = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("Por favor, preencha email e senha");
      return;
    }

    const authorizedEmail = 'bortoluzzosk8@gmail.com';
    if (email.trim().toLowerCase() !== authorizedEmail.toLowerCase()) {
      toast.error("Email não autorizado para criar franqueadora");
      return;
    }

    setCreatingFranqueadora(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-admin', {
        body: { email: email.trim(), password },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data?.message || "Franqueadora criada com sucesso!");
      
      setTimeout(async () => {
        try {
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (loginError) throw loginError;
          toast.success("Login realizado com sucesso!");
        } catch (loginError: any) {
          console.error("Error logging in:", loginError);
          toast.error("Franqueadora criada! Agora clique em 'Entrar' para fazer login.");
          setCreatingFranqueadora(false);
        }
      }, 1000);
    } catch (error: any) {
      console.error("Error creating franqueadora:", error);
      toast.error(error.message || "Erro ao criar franqueadora");
      setCreatingFranqueadora(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card className="p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Área do Administrador
            </h2>
            <p className="text-muted-foreground text-center">
              Entre com suas credenciais
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || checkingAdmin}
            >
              {loading || checkingAdmin ? "Verificando..." : "Entrar"}
            </Button>

            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-2">
                Primeiro acesso como franqueadora?
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleCreateFranqueadora}
                disabled={
                  loading || 
                  creatingFranqueadora || 
                  checkingAdmin || 
                  email.trim().toLowerCase() !== 'bortoluzzosk8@gmail.com'
                }
              >
                {creatingFranqueadora ? "Criando acesso..." : "Criar acesso de franqueadora"}
              </Button>
              {email.trim() && email.trim().toLowerCase() !== 'bortoluzzosk8@gmail.com' && (
                <p className="text-xs text-destructive text-center mt-2">
                  Apenas o email autorizado pode criar acesso de franqueadora
                </p>
              )}
            </div>
          </form>
        </Card>
      </div>

      {/* Dialog de Sessão Ativa */}
      <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Sessão ativa detectada
            </DialogTitle>
            <DialogDescription>
              Já existe uma sessão ativa para esta conta
              {sessionDeviceInfo ? ` (${sessionDeviceInfo})` : ''}.
              Deseja continuar e desconectar o outro dispositivo?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSessionDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmForceLogin}
              disabled={loading}
            >
              {loading ? "Conectando..." : "Sim, desconectar e entrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLogin;
