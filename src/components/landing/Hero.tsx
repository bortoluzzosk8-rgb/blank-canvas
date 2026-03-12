import { useNavigate } from 'react-router-dom';
import { Check, MessageCircle, ArrowRight, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

const benefits = [
  'Controle de itens e disponibilidade',
  'Agenda de locações e entregas',
  'Contratos e comprovantes em 1 clique',
  'Financeiro: entradas, pendências e lucro',
];

interface HeroProps {
  whatsappNumber?: string;
}

export function Hero({ whatsappNumber = '5511999999999' }: HeroProps) {
  const navigate = useNavigate();

  const handleWhatsApp = () => {
    const message = encodeURIComponent('Olá! Gostaria de saber mais sobre o sistema.');
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <section id="hero" className="pt-20 md:pt-28 pb-12 md:pb-20 bg-background pattern-dots relative overflow-hidden">
      {/* Gradient orbs - maiores e mais visíveis */}
      <div className="absolute top-10 left-0 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-secondary/15 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-primary/5 to-secondary/5 rounded-full blur-3xl" />
      
      {/* Círculos decorativos flutuantes */}
      <div className="absolute top-32 right-20 w-4 h-4 bg-primary/30 rounded-full animate-bounce hidden md:block" style={{ animationDelay: '0s', animationDuration: '3s' }} />
      <div className="absolute top-48 left-16 w-3 h-3 bg-secondary/40 rounded-full animate-bounce hidden md:block" style={{ animationDelay: '1s', animationDuration: '4s' }} />
      <div className="absolute bottom-40 right-32 w-5 h-5 bg-primary/20 rounded-full animate-bounce hidden md:block" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Title */}
          <h1 className="font-inter text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight animate-fade-in">
            <span className="text-foreground">Gestão completa para sua empresa de locação —</span>
            <span className="text-gradient-brand"> sem planilhas e sem bagunça.</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto font-light">
            Controle itens, agenda, contratos e pagamentos em um só lugar.
            Simples de usar, rápido de implantar.
          </p>

          {/* Benefits List - Grid compacto no mobile */}
          <ul className="mt-8 grid grid-cols-2 md:flex md:flex-wrap md:justify-center gap-3 md:gap-4">
            {benefits.map((benefit, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-xs sm:text-sm text-foreground bg-gradient-to-br from-background to-muted/50 border border-secondary/20 px-3 py-3 rounded-xl shadow-sm hover:shadow-md hover:border-secondary/40 transition-all duration-300"
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-white" />
                </div>
                <span className="font-medium leading-snug text-left">{benefit}</span>
              </li>
            ))}
          </ul>

          {/* Reinforcement - Destaque visual */}
          <div className="mt-8 inline-flex items-center gap-3 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 px-6 py-4 rounded-2xl border border-primary/10">
            <Quote className="w-5 h-5 text-primary/60 flex-shrink-0 rotate-180" />
            <p className="text-base md:text-lg font-semibold text-foreground font-inter">
              Você tem a operação. Nós organizamos o controle.
            </p>
            <Quote className="w-5 h-5 text-secondary/60 flex-shrink-0" />
          </div>

          {/* CTAs - Botões com gradiente */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white px-8 py-6 text-lg font-semibold hover-lift-strong group shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              onClick={() => navigate('/cadastro')}
            >
              Criar conta e testar grátis
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto px-8 py-6 text-lg border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground transition-all"
              onClick={() => navigate('/login')}
            >
              Entrar no sistema
            </Button>
          </div>

          {/* WhatsApp Link - Cor verde característica */}
          <button
            onClick={handleWhatsApp}
            className="mt-5 inline-flex items-center gap-2 text-green-600 hover:text-green-700 transition-colors font-medium group"
          >
            <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
            Falar com suporte no WhatsApp
          </button>

          {/* Hero Image/Mockup */}
          <div className="mt-10 md:mt-14 relative">
            <div className="bg-gradient-to-br from-primary/5 via-secondary/5 to-primary/5 rounded-3xl p-4 md:p-8 glow-secondary">
              <div className="bg-card rounded-2xl shadow-2xl border border-border/50 overflow-hidden">
                <div className="bg-muted/30 px-4 py-3 border-b border-border/50 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary/80"></div>
                  <div className="w-3 h-3 rounded-full bg-secondary/80"></div>
                  <div className="w-3 h-3 rounded-full bg-muted-foreground/40"></div>
                  <span className="ml-4 text-xs text-muted-foreground font-medium">PlayGestor - Sistema de Gestão</span>
                </div>
                <div className="p-4 md:p-6 space-y-4">
                  <div className="flex gap-4 items-center">
                    <div className="h-4 bg-gradient-to-r from-primary/20 to-transparent rounded w-1/2"></div>
                    <div className="h-8 w-24 bg-primary/10 rounded-lg"></div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 md:gap-4 mt-4">
                    <div className="h-20 md:h-24 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-xl md:text-2xl font-bold text-primary">42</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Itens</div>
                      </div>
                    </div>
                    <div className="h-20 md:h-24 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-xl md:text-2xl font-bold text-secondary">18</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Reservas</div>
                      </div>
                    </div>
                    <div className="h-20 md:h-24 bg-gradient-to-br from-muted to-muted/50 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg md:text-2xl font-bold text-foreground">R$ 8.5k</div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">Faturado</div>
                      </div>
                    </div>
                  </div>
                  <div className="h-24 md:h-32 bg-gradient-to-r from-muted/80 via-muted/40 to-muted/80 rounded-xl mt-4 flex items-end p-3 md:p-4 gap-1 md:gap-2">
                    {[40, 65, 45, 80, 60, 90, 70].map((height, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t bg-gradient-to-t from-primary to-secondary transition-all duration-500 hover:opacity-80"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
