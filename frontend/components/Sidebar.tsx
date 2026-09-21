"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, ShoppingCart, User, ShieldAlert, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navLinks = [
    { name: "MARKETPLACE", href: "/products", icon: <ShoppingCart className="w-5 h-5" /> },
    { name: "DASHBOARD", href: "/dashboard", icon: <User className="w-5 h-5" /> },
  ];

  if (user?.role === "admin") {
    navLinks.push({ name: "ADMIN PANEL", href: "/admin", icon: <ShieldAlert className="w-5 h-5" /> });
  }

  return (
    <div className="w-64 h-screen bg-background/80 backdrop-blur-xl border-r border-glass-border flex flex-col relative z-20">
      {/* Brand */}
      <div className="p-6 border-b border-glass-border flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(0,194,255,0.2)] flex items-center justify-center rounded-lg">
          <Terminal className="w-6 h-6 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg text-foreground tracking-widest leading-none">HOST</span>
          <span className="font-semibold text-xs text-primary tracking-widest leading-none mt-1">MARKET PLACE</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        <div className="text-[10px] text-muted-foreground font-sans font-semibold tracking-widest uppercase mb-4 px-2">Navigation</div>
        {navLinks.map((link) => {
          const isActive = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm tracking-wide transition-all duration-300 border ${
                isActive
                  ? "bg-primary/10 text-primary border-primary/20 shadow-[inset_4px_0_0_0_#00C2FF]"
                  : "text-muted-foreground border-transparent hover:bg-card-border/50 hover:text-foreground"
              }`}
            >
              {link.icon}
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* User Area / Logout */}
      <div className="p-4 border-t border-glass-border bg-background/50">
        {user ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-2">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs text-foreground font-mono truncate">{user.email}</span>
                <span className="text-[10px] text-muted-foreground uppercase">Role: {user.role}</span>
              </div>
            </div>
            <button
              onClick={async () => await logout()}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-destructive/10 border border-destructive/30 text-destructive hover:bg-destructive/20 hover:border-destructive/50 rounded-lg text-xs font-semibold tracking-wider transition-all"
            >
              <LogOut className="w-4 h-4" /> DISCONNECT
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link href="/login" className="flex items-center justify-center w-full py-2.5 border border-primary text-primary hover:bg-primary/10 rounded-lg text-xs font-bold tracking-widest transition-all">
              INITIALIZE LOGIN
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
