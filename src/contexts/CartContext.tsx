import React, { createContext, useContext, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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
};

type CartItem = { product: Product; quantity: number };

type CartContextType = {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotal: () => number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const trackCartCreation = async () => {
    const phone = localStorage.getItem('client_phone');
    if (!phone) return;

    try {
      // Verificar se já marcou cart_created
      const { data: client } = await supabase
        .from('clients')
        .select('cart_created')
        .eq('phone', phone)
        .maybeSingle();

      // Se ainda não marcou, atualizar
      if (client && !client.cart_created) {
        await supabase
          .from('clients')
          .update({ cart_created: true })
          .eq('phone', phone);
      }
    } catch (error) {
      console.error('Erro ao rastrear criação de carrinho:', error);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      const stock = product.stock_qty ?? 0;
      if (stock > 0 && existing && existing.quantity >= stock) {
        return prev;
      }
      
      // Verificar se é o primeiro item
      const isFirstItem = prev.length === 0;
      
      let newCart;
      if (existing) {
        newCart = prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        newCart = [...prev, { product, quantity: 1 }];
      }
      
      // Rastrear se adicionou o primeiro item
      if (isFirstItem && newCart.length > 0) {
        trackCartCreation();
      }
      
      return newCart;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = () => cart.reduce(
    (sum, item) => sum + item.product.sale_price * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, clearCart, cartTotal }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};
