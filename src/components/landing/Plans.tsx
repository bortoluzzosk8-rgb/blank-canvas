import { useNavigate } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  'Gestão completa de locações',
  'Controle de estoque',
  'Gestão financeira completa',
  'Logística integrada',
  'Relatórios avançados',
  'Cadastro de clientes',
  'Contratos personalizados',
  'Usuários ilimitados',
  'Unidades ilimitadas',
  'Suporte prioritário',
];

export function Plans() {
  const navigate = useNavigate();

  return (
    <section id="plans" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="font-inter text-2xl md:text-3xl lg:text-4xl font-bold text-center text-foreground mb-4">
          <span className="text-gradient-brand">Plano de Lançamento</span>
        </h2>
        <p className="text-center text-muted-foreground mb-4 max-w-2xl mx-auto">
          Aproveite nossa oferta especial com acesso total a todas as funcionalidades.
        </p>
        <p className="text-center text-lg font-semibold text-secondary mb-12 flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5" />
          Teste grátis por 10 dias. Sem complicação.
        </p>

        <div className="max-w-lg mx-auto">
          <Card className="relative rounded-3xl border-secondary shadow-2xl glow-secondary">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold rounded-full shadow-lg flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              Oferta de Lançamento
            </div>
            <CardHeader className="text-center pb-4 pt-10">
              <CardTitle className="text-2xl font-inter">Acesso Total</CardTitle>
              <CardDescription className="text-muted-foreground">Todas as funcionalidades por 6 meses</CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-6">
              <div className="mb-6">
                <span className="text-5xl font-bold text-foreground font-inter">R$ 59</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-3 text-left">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-secondary" />
                    </div>
                    <span className="text-muted-foreground text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="pb-8">
              <Button
                className="w-full py-6 text-base font-semibold rounded-xl bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white transition-all"
                onClick={() => navigate('/cadastro')}
              >
                Criar conta grátis
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}
