import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('[AuthCallback] Processing auth callback...');

        // Check for errors or recovery type in URL hash
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        const hashError = hashParams.get('error');
        const errorCode = hashParams.get('error_code');
        const authType = hashParams.get('type');

        // If this is a password recovery callback, redirect to reset page
        if (authType === 'recovery') {
          console.log('[AuthCallback] Recovery detected, redirecting to reset-password');
          // Wait for Supabase to exchange the token for a session
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            sessionStorage.setItem('password_recovery', 'true');
            navigate('/reset-password', { replace: true });
            return;
          }
          // If no session yet, small delay and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            sessionStorage.setItem('password_recovery', 'true');
            navigate('/reset-password', { replace: true });
            return;
          }
          // Fallback: redirect anyway, ResetPassword will handle validation
          sessionStorage.setItem('password_recovery', 'true');
          navigate('/reset-password', { replace: true });
          return;
        }

        if (hashError || errorCode) {
          console.log('[AuthCallback] Error in hash:', hashError, errorCode);
          const message = errorCode === 'otp_expired'
            ? 'O link expirou. Faça login novamente ou solicite um novo link.'
            : 'Erro na verificação do email. Tente fazer login.';
          toast({ title: 'Atenção', description: message, variant: 'destructive' });
          navigate('/login', { replace: true });
          return;
        }

        // Supabase client auto-detects code/tokens in URL hash/params
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthCallback] Session error:', sessionError);
          setError(sessionError.message);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }

        if (!session) {
          console.log('[AuthCallback] No session found, redirecting to login');
          navigate('/login');
          return;
        }

        console.log('[AuthCallback] Session found, assigning role...');

        // Assign franqueadora role if needed
        try {
          await supabase.functions.invoke('assign-franqueadora-role', {
            body: {
              user_id: session.user.id,
              name: session.user.user_metadata?.name || '',
              email: session.user.email || '',
            }
          });
          console.log('[AuthCallback] Role assigned successfully');
        } catch (roleError) {
          console.error('[AuthCallback] Role assignment error (non-blocking):', roleError);
        }

        // Small delay to let role propagate
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('[AuthCallback] Redirecting to admin...');
        navigate('/admin/rentals', { replace: true });
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        setError('Erro inesperado. Redirecionando...');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">
          {error || 'Confirmando sua conta...'}
        </p>
      </div>
    </div>
  );
}
