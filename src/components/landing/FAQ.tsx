import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    question: 'Posso usar no celular?',
    answer: 'Sim! O sistema funciona perfeitamente no celular, tablet e computador. Acesse de qualquer dispositivo com internet.',
  },
  {
    question: 'Precisa instalar?',
    answer: 'Não precisa instalar nada. O sistema é 100% online e funciona direto no navegador. Basta criar sua conta e começar a usar.',
  },
  {
    question: 'Consigo controlar pagamentos pendentes?',
    answer: 'Com certeza! O sistema mostra todos os pagamentos pendentes, permite registrar entradas e saídas, e gera relatórios financeiros completos.',
  },
  {
    question: 'Dá pra usar com equipe?',
    answer: 'Sim! No plano Multiusuário você pode adicionar membros da equipe com diferentes níveis de permissão. Cada um acessa o que precisa.',
  },
  {
    question: 'Em quanto tempo eu começo a usar?',
    answer: 'Em menos de 5 minutos você já está com sua conta criada e pronto para cadastrar seus primeiros itens. O sistema é intuitivo e fácil de usar.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-16 md:py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="font-inter text-2xl md:text-3xl lg:text-4xl font-bold text-center text-foreground mb-4">
          Dúvidas <span className="text-gradient-brand">frequentes</span>
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
          Tire suas dúvidas sobre o sistema
        </p>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`}
                className="bg-card rounded-2xl border border-border/50 px-6 data-[state=open]:shadow-lg transition-all"
              >
                <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline py-6 font-inter">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
