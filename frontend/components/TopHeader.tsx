"use client";

import { useAuth } from "@/context/AuthContext";
import { BookOpen, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

export default function TopHeader() {
  const { user } = useAuth();
  const balance = (user as any)?.wallet?.balance || 0.00;

  return (
    <header className="h-20 bg-background/50 backdrop-blur-xl border-b border-glass-border sticky top-0 z-10 flex items-center justify-between px-8">
      
      {/* Decorative left element */}
      <div className="hidden md:flex items-center gap-2">
        <div className="w-1 h-6 bg-primary rounded-full" />
        <div className="w-1 h-4 bg-primary/60 rounded-full" />
        <div className="w-1 h-2 bg-primary/30 rounded-full" />
        <span className="ml-2 text-xs font-sans font-medium text-muted-foreground tracking-wide hidden lg:block">
          Managed by Host
        </span>
      </div>

      <div className="flex flex-1 md:flex-none items-center justify-end gap-6">
        {/* Balance Display */}
        <div className="flex items-center gap-4 bg-card border border-card-border shadow-sm px-4 py-2 rounded-lg backdrop-blur-md">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-muted-foreground font-sans font-semibold tracking-widest uppercase">Available Balance</span>
            <span className="text-lg font-bold text-foreground font-mono flex items-center gap-1">
              <span className="text-primary">₹</span>
              {Number(balance).toFixed(2)}
            </span>
          </div>
          <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
        </div>

        {/* Global How to Buy Button */}
        <motion.a
          href="/how-to-buy"
          whileHover={{ scale: 1.02, translateY: -2 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-background hover:bg-primary-hover shadow-[0_0_15px_rgba(0,194,255,0.3)] rounded-lg font-semibold tracking-wide transition-all text-sm"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">User Guide</span>
          <span className="sm:hidden">Guide</span>
        </motion.a>
      </div>
    </header>
  );
}
