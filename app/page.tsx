import { Suspense } from "react";
import { Hero } from "@/components/sections/hero";
import { ProductGrid } from "@/components/sections/product-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { commerce } from "@/lib/commerce";

function HomePageSkeleton() {
  return (
    <div>
      <div className="h-[80vh] bg-gradient-to-r from-primary/10 to-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="w-full max-w-3xl">
            <Skeleton className="h-16 w-3/4 mb-6" />
            <Skeleton className="h-6 w-full mb-4" />
            <Skeleton className="h-6 w-2/3 mb-8" />
            <div className="flex gap-4">
              <Skeleton className="h-12 w-32 rounded-full" />
              <Skeleton className="h-12 w-32 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <Skeleton className="h-12 w-64 mb-12" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="aspect-square rounded-2xl" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  // Fetch featured products
  const featuredProducts = await commerce.productBrowse({ limit: 8 });

  return (
    <div>
      <Hero />
      <ProductGrid 
        title="Featured Products"
        description="Discover our handpicked collection of premium products"
        products={featuredProducts.data}
        limit={8}
        showViewAll={true}
        viewAllHref="/products"
      />
    </div>
  );
}