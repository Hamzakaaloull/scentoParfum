// Local commerce adapter — uses Firestore (admin or client) when available

type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  images: string[];
  variants: { id: string; price: string; images: string[] }[];
  isActive: boolean;
  categoryId?: string;
  price?: number;
  promoPrice?: number;
  stock?: number;
  createdAt?: Date;
  updatedAt?: Date;
};

type Collection = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  productCollections: { product: Product }[];
  isActive: boolean;
  slug?: string;
  order?: number;
};

type CartLine = {
  quantity: number;
  productVariant: {
    id: string;
    price: string;
    images: string[];
    product: { id: string; name: string; slug: string; images: string[] };
  };
};

type Cart = { id: string; lineItems: CartLine[] };

const carts = new Map<string, Cart>();

function genId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

import { firestore } from "./firebase";
import { getClientFirestore } from "./fireclient";

async function getAdminOrClientDb(): Promise<any | null> {
  const adminDb = typeof firestore === "function" ? await (firestore as any)() : null;
  if (adminDb) return adminDb;
  try {
    return getClientFirestore();
  } catch (e) {
    console.error("Failed to get Firebase database:", e);
    return null;
  }
}

async function fetchProductsFromFirestore(): Promise<Product[]> {
  const db = await getAdminOrClientDb();
  if (!db) {
    console.log("No database connection available");
    return [];
  }

  try {
    if ((db as any).collection && typeof (db as any).collection === "function") {
      // Try without isActive filter first to see if there are any products
      const snap = await (db as any).collection("products").get();
      console.log(`Found ${snap.size} products in Firestore (admin SDK)`);
      
      const data: Product[] = [];
      snap.forEach((doc: any) => {
        const d = doc.data();
        console.log(`Product ${doc.id}:`, {
          name: d.name,
          isActive: d.isActive,
          price: d.price,
          hasImages: Array.isArray(d.images) && d.images.length > 0
        });
        
        // Include all products regardless of isActive for now
        const price = d.price ?? 0;
        // تحويل السعر إلى سنتات (ضرب في 100)
        const priceInCents = Math.round(price * 100);
        data.push({
          id: doc.id,
          name: d.name || "Unnamed Product",
          slug: d.slug || doc.id,
          description: d.description || "",
          images: Array.isArray(d.images) ? d.images : [],
          variants: [{
            id: `${doc.id}-v1`,
            price: String(priceInCents), // تخزين السعر بالسنتات
            images: Array.isArray(d.images) ? d.images : []
          }],
          isActive: d.isActive ?? true,
          categoryId: d.categoryId,
          price: d.price,
          promoPrice: d.promoPrice,
          stock: d.stock,
          createdAt: d.createdAt?.toDate(),
          updatedAt: d.updatedAt?.toDate()
        });
      });
      return data;
    }
  } catch (e) {
    console.error("Error fetching products (admin SDK):", e);
  }

  // Web SDK (modular) path
  try {
    const { collection, getDocs } = require("firebase/firestore");
    const clientDb = getClientFirestore();
    const snap = await getDocs(collection(clientDb, "products"));
    console.log(`Found ${snap.size} products in Firestore (web SDK)`);
    
    const data: Product[] = [];
    snap.forEach((doc: any) => {
      const d = doc.data();
      // Include all products
      const price = d.price ?? 0;
      // تحويل السعر إلى سنتات (ضرب في 100)
      const priceInCents = Math.round(price * 100);
      data.push({
        id: doc.id,
        name: d.name || "Unnamed Product",
        slug: d.slug || doc.id,
        description: d.description || "",
        images: Array.isArray(d.images) ? d.images : [],
        variants: [{
          id: `${doc.id}-v1`,
          price: String(priceInCents), // تخزين السعر بالسنتات
          images: Array.isArray(d.images) ? d.images : []
        }],
        isActive: d.isActive ?? true,
        categoryId: d.categoryId,
        price: d.price,
        promoPrice: d.promoPrice,
        stock: d.stock,
        createdAt: d.createdAt?.toDate(),
        updatedAt: d.updatedAt?.toDate()
      });
    });
    return data;
  } catch (err) {
    console.error("Error fetching products (web SDK):", err);
    return [];
  }
}

