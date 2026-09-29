"use client";

import React, { useState, useEffect } from "react";
import { Globe, ArrowLeft, ShieldAlert, Link as LinkIcon, Trash2, CheckCircle2, Server } from "lucide-react";
import { api } from "../../../../lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function WebsiteInstanceDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [instance, setInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [domainModalOpen, setDomainModalOpen] = useState(false);
  const [domainForm, setDomainForm] = useState({ hostname: "", hostnameType: "CUSTOM_DOMAIN" });
  const [error, setError] = useState("");

  const fetchInstance = async () => {
    try {
      const res = await api.get(`/admin/website-instances/${id}`);
      setInstance(res.data.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstance();
  }, [id]);

  const handleUpdateStatus = async (status: string) => {
    try {
      await api.patch(`/admin/website-instances/${id}`, { status });
      fetchInstance();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/admin/website-instances/${id}/domains`, domainForm);
      setDomainModalOpen(false);
      setDomainForm({ hostname: "", hostnameType: "CUSTOM_DOMAIN" });
      fetchInstance();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    try {
      await api.patch(`/admin/website-instances/${id}/domains/${domainId}`, { isPrimary: true });
      fetchInstance();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleUpdateDomainStatus = async (domainId: string, status: string) => {
    try {
      await api.patch(`/admin/website-instances/${id}/domains/${domainId}`, { status });
      fetchInstance();
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleRemoveDomain = async (domainId: string) => {
    if (!confirm("Remove this domain routing?")) return;
    try {
      await api.delete(`/admin/website-instances/${id}/domains/${domainId}`);
      fetchInstance();
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading instance details...</div>;
  if (!instance) return <div className="p-8 text-center text-red-400">Instance not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/website-instances" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-300" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            {instance.instanceName}
          </h1>
          <p className="text-xs text-gray-400 mt-1">Tenant: {instance.reseller?.businessName}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-[#0b0e17] rounded-xl border border-white/10 p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Domain Routing</h2>
              <button
                onClick={() => setDomainModalOpen(true)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded border border-white/10 text-xs font-medium transition-colors"
              >
                + Add Domain
              </button>
            </div>
            
            <div className="space-y-3">
              {instance.domains.length === 0 ? (
                <div className="text-center py-6 text-sm text-gray-500 bg-black/40 rounded-lg border border-white/5">
                  No domains configured for this instance.
                </div>
              ) : (
                instance.domains.map((domain: any) => (
                  <div key={domain.id} className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-[#00c2ff]" />
                        <span className="font-mono text-sm text-gray-200">{domain.hostname}</span>
                        {domain.hostname === instance.primaryDomain && (
                          <span className="px-2 py-0.5 bg-[#00c2ff]/10 text-[#00c2ff] text-[10px] rounded uppercase font-bold tracking-wider">Primary</span>
                        )}
                        <span className={`px-2 py-0.5 text-[10px] rounded uppercase font-bold tracking-wider ${
                          domain.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-400' :
                          domain.status === 'PENDING_VERIFICATION' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-red-500/10 text-red-400'
                        }`}>
                          {domain.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">{domain.hostnameType.replace('_', ' ')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {domain.hostname !== instance.primaryDomain && domain.status === 'VERIFIED' && (
                        <button onClick={() => handleSetPrimary(domain.id)} className="px-2 py-1 text-xs text-gray-400 hover:text-white bg-white/5 rounded">Set Primary</button>
                      )}
                      {domain.status === 'PENDING_VERIFICATION' && (
                        <button onClick={() => handleUpdateDomainStatus(domain.id, 'VERIFIED')} className="px-2 py-1 text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 rounded">Verify</button>
                      )}
                      {domain.status === 'VERIFIED' && (
                        <button onClick={() => handleUpdateDomainStatus(domain.id, 'DISABLED')} className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-red-500/10 rounded">Disable</button>
                      )}
                      {domain.status === 'DISABLED' && (
                        <button onClick={() => handleUpdateDomainStatus(domain.id, 'PENDING_VERIFICATION')} className="px-2 py-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 rounded">Reset</button>
                      )}
                      <button onClick={() => handleRemoveDomain(domain.id)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 flex gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div className="text-sm text-gray-300">
                <p className="font-medium text-amber-400 mb-1">Infrastructure Provisioning</p>
                <p className="text-xs text-gray-400">DNS automation and TLS certificate generation are currently manual. Marking a domain as Verified only authorizes the application to route it. You must configure the reverse proxy/DNS infrastructure accordingly.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="bg-[#0b0e17] rounded-xl border border-white/10 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Instance Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Current State</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  instance.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400' :
                  instance.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/10 text-red-400'
                }`}>
                  {instance.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                {instance.status !== 'ACTIVE' && (
                  <button onClick={() => handleUpdateStatus('ACTIVE')} className="py-2 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded hover:bg-emerald-500/20 transition-colors">
                    Enable
                  </button>
                )}
                {instance.status !== 'SUSPENDED' && (
                  <button onClick={() => handleUpdateStatus('SUSPENDED')} className="py-2 bg-amber-500/10 text-amber-400 text-xs font-medium rounded hover:bg-amber-500/20 transition-colors">
                    Suspend
                  </button>
                )}
                {instance.status !== 'DISABLED' && (
                  <button onClick={() => handleUpdateStatus('DISABLED')} className="py-2 bg-red-500/10 text-red-400 text-xs font-medium rounded hover:bg-red-500/20 transition-colors col-span-2">
                    Disable
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#0b0e17] rounded-xl border border-white/10 p-6 shadow-2xl">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Instance Metadata</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">ID</span>
                <span className="text-gray-300 font-mono text-xs">{instance.id.split('-')[0]}...</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-300">{new Date(instance.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {domainModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Add Domain Route</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleAddDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Hostname</label>
                <input
                  type="text"
                  required
                  value={domainForm.hostname}
                  onChange={(e) => setDomainForm({ ...domainForm, hostname: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c2ff] font-mono"
                  placeholder="e.g. store.example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                <select
                  value={domainForm.hostnameType}
                  onChange={(e) => setDomainForm({ ...domainForm, hostnameType: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c2ff]"
                >
                  <option value="CUSTOM_DOMAIN">Custom Domain</option>
                  <option value="SUBDOMAIN">Platform Subdomain</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setDomainModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-semibold rounded-lg text-sm transition-colors"
                >
                  Add Domain
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
