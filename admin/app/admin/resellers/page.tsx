"use client";

import React, { useState, useEffect } from "react";
import { Building2, Plus, Edit, Eye, Lock, Unlock, MoreVertical } from "lucide-react";
import { api } from "../../../lib/api";
import Link from "next/link";

export default function AdminResellersPage() {
  const [resellers, setResellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    code: "",
    ownerEmail: "",
    status: "ACTIVE",
    plan: "BASIC",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.post("/admin/resellers", formData);
      setIsModalOpen(false);
      setFormData({
        businessName: "",
        code: "",
        ownerEmail: "",
        status: "ACTIVE",
        plan: "BASIC",
      });
      fetchResellers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-[#00c2ff]" />
            <span>Reseller Management</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Isolated tenant management and white-label permissions
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-semibold rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Reseller
        </button>
      </div>

      <div className="bg-[#0b0e17] rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-white/5 text-xs uppercase text-gray-500 font-semibold border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Reseller</th>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">Loading...</td>
                </tr>
              ) : resellers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">No resellers found.</td>
                </tr>
              ) : (
                resellers.map((reseller) => (
                  <tr key={reseller.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{reseller.businessName}</div>
                      <div className="text-xs">{new Date(reseller.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-white/5 rounded text-xs font-mono">{reseller.code}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">{reseller.owner?.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        reseller.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        reseller.status === 'SUSPENDED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {reseller.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{reseller.plan}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/resellers/${reseller.id}`} className="p-2 hover:bg-white/10 rounded inline-flex text-gray-400 hover:text-white transition-colors">
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
            <h2 className="text-xl font-bold text-white mb-4">Add New Reseller</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c2ff]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Reseller Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c2ff]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Owner Email</label>
                <input
                  type="email"
                  required
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c2ff]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c2ff]"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="DISABLED">Disabled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Plan</label>
                  <select
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c2ff]"
                  >
                    <option value="BASIC">Basic</option>
                    <option value="PRO">Pro</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
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
                  {submitting ? 'Creating...' : 'Create Reseller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
