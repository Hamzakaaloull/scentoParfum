"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/app/cart/cart-context";
import { CartItem } from "@/app/cart/cart-item";
import { CheckoutDialog } from "@/app/cart/checkout-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatPrice } from "@/lib/money";

export function CartSidebar() {
  const { isOpen, closeCart, items, itemCount, subtotal } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  // Calculate delivery fee - بسيطة بدون تقسيم
  const calculateDeliveryFee = () => {
    if (items.length === 0) return 0;
    
    // إذا كان الإجمالي أكثر من 500 درهم أو في الرباط/سلا
    if (subtotal >= 500) {
      return 0;
    }
    return 25; // 25 درهم
  };

  const deliveryFee = calculateDeliveryFee();
  const total = subtotal + deliveryFee;

  const handleCheckout = () => {
    setCheckoutOpen(true);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
        <SheetContent className="flex flex-col w-full sm:max-w-lg">
          <SheetHeader className="border-b border-border pb-4">
            <SheetTitle className="flex items-center gap-2">
              Your Cart
              {itemCount > 0 && (
                <span className="text-sm font-normal text-muted-foreground">({itemCount} items)</span>
              )}
            </SheetTitle>
          </SheetHeader>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
                <ShoppingBag className="h-10 w-10 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">Your cart is empty</p>
                <p className="text-sm text-muted-foreground mt-1">Add some products to get started</p>
              </div>
              <Button variant="outline" onClick={closeCart}>
                Continue Shopping
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 px-4">
                <div className="divide-y divide-border">
                  {items.map((item) => (
                    <CartItem key={item.productVariant.id} item={item} />
                  ))}
                </div>
              </ScrollArea>

              <SheetFooter className="border-t border-border pt-4 mt-auto">
                <div className="w-full space-y-4">
                  {/* Subtotal */}
                  <div className="flex items-center justify-between text-base">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-semibold">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  {/* Delivery Fee */}
                  <div className="flex items-center justify-between text-base">
                    <span className="font-medium">Delivery</span>
                    <span className="font-semibold">
                      {deliveryFee > 0 ? formatPrice(deliveryFee) : "FREE"}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="flex items-center justify-between text-lg border-t pt-2">
                    <span className="font-bold">Total</span>
                    <span className="font-bold">
                      {formatPrice(total)}
                    </span>
                  </div>

                  {/* Delivery Info */}
                  {deliveryFee === 0 && (
                    <p className="text-xs text-green-600">
                      🎉 Free delivery! Orders over 500 MAD or in Rabat/Sale area
                    </p>
                  )}
                  {deliveryFee > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Add {(500 - subtotal).toFixed(2)} MAD more for free delivery
                    </p>
                  )}

                  <Button 
                    onClick={handleCheckout} 
                    className="w-full h-12 text-base font-medium"
                  >
                    Complete Order
                  </Button>
                  <button
                    type="button"
                    onClick={closeCart}
                    className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Continue Shopping
                  </button>
                </div>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Checkout Dialog */}
      <CheckoutDialog 
        open={checkoutOpen} 
        onOpenChange={setCheckoutOpen}
        items={items}
        subtotal={subtotal}
        deliveryFee={deliveryFee}
        total={total}
        closeCart={closeCart}
      />
    </>
  );
}