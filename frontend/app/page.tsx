"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Package, Terminal, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import ProductCard, { Product } from "@/components/ProductCard";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter state
  const [selectedGame, setSelectedGame] = useState<string>("ALL");
  const [selectedDevice, setSelectedDevice] = useState<string>("ALL");

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

  // Compute unique filter options
  const games = ["ALL", ...Array.from(new Set(products.map(p => p.gameName).filter(Boolean)))];
  const devices = ["ALL", "Root", "Non-Root"];

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchGame = selectedGame === "ALL" || p.gameName === selectedGame;
      const matchDevice = selectedDevice === "ALL" || p.deviceType === selectedDevice;
      return matchGame && matchDevice;
    });
  }, [products, selectedGame, selectedDevice]);

  // Dummy leaderboard data
  const topSellers = [
    { username: "GhostKilla", sales: 1250 },
    { username: "NeonNinja", sales: 980 },
    { રૂsername: "CyberPunk", sales: 840 },
    { username: "RootMaster", sales: 710 },
    { username: "ZeroDay", sales: 520 }
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="mb-8 border-b border-primary/20 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white font-mono tracking-widest flex items-center gap-3">
            <Terminal className="w-8 h-8 text-primary" />
            HOST MARKET PLACE
          </h1>
          <p className="mt-2 text-sm text-primary/70 font-mono uppercase tracking-widest">
            Select and acquire active modifications
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <select 
            className="cyber-input !py-2 !w-auto"
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
          >
            {games.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select 
            className="cyber-input !py-2 !w-auto"
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
          >
            {devices.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-6 h-[450px] animate-pulse flex flex-col border border-primary/10">
                  <div className="h-8 bg-primary/10 rounded w-2/3 mb-4" />
                  <div className="h-10 bg-primary/5 rounded w-1/3 mb-6" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-primary/10 rounded w-full" />
                    <div className="h-4 bg-primary/10 rounded w-5/6" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-6 perspective-container">
              {filteredProducts.map((product, i) => (
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
              <p className="text-gray-500 font-mono text-sm uppercase">Try adjusting your filters.</p>
            </div>
          )}
        </div>

        {/* Sidebar / Leaderboard */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 border-primary/30">
            <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-yellow-500" />
              TOP 5 SELLERS
            </h3>
            <div className="space-y-4">
              {topSellers.map((seller, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-primary font-bold text-sm w-4">{i + 1}.</span>
                    <span className="text-white font-mono text-sm truncate">{seller.username || seller.રૂsername}</span>
                  </div>
                  <span className="text-xs text-primary/70">{seller.sales} keys</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
