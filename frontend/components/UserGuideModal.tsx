"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  Zap,
  HelpCircle,
  ExternalLink,
  MessageCircle,
  Send,
  Video,
  PlayCircle,
} from "lucide-react";
import { useNavigation } from "@/context/NavigationContext";

export default function UserGuideModal() {
  const { isUserGuideOpen, closeUserGuide, contentSettings } = useNavigation();
  const [activeTab, setActiveTab] = useState<"QUICK_START" | "HOW_TO_BUY" | "HOW_TO_USE" | "SUPPORT">("QUICK_START");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isUserGuideOpen) {
        closeUserGuide();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isUserGuideOpen, closeUserGuide]);

  if (!isUserGuideOpen) return null;

  const guide = contentSettings?.userGuide || {
    title: "Host Market Place — Quick Start & User Guide",
    subtitle: "Complete step-by-step walkthrough to browse, fund your wallet, purchase digital products, and manage your orders.",
    steps: [],
  };

  const support = contentSettings?.helpSupport;
  const globalLinks = contentSettings?.globalLinks;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeUserGuide}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-3xl border border-white/15 bg-[#090b14]/95 shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden z-10 my-auto"
        >
          {/* Header */}
          <div className="p-5 sm:p-7 border-b border-white/10 flex items-start justify-between bg-white/[0.02]">
            <div className="pr-4">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <BookOpen className="w-4 h-4" />
                </span>
                <span className="text-[11px] font-mono uppercase tracking-widest text-primary font-bold">
                  KNOWLEDGE BASE & GUIDE
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {guide.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-relaxed">
                {guide.subtitle}
              </p>
            </div>

            <button
              onClick={closeUserGuide}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/10 shrink-0 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
              aria-label="Close guide"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-white/10 px-3 sm:px-7 bg-black/40 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("QUICK_START")}
              className={`py-3 px-3.5 sm:px-4 min-h-[44px] text-xs font-mono font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
                activeTab === "QUICK_START"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Quick Start</span>
            </button>
            <button
              onClick={() => setActiveTab("HOW_TO_BUY")}
              className={`py-3 px-3.5 sm:px-4 min-h-[44px] text-xs font-mono font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
                activeTab === "HOW_TO_BUY"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Purchasing Steps</span>
            </button>
            <button
              onClick={() => setActiveTab("HOW_TO_USE")}
              className={`py-3 px-3.5 sm:px-4 min-h-[44px] text-xs font-mono font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
                activeTab === "HOW_TO_USE"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>How to Use</span>
            </button>
            <button
              onClick={() => setActiveTab("SUPPORT")}
              className={`py-3 px-3.5 sm:px-4 min-h-[44px] text-xs font-mono font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
                activeTab === "SUPPORT"
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Host Market Place Support</span>
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
            {activeTab === "QUICK_START" && (
              <div className="space-y-4">
                {(guide.steps || []).map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col sm:flex-row sm:items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 text-primary flex items-center justify-center font-mono font-black text-sm shrink-0">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm sm:text-base font-bold text-white mb-1">
                        {step.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-primary/10 to-purple-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Send className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                        <span>Host Market Place Support</span>
                        <span className="text-[10px] text-primary font-mono">@host_marketplace_support</span>
                      </div>
                      <div className="text-[11px] text-gray-400">Need help with wallet deposits, orders, or redeem codes? Contact Main Support directly.</div>
                    </div>
                  </div>
                  <a
                    href={support?.telegramSupportUrl || "https://t.me/host_marketplace_support"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors min-h-[44px] shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Contact Support on Telegram</span>
                  </a>
                </div>
              </div>
            )}

            {activeTab === "HOW_TO_BUY" && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-xs">1</span>
                    <h4 className="text-sm font-bold text-white">Browse Categories & Products</h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed pl-9">
                    Explore digital products across software licenses, redeem codes, gaming tools, AI subscriptions, and hosting. Select your desired item to view pricing, available duration packages, and provider status.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-xs">2</span>
                    <h4 className="text-sm font-bold text-white">Check Wallet Balance & Top-Up</h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed pl-9">
                    Ensure your marketplace wallet balance is sufficient for the total purchase price. If needed, click the &quot;Deposit / Recharge&quot; button to add funds instantly using dynamic UPI or USDT cryptocurrency gateways.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-mono font-bold text-xs">3</span>
                    <h4 className="text-sm font-bold text-white">Confirm Order & Instant Fulfillment</h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed pl-9">
                    Click &quot;Buy Now&quot; on the product page. Upon confirmation, your wallet balance will be debited, an order reference ID will be generated, and automated fulfillment will deliver your item or Redeem Code instantly.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "HOW_TO_USE" && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">A</span>
                    <h4 className="text-sm font-bold text-white">Locate Your Delivered Items</h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed pl-9">
                    Go to your <strong className="text-white">Dashboard &rarr; My Licenses / Purchased Products</strong> or <strong className="text-white">Order History</strong>. Every completed purchase displays the serial key, voucher code, or access link along with full delivery details.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">B</span>
                    <h4 className="text-sm font-bold text-white">Redeem Codes & License Activation</h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed pl-9">
                    Copy the delivered Redeem Code or license key from your dashboard and redeem it directly on the target platform, official software client, or vendor portal specified in the product description.
                  </p>
                </div>

                <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs">C</span>
                    <h4 className="text-sm font-bold text-white">Tracking Order Status</h4>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed pl-9">
                    If an order is marked as <strong className="text-amber-400">Processing</strong>, provider fulfillment is actively running. Once complete, status changes to <strong className="text-emerald-400">Completed</strong>. If an order fails, funds are credited back to your wallet automatically.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "SUPPORT" && (
              <div className="space-y-4">
                {/* Official Main Support Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <h4 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">
                        Host Market Place Support
                      </h4>
                      <p className="text-xs text-gray-200 font-mono mt-1 font-semibold">
                        Main Support: <span className="text-primary font-bold">@host_marketplace_support</span>
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Main Support Online</span>
                    </span>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 leading-relaxed">
                      Our official support team is available on Telegram to assist you with any marketplace inquiries, including:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-gray-300">
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>Wallet &amp; recharge problems</span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>Payment issues</span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>Order problems</span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>Product delivery problems</span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>Redeem Code problems</span>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span>Other marketplace issues</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <a
                      href={support?.telegramSupportUrl || "https://t.me/host_marketplace_support"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-mono text-xs font-bold transition-all min-h-[44px] shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                    >
                      <Send className="w-4 h-4" />
                      <span>Contact Support on Telegram</span>
                    </a>
                    {support?.discordSupportUrl && (
                      <a
                        href={support.discordSupportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/20 font-mono text-xs font-bold transition-colors min-h-[44px]"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Discord Community</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* FAQ List */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-mono uppercase tracking-widest text-gray-400 font-bold px-1">
                    Frequently Asked Questions
                  </h4>
                  {support?.faqItems?.map((faq, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10"
                    >
                      <div className="flex items-start gap-2.5">
                        <HelpCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-white mb-1.5">
                            {faq.question}
                          </h4>
                          <p className="text-xs text-gray-400 leading-relaxed">{faq.answer}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Verified Host Platform Documentation</span>
            </div>
            <button
              onClick={closeUserGuide}
              className="w-full sm:w-auto px-5 py-2.5 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold transition-colors flex items-center justify-center"
            >
              Got It, Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
