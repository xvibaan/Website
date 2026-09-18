"use client";

import React from "react";
import { Wallet, Plus, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function WalletWidget() {
  const { user } = useAuth();
  const balance = (user as any)?.wallet?.balance || 0.00;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card glow-border p-8 flex flex-col justify-between relative overflow-hidden h-full group"
    >
      {/* Animated gradient corner accent */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-20 group-hover:opacity-40 transition-opacity duration-700 pointer-events-none"
        style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }} />

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
          style={{ background: "rgba(124, 58, 237, 0.1)", borderColor: "rgba(124, 58, 237, 0.2)" }}>
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-white">My Wallet</h3>
      </div>

      <div className="mb-8 relative z-10">
        <p className="text-xs text-slate-500 font-medium mb-1.5 uppercase tracking-wider">Available Balance</p>
        <h2 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-1">
          <span className="text-primary/70 font-medium text-2xl">$</span>
          {Number(balance).toFixed(2)}
        </h2>
      </div>

      <div className="flex gap-3 mt-auto relative z-10">
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="flex-1 glass-btn flex items-center justify-center gap-2 !py-3"
        >
          <Plus className="w-4 h-4" /> Add Funds
        </motion.button>
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.98 }}
          className="px-4 py-3 rounded-xl font-medium flex items-center justify-center transition-all border"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)", color: "#94a3b8" }}
          title="View History"
        >
          <ArrowUpRight className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  );
}
