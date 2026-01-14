"use server";

import { cookies } from "next/headers";
import { commerce } from "@/lib/commerce";
import { getClientFirestore } from "@/lib/fireclient";
import { firestore as initAdminFirestore } from "@/lib/firebase";

export async function getCart() {
  const cookieStore = await cookies();
  const cartId = cookieStore.get("cartId")?.value;

  if (!cartId) {
    return null;
  }

  try {
    const cart = await commerce.cartGet({ cartId });
    
    // Enrich cart with full product data
    if (cart && cart.lineItems && cart.lineItems.length > 0) {
      const enrichedCart = await enrichCartWithProductData(cart);
      return enrichedCart;
    }
    
    return cart;
  } catch (error) {
    console.error("Error getting cart:", error);
    return null;
  }
}

// Helper function to get product by variant ID
async function getProductByVariantId(variantId: string) {
  try {
    // Extract productId from variantId
    let productId = variantId;
    if (variantId.includes('-v1')) {
      productId = variantId.replace('-v1', '');
    }

    console.log(`🎯 [Server] Fetching product for variant: ${variantId}, productId: ${productId}`);
    
    // Try to get product from commerce API
    const product = await commerce.productGet({ idOrSlug: productId });
    
    if (product) {
      console.log(`🎯 [Server] Found product: ${product.name}, Price: ${product.price}`);
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        images: product.images,
        slug: product.slug,
      };
    }
    
    // Fallback: Try direct Firebase fetch
    try {
      const adminDb = await initAdminFirestore();
      if (adminDb) {
        const doc = await adminDb.collection("products").doc(productId).get();
        if (doc.exists) {
          const data = doc.data();
          return {
            id: doc.id,
            name: data?.name || "Product",
            price: data?.price || 0,
            images: data?.images || [],
            slug: data?.slug || doc.id,
          };
        }
      }
    } catch (adminError) {
      console.log("Admin fetch failed, trying client SDK");
    }

    // Try client SDK
    try {
      const { doc, getDoc } = require("firebase/firestore");
      const clientDb = getClientFirestore();
      const productDoc = await getDoc(doc(clientDb, "products", productId));
      if (productDoc.exists()) {
        const data = productDoc.data();
        return {
          id: productDoc.id,
          name: data?.name || "Product",
          price: data?.price || 0,
          images: data?.images || [],
          slug: data?.slug || productDoc.id,
        };
      }
    } catch (clientError) {
      console.error("Client SDK fetch failed:", clientError);
    }

    console.error(`🎯 [Server] Product not found for variantId: ${variantId}`);
    return null;
  } catch (error) {
    console.error("Error fetching product by variant:", error);
    return null;
  }
}

// Helper function to enrich cart with product data
async function enrichCartWithProductData(cart: any) {
  if (!cart || !cart.lineItems) return cart;

  console.log(`🎯 [Server] Enriching cart with ${cart.lineItems.length} items`);
  
  const enrichedLineItems = await Promise.all(
    cart.lineItems.map(async (item: any) => {
      try {
        // Get product details for each variant
        const productData = await getProductByVariantId(item.productVariant?.id);
        
        if (productData) {
          console.log(`🎯 [Server] Enriched item: ${productData.name}, Price: ${productData.price}`);
          return {
            ...item,
            productVariant: {
              ...item.productVariant,
              price: productData.price || 0,
              images: productData.images || item.productVariant?.images || [],
              product: {
                id: item.productVariant?.product?.id || productData.id,
                name: productData.name || item.productVariant?.product?.name || "Product",
                slug: productData.slug || item.productVariant?.product?.slug || "product",
                images: productData.images || item.productVariant?.product?.images || [],
              },
            },
          };
        } else {
          console.warn(`🎯 [Server] Could not find product data for variant: ${item.productVariant?.id}`);
          return item;
        }
      } catch (error) {
        console.error("Error enriching cart item:", error);
        return item;
      }
    })
  );

  return {
    ...cart,
    lineItems: enrichedLineItems,
  };
}

export async function addToCart(variantId: string, quantity = 1) {
  const cookieStore = await cookies();
  const cartId = cookieStore.get("cartId")?.value;

  console.log(`🎯 [Server] Adding to cart: variantId=${variantId}, quantity=${quantity}, cartId=${cartId}`);

  try {
    const cart = await commerce.cartUpsert({
      cartId,
      variantId,
      quantity,
    });

    if (!cart) {
      console.error("🎯 [Server] Failed to update cart");
      return { success: false, cart: null, error: "Failed to update cart" };
    }

    cookieStore.set("cartId", cart.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    console.log(`🎯 [Server] Cart updated, new cartId: ${cart.id}`);

    // Fetch full cart data and enrich with product info
    const fullCart = await commerce.cartGet({ cartId: cart.id });
    const enrichedCart = await enrichCartWithProductData(fullCart);

    return { success: true, cart: enrichedCart };
  } catch (error) {
    console.error("🎯 [Server] Error adding to cart:", error);
    return { success: false, cart: null, error: String(error) };
  }
}

export async function removeFromCart(variantId: string) {
  const cookieStore = await cookies();
  const cartId = cookieStore.get("cartId")?.value;

  if (!cartId) {
    return { success: false, cart: null };
  }

  try {
    // Set quantity to 0 to remove the item
    await commerce.cartUpsert({
      cartId,
      variantId,
      quantity: 0,
    });

    // Fetch updated cart
    const cart = await commerce.cartGet({ cartId });
    
    // Enrich with product data
    const enrichedCart = await enrichCartWithProductData(cart);
    
    return { success: true, cart: enrichedCart };
  } catch (error) {
    console.error("Error removing from cart:", error);
    return { success: false, cart: null };
  }
}

// Set absolute quantity for a cart item
export async function setCartQuantity(variantId: string, quantity: number) {
  const cookieStore = await cookies();
  const cartId = cookieStore.get("cartId")?.value;

  if (!cartId) {
    return { success: false, cart: null };
  }

  try {
    // Get current cart to calculate delta
    const currentCart = await commerce.cartGet({ cartId });
    const currentItem = currentCart?.lineItems.find((item: any) => item.productVariant.id === variantId);
    const currentQuantity = currentItem?.quantity ?? 0;

    if (quantity <= 0) {
      // Remove item by setting quantity to 0
      await commerce.cartUpsert({ cartId, variantId, quantity: 0 });
    } else {
      // Calculate delta for cartUpsert
      const delta = quantity - currentQuantity;
      if (delta !== 0) {
        await commerce.cartUpsert({ cartId, variantId, quantity: delta });
      }
    }

    // Fetch updated cart
    const cart = await commerce.cartGet({ cartId });
    
    // Enrich with product data
    const enrichedCart = await enrichCartWithProductData(cart);
    
    return { success: true, cart: enrichedCart };
  } catch (error) {
    console.error("Error setting cart quantity:", error);
    return { success: false, cart: null };
  }
}

// Clear the entire cart
export async function clearCart() {
  const cookieStore = await cookies();
  const cartId = cookieStore.get("cartId")?.value;

  console.log("🎯 [Server Action] Clearing cart, cartId:", cartId);

  if (!cartId) {
    console.log("🎯 [Server Action] No cartId found");
    return { success: false };
  }

  try {
    // Remove the cart cookie
    cookieStore.delete("cartId");
    console.log("🎯 [Server Action] Cart cookie deleted");
    return { success: true };
  } catch (error) {
    console.error("🎯 [Server Action] Error clearing cart:", error);
    return { success: false };
  }
}