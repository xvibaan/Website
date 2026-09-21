"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Package, Terminal, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import ProductCard, { Product } from "@/components/ProductCard";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

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
    { username: "CyberPunk", sales: 840 },
    { username: "RootMaster", sales: 710 },
    { username: "ZeroDay", sales: 520 }
  ];

  return (
    <div className="max-w-7xl mx-auto pb-20">
      
      {/* Header */}
      <div className="mb-8 border-b border-card-border pb-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground font-sans tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-xl border border-primary/20">
              <Terminal className="w-8 h-8 text-primary" />
            </div>
            HOST MARKET PLACE
          </h1>
          <p className="mt-2 text-sm text-muted-foreground font-sans uppercase tracking-widest font-medium">
            Select and acquire active modifications
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <select 
            className="flex h-10 w-auto rounded-md border border-card-border bg-card/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary backdrop-blur-md transition-colors"
            value={selectedGame}
            onChange={(e) => setSelectedGame(e.target.value)}
          >
            {games.map(g => <option key={g} value={g} className="bg-background">{g}</option>)}
          </select>
          <select 
            className="flex h-10 w-auto rounded-md border border-card-border bg-card/50 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary backdrop-blur-md transition-colors"
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
          >
            {devices.map(d => <option key={d} value={d} className="bg-background">{d}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="grid sm:grid-cols-2 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6 h-[450px] flex flex-col border-none bg-card/40">
                  <Skeleton className="h-8 w-2/3 mb-4 rounded-md" />
                  <Skeleton className="h-10 w-1/3 mb-6 rounded-md bg-card-border/30" />
                  <div className="flex-1 space-y-4">
                    <Skeleton className="h-4 w-full rounded-sm" />
                    <Skeleton className="h-4 w-5/6 rounded-sm" />
                  </div>
                </Card>
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
            <div className="text-center py-20 border border-dashed border-card-border/50 rounded-2xl bg-card/20 backdrop-blur-sm">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-foreground font-sans tracking-wide mb-2">NO ACTIVE MODULES</h3>
              <p className="text-muted-foreground font-sans text-sm uppercase font-medium">Try adjusting your filters.</p>
            </div>
          )}
        </div>

        {/* Sidebar / Leaderboard */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 border-primary/20 bg-primary/5">
            <h3 className="text-lg font-bold text-foreground font-sans tracking-wide flex items-center gap-2 mb-6">
              <Trophy className="w-5 h-5 text-yellow-500" />
              TOP 5 SELLERS
            </h3>
            <div className="space-y-5">
              {topSellers.map((seller, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-primary font-bold text-sm w-4 text-right">{i + 1}.</span>
                    <span className="text-foreground font-medium font-sans text-sm truncate">{seller.username}</span>
                  </div>
                  <span className="text-xs text-muted-foreground font-sans font-medium">{seller.sales} keys</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
