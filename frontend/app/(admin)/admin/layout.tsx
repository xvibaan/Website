"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, LayoutDashboard, Package, Settings, MessageSquare, Users, LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Basic client-side check. Real security is enforced via API tokens on the backend.
    if (!user) {
      router.push("/login");
    } else if (user.role !== "admin") {
      router.push("/"); // Boot non-admins back to the public storefront
    } else {
      setIsAuthorized(true);
    }
  }, [user, router]);

  if (!isAuthorized) {
    return <div className="h-screen bg-black flex items-center justify-center text-primary font-mono text-xs animate-pulse">AUTHORIZING ADMIN...</div>;
  }

  const links = [
    { href: "/admin", icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
    { href: "/admin/products", icon: <Package className="w-5 h-5" />, label: "Products" },
    { href: "/admin/settings", icon: <Settings className="w-5 h-5" />, label: "Site Settings" },
    { href: "/admin/tickets", icon: <MessageSquare className="w-5 h-5" />, label: "Support Tickets" },
    { href: "/admin/users", icon: <Users className="w-5 h-5" />, label: "User Management" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">
      {/* Admin Sidebar */}
      <div className="w-64 border-r border-red-500/20 bg-black flex flex-col relative z-20">
        <div className="p-6 border-b border-red-500/20 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500/10 border border-red-500 flex items-center justify-center rounded">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-white tracking-widest leading-none">NEXUS</span>
            <span className="font-bold text-xs text-red-500 tracking-widest leading-none mt-1">SECURE_ADMIN</span>
          </div>
        </div>

        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {links.map(link => {
            const active = pathname === link.href;
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`flex items-center gap-3 px-4 py-3 rounded font-mono text-sm tracking-wide transition-all duration-300 border ${
                  active 
                    ? "bg-red-500/10 text-red-500 border-red-500 shadow-[inset_4px_0_0_0_#ef4444]"
                    : "text-gray-400 border-transparent hover:bg-white/5 hover:text-white"
                }`}
              >
                {link.icon} {link.label}
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-red-500/20">
          <button
            onClick={async () => await logout()}
            className="flex items-center justify-center gap-2 w-full py-3 bg-red-500 hover:bg-red-600 text-black rounded font-mono font-bold text-xs tracking-wider transition-all"
          >
            <LogOut className="w-4 h-4" /> SECURE LOGOUT
          </button>
        </div>
      </div>

      {/* Admin Content */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{
          backgroundImage: "linear-gradient(rgba(239, 68, 68, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(239, 68, 68, 0.05) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />
        <div className="relative z-10 max-w-6xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
