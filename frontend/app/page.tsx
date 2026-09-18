"use client";

import React, { useEffect, useState } from "react";
import { Package, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import ProductCard, { Product } from "@/components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          // Only show products where isArchived is false
          setProducts(data.filter((p: Product) => !p.isArchived));
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <div className="max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="mb-12 border-b border-primary/20 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white font-mono tracking-widest flex items-center gap-3">
            <Terminal className="w-8 h-8 text-primary" />
            HOST MARKET PLACE
          </h1>
          <p className="mt-2 text-sm text-primary/70 font-mono uppercase tracking-widest">
            Select and acquire active modifications
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-6 h-[450px] animate-pulse flex flex-col border border-primary/10">
              <div className="h-8 bg-primary/10 rounded w-2/3 mb-4" />
              <div className="h-10 bg-primary/5 rounded w-1/3 mb-6" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-primary/10 rounded w-full" />
                <div className="h-4 bg-primary/10 rounded w-5/6" />
                <div className="h-4 bg-primary/10 rounded w-4/6" />
              </div>
              <div className="mt-auto space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-12 bg-primary/5 rounded" />
                  <div className="h-12 bg-primary/5 rounded" />
                </div>
                <div className="h-12 bg-primary/20 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 perspective-container">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border border-dashed border-primary/20 rounded-xl bg-primary/5">
          <Package className="w-12 h-12 text-primary/40 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-white font-mono tracking-widest mb-2">NO ACTIVE MODULES</h3>
          <p className="text-gray-500 font-mono text-sm uppercase">Check back later for new enhancements.</p>
        </div>
      )}
    </div>
  );
}
