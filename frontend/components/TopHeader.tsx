"use client";

import { useAuth } from "@/context/AuthContext";
import { BookOpen, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

export default function TopHeader() {
  const { user } = useAuth();
  const balance = (user as any)?.wallet?.balance || 0.00;

  return (
    <header className="h-20 bg-black/80 backdrop-blur-md border-b border-primary/20 sticky top-0 z-10 flex items-center justify-between px-8">
      
      {/* Decorative left element */}
      <div className="hidden md:flex items-center gap-2">
        <div className="w-1 h-6 bg-primary" />
        <div className="w-1 h-4 bg-primary/60" />
        <div className="w-1 h-2 bg-primary/30" />
        <span className="ml-2 text-xs font-mono text-primary/50 tracking-widest hidden lg:block">
          SYS_READY // SECURE_CONN
        </span>
      </div>

      <div className="flex flex-1 md:flex-none items-center justify-end gap-6 w-full">
        {/* Balance Display */}
        <div className="flex items-center gap-4 bg-primary/5 border border-primary/30 px-4 py-2 rounded">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-primary/70 font-mono tracking-widest">AVAILABLE BALANCE</span>
            <span className="text-lg font-bold text-white font-mono flex items-center gap-1">
              <span className="text-primary">₹</span>
              {Number(balance).toFixed(2)}
            </span>
          </div>
          <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
        </div>

        {/* Global How to Buy Button */}
        <motion.a
          href="/how-to-buy" // Placeholder route, can be a modal or external link
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="cyber-btn flex items-center gap-2 !py-3"
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">HOW TO BUY AND HOW TO USE</span>
          <span className="sm:hidden">GUIDE</span>
        </motion.a>
      </div>
    </header>
  );
}