async function fetchCollectionsFromFirestore(): Promise<Collection[]> {
  const db = await getAdminOrClientDb();
  if (!db) {
    console.log("No database connection available for collections");
    return [];
  }

  try {
    if ((db as any).collection && typeof (db as any).collection === "function") {
      // Try without isActive filter
      const snap = await (db as any).collection("categories").get();
      console.log(`Found ${snap.size} categories in Firestore`);
      
      const data: Collection[] = [];
      
      if (snap.empty) {
        console.log("No categories found in Firestore");
        return data;
      }

      for (const doc of snap.docs) {
        const d = doc.data();
        console.log(`Category ${doc.id}:`, { name: d.name, slug: d.slug });
        
        // Get products for this category (without isActive filter)
        const productsSnap = await (db as any).collection("products")
          .where("categoryId", "==", doc.id)
          .get();
        
        console.log(`Found ${productsSnap.size} products for category ${doc.id}`);
        
        const productCollections = productsSnap.docs.map((pdoc: any) => {
          const pdata = pdoc.data();
          const price = pdata.price ?? 0;
          // تحويل السعر إلى سنتات
          const priceInCents = Math.round(price * 100);
          return { 
            product: { 
              id: pdoc.id, 
              name: pdata.name || "Unnamed Product", 
              slug: pdata.slug || pdoc.id, 
              description: pdata.description || "", 
              images: Array.isArray(pdata.images) ? pdata.images : [], 
              variants: [{
                id: `${pdoc.id}-v1`,
                price: String(priceInCents), // تخزين السعر بالسنتات
                images: Array.isArray(pdata.images) ? pdata.images : []
              }],
              isActive: pdata.isActive ?? true,
              categoryId: pdata.categoryId,
              price: pdata.price,
              promoPrice: pdata.promoPrice,
              stock: pdata.stock,
              createdAt: pdata.createdAt?.toDate(),
              updatedAt: pdata.updatedAt?.toDate()
            } 
          };
        });
        
        data.push({ 
          id: doc.id, 
          name: d.name || "Unnamed Category", 
          description: d.description || null, 
          image: d.image || null, 
          productCollections,
          isActive: d.isActive ?? true,
          slug: d.slug || doc.id,
          order: d.order || 0
        });
      }
      return data;
    }
  } catch (e) {
    console.error("Error fetching collections (admin SDK):", e);
  }

  try {
    const { collection, getDocs, query, where } = require("firebase/firestore");
    const clientDb = getClientFirestore();
    const snap = await getDocs(collection(clientDb, "categories"));
    
    const data: Collection[] = [];
    
    if (snap.empty) {
      return data;
    }

    for (const doc of snap.docs) {
      const d = doc.data();
      const productsQ = query(
        collection(clientDb, "products"), 
        where("categoryId", "==", doc.id)
      );
      const productsSnap = await getDocs(productsQ);
      const productCollections = productsSnap.docs.map((pdoc: any) => {
        const pdata = pdoc.data();
        const price = pdata.price ?? 0;
        // تحويل السعر إلى سنتات
        const priceInCents = Math.round(price * 100);
        return { 
          product: { 
            id: pdoc.id, 
            name: pdata.name || "Unnamed Product", 
            slug: pdata.slug || pdoc.id, 
            description: pdata.description || "", 
            images: Array.isArray(pdata.images) ? pdata.images : [], 
            variants: [{
              id: `${pdoc.id}-v1`,
              price: String(priceInCents), // تخزين السعر بالسنتات
              images: Array.isArray(pdata.images) ? pdata.images : []
            }],
            isActive: pdata.isActive ?? true,
            categoryId: pdata.categoryId,
            price: pdata.price,
            promoPrice: pdata.promoPrice,
            stock: pdata.stock,
            createdAt: pdata.createdAt?.toDate(),
            updatedAt: pdata.updatedAt?.toDate()
          } 
        };
      });
      data.push({ 
        id: doc.id, 
        name: d.name || "Unnamed Category", 
        description: d.description || null, 
        image: d.image || null, 
        productCollections,
        isActive: d.isActive ?? true,
        slug: d.slug || doc.id,
        order: d.order || 0
      });
    }
    return data;
  } catch (err) {
    console.error("Error fetching collections (web SDK):", err);
    return [];
  }
}

