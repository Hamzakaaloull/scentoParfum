import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { commerce } from "@/lib/commerce";
import { CURRENCY, LOCALE } from "@/lib/constants";
import {  formatPrice } from "@/lib/money";
import { AddToCartButton } from "@/app/product/[slug]/add-to-cart-button";

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

type ProductGridProps = {
  title?: string;
  description?: string;
  products?: Product[];
  limit?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
  categoryId?: string;
};

export async function ProductGrid({
  title = "Featured Products",
  description = "Handpicked favorites from our collection",
  products,
  limit = 12,
  showViewAll = true,
  viewAllHref = "/products",
  categoryId,
}: ProductGridProps) {
  // Fetch products if not provided
  let displayProducts = products;
  if (!displayProducts) {
    const result = await commerce.productBrowse({ limit, categoryId });
    displayProducts = result.data;
  }

  if (!displayProducts || displayProducts.length === 0) {
    return (
      <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-medium text-foreground">{title}</h2>
          <p className="mt-4 text-muted-foreground">No products available at the moment</p>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
      <div className="flex items-end justify-between mb-12">
        <div>
          <h2 className="text-2xl sm:text-3xl font-medium text-foreground">{title}</h2>
          <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
        {showViewAll && (
          <Link
            href={viewAllHref}
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {displayProducts.map((product) => {
          const prices = product.variants?.map((v) => BigInt(v.price)) || [];
          const minPrice = prices.length > 0
            ? prices.reduce((a, b) => (a < b ? a : b))
            : BigInt(0);
          const maxPrice = prices.length > 0
            ? prices.reduce((a, b) => (a > b ? a : b))
            : BigInt(0);

          const priceDisplay =
            prices.length > 1 && minPrice !== maxPrice
              ? `${formatMoney({ amount: minPrice, currency: CURRENCY, locale: LOCALE })} - ${formatMoney({ amount: maxPrice, currency: CURRENCY, locale: LOCALE })}`
              : formatMoney({ amount: minPrice, currency: CURRENCY, locale: LOCALE });

          const allImages = [
            ...(product.images || []),
            ...(product.variants?.flatMap((v) => v.images || []) || []),
          ].filter((img, index, arr) => img && arr.indexOf(img) === index);
          
          const primaryImage = allImages[0] || "/placeholder.jpg";
          const secondaryImage = allImages[1];

          return (
            <div key={product.id} className="group relative">
              <Link href={`/product/${product.slug}`} className="block">
                <div className="relative aspect-square bg-secondary rounded-2xl overflow-hidden mb-4">
                  {primaryImage && (
                    <Image
                      src={primaryImage}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.jpg";
                      }}
                    />
                  )}
                  {!primaryImage && (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-muted-foreground">No image</span>
                    </div>
                  )}
                  
                  {/* Product Badge */}
                  {product.promoPrice && product.promoPrice > 0 && (
                    <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      SALE
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-medium text-foreground line-clamp-1 hover:underline">
                    {product.name}
                  </h3>
                  <p className="text-base font-semibold text-foreground">{priceDisplay}</p>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  )}
                </div>
              </Link>
              
              {/* Add to Cart Button - Quick Add */}
              <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <AddToCartButton
                  variants={product.variants}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    images: product.images,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {showViewAll && (
        <div className="mt-12 text-center sm:hidden">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            View all products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}