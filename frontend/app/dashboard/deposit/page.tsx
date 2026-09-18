"use client";

import React, { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Wallet, QrCode, RefreshCcw, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function DepositPage() {
  const [amount, setAmount] = useState<number>(500);
  const [method, setMethod] = useState<"UPI" | "BINANCE">("UPI");
  const [step, setStep] = useState<"AMOUNT" | "PAYMENT">("AMOUNT");
  const [status, setStatus] = useState<"PENDING" | "VERIFYING" | "SUCCESS" | "FAILED">("PENDING");

  const handleProceed = () => {
    if (amount >= 100) {
      setStep("PAYMENT");
      setStatus("PENDING");
      // Background auto-checker simulation
      setTimeout(() => {
        if (status === "PENDING") {
          // just a mock timeout log
          console.log("Background poller checking...");
        }
      }, 5000);
    }
  };

  const handleManualVerify = () => {
    setStatus("VERIFYING");
    setTimeout(() => {
      // 80% chance of success for mock
      const isSuccess = Math.random() > 0.2;
      setStatus(isSuccess ? "SUCCESS" : "FAILED");
    }, 1500);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-white font-mono uppercase tracking-widest">ADD FUNDS</h1>
            </div>
            
            {/* Dynamic Admin Settings driven link mockup */}
            <a href="#" className="cyber-btn-outline !py-2 !px-4 flex items-center gap-2 text-xs">
              <ExternalLink className="w-4 h-4" /> HOW TO DEPOSIT
            </a>
          </div>

          <div className="glass-card p-8 border-primary/20">
            {step === "AMOUNT" ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div>
                  <label className="block text-xs font-mono text-primary/70 tracking-widest mb-2">SELECT PAYMENT METHOD</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setMethod("UPI")}
                      className={`p-4 border rounded transition-all font-mono font-bold tracking-wider ${method === "UPI" ? "border-primary bg-primary/10 text-primary" : "border-gray-800 text-gray-500 hover:text-white"}`}
                    >
                      INSTANT UPI (INDIA)
                    </button>
                    <button 
                      onClick={() => setMethod("BINANCE")}
                      className={`p-4 border rounded transition-all font-mono font-bold tracking-wider ${method === "BINANCE" ? "border-primary bg-primary/10 text-primary" : "border-gray-800 text-gray-500 hover:text-white"}`}
                    >
                      BINANCE / USDT (GLOBAL)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-primary/70 tracking-widest mb-2">AMOUNT TO DEPOSIT (₹)</label>
                  <input 
                    type="number" 
                    min="100"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="cyber-input text-2xl font-bold"
                  />
                  <p className="text-[10px] text-gray-500 font-mono mt-2">Minimum deposit: ₹100</p>
                </div>

                <button onClick={handleProceed} className="cyber-btn w-full !py-4 text-lg mt-4">
                  GENERATE PAYMENT QR
                </button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-center space-y-6">
                <h2 className="text-xl font-bold text-white font-mono uppercase tracking-widest">
                  SCAN TO PAY ₹{amount}
                </h2>
                
                <div className="w-64 h-64 bg-white p-4 rounded-xl flex items-center justify-center relative">
                  {/* Mock QR Code */}
                  <QrCode className="w-full h-full text-black" />
                  
                  {status === "SUCCESS" && (
                    <div className="absolute inset-0 bg-green-500/90 rounded-xl flex flex-col items-center justify-center text-white p-4 backdrop-blur-sm">
                      <CheckCircle className="w-16 h-16 mb-2" />
                      <p className="font-bold font-mono">PAYMENT VERIFIED</p>
                    </div>
                  )}
                </div>

                <div className="w-full max-w-sm space-y-4">
                  {status === "FAILED" && (
                    <div className="p-3 border border-red-500/50 bg-red-500/10 text-red-500 font-mono text-xs flex items-center justify-center gap-2 rounded">
                      <AlertTriangle className="w-4 h-4" /> VERIFICATION FAILED. TRY AGAIN OR WAIT.
                    </div>
                  )}

                  <p className="text-xs text-gray-400 font-mono uppercase leading-relaxed">
                    System is actively checking for your payment in the background.<br/>
                    <span className="text-primary">No manual UTR required.</span>
                  </p>

                  <button 
                    onClick={handleManualVerify} 
                    disabled={status === "VERIFYING" || status === "SUCCESS"}
                    className="cyber-btn-outline w-full flex items-center justify-center gap-2"
                  >
                    {status === "VERIFYING" ? (
                      <><RefreshCcw className="w-4 h-4 animate-spin" /> VERIFYING...</>
                    ) : (
                      <><RefreshCcw className="w-4 h-4" /> CHECK STATUS MANUALLY</>
                    )}
                  </button>

                  <button onClick={() => setStep("AMOUNT")} className="text-xs text-gray-500 hover:text-white font-mono underline underline-offset-4 mt-4 inline-block">
                    CANCEL / CHANGE AMOUNT
                  </button>
                </div>
              </motion.div>
            )}
          </div>
          
        </div>
      </div>
    </ProtectedRoute>
  );
}
