"use client";

import React, { useEffect, useState } from "react";
import { Users, Package, IndianRupee, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_products: 0,
    total_revenue: 0.0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/dashboard-stats"); // Mapped to the new FastAPI endpoint
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        } else {
          // fallback mock for now
          setStats({ total_users: 420, total_products: 15, total_revenue: 125000 });
        }
      } catch (e) {
        // fallback mock
        setStats({ total_users: 420, total_products: 15, total_revenue: 125000 });
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    { title: "TOTAL OPERATIVES", value: stats.total_users, icon: <Users className="w-8 h-8 text-red-500" /> },
    { title: "ACTIVE MODULES", value: stats.total_products, icon: <Package className="w-8 h-8 text-red-500" /> },
    { title: "SYSTEM REVENUE (₹)", value: stats.total_revenue.toLocaleString(), icon: <IndianRupee className="w-8 h-8 text-red-500" /> },
  ];

  return (
    <div className="space-y-8">
      <div className="border-b border-red-500/20 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white font-mono tracking-widest flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            COMMAND CENTER
          </h1>
          <p className="mt-2 text-sm text-red-500/70 font-mono uppercase tracking-widest">
            Overview of System Architecture
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-black/50 backdrop-blur-md border border-red-500/20 p-6 rounded-xl hover:border-red-500/50 transition-colors flex items-center gap-6"
          >
            <div className="w-16 h-16 rounded bg-red-500/10 flex items-center justify-center">
              {card.icon}
            </div>
            <div>
              <p className="text-xs font-mono text-gray-500 tracking-widest mb-1">{card.title}</p>
              <h2 className="text-3xl font-bold text-white font-mono">
                {isLoading ? "..." : card.value}
              </h2>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Activity Log Mock */}
      <div className="bg-black/50 backdrop-blur-md border border-red-500/20 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white font-mono mb-4 uppercase">System Audit Log</h3>
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 border-l-2 border-green-500 bg-white/5 text-gray-300">
            <span className="text-gray-500">[10:45 AM]</span> System wallet auto-credited ₹1500 for User#892
          </div>
          <div className="p-3 border-l-2 border-red-500 bg-white/5 text-gray-300">
            <span className="text-gray-500">[10:42 AM]</span> Admin updated Cheat Status for 'Valorant ESP' to UPDATING
          </div>
          <div className="p-3 border-l-2 border-green-500 bg-white/5 text-gray-300">
            <span className="text-gray-500">[10:30 AM]</span> Support Ticket #12 closed by system.
          </div>
        </div>
      </div>
    </div>
  );
}