export const commerce = {
  async productGet({ idOrSlug }: { idOrSlug: string }): Promise<Product | null> {
    console.log(`Fetching product by idOrSlug: ${idOrSlug}`);
    const db = await getAdminOrClientDb();
    if (db) {
      try {
        if ((db as any).collection && typeof (db as any).collection === "function") {
          // Try by ID first
          const byId = await (db as any).collection("products").doc(idOrSlug).get();
          if (byId.exists) {
            console.log(`Found product by ID: ${idOrSlug}`);
            const d = byId.data();
            const price = d.price ?? 0;
            // تحويل السعر إلى سنتات
            const priceInCents = Math.round(price * 100);
            return { 
              id: byId.id, 
              name: d.name || "Unnamed Product", 
              slug: d.slug || byId.id, 
              description: d.description || "", 
              images: Array.isArray(d.images) ? d.images : [], 
              variants: [{
                id: `${byId.id}-v1`,
                price: String(priceInCents), // تخزين السعر بالسنتات
                images: Array.isArray(d.images) ? d.images : []
              }],
              isActive: d.isActive ?? true,
              categoryId: d.categoryId,
              price: d.price,
              promoPrice: d.promoPrice,
              stock: d.stock,
              createdAt: d.createdAt?.toDate(),
              updatedAt: d.updatedAt?.toDate()
            };
          }
          
          // Try by slug
          console.log(`Trying to find product by slug: ${idOrSlug}`);
          const snap = await (db as any).collection("products").where("slug", "==", idOrSlug).limit(1).get();
          if (!snap.empty) {
            console.log(`Found product by slug: ${idOrSlug}`);
            const doc = snap.docs[0];
            const d = doc.data();
            const price = d.price ?? 0;
            // تحويل السعر إلى سنتات
            const priceInCents = Math.round(price * 100);
            return { 
              id: doc.id, 
              name: d.name || "Unnamed Product", 
              slug: d.slug || doc.id, 
              description: d.description || "", 
              images: Array.isArray(d.images) ? d.images : [], 
              variants: [{
                id: `${doc.id}-v1`,
                price: String(priceInCents), // تخزين السعر بالسنتات
                images: Array.isArray(d.images) ? d.images : []
              }],
              isActive: d.isActive ?? true,
              categoryId: d.categoryId,
              price: d.price,
              promoPrice: d.promoPrice,
              stock: d.stock,
              createdAt: d.createdAt?.toDate(),
              updatedAt: d.updatedAt?.toDate()
            };
          }
          
          console.log(`No product found with id or slug: ${idOrSlug}`);
        }
      } catch (e) {
        console.error("Error fetching product (admin SDK):", e);
      }

      // client path
      try {
        const { collection, query, where, getDocs } = require("firebase/firestore");
        const clientDb = getClientFirestore();
        const q = query(collection(clientDb, "products"), where("slug", "==", idOrSlug));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const doc = snap.docs[0];
          const d = doc.data();
          const price = d.price ?? 0;
          // تحويل السعر إلى سنتات
          const priceInCents = Math.round(price * 100);
          return { 
            id: doc.id, 
            name: d.name || "Unnamed Product", 
            slug: d.slug || doc.id, 
            description: d.description || "", 
            images: Array.isArray(d.images) ? d.images : [], 
            variants: [{
              id: `${doc.id}-v1`,
              price: String(priceInCents), // تخزين السعر بالسنتات
              images: Array.isArray(d.images) ? d.images : []
            }],
            isActive: d.isActive ?? true,
            categoryId: d.categoryId,
            price: d.price,
            promoPrice: d.promoPrice,
            stock: d.stock,
            createdAt: d.createdAt?.toDate(),
            updatedAt: d.updatedAt?.toDate()
          };
        }
      } catch (e) {
        console.error("Error fetching product (web SDK):", e);
      }
    }

    return null;
  },

  async productBrowse(params: Record<string, unknown> = {}): Promise<{ data: Product[] }> {
    console.log("Browsing products with params:", params);
    const { categoryId, limit = 50 } = params;
    const db = await getAdminOrClientDb();
    const products: Product[] = [];

    if (!db) {
      console.log("No database connection for product browse");
      return { data: [] };
    }

    try {
      if ((db as any).collection && typeof (db as any).collection === "function") {
        let query = (db as any).collection("products");
        
        if (categoryId) {
          console.log(`Filtering by categoryId: ${categoryId}`);
          query = query.where("categoryId", "==", categoryId);
        }
        
        if (limit) {
          query = query.limit(limit as number);
        }
        
        const snap = await query.get();
        console.log(`Found ${snap.size} products in browse query`);
        
        snap.forEach((doc: any) => {
          const d = doc.data();
          const price = d.price ?? 0;
          // تحويل السعر إلى سنتات
          const priceInCents = Math.round(price * 100);
          products.push({
            id: doc.id,
            name: d.name || "Unnamed Product",
            slug: d.slug || doc.id,
            description: d.description || "",
            images: Array.isArray(d.images) ? d.images : [],
            variants: [{
              id: `${doc.id}-v1`,
              price: String(priceInCents), // تخزين السعر بالسنتات
              images: Array.isArray(d.images) ? d.images : []
            }],
            isActive: d.isActive ?? true,
            categoryId: d.categoryId,
            price: d.price,
            promoPrice: d.promoPrice,
            stock: d.stock,
            createdAt: d.createdAt?.toDate(),
            updatedAt: d.updatedAt?.toDate()
          });
        });
      } else {
        const { collection, query: firestoreQuery, getDocs, limit: firestoreLimit, where } = require("firebase/firestore");
        const clientDb = getClientFirestore();
        let q = firestoreQuery(collection(clientDb, "products"));
        
        if (categoryId) {
          q = firestoreQuery(q, where("categoryId", "==", categoryId));
        }
        
        if (limit) {
          q = firestoreQuery(q, firestoreLimit(limit as number));
        }
        
        const snap = await getDocs(q);
        console.log(`Found ${snap.size} products in browse query (web SDK)`);
        
        snap.forEach((doc: any) => {
          const d = doc.data();
          const price = d.price ?? 0;
          // تحويل السعر إلى سنتات
          const priceInCents = Math.round(price * 100);
          products.push({
            id: doc.id,
            name: d.name || "Unnamed Product",
            slug: d.slug || doc.id,
            description: d.description || "",
            images: Array.isArray(d.images) ? d.images : [],
            variants: [{
              id: `${doc.id}-v1`,
              price: String(priceInCents), // تخزين السعر بالسنتات
              images: Array.isArray(d.images) ? d.images : []
            }],
            isActive: d.isActive ?? true,
            categoryId: d.categoryId,
            price: d.price,
            promoPrice: d.promoPrice,
            stock: d.stock,
            createdAt: d.createdAt?.toDate(),
            updatedAt: d.updatedAt?.toDate()
          });
        });
      }
    } catch (err) {
      console.error("Error browsing products:", err);
    }

    console.log(`Returning ${products.length} products`);
    return { data: products };
  },

  async collectionBrowse(params: Record<string, unknown> = {}): Promise<{ data: Collection[] }> {
    console.log("Browsing collections");
    const remote = await fetchCollectionsFromFirestore();
    console.log(`Found ${remote.length} collections`);
    return { data: remote };
  },

  async collectionGet({ idOrSlug }: { idOrSlug: string }): Promise<Collection | null> {
    console.log(`Fetching collection by idOrSlug: ${idOrSlug}`);
    const db = await getAdminOrClientDb();
    if (db) {
      try {
        if ((db as any).collection && typeof (db as any).collection === "function") {
          // Try by ID first
          const byId = await (db as any).collection("categories").doc(idOrSlug).get();
          if (byId.exists) {
            console.log(`Found collection by ID: ${idOrSlug}`);
            const d = byId.data();
            const productsSnap = await (db as any).collection("products")
              .where("categoryId", "==", byId.id)
              .get();
            
            const productCollections = productsSnap.docs.map((pdoc: any) => {
              const pdata = pdoc.data();
              const price = pdata.price ?? 0;
              // تحويل السعر إلى سنتات
              const priceInCents = Math.round(price * 100);
              return { 
                product: { 
                  id: pdoc.id, 
                  name: pdata.name || "Unnamed Product", 
                  slug: pdata.slug || pdoc.id, 
                  description: pdata.description || "", 
                  images: Array.isArray(pdata.images) ? pdata.images : [], 
                  variants: [{
                    id: `${pdoc.id}-v1`,
                    price: String(priceInCents), // تخزين السعر بالسنتات
                    images: Array.isArray(pdata.images) ? pdata.images : []
                  }],
                  isActive: pdata.isActive ?? true,
                  categoryId: pdata.categoryId,
                  price: pdata.price,
                  promoPrice: pdata.promoPrice,
                  stock: pdata.stock,
                  createdAt: pdata.createdAt?.toDate(),
                  updatedAt: pdata.updatedAt?.toDate()
                } 
              };
            });
            
            return { 
              id: byId.id, 
              name: d.name || "Unnamed Category", 
              description: d.description || null, 
              image: d.image || null, 
              productCollections,
              isActive: d.isActive ?? true,
              slug: d.slug || byId.id,
              order: d.order || 0
            };
          }
          
          // Try by slug or name
          console.log(`Trying to find collection by slug: ${idOrSlug}`);
          const snap = await (db as any).collection("categories")
            .where("slug", "==", idOrSlug)
            .limit(1)
            .get();
          
          if (!snap.empty) {
            console.log(`Found collection by slug: ${idOrSlug}`);
            const doc = snap.docs[0];
            const d = doc.data();
            const productsSnap = await (db as any).collection("products")
              .where("categoryId", "==", doc.id)
              .get();
            
            const productCollections = productsSnap.docs.map((pdoc: any) => {
              const pdata = pdoc.data();
              const price = pdata.price ?? 0;
              // تحويل السعر إلى سنتات
              const priceInCents = Math.round(price * 100);
              return { 
                product: { 
                  id: pdoc.id, 
                  name: pdata.name || "Unnamed Product", 
                  slug: pdata.slug || pdoc.id, 
                  description: pdata.description || "", 
                  images: Array.isArray(pdata.images) ? pdata.images : [], 
                  variants: [{
                    id: `${pdoc.id}-v1`,
                    price: String(priceInCents), // تخزين السعر بالسنتات
                    images: Array.isArray(pdata.images) ? pdata.images : []
                  }],
                  isActive: pdata.isActive ?? true,
                  categoryId: pdata.categoryId,
                  price: pdata.price,
                  promoPrice: pdata.promoPrice,
                  stock: pdata.stock,
                  createdAt: pdata.createdAt?.toDate(),
                  updatedAt: pdata.updatedAt?.toDate()
                } 
              };
            });
            
            return { 
              id: doc.id, 
              name: d.name || "Unnamed Category", 
              description: d.description || null, 
              image: d.image || null, 
              productCollections,
              isActive: d.isActive ?? true,
              slug: d.slug || doc.id,
              order: d.order || 0
            };
          }
          
          console.log(`No collection found with id or slug: ${idOrSlug}`);
        }
      } catch (e) {
        console.error("Error fetching collection (admin SDK):", e);
      }

      try {
        const { collection, query, where, getDocs } = require("firebase/firestore");
        const clientDb = getClientFirestore();
        const q = query(
          collection(clientDb, "categories"), 
          where("slug", "==", idOrSlug)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const doc = snap.docs[0];
          const d = doc.data();
          const productsQ = query(
            collection(clientDb, "products"), 
            where("categoryId", "==", doc.id)
          );
          const productsSnap = await getDocs(productsQ);
          const productCollections = productsSnap.docs.map((pdoc: any) => {
            const pdata = pdoc.data();
            const price = pdata.price ?? 0;
            // تحويل السعر إلى سنتات
            const priceInCents = Math.round(price * 100);
            return { 
              product: { 
                id: pdoc.id, 
                name: pdata.name || "Unnamed Product", 
                slug: pdata.slug || pdoc.id, 
                description: pdata.description || "", 
                images: Array.isArray(pdata.images) ? pdata.images : [], 
                variants: [{
                  id: `${pdoc.id}-v1`,
                  price: String(priceInCents), // تخزين السعر بالسنتات
                  images: Array.isArray(pdata.images) ? pdata.images : []
                }],
                isActive: pdata.isActive ?? true,
                categoryId: pdata.categoryId,
                price: pdata.price,
                promoPrice: pdata.promoPrice,
                stock: pdata.stock,
                createdAt: pdata.createdAt?.toDate(),
                updatedAt: pdata.updatedAt?.toDate()
              } 
            };
          });
          return { 
            id: doc.id, 
            name: d.name || "Unnamed Category", 
            description: d.description || null, 
            image: d.image || null, 
            productCollections,
            isActive: d.isActive ?? true,
            slug: d.slug || doc.id,
            order: d.order || 0
          };
        }
      } catch (err) {
        console.error("Error fetching collection (web SDK):", err);
      }
    }

    return null;
  },

  async cartGet({ cartId }: { cartId?: string }): Promise<Cart | null> {
    if (!cartId) return null;
    return carts.get(cartId) ?? null;
  },

  async cartUpsert({ cartId, variantId, quantity }: { cartId?: string; variantId: string; quantity: number }) {
  let id = cartId ?? genId("cart");
  let cart = carts.get(id) ?? { id, lineItems: [] };

  if (quantity === 0) {
    cart.lineItems = cart.lineItems.filter((li) => li.productVariant.id !== variantId);
    carts.set(id, cart);
    return cart;
  }

  // Extract productId from variantId
  let productId = variantId;
  if (variantId.includes('-v1')) {
    productId = variantId.replace('-v1', '');
  }

  console.log(`🎯 [Cart] Adding product to cart, productId: ${productId}, variantId: ${variantId}`);

  // Fetch product from Firebase
  const db = await getAdminOrClientDb();
  let product: any = null;
  
  if (db) {
    try {
      if ((db as any).collection && typeof (db as any).collection === "function") {
        // Admin SDK
        console.log(`🎯 [Cart] Fetching product ${productId} using Admin SDK`);
        const doc = await (db as any).collection("products").doc(productId).get();
        if (doc.exists) {
          product = doc.data();
          product.id = doc.id; // Ensure ID is set
          console.log(`🎯 [Cart] Found product: ${product.name}, Price: ${product.price}, Images: ${product.images?.length || 0}`);
        } else {
          console.error(`🎯 [Cart] Product ${productId} not found in Firestore`);
        }
      } else {
        // Client SDK
        console.log(`🎯 [Cart] Fetching product ${productId} using Client SDK`);
        const { doc: firestoreDoc, getDoc } = require("firebase/firestore");
        const clientDb = getClientFirestore();
        const productDoc = await getDoc(firestoreDoc(clientDb, "products", productId));
        if (productDoc.exists()) {
          product = productDoc.data();
          product.id = productDoc.id; // Ensure ID is set
          console.log(`🎯 [Cart] Found product: ${product.name}, Price: ${product.price}, Images: ${product.images?.length || 0}`);
        } else {
          console.error(`🎯 [Cart] Product ${productId} not found in Firestore`);
        }
      }
    } catch (e) {
      console.error("🎯 [Cart] Error fetching product for cart:", e);
    }
  }

  if (product) {
    const existing = cart.lineItems.find((li) => li.productVariant.id === variantId);
    const price = product.price ?? 0;
    // Convert price to cents
    const priceInCents = Math.round(price * 100);
    
    console.log(`🎯 [Cart] Adding product details: ${product.name}, Price: ${price}, Price in cents: ${priceInCents}`);
    
    if (existing) {
      existing.quantity = Math.max(0, existing.quantity + quantity);
      if (existing.quantity === 0) {
        cart.lineItems = cart.lineItems.filter((li) => li.productVariant.id !== variantId);
      }
    } else if (quantity > 0) {
      cart.lineItems.push({
        quantity,
        productVariant: {
          id: variantId,
          price: String(priceInCents), // Store price in cents
          images: Array.isArray(product.images) ? product.images : [],
          product: {
            id: product.id,
            name: product.name || "Unnamed Product",
            slug: product.slug || product.id,
            images: Array.isArray(product.images) ? product.images : [],
          },
        },
      });
      console.log(`🎯 [Cart] Added new item to cart: ${product.name}`);
    }
  } else {
    console.error(`🎯 [Cart] Product not found for variantId: ${variantId}, using fallback`);
    // Fallback if product not found
    const existing = cart.lineItems.find((li) => li.productVariant.id === variantId);
    if (existing) {
      existing.quantity = Math.max(0, existing.quantity + quantity);
      if (existing.quantity === 0) {
        cart.lineItems = cart.lineItems.filter((li) => li.productVariant.id !== variantId);
      }
    } else if (quantity > 0) {
      cart.lineItems.push({
        quantity,
        productVariant: {
          id: variantId,
          price: "0",
          images: [],
          product: { 
            id: genId("p"), 
            name: "Product", 
            slug: "product", 
            images: [] 
          },
        },
      });
    }
  }

  console.log(`🎯 [Cart] Cart ${id} now has ${cart.lineItems.length} items`);
  carts.set(id, cart);
  return cart;
},
} as const;