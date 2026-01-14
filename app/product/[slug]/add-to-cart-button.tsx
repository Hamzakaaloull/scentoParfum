"use client";

import { useState, useTransition } from "react";
import { addToCart } from "@/app/cart/actions";
import { useCart } from "@/app/cart/cart-context";
import { ShoppingCart } from "lucide-react";

type Variant = {
  id: string;
  price: number;
  images: string[];
};

type AddToCartButtonProps = {
  variants: Variant[];
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[];
    price?: number;
    promoPrice?: number;
  };
};

export function AddToCartButton({ variants, product }: AddToCartButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { openCart, addItem } = useCart();

  // Always use the first variant for simple products
  const selectedVariant = variants[0];

  const handleAddToCart = () => {
    if (!selectedVariant) return;

    startTransition(async () => {
      // Add item to cart state with complete product info
      addItem({
        quantity: 1,
        productVariant: {
          id: selectedVariant.id,
          price: product.price || selectedVariant.price || 0,
          images: selectedVariant.images || product.images || [],
          product: {
            id: product.id,
            name: product.name,
            slug: product.slug,
            images: product.images,
          },
        },
      });

      // Open cart sidebar
      openCart();

      // Execute server action
      const result = await addToCart(selectedVariant.id, 1);
      
      if (!result.success) {
        console.error("Failed to add to cart:", result.error);
        // You might want to show an error message to the user here
      }
    });
  };

  const buttonText = isPending ? "Adding..." : "Add to Cart";

  return (
    <button
      onClick={handleAddToCart}
      disabled={isPending || !selectedVariant}
      className="w-full h-10 bg-foreground text-primary-foreground text-sm font-medium rounded-lg hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      <ShoppingCart className="h-4 w-4" />
      {buttonText}
    </button>
  );
}