import { Package, Calendar, FileText, DollarSign, UserCheck, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const solutions: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Package,
    title: 'Estoque e disponibilidade',
    description: 'Saiba exatamente o que está disponível, reservado ou em manutenção.',
  },
  {
    icon: Calendar,
    title: 'Agenda e reservas',
    description: 'Visualize todas as locações em um calendário simples e intuitivo.',
  },
  {
    icon: FileText,
    title: 'Contratos digitais',
    description: 'Gere contratos e comprovantes com um clique. Sem papel, sem bagunça.',
  },
  {
    icon: DollarSign,
    title: 'Financeiro e pendências',
    description: 'Controle entradas, saídas e pagamentos pendentes em tempo real.',
  },
  {
    icon: UserCheck,
    title: 'Cadastro de clientes',
    description: 'Histórico completo de cada cliente: locações, pagamentos e preferências.',
  },
  {
    icon: Settings,
    title: 'Manutenção e checagem',
    description: 'Registre o estado dos itens na entrada e saída de cada locação.',
  },
];

export function Solutions() {
  return (
    <section id="features" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="font-inter text-2xl md:text-3xl lg:text-4xl font-bold text-center text-foreground mb-4">
          Como o <span className="text-gradient-brand">sistema</span> resolve
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Todas as ferramentas que você precisa para organizar sua operação.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {solutions.map((solution, index) => {
            const IconComponent = solution.icon;
            return (
              <div
                key={index}
                className="p-6 glass-card-modern rounded-2xl hover:shadow-xl hover-lift-strong transition-all duration-300 group glow-secondary"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/10 flex items-center justify-center mb-4 group-hover:from-secondary/30 group-hover:to-primary/20 transition-colors">
                  <IconComponent className="w-7 h-7 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2 font-inter">{solution.title}</h3>
                <p className="text-muted-foreground">{solution.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
