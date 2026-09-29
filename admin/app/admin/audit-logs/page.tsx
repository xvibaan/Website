"use client";

import React, { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/admin-api";
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Calendar,
  X,
  Eye,
} from "lucide-react";

interface AuditLogItem {
  id: string;
  adminUserId: string;
  adminEmail?: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: any;
  ipAddress: string | null;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Log Modal for JSON inspection
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getAuditLogs({
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        page,
        limit: 20,
      });

      if (res && res.logs) {
        setLogs(res.logs);
        setTotalPages(res.pagination.totalPages);
        setTotalCount(res.pagination.total);
      }
    } catch (err: any) {
      console.error("Audit logs fetch error:", err);
      setError(err?.message || "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, entityFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <ScrollText className="w-6 h-6 text-rose-400" />
            <span>Immutable Audit Trail</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative, tamper-evident record of all administrative modifications and security actions
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-rose-400" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Audit log error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-[#0b0e17] border border-white/10 p-3 rounded-2xl">
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-gray-400">Filter By:</span>
        </div>

        <input
          type="text"
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by action (e.g. UPDATE_STATUS)..."
          className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-400"
        />

        <input
          type="text"
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by entity (e.g. USER, WALLET)..."
          className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-400"
        />
      </div>

      {/* Audit Logs Table */}
      <div className="bg-[#0b0e17] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/50 border-b border-white/10 text-gray-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Admin Email</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Entity Type</th>
                <th className="py-3.5 px-4">Target ID</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin text-rose-400 mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No audit log records match the current filter criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-white font-medium">
                      {log.adminEmail || log.adminUserId}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-300">
                      {log.entityType}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400 truncate max-w-[140px]">
                      {log.entityId || "N/A"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                      {log.ipAddress || "127.0.0.1"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
                        title="View JSON Payload"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs text-gray-400">
          <span>
            Showing <strong className="text-white">{logs.length}</strong> of{" "}
            <strong className="text-white">{totalCount}</strong> audit events
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

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-white/15 max-w-lg w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-rose-400" />
                <h3 className="text-base font-bold text-white">Audit Event Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-black/40 border border-white/5">
                <span className="text-gray-500">Action:</span>
                <span className="text-rose-400 font-bold">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-black/40 border border-white/5">
                <span className="text-gray-500">Entity:</span>
                <span className="text-white">{selectedLog.entityType} ({selectedLog.entityId || "N/A"})</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-black/40 border border-white/5">
                <span className="text-gray-500">Admin Email:</span>
                <span className="text-white">{selectedLog.adminEmail || selectedLog.adminUserId}</span>
              </div>
            </div>

            <div>
              <span className="text-[11px] font-mono uppercase text-gray-400 block mb-1">
                Raw Event Payload (JSON)
              </span>
              <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-gray-300 max-h-48 overflow-y-auto">
                {JSON.stringify(selectedLog.details, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-white/10">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
