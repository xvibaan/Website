"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search, ShieldCheck, Zap, Layers } from "lucide-react";
import { useNavigation } from "@/context/NavigationContext";

interface MarketplaceHeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categories: { id: string; name: string }[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
  totalProducts: number;
  badgeText?: string;
  headline?: string;
  description?: string;
}

export default function MarketplaceHero({
  searchQuery,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory,
  totalProducts,
  badgeText,
  headline,
  description,
}: MarketplaceHeroProps) {
  const { contentSettings } = useNavigation();

  const displayBadge = badgeText || contentSettings?.heroBadgeText || "HOST MARKET PLACE";
  const displayHeadline = headline || contentSettings?.heroHeadline || "Choose What You Need";
  const displayDescription =
    description ||
    contentSettings?.heroDescription ||
    "";

  return (
    <div className="relative mb-8 sm:mb-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-[#0f1322]/90 via-[#0a0c16]/80 to-[#080910]/90 backdrop-blur-2xl p-5 sm:p-8 md:p-10 shadow-2xl">
      {/* Background Ambient Lighting and Glow Elements */}
      <div className="absolute -top-32 left-1/4 w-96 h-96 bg-primary/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-96 h-96 bg-secondary/15 rounded-full blur-[140px] pointer-events-none" />

      {/* Floating Micro-Grid Pattern */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-4 sm:space-y-6">
        {/* Top Branding Pill */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2.5 sm:gap-3 px-5 sm:px-8 py-2.5 sm:py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-inner"
        >
          <span className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-primary animate-pulse shrink-0" />
          <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-mono uppercase tracking-wider text-white font-black truncate max-w-[320px] sm:max-w-none">
            {displayBadge}
          </span>
        </motion.div>

        {/* Main Title & Concept */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-2"
        >
          <h1 className="text-xs sm:text-sm md:text-base font-medium text-gray-400 tracking-normal leading-relaxed">
            {displayHeadline}
          </h1>
          {displayDescription && (
            <p className="text-[11px] sm:text-xs md:text-sm text-gray-500 max-w-2xl mx-auto leading-relaxed px-2">
              {displayDescription}
            </p>
          )}
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="max-w-xl mx-auto w-full"
        >
          <div className="relative group">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search packages, features, games..."
              className="w-full h-11 sm:h-12 bg-black/60 border border-white/15 rounded-2xl pl-10 sm:pl-12 pr-12 text-xs sm:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 backdrop-blur-md transition-colors shadow-inner focus-visible:ring-2 focus-visible:ring-primary/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 hover:text-white bg-white/10 px-2 py-0.5 rounded-md focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
              >
                Clear
              </button>
            )}
          </div>
        </motion.div>

        {/* Quick Filter Pills */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 pt-1 sm:pt-2"
        >
          <button
            type="button"
            onClick={() => onSelectCategory("ALL")}
            className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
              selectedCategory === "ALL"
                ? "bg-primary text-black font-bold shadow-[0_0_15px_rgba(0,194,255,0.3)]"
                : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
            }`}
          >
            All ({totalProducts})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCategory(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-mono font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
                selectedCategory === c.id
                  ? "bg-primary text-black font-bold shadow-[0_0_15px_rgba(0,194,255,0.3)]"
                  : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
              }`}
            >
              {c.name}
            </button>
          ))}
        </motion.div>

        {/* Trust & Performance Pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 pt-4 sm:pt-6 border-t border-white/[0.08] max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-400">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" />
            <span>Instant Digital Delivery</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            <span>Verified Products</span>
          </div>
          <div className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-gray-400">
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-secondary shrink-0" />
            <span>Central Wallet Security</span>
          </div>
        </div>
      </div>
    </div>
  );
}
