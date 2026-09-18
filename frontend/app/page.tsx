"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, Code2, Package, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";
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
      <div className="text-center max-w-5xl mx-auto mb-28 relative">
        {/* Floating 3D orbs */}
        <div className="orb w-72 h-72 bg-primary/30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-float" />
        <div className="orb w-48 h-48 bg-secondary/20 -top-10 -right-10 animate-float-delayed" />
        <div className="orb w-36 h-36 bg-accent/15 -bottom-10 -left-10 animate-float-slow" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8 border"
            style={{ background: "rgba(124, 58, 237, 0.1)", borderColor: "rgba(124, 58, 237, 0.2)", color: "#a78bfa" }}>
            <Zap className="w-4 h-4" />
            Instant Digital Delivery Platform
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-white mb-8 leading-[1.05]">
            Your Digital
            <br />
            <span className="shimmer-text">Market Place</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Premium software licenses, API keys, and digital goods delivered
            instantly. Fund your wallet and checkout in milliseconds.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <motion.a
              href="#marketplace"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="glass-btn text-base flex items-center justify-center gap-2 !px-8 !py-4 !rounded-xl"
            >
              Explore Marketplace <ArrowRight className="w-5 h-5" />
            </motion.a>
            <motion.a
              href="/dashboard"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="px-8 py-4 rounded-xl font-medium text-white transition-all border flex items-center justify-center gap-2"
              style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)" }}
            >
              Instant Wallet Recharge
            </motion.a>
          </div>
        </motion.div>
      </div>

      {/* Trust Strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, staggerChildren: 0.1 }}
        viewport={{ once: true }}
        className="grid md:grid-cols-3 gap-6 mb-32 max-w-5xl mx-auto perspective-container"
      >
        {[
          { icon: <Zap className="w-6 h-6 text-emerald-400" />, bg: "rgba(16, 185, 129, 0.1)", title: "Instant Delivery", desc: "Keys dispatched immediately" },
          { icon: <ShieldCheck className="w-6 h-6 text-primary" />, bg: "rgba(124, 58, 237, 0.1)", title: "100% Secure", desc: "Atomic wallet transactions" },
          { icon: <Code2 className="w-6 h-6 text-secondary" />, bg: "rgba(6, 182, 212, 0.1)", title: "API Ready", desc: "Built for seamless resale" },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.15 }}
            viewport={{ once: true }}
            className="glass-card tilt-card glow-border p-6 flex items-center gap-4"
          >
            <div className="p-3 rounded-xl" style={{ background: item.bg }}>
              {item.icon}
            </div>
            <div>
              <h4 className="text-white font-semibold">{item.title}</h4>
              <p className="text-sm text-slate-400">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Featured Products Grid */}
      <div id="marketplace" className="scroll-mt-24">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex items-center justify-between mb-10"
        >
          <h2 className="text-3xl font-bold text-white">Featured Products</h2>
          <div className="h-px flex-1 ml-8"
            style={{ background: "linear-gradient(to right, rgba(124, 58, 237, 0.4), transparent)" }} />
        </motion.div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-6 h-[400px] animate-pulse flex flex-col">
                <div className="flex justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl" style={{ background: "rgba(124, 58, 237, 0.1)" }} />
                  <div className="w-20 h-8 rounded-lg" style={{ background: "rgba(124, 58, 237, 0.1)" }} />
                </div>
                <div className="w-3/4 h-6 rounded mb-2" style={{ background: "rgba(124, 58, 237, 0.1)" }} />
                <div className="w-full h-4 rounded mb-6" style={{ background: "rgba(124, 58, 237, 0.05)" }} />
                <div className="mt-auto space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-10 rounded-lg" style={{ background: "rgba(124, 58, 237, 0.08)" }} />
                    <div className="h-10 rounded-lg" style={{ background: "rgba(124, 58, 237, 0.08)" }} />
                  </div>
                  <div className="h-12 rounded-xl" style={{ background: "rgba(124, 58, 237, 0.1)" }} />
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
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <ProductCard product={product} />
              </motion.div>
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
