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
import QRCode from "qrcode";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import Card3D from "@/components/Card3D";
import { api } from "@/lib/api";

export default function DepositPage() {
  const { user, refreshUser } = useAuth();
  const { contentSettings } = useNavigation();
  const currentBalance = (user as any)?.wallet?.balance || 0.0;

  const [amount, setAmount] = useState<number>(500);
  const [step, setStep] = useState<"AMOUNT" | "PAYMENT" | "RAZORPAY_RESULT">("AMOUNT");
  const [status, setStatus] = useState<"PENDING" | "VERIFYING" | "SUCCESS" | "FAILED">("PENDING");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
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
  const upiId = "hostpanal@upi";
  const paymentTarget = upiId;

  const generateQRCode = useCallback(async () => {
    try {
      const payload = `upi://pay?pa=${upiId}&pn=HostMarketPlace&am=${amount}&cu=INR&tn=HostMarketPlace-Deposit`;

      const url = await QRCode.toDataURL(payload, {
        width: 600,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error("Failed to generate QR code:", err);
    }
  }, [amount]);

  useEffect(() => {
    if (step === "PAYMENT") {
      generateQRCode();
    }
  }, [step, generateQRCode]);

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    setIsDownloading(true);
    try {
      // Create offscreen canvas for a high-res branded card for scanning
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const qrImg = new Image();

      qrImg.onload = () => {
        canvas.width = 640;
        canvas.height = 760;

        if (ctx) {
          // Background
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Header border & title
          ctx.fillStyle = "#0a0c16";
          ctx.fillRect(0, 0, canvas.width, 90);

          ctx.fillStyle = "#00c2ff";
          ctx.font = "bold 24px monospace";
          ctx.textAlign = "center";
          ctx.fillText("HOST MARKET PLACE", canvas.width / 2, 40);

          ctx.fillStyle = "#ffffff";
          ctx.font = "14px sans-serif";
          ctx.fillText("Official Instant Deposit QR Code", canvas.width / 2, 68);

          // Draw QR Image
          ctx.drawImage(qrImg, 80, 110, 480, 480);

          // Footer info box
          ctx.fillStyle = "#f3f4f6";
          ctx.fillRect(40, 610, canvas.width - 80, 110);
          ctx.strokeStyle = "#e5e7eb";
          ctx.strokeRect(40, 610, canvas.width - 80, 110);

          ctx.fillStyle = "#111827";
          ctx.font = "bold 20px monospace";
          ctx.fillText(`Amount to Pay: ₹${amount}`, canvas.width / 2, 648);

          ctx.fillStyle = "#4b5563";
          ctx.font = "14px monospace";
          ctx.fillText(`UPI ID: ${upiId}`, canvas.width / 2, 680);

          ctx.font = "12px sans-serif";
          ctx.fillStyle = "#9ca3af";
          ctx.fillText("Scan with any UPI App", canvas.width / 2, 705);

          const finalDataUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = finalDataUrl;
          link.download = `host-marketplace-deposit-qr-${amount}inr.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        setIsDownloading(false);
      };

      qrImg.src = qrDataUrl;
    } catch {
      // Fallback to direct QR data URL download
      const link = document.createElement("a");
      link.href = qrDataUrl;
      link.download = `host-marketplace-deposit-qr-${amount}inr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsDownloading(false);
    }
  };

  const handleCopyTarget = () => {
    navigator.clipboard.writeText(paymentTarget);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

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
          handler: function (response: any) {
             setStep("RAZORPAY_RESULT");
             setStatus("VERIFYING");
             handleManualVerify(res.paymentTransaction.id);
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
        });
        rzp.open();
      } catch (err) {
        console.error(err);
        setStep("PAYMENT");
        setStatus("PENDING");
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
      } else if (res.paymentTransaction.status === 'FAILED' || res.paymentTransaction.status === 'CANCELLED') {
         setStatus("FAILED");
      } else {
         setStatus("PENDING");
      }
    } catch {
      setStatus("FAILED");
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
                    <span className="text-white">Instant UPI (India)</span>
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
                    <span>Generate Secure Payment QR</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : step === "PAYMENT" ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center text-center space-y-6"
                >
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      Scan QR Code to Pay ₹{amount}
                    </h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Scan with any UPI app on your phone
                    </p>
                  </div>

                  {/* QR Code Presentation */}
                  <div className="flex flex-col items-center gap-3">
                    <div className="relative w-64 h-64 bg-white p-4 rounded-2xl shadow-2xl flex items-center justify-center border border-white/20">
                      {qrDataUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={qrDataUrl}
                          alt={`QR Code to pay ₹${amount} via UPI`}
                          className="w-full h-full object-contain rounded-lg"
                        />
                      ) : (
                        <QrCode className="w-full h-full text-black animate-pulse" />
                      )}

                      {status === "SUCCESS" && (
                        <div className="absolute inset-0 bg-emerald-600/95 rounded-2xl flex flex-col items-center justify-center text-white p-4 backdrop-blur-sm">
                          <CheckCircle className="w-16 h-16 mb-2" />
                          <p className="font-bold text-sm tracking-wide">PAYMENT CONFIRMED</p>
                          <p className="text-[11px] opacity-80 mt-1">Funds credited to wallet</p>
                        </div>
                      )}
                    </div>

                    {/* Download & Copy Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-2 w-full max-w-xs">
                      <button
                        type="button"
                        onClick={handleDownloadQR}
                        disabled={!qrDataUrl || isDownloading}
                        className="flex-1 py-2.5 px-3 min-h-[44px] rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(0,194,255,0.15)] flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span>{isDownloading ? "Downloading..." : "Download QR Code"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyTarget}
                        className="py-2.5 px-3 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-mono transition-colors flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                        title="Copy UPI ID"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 shrink-0" />
                            <span>Copy UPI</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="w-full max-w-sm space-y-4">
                    {status === "FAILED" && (
                      <div className="p-3 border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center justify-center gap-2 rounded-xl">
                        <AlertTriangle className="w-4 h-4" /> Verification pending. Try checking again.
                      </div>
                    )}

                    <p className="text-xs text-gray-400 leading-relaxed">
                      Continuous background listener is active. <br />
                      <span className="text-primary font-semibold">Instant auto-credit upon receipt.</span>
                    </p>

                    <button
                      type="button"
                      onClick={() => handleManualVerify()}
                      disabled={status === "VERIFYING" || status === "SUCCESS"}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                    >
                      {status === "VERIFYING" ? (
                        <>
                          <RefreshCcw className="w-4 h-4 animate-spin text-primary" />
                          <span>Verifying with Payment Switch...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCcw className="w-4 h-4 text-primary" />
                          <span>Check Payment Status</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep("AMOUNT")}
                      className="text-xs text-gray-500 hover:text-white underline underline-offset-4 font-mono block mx-auto focus-visible:ring-2 focus-visible:ring-primary/60 rounded outline-none p-1"
                    >
                      Cancel / Change Amount
                    </button>
                  </div>
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
                    ) : status === "FAILED" ? (
                      <div className="flex flex-col items-center text-red-400">
                        <AlertTriangle className="w-16 h-16 mb-4" />
                        <h2 className="text-xl font-bold text-white mb-2">Payment Failed</h2>
                        <p className="text-xs text-gray-400">The transaction could not be completed.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-primary">
                        <RefreshCcw className="w-16 h-16 mb-4 animate-spin" />
                        <h2 className="text-xl font-bold text-white mb-2">Verifying Payment</h2>
                        <p className="text-xs text-gray-400">Please wait while we verify your transaction...</p>
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
