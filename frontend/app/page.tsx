"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Code2, Package, ShieldCheck, Zap } from "lucide-react";
import ProductCard, { Product } from "@/components/ProductCard";
import { api } from "@/lib/api";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const data = await api.get<Product[]>("/v1/products/");
        setProducts(data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchProducts();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto mb-20 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 blur-3xl rounded-full -z-10" />
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Instant Delivery. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
            Secure Digital Assets.
          </span>
        </h1>
        <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          The premium marketplace for software licenses, API keys, and digital goods. 
          Fund your wallet and checkout in milliseconds with zero friction.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <a href="#marketplace" className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-full font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5">
            Explore Marketplace <ArrowRight className="w-5 h-5" />
          </a>
          <a href="/dashboard" className="glass-card hover:bg-slate-800/80 text-white px-8 py-4 rounded-full font-medium transition-all hover:-translate-y-0.5 border-slate-700">
            Instant Wallet Recharge
          </a>
        </div>
      </div>

      {/* Trust Strip */}
      <div className="grid md:grid-cols-3 gap-6 mb-32 max-w-5xl mx-auto">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-emerald-500/10 p-3 rounded-xl">
            <Zap className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h4 className="text-white font-semibold">Instant Delivery</h4>
            <p className="text-sm text-slate-400">Keys dispatched immediately</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="text-white font-semibold">100% Secure</h4>
            <p className="text-sm text-slate-400">Atomic wallet transactions</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="bg-purple-500/10 p-3 rounded-xl">
            <Code2 className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h4 className="text-white font-semibold">API Ready</h4>
            <p className="text-sm text-slate-400">Built for seamless resale</p>
          </div>
        </div>
      </div>

      {/* Featured Products Grid */}
      <div id="marketplace" className="scroll-mt-24">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-3xl font-bold text-white">Featured Products</h2>
          <div className="h-px bg-gradient-to-r from-primary/50 to-transparent flex-1 ml-8" />
        </div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 h-[400px] animate-pulse flex flex-col">
                <div className="flex justify-between mb-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl" />
                  <div className="w-20 h-8 bg-slate-800 rounded-lg" />
                </div>
                <div className="w-3/4 h-6 bg-slate-800 rounded mb-2" />
                <div className="w-full h-4 bg-slate-800 rounded mb-6" />
                <div className="mt-auto space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-10 bg-slate-800 rounded-lg" />
                    <div className="h-10 bg-slate-800 rounded-lg" />
                  </div>
                  <div className="h-12 bg-slate-800 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 glass-card">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">No Products Available</h3>
            <p className="text-slate-400">Check back later for new digital assets.</p>
          </div>
        )}
      </div>
    </div>
  );
}
