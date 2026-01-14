"use client";

import { useState, FormEvent } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { getClientFirestore } from "@/lib/fireclient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, MapPin, Truck, Phone, User, Home, Package, FileText } from "lucide-react";
import { formatPrice } from "@/lib/money";
import { useCart } from "@/app/cart/cart-context";
import type { CartLineItem } from "@/app/cart/cart-context";

type CheckoutDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CartLineItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  closeCart: () => void;
};

type OrderDetails = {
  orderId: string;
  trackingNumber: string;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes: string;
  createdAt: Date;
};

export function CheckoutDialog({
  open,
  onOpenChange,
  items,
  subtotal,
  deliveryFee,
  total,
  closeCart,
}: CheckoutDialogProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const { emptyCart } = useCart();

  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
  });

  const cities = [
    "Rabat",
    "Sale",
    "Casablanca",
    "Marrakech",
    "Fes",
    "Tangier",
    "Agadir",
    "Meknes",
    "Oujda",
    "Kenitra",
    "Tetouan",
    "Safi",
    "El Jadida",
    "Nador",
    "Mohammedia",
    "Other"
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCityChange = (value: string) => {
    setFormData(prev => ({ ...prev, city: value }));
  };

  const generateTrackingNumber = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let tracking = 'TRK-';
    for (let i = 0; i < 10; i++) {
      tracking += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return tracking;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate form
      if (!formData.customerName.trim()) {
        throw new Error("Please enter your name");
      }
      if (!formData.phone.trim()) {
        throw new Error("Please enter your phone number");
      }
      if (!formData.city.trim()) {
        throw new Error("Please select your city");
      }
      if (!formData.address.trim()) {
        throw new Error("Please enter your address");
      }

      // Check if delivery should be free (Rabat/Sale area)
      const isFreeDelivery = formData.city === "Rabat" || 
                            formData.city === "Sale" || 
                            subtotal >= 500;

      // Prepare order items
      const orderItems = items.map(item => {
        const price = item.productVariant.price || 0;
        return {
          productId: item.productVariant.product.id,
          name: item.productVariant.product.name,
          price: price,
          qty: item.quantity,
          subtotal: price * item.quantity,
        };
      });

      // Calculate totals
      const subtotalNum = subtotal;
      const deliveryFeeNum = isFreeDelivery ? 0 : 25;
      const totalNum = subtotalNum + deliveryFeeNum;

      // Prepare order data for Firebase
      const orderData = {
        customerName: formData.customerName.trim(),
        phone: formData.phone.trim(),
        city: formData.city,
        address: formData.address.trim(),
        notes: formData.notes.trim() || "",
        
        items: orderItems,
        subtotal: subtotalNum,
        deliveryFee: deliveryFeeNum,
        total: totalNum,
        
        status: "pending",
        trackingNumber: generateTrackingNumber(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Save to Firebase
      const db = getClientFirestore();
      const docRef = await addDoc(collection(db, "orders"), orderData);
      
      // Prepare order details for display
      const details: OrderDetails = {
        orderId: docRef.id,
        trackingNumber: orderData.trackingNumber,
        customerName: orderData.customerName,
        phone: orderData.phone,
        city: orderData.city,
        address: orderData.address,
        items: orderItems,
        subtotal: orderData.subtotal,
        deliveryFee: orderData.deliveryFee,
        total: orderData.total,
        notes: orderData.notes,
        createdAt: new Date(),
      };
      
      setOrderDetails(details);
      setSuccess(true);

      // Empty the cart (server + client)
      await emptyCart();

    } catch (err: any) {
      console.error("Error creating order:", err);
      setError(err.message || "Failed to create order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isFreeDelivery = formData.city === "Rabat" || 
                        formData.city === "Sale" || 
                        subtotal >= 500;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {success && orderDetails ? (
          <div className="py-8">
            <div className="flex justify-center mb-6">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl text-center">Order Confirmed!</DialogTitle>
            </DialogHeader>
            <div className="mt-6 space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground">
                  Thank you for your order! Your order has been received and is being processed.
                </p>
              </div>
              
              <div className="bg-secondary/50 p-4 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Order ID:</span>
                  <span className="font-bold text-foreground">{orderDetails.orderId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tracking Number:</span>
                  <span className="font-bold text-foreground">{orderDetails.trackingNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Amount:</span>
                  <span className="font-bold text-green-600">
                    {formatPrice(orderDetails.total)}
                  </span>
                </div>
              </div>

              {!showDetails ? (
                <Button
                  onClick={() => setShowDetails(true)}
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  View Order Details
                </Button>
              ) : (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-medium flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Order Details
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Customer Name</p>
                        <p className="font-medium">{orderDetails.customerName}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{orderDetails.phone}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">City</p>
                        <p className="font-medium">{orderDetails.city}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Delivery</p>
                        <p className="font-medium">
                          {orderDetails.deliveryFee === 0 ? "FREE" : formatPrice(orderDetails.deliveryFee)}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{orderDetails.address}</p>
                    </div>
                    
                    {orderDetails.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p className="font-medium">{orderDetails.notes}</p>
                      </div>
                    )}
                    
                    <div className="border-t pt-3">
                      <h4 className="font-medium mb-2">Order Items</h4>
                      <div className="space-y-2">
                        {orderDetails.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span>
                              {item.name} × {item.qty}
                            </span>
                            <span>
                              {formatPrice(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{formatPrice(orderDetails.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Delivery Fee</span>
                        <span>
                          {orderDetails.deliveryFee === 0 ? "FREE" : formatPrice(orderDetails.deliveryFee)}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t">
                        <span>Total</span>
                        <span className="text-green-600">
                          {formatPrice(orderDetails.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    onClick={() => setShowDetails(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Hide Details
                  </Button>
                </div>
              )}

              <div className="text-xs text-muted-foreground text-center">
                <p>We'll contact you within 24 hours to confirm your order.</p>
                <p className="mt-1">You can track your order using the tracking number above.</p>
              </div>

              <Button 
                onClick={() => {
                  onOpenChange(false);
                  closeCart();
                }}
                className="w-full"
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Complete Your Order</DialogTitle>
            </DialogHeader>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Delivery Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Delivery Information
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name *
                      </Label>
                      <Input
                        id="customerName"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        placeholder="Your full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number *
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="06XXXXXXXX"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      City *
                    </Label>
                    <Select value={formData.city} onValueChange={handleCityChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your city" />
                      </SelectTrigger>
                      <SelectContent>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                            {city === "Rabat" || city === "Sale" ? " (Free Delivery)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Complete Address *
                    </Label>
                    <Textarea
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Street, Building, Floor, Apartment..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Order Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Any special instructions..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Order Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className={isFreeDelivery ? "text-green-600 font-medium" : ""}>
                      {isFreeDelivery ? "FREE" : "25.00 MAD"}
                    </span>
                  </div>

                  {isFreeDelivery && (
                    <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                      🎉 Free delivery! {formData.city === "Rabat" || formData.city === "Sale" 
                        ? "Rabat/Sale area delivery is free" 
                        : "Order is over 500 MAD"}
                    </div>
                  )}
                  
                  <div className="border-t pt-3 mt-3">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span>
                        {formatPrice(total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Submit */}
              <div className="space-y-4">
                <div className="text-xs text-muted-foreground">
                  <p>By completing this order, you agree to our terms and conditions.</p>
                  <p className="mt-1">We'll contact you within 24 hours to confirm your order.</p>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={loading}
                  >
                    Back to Cart
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="min-w-32"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Confirm Order"
                    )}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}