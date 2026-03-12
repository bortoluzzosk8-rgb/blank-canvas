import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, Shield } from "lucide-react";
import logoEngbrink from "@/assets/logo-engbrink.jpg";
import { useSettings } from "@/hooks/useSettings";

const LoginSelection = () => {
  const navigate = useNavigate();
  const { settings, loading } = useSettings();

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-background via-background to-secondary/5">
      {/* Elementos decorativos com cores da marca */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/8 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
      <div className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />

      {/* Botão Admin */}
      <div className="absolute top-6 right-6 z-50 animate-fade-in">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin-login")}
          className="gap-2 glass-card hover:bg-secondary/10 border-border/30 text-foreground/80 hover:text-foreground transition-all duration-300"
        >
          <Shield className="w-4 h-4" />
          Admin
        </Button>
      </div>

      {/* Conteúdo Principal */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {/* Logo com card elegante */}
        <div className="mb-10 md:mb-14 animate-fade-in">
          <div className="glass-card rounded-2xl p-6 shadow-xl shadow-primary/10">
            {loading ? (
              <div className="w-28 h-28 md:w-40 md:h-40 bg-muted/50 rounded-xl animate-pulse" />
            ) : (
              <img 
                src={settings.logoUrl || logoEngbrink} 
                alt="Logo" 
                className="w-28 h-28 md:w-40 md:h-40 object-contain"
              />
            )}
          </div>
        </div>

          {/* Hero Section */}
        <div className="text-center space-y-6 max-w-3xl animate-scale-in">
          {/* Título */}
          <div className="space-y-2 mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground" translate="no">
              Bem-vindo ao <span className="text-primary">Sistema</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Gerencie suas locações de forma simples e eficiente
            </p>
          </div>

          {/* Botão Principal CTA */}
          <div>
            <Button 
              size="lg"
              onClick={() => navigate("/admin/dashboard")}
              className="text-xl md:text-2xl px-12 py-8 h-auto rounded-2xl gradient-coral shadow-2xl shadow-primary/30 hover:shadow-primary/40 hover:scale-105 transition-all duration-300 group border-0"
            >
              <User className="w-6 h-6 md:w-7 md:h-7 mr-3 group-hover:scale-110 transition-transform" />
              Acessar Sistema
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSelection;
