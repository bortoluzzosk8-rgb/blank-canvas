import { CalendarX, Package, Wallet, Users, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const problems: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: CalendarX,
    title: 'Reservas conflitantes',
    description: 'Dois clientes agendados para o mesmo item no mesmo dia.',
  },
  {
    icon: Package,
    title: 'Item some / ninguém sabe onde está',
    description: 'Estoque desorganizado gera perda de tempo e prejuízo.',
  },
  {
    icon: Wallet,
    title: 'Pagamentos pendentes esquecidos',
    description: 'Dinheiro que deveria entrar fica perdido em anotações.',
  },
  {
    icon: Users,
    title: 'Falta de histórico do cliente',
    description: 'Sem registro do que já foi alugado e quando.',
  },
  {
    icon: MessageSquare,
    title: 'Agenda espalhada em WhatsApp e planilha',
    description: 'Informações duplicadas e desatualizadas.',
  },
];

export function Problems() {
  return (
    <section className="py-16 md:py-24 dark-section text-white">
      <div className="container mx-auto px-4">
        <h2 className="font-inter text-2xl md:text-3xl lg:text-4xl font-bold text-center mb-4">
          O caos do dia a dia <span className="text-primary">sem sistema</span>
        </h2>
        <p className="text-center text-white/70 mb-12 max-w-2xl mx-auto">
          Reconhece algum desses problemas? Você não está sozinho.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {problems.map((problem, index) => {
            const IconComponent = problem.icon;
            return (
              <div
                key={index}
                className="p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-primary/30 hover:border-primary/60 hover:bg-white/10 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4 group-hover:bg-primary/30 transition-colors">
                  <IconComponent className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{problem.title}</h3>
                <p className="text-white/60 text-sm">{problem.description}</p>
              </div>
            );
          })}
        </div>

        <p className="mt-12 text-center text-xl md:text-2xl font-semibold font-inter">
          "Sem um sistema, o <span className="text-primary">prejuízo cresce no silêncio.</span>"
        </p>
      </div>
    </section>
  );
}
