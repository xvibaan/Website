"use client";

import React, { useState, useEffect } from "react";
import { Globe, Plus, Eye, Check, X, Loader2 } from "lucide-react";
import { api } from "../../../lib/api";
import Link from "next/link";

export default function AdminWebsiteInstancesPage() {
  const [instances, setInstances] = useState<any[]>([]);
  const [resellers, setResellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    instanceName: "",
    resellerId: "",
    status: "PENDING",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const [instRes, resRes] = await Promise.all([
        api.get("/admin/website-instances"),
        api.get("/admin/resellers")
      ]);
      setInstances(instRes.data);
      setResellers(resRes.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/admin/website-instances", formData);
      setIsModalOpen(false);
      setFormData({
        instanceName: "",
        resellerId: "",
        status: "PENDING",
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Globe className="w-6 h-6 text-[#00c2ff]" />
            <span>Website Instances & Domain Routing</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage multi-tenant storefront deployments, domain routing, and tenant resolution.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-semibold rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Instance
        </button>
      </div>

      <div className="bg-[#0b0e17] rounded-xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-white/5 text-xs uppercase text-gray-500 font-semibold border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Instance Name</th>
                <th className="px-6 py-4">Tenant / Reseller</th>
                <th className="px-6 py-4">Primary Domain</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td>
                </tr>
              ) : instances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">No website instances found.</td>
                </tr>
              ) : (
                instances.map((inst) => (
                  <tr key={inst.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{inst.instanceName}</div>
                      <div className="text-xs">{new Date(inst.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-300">{inst.reseller?.businessName}</div>
                    </td>
                    <td className="px-6 py-4">
                      {inst.primaryDomain ? (
                        <span className="font-mono text-emerald-400 text-xs bg-emerald-400/10 px-2 py-1 rounded">{inst.primaryDomain}</span>
                      ) : (
                        <span className="text-gray-500 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        inst.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        inst.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {inst.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/website-instances/${inst.id}`} className="p-2 hover:bg-white/10 rounded inline-flex text-gray-400 hover:text-white transition-colors">
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Create Website Instance</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Instance Name</label>
                <input
                  type="text"
                  required
                  value={formData.instanceName}
                  onChange={(e) => setFormData({ ...formData, instanceName: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c2ff]"
                  placeholder="e.g. Acme Market"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Tenant / Reseller</label>
                <select
                  required
                  value={formData.resellerId}
                  onChange={(e) => setFormData({ ...formData, resellerId: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c2ff]"
                >
                  <option value="">Select a Reseller</option>
                  {resellers.filter(r => r.status === 'ACTIVE').map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.businessName} — {r.code}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Initial Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c2ff]"
                >
                  <option value="PENDING">Pending</option>
                  <option value="ACTIVE">Active</option>
                  <option value="DISABLED">Disabled</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Instance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
