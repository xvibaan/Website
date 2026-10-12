"use client";

import React, { useState, useEffect, useCallback } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  Wallet,
  QrCode,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Zap,
  PlayCircle,
  ExternalLink,
  Download,
  Copy,
  Check,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import Card3D from "@/components/Card3D";
import { api } from "@/lib/api";

export default function DepositPage() {
  const { user, refreshUser } = useAuth();
  const { contentSettings } = useNavigation();
  const currentBalance = (user as any)?.wallet?.balance || 0.0;

  const [amount, setAmount] = useState<number>(500);
  const [step, setStep] = useState<"AMOUNT" | "RAZORPAY_RESULT">("AMOUNT");
  const [status, setStatus] = useState<"PENDING" | "VERIFYING" | "SUCCESS" | "FAILED" | "CANCELLED">("PENDING");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [minDeposit, setMinDeposit] = useState<number>(10);
  const [paymentTxId, setPaymentTxId] = useState<string | null>(null);

  // Fetch authoritative minimum deposit config from backend
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          if (data.minDeposit?.INR) {
            setMinDeposit(data.minDeposit.INR);
          }
        }
      } catch {
        // Fallback to defaults already set in state
      }
    })();
  }, []);

  const currencySymbol = "₹";
  const quickAmounts = [200, 500, 1000, 2500, 5000];

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleProceed = async () => {
    if (amount >= minDeposit) {
      setStatus("VERIFYING");
      setErrorMessage(null);
      try {
        const res = await api.post("/v1/payments/create", {
          amount: amount.toString(),
          currency: "INR",
          purpose: "WALLET_RECHARGE",
          gateway: "razorpay"
        });

        if (!res.success) throw new Error("Payment creation failed");

        setPaymentTxId(res.paymentTransaction.id);
        const orderId = res.gatewayOrderId;

        const isLoaded = await loadRazorpay();
        if (!isLoaded) throw new Error("Failed to load Razorpay SDK");

        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
          amount: Math.round(amount * 100).toString(),
          currency: "INR",
          name: "Host Market Place",
          description: "Wallet Deposit",
          order_id: orderId,
          handler: async function (response: any) {
             setStep("RAZORPAY_RESULT");
             setStatus("VERIFYING");
             setErrorMessage(null);

             try {
               const verifyRes = await api.post("/v1/payments/verify", {
                 paymentTransactionId: res.paymentTransaction.id,
                 razorpay_order_id: response.razorpay_order_id,
                 razorpay_payment_id: response.razorpay_payment_id,
                 razorpay_signature: response.razorpay_signature,
               });

               if (verifyRes.success && verifyRes.status === "SUCCESS") {
                 await refreshUser();
                 setStatus("SUCCESS");
               } else {
                 setStatus("FAILED");
                 setErrorMessage(verifyRes.message || "Payment verification failed.");
               }
             } catch (verifyErr: any) {
               console.error("Payment verification failed:", verifyErr);
               setStatus("FAILED");
               setErrorMessage(verifyErr.message || "Cryptographic payment verification failed.");
             }
          },
          modal: {
            ondismiss: function () {
              setStatus((current) => {
                if (current === "SUCCESS" || current === "VERIFYING") return current;
                setStep("RAZORPAY_RESULT");
                setErrorMessage("The checkout window was closed before completing payment.");
                return "CANCELLED";
              });
            },
          },
          prefill: {
            email: user?.email || ""
          },
          theme: {
            color: "#00c2ff"
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any){
          setStep("RAZORPAY_RESULT");
          setStatus("FAILED");
          setErrorMessage(response?.error?.description || "Payment failed or was declined.");
        });
        rzp.open();
      } catch (err: any) {
        console.error(err);
        setStep("RAZORPAY_RESULT");
        setStatus("FAILED");
        setErrorMessage(err.message || "Failed to initiate payment.");
      }
    }
  };

  const handleManualVerify = async (txIdToVerify?: string) => {
    const id = typeof txIdToVerify === 'string' ? txIdToVerify : paymentTxId;
    if (!id) return;
    setStatus("VERIFYING");
    try {
      const res = await api.get(`/v1/payments/${id}`);
      if (res.paymentTransaction.status === 'SUCCESS') {
         await refreshUser();
         setStatus("SUCCESS");
      } else if (res.paymentTransaction.status === 'FAILED') {
         setStatus("FAILED");
         setErrorMessage(res.paymentTransaction.failureReason || "Transaction reported failed.");
      } else if (res.paymentTransaction.status === 'CANCELLED') {
         setStatus("CANCELLED");
         setErrorMessage("Transaction was cancelled.");
      } else {
         setStatus("PENDING");
      }
    } catch (e: any) {
      setStatus("FAILED");
      setErrorMessage(e.message || "Status check failed.");
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto py-6 sm:py-8 px-3 sm:px-6 pb-24 space-y-6 sm:space-y-8">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 sm:pb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_20px_rgba(0,194,255,0.2)] shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Deposit Wallet Funds
              </h1>
              <p className="text-xs text-gray-400">
                Instantly credit your Host Market Place digital balance
              </p>
            </div>
          </div>

          {/* Current Balance Tag & Video Guide */}
          <div className="flex flex-wrap items-center gap-3">
            {contentSettings?.globalLinks?.howToDepositUrl && (
              <a
                href={contentSettings.globalLinks.howToDepositUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-mono font-bold transition-colors shadow-[0_0_10px_rgba(0,194,255,0.15)] focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
              >
                <PlayCircle className="w-4 h-4" />
                <span>Watch Deposit Tutorial</span>
                <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
              </a>
            )}

            <div className="flex items-center gap-3 bg-[#0c0e17] border border-white/10 px-4 py-2 min-h-[40px] rounded-xl">
              <span className="text-[11px] font-mono text-gray-400 uppercase">Current:</span>
              <span className="text-base font-bold text-white font-mono">
                ₹{Number(currentBalance).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Digital Card Preview */}
          <div className="md:col-span-1">
            <Card3D depth={9} className="h-full">
              <div className="h-full p-6 rounded-3xl bg-gradient-to-br from-[#12162a] via-[#0c0e18] to-[#080910] border border-white/15 backdrop-blur-2xl flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div
                  className="absolute -top-10 -right-10 w-36 h-36 bg-primary/20 rounded-full blur-2xl pointer-events-none"
                />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-mono text-primary font-bold tracking-widest uppercase">
                      HOST PASS
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>

                  {/* Metallic Chip Visual */}
                  <div className="w-9 h-7 rounded-md bg-amber-400/20 border border-amber-400/40 relative mb-6" />

                  <div className="text-xs text-gray-400 font-mono">Top-up Value</div>
                  <div className="text-3xl font-black text-white font-mono mt-1">
                    ₹{amount}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/[0.08] text-[11px] font-mono text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Gateway:</span>
                    <span className="text-white">Razorpay (India)</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Account:</span>
                    <span className="text-white truncate max-w-[120px]">{user?.email?.split("@")[0]}</span>
                  </div>
                </div>
              </div>
            </Card3D>
          </div>

          {/* Right Column: Interaction Form */}
          <div className="md:col-span-2">
            <div className="rounded-3xl border border-white/10 bg-[#0c0e17]/85 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
              {step === "AMOUNT" ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {/* Amount Input */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">
                      Enter Deposit Amount ({currencySymbol})
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-500 font-mono">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        min={minDeposit}
                        step="1"
                        value={amount}
                        onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                        className="w-full bg-black/60 border border-white/15 rounded-2xl py-3.5 pl-10 pr-4 text-2xl font-bold font-mono text-white focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-primary/60"
                      />
                    </div>

                    {/* Quick Preset Buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {quickAmounts.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setAmount(q)}
                          className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-mono font-semibold transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
                            amount === q
                              ? "bg-primary text-black font-bold"
                              : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          +{currencySymbol}{q}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono mt-2">
                      Minimum required deposit: {currencySymbol}{minDeposit}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleProceed}
                    disabled={amount < minDeposit}
                    className="w-full py-3.5 min-h-[48px] bg-primary hover:bg-primary-hover text-black font-bold text-xs uppercase tracking-wider rounded-2xl transition-colors shadow-[0_0_20px_rgba(0,194,255,0.25)] hover:shadow-[0_0_25px_rgba(0,194,255,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                  >
                    <span>Proceed to Secure Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center text-center space-y-6"
                >
                  <div className="p-6 border border-white/20 bg-white/5 rounded-2xl w-full max-w-sm">
                    {status === "SUCCESS" ? (
                      <div className="flex flex-col items-center text-emerald-400">
                        <CheckCircle className="w-16 h-16 mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Payment Successful</h2>
                        <p className="text-xs text-gray-400">Your wallet has been credited.</p>
                      </div>
                    ) : status === "CANCELLED" ? (
                      <div className="flex flex-col items-center text-amber-400">
                        <AlertTriangle className="w-16 h-16 mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Payment Cancelled</h2>
                        <p className="text-xs text-gray-400">{errorMessage || "The checkout window was closed before completion."}</p>
                      </div>
                    ) : status === "FAILED" ? (
                      <div className="flex flex-col items-center text-red-400">
                        <AlertTriangle className="w-16 h-16 mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Payment Failed</h2>
                        <p className="text-xs text-gray-400">{errorMessage || "The transaction could not be completed."}</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-primary">
                        <RefreshCcw className="w-16 h-16 mb-4 animate-spin" />
                        <h2 className="text-xl font-bold text-white mb-2">Verifying Payment</h2>
                        <p className="text-xs text-gray-400">Cryptographically verifying transaction with server...</p>
                      </div>
                    )}
                  </div>

                  <div className="w-full max-w-sm space-y-4">
                    <button
                      type="button"
                      onClick={() => handleManualVerify()}
                      disabled={status === "VERIFYING" || status === "SUCCESS"}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                    >
                      <RefreshCcw className={`w-4 h-4 ${status === "VERIFYING" ? "animate-spin text-primary" : "text-primary"}`} />
                      <span>Check Status Again</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep("AMOUNT")}
                      className="text-xs text-gray-500 hover:text-white underline underline-offset-4 font-mono block mx-auto focus-visible:ring-2 focus-visible:ring-primary/60 rounded outline-none p-1"
                    >
                      Back to Deposit
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
