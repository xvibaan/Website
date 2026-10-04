"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  Package,
  ShieldCheck,
  Sparkles,
  Megaphone,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard, { Product } from "@/components/ProductCard";
import Category3DCard from "@/components/Category3DCard";
import MarketplaceHero from "@/components/MarketplaceHero";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  formatCategoriesFromBackend,
  MarketplaceCategory,
} from "@/lib/categories";
import { useNavigation } from "@/context/NavigationContext";

export default function Home() {
  const { contentSettings } = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [storedCategories, setStoredCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state: selectedCategory is "ALL" or the category slug (e.g. "gaming", "development", etc.)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const productsSectionRef = useRef<HTMLDivElement>(null);

  // Fetch real categories from GET /api/v1/categories
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      if (res.ok) {
        const catData = await res.json();
        if (Array.isArray(catData)) {
          setStoredCategories(catData);
        }
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  }, []);

  // Fetch products from database, optionally filtered by category slug
  const loadProducts = useCallback(async (catSlug?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParam = catSlug && catSlug !== "ALL"
        ? `?category=${encodeURIComponent(catSlug.trim().toLowerCase())}`
        : "";
      const res = await fetch(`/api/products${queryParam}`, { cache: "no-store" });
      if (!res.ok) {
        throw new Error("Unable to establish link with marketplace servers.");
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        // Exclude disabled products
        setProducts(data.filter((p: Product) => !p.isArchived && p.is_active !== false && p.status !== "DISABLED"));
      } else {
        setProducts([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch products:", err);
      setError(err?.message || "Failed to load marketplace data. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
    loadProducts("ALL");
  }, [loadCategories, loadProducts]);

  // Merge authoritative categories from database with theme visual styles
  const dynamicCategories = useMemo(() => {
    return formatCategoriesFromBackend(storedCategories, products);
  }, [storedCategories, products]);

  // Handle selecting a category card -> triggers backend filtered fetch
  const handleCategorySelect = (category: MarketplaceCategory) => {
    if (selectedCategory === category.slug) {
      setSelectedCategory("ALL");
      loadProducts("ALL");
    } else {
      setSelectedCategory(category.slug);
      loadProducts(category.slug);
      if (productsSectionRef.current) {
        productsSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  const handleResetCategory = () => {
    setSelectedCategory("ALL");
    loadProducts("ALL");
  };

  // Client-side text search over current loaded products
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) => {
      const title = (p.name || p.title || "").toLowerCase();
      const desc = (p.shortDescription || p.description || "").toLowerCase();
      const cat = (
        typeof p.category === "object" && p.category !== null
          ? (p.category as any).name
          : p.category || ""
      ).toLowerCase();
      return title.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [products, searchQuery]);

  const announcement = contentSettings?.announcement;

  return (
    <div className="max-w-7xl mx-auto pb-20 sm:pb-24 px-1 sm:px-4">
      {/* Dynamic Announcement Banner */}
      {announcement?.enabled && announcement.message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-3 sm:p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3 text-xs sm:text-sm font-medium ${
            announcement.type === "critical"
              ? "bg-red-500/10 border-red-500/30 text-red-300"
              : announcement.type === "warning"
              ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
              : announcement.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-primary/10 border-primary/30 text-primary"
          }`}
        >
          <div className="p-1.5 rounded-lg bg-black/40 shrink-0">
            {announcement.type === "critical" ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : announcement.type === "warning" ? (
              <AlertCircle className="w-4 h-4 text-amber-400" />
            ) : (
              <Megaphone className="w-4 h-4 text-primary" />
            )}
          </div>
          <div className="flex-1 leading-snug">
            <span className="font-bold mr-1.5 uppercase font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded bg-black/30">
              Notice
            </span>
            <span>{announcement.message}</span>
          </div>
        </motion.div>
      )}

      {/* 3D Marketplace Hero & Search */}
      <MarketplaceHero
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={dynamicCategories.map((c) => ({ id: c.slug, name: c.name }))}
        selectedCategory={selectedCategory}
        onSelectCategory={(slug) => {
          setSelectedCategory(slug);
          loadProducts(slug);
        }}
        totalProducts={products.length}
      />

      {/* 3D CATEGORIES / FACES EXPERIENCE SECTION */}
      <div className="mb-10 sm:mb-14 space-y-4 sm:space-y-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-mono text-xs uppercase tracking-widest font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Database-Driven Categories
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">
            {contentSettings?.categoriesHeadline || "Explore Marketplace Categories"}
          </h1>
        </div>

        {isLoading && storedCategories.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-white/5 border border-white/10 p-6 animate-pulse">
                <div className="w-16 h-16 rounded-2xl bg-white/10 mb-4" />
                <div className="h-6 w-3/4 bg-white/10 rounded mb-2" />
                <div className="h-4 w-1/2 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : dynamicCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {dynamicCategories.map((category) => (
              <Category3DCard
                key={category.slug}
                category={category}
                isSelected={selectedCategory === category.slug}
                onSelect={handleCategorySelect}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 rounded-2xl border border-white/10 bg-white/5 text-center text-gray-400">
            No active categories detected. Check back soon.
          </div>
        )}
      </div>

      {/* 3D PRODUCTS CATALOG SECTION */}
      <div id="modules-section" ref={productsSectionRef} className="pt-2 sm:pt-4 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-white/10 pb-4 sm:pb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-3">
              <span>
                {selectedCategory === "ALL"
                  ? "Marketplace Catalog"
                  : dynamicCategories.find((c) => c.slug === selectedCategory)?.name || "Products"}
              </span>
              {filteredProducts.length > 0 && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-semibold">
                  {filteredProducts.length} AVAILABLE
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {selectedCategory === "ALL"
                ? "Browse all active digital offerings with verified instant fulfillment."
                : `Showing products filtered by category: ${dynamicCategories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}`}
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {selectedCategory !== "ALL" && (
              <button
                type="button"
                onClick={handleResetCategory}
                className="text-xs text-primary hover:text-white underline underline-offset-4 font-mono focus-visible:ring-2 focus-visible:ring-primary/60 rounded outline-none p-1"
              >
                Reset Category Filter
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8">
          <div className="lg:col-span-3">
            {isLoading ? (
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="p-6 h-[400px] flex flex-col border-white/10 bg-white/5 animate-pulse">
                    <Skeleton className="h-6 w-2/3 mb-4 rounded-md" />
                    <Skeleton className="h-8 w-1/3 mb-6 rounded-md" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-4 w-full rounded" />
                      <Skeleton className="h-4 w-5/6 rounded" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : error && products.length === 0 ? (
              <div className="text-center py-16 sm:py-24 border border-red-500/20 rounded-2xl bg-red-500/[0.04] backdrop-blur-md px-4">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-wide mb-1">
                  Failed to Load Marketplace
                </h3>
                <p className="text-red-300 text-xs max-w-sm mx-auto mb-4">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => loadProducts(selectedCategory)}
                  className="px-5 py-2.5 bg-primary text-black font-semibold rounded-xl text-xs hover:bg-primary-hover transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                >
                  Retry Connection
                </button>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div>
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <AnimatePresence>
                    {filteredProducts.map((product) => (
                      <motion.div
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                        className="h-full"
                      >
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </div>
            ) : (
              <div className="text-center py-16 sm:py-24 border border-dashed border-white/10 rounded-2xl bg-white/[0.02] backdrop-blur-md px-4">
                <Package className="w-12 h-12 text-gray-500 mx-auto mb-4 opacity-50" />
                <h3 className="text-base sm:text-lg font-semibold text-white tracking-wide mb-1">
                  No Products Found
                </h3>
                <p className="text-gray-400 text-xs max-w-sm mx-auto mb-4">
                  {selectedCategory !== "ALL"
                    ? `No active products found in ${dynamicCategories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}.`
                    : searchQuery
                    ? `No products matched "${searchQuery}".`
                    : "No products currently available in the catalog."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("ALL");
                    setSearchQuery("");
                    loadProducts("ALL");
                  }}
                  className="px-4 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary rounded-xl text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                >
                  {selectedCategory !== "ALL" ? "View All Products" : "Clear All Filters"}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Marketplace Guarantees */}
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl p-5 sm:p-6 shadow-xl">
              <div className="flex items-center gap-2 mb-4 pb-3 sm:mb-5 sm:pb-4 border-b border-white/[0.08]">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase font-mono">
                    Marketplace Standards
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-gray-400 font-sans">
                    Reliability &amp; fulfillment
                  </p>
                </div>
              </div>

              <div className="space-y-3 sm:space-y-3.5 text-xs">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Centralized Wallet
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed pl-3.5">
                    Single unified wallet balance for instant one-click checkouts across all catalog products.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Verified Delivery
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed pl-3.5">
                    Purchased redeem codes and software licenses delivered directly to your account dashboard.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    Audited Ledger
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed pl-3.5">
                    Every top-up, debit, and fulfillment is recorded with downloadable receipt exports.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
