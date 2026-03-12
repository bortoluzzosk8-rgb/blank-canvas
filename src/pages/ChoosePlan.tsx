import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, ArrowLeft, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

const features = [
  "Gestão completa de locações",
  "Controle de estoque",
  "Gestão financeira completa",
  "Logística integrada",
  "Relatórios avançados",
  "Cadastro de clientes",
  "Contratos personalizados",
  "Usuários ilimitados",
  "Unidades ilimitadas",
  "Suporte prioritário",
];

const ChoosePlan = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { subscriptionStatus } = useSubscriptionStatus(user?.id);

  const handleSelectPlan = () => {
    navigate('/assinatura');
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold">Escolher Plano</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {subscriptionStatus?.status === 'expired' && (
          <div className="mb-8 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <Clock className="h-5 w-5" />
              <span className="font-medium">Seu período de teste expirou</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Assine o plano abaixo para continuar usando o sistema.
            </p>
          </div>
        )}

        {subscriptionStatus?.status === 'trial' && subscriptionStatus.trialDaysLeft !== null && (
          <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-center">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
              <span className="font-medium">
                {subscriptionStatus.trialDaysLeft > 0
                  ? `Você tem ${subscriptionStatus.trialDaysLeft} dias restantes no período de teste`
                  : 'Seu período de teste expira hoje'}
              </span>
            </div>
          </div>
        )}

        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Plano de Lançamento</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Aproveite nossa oferta especial de lançamento com acesso total a todas as funcionalidades.
          </p>
        </div>

        <Card className="relative max-w-lg mx-auto border-2 border-primary shadow-lg">
          <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary gap-1">
            <Sparkles className="h-3 w-3" />
            Oferta de Lançamento
          </Badge>

          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Acesso Total</CardTitle>
            <CardDescription>Todas as funcionalidades por 6 meses</CardDescription>
          </CardHeader>

          <CardContent className="flex-1">
            <div className="text-center mb-6">
              <span className="text-5xl font-bold text-primary">R$ 59</span>
              <span className="text-muted-foreground">/mês</span>
            </div>

            <ul className="space-y-3">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
          </CardContent>

          <CardFooter>
            <Button className="w-full" onClick={handleSelectPlan}>
              Assinar Agora
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
};

export default ChoosePlan;
