"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { adminApi } from "@/lib/admin-api";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldX,
  LayoutDashboard,
  Users,
  Package,
  FolderTree,
  ShoppingBag,
  Wallet,
  CreditCard,
  Server,
  BarChart3,
  Link2,
  Percent,
  Building2,
  Globe,
  KeyRound,
  Settings,
  ScrollText,
  LogOut,
  ArrowLeft,
  Loader2,
  Menu,
  X,
  Store,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface NavLinkItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  isPlanned?: boolean;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState<"healthy" | "warning" | "checking">("checking");

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  // Quick system check on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const data = await adminApi.checkHealth();
        if (data && data.status === "ok") {
          setSystemStatus("healthy");
        } else {
          setSystemStatus("warning");
        }
      } catch {
        setSystemStatus("warning");
      }
    }
    if (user?.role === "admin") {
      checkHealth();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="h-screen bg-[#07090e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#00c2ff]" />
          <span className="text-xs font-mono uppercase tracking-widest text-gray-400">
            Initializing Master Admin Console...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#0c101a] border border-red-500/20 text-center space-y-6 shadow-2xl">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
            <ShieldX className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Access Prohibited</h2>
            <p className="mt-2 text-sm text-gray-400">
              User account <span className="text-white font-mono">{user.email}</span> lacks Master Administrator privileges.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-all border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Customer Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const primaryNavLinks: NavLinkItem[] = [
    { href: "/admin", icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard" },
    { href: "/admin/customers", icon: <Users className="w-4 h-4" />, label: "Customers" },
    { href: "/admin/products", icon: <Package className="w-4 h-4" />, label: "Products" },
    { href: "/admin/categories", icon: <FolderTree className="w-4 h-4" />, label: "Categories" },
    { href: "/admin/orders", icon: <ShoppingBag className="w-4 h-4" />, label: "Orders", badge: "Phase 8" },
    { href: "/admin/wallets", icon: <Wallet className="w-4 h-4" />, label: "Wallets" },
    { href: "/admin/payments", icon: <CreditCard className="w-4 h-4" />, label: "Payments" },
    { href: "/admin/providers", icon: <Server className="w-4 h-4" />, label: "Providers" },
    { href: "/admin/analytics", icon: <BarChart3 className="w-4 h-4" />, label: "Analytics" },
    { href: "/admin/resources", icon: <Link2 className="w-4 h-4" />, label: "Links & Resources" },
    { href: "/admin/pricing", icon: <Percent className="w-4 h-4" />, label: "Pricing" },
  ];

  const futureArchitectureLinks: NavLinkItem[] = [
    { href: "/admin/resellers", icon: <Building2 className="w-4 h-4" />, label: "Resellers" },
    { href: "/admin/website-instances", icon: <Globe className="w-4 h-4" />, label: "Website Instances", isPlanned: true },
    { href: "/admin/api-access", icon: <KeyRound className="w-4 h-4" />, label: "API Access" },
  ];

  const systemLinks: NavLinkItem[] = [
    { href: "/admin/settings", icon: <Settings className="w-4 h-4" />, label: "Settings" },
    { href: "/admin/audit-logs", icon: <ScrollText className="w-4 h-4" />, label: "Audit Logs" },
  ];

  const renderNavLink = (link: NavLinkItem) => {
    const active = pathname === link.href;
    return (
      <Link
        key={link.href}
        href={link.href}
        className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 border ${
          active
            ? "bg-[#00c2ff]/10 text-[#00c2ff] border-[#00c2ff]/30 shadow-[inset_3px_0_0_0_#00c2ff]"
            : "text-gray-400 border-transparent hover:bg-white/5 hover:text-gray-200"
        }`}
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className={active ? "text-[#00c2ff]" : "text-gray-400"}>{link.icon}</span>
          <span className="truncate">{link.label}</span>
        </div>
        {link.badge && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
            {link.badge}
          </span>
        )}
        {link.isPlanned && (
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-gray-500">
            Planned
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col font-sans selection:bg-[#00c2ff]/20 selection:text-[#00c2ff]">
      {/* Top Header */}
      <header className="h-16 border-b border-white/10 bg-[#0a0d14]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:text-white"
            aria-label="Toggle Navigation"
          >
            {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00c2ff]/10 border border-[#00c2ff]/30 flex items-center justify-center shadow-[0_0_15px_rgba(0,194,255,0.15)]">
              <ShieldAlert className="w-5 h-5 text-[#00c2ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wider text-white">HOST MARKET PLACE</span>
                <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#00c2ff]/10 text-[#00c2ff] border border-[#00c2ff]/20">
                  Master Console
                </span>
              </div>
              <span className="text-[10px] font-mono text-gray-500 block leading-none mt-0.5">
                Authoritative Central Control Center
              </span>
            </div>
          </Link>
        </div>

        {/* Right Header Status & Admin Identity */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* System Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono">
            {systemStatus === "healthy" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400">Backend Healthy</span>
              </>
            ) : systemStatus === "warning" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-amber-400">Backend Degraded</span>
              </>
            ) : (
              <>
                <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                <span className="text-gray-400">Checking Health...</span>
              </>
            )}
          </div>

          {/* Admin Identity Card */}
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-xs font-medium text-white truncate max-w-[180px]">{user.email}</span>
            <span className="text-[10px] font-mono text-[#00c2ff] uppercase">Role: MASTER_ADMIN</span>
          </div>

          {/* Return to Market */}
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-gray-300 hover:text-white transition-all"
            title="Switch to Customer Marketplace"
          >
            <Store className="w-3.5 h-3.5 text-[#00c2ff]" />
            <span>Marketplace</span>
          </Link>

          {/* Logout Button */}
          <button
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex min-h-[calc(100vh-4rem)] relative">
        {/* Mobile Backdrop */}
        {isMobileNavOpen && (
          <div
            onClick={() => setIsMobileNavOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed md:sticky top-16 h-[calc(100vh-4rem)] w-64 border-r border-white/10 bg-[#080b12] flex flex-col z-30 transition-transform duration-200 ease-in-out ${
            isMobileNavOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            {/* Core Administration */}
            <div className="space-y-1">
              <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-gray-500 font-semibold block mb-1.5">
                Core Operations
              </span>
              {primaryNavLinks.map(renderNavLink)}
            </div>

            {/* Planned Reseller Architecture */}
            <div className="space-y-1 pt-2 border-t border-white/5">
              <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-gray-500 font-semibold block mb-1.5">
                Multi-Tenant Network
              </span>
              {futureArchitectureLinks.map(renderNavLink)}
            </div>

            {/* System Management */}
            <div className="space-y-1 pt-2 border-t border-white/5">
              <span className="px-3 text-[10px] font-mono uppercase tracking-wider text-gray-500 font-semibold block mb-1.5">
                System Governance
              </span>
              {systemLinks.map(renderNavLink)}
            </div>
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-3 border-t border-white/10 bg-black/30">
            <div className="flex items-center justify-between text-[10px] font-mono text-gray-500">
              <span>Fastify REST API v1</span>
              <span className="text-emerald-400">Secure TLS</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 min-w-0">
          <div className="max-w-7xl mx-auto w-full space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
