"use client";

import React from "react";
import { Wallet, Plus, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";

export default function WalletWidget() {
  const { user } = useAuth();
  const balance = (user as any)?.wallet?.balance || 0.00;

  return (
    <Card className="p-8 flex flex-col justify-between relative overflow-hidden h-full group">
      {/* Animated gradient corner accent */}
      <div className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-10 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none"
        style={{ background: "linear-gradient(135deg, #7B61FF, #00C2FF)" }} />

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center border"
          style={{ background: "rgba(123, 97, 255, 0.1)", borderColor: "rgba(123, 97, 255, 0.2)" }}>
          <Wallet className="w-5 h-5 text-secondary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">My Wallet</h3>
      </div>

      <div className="mb-8 relative z-10">
        <p className="text-xs text-muted-foreground font-sans font-semibold mb-1.5 uppercase tracking-wider">Available Balance</p>
        <h2 className="text-4xl font-extrabold text-foreground tracking-tight flex items-center gap-1 font-mono">
          <span className="text-primary/70 font-medium text-2xl">₹</span>
          {Number(balance).toFixed(2)}
        </h2>
      </div>

      <div className="flex gap-3 mt-auto relative z-10">
        <Button variant="primary" className="flex-1 py-6 shadow-neon">
          <Plus className="w-4 h-4 mr-2" /> Add Funds
        </Button>
        <Button variant="secondary" size="icon" className="h-[52px] w-[52px] shrink-0">
          <ArrowUpRight className="w-5 h-5" />
        </Button>
      </div>
    </Card>
  );
}
