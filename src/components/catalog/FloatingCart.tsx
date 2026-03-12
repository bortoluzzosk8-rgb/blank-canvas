import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const FloatingCart = () => {
  const navigate = useNavigate();
  const { cart, removeFromCart, cartTotal } = useCart();
  const [cartExpanded, setCartExpanded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (cart.length === 0) return null;

  return (
    <>
      {/* Botão compacto circular - Visível apenas no mobile quando não expandido */}
      <button
        onClick={() => setIsExpanded(true)}
        className={`md:hidden fixed bottom-4 right-4 w-14 h-14 rounded-full bg-primary shadow-xl z-50 flex items-center justify-center animate-scale-in ${
          isExpanded ? 'hidden' : 'flex'
        }`}
      >
        <ShoppingCart className="w-6 h-6 text-primary-foreground" />
        <Badge className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground border-0 w-5 h-5 p-0 flex items-center justify-center text-xs font-bold animate-pulse">
          {cart.length}
        </Badge>
      </button>

      {/* Card completo - Sempre visível no desktop, só quando expandido no mobile */}
      <Card 
        className={`fixed bottom-4 right-4 md:bottom-6 md:right-6 w-64 md:w-80 shadow-2xl border-2 border-primary/30 overflow-hidden z-50 animate-scale-in ${
          isExpanded ? 'block' : 'hidden md:block'
        }`}
      >
        <div 
          className="bg-primary p-3 md:p-4 cursor-pointer transition-all duration-300 hover:opacity-90"
          onClick={() => {
            // No mobile, fecha o card. No desktop, expande/colapsa a lista
            if (window.innerWidth < 768) {
              setIsExpanded(false);
            } else {
              setCartExpanded(!cartExpanded);
            }
          }}
        >
          <div className="flex items-center justify-between text-primary-foreground">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                <Badge className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground border-0 w-4 h-4 md:w-5 md:h-5 p-0 flex items-center justify-center text-xs font-bold animate-pulse">
                  {cart.length}
                </Badge>
              </div>
              <div>
                <p className="font-bold text-base md:text-lg">Meu Carrinho</p>
                <p className="text-xs opacity-80">{cart.length} {cart.length === 1 ? 'item' : 'itens'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-lg md:text-2xl font-black">{formatCurrency(cartTotal())}</p>
              </div>
              {/* Botão X para fechar no mobile */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="md:hidden p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
        
        {cartExpanded && (
          <div className="p-4 bg-card max-h-64 overflow-y-auto animate-fade-in">
            <div className="space-y-3">
              {cart.map((item) => (
                <div 
                  key={item.product.id} 
                  className="flex items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity}x {formatCurrency(item.product.sale_price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-primary whitespace-nowrap">
                      {formatCurrency(item.product.sale_price * item.quantity)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromCart(item.product.id);
                        toast.success(`${item.product.name} removido`);
                      }}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="p-3 md:p-4 bg-card border-t">
          <Button 
            onClick={() => navigate("/checkout")} 
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm md:text-lg py-3 md:py-6 rounded-xl shadow-lg hover:scale-105 transition-all duration-300 border-0"
          >
            <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 mr-2" />
            Finalizar Compra
          </Button>
        </div>
      </Card>
    </>
  );
};
