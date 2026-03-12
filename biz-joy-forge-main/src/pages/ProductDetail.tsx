import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Plus, ChevronLeft, ChevronRight, Minus } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/hooks/useSettings";
import { FloatingCart } from "@/components/catalog/FloatingCart";

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

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { cart, addToCart } = useCart();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    if (!productId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setProduct(data);
        
        if (data.category_id) {
          const { data: catData } = await supabase
            .from("categories")
            .select("*")
            .eq("id", data.category_id)
            .single();
          setCategory(catData);
        }
      }
    } catch (error: any) {
      console.error("Erro ao carregar produto:", error);
      toast.error("Produto não encontrado");
      navigate('/catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    const existing = cart.find((i) => i.product.id === product.id);
    const stock = product.stock_qty ?? 0;
    if (stock > 0 && existing && existing.quantity >= stock) {
      toast.error("Quantidade máxima em estoque atingida");
      return;
    }
    addToCart(product);
  };

  const getGradientStyle = () => ({
    background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)`
  });

  const images = product?.image_url || [];
  const hasImages = images.length > 0;
  const hasMultipleImages = images.length > 1;
  const inStock = product ? product.stock_qty > 0 : false;
  const cartItem = cart.find((i) => i.product.id === product?.id);
  const currentQuantity = cartItem?.quantity || 0;

  const nextImage = () => {
    if (hasMultipleImages) {
      setSelectedImageIndex((prev) => (prev + 1) % images.length);
    }
  };

  const prevImage = () => {
    if (hasMultipleImages) {
      setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold mb-2">Produto não encontrado</h2>
          <Button onClick={() => navigate('/catalog')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Catálogo
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/catalog')}
          className="mb-6 hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Catálogo
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <Card className="overflow-hidden relative aspect-square">
              {hasImages ? (
                <>
                  <img 
                    src={images[selectedImageIndex]} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                  {hasMultipleImages && (
                    <>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full shadow-lg bg-white/90 hover:bg-white"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full shadow-lg bg-white/90 hover:bg-white"
                        onClick={nextImage}
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        {selectedImageIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className={`w-full h-full ${category?.color || 'gradient-primary'} flex items-center justify-center`}>
                  <span className="text-9xl">{category?.icon || '🎪'}</span>
                </div>
              )}
            </Card>

            {/* Thumbnails */}
            {hasMultipleImages && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageIndex === index 
                        ? 'border-primary ring-2 ring-primary/50' 
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <img 
                      src={img} 
                      alt={`${product.name} - Foto ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category Badge */}
            {category && (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </Badge>
            )}

            {/* Product Name */}
            <h1 className="text-3xl md:text-4xl font-black text-foreground">
              {product.name}
            </h1>


            {/* Price */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Valor da Locação</p>
              <p className="text-4xl font-black text-primary">
                {formatCurrency(product.sale_price)}
              </p>
            </div>

            {/* Add to Cart */}
            <div className="space-y-3">
              {currentQuantity > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShoppingCart className="w-4 h-4" />
                  <span>{currentQuantity}x no carrinho</span>
                </div>
              )}
              
              <Button
                onClick={handleAddToCart}
                size="lg"
                style={inStock ? getGradientStyle() : undefined}
                className={`
                  w-full font-bold text-lg py-6 rounded-xl transition-all duration-300 hover:scale-[1.02] shadow-lg
                  ${inStock 
                    ? 'border-0 text-white' 
                    : 'gradient-warning border-0 text-white'
                  }
                `}
              >
                <Plus className="w-5 h-5 mr-2" />
                {inStock ? "Adicionar ao Carrinho" : "Encomendar"}
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/checkout')}
                className="w-full font-bold text-lg py-6 rounded-xl"
                disabled={cart.length === 0}
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Ir para o Carrinho ({cart.length})
              </Button>
            </div>

            {/* Description */}
            {product.description && (
              <Card className="p-6 bg-muted/30">
                <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                  📝 Descrição
                </h3>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {product.description}
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      <FloatingCart />
    </div>
  );
};

export default ProductDetail;
