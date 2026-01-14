"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { getClientFirestore } from "@/lib/fireclient";
import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ImageGallery } from "./image-gallery";
import { AddToCartButton } from "./add-to-cart-button";
import { ProductFeatures } from "./product-features";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/money";
import { QuantitySelector } from "./quantity-selector";
import { TrustBadges } from "./trust-badges";
import { VariantSelector } from "./variant-selector";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  promoPrice?: number;
  stock?: number;
  categoryId?: string;
  isActive: boolean;
  images: string[];
  variants?: Array<{
    id: string;
    price: number;
    images: string[];
    combinations: Array<{
      variantValue: {
        value: string;
        variantType: {
          label: string;
        };
      };
    }>;
  }>;
};

export default function ProductPage() {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  
  // استخدم useParams بدلاً من params المباشر
  const params = useParams();
  const encodedSlug = params.slug as string;
  
  // فك تشفير الـ slug (للمسافات والرموز الخاصة)
  const slug = decodeURIComponent(encodedSlug);

  useEffect(() => {
    if (slug) {
      fetchProduct(slug);
    }
  }, [slug]);

  const fetchProduct = async (productSlug: string) => {
    try {
      const db = getClientFirestore();
      console.log("Fetching product with slug:", productSlug);
      
      let productDoc;
      let productData;
      let productId;

      // أولاً: حاول العثور على المنتج بواسطة slug كـ document ID
      try {
        const docRef = doc(db, "products", productSlug);
        productDoc = await getDoc(docRef);
        
        if (productDoc.exists()) {
          productData = productDoc.data();
          productId = productDoc.id;
          console.log("Found by document ID:", productId);
        }
      } catch (error) {
        console.log("Not found by document ID");
      }

      // ثانياً: إذا لم يتم العثور، حاول البحث بالحقل slug
      if (!productDoc?.exists()) {
        console.log("Trying to query by slug field...");
        
        // البحث بالـ slug المباشر (بعد فك التشفير)
        const q1 = query(
          collection(db, "products"),
          where("slug", "==", productSlug)
        );
        const querySnapshot1 = await getDocs(q1);
        
        if (!querySnapshot1.empty) {
          productDoc = querySnapshot1.docs[0];
          productData = productDoc.data();
          productId = productDoc.id;
          console.log("Found by exact slug field:", productId);
        } else {
          // البحث بالـ slug مع تحويل المسافات إلى شرطات
          const slugWithHyphens = productSlug.replace(/\s+/g, '-');
          const q2 = query(
            collection(db, "products"),
            where("slug", "==", slugWithHyphens)
          );
          const querySnapshot2 = await getDocs(q2);
          
          if (!querySnapshot2.empty) {
            productDoc = querySnapshot2.docs[0];
            productData = productDoc.data();
            productId = productDoc.id;
            console.log("Found by hyphenated slug field:", productId);
          } else {
            // البحث بالاسم (بدون حساسية الحالة)
            const q3 = query(
              collection(db, "products"),
              where("name", "==", productSlug)
            );
            const querySnapshot3 = await getDocs(q3);
            
            if (!querySnapshot3.empty) {
              productDoc = querySnapshot3.docs[0];
              productData = productDoc.data();
              productId = productDoc.id;
              console.log("Found by name field:", productId);
            }
          }
        }
      }

      // ثالثاً: إذا لم يتم العثور مطلقاً
      if (!productDoc?.exists() || !productData) {
        console.error("Product not found:", productSlug);
        notFound();
        return;
      }

      // تحقق مما إذا كان المنتج نشط
      if (productData.isActive === false) {
        console.log("Product is not active");
        notFound();
        return;
      }

      // تحويل البيانات
      const price = typeof productData.price === 'string' 
        ? parseFloat(productData.price) 
        : (productData.price || 0);
        
      const promoPrice = productData.promoPrice 
        ? (typeof productData.promoPrice === 'string' 
            ? parseFloat(productData.promoPrice) 
            : productData.promoPrice)
        : undefined;

      const productInfo: Product = {
        id: productId || productDoc.id,
        name: productData.name || "Unnamed Product",
        slug: productData.slug || productDoc.id,
        description: productData.description || "",
        price: price,
        promoPrice: promoPrice,
        stock: productData.stock,
        categoryId: productData.categoryId,
        isActive: productData.isActive !== false,
        images: Array.isArray(productData.images) ? productData.images : [],
        variants: productData.variants || []
      };

      console.log("Product loaded successfully:", productInfo);
      setProduct(productInfo);
    } catch (error) {
      console.error("Error fetching product:", error);
      notFound();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <ProductDetailsSkeleton />;
  }

  if (!product) {
    notFound();
  }

  // إعداد المتغيرات لزر الإضافة للسلة
  const variants = product.variants && product.variants.length > 0 
    ? product.variants 
    : [{
        id: `${product.id}-v1`,
        price: product.price,
        images: product.images || []
      }];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link 
          href="/products" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Link>
      </div>

      <div className="lg:grid lg:grid-cols-2 lg:gap-16">
        {/* Left: Image Gallery */}
        <div className="mb-8 lg:mb-0">
          <ImageGallery 
            images={product.images} 
            productName={product.name} 
            variants={product.variants || []} 
          />
        </div>

        {/* Right: Product Details */}
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground">
              {product.name}
            </h1>
            
            <div className="space-y-2">
              {product.promoPrice && product.promoPrice > 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-2xl lg:text-3xl font-bold text-destructive">
                    {formatPrice(product.promoPrice)}
                  </span>
                  <span className="text-xl text-muted-foreground line-through">
                    {formatPrice(product.price)}
                  </span>
                  <span className="px-2 py-1 bg-red-500/10 text-red-700 text-xs font-bold rounded">
                    SALE
                  </span>
                </div>
              ) : (
                <p className="text-2xl lg:text-3xl font-bold text-foreground">
                  {formatPrice(product.price)}
                </p>
              )}
              
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${product.stock && product.stock > 0 ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}`}>
                <span className={`h-2 w-2 rounded-full mr-2 ${product.stock && product.stock > 0 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                {product.stock && product.stock > 0 ? `In Stock (${product.stock} available)` : 'Out of Stock'}
              </div>
            </div>
            
            {product.description && (
              <div className="pt-4 border-t border-border">
                <h3 className="text-lg font-medium mb-3">Description</h3>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Variant Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="pt-4 border-t border-border">
                <VariantSelector 
                  variants={product.variants} 
                  selectedVariantId={variants[0]?.id}
                />
              </div>
            )}

            {/* Quantity Selector */}
            <div className="pt-4 border-t border-border">
              <QuantitySelector 
                quantity={quantity}
                onQuantityChange={setQuantity}
                max={product.stock || 99}
                disabled={!product.stock || product.stock <= 0}
              />
            </div>
          </div>

          {/* Add to Cart Button */}
          <div className="pt-6">
            {product.stock && product.stock > 0 ? (
              <AddToCartButton
                variants={variants}
                product={{
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  images: product.images,
                }}
              />
            ) : (
              <button
                disabled
                className="w-full h-12 bg-gray-100 text-gray-500 text-base font-medium rounded-lg cursor-not-allowed"
              >
                Out of Stock
              </button>
            )}
          </div>

          {/* Trust Badges */}
          <TrustBadges />
        </div>
      </div>

      {/* Features Section */}
      <div className="mt-12">
        <ProductFeatures />
      </div>
    </div>
  );
}

function ProductDetailsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Skeleton className="h-4 w-24" />
      </div>
      
      <div className="lg:grid lg:grid-cols-2 lg:gap-16">
        <div className="mb-8 lg:mb-0">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="flex gap-3 mt-4">
            <Skeleton className="w-20 h-20 rounded-lg" />
            <Skeleton className="w-20 h-20 rounded-lg" />
            <Skeleton className="w-20 h-20 rounded-lg" />
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}