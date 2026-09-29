"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import {
  Link2,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  X,
  FileText,
  Video,
  HelpCircle,
} from "lucide-react";

interface ResourceItem {
  id: string;
  productId: string | null;
  name: string;
  type: string;
  purpose: string | null;
  url: string;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "DOCUMENTATION",
    purpose: "",
    url: "",
    status: "ACTIVE",
    sortOrder: 0,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getResources();
      if (res && res.resources) {
        setResources(res.resources);
      }
    } catch (err: any) {
      console.error("Resources fetch error:", err);
      setError(err?.message || "Failed to retrieve resources.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const openCreateModal = () => {
    setEditingResource(null);
    setFormData({
      name: "",
      type: "DOCUMENTATION",
      purpose: "",
      url: "",
      status: "ACTIVE",
      sortOrder: (resources.length + 1) * 10,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (res: ResourceItem) => {
    setEditingResource(res);
    setFormData({
      name: res.name,
      type: res.type,
      purpose: res.purpose || "",
      url: res.url,
      status: res.status,
      sortOrder: res.sortOrder,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingResource) {
        await adminApi.updateResource(editingResource.id, {
          name: formData.name,
          type: formData.type,
          purpose: formData.purpose || undefined,
          url: formData.url,
          status: formData.status,
          sortOrder: Number(formData.sortOrder),
        });
        setActionSuccess(`Resource '${formData.name}' updated.`);
      } else {
        await adminApi.createResource({
          name: formData.name,
          type: formData.type,
          purpose: formData.purpose || undefined,
          url: formData.url,
          status: formData.status,
          sortOrder: Number(formData.sortOrder),
        });
        setActionSuccess(`Resource '${formData.name}' created.`);
      }

      setIsModalOpen(false);
      fetchResources();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to save resource.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (res: ResourceItem) => {
    if (!window.confirm(`Are you sure you want to remove resource '${res.name}'?`)) return;
    try {
      await adminApi.deleteResource(res.id);
      setActionSuccess(`Resource '${res.name}' deleted.`);
      fetchResources();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to delete resource.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Link2 className="w-6 h-6 text-[#00c2ff]" />
            <span>Links & Resources Hub</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative documentation, setup tutorials, external guide links, and community references
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchResources}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#00c2ff]" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-semibold text-xs transition-all shadow-[0_0_15px_rgba(0,194,255,0.25)]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Resource</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Resource manager error</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Resources Table */}
      <div className="bg-[#0b0e17] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/50 border-b border-white/10 text-gray-400 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Order</th>
                <th className="py-3.5 px-4">Title / Name</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">URL</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin text-[#00c2ff] mx-auto" />
                  </td>
                </tr>
              ) : resources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No resources configured yet. Click &quot;Add Resource&quot; to provide guides or documentation.
                  </td>
                </tr>
              ) : (
                resources.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono text-gray-400">{r.sortOrder}</td>
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-white block">{r.name}</span>
                        {r.purpose && (
                          <span className="text-[11px] text-gray-400 block truncate max-w-sm">
                            {r.purpose}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-300">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {r.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#00c2ff] hover:underline flex items-center gap-1 truncate max-w-xs"
                      >
                        <span className="truncate">{r.url}</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-mono ${
                          r.status === "ACTIVE"
                            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                            : "bg-red-500/10 border border-red-500/20 text-red-400"
                        }`}
                      >
                        {r.status === "ACTIVE" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        <span>{r.status}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
                          title="Edit Resource"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all"
                          title="Delete Resource"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b0e17] border border-white/15 max-w-md w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-[#00c2ff]" />
                <h3 className="text-base font-bold text-white">
                  {editingResource ? "Edit Resource" : "Add Resource Link"}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Resource Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. VPS Getting Started Guide"
                  className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Resource Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="DOCUMENTATION">DOCUMENTATION</option>
                    <option value="TUTORIAL">TUTORIAL</option>
                    <option value="COMMUNITY">COMMUNITY</option>
                    <option value="EXTERNAL_TOOL">EXTERNAL_TOOL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                    className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Target Destination URL *
                </label>
                <input
                  type="url"
                  required
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  placeholder="https://docs.hostmarketplace.com/vps"
                  className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Purpose / Summary
                </label>
                <textarea
                  rows={2}
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Explains SSH keys, firewall configuration, and IP setup..."
                  className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-semibold flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingResource ? "Save Changes" : "Create Resource"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
