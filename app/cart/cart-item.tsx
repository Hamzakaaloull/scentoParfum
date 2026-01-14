"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { removeFromCart, setCartQuantity } from "@/app/cart/actions";
import { type CartLineItem, useCart } from "@/app/cart/cart-context";
import { formatPrice } from "@/lib/money";

type CartItemProps = {
  item: CartLineItem;
};

export function CartItem({ item }: CartItemProps) {
  const router = useRouter();
  const { removeItem, increaseQuantity, decreaseQuantity, closeCart } = useCart();
  const [, startTransition] = useTransition();

  const { productVariant, quantity } = item;
  const { product } = productVariant;

  const image = productVariant.images[0] ?? product.images[0];
  
  // حساب الإجمالي للعنصر مباشرة
  const lineTotal = (productVariant.price || 0) * quantity;

  const handleRemove = () => {
    startTransition(async () => {
      removeItem(productVariant.id);
      await removeFromCart(productVariant.id);
      router.refresh();
    });
  };

  const handleIncrement = () => {
    startTransition(async () => {
      increaseQuantity(productVariant.id);
      await setCartQuantity(productVariant.id, quantity + 1);
      router.refresh();
    });
  };

  const handleDecrement = () => {
    if (quantity <= 1) {
      handleRemove();
      return;
    }
    startTransition(async () => {
      decreaseQuantity(productVariant.id);
      await setCartQuantity(productVariant.id, quantity - 1);
      router.refresh();
    });
  };

  return (
    <div className="flex gap-3 py-4">
      {/* Product Image */}
      <Link
        href={`/product/${product.slug}`}
        onClick={closeCart}
        className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-secondary"
      >
        {image ? (
          <Image 
            src={image} 
            alt={product.name} 
            fill 
            className="object-cover" 
            sizes="96px" 
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='24' text-anchor='middle' dy='.3em' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary">
            <span className="text-muted-foreground text-sm">No image</span>
          </div>
        )}
      </Link>

      {/* Product Details */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/product/${product.slug}`}
            onClick={closeCart}
            className="text-sm font-medium leading-tight text-foreground hover:underline line-clamp-2"
          >
            {product.name || "Product"}
          </Link>
          <button
            type="button"
            onClick={handleRemove}
            className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between">
          {/* Quantity Controls */}
          <div className="inline-flex items-center rounded-full border border-border">
            <button
              type="button"
              onClick={handleDecrement}
              className="flex h-7 w-7 items-center justify-center rounded-l-full hover:bg-secondary transition-colors"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="flex h-7 w-8 items-center justify-center text-sm tabular-nums">
              {quantity}
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              className="flex h-7 w-7 items-center justify-center rounded-r-full hover:bg-secondary transition-colors"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          {/* Price */}
          <span className="text-sm font-semibold">
            {formatPrice(lineTotal)}
          </span>
        </div>
      </div>
    </div>
  );
}