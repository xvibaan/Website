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
    <div className="w-64 h-screen bg-black border-r border-primary/20 flex flex-col relative z-20">
      {/* Brand */}
      <div className="p-6 border-b border-primary/20 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 border border-primary flex items-center justify-center rounded">
          <Terminal className="w-6 h-6 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg text-white tracking-widest leading-none">HOST</span>
          <span className="font-bold text-xs text-primary tracking-widest leading-none mt-1">MARKET PLACE</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
        <div className="text-[10px] text-primary/50 font-mono tracking-widest uppercase mb-4 px-2">System_Nav</div>
        {navLinks.map((link) => {
          const isActive = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.name}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3 rounded font-mono text-sm tracking-wide transition-all duration-300 border ${
                isActive
                  ? "bg-primary/10 text-primary border-primary shadow-[inset_4px_0_0_0_#00ffff]"
                  : "text-gray-400 border-transparent hover:bg-white/5 hover:text-white"
              }`}
            >
              {link.icon}
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* User Area / Logout */}
      <div className="p-4 border-t border-primary/20 bg-black">
        {user ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 px-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <div className="flex flex-col overflow-hidden">
                <span className="text-xs text-primary font-mono truncate">{user.email}</span>
                <span className="text-[10px] text-gray-500 font-mono uppercase">Role: {user.role}</span>
              </div>
            </div>
            <button
              onClick={async () => await logout()}
              className="flex items-center justify-center gap-2 w-full py-2 border border-red-500/30 text-red-500 hover:bg-red-500/10 hover:border-red-500 rounded font-mono text-xs tracking-wider transition-all"
            >
              <LogOut className="w-4 h-4" /> DISCONNECT
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link href="/login" className="cyber-btn-outline !py-2 text-center text-xs">
              INITIALIZE LOGIN
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
