"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Bot,
  Server,
  Cpu,
  Gamepad2,
  Gift,
  Code2,
  Terminal,
  Wrench,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import Card3D from "@/components/Card3D";
import { MarketplaceCategory } from "@/lib/categories";

interface Category3DCardProps {
  category: MarketplaceCategory;
  isSelected?: boolean;
  onSelect: (category: MarketplaceCategory) => void;
}

export default function Category3DCard({
  category,
  isSelected = false,
  onSelect,
}: Category3DCardProps) {
  // Render corresponding icon dynamically
  const renderIcon = (name: string, accentColor: string) => {
    if (name && !/^[A-Za-z0-9_-]+$/.test(name)) {
      return <span className="text-2xl sm:text-3xl select-none leading-none">{name}</span>;
    }
    const iconProps = { className: "w-8 h-8", style: { color: accentColor } };
    switch (name) {
      case "Gamepad2":
        return <Gamepad2 {...iconProps} />;
      case "Code2":
        return <Code2 {...iconProps} />;
      case "Gift":
        return <Gift {...iconProps} />;
      case "Bot":
        return <Bot {...iconProps} />;
      case "Server":
        return <Server {...iconProps} />;
      case "Cpu":
        return <Cpu {...iconProps} />;
      case "Wrench":
        return <Wrench {...iconProps} />;
      case "Globe":
        return <Globe {...iconProps} />;
      case "Terminal":
        return <Terminal {...iconProps} />;
      default:
        return <Sparkles {...iconProps} />;
    }
  };

  const { accentColor, gradient, badge, roleLabel } = category.faceVisual;

  return (
    <Card3D
      depth={10}
      className="h-full cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/60 rounded-2xl outline-none"
      onClick={() => onSelect(category)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(category);
        }
      }}
    >
      <div
        className={`h-full p-4 sm:p-6 md:p-7 rounded-2xl flex flex-col justify-between transition-colors duration-200 backdrop-blur-xl border ${
          isSelected
            ? "bg-black/80 border-primary shadow-[0_0_30px_rgba(0,194,255,0.25)]"
            : "bg-[#0c0e17]/80 hover:bg-[#101322]/90 border-white/10 hover:border-white/20"
        }`}
      >
        {/* Ambient Top Glow Layer */}
        <div
          className={`absolute top-0 right-0 w-44 h-44 rounded-full pointer-events-none opacity-20 blur-3xl bg-gradient-to-br ${gradient}`}
        />

        {/* Top Metadata & Visual Face Avatar */}
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 sm:gap-3 mb-4 sm:mb-5">
            {/* Category Avatar Orb (Visual Face) */}
            <div className="relative shrink-0">
              <div
                className="w-13 h-13 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border shadow-xl relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))`,
                  borderColor: isSelected ? accentColor : "rgba(255,255,255,0.12)",
                }}
              >
                {/* Internal Holographic Grid Reflection */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `radial-gradient(circle at 50% 50%, ${accentColor} 1px, transparent 1px)`,
                    backgroundSize: "8px 8px",
                  }}
                />
                {renderIcon(category.iconName, accentColor)}
              </div>

              {/* Floating Status Ring Indicator */}
              <div
                className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-[#0c0e17] flex items-center justify-center shadow-md"
                style={{ backgroundColor: accentColor }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              </div>
            </div>

            {/* Role Badge and Availability */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span
                className="text-[9px] sm:text-[10px] font-mono tracking-widest uppercase font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border shadow-sm"
                style={{
                  color: accentColor,
                  borderColor: `${accentColor}40`,
                  backgroundColor: `${accentColor}15`,
                }}
              >
                {badge}
              </span>
              <span className="text-[10px] sm:text-[11px] text-gray-400 font-sans flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                Verified
              </span>
            </div>
          </div>

          {/* Title & Role Representation */}
          <div className="mb-2 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center justify-between group-hover:text-primary transition-colors truncate">
              {category.name}
            </h3>
            <p className="text-[11px] sm:text-xs font-mono text-gray-400 mt-0.5 truncate" style={{ color: `${accentColor}cc` }}>
              {roleLabel}
            </p>
          </div>

          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-4">
            {category.description}
          </p>
        </div>

        {/* Bottom Metrics & Action Button */}
        <div className="pt-4 border-t border-white/[0.08] relative z-10 flex items-center justify-between mt-auto">
          <div>
            {category.productCount > 0 ? (
              <>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-sans">
                  Starting From
                </span>
                <div className="text-base font-bold text-white flex items-baseline gap-1">
                  <span className="text-xs font-normal text-gray-400">₹</span>
                  {category.minPrice.toFixed(0)}
                  <span className="text-[11px] text-gray-500 font-normal ml-1">
                    ({category.productCount} {category.productCount === 1 ? "item" : "items"})
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="text-[10px] text-gray-500 uppercase tracking-wider block font-sans">
                  Availability
                </span>
                <div className="text-xs font-medium text-gray-400 flex items-center gap-1.5 mt-0.5">
                  <span>Catalog Restock Soon</span>
                </div>
              </>
            )}
          </div>

          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-colors ${
              isSelected
                ? "bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,194,255,0.4)]"
                : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Card3D>
  );
}
