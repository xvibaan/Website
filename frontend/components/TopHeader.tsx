"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard,
  Plus,
  BookOpen,
  PlayCircle,
  Bell,
  Menu,
  ShieldCheck,
  User,
} from "lucide-react";

export default function TopHeader() {
  const { user } = useAuth();
  const { openMobileMenu, openUserGuide, contentSettings } = useNavigation();
  const balance = (user as any)?.wallet?.balance || 0.0;
  const marketplaceTitle = contentSettings?.marketplaceTitle || "Host Market Place";

  const [isPulsing, setIsPulsing] = useState(false);
  const [deltaType, setDeltaType] = useState<"increase" | "decrease" | null>(null);
  const prevBalanceRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevBalanceRef.current !== null && prevBalanceRef.current !== balance) {
      const isIncrease = balance > prevBalanceRef.current;
      setDeltaType(isIncrease ? "increase" : "decrease");
      setIsPulsing(true);

      const timer = setTimeout(() => {
        setIsPulsing(false);
        setDeltaType(null);
      }, 1500);

      prevBalanceRef.current = balance;
      return () => clearTimeout(timer);
    }
    prevBalanceRef.current = balance;
  }, [balance]);

  return (
    <header className="h-16 md:h-20 bg-[#080a12]/90 backdrop-blur-2xl border-b border-white/10 sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 md:px-8 gap-2">
      {/* Left: Hamburger (mobile) + Brand/Status */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={openMobileMenu}
          className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center min-w-0">
          <span className="text-[11px] sm:text-xs font-mono uppercase tracking-wider text-gray-300 font-bold truncate max-w-[110px] sm:max-w-none">
            {marketplaceTitle}
          </span>
        </div>
      </div>

      {/* Right Action Controls: Wallet + Account */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Wallet Balance Widget Pill with Smooth Update Transition */}
        <Link
          href="/dashboard/deposit"
          className="relative shrink-0 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none rounded-xl"
          title="Manage Wallet & Top Up Funds"
        >
          <motion.div
            animate={
              isPulsing
                ? {
                    scale: [1, 1.05, 1],
                    borderColor:
                      deltaType === "increase"
                        ? ["rgba(52, 211, 153, 0.3)", "rgba(52, 211, 153, 0.9)", "rgba(255, 255, 255, 0.1)"]
                        : ["rgba(0, 194, 255, 0.3)", "rgba(0, 194, 255, 0.9)", "rgba(255, 255, 255, 0.1)"],
                    boxShadow:
                      deltaType === "increase"
                        ? [
                            "0 0 0px rgba(52, 211, 153, 0)",
                            "0 0 20px rgba(52, 211, 153, 0.5)",
                            "0 0 0px rgba(52, 211, 153, 0)",
                          ]
                        : [
                            "0 0 0px rgba(0, 194, 255, 0)",
                            "0 0 20px rgba(0, 194, 255, 0.5)",
                            "0 0 0px rgba(0, 194, 255, 0)",
                          ],
                  }
                : { scale: 1 }
            }
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="flex items-center gap-1.5 sm:gap-2.5 bg-[#0d101d] hover:bg-[#121628] border border-white/10 hover:border-primary/40 px-2.5 sm:px-3.5 py-1.5 sm:py-2 min-h-[40px] rounded-xl transition-colors shadow-sm group"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <CreditCard className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
            </div>
            <div className="flex flex-col items-start leading-none min-w-[50px] sm:min-w-[60px]">
              <span className="text-[8px] sm:text-[9px] text-gray-400 uppercase tracking-widest font-mono font-medium">
                Vault
              </span>
              <div className="h-4 sm:h-5 overflow-hidden relative w-full flex items-center">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={balance}
                    initial={{ y: deltaType === "increase" ? 12 : -12, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: deltaType === "increase" ? -12 : 12, opacity: 0, scale: 0.8 }}
                    transition={{ type: "spring", stiffness: 450, damping: 28 }}
                    className={`text-xs sm:text-sm font-black font-mono mt-0.5 whitespace-nowrap inline-block ${
                      deltaType === "increase"
                        ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                        : deltaType === "decrease"
                        ? "text-primary drop-shadow-[0_0_8px_rgba(0,194,255,0.8)]"
                        : "text-white"
                    }`}
                  >
                    ₹{Number(balance).toFixed(2)}
                  </motion.span>
                </AnimatePresence>
              </div>
            </div>
            <div className="p-1 rounded-md bg-primary/15 text-primary ml-0.5 group-hover:bg-primary group-hover:text-black transition-colors shrink-0">
              <Plus className="w-3 h-3" />
            </div>
          </motion.div>
        </Link>

        {/* User Account / Role Pill */}
        {user ? (
          <Link
            href="/dashboard"
            className="flex items-center gap-2 pl-1.5 sm:pl-2 pr-2 sm:pr-3 py-1.5 min-h-[40px] rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors shrink-0 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            title="Go to Client Dashboard"
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-primary/30 to-purple-500/30 border border-white/20 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm shrink-0">
              {user.email ? user.email.slice(0, 1) : "U"}
            </div>
            <div className="hidden sm:flex flex-col text-left leading-none max-w-[80px] md:max-w-[110px]">
              <span className="text-xs font-semibold text-white truncate">
                {user.email.split("@")[0]}
              </span>
              <span className="text-[9px] text-primary font-mono uppercase mt-0.5">
                {user.role}
              </span>
            </div>
          </Link>
        ) : (
          <Link
            href="/login"
            className="px-3 sm:px-4 py-1.5 sm:py-2 min-h-[40px] flex items-center bg-primary hover:bg-primary-hover text-black text-xs font-bold font-mono rounded-xl transition-colors shadow-[0_0_15px_rgba(0,194,255,0.25)] shrink-0 focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
          >
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
}
