"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, Clock, XCircle, Key, PackageOpen, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

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

  useEffect(() => {
    async function fetchOrders() {
      try {
        const data = await api.get<Order[]>("/v1/orders/");
        setOrders(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch orders");
        console.error("Failed to fetch orders:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchOrders();
  }, []);

  if (isLoading) {
    return (
      <div className="glass-card p-8">
        <div className="h-6 w-48 bg-slate-800 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-slate-800/30 rounded-xl animate-pulse border border-slate-800/50" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 flex items-center gap-3 text-red-400 bg-red-500/5 border-red-500/20">
        <AlertCircle className="w-5 h-5" />
        <p>{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="glass-card p-12 text-center flex flex-col items-center justify-center border-dashed border-slate-700">
        <PackageOpen className="w-12 h-12 text-slate-600 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No Orders Yet</h3>
        <p className="text-slate-400">Your purchased products and serial keys will appear here.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>;
      case "PENDING":
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"><Clock className="w-3.5 h-3.5" /> Pending</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20"><XCircle className="w-3.5 h-3.5" /> {status}</span>;
    }
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/30">
        <h3 className="text-lg font-semibold text-white">Purchase History</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-400">
          <thead className="text-xs uppercase bg-slate-900/80 text-slate-500 border-b border-slate-800">
            <tr>
              <th className="px-6 py-4 font-semibold tracking-wider">Order Details</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Date</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Total</th>
              <th className="px-6 py-4 font-semibold tracking-wider">Status</th>
              <th className="px-6 py-4 font-semibold tracking-wider text-right">License / Key</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-slate-800/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-medium text-white mb-1 group-hover:text-primary transition-colors">
                    Order #{order.id}
                  </div>
                  <div className="text-xs text-slate-500">
                    {order.items.length > 0 ? `${order.items[0].product_name_snapshot} - ${order.items[0].variant_name_snapshot}` : "No items"}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {new Date(order.created_at).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </td>
                <td className="px-6 py-4 font-medium text-white">
                  ${Number(order.total_amount).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(order.status)}
                </td>
                <td className="px-6 py-4 text-right">
                  {order.status === "COMPLETED" && order.items[0]?.product_key ? (
                    <div className="inline-flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-700 shadow-inner">
                      <Key className="w-3.5 h-3.5 text-primary" />
                      <code className="text-xs font-mono text-slate-300 select-all">
                        {order.items[0].product_key.key_value}
                      </code>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600 italic">Not available</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
