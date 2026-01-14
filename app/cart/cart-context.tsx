"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearCart } from "@/app/cart/actions";

export type CartLineItem = {
  quantity: number;
  productVariant: {
    id: string;
    price: number;  // تغيير من string إلى number مباشرة
    images: string[];
    product: {
      id: string;
      name: string;
      slug: string;
      images: string[];
    };
  };
};

export type Cart = {
  id: string;
  lineItems: CartLineItem[];
};

type CartContextValue = {
  cart: Cart | null;
  items: CartLineItem[];
  itemCount: number;
  subtotal: number;
  isOpen: boolean;
  cartId: string | null;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: CartLineItem) => void;
  removeItem: (variantId: string) => void;
  increaseQuantity: (variantId: string) => void;
  decreaseQuantity: (variantId: string) => void;
  setCart: (cart: Cart | null) => void;
  emptyCart: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

type CartProviderProps = {
  children: ReactNode;
  initialCart: Cart | null;
  initialCartId: string | null;
};

export function CartProvider({ children, initialCart, initialCartId }: CartProviderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [cart, setCartState] = useState<Cart | null>(initialCart);
  const [cartId, setCartId] = useState<string | null>(initialCartId);

  useEffect(() => {
    setCartState(initialCart);
    setCartId(initialCartId);
  }, [initialCart, initialCartId]);

  const items = useMemo(() => cart?.lineItems ?? [], [cart]);
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  
  // حساب الإجمالي الفرعي مباشرة بدون تقسيم
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const price = item.productVariant.price || 0;
      return sum + (price * item.quantity);
    }, 0);
  }, [items]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((item: CartLineItem) => {
    console.log("Adding item to cart:", item);
    
    setCartState((prevCart) => {
      if (!prevCart) {
        return {
          id: "optimistic",
          lineItems: [item],
        };
      }

      const existingItem = prevCart.lineItems.find(
        (i) => i.productVariant.id === item.productVariant.id
      );

      if (existingItem) {
        return {
          ...prevCart,
          lineItems: prevCart.lineItems.map((i) =>
            i.productVariant.id === item.productVariant.id
              ? { ...i, quantity: i.quantity + item.quantity }
              : i
          ),
        };
      }

      return {
        ...prevCart,
        lineItems: [...prevCart.lineItems, item],
      };
    });
  }, []);

  const removeItem = useCallback((variantId: string) => {
    setCartState((prevCart) => {
      if (!prevCart) return prevCart;
      return {
        ...prevCart,
        lineItems: prevCart.lineItems.filter((item) => item.productVariant.id !== variantId),
      };
    });
  }, []);

  const increaseQuantity = useCallback((variantId: string) => {
    setCartState((prevCart) => {
      if (!prevCart) return prevCart;
      return {
        ...prevCart,
        lineItems: prevCart.lineItems.map((item) =>
          item.productVariant.id === variantId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      };
    });
  }, []);

  const decreaseQuantity = useCallback((variantId: string) => {
    setCartState((prevCart) => {
      if (!prevCart) return prevCart;
      return {
        ...prevCart,
        lineItems: prevCart.lineItems
          .map((item) => {
            if (item.productVariant.id === variantId) {
              if (item.quantity - 1 <= 0) {
                return null;
              }
              return { ...item, quantity: item.quantity - 1 };
            }
            return item;
          })
          .filter((item): item is CartLineItem => item !== null),
      };
    });
  }, []);

  const setCart = useCallback((newCart: Cart | null) => {
    setCartState(newCart);
    if (newCart?.id && newCart.id !== "optimistic") {
      setCartId(newCart.id);
    } else if (!newCart) {
      setCartId(null);
    }
  }, []);

// Update the emptyCart function to ensure proper refresh
const emptyCart = useCallback(async () => {
  console.log("🛒 [Cart Context] Emptying cart...");
  
  const result = await clearCart();
  console.log("🛒 [Cart Context] Clear cart result:", result);
  
  if (result.success) {
    setCartState(null);
    setCartId(null);
    // Force a complete refresh
    router.refresh();
    // Also refresh cart context
    setTimeout(() => {
      router.refresh();
    }, 100);
    console.log("🛒 [Cart Context] Cart emptied successfully");
  }
}, [router]);

  const value = useMemo(
    () => ({
      cart,
      items,
      itemCount,
      subtotal,
      isOpen,
      cartId,
      openCart,
      closeCart,
      addItem,
      removeItem,
      increaseQuantity,
      decreaseQuantity,
      setCart,
      emptyCart,
    }),
    [
      cart,
      items,
      itemCount,
      subtotal,
      isOpen,
      cartId,
      openCart,
      closeCart,
      addItem,
      removeItem,
      increaseQuantity,
      decreaseQuantity,
      setCart,
      emptyCart,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}