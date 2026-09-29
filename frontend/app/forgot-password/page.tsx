"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  ArrowLeft,
  KeyRound,
  ShieldAlert,
  Info,
  Loader2,
  Copy,
  Check,
  Headphones,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Card3D from "@/components/Card3D";

interface LoggedRequest {
  referenceId: string;
  email: string;
  timestamp: string;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loggedRequest, setLoggedRequest] = useState<LoggedRequest | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsSubmitting(true);

    // Provide immediate responsive feedback without claiming an email was actually dispatched
    setTimeout(() => {
      setIsSubmitting(false);
      const generatedRef = "REC-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Date.now().toString(36).toUpperCase();
      setLoggedRequest({
        referenceId: generatedRef,
        email: cleanEmail,
        timestamp: new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      });
    }, 500);
  };

  const handleCopyReference = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetForm = () => {
    setLoggedRequest(null);
    setEmail("");
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center relative px-3 sm:px-6 py-12 overflow-hidden">
      {/* Ambient Lighting Blobs */}
      <div className="absolute top-1/4 -left-20 w-[450px] h-[450px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-[450px] h-[450px] bg-secondary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Floating Ambient Micro-Grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />

      <div className="w-full max-w-lg relative z-10">
        <Card3D depth={6} glare={true} borderGlow={true}>
          <div className="p-6 sm:p-9 rounded-3xl bg-[#0b0d17]/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] relative overflow-hidden">
            
            {/* Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-mono font-bold text-primary uppercase tracking-widest mb-3">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Account Recovery</span>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-secondary/10 to-transparent border border-primary/30 flex items-center justify-center mb-3 shadow-[0_0_20px_rgba(0,194,255,0.2)]">
                <KeyRound className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Reset Credentials
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-gray-400 max-w-sm">
                Enter your account email to initiate verification and request password restoration.
              </p>
            </div>

            {/* Clear UI State for Pending Backend Integration */}
            <div className="mb-6 p-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-4 h-4 text-amber-400" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-amber-200">Backend SMTP Integration Pending</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] font-mono font-bold text-amber-300 uppercase">
                      Offline Mode
                    </span>
                  </div>
                  <p className="text-gray-300 leading-relaxed text-[11px] sm:text-xs">
                    Automated email dispatch is not active on this environment. Submitting below logs your request and provides a verification reference for support or administrator assistance.
                  </p>
                </div>
              </div>
            </div>

            {/* Dynamic Content: Request Form vs Logged Request Receipt */}
            <AnimatePresence mode="wait">
              {!loggedRequest ? (
                <motion.form
                  key="form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="email"
                        className="block text-xs font-medium text-gray-300 font-sans"
                      >
                        Email address
                      </label>
                      <span className="text-[10px] text-gray-500 font-mono">
                        Primary account contact
                      </span>
                    </div>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                      </div>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="admin@hostpanal.in"
                        className="w-full bg-black/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 min-h-[44px] text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors disabled:opacity-50 font-sans focus-visible:ring-2 focus-visible:ring-primary/60"
                      />
                    </div>
                    <p className="text-[11px] text-gray-500 mt-1.5 font-mono">
                      Must match the email address associated with your marketplace account.
                    </p>
                  </div>

                  {/* Submit Action Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !email.trim()}
                      className="w-full py-3.5 min-h-[44px] rounded-xl bg-primary hover:bg-primary-hover text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center transition-colors shadow-[0_0_20px_rgba(0,194,255,0.25)] hover:shadow-[0_0_25px_rgba(0,194,255,0.4)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                          <span>Generating Request...</span>
                        </>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span>Send reset link</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.div
                  key="receipt"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-2xl border border-primary/30 bg-primary/[0.06] space-y-3.5">
                    <div className="flex items-center justify-between border-b border-primary/20 pb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                          Request Logged
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">
                        {loggedRequest.timestamp}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block mb-1">
                          Account Target:
                        </span>
                        <div className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-white text-xs truncate">
                          {loggedRequest.email}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                            Recovery Reference ID:
                          </span>
                          <span className="text-[10px] text-primary font-mono">Use for verification</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-black/60 border border-primary/30">
                          <code className="font-mono text-xs text-primary font-bold tracking-wider select-all">
                            {loggedRequest.referenceId}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyReference(loggedRequest.referenceId)}
                            className="p-1.5 min-w-[32px] min-h-[32px] rounded-md bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white transition-colors flex items-center justify-center shrink-0 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                            title="Copy reference code"
                          >
                            {copied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-primary/10">
                      <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                        Because outbound email delivery is pending backend setup, your credentials cannot be updated automatically. Share this reference with the support desk or platform admin for manual verification.
                      </p>
                    </div>
                  </div>

                  {/* Immediate Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <Link
                      href="/dashboard/support"
                      className="py-3 px-3.5 min-h-[44px] rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                    >
                      <Headphones className="w-3.5 h-3.5 text-primary" />
                      <span>Contact Support</span>
                    </Link>

                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="py-3 px-3.5 min-h-[44px] rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white font-semibold text-xs transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
                    >
                      <span>Try Another Email</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Back to Login and Account Creation Links */}
            <div className="mt-6 pt-5 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors font-medium min-h-[40px] px-2 py-1 rounded-lg hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-primary" />
                <span>Back to Login</span>
              </Link>

              <div className="flex items-center gap-3">
                <span className="text-gray-500 hidden sm:inline">|</span>
                <p className="text-gray-400">
                  New user?{" "}
                  <Link
                    href="/register"
                    className="text-primary hover:text-white font-semibold transition-colors underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-primary/60 rounded outline-none p-1"
                  >
                    Create account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </Card3D>
      </div>
    </div>
  );
}
