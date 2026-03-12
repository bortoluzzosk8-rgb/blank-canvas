import { PartyPopper, Sofa, Wrench, Monitor, Dumbbell, HardHat } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const segments: { icon: LucideIcon; label: string }[] = [
  { icon: PartyPopper, label: 'Festas e eventos' },
  { icon: Sofa, label: 'Móveis e utilidades' },
  { icon: Wrench, label: 'Equipamentos e ferramentas' },
  { icon: Monitor, label: 'Tecnologia e audiovisual' },
  { icon: Dumbbell, label: 'Esporte e lazer' },
  { icon: HardHat, label: 'Construção e manutenção' },
];

export function Segments() {
  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="font-inter text-2xl md:text-3xl lg:text-4xl font-bold text-center text-foreground mb-12">
          Funciona para empresas de locação de{' '}
          <span className="text-gradient-brand">diversos segmentos</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {segments.map((segment, index) => {
            const IconComponent = segment.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-center text-center p-6 bg-card rounded-2xl border border-border/50 hover:border-secondary/50 hover:shadow-xl hover-lift-strong transition-all duration-300 group"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4 group-hover:from-primary/20 group-hover:to-secondary/20 transition-colors">
                  <IconComponent className="w-8 h-8 text-secondary" />
                </div>
                <span className="text-sm font-semibold text-foreground">{segment.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
