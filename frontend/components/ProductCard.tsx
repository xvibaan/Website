"use client";

import React, { useState } from "react";
import { ShoppingCart, Video, MessageSquare, AlertTriangle } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { Card } from "./ui/Card";

export interface Product {
  id: string | number;
  title: string;
  gameName?: string;
  deviceType?: string;
  cheatStatus?: string;
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

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

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
        className="rounded-2xl border border-card-border bg-card shadow-sm backdrop-blur-xl p-6 flex flex-col group h-full relative transition-all hover:border-primary/50"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4" style={{ transform: "translateZ(20px)" }}>
          <div>
            <h3 className="text-xl font-bold text-foreground font-sans tracking-wide group-hover:text-primary transition-colors">
              {product.title}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              {product.gameName && <Badge variant="secondary" className="text-[10px] py-0">{product.gameName}</Badge>}
              {product.deviceType && <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">{product.deviceType}</Badge>}
            </div>
          </div>
          
          {product.isArchived ? (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> ARCHIVED
            </Badge>
          ) : (
            <Badge 
              variant={product.cheatStatus === 'UPDATING' ? 'secondary' : product.cheatStatus === 'RISK' ? 'destructive' : 'success'}
              className="flex items-center gap-1"
            >
              <span className={`w-2 h-2 rounded-full ${
                product.cheatStatus === 'UPDATING' ? 'bg-yellow-500' : 
                product.cheatStatus === 'RISK' ? 'bg-red-500' : 'bg-green-500'
              }`} />
              {product.cheatStatus || 'UNDETECTED'}
            </Badge>
          )}
        </div>

        {/* Pricing */}
        <div className="mb-4" style={{ transform: "translateZ(30px)" }}>
          <div className="flex items-end gap-1">
            <span className="text-sm text-muted-foreground font-sans font-medium mb-1">₹</span>
            <span className="text-3xl font-extrabold text-foreground drop-shadow-md">
              {finalPrice.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Features List */}
        <div className="flex-1 mb-6" style={{ transform: "translateZ(10px)" }}>
          {product.features && product.features.length > 0 ? (
            <ul className="space-y-2">
              {product.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground font-sans">
                  <span className="text-primary mt-0.5 font-bold">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground/60 font-sans italic">No module data provided.</p>
          )}
        </div>

        {/* External Links */}
        <div className="grid grid-cols-2 gap-3 mb-4" style={{ transform: "translateZ(20px)" }}>
          <Button
            variant="outline"
            size="sm"
            className="flex flex-col h-auto py-2 items-center justify-center gap-1 text-[10px] text-center leading-tight hover:text-foreground"
            onClick={() => window.open(product.setupLink || "#", "_blank")}
          >
            <Video className="w-4 h-4" />
            <span>VIDEO GUIDES</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex flex-col h-auto py-2 items-center justify-center gap-1 text-[10px] text-center leading-tight hover:text-foreground"
            onClick={() => window.open(product.feedbackLink || "#", "_blank")}
          >
            <MessageSquare className="w-4 h-4" />
            <span>FEEDBACK</span>
          </Button>
        </div>

        {/* Purchase */}
        <div className="pt-2" style={{ transform: "translateZ(30px)" }}>
          <Button
            onClick={handleBuy}
            disabled={isBuying || purchaseSuccess || product.isArchived}
            variant={purchaseSuccess ? "outline" : "primary"}
            className="w-full text-sm tracking-widest font-bold uppercase py-6"
          >
            {isBuying ? (
              <><div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin mr-2" /> EXECUTING...</>
            ) : purchaseSuccess ? (
              <><span className="text-green-500">ACCESS GRANTED</span></>
            ) : (
              <><ShoppingCart className="w-4 h-4 mr-2" /> PURCHASE KEY</>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
