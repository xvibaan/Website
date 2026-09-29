"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Compass,
  ShoppingCart,
  LayoutDashboard,
  Wallet,
  ShieldAlert,
  LogOut,
  Sparkles,
  KeyRound,
  LifeBuoy,
  Receipt,
  BookOpen,
  X,
  CreditCard,
  Plus,
  PackageCheck,
  History,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isMobileMenuOpen, closeMobileMenu, openUserGuide, contentSettings } = useNavigation();

  const balance = (user as any)?.wallet?.balance || 0.0;
  const marketplaceTitle = contentSettings?.marketplaceTitle || "Host Market Place";

  const adminPanelBaseUrl = process.env.NEXT_PUBLIC_ADMIN_PANEL_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3001");

  const navLinks: Array<{ name: string; href: string; icon: React.ReactNode; external?: boolean }> = [
    { name: "Marketplace", href: "/", icon: <Compass className="w-4 h-4" /> },
    { name: "Products", href: "/products", icon: <ShoppingCart className="w-4 h-4" /> },
    { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: "Wallet & Deposit", href: "/dashboard/deposit", icon: <Wallet className="w-4 h-4" /> },
  ];

  if (user?.role === "admin") {
    navLinks.push({
      name: "Admin Center",
      href: `${adminPanelBaseUrl}/admin`,
      icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
      external: true,
    });
  }

  const renderNavContent = (isMobile: boolean = false) => (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Brand Header */}
      <div className="p-3.5 sm:p-5 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        <Link
          href="/"
          onClick={() => isMobile && closeMobileMenu()}
          className="flex items-center gap-2.5 sm:gap-3 min-w-0 group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/30 shadow-[0_0_15px_rgba(0,194,255,0.2)] flex items-center justify-center rounded-xl shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-extrabold text-xs sm:text-sm md:text-base text-white tracking-wider leading-tight truncate">
              {marketplaceTitle.split(" ")[0]?.toUpperCase() || "HOST"}
            </span>
            <span className="font-semibold text-[9px] sm:text-[10px] text-primary tracking-widest leading-none mt-0.5 uppercase font-mono truncate">
              {marketplaceTitle.split(" ").slice(1).join(" ") || "MARKET PLACE"}
            </span>
          </div>
        </Link>

        {isMobile && (
          <button
            onClick={closeMobileMenu}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors shrink-0"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Mobile Wallet Quick Summary (on mobile drawer) */}
      {isMobile && (
        <div className="p-3 mx-3 mt-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase text-gray-400 truncate">Vault Balance</div>
              <div className="text-xs sm:text-sm font-bold text-white font-mono truncate">₹{Number(balance).toFixed(2)}</div>
            </div>
          </div>
          <Link
            href="/dashboard/deposit"
            onClick={() => closeMobileMenu()}
            className="shrink-0 px-3 py-1.5 min-h-[36px] rounded-lg bg-primary text-black font-mono text-xs font-bold flex items-center gap-1 hover:bg-primary-hover transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Add</span>
          </Link>
        </div>
      )}

      {/* Navigation Links */}
      <div className="flex-1 py-3 sm:py-5 px-3 sm:px-4 space-y-0.5 sm:space-y-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.08)_transparent] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20">
        <div className="text-[10px] text-gray-500 font-mono font-semibold tracking-widest uppercase mb-1.5 px-3">
          Explore
        </div>
        {navLinks.map((link) => {
          const isActive = link.external
            ? false
            : link.href === "/"
              ? pathname === "/"
              : pathname?.startsWith(link.href);

          const className = `flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl font-medium text-xs tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
            isActive
              ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_12px_rgba(0,194,255,0.15)] font-semibold"
              : "text-gray-400 border border-transparent hover:bg-white/5 hover:text-white"
          }`;

          if (link.external) {
            return (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => isMobile && closeMobileMenu()}
                className={className}
              >
                {link.icon}
                <span className="truncate">{link.name}</span>
              </a>
            );
          }

          return (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => isMobile && closeMobileMenu()}
              className={className}
            >
              {link.icon}
              <span className="truncate">{link.name}</span>
            </Link>
          );
        })}

        <div className="pt-3 sm:pt-4">
          <div className="text-[10px] text-gray-500 font-mono font-semibold tracking-widest uppercase mb-1.5 px-3">
            Account Tools
          </div>
          <Link
            href="/dashboard/orders"
            onClick={() => isMobile && closeMobileMenu()}
            className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl font-medium text-xs tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
              pathname?.startsWith("/dashboard/orders")
                ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <PackageCheck className="w-4 h-4 shrink-0 text-primary" />
            <span className="truncate">Order History</span>
          </Link>
          <Link
            href="/dashboard/my-keys"
            onClick={() => isMobile && closeMobileMenu()}
            className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl font-medium text-xs tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
              pathname?.startsWith("/dashboard/my-keys")
                ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <KeyRound className="w-4 h-4 shrink-0 text-purple-400" />
            <span className="truncate">Purchased Products</span>
          </Link>
          <Link
            href="/dashboard/ledger"
            onClick={() => isMobile && closeMobileMenu()}
            className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl font-medium text-xs tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
              pathname?.startsWith("/dashboard/ledger")
                ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">Wallet Ledger</span>
          </Link>
          <Link
            href="/dashboard/payments"
            onClick={() => isMobile && closeMobileMenu()}
            className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl font-medium text-xs tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
              pathname?.startsWith("/dashboard/payments")
                ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <History className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">Payment History</span>
          </Link>
          <Link
            href="/dashboard/support"
            onClick={() => isMobile && closeMobileMenu()}
            className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl font-medium text-xs tracking-wide transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none ${
              pathname?.startsWith("/dashboard/support")
                ? "bg-primary/10 text-primary border border-primary/20 font-semibold"
                : "text-gray-400 hover:bg-white/5 hover:text-white"
            }`}
          >
            <LifeBuoy className="w-4 h-4 shrink-0 text-blue-400" />
            <span className="truncate">Support Desk</span>
          </Link>

          {/* Quick User Guide button */}
          <button
            onClick={() => {
              if (isMobile) closeMobileMenu();
              openUserGuide();
            }}
            className="flex items-center gap-3 w-full text-left px-3 py-2.5 min-h-[44px] rounded-xl font-medium text-xs tracking-wide text-gray-400 hover:bg-white/5 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
          >
            <BookOpen className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">User Guide & FAQ</span>
          </button>
        </div>
      </div>

      {/* User Session Footer */}
      <div className="p-3 sm:p-4 border-t border-white/10 bg-[#06080e]/95 shrink-0 z-10">
        {user ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5 px-2 py-0.5">
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/15 flex items-center justify-center text-xs font-bold text-white uppercase">
                  {user.email ? user.email.slice(0, 1) : "U"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#06080e]" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs text-white font-medium truncate">
                  {user.email}
                </span>
                <span className="text-[10px] text-gray-500 font-mono uppercase">
                  Role: {user.role}
                </span>
              </div>
            </div>

            <button
              onClick={async () => {
                if (isMobile) closeMobileMenu();
                await logout();
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 min-h-[44px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              href="/login"
              onClick={() => isMobile && closeMobileMenu()}
              className="flex items-center justify-center w-full py-2.5 min-h-[44px] bg-primary text-black hover:bg-primary-hover rounded-xl text-xs font-bold font-mono tracking-wider transition-colors shadow-[0_0_12px_rgba(0,194,255,0.2)] focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              onClick={() => isMobile && closeMobileMenu()}
              className="flex items-center justify-center w-full py-2 min-h-[44px] bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white rounded-xl text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            >
              Create Account
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Static Sidebar */}
      <aside className="hidden md:flex w-64 h-screen bg-[#080a12]/95 backdrop-blur-2xl border-r border-white/10 flex-col relative z-20 shrink-0">
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile Responsive Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobileMenu}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Slide-out Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative w-[270px] xs:w-[280px] sm:w-[300px] max-w-[78vw] h-full bg-[#080a12] border-r border-white/10 shadow-2xl flex flex-col z-10 overflow-hidden"
            >
              {renderNavContent(true)}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
