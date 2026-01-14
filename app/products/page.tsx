"use client";

import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { getClientFirestore } from "@/lib/fireclient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import {
  Search, 
  ArrowLeft, 
  Loader2, 
  Package, 
  Filter,
  X,
  Grid3x3,
  ListFilter
} from "lucide-react";
import { formatPrice } from "@/lib/money";
import { AddToCartButton } from "@/app/product/[slug]/add-to-cart-button";

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
};

type Category = {
  id: string;
  name: string;
  slug?: string;
  isActive: boolean;
  order?: number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProductsAndCategories();
  }, []);

  const fetchProductsAndCategories = async () => {
    try {
      const db = getClientFirestore();
      console.log("Fetching products and categories...");
      
      // Fetch products
      const productsCollection = collection(db, "products");
      const productsSnapshot = await getDocs(productsCollection);
      
      const productsList: Product[] = [];
      productsSnapshot.forEach((doc) => {
        const data = doc.data();
        // Only show active products
        if (data.isActive !== false) {
          const price = typeof data.price === 'string' 
            ? parseFloat(data.price) 
            : (data.price || 0);
            
          const promoPrice = data.promoPrice 
            ? (typeof data.promoPrice === 'string' 
                ? parseFloat(data.promoPrice) 
                : data.promoPrice)
            : undefined;
          
          productsList.push({
            id: doc.id,
            name: data.name || "Unnamed Product",
            slug: data.slug || doc.id,
            description: data.description || "",
            price: price,
            promoPrice: promoPrice,
            stock: data.stock,
            categoryId: data.categoryId,
            isActive: data.isActive !== false,
            images: Array.isArray(data.images) ? data.images : [],
          });
        }
      });

      console.log(`Loaded ${productsList.length} products`);

      // Fetch categories
      const categoriesCollection = collection(db, "categories");
      const categoriesSnapshot = await getDocs(categoriesCollection);
      
      const categoriesList: Category[] = [];
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.isActive !== false) {
          categoriesList.push({
            id: doc.id,
            name: data.name || "Unnamed Category",
            slug: data.slug || doc.id,
            isActive: data.isActive !== false,
            order: data.order || 0
          });
        }
      });

      // Sort categories by order
      categoriesList.sort((a, b) => (a.order || 0) - (b.order || 0));

      setProducts(productsList);
      setCategories(categoriesList);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter products based on search term and selected category
  const filteredProducts = products.filter(product => {
    const matchesSearch = 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (product.slug && product.slug.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = 
      selectedCategory === "all" || 
      product.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const getCategoryName = (categoryId: string) => {
    if (categoryId === "all") return "All";
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : "Uncategorized";
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setSearchTerm("");
    setMobileFilterOpen(false);
  };

  // Get products count by category
  const getProductCountByCategory = (categoryId: string) => {
    if (categoryId === "all") return products.length;
    return products.filter(product => product.categoryId === categoryId).length;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
        
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground">All Products</h1>
          <p className="text-muted-foreground mt-2">
            Browse our complete collection
          </p>
        </div>
      </div>

      {/* Mobile Filter Dropdown */}
      <div className="lg:hidden mb-6">
        <div className="flex gap-3">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11 w-full"
            />
          </div>
          
          {/* Filter Button */}
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="flex items-center gap-2 px-4 h-11 border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            <Filter className="h-5 w-5" />
            <span className="hidden sm:inline">Filter</span>
            {selectedCategory !== "all" && (
              <span className="h-5 w-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                1
              </span>
            )}
          </button>
        </div>

        {/* Mobile Filter Dropdown Content */}
        {mobileFilterOpen && (
          <div className="mt-4 p-4 border border-border rounded-lg bg-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Filter by Category</h3>
              <button 
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 hover:bg-secondary rounded"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedCategory === "all" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
              >
                <div className="flex justify-between items-center">
                  <span>All Products</span>
                  <span className="text-sm opacity-70">({products.length})</span>
                </div>
              </button>
              
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setMobileFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedCategory === category.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  <div className="flex justify-between items-center">
                    <span>{category.name}</span>
                    <span className="text-sm opacity-70">
                      ({getProductCountByCategory(category.id)})
                    </span>
                  </div>
                </button>
              ))}
            </div>
            
            {(selectedCategory !== "all" || searchTerm) && (
              <button
                onClick={clearFilters}
                className="w-full mt-4 py-2 text-sm text-center border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:flex gap-8">
        {/* Sidebar - Categories Filter */}
        <div className="w-64 flex-shrink-0">
          <div className="sticky top-24">
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 w-full"
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <ListFilter className="h-5 w-5" />
                <h3 className="font-medium">Filter by Category</h3>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedCategory === "all" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  <div className="flex justify-between items-center">
                    <span>All Products</span>
                    <span className="text-sm opacity-70">({products.length})</span>
                  </div>
                </button>
                
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedCategory === category.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                  >
                    <div className="flex justify-between items-center">
                      <span>{category.name}</span>
                      <span className="text-sm opacity-70">
                        ({getProductCountByCategory(category.id)})
                      </span>
                    </div>
                  </button>
                ))}
              </div>
              
              {(selectedCategory !== "all" || searchTerm) && (
                <button
                  onClick={clearFilters}
                  className="w-full mt-4 py-2 text-sm text-center border border-border rounded-lg hover:bg-secondary transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            {/* Products Stats */}
            <div className="mt-6 p-4 border border-border rounded-lg bg-card">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Grid3x3 className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm font-medium">Products Stats</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Products:</span>
                    <span className="font-medium">{products.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Filtered:</span>
                    <span className="font-medium">{filteredProducts.length}</span>
                  </div>
                  {selectedCategory !== "all" && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Selected Category:</span>
                      <span className="font-medium">{getCategoryName(selectedCategory)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Desktop Filter Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium">
                  {selectedCategory === "all" 
                    ? "All Products" 
                    : `${getCategoryName(selectedCategory)} Products`}
                  <span className="text-muted-foreground ml-2">({filteredProducts.length})</span>
                </h2>
                {(selectedCategory !== "all" || searchTerm) && (
                  <div className="flex items-center gap-2 mt-1">
                    {selectedCategory !== "all" && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                        {getCategoryName(selectedCategory)}
                        <button 
                          onClick={() => setSelectedCategory("all")}
                          className="hover:text-primary/70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                    {searchTerm && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-foreground text-xs rounded">
                        Search: "{searchTerm}"
                        <button 
                          onClick={() => setSearchTerm("")}
                          className="hover:text-foreground/70"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                Showing {filteredProducts.length} of {products.length} products
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <ProductsGrid 
            products={filteredProducts}
            loading={loading}
            searchTerm={searchTerm}
          />
        </div>
      </div>

      {/* Mobile Main Content */}
      <div className="lg:hidden">
        {/* Mobile Filter Info */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">
                {selectedCategory === "all" 
                  ? "All Products" 
                  : `${getCategoryName(selectedCategory)} Products`}
                <span className="text-muted-foreground ml-2">({filteredProducts.length})</span>
              </h2>
              {(selectedCategory !== "all" || searchTerm) && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {selectedCategory !== "all" && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                      {getCategoryName(selectedCategory)}
                      <button 
                        onClick={() => setSelectedCategory("all")}
                        className="hover:text-primary/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                  {searchTerm && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-foreground text-xs rounded">
                      Search: "{searchTerm}"
                      <button 
                        onClick={() => setSearchTerm("")}
                        className="hover:text-foreground/70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Products Grid */}
        <ProductsGrid 
          products={filteredProducts}
          loading={loading}
          searchTerm={searchTerm}
        />
      </div>
    </div>
  );
}

// ProductsGrid Component

function ProductsGrid({ 
  products, 
  loading, 
  searchTerm 
}: { 
  products: Product[]; 
  loading: boolean; 
  searchTerm: string;
}) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-xl font-medium text-foreground mb-2">
          {searchTerm ? "No products found" : "No products available"}
        </h3>
        <p className="text-muted-foreground mb-6">
          {searchTerm 
            ? "Try a different search term or filter" 
            : "Check back soon for new products"
          }
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => {
        // Create variants from product data
        const variants = [{
          id: `${product.id}-v1`,
          price: product.price,
          images: product.images || []
        }];

        // Create product object for AddToCartButton with complete info
        const productForCart = {
          id: product.id,
          name: product.name,
          slug: product.slug || product.id,
          images: product.images || [],
          price: product.price,
          promoPrice: product.promoPrice,
        };

        return (
          <div key={product.id} className="group">
            <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col">
              {/* Product Image */}
              <div 
                className="relative aspect-square bg-secondary overflow-hidden cursor-pointer"
                onClick={() => router.push(`/product/${product.slug || product.id}`)}
              >
                {product.images && product.images.length > 0 && product.images[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name || "Product"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-family='sans-serif' font-size='24' text-anchor='middle' dy='.3em' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                
                {/* Sale Badge */}
                {product.promoPrice && product.promoPrice > 0 && (
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                      SALE
                    </span>
                  </div>
                )}
              </div>
              
              {/* Product Info */}
              <div className="p-4 flex-1 flex flex-col">
                <div 
                  className="mb-3 flex-1 cursor-pointer"
                  onClick={() => router.push(`/product/${product.slug || product.id}`)}
                >
                  <h3 className="text-lg font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors mb-2">
                    {product.name || "Unnamed Product"}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description || "No description available"}
                  </p>
                </div>
                
                {/* Price and Stock */}
                <div className="mb-4 mt-auto">
                  <div className="flex items-center justify-between">
                    {product.promoPrice && product.promoPrice > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-destructive">
                          {formatPrice(product.promoPrice)}
                        </span>
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-foreground">
                        {formatPrice(product.price)}
                      </span>
                    )}
                    
                    <span className={`text-xs px-2 py-1 rounded-full ${product.stock && product.stock > 0 ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}`}>
                      {product.stock && product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>
                
                {/* Buttons */}
                <div className="space-y-2">
                  {/* Add to Cart Button */}
                  {product.stock && product.stock > 0 ? (
                    <AddToCartButton
                      variants={variants}
                      product={productForCart}
                    />
                  ) : (
                    <button
                      disabled
                      className="w-full h-10 bg-gray-100 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed"
                    >
                      Out of Stock
                    </button>
                  )}
                  
                  {/* View Details Button */}
                  <button 
                    onClick={() => router.push(`/product/${product.slug || product.id}`)}
                    className="w-full h-10 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-secondary transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}