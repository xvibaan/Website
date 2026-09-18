"use client";

import React, { useState, useEffect } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Key, Clock, Copy, CheckCircle } from "lucide-react";

interface KeyData {
  id: string;
  productName: string;
  keyValue: string;
  expiryTime: number; // timestamp
}

export default function MyKeysPage() {
  const [keys, setKeys] = useState<KeyData[]>([
    { id: "1", productName: "Apex Legends Spoofer", keyValue: "APEX-XYZ1-2345-ABCD", expiryTime: Date.now() + 86400000 * 3 }, // 3 days
    { id: "2", productName: "Valorant Aimbot + ESP", keyValue: "VAL-9876-QWER-TYUI", expiryTime: Date.now() + 3600000 * 5 }, // 5 hours
  ]);

  const [copied, setCopied] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCopy = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatTimeLeft = (expiry: number) => {
    const diff = expiry - now;
    if (diff <= 0) return "EXPIRED";
    
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);
    
    return `${d}d ${h}h ${m}m ${s}s`;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-white font-mono uppercase tracking-widest">MY KEYS</h1>
          </div>

          <div className="grid gap-6">
            {keys.map((k) => (
              <div key={k.id} className="glass-card p-6 border-primary/20 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex-1 w-full">
                  <h3 className="text-xl font-bold text-white font-mono uppercase tracking-wider mb-2">{k.productName}</h3>
                  <div className="flex items-center gap-2">
                    <code className="bg-black/50 text-primary border border-primary/30 px-3 py-1.5 rounded font-mono text-sm tracking-widest flex-1">
                      {k.keyValue}
                    </code>
                    <button 
                      onClick={() => handleCopy(k.keyValue)}
                      className="p-2 border border-primary/30 text-primary hover:bg-primary/10 rounded transition-colors"
                    >
                      {copied === k.keyValue ? <CheckCircle className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex flex-col items-end w-full md:w-auto">
                  <span className="text-xs text-primary/70 font-mono tracking-widest uppercase mb-1">Time Remaining</span>
                  <div className={`flex items-center gap-2 text-xl font-mono font-bold ${k.expiryTime < now ? 'text-red-500' : 'text-white'}`}>
                    <Clock className="w-5 h-5 text-secondary" />
                    {formatTimeLeft(k.expiryTime)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
        </div>
      </div>
    </ProtectedRoute>
  );
}
