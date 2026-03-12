import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Plus, Loader2, MessageCircle } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Category = { 
  id: string; 
  name: string; 
  icon: string; 
  color: string;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  cost_price: number;
  sale_price: number;
  image_url: string[] | null;
  category_id: string | null;
  stock_qty: number;
  lead_time_days: number | null;
  visible: boolean;
  display_order: number;
};

type Settings = {
  catalogHeaderTitle: string;
  catalogSubtitle: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  whatsappNumber: string;
};

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const PublicCatalog = () => {
  const { franchiseId } = useParams<{ franchiseId: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | "all">("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [franchiseName, setFranchiseName] = useState<string>("");
  const [settings, setSettings] = useState<Settings>({
    catalogHeaderTitle: "Título Principal",
    catalogSubtitle: "Confira nossos produtos!",
    logoUrl: "",
    primaryColor: "#6366f1",
    secondaryColor: "#8b5cf6",
    whatsappNumber: "",
  });

  useEffect(() => {
    if (franchiseId) {
      loadFranchise();
      loadCategories();
      loadProducts();
      loadSettings();
    }
  }, [franchiseId]);

  const loadFranchise = async () => {
    try {
      const { data, error } = await supabase
        .from("franchises")
        .select("name, city")
        .eq("id", franchiseId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setFranchiseName(`${data.name} - ${data.city}`);
      }
    } catch (error: any) {
      console.error("Erro ao carregar franquia:", error);
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .maybeSingle();
      
      if (error) throw error;
      if (data) {
        setSettings({
          catalogHeaderTitle: data.catalog_header_title || "Título Principal",
          catalogSubtitle: data.catalog_subtitle || "Confira nossos produtos!",
          logoUrl: data.logo_url || "",
          primaryColor: data.primary_color || "#6366f1",
          secondaryColor: data.secondary_color || "#8b5cf6",
          whatsappNumber: data.whatsapp_number || "",
        });
      }
    } catch (error: any) {
      console.error("Erro ao carregar configurações:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("franchise_id", franchiseId)
        .eq("visible", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar produtos:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = activeCategory === "all" ? products : products.filter((p) => p.category_id === activeCategory);
  const getCategoryInfo = (categoryId: string | null) => categories.find((c) => c.id === categoryId);
  const productCount = (catId: string) => products.filter((p) => p.category_id === catId).length;

  // Componente para renderizar imagem do produto com carousel se necessário
  const ProductImage = ({ product, categoryInfo }: { product: Product; categoryInfo: Category | undefined }) => {
    const images = product.image_url || [];
    const hasMultipleImages = images.length > 1;

    if (images.length === 0) {
      return (
        <div className={`aspect-[3/4] ${categoryInfo?.color || 'gradient-primary'} relative flex items-center justify-center overflow-hidden`}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg==')] opacity-50"></div>
          <span className="text-7xl relative z-10 animate-pulse">
            {categoryInfo?.icon || '🎪'}
          </span>
        </div>
      );
    }

    if (hasMultipleImages) {
      return (
        <div className="aspect-[3/4] relative">
          <Carousel className="w-full h-full">
            <CarouselContent>
              {images.map((imageUrl, index) => (
                <CarouselItem key={index}>
                  <div className={`aspect-[3/4] ${categoryInfo?.color || 'gradient-primary'} relative flex items-center justify-center overflow-hidden`}>
                    <img 
                      src={imageUrl} 
                      alt={`${product.name} - Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious 
              className="left-1 h-6 w-6 md:h-8 md:w-8" 
            />
            <CarouselNext 
              className="right-1 h-6 w-6 md:h-8 md:w-8" 
            />
          </Carousel>
        </div>
      );
    }

    return (
      <div className={`aspect-[3/4] ${categoryInfo?.color || 'gradient-primary'} relative flex items-center justify-center overflow-hidden`}>
        <img 
          src={images[0]} 
          alt={product.name}
          className="w-full h-full object-cover"
        />
      </div>
    );
  };

  const getGradientStyle = () => ({
    background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)`
  });

  if (!franchiseId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-2xl font-bold text-foreground mb-2">
            Catálogo não encontrado
          </h3>
          <p className="text-muted-foreground">
            O link do catálogo parece estar incorreto.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pattern-dots">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-7xl">
        {/* Premium Header */}
        <header 
          className="relative mb-4 sm:mb-8 overflow-hidden rounded-xl sm:rounded-2xl p-4 sm:p-8 shadow-xl sm:shadow-2xl animate-fade-in"
          style={{
            background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})`
          }}
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIuMDUiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-30"></div>
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              {settings.logoUrl && (
                <img 
                  src={settings.logoUrl} 
                  alt="Logo" 
                  className="h-10 sm:h-14 md:h-16 object-contain shrink-0"
                />
              )}
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl md:text-4xl font-black text-white drop-shadow-lg truncate">
                  {settings.catalogHeaderTitle}
                </h1>
                <p className="text-white/80 text-xs sm:text-sm font-medium truncate">
                  {franchiseName || settings.catalogSubtitle}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Dropdown de Categorias */}
        <Card className="p-3 sm:p-6 mb-4 sm:mb-8 shadow-lg border-2 animate-scale-in">
          <div className="flex items-center gap-2 sm:gap-4">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            <Select
              value={activeCategory}
              onValueChange={(value) => setActiveCategory(value)}
            >
              <SelectTrigger className="w-full md:w-[400px] text-sm sm:text-base font-semibold py-2 sm:py-6 rounded-lg sm:rounded-xl">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="all" className="text-sm sm:text-base py-2 sm:py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-xl">✨</span>
                    <span>Todas ({products.length})</span>
                  </div>
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem 
                    key={cat.id} 
                    value={cat.id}
                    className="text-sm sm:text-base py-2 sm:py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base sm:text-xl">{cat.icon}</span>
                      <span>{cat.name} ({productCount(cat.id)})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Product Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground text-lg">Carregando produtos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card className="p-12 text-center animate-fade-in">
            <div className="text-6xl mb-4">🎪</div>
            <h3 className="text-2xl font-bold text-foreground mb-2">
              {products.length === 0 ? "Nenhum produto disponível" : "Nenhum produto nesta categoria"}
            </h3>
            <p className="text-muted-foreground">
              {products.length === 0 
                ? "Este catálogo ainda não possui produtos cadastrados."
                : "Selecione outra categoria para ver nossos produtos incríveis!"}
            </p>
          </Card>
        ) : (
          <div className="grid gap-2 grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 mb-24">
            {filteredProducts.map((product, index) => {
              const categoryInfo = getCategoryInfo(product.category_id);
              const inStock = product.stock_qty > 0;
              
              return (
                <Card 
                  key={product.id} 
                  className="overflow-hidden hover-lift shadow-lg border-2 hover:border-primary/50 animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Product Image */}
                  <div className="relative">
                    <ProductImage product={product} categoryInfo={categoryInfo} />
                  </div>
                  
                  <div className="p-2 sm:p-3 flex flex-col flex-1">
                    <h3 className="text-xs sm:text-sm font-semibold text-foreground mb-1 line-clamp-2">
                      {product.name}
                    </h3>
                    {product.description && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 line-clamp-1">
                        {product.description}
                      </p>
                    )}
                    <div className="mt-auto space-y-1 sm:space-y-2">
                      <div className="flex items-baseline gap-1 sm:gap-2">
                        <p className="text-sm sm:text-xl font-black text-primary">
                          {formatCurrency(product.sale_price)}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          const message = `Olá! Tenho interesse no produto: ${product.name} - ${formatCurrency(product.sale_price)}`;
                          const whatsappUrl = `https://wa.me/55${settings.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
                          window.open(whatsappUrl, '_blank');
                        }}
                        style={inStock ? getGradientStyle() : undefined}
                        className={`
                          w-full font-bold text-xs sm:text-sm py-1.5 sm:py-3 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg
                          ${inStock 
                            ? 'border-0 text-white' 
                            : 'gradient-warning border-0 text-white'
                          }
                        `}
                        disabled={!settings.whatsappNumber}
                      >
                        <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
                        <span className="hidden sm:inline">{inStock ? "Quero esse!" : "Encomendar"}</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Botão flutuante do WhatsApp */}
        {settings.whatsappNumber && (
          <a
            href={`https://wa.me/55${settings.whatsappNumber.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 left-6 z-50 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110"
            aria-label="Falar no WhatsApp"
          >
            <MessageCircle className="w-7 h-7" />
          </a>
        )}
      </div>
    </div>
  );
};

export default PublicCatalog;
