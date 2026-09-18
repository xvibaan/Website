"use client";

import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import WalletWidget from "@/components/WalletWidget";
import OrderTable from "@/components/OrderTable";
import { motion } from "framer-motion";
import {
  User,
  Shield,
  Activity,
  Calendar,
  LogOut,
} from "lucide-react";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const profileCards = [
    { icon: <User className="w-6 h-6 text-primary" />, bg: "rgba(124, 58, 237, 0.1)", label: "Account", value: user?.email, truncate: true },
    { icon: <Shield className="w-6 h-6 text-secondary" />, bg: "rgba(6, 182, 212, 0.1)", label: "Role", value: user?.role, capitalize: true },
    { icon: <Activity className="w-6 h-6 text-emerald-400" />, bg: "rgba(16, 185, 129, 0.1)", label: "Status", value: user?.is_active ? "Active" : "Inactive", dot: user?.is_active },
    { icon: <Calendar className="w-6 h-6 text-amber-400" />, bg: "rgba(245, 158, 11, 0.1)", label: "Member Since", value: joinDate },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard</h1>
              <p className="mt-1 text-sm text-slate-400">
                Welcome back, <span className="font-medium text-slate-200">{user?.email}</span>
              </p>
            </div>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={async () => await logout()}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-xl transition-all border"
              style={{ color: "#f87171", background: "rgba(239, 68, 68, 0.08)", borderColor: "rgba(239, 68, 68, 0.15)" }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </motion.button>
          </motion.div>

          {/* Profile Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {profileCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card tilt-card p-6 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: card.bg }}>
                  {card.icon}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-medium text-slate-500">{card.label}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {card.dot !== undefined && (
                      <span className={`w-2 h-2 rounded-full ${card.dot ? "bg-emerald-400" : "bg-red-400"}`} />
                    )}
                    <p className={`text-base font-semibold text-white ${card.truncate ? "truncate" : ""} ${card.capitalize ? "capitalize" : ""}`}
                      title={typeof card.value === "string" ? card.value : undefined}>
                      {card.value}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Wallet + Orders */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
            <div className="lg:col-span-1">
              <WalletWidget />
            </div>
            <div className="lg:col-span-2">
              <OrderTable />
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
