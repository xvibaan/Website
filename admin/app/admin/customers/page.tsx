"use client";

import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/admin-api";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Wallet,
  Calendar,
  Shield,
  Filter,
  Eye,
  X,
  Lock,
  Unlock,
} from "lucide-react";

interface CustomerItem {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  wallet?: {
    id: string;
    balance: string;
    currency: string;
    status: string;
  } | null;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected customer modal for detail/status modification
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  const [statusChangeModalOpen, setStatusChangeModalOpen] = useState(false);
  const [statusReason, setStatusReason] = useState("");
  const [mutatingStatus, setMutatingStatus] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const isActiveParam = statusFilter === "active" ? true : statusFilter === "inactive" ? false : undefined;
      const res = await adminApi.getCustomers({
        search: search.trim() || undefined,
        isActive: isActiveParam,
        page,
        limit: 15,
      });

      if (res && res.customers) {
        setCustomers(res.customers);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      }
    } catch (err: any) {
      console.error("Customers fetch error:", err);
      setError(err?.message || "Failed to retrieve customers from backend.");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  };

  const handleToggleStatus = async () => {
    if (!selectedCustomer) return;
    setMutatingStatus(true);
    setError(null);
    try {
      const nextStatus = !selectedCustomer.isActive;
      const res = await adminApi.updateCustomerStatus(
        selectedCustomer.id,
        nextStatus,
        statusReason.trim() || undefined
      );

      if (res.success) {
        setActionSuccessMessage(
          `Customer ${selectedCustomer.email} was successfully ${nextStatus ? "activated" : "deactivated"}.`
        );
        setStatusChangeModalOpen(false);
        setStatusReason("");
        setSelectedCustomer(null);
        fetchCustomers();
        setTimeout(() => setActionSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to update customer status.");
    } finally {
      setMutatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#00c2ff]" />
            <span>Customer Management</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative user registry with central wallet summaries and access control
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#00c2ff]" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Error processing customer request</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0b0e17] border border-white/10 p-3 rounded-2xl">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 relative">
          <Search className="w-4 h-4 text-gray-500 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer email or ID..."
            className="w-full bg-black/40 border border-white/10 focus:border-[#00c2ff] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
          />
          <button
            type="submit"
            className="px-3.5 py-2 bg-[#00c2ff]/10 hover:bg-[#00c2ff]/20 text-[#00c2ff] border border-[#00c2ff]/30 rounded-xl text-xs font-medium transition-all"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-gray-300 focus:outline-none text-xs"
            >
              <option value="all" className="bg-[#0b0e17]">All Statuses</option>
              <option value="active" className="bg-[#0b0e17]">Active Only</option>
              <option value="inactive" className="bg-[#0b0e17]">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-[#0b0e17] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/50 border-b border-white/10 text-gray-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Wallet Balance</th>
                <th className="py-3.5 px-4">Registered</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-[#00c2ff]" />
                      <span>Querying PostgreSQL database...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No customers match the current filter criteria.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-medium text-white block">{customer.email}</span>
                        <span className="text-[10px] font-mono text-gray-500 block truncate max-w-[200px]">
                          {customer.id}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300">
                        <Shield className="w-3 h-3 text-gray-400" />
                        {customer.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {customer.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 font-mono">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {customer.wallet ? (
                        <span className="text-emerald-400 font-semibold">
                          ₹{Number(customer.wallet.balance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-gray-500">No Wallet</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                      {new Date(customer.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedCustomer(customer)}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all text-xs"
                          title="View Customer Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setStatusChangeModalOpen(true);
                          }}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                            customer.isActive
                              ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20"
                              : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                          }`}
                        >
                          {customer.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <span>
            Showing <strong className="text-white">{customers.length}</strong> of{" "}
            <strong className="text-white">{totalCount}</strong> records
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-mono text-gray-300">
              {page} / {Math.max(1, totalPages)}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && !statusChangeModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-white/15 max-w-lg w-full rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00c2ff]" />
                <h3 className="text-base font-bold text-white">Customer Record</h3>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase block">Customer ID</span>
                <span className="text-white break-all">{selectedCustomer.id}</span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase block">Email Address</span>
                <span className="text-white">{selectedCustomer.email}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase block">Account Role</span>
                  <span className="text-gray-200 uppercase">{selectedCustomer.role}</span>
                </div>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="text-[10px] text-gray-500 uppercase block">Account Status</span>
                  <span className={selectedCustomer.isActive ? "text-emerald-400" : "text-red-400"}>
                    {selectedCustomer.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
              </div>

              {selectedCustomer.wallet && (
                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 uppercase block">Wallet Balance</span>
                  <span className="text-lg font-bold text-emerald-400">
                    ₹{Number(selectedCustomer.wallet.balance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-gray-400 block mt-0.5">
                    Wallet ID: {selectedCustomer.wallet.id}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Confirmation Modal */}
      {statusChangeModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-white/15 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedCustomer.isActive
                    ? "bg-red-500/10 border border-red-500/30 text-red-400"
                    : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                }`}
              >
                {selectedCustomer.isActive ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {selectedCustomer.isActive ? "Deactivate Customer Account" : "Activate Customer Account"}
                </h3>
                <span className="text-xs text-gray-400 truncate block">{selectedCustomer.email}</span>
              </div>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              {selectedCustomer.isActive
                ? "Deactivating will prevent this customer from logging in, ordering products, or executing wallet withdrawals. Financial records remain intact."
                : "Activating will restore full login and ordering privileges to this customer account."}
            </p>

            <div>
              <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                Reason for Audit Trail (Optional)
              </label>
              <input
                type="text"
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g., Security review / customer request"
                className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setStatusChangeModalOpen(false);
                  setSelectedCustomer(null);
                  setStatusReason("");
                }}
                disabled={mutatingStatus}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={mutatingStatus}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                  selectedCustomer.isActive
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-emerald-500 hover:bg-emerald-600 text-white"
                }`}
              >
                {mutatingStatus && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm {selectedCustomer.isActive ? "Deactivation" : "Activation"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
