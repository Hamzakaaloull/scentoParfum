import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { CartProvider } from "@/app/cart/cart-context";
import { CartSidebar } from "@/app/cart/cart-sidebar";
import { CartButton } from "@/app/cart-button";
import { Footer } from "@/app/footer";
import { Navbar } from "@/app/navbar";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ScentoParfum",
  description: "Perfume and fashion store",
};

async function CartProviderWrapper({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cartId = cookieStore.get("cartId")?.value;
  let cart = null;

  if (cartId) {
    try {
      const commerce = await import("@/lib/commerce");
      cart = await commerce.commerce.cartGet({ cartId });
    } catch {
      cart = null;
    }
  }

  return (
    <CartProvider initialCart={cart} initialCartId={cartId}>
      {children}
      <CartSidebar baseUrl={typeof window !== "undefined" ? window.location.origin : ""} />
    </CartProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Suspense fallback={<LoadingLayout />}>
          <CartProviderWrapper>
            <div className="flex min-h-screen flex-col">
              <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="flex items-center justify-between h-16">
                    <Link href="/" className="text-xl font-bold text-foreground">
                      ScentoParfum
                    </Link>
                    <Navbar />
                    <CartButton />
                  </div>
                </div>
              </header>
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </CartProviderWrapper>
        </Suspense>
      </body>
    </html>
  );
}

function LoadingLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="text-xl font-bold text-foreground">ScentoParfum</div>
            <div className="p-2 rounded-full w-10 h-10" />
          </div>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </main>
    </div>
  );
}