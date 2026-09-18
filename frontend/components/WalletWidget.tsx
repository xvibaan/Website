"use client";

import React from "react";
import { Wallet, Plus, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function WalletWidget() {
  const { user } = useAuth();
  
  // Note: if user.wallet_balance isn't explicitly provided by your AuthContext yet,
  // we fallback safely. In a production app, we would fetch the wallet directly if missing.
  const balance = (user as any)?.wallet?.balance || 0.00;

  return (
    <div className="glass-card p-8 flex flex-col justify-between relative overflow-hidden group h-full">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-full -z-10 group-hover:bg-primary/20 transition-colors duration-500" />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-slate-800/80 rounded-xl flex items-center justify-center border border-slate-700">
          <Wallet className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-white">My Wallet</h3>
      </div>
      
      <div className="mb-8">
        <p className="text-sm text-slate-400 font-medium mb-1 uppercase tracking-wider">Available Balance</p>
        <h2 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-1">
          <span className="text-primary/70 font-medium">$</span>
          {Number(balance).toFixed(2)}
        </h2>
      </div>
      
      <div className="flex gap-3 mt-auto">
        <button className="flex-1 bg-primary hover:bg-primary-hover text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5">
          <Plus className="w-4 h-4" /> Add Funds
        </button>
        <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-3 px-4 rounded-xl font-medium flex items-center justify-center transition-all border border-slate-700" title="View History">
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
