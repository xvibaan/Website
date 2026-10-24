"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Copy,
  Check,
  Clock,
  XCircle,
  Smartphone,
  ChevronRight,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import Card3D from "@/components/Card3D";
import { api } from "@/lib/api";
import QRCode from "qrcode";

interface UpiSubmissionRecord {
  id: string;
  utr: string;
  amount: string;
  currency: string;
  status: "PENDING" | "MATCHED" | "MANUAL_REVIEW" | "CREDITED" | "EXPIRED" | "REJECTED";
  failureReason: string | null;
  createdAt: string;
  creditedAt: string | null;
}

export default function DepositPage() {
  const { user, refreshUser } = useAuth();
  const { contentSettings } = useNavigation();
  const currentBalance = (user as any)?.wallet?.balance || 0.0;

  // Selected Payment Method: 'UPI_QR' or 'RAZORPAY'
  const [paymentMethod, setPaymentMethod] = useState<"UPI_QR" | "RAZORPAY">("UPI_QR");

  // Common Amount State
  const [amount, setAmount] = useState<number>(500);
  const [minDeposit, setMinDeposit] = useState<number>(10);

  // Razorpay Flow States
  const [rzpStep, setRzpStep] = useState<"AMOUNT" | "RAZORPAY_RESULT">("AMOUNT");
  const [rzpStatus, setRzpStatus] = useState<"PENDING" | "VERIFYING" | "SUCCESS" | "FAILED" | "CANCELLED">("PENDING");
  const [rzpErrorMessage, setRzpErrorMessage] = useState<string | null>(null);
  const [paymentTxId, setPaymentTxId] = useState<string | null>(null);

  // FamApp UPI QR Flow States
  const [merchantVpa, setMerchantVpa] = useState<string>("");
  const [merchantName, setMerchantName] = useState<string>("Host Market Place");
  const [vpaConfigured, setVpaConfigured] = useState<boolean>(false);
  const [vpaError, setVpaError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedVpa, setCopiedVpa] = useState<boolean>(false);
  const [utrInput, setUtrInput] = useState<string>("");
  const [utrError, setUtrError] = useState<string | null>(null);
  const [submittingUtr, setSubmittingUtr] = useState<boolean>(false);

  // UPI Status Polling State
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [submissionRecord, setSubmissionRecord] = useState<UpiSubmissionRecord | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Recent UPI Submissions History
  const [upiHistory, setUpiHistory] = useState<UpiSubmissionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  const currencySymbol = "₹";
  const quickAmounts = [200, 500, 1000, 2500, 5000];

  // 1. Fetch Authoritative Min Deposit & Merchant VPA on Mount
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
        // Fallback to defaults
      }
    })();

    (async () => {
      try {
        const res = await api.get("/payments/famapp/qr-info");
        if (res?.success) {
          if (res.isConfigured && res.merchantVpa) {
            setMerchantVpa(res.merchantVpa);
            setVpaConfigured(true);
            setVpaError(null);
          } else {
            setMerchantVpa("");
            setVpaConfigured(false);
            setVpaError(res.error || "UPI QR top-ups are temporarily disabled: merchant UPI VPA is not configured.");
          }
          if (res.merchantName) setMerchantName(res.merchantName);
        } else {
          setVpaConfigured(false);
          setVpaError("Unable to load merchant UPI configuration.");
        }
      } catch {
        setVpaConfigured(false);
        setVpaError("UPI payment gateway is currently unavailable. Please select Cards & NetBanking.");
      }
    })();
  }, []);

  // 2. Fetch Customer UPI History
  const loadUpiHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get("/payments/famapp/history");
      if (res?.success && Array.isArray(res.submissions)) {
        setUpiHistory(res.submissions);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (paymentMethod === "UPI_QR") {
      loadUpiHistory();
    }
  }, [paymentMethod, loadUpiHistory]);

  // 3. Generate High-Res UPI QR Code Client-Side
  useEffect(() => {
    if (paymentMethod === "UPI_QR" && merchantVpa && amount > 0) {
      const upiUrl = `upi://pay?pa=${encodeURIComponent(merchantVpa)}&pn=${encodeURIComponent(merchantName)}&am=${amount}&cu=INR&tn=${encodeURIComponent("HostMarketPlace Topup")}`;
      QRCode.toDataURL(upiUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Failed to generate QR code:", err));
    }
  }, [paymentMethod, merchantVpa, merchantName, amount]);

  // 4. Copy VPA Helper
  const handleCopyVpa = () => {
    if (!merchantVpa) return;
    navigator.clipboard.writeText(merchantVpa);
    setCopiedVpa(true);
    setTimeout(() => setCopiedVpa(false), 2000);
  };

  // 5. Submit 12-Digit UTR
  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vpaConfigured || !merchantVpa) {
      setUtrError(vpaError || "UPI deposits are currently disabled.");
      return;
    }
    const cleanUtr = utrInput.replace(/\s+/g, "").trim();

    if (!/^[0-9]{12}$/.test(cleanUtr)) {
      setUtrError("UTR/RRN must be exactly 12 numeric digits from your UPI receipt.");
      return;
    }

    if (amount < minDeposit) {
      setUtrError(`Minimum deposit amount is ₹${minDeposit}.`);
      return;
    }

    setSubmittingUtr(true);
    setUtrError(null);

    try {
      const res = await api.post("/payments/famapp/submit-utr", {
        utr: cleanUtr,
        amount: amount.toString(),
        currency: "INR",
      });

      if (res?.success) {
        setActiveSubmissionId(res.submissionId);
        setSubmissionStatus(res.status);
        setStatusMessage(res.message || "UTR submitted successfully. Checking bank notifications...");
        loadUpiHistory();
      } else {
        setUtrError(res?.message || "Failed to submit UTR. Please try again.");
      }
    } catch (err: any) {
      setUtrError(err?.message || "Submission failed. Please check your network and UTR.");
    } finally {
      setSubmittingUtr(false);
    }
  };

  // 6. Real-time Status Polling
  const pollSubmissionStatus = useCallback(async (id: string) => {
    try {
      const res = await api.get(`/payments/famapp/status/${id}`);
      if (res?.success && res.submission) {
        const sub = res.submission;
        setSubmissionRecord(sub);
        setSubmissionStatus(sub.status);

        if (sub.status === "CREDITED") {
          setStatusMessage("Payment Verified! Your wallet has been credited successfully.");
          await refreshUser();
          loadUpiHistory();
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
        } else if (sub.status === "MATCHED") {
          setStatusMessage("Transfer matched in bank records! Awaiting final Admin sign-off.");
        } else if (sub.status === "MANUAL_REVIEW") {
          setStatusMessage(
            sub.failureReason || "Flagged for manual review. Our team will verify your receipt shortly."
          );
        } else if (sub.status === "REJECTED") {
          setStatusMessage(sub.failureReason || "Submission was rejected by administrator.");
          if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
        } else if (sub.status === "PENDING") {
          setStatusMessage("Awaiting bank notification. We check Gmail and bank records automatically.");
        }
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }, [refreshUser, loadUpiHistory]);

  useEffect(() => {
    if (activeSubmissionId && submissionStatus !== "CREDITED" && submissionStatus !== "REJECTED") {
      pollSubmissionStatus(activeSubmissionId);
      pollingTimerRef.current = setInterval(() => {
        pollSubmissionStatus(activeSubmissionId);
      }, 4000);
    }

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }
    };
  }, [activeSubmissionId, submissionStatus, pollSubmissionStatus]);

  // 7. Existing Razorpay Handler (100% Unchanged)
  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpayProceed = async () => {
    if (amount >= minDeposit) {
      setRzpStatus("VERIFYING");
      setRzpErrorMessage(null);
      try {
        const res = await api.post("/v1/payments/create", {
          amount: amount.toString(),
          currency: "INR",
          purpose: "WALLET_RECHARGE",
          gateway: "razorpay",
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
            setRzpStep("RAZORPAY_RESULT");
            setRzpStatus("VERIFYING");
            setRzpErrorMessage(null);

            try {
              const verifyRes = await api.post("/v1/payments/verify", {
                paymentTransactionId: res.paymentTransaction.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (verifyRes.success && verifyRes.status === "SUCCESS") {
                await refreshUser();
                setRzpStatus("SUCCESS");
              } else {
                setRzpStatus("FAILED");
                setRzpErrorMessage(verifyRes.message || "Payment verification failed.");
              }
            } catch (verifyErr: any) {
              console.error("Payment verification failed:", verifyErr);
              setRzpStatus("FAILED");
              setRzpErrorMessage(verifyErr.message || "Cryptographic payment verification failed.");
            }
          },
          modal: {
            ondismiss: function () {
              setRzpStatus((current) => {
                if (current === "SUCCESS" || current === "VERIFYING") return current;
                setRzpStep("RAZORPAY_RESULT");
                setRzpErrorMessage("The checkout window was closed before completing payment.");
                return "CANCELLED";
              });
            },
          },
          prefill: {
            email: user?.email || "",
          },
          theme: {
            color: "#00c2ff",
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.on("payment.failed", function (response: any) {
          setRzpStep("RAZORPAY_RESULT");
          setRzpStatus("FAILED");
          setRzpErrorMessage(response?.error?.description || "Payment failed or was declined.");
        });
        rzp.open();
      } catch (err: any) {
        console.error(err);
        setRzpStep("RAZORPAY_RESULT");
        setRzpStatus("FAILED");
        setRzpErrorMessage(err.message || "Failed to initiate payment.");
      }
    }
  };

  const handleManualRzpVerify = async (txIdToVerify?: string) => {
    const id = typeof txIdToVerify === "string" ? txIdToVerify : paymentTxId;
    if (!id) return;
    setRzpStatus("VERIFYING");
    try {
      const res = await api.get(`/v1/payments/${id}`);
      if (res.paymentTransaction.status === "SUCCESS") {
        await refreshUser();
        setRzpStatus("SUCCESS");
      } else if (res.paymentTransaction.status === "FAILED") {
        setRzpStatus("FAILED");
        setRzpErrorMessage(res.paymentTransaction.failureReason || "Transaction reported failed.");
      } else if (res.paymentTransaction.status === "CANCELLED") {
        setRzpStatus("CANCELLED");
        setRzpErrorMessage("Transaction was cancelled.");
      } else {
        setRzpStatus("PENDING");
      }
    } catch (e: any) {
      setRzpStatus("FAILED");
      setRzpErrorMessage(e.message || "Status check failed.");
    }
  };

  const getHistoryStatusBadge = (st: string) => {
    switch (st) {
      case "CREDITED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">CREDITED</span>;
      case "MATCHED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">MATCHED</span>;
      case "MANUAL_REVIEW":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">REVIEW</span>;
      case "PENDING":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">PENDING</span>;
      case "REJECTED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">REJECTED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-mono text-gray-400">{st}</span>;
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

          {/* Current Balance Tag & Tutorial */}
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
              <span className="text-[11px] font-mono text-gray-400 uppercase">Current Balance:</span>
              <span className="text-base font-bold text-white font-mono">
                ₹{Number(currentBalance).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Deposit Gateway Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod("UPI_QR")}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex items-start gap-3.5 ${
              paymentMethod === "UPI_QR"
                ? "bg-gradient-to-r from-emerald-500/15 via-[#0c141e] to-black border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.2)]"
                : "bg-white/[0.02] hover:bg-white/[0.05] border-white/10 text-gray-400"
            }`}
          >
            <div className={`p-2.5 rounded-xl border ${
              paymentMethod === "UPI_QR" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-gray-400 border-white/10"
            }`}>
              <QrCode className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Instant UPI QR (FamApp)</span>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  0% Fee • Instant
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Scan using FamApp, PhonePe, Google Pay, or Paytm & verify via 12-digit UTR
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPaymentMethod("RAZORPAY")}
            className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden flex items-start gap-3.5 ${
              paymentMethod === "RAZORPAY"
                ? "bg-gradient-to-r from-primary/15 via-[#0c141e] to-black border-primary/40 shadow-[0_0_25px_rgba(0,194,255,0.2)]"
                : "bg-white/[0.02] hover:bg-white/[0.05] border-white/10 text-gray-400"
            }`}
          >
            <div className={`p-2.5 rounded-xl border ${
              paymentMethod === "RAZORPAY" ? "bg-primary/20 text-primary border-primary/30" : "bg-white/5 text-gray-400 border-white/10"
            }`}>
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Cards & NetBanking</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-white/10 text-gray-300 border border-white/15">
                  Razorpay
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Pay with Debit/Credit Card, NetBanking, or Wallet checkout modal
              </p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Digital Pass Preview Card */}
          <div className="md:col-span-1">
            <Card3D depth={9} className="h-full">
              <div className="h-full p-6 rounded-3xl bg-gradient-to-br from-[#12162a] via-[#0c0e18] to-[#080910] border border-white/15 backdrop-blur-2xl flex flex-col justify-between shadow-2xl relative overflow-hidden">
                <div
                  className={`absolute -top-10 -right-10 w-36 h-36 rounded-full blur-2xl pointer-events-none ${
                    paymentMethod === "UPI_QR" ? "bg-emerald-500/20" : "bg-primary/20"
                  }`}
                />

                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className={`text-[10px] font-mono font-bold tracking-widest uppercase ${
                      paymentMethod === "UPI_QR" ? "text-emerald-400" : "text-primary"
                    }`}>
                      {paymentMethod === "UPI_QR" ? "FAMAPP UPI PASS" : "HOST PASS"}
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>

                  {/* Metallic Chip Visual */}
                  <div className="w-9 h-7 rounded-md bg-amber-400/20 border border-amber-400/40 relative mb-6" />

                  <div className="text-xs text-gray-400 font-mono">Deposit Value</div>
                  <div className="text-3xl font-black text-white font-mono mt-1">
                    ₹{amount}
                  </div>
                </div>

                <div className="pt-6 border-t border-white/[0.08] text-[11px] font-mono text-gray-400 space-y-1.5">
                  <div className="flex justify-between">
                    <span>Deposit Channel:</span>
                    <span className="text-white font-semibold">
                      {paymentMethod === "UPI_QR" ? "Static UPI QR (FamApp)" : "Razorpay Checkout"}
                    </span>
                  </div>
                  {paymentMethod === "UPI_QR" && (
                    <div className="flex justify-between">
                      <span>Merchant VPA:</span>
                      <span className="text-emerald-400 font-bold truncate max-w-[130px]" title={merchantVpa || "Not configured"}>
                        {merchantVpa || (vpaConfigured ? "Loading..." : "Unavailable")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Account:</span>
                    <span className="text-white truncate max-w-[120px]">{user?.email?.split("@")[0]}</span>
                  </div>
                </div>
              </div>
            </Card3D>
          </div>

          {/* Right Column: Interactive Payment Form */}
          <div className="md:col-span-2">
            <div className="rounded-3xl border border-white/10 bg-[#0c0e17]/85 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl">
              {/* ========================================================= */}
              {/* PAYMENT METHOD A: FAMAPP STATIC UPI QR PAYMENT WORKFLOW   */}
              {/* ========================================================= */}
              {paymentMethod === "UPI_QR" && (
                <div className="space-y-6">
                  {/* Step 1: Amount Selection */}
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">
                      1. Choose Deposit Amount ({currencySymbol})
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
                        className="w-full bg-black/60 border border-white/15 rounded-2xl py-3.5 pl-10 pr-4 text-2xl font-bold font-mono text-white focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                      />
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {quickAmounts.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setAmount(q)}
                          className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-mono font-semibold transition-colors flex items-center justify-center outline-none ${
                            amount === q
                              ? "bg-emerald-500 text-black font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                              : "bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          +{currencySymbol}{q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 2: Static QR Display & Instructions */}
                  <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-4">
                    <label className="block text-xs font-mono uppercase tracking-widest text-gray-400">
                      2. Scan Static QR Code or Copy UPI ID
                    </label>

                    {!vpaConfigured ? (
                      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-2">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>UPI QR Deposits Temporarily Unavailable</span>
                        </div>
                        <p className="text-gray-400 leading-relaxed">
                          {vpaError || "The merchant UPI address is not configured. Please use Cards & NetBanking (Razorpay) in the tab above."}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        {/* QR Display */}
                        <div className="bg-white p-3 rounded-2xl shadow-xl border border-white/20 shrink-0">
                          {qrDataUrl ? (
                            <img
                              src={qrDataUrl}
                              alt="FamApp Static UPI QR Code"
                              className="w-44 h-44 object-contain"
                            />
                          ) : (
                            <div className="w-44 h-44 flex items-center justify-center bg-gray-100 rounded-xl text-gray-400">
                              <RefreshCcw className="w-6 h-6 animate-spin" />
                            </div>
                          )}
                        </div>

                        {/* Instructions & VPA Copy Button */}
                        <div className="space-y-3 flex-1 text-xs">
                          <div className="space-y-1">
                            <span className="text-gray-400 font-mono text-[11px] uppercase">Merchant UPI Address:</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-white bg-black/60 px-3 py-1.5 rounded-xl border border-white/15 break-all">
                                {merchantVpa}
                              </span>
                              <button
                                type="button"
                                onClick={handleCopyVpa}
                                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-mono flex items-center gap-1.5 shrink-0 transition-colors"
                                title="Copy UPI ID"
                              >
                                {copiedVpa ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedVpa ? "Copied" : "Copy"}</span>
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-1 text-[11px] text-gray-300">
                            <div className="flex items-center gap-2 text-emerald-400 font-semibold font-mono">
                              <Smartphone className="w-3.5 h-3.5" />
                              <span>Supported UPI Apps:</span>
                            </div>
                            <p className="text-gray-400 leading-relaxed">
                              FamApp, PhonePe, Google Pay, Paytm, CRED, Amazon Pay, or any banking UPI application.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 3: Enter 12-Digit UTR / RRN Form */}
                  <form onSubmit={handleSubmitUtr} className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono uppercase tracking-widest text-gray-400 mb-2">
                        3. Enter 12-Digit UTR / UPI Reference Number (RRN)
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        placeholder="e.g. 412345678901"
                        value={utrInput}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, "");
                          setUtrInput(val);
                          setUtrError(null);
                        }}
                        className="w-full bg-black/60 border border-white/15 rounded-2xl py-3.5 px-4 text-xl font-bold font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 tracking-wider"
                      />
                      <p className="text-[11px] text-gray-500 font-mono mt-1.5">
                        Locate the 12-digit UPI Ref No./UTR in your UPI app payment receipt details.
                      </p>
                    </div>

                    {utrError && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                        {utrError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={submittingUtr || utrInput.length !== 12 || amount < minDeposit || !vpaConfigured}
                      className="w-full py-3.5 min-h-[48px] bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase tracking-wider rounded-2xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-40 flex items-center justify-center gap-2 outline-none"
                    >
                      {submittingUtr ? (
                        <>
                          <RefreshCcw className="w-4 h-4 animate-spin" />
                          <span>Submitting Claim...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit UTR for Verification</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Step 4: Real-time Status Tracker (When active submission exists) */}
                  {activeSubmissionId && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-2xl bg-black/50 border border-white/15 space-y-4"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <span className="text-xs font-mono text-gray-400 uppercase tracking-wider font-semibold">
                          Live Verification Tracker
                        </span>
                        <span className="text-xs font-mono text-gray-500">ID: {activeSubmissionId}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        {submissionStatus === "CREDITED" ? (
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                        ) : submissionStatus === "MATCHED" ? (
                          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse">
                            <Clock className="w-5 h-5" />
                          </div>
                        ) : submissionStatus === "MANUAL_REVIEW" ? (
                          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                            <AlertTriangle className="w-5 h-5" />
                          </div>
                        ) : submissionStatus === "REJECTED" ? (
                          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                            <XCircle className="w-5 h-5" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                            <RefreshCcw className="w-5 h-5 animate-spin" />
                          </div>
                        )}

                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-mono">
                              Status: {submissionStatus || "PENDING"}
                            </span>
                          </div>
                          <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">
                            {statusMessage || "Checking transaction match..."}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2 text-[11px] font-mono text-gray-500 border-t border-white/5">
                        <span>Submitted Amount: ₹{amount}</span>
                        <button
                          type="button"
                          onClick={() => pollSubmissionStatus(activeSubmissionId)}
                          className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <RefreshCcw className="w-3 h-3" />
                          <span>Refresh Status</span>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 5: Recent UPI Submissions History */}
                  {upiHistory.length > 0 && (
                    <div className="pt-4 border-t border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono uppercase tracking-wider text-gray-400 font-semibold">
                          Recent UPI Top-up Submissions
                        </span>
                        <button
                          type="button"
                          onClick={loadUpiHistory}
                          className="text-xs text-emerald-400 hover:underline font-mono"
                        >
                          Refresh History
                        </button>
                      </div>

                      <div className="space-y-2">
                        {upiHistory.slice(0, 5).map((rec) => (
                          <div
                            key={rec.id}
                            className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs font-mono"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white">UTR: {rec.utr}</span>
                                {getHistoryStatusBadge(rec.status)}
                              </div>
                              <span className="text-[10px] text-gray-500 block mt-0.5">
                                {new Date(rec.createdAt).toLocaleString()}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-sm font-bold text-emerald-400">
                                ₹{Number(rec.amount).toFixed(2)}
                              </span>
                              {rec.status === "PENDING" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSubmissionId(rec.id);
                                    setSubmissionStatus(rec.status);
                                    pollSubmissionStatus(rec.id);
                                  }}
                                  className="text-[10px] text-cyan-400 hover:underline block"
                                >
                                  Track Status
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* PAYMENT METHOD B: EXISTING RAZORPAY WORKFLOW (UNCHANGED)  */}
              {/* ========================================================= */}
              {paymentMethod === "RAZORPAY" && (
                <div>
                  {rzpStep === "AMOUNT" ? (
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
                            className="w-full bg-black/60 border border-white/15 rounded-2xl py-3.5 pl-10 pr-4 text-2xl font-bold font-mono text-white focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition-colors"
                          />
                        </div>

                        {/* Quick Preset Buttons */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {quickAmounts.map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setAmount(q)}
                              className={`px-3.5 py-2 min-h-[40px] rounded-xl text-xs font-mono font-semibold transition-colors flex items-center justify-center ${
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
                        onClick={handleRazorpayProceed}
                        disabled={amount < minDeposit}
                        className="w-full py-3.5 min-h-[48px] bg-primary hover:bg-primary-hover text-black font-bold text-xs uppercase tracking-wider rounded-2xl transition-colors shadow-[0_0_20px_rgba(0,194,255,0.25)] hover:shadow-[0_0_25px_rgba(0,194,255,0.4)] disabled:opacity-50 flex items-center justify-center gap-2 outline-none"
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
                        {rzpStatus === "SUCCESS" ? (
                          <div className="flex flex-col items-center text-emerald-400">
                            <CheckCircle className="w-16 h-16 mb-4" />
                            <h2 className="text-xl font-bold text-white mb-2">Payment Successful</h2>
                            <p className="text-xs text-gray-400">Your wallet has been credited.</p>
                          </div>
                        ) : rzpStatus === "CANCELLED" ? (
                          <div className="flex flex-col items-center text-amber-400">
                            <AlertTriangle className="w-16 h-16 mb-4" />
                            <h2 className="text-xl font-bold text-white mb-2">Payment Cancelled</h2>
                            <p className="text-xs text-gray-400">
                              {rzpErrorMessage || "The checkout window was closed before completion."}
                            </p>
                          </div>
                        ) : rzpStatus === "FAILED" ? (
                          <div className="flex flex-col items-center text-red-400">
                            <AlertTriangle className="w-16 h-16 mb-4" />
                            <h2 className="text-xl font-bold text-white mb-2">Payment Failed</h2>
                            <p className="text-xs text-gray-400">
                              {rzpErrorMessage || "The transaction could not be completed."}
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center text-primary">
                            <RefreshCcw className="w-16 h-16 mb-4 animate-spin" />
                            <h2 className="text-xl font-bold text-white mb-2">Verifying Payment</h2>
                            <p className="text-xs text-gray-400">
                              Cryptographically verifying transaction with server...
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="w-full max-w-sm space-y-4">
                        <button
                          type="button"
                          onClick={() => handleManualRzpVerify()}
                          disabled={rzpStatus === "VERIFYING" || rzpStatus === "SUCCESS"}
                          className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/15 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 outline-none"
                        >
                          <RefreshCcw
                            className={`w-4 h-4 ${rzpStatus === "VERIFYING" ? "animate-spin text-primary" : "text-primary"}`}
                          />
                          <span>Check Status Again</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRzpStep("AMOUNT")}
                          className="text-xs text-gray-500 hover:text-white underline underline-offset-4 font-mono block mx-auto outline-none p-1"
                        >
                          Back to Deposit
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
