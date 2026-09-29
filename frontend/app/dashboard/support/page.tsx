"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LifeBuoy,
  ArrowLeft,
  Send,
  MessageSquare,
  Mail,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";

export default function SupportPage() {
  const { user } = useAuth();
  const { contentSettings, openUserGuide } = useNavigation();

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketCategory, setTicketCategory] = useState("Technical Assistance");
  const [ticketStatus, setTicketStatus] = useState<"IDLE" | "SUBMITTING" | "SUCCESS">("IDLE");

  const helpSupport = contentSettings?.helpSupport || {
    title: "Support Desk & Technical Inquiries",
    description: "Get assistance from verified technicians or open warranty inquiries regarding your licenses.",
    telegramSupportUrl: "https://t.me/host_marketplace_support",
    discordSupportUrl: "https://discord.gg/hostmarketplace",
    contactEmail: "support@hostpanal.in",
    faqItems: [
      {
        question: "How do I add funds to my wallet?",
        answer: "Navigate to the Deposit / Wallet section, choose your preferred payment method from the available options (UPI QR or USDT), and complete the recharge. Your wallet balance updates automatically once verified.",
      },
      {
        question: "How do I buy a product or Redeem Code?",
        answer: "Browse any category in the marketplace, choose your desired product or voucher, and click 'Buy Now'. Your central wallet balance will be debited and your order will be fulfilled instantly.",
      },
      {
        question: "Where can I view my purchased products and keys?",
        answer: "All delivered license keys, voucher codes, and orders are stored securely under Dashboard -> My Licenses / Purchased Products and Order History.",
      },
      {
        question: "How do Redeem Codes work in Host Market Place?",
        answer: "Redeem Codes are digital voucher products sold by marketplace providers. When you buy a Redeem Code, the actual voucher code is delivered directly to your account after provider fulfillment.",
      },
    ],
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    setTicketStatus("SUBMITTING");
    // Simulate server submission
    await new Promise((resolve) => setTimeout(resolve, 800));
    setTicketStatus("SUCCESS");
    setTicketSubject("");
    setTicketMessage("");
  };

  return (
    <ProtectedRoute>
      <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 pb-20 px-3 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-primary" />
            <span>Back to Dashboard</span>
          </Link>

          <button
            onClick={openUserGuide}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            <span>Open User Guide</span>
          </button>
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 sm:pb-6">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <LifeBuoy className="w-6 h-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-emerald-400 mb-1">
                <Sparkles className="w-3 h-3" />
                <span>24/7 PRIORITY ASSISTANCE</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Help & Technical Support
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                {helpSupport.description}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Channels Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {helpSupport.telegramSupportUrl && (
            <a
              href={helpSupport.telegramSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 hover:bg-[#121626]/80 backdrop-blur-xl transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Send className="w-5 h-5" />
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white">Telegram Support</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Direct one-on-one live technician messaging with fast response.
                </p>
              </div>
              <span className="text-[11px] font-mono text-sky-400 group-hover:underline mt-4">
                Message on Telegram →
              </span>
            </a>
          )}

          {helpSupport.discordSupportUrl && (
            <a
              href={helpSupport.discordSupportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 hover:bg-[#121626]/80 backdrop-blur-xl transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white">Discord Community</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Community channels, update alerts, and troubleshooting guides.
                </p>
              </div>
              <span className="text-[11px] font-mono text-indigo-400 group-hover:underline mt-4">
                Join Discord Server →
              </span>
            </a>
          )}

          {helpSupport.contactEmail && (
            <a
              href={`mailto:${helpSupport.contactEmail}`}
              className="p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 hover:bg-[#121626]/80 backdrop-blur-xl transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-sm font-bold text-white">Email Desk</h3>
                <p className="text-xs text-gray-400 mt-1">
                  For formal billing inquiries and enterprise licensing requests.
                </p>
              </div>
              <span className="text-[11px] font-mono text-amber-400 group-hover:underline mt-4 truncate">
                {helpSupport.contactEmail}
              </span>
            </a>
          )}
        </div>

        {/* Two Columns: FAQ & Open Ticket */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-start">
          {/* FAQ Accordion */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Quick answers to common questions about licenses, updates, and wallet top-ups.
              </p>
            </div>

            <div className="space-y-2.5">
              {helpSupport.faqItems?.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div
                    key={index}
                    className="rounded-2xl border border-white/10 bg-[#0c0e17]/70 backdrop-blur-xl overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                      className="w-full p-4 text-left flex items-center justify-between gap-3 text-sm font-semibold text-white hover:text-primary transition-colors min-h-[48px]"
                    >
                      <span className="pr-2">{faq.question}</span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? "rotate-180 text-primary" : ""
                        }`}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-gray-400 leading-relaxed border-t border-white/[0.06]">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ticket Submission Form */}
          <div className="p-5 sm:p-7 rounded-3xl border border-white/10 bg-[#0c0e17]/85 backdrop-blur-xl space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-primary uppercase tracking-wider mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Official Warranty Desk</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Open a Support Ticket
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Signed in as <span className="text-white font-medium">{user?.email}</span>
              </p>
            </div>

            {ticketStatus === "SUCCESS" ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">Ticket Submitted Successfully</h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Your inquiry has been logged in our support queue. A technician will review and reply within 1-2 hours.
                </p>
                <button
                  type="button"
                  onClick={() => setTicketStatus("IDLE")}
                  className="px-4 py-2 min-h-[40px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-mono font-semibold transition-colors"
                >
                  Submit Another Ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-widest text-gray-400 mb-1.5">
                    Inquiry Category
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 min-h-[44px]"
                  >
                    <option value="Technical Assistance">Technical Assistance / Injection</option>
                    <option value="License Key Issue">License Key Activation Issue</option>
                    <option value="Wallet Top-Up">Wallet Top-Up / Deposit Inquiries</option>
                    <option value="Product Status Inquiry">Game Update / Status Inquiries</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-widest text-gray-400 mb-1.5">
                    Subject
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Cannot activate BGMI 7-day serial"
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl py-2.5 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-widest text-gray-400 mb-1.5">
                    Detailed Message
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe your issue with exact error codes or device model..."
                    value={ticketMessage}
                    onChange={(e) => setTicketMessage(e.target.value)}
                    className="w-full bg-black/60 border border-white/15 rounded-xl py-2.5 px-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={ticketStatus === "SUBMITTING"}
                  className="w-full py-3 min-h-[44px] bg-primary hover:bg-primary-hover text-black font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(0,194,255,0.25)] hover:shadow-[0_0_25px_rgba(0,194,255,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{ticketStatus === "SUBMITTING" ? "Dispatching..." : "Submit Support Ticket"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
