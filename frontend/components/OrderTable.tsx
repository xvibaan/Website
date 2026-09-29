"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, Clock, XCircle, Key, PackageOpen, AlertCircle, Copy, Check, Download } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { Badge } from "./ui/Badge";
import { Skeleton } from "./ui/Skeleton";

interface OrderItem {
  id: number;
  product_name_snapshot: string;
  variant_name_snapshot: string;
  price_at_purchase: number;
  product_key?: {
    key_value: string;
  };
}

interface Order {
  id: number;
  total_amount: number;
  status: string;
  created_at: string;
  items: OrderItem[];
}

export default function OrderTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await api.get<Order[]>("/v1/orders/");
        setOrders(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch orders");
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrders();
  }, []);

  const handleCopy = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(keyText);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportCSV = () => {
    if (orders.length === 0) return;

    const escapeCsv = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      "Order ID",
      "Date",
      "Time (UTC)",
      "Status",
      "Total Amount (INR)",
      "Items Count",
      "Products",
      "Variants",
      "Digital Codes / License Keys",
    ];

    const rows = orders.map((order) => {
      const dateObj = new Date(order.created_at);
      const formattedDate = dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      const formattedTime = dateObj.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const productNames = (order.items || [])
        .map((i) => i.product_name_snapshot || "Item")
        .join("; ");
      const variantNames = (order.items || [])
        .map((i) => i.variant_name_snapshot || "Standard")
        .join("; ");
      const keys = (order.items || [])
        .map((i) => i.product_key?.key_value)
        .filter(Boolean)
        .join("; ") || "N/A";

      return [
        `HM-${order.id}`,
        formattedDate,
        formattedTime,
        order.status,
        Number(order.total_amount || 0).toFixed(2),
        (order.items || []).length,
        productNames,
        variantNames,
        keys,
      ]
        .map(escapeCsv)
        .join(",");
    });

    const csvContent = [headers.map(escapeCsv).join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `host_marketplace_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0c0e17]/80 backdrop-blur-xl p-6 space-y-4">
        <Skeleton className="h-6 w-44 bg-white/10" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/10 backdrop-blur-xl p-6 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-red-400" />
        <p className="text-red-400 text-sm font-medium">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-[#0c0e17]/60 backdrop-blur-xl p-10 text-center flex flex-col items-center justify-center">
        <PackageOpen className="w-12 h-12 text-gray-500 mb-3 opacity-50" />
        <h3 className="text-base font-bold text-white mb-1">No Orders Yet</h3>
        <p className="text-gray-400 text-xs max-w-sm">
          Purchased licenses and product keys will appear here automatically upon fulfillment.
        </p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3" /> COMPLETED
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
            <Clock className="w-3 h-3" /> PENDING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" /> {status}
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border border-white/10 bg-[#0c0e17]/85 backdrop-blur-2xl overflow-hidden shadow-2xl"
    >
      <div className="p-5 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Order History</h3>
          <p className="text-xs text-gray-400">Your registered transactions and digital credentials</p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary hover:text-white transition-all text-xs font-mono flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-primary/60 outline-none"
            title="Download CSV log"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Export CSV</span>
          </button>
          <span className="text-xs font-mono px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-gray-300">
            {orders.length} Total
          </span>
        </div>
      </div>

      {/* Mobile Card List (< sm screens) */}
      <div className="sm:hidden divide-y divide-white/[0.08] p-4 space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="pt-4 first:pt-0 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-white text-sm">Order #{order.id}</span>
                <span className="text-[10px] font-mono text-gray-500 block">
                  {new Date(order.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div>{getStatusBadge(order.status)}</div>
            </div>

            <div className="text-xs text-gray-300">
              {order.items.length > 0
                ? `${order.items[0].product_name_snapshot} • ${order.items[0].variant_name_snapshot}`
                : "Standard License"}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-gray-400">Total Paid:</span>
              <span className="font-mono font-bold text-white text-sm">
                ₹{Number(order.total_amount).toFixed(2)}
              </span>
            </div>

            {order.status === "COMPLETED" && order.items[0]?.product_key ? (
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-primary/20 bg-primary/10 mt-2">
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <Key className="w-3.5 h-3.5 text-primary shrink-0" />
                  <code className="text-xs font-mono text-white truncate select-all">
                    {order.items[0].product_key.key_value}
                  </code>
                </div>
                <button
                  onClick={() => handleCopy(order.items[0].product_key!.key_value)}
                  className="p-2 min-w-[36px] min-h-[36px] rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-gray-200 hover:text-white transition-colors flex items-center justify-center shrink-0"
                  title="Copy key"
                >
                  {copiedKey === order.items[0].product_key.key_value ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-gray-500 font-mono italic text-right">
                Pending Delivery
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View (>= sm screens) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[11px] font-mono uppercase tracking-wider text-gray-400">
              <th className="py-3 px-5">Order Item</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Amount</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-5 text-right">License Key</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] text-xs">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-white/[0.03] transition-colors group">
                <td className="py-4 px-5">
                  <div className="font-bold text-white group-hover:text-primary transition-colors">
                    Order #{order.id}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">
                    {order.items.length > 0
                      ? `${order.items[0].product_name_snapshot} • ${order.items[0].variant_name_snapshot}`
                      : "Standard License"}
                  </div>
                </td>
                <td className="py-4 px-4 font-mono text-gray-400">
                  {new Date(order.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="py-4 px-4 font-mono font-bold text-white">
                  ₹{Number(order.total_amount).toFixed(2)}
                </td>
                <td className="py-4 px-4">{getStatusBadge(order.status)}</td>
                <td className="py-4 px-5 text-right">
                  {order.status === "COMPLETED" && order.items[0]?.product_key ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-primary/20 bg-primary/10">
                      <Key className="w-3.5 h-3.5 text-primary" />
                      <code className="text-xs font-mono text-white select-all">
                        {order.items[0].product_key.key_value}
                      </code>
                      <button
                        onClick={() => handleCopy(order.items[0].product_key!.key_value)}
                        className="p-1.5 min-w-[28px] min-h-[28px] rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
                        title="Copy key"
                      >
                        {copiedKey === order.items[0].product_key.key_value ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-gray-500 font-mono italic">
                      Pending Delivery
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
