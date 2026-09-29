"use client";

import React, { useState, useEffect } from "react";
import { KeyRound, ShieldCheck, Eye, Shield } from "lucide-react";
import { api } from "../../../lib/api";
import Link from "next/link";

export default function AdminApiAccessPage() {
  const [resellers, setResellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResellers = async () => {
    try {
      const res = await api.get("/admin/resellers");
      setResellers(res.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResellers();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <KeyRound className="w-6 h-6 text-[#00c2ff]" />
            <span>Reseller & Partner API Access</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Programmatic API token management, access status, and API scope identities.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 font-mono text-xs">
          <span>Connected to Reseller System</span>
        </div>
      </div>

      <div className="bg-[#0b0e17] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-white/5 text-xs uppercase text-gray-500 font-semibold border-b border-white/10">
              <tr>
                <th className="px-6 py-4">API Identity / Reseller</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">API Status</th>
                <th className="px-6 py-4">Catalog Scope</th>
                <th className="px-6 py-4 text-right">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">Loading API Identities...</td>
                </tr>
              ) : resellers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">No resellers found.</td>
                </tr>
              ) : (
                resellers.map((reseller) => (
                  <tr key={reseller.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white flex items-center gap-2">
                        {reseller.businessName}
                        {reseller.apiAccessEnabled && <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="text-xs">{reseller.owner?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-white/5 rounded text-xs font-mono">{reseller.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        reseller.apiAccessEnabled 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {reseller.apiAccessEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-gray-300 bg-white/5 px-2 py-1 rounded">Global</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/resellers/${reseller.id}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-gray-300 hover:text-white transition-colors text-xs font-medium">
                        <KeyRound className="w-3.5 h-3.5" />
                        Manage Keys
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
