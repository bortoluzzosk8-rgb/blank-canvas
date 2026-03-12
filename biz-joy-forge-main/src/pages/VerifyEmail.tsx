import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import logoPlayGestor from '@/assets/logo-playgestor-novo.png';

export default function VerifyEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const email = location.state?.email || searchParams.get('email') || '';
  const name = location.state?.name || '';
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Se o usuário já tem sessão, redirecionar direto
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/admin/rentals', { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);

    try {
      const response = await supabase.functions.invoke('send-email', {
        body: { 
          type: 'confirmation', 
          to: email, 
          name: name || '',
          data: { origin: window.location.origin }
        }
      });

      if (response.error || response.data?.error) {
        throw new Error(response.data?.error || 'Erro ao enviar email');
      }

      toast({
        title: "Email reenviado!",
        description: "Verifique sua caixa de entrada e spam.",
      });
      setCooldown(60);
    } catch (err) {
      console.error('Resend error:', err);
      toast({
        title: "Erro ao reenviar",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img src={logoPlayGestor} alt="PlayGestor" className="h-16" />
          </Link>
        </div>

        <Card className="shadow-xl border-border/50">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Verifique seu email</CardTitle>
            <CardDescription className="text-base">
              Enviamos um link de confirmação para o seu email.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="text-center space-y-6">
            {email && (
              <p className="font-medium text-lg text-foreground bg-muted px-4 py-2 rounded-lg">
                {email}
              </p>
            )}
            
            <p className="text-muted-foreground">
              Clique no link do email para confirmar sua conta e acessar o sistema. Verifique também a pasta de <strong>spam</strong>.
            </p>

            <Button
              variant="outline"
              className="w-full"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
            >
              {resending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : cooldown > 0 ? (
                `Reenviar em ${cooldown}s`
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reenviar email de confirmação
                </>
              )}
            </Button>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Link to="/login" state={{ email }} className="w-full">
              <Button variant="ghost" className="w-full">
                Já confirmei, fazer login
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
}
