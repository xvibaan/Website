"use client";

import React, { useState } from "react";
import { ShoppingCart, Video, MessageSquare, AlertTriangle } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export interface Product {
  id: string | number;
  title: string;
  basePrice: number;
  margin: number;
  features: string[];
  setupLink: string;
  feedbackLink: string;
  isArchived: boolean;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const [isBuying, setIsBuying] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Framer motion 3D effect values
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  const finalPrice = product.basePrice + product.margin;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleBuy = async () => {
    setIsBuying(true);
    setPurchaseSuccess(false);

    // Simulate purchase
    setTimeout(() => {
      setPurchaseSuccess(true);
      setIsBuying(false);
      setTimeout(() => setPurchaseSuccess(false), 3000);
      alert(`Purchase simulation successful for ${product.title}`);
    }, 1500);
  };

  return (
    <div style={{ perspective: "1000px" }} className="h-full">
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="glass-card glow-border p-6 flex flex-col group h-full relative"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4" style={{ transform: "translateZ(30px)" }}>
          <h3 className="text-xl font-bold text-white font-mono uppercase tracking-wider group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          {product.isArchived ? (
            <span className="badge-archived flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> ARCHIVED
            </span>
          ) : (
            <span className="badge-active">ACTIVE</span>
          )}
        </div>

        {/* Pricing */}
        <div className="mb-4" style={{ transform: "translateZ(40px)" }}>
          <div className="flex items-end gap-1">
            <span className="text-sm text-primary font-mono">₹</span>
            <span className="text-3xl font-bold text-white shadow-neon drop-shadow-md">
              {finalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Features List */}
        <div className="flex-1 mb-6" style={{ transform: "translateZ(20px)" }}>
          {product.features && product.features.length > 0 ? (
            <ul className="space-y-2">
              {product.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-300 font-mono">
                  <span className="text-primary mt-0.5">›</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-gray-600 font-mono italic">No module data provided.</p>
          )}
        </div>

        {/* External Links */}
        <div className="grid grid-cols-2 gap-3 mb-4" style={{ transform: "translateZ(30px)" }}>
          <a
            href={product.setupLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="cyber-btn-outline !py-2 !px-2 flex flex-col items-center justify-center gap-1 text-[10px] text-center leading-tight hover:text-white"
          >
            <Video className="w-4 h-4" />
            <span>CHECK VIDEO /<br />UPDATE FILE</span>
          </a>

          <a
            href={product.feedbackLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="cyber-btn-outline !py-2 !px-2 flex flex-col items-center justify-center gap-1 text-[10px] text-center leading-tight hover:text-white"
          >
            <MessageSquare className="w-4 h-4" />
            <span>CHECK<br />FEEDBACK</span>
          </a>
        </div>

        {/* Purchase */}
        <div className="pt-2" style={{ transform: "translateZ(40px)" }}>
          <button
            onClick={handleBuy}
            disabled={isBuying || purchaseSuccess || product.isArchived}
            className={`w-full py-3 px-4 rounded font-mono text-sm tracking-wider flex items-center justify-center gap-2 transition-all duration-300 ${
              purchaseSuccess
                ? "bg-green-500/20 text-green-400 border border-green-500/50"
                : product.isArchived
                ? "bg-gray-900 text-gray-600 border border-gray-800 cursor-not-allowed"
                : "cyber-btn"
            }`}
          >
            {isBuying ? (
              <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> EXECUTING...</>
            ) : purchaseSuccess ? (
              <>GRANTED</>
            ) : (
              <><ShoppingCart className="w-4 h-4" /> PURCHASE KEY</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
