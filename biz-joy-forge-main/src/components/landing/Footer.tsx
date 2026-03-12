import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import logoPlayGestor from '@/assets/logo-playgestor-novo.png';

interface FooterProps {
  whatsappNumber?: string;
}

export function Footer({ whatsappNumber = '5511999999999' }: FooterProps) {
  const handleWhatsApp = () => {
    const message = encodeURIComponent('Olá! Gostaria de saber mais sobre o sistema.');
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank');
  };

  return (
    <footer id="contact" className="dark-section text-white py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <img src={logoPlayGestor} alt="PlayGestor" className="h-12 rounded" />
            </div>
            <p className="text-white/70 max-w-md">
              Sistema de gestão completo para empresas de locação.
              Organize sua operação, controle seu financeiro e escale seu negócio.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4 text-lg font-inter">Links úteis</h3>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="text-white/70 hover:text-secondary transition-colors">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#plans" className="text-white/70 hover:text-secondary transition-colors">
                  Planos
                </a>
              </li>
              <li>
                <a href="#faq" className="text-white/70 hover:text-secondary transition-colors">
                  Dúvidas
                </a>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="font-semibold mb-4 text-lg font-inter">Conta</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/login" className="text-white/70 hover:text-secondary transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/cadastro" className="text-white/70 hover:text-secondary transition-colors">
                  Criar conta
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/50 text-sm">
            © {new Date().getFullYear()} PlayGestor. Todos os direitos reservados.
          </p>
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-2 text-white/70 hover:text-secondary transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Fale conosco no WhatsApp
          </button>
        </div>
      </div>

      {/* Floating WhatsApp Button */}
      <button
        onClick={handleWhatsApp}
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-50"
        aria-label="WhatsApp"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </button>
    </footer>
  );
}
