"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import WalletWidget from "@/components/WalletWidget";
import OrderTable from "@/components/OrderTable";
import WalletTransactionTable from "@/components/WalletTransactionTable";
import Card3D from "@/components/Card3D";
import { motion } from "framer-motion";
import {
  User,
  Shield,
  Activity,
  Calendar,
  LogOut,
  ShoppingBag,
  PlusCircle,
  KeyRound,
  LifeBuoy,
  Sparkles,
  Receipt,
  CheckCircle2,
  Clock,
  CreditCard,
  History,
  PackageCheck,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    activeKeys: 0,
    totalTransactions: 0,
    recentActivity: [] as any[],
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    async function loadDashboardMetrics() {
      try {
        const [ordersRes, txnsRes] = await Promise.allSettled([
          api.get<any[]>("/v1/orders/"),
          api.get<any[]>("/v1/wallet/transactions"),
        ]);

        const orders = ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value) ? ordersRes.value : [];
        const txns = txnsRes.status === "fulfilled" && Array.isArray(txnsRes.value) ? txnsRes.value : [];

        const totalOrders = orders.length;
        const completedOrders = orders.filter((o) => o.status?.toUpperCase() === "COMPLETED").length;
        const activeKeys = orders.reduce((sum, o) => {
          if (o.status?.toUpperCase() === "COMPLETED") {
            return sum + (o.items || []).filter((i: any) => !!i.product_key?.key_value).length;
          }
          return sum;
        }, 0);

        // Merge recent activity
        const activityList: any[] = [];
        orders.forEach((o) => {
          activityList.push({
            id: `ord-${o.id}`,
            type: "ORDER",
            title: `Order #HM-${o.id}`,
            subtitle: o.items?.[0]?.product_name_snapshot || "Marketplace Purchase",
            amount: o.total_amount,
            status: o.status,
            date: o.created_at,
            link: "/dashboard/orders",
          });
        });

        txns.forEach((t) => {
          activityList.push({
            id: `txn-${t.id}`,
            type: t.type,
            title: t.type === "DEPOSIT" ? "Wallet Top-Up" : t.type === "PURCHASE" ? "Purchase Debit" : t.type === "REFUND" ? "Refund Credit" : "Adjustment",
            subtitle: t.channel || t.description,
            amount: t.amount,
            status: t.status,
            date: t.created_at,
            link: "/dashboard/payments",
          });
        });

        activityList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setStats({
          totalOrders,
          completedOrders,
          activeKeys,
          totalTransactions: txns.length,
          recentActivity: activityList.slice(0, 5),
        });
      } catch (err) {
        console.error("Failed to calculate dashboard metrics", err);
      } finally {
        setIsLoadingStats(false);
      }
    }

    loadDashboardMetrics();
  }, []);

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Verified Member";

  const walletBalance = Number((user as any)?.wallet?.balance || 0);

  const profileCards = [
    {
      icon: <User className="w-5 h-5 text-primary" />,
      bg: "bg-primary/10 border-primary/20",
      label: "Account Identity",
      value: user?.email,
      sub: "Host Verified Account",
      truncate: true,
    },
    {
      icon: <Shield className="w-5 h-5 text-secondary" />,
      bg: "bg-secondary/10 border-secondary/20",
      label: "Access Level",
      value: user?.role === "admin" ? "Administrative Core" : "Standard Client",
      sub: `Role: ${user?.role || "user"}`,
    },
    {
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
      bg: "bg-emerald-500/10 border-emerald-500/20",
      label: "Session Integrity",
      value: user?.is_active ? "Active & Authorized" : "Inactive",
      sub: "HMAC Session Token Valid",
      dot: user?.is_active,
    },
    {
      icon: <Calendar className="w-5 h-5 text-amber-400" />,
      bg: "bg-amber-500/10 border-amber-500/20",
      label: "Registration",
      value: joinDate,
      sub: "Persistent Database Authority",
    },
  ];

  return (
    <ProtectedRoute>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 pb-20 px-3 sm:px-6">
        {/* Dashboard Title & Actions Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 sm:pb-6"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-primary mb-2">
              <Sparkles className="w-3 h-3" />
              <span>CONTROL CONSOLE</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Client Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 mt-1 truncate">
              Signed in as <span className="text-white font-medium">{user?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
            <Link
              href="/"
              className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2.5 sm:py-2 min-h-[42px] sm:min-h-[40px] bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-primary" />
              <span>Browse Catalog</span>
            </Link>
            <button
              onClick={async () => await logout()}
              className="flex-1 sm:flex-none px-3.5 sm:px-4 py-2.5 sm:py-2 min-h-[42px] sm:min-h-[40px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 text-red-400 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.div>

        {/* Dynamic Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Link
            href="/dashboard/deposit"
            className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 hover:bg-[#111422]/90 backdrop-blur-xl transition-all group"
          >
            <div className="flex items-center justify-between text-gray-400 text-xs font-mono uppercase mb-2">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary" />
                <span>Wallet Balance</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              ₹{walletBalance.toFixed(2)}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Available Vault Funds</p>
          </Link>

          <Link
            href="/dashboard/orders"
            className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 hover:bg-[#111422]/90 backdrop-blur-xl transition-all group"
          >
            <div className="flex items-center justify-between text-gray-400 text-xs font-mono uppercase mb-2">
              <span className="flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                <span>Total Orders</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
              {stats.totalOrders}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {stats.completedOrders} Delivered & Verified
            </p>
          </Link>

          <Link
            href="/dashboard/my-keys"
            className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 hover:bg-[#111422]/90 backdrop-blur-xl transition-all group"
          >
            <div className="flex items-center justify-between text-gray-400 text-xs font-mono uppercase mb-2">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-purple-400" />
                <span>Purchased Products</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-purple-400 font-mono">
              {stats.activeKeys}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Instant serial access</p>
          </Link>

          <Link
            href="/dashboard/payments"
            className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 hover:bg-[#111422]/90 backdrop-blur-xl transition-all group"
          >
            <div className="flex items-center justify-between text-gray-400 text-xs font-mono uppercase mb-2">
              <span className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-400" />
                <span>Payment History</span>
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              {stats.totalTransactions}
            </div>
            <p className="text-[11px] text-gray-500 mt-1">Deposits & Debits Audited</p>
          </Link>
        </div>

        {/* Profile Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {profileCards.map((card, i) => (
            <Card3D key={i} depth={6} className="h-full">
              <div className="p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl h-full flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${card.bg}`}>
                    {card.icon}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                      {card.label}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {card.dot !== undefined && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      )}
                      <p className={`text-sm font-bold text-white ${card.truncate ? "truncate" : ""}`}>
                        {card.value}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 font-sans border-t border-white/[0.06] pt-2 mt-2">
                  {card.sub}
                </p>
              </div>
            </Card3D>
          ))}
        </div>

        {/* Wallet Overview & Quick Navigation Hub */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Metallic Wallet Card */}
          <div className="lg:col-span-1">
            <WalletWidget />
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/dashboard/orders"
              className="p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/60 hover:bg-[#111422]/80 backdrop-blur-xl transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Order History</h3>
                </div>
                <p className="text-xs text-gray-400">
                  Track purchases, order statuses, itemized breakdowns, and license keys.
                </p>
              </div>
              <span className="text-[11px] font-mono text-primary group-hover:underline mt-4 inline-flex items-center gap-1">
                View Orders →
              </span>
            </Link>

            <Link
              href="/dashboard/payments"
              className="p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/60 hover:bg-[#111422]/80 backdrop-blur-xl transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <History className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Payment History</h3>
                </div>
                <p className="text-xs text-gray-400">
                  Transparency for wallet top-ups, purchase debits, and verified refunds.
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 group-hover:underline mt-4 inline-flex items-center gap-1">
                View Payments →
              </span>
            </Link>

            <Link
              href="/dashboard/my-keys"
              className="p-5 rounded-2xl border border-white/10 bg-[#0c0e17]/60 hover:bg-[#111422]/80 backdrop-blur-xl transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">My Licenses</h3>
                </div>
                <p className="text-xs text-gray-400">
                  Access active serial keys, voucher codes, and loader instructions.
                </p>
              </div>
              <span className="text-[11px] font-mono text-secondary group-hover:underline mt-4 inline-flex items-center gap-1">
                Access Serials →
              </span>
            </Link>
          </div>
        </div>

        {/* Compact Recent Activity Feed */}
        {stats.recentActivity.length > 0 && (
          <section className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Activity className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Recent Account Activity
                </h2>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <Link
                  href="/dashboard/orders"
                  className="text-primary hover:underline font-mono"
                >
                  All Orders →
                </Link>
                <Link
                  href="/dashboard/payments"
                  className="text-emerald-400 hover:underline font-mono"
                >
                  All Payments →
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.recentActivity.map((act) => {
                const isDeposit = act.type === "DEPOSIT";
                const isPurchase = act.type === "PURCHASE" || act.type === "ORDER";
                const isRefund = act.type === "REFUND";

                return (
                  <Link
                    key={act.id}
                    href={act.link}
                    className="p-3.5 rounded-2xl border border-white/10 bg-[#0c0e17]/80 hover:bg-white/[0.04] backdrop-blur-xl transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isDeposit
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                            : isRefund
                            ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                            : "bg-primary/10 border border-primary/20 text-primary"
                        }`}
                      >
                        {isDeposit ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : isRefund ? (
                          <RotateCcw className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate group-hover:text-primary transition-colors">
                          {act.title}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {act.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-xs font-mono font-bold ${
                          isDeposit
                            ? "text-emerald-400"
                            : isRefund
                            ? "text-purple-400"
                            : "text-white"
                        }`}
                      >
                        {isDeposit ? "+" : isRefund ? "+" : "-"}₹{Number(Math.abs(act.amount)).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        {new Date(act.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* DEDICATED SECTION: Historical Wallet Transactions */}
        <section id="historical-wallet-transactions" className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <Receipt className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Historical Wallet Transactions
                </h2>
              </div>
              <p className="text-xs text-gray-400">
                Detailed ledger with Date, Reference, Type, Amount, Balance After, and color-coded status badges.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Server Audited</span>
            </div>
          </div>

          <WalletTransactionTable />
        </section>

        {/* DEDICATED SECTION: Purchased Keys & Orders */}
        <section id="purchased-orders" className="space-y-4 pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Purchased Keys & Orders
                </h2>
              </div>
              <p className="text-xs text-gray-400">
                Active software license keys and transaction snapshots preserved at moment of order.
              </p>
            </div>

            <Link
              href="/#modules-section"
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>Browse Marketplace</span>
              <span>→</span>
            </Link>
          </div>

          <OrderTable />
        </section>
      </div>
    </ProtectedRoute>
  );
}
