import { cacheLife } from "next/cache";
import Link from "next/link";
import { commerce } from "@/lib/commerce";

export async function Navbar() {
  "use cache";
  cacheLife("hours");

  try {
    const collections = await commerce.collectionBrowse({ limit: 5 });

    return (
      <nav className="hidden sm:flex items-center gap-6">
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Home
        </Link>
        <Link
          href="/products"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          All Products
        </Link>
        {collections.data.map((collection) => (
          <Link
            key={collection.id}
            href={`/collection/${collection.slug || collection.id}`}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {collection.name}
          </Link>
        ))}
      </nav>
    );
  } catch (error) {
    console.error("Error fetching collections:", error);
    return (
      <nav className="hidden sm:flex items-center gap-6">
        <Link
          href="/"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Home
        </Link>
        <Link
          href="/products"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          All Products
        </Link>
      </nav>
    );
  }
}