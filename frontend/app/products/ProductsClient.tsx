"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Package,
  Search,
  Sparkles,
  Layers,
  Gamepad2,
  Code2,
  Gift,
  Cpu,
  Cloud,
  Wrench,
  Tag,
} from "lucide-react";
import ProductCard, { Product } from "@/components/ProductCard";

interface BackendCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

const CATEGORY_ICON_MAP: Record<string, any> = {
  gaming: Gamepad2,
  development: Code2,
  "redeem-codes": Gift,
  "ai-tools": Cpu,
  "cloud-hosting": Cloud,
  "software-tools": Wrench,
};

export default function ProductsClient({
  initialCategory,
  initialCategories,
  initialProducts,
}: {
  initialCategory: string;
  initialCategories: BackendCategory[];
  initialProducts: Product[];
}) {
  const router = useRouter();

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [categories, setCategories] = useState<BackendCategory[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isLoading, setIsLoading] = useState(false);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Sync state if initial prop changes
  useEffect(() => {
    setSelectedCategory(initialCategory);
    setCategories(initialCategories);
    setProducts(initialProducts);
  }, [initialCategory, initialCategories, initialProducts]);

  // Fetch products if user changes category on client side
  const fetchProducts = async (catSlug: string) => {
    setIsProductsLoading(true);
    setError(null);
    try {
      const url =
        catSlug && catSlug !== "all"
          ? `/api/products?category=${encodeURIComponent(catSlug)}`
          : "/api/products";

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Failed to load products. Please try again.");
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        // Enforce active products only
        const activeOnly = data.filter(
          (p: Product) => p.status === "ACTIVE" || p.is_active === true || p.status === undefined
        );
        setProducts(activeOnly);
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsProductsLoading(false);
    }
  };

  const handleCategorySelect = (slug: string) => {
    setSelectedCategory(slug);
    if (slug === "all") {
      router.push("/products");
    } else {
      router.push(`/products?category=${encodeURIComponent(slug.trim().toLowerCase())}`);
    }
  };

  // Search filter applied on currently loaded category products
  const filteredProducts = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return products;
    return products.filter((p) => {
      const name = (p.name || p.title || "").toLowerCase();
      const desc = (p.shortDescription || p.description || "").toLowerCase();
      return name.includes(query) || desc.includes(query);
    });
  }, [products, search]);

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-12 p-8 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center text-center backdrop-blur-xl">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Failed to load marketplace</h2>
        <p className="text-red-400 text-sm mb-6">{error}</p>
        <button
          onClick={() => fetchProducts(selectedCategory)}
          className="px-5 py-2.5 bg-primary text-black font-semibold rounded-xl hover:bg-primary-hover transition-colors text-sm shadow-lg shadow-primary/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  const activeCategoryInfo = selectedCategory !== "all"
    ? categories.find(c => c.slug === selectedCategory)
    : null;

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-7xl pb-24">
      {/* Header with Search */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-primary mb-2 sm:mb-3">
            <Sparkles className="w-3 h-3" />
            <span>PRODUCT CATALOG</span>
          </div>

          {activeCategoryInfo ? (
            <>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                {activeCategoryInfo.name}
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-xs sm:text-sm max-w-xl">
                {activeCategoryInfo.description || `Browse our collection of authentic ${activeCategoryInfo.name} products.`}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Marketplace Catalog
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-xs sm:text-sm max-w-xl">
                Explore authentic digital tools, hosting, licenses, and redeem codes with automated delivery.
              </p>
            </>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full bg-[#0c0e17]/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 min-h-[44px] text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors backdrop-blur-md focus-visible:ring-2 focus-visible:ring-primary/60"
          />
        </div>
      </div>

      {/* Database-Driven Category Filter Tabs */}
      <div className="mb-8 overflow-x-auto pb-2 scrollbar-thin">
        <div className="flex items-center gap-2 min-w-max">
          <Link
            href="/products"
            onClick={(e) => {
              e.preventDefault();
              handleCategorySelect("all");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
              selectedCategory === "all"
                ? "bg-primary text-black font-bold shadow-[0_0_15px_rgba(0,194,255,0.3)]"
                : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Products</span>
          </Link>

          {categories.map((cat) => {
            const Icon = CATEGORY_ICON_MAP[cat.slug] || Tag;
            const isSelected = selectedCategory.toLowerCase() === cat.slug.toLowerCase();
            const isEmoji = cat.icon && !/^[A-Za-z0-9_-]+$/.test(cat.icon);

            return (
              <Link
                key={cat.id}
                href={`/products?category=${encodeURIComponent(cat.slug)}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleCategorySelect(cat.slug);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? "bg-primary text-black font-bold shadow-[0_0_15px_rgba(0,194,255,0.3)]"
                    : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                {isEmoji ? (
                  <span className="text-sm select-none leading-none">{cat.icon}</span>
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
                <span>{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Product Grid / Empty State */}
      {isProductsLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-gray-400 text-xs font-mono">Filtering catalog...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center p-12 rounded-2xl border border-dashed border-white/10 bg-white/[0.02]">
          <Package className="w-16 h-16 text-gray-600 mb-4 opacity-40" />
          <h2 className="text-xl font-bold text-white">No Products Found</h2>
          <p className="text-gray-400 text-sm mt-2 max-w-sm">
            {search
              ? `No items matched "${search}".`
              : selectedCategory !== "all"
              ? "No active products currently in this category."
              : "Check back later for new arrivals."}
          </p>
          {(search || selectedCategory !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                handleCategorySelect("all");
              }}
              className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-primary rounded-xl transition-colors font-mono"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
