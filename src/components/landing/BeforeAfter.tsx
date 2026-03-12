import { X, Check, ArrowRight } from 'lucide-react';

const beforeItems = [
  'Confusão nas reservas',
  'Retrabalho constante',
  'Erros frequentes',
  'Perda de dinheiro',
];

const afterItems = [
  'Visão clara do negócio',
  'Organização total',
  'Previsibilidade',
  'Escala sustentável',
];

export function BeforeAfter() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="font-inter text-2xl md:text-3xl lg:text-4xl font-bold text-center text-foreground mb-12">
          A <span className="text-gradient-brand">transformação</span> que você precisa
        </h2>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto relative">
          {/* Arrow between cards on desktop */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center shadow-lg">
              <ArrowRight className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Before */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 hover-lift-strong transition-all">
            <h3 className="text-2xl font-bold text-primary mb-6 flex items-center gap-3 font-inter">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <X className="w-5 h-5 text-primary" />
              </div>
              ANTES
            </h3>
            <ul className="space-y-4">
              {beforeItems.map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-foreground">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <X className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-lg">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* After */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 hover-lift-strong transition-all glow-secondary">
            <h3 className="text-2xl font-bold text-secondary mb-6 flex items-center gap-3 font-inter">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-secondary" />
              </div>
              DEPOIS
            </h3>
            <ul className="space-y-4">
              {afterItems.map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-foreground">
                  <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-secondary" />
                  </div>
                  <span className="text-lg">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
