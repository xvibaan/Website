"use client";

import React, { useState, useEffect } from "react";
import { Building2, ArrowLeft, Key, Shield, Check, X, RefreshCw, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { api } from "../../../../lib/api";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

export default function ResellerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [reseller, setReseller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [apiSecret, setApiSecret] = useState<string | null>(null);
  
  const [wallet, setWallet] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  useEffect(() => {
    const fetchReseller = async () => {
      try {
        const [resellerRes, walletRes, ledgerRes] = await Promise.all([
          api.get(`/admin/resellers/${id}`),
          api.get(`/admin/resellers/${id}/wallet`),
          api.get(`/admin/resellers/${id}/wallet/ledger`)
        ]);
        setReseller(resellerRes.data);
        setWallet(walletRes.data);
        setLedger(ledgerRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchReseller();
  }, [id]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    try {
      const res = await api.patch(`/admin/resellers/${id}`, { status });
      setReseller(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const generateApiToken = async () => {
    if (!confirm("Are you sure? Any existing token will be invalidated.")) return;
    setUpdating(true);
    try {
      const res = await api.post(`/admin/resellers/${id}/api-token`);
      setApiSecret(res.data.secret);
      setReseller({ ...reseller, apiAccessEnabled: true });
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const revokeApiToken = async () => {
    if (!confirm("Are you sure? This will break any existing integrations.")) return;
    setUpdating(true);
    try {
      await api.delete(`/admin/resellers/${id}/api-token`);
      setReseller({ ...reseller, apiAccessEnabled: false });
      setApiSecret(null);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAdjustment = async (type: 'credit' | 'debit') => {
    if (!adjustAmount || isNaN(Number(adjustAmount)) || Number(adjustAmount) <= 0) return alert("Enter valid positive amount");
    if (!adjustReason || adjustReason.length < 3) return alert("Enter valid reason");
    if (!confirm(`Are you sure you want to ${type} ${adjustAmount} INR?`)) return;

    setUpdating(true);
    try {
      const res = await api.post(`/admin/resellers/${id}/wallet/${type}`, {
        amount: adjustAmount,
        reason: adjustReason,
      });
      setWallet(res.data.wallet);
      setLedger([res.data.ledgerEntry, ...ledger]);
      setAdjustAmount("");
      setAdjustReason("");
    } catch (err: any) {
      alert(err.response?.data?.error || err.message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="text-white">Loading...</div>;
  }

  if (!reseller) {
    return <div className="text-white">Reseller not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 pb-4 border-b border-white/10">
        <Link href="/admin/resellers" className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-[#00c2ff]" />
            <span>{reseller.businessName}</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Code: {reseller.code} • Created: {new Date(reseller.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-xl bg-[#0b0e17] border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Business Name</label>
                <div className="mt-1 text-white font-medium">{reseller.businessName}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Owner Email</label>
                <div className="mt-1 text-white font-medium">{reseller.owner?.email}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Contact Email</label>
                <div className="mt-1 text-white font-medium">{reseller.contactEmail}</div>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Plan / Tier</label>
                <div className="mt-1 text-white font-medium">{reseller.plan}</div>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[#0b0e17] border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">API Access Foundation</h2>
              <Shield className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${reseller.apiAccessEnabled ? 'bg-emerald-500' : 'bg-gray-500'}`} />
                <span className="text-sm text-gray-300">
                  API Access is currently <strong>{reseller.apiAccessEnabled ? 'Enabled' : 'Disabled'}</strong>
                </span>
              </div>

              {apiSecret && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <p className="text-sm text-emerald-400 font-semibold mb-2">New API Secret Generated!</p>
                  <p className="text-xs text-gray-400 mb-2">Please copy this secret now. It will not be shown again.</p>
                  <div className="font-mono text-sm bg-black/40 p-3 rounded border border-white/5 text-white break-all">
                    {apiSecret}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={generateApiToken}
                  disabled={updating}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  {reseller.apiAccessEnabled ? 'Rotate API Token' : 'Generate API Token'}
                </button>
                {reseller.apiAccessEnabled && (
                  <button
                    onClick={revokeApiToken}
                    disabled={updating}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Revoke Access
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[#0b0e17] border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Prepaid Wallet & Ledger</h2>
              <Wallet className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Current Balance</p>
                <p className="text-2xl font-bold text-white">
                  {wallet ? `${wallet.currency} ${Number(wallet.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A'}
                </p>
              </div>
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Wallet Status</p>
                <p className="text-lg font-medium text-emerald-400 uppercase">{wallet?.status || 'UNKNOWN'}</p>
              </div>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-6">
              <h3 className="text-sm font-semibold text-white mb-3">Manual Adjustment</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-32 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c2ff]"
                />
                <input
                  type="text"
                  placeholder="Reason for adjustment"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00c2ff]"
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAdjustment('credit')}
                  disabled={updating}
                  className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <ArrowUpRight className="w-4 h-4" /> Credit
                </button>
                <button
                  onClick={() => handleAdjustment('debit')}
                  disabled={updating}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <ArrowDownRight className="w-4 h-4" /> Debit
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Recent Ledger Entries</h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {ledger.slice(0, 10).map((entry: any) => (
                  <div key={entry.id} className="p-3 bg-black/40 border border-white/5 rounded-lg flex justify-between items-center">
                    <div>
                      <p className="text-sm text-white font-medium capitalize">{entry.entryType} - {entry.referenceType}</p>
                      <p className="text-xs text-gray-500">{new Date(entry.createdAt).toLocaleString()}</p>
                      <p className="text-xs text-gray-400 mt-1">{entry.description}</p>
                    </div>
                    <div className={`text-sm font-bold ${entry.entryType === 'credit' || entry.entryType === 'refund' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {entry.entryType === 'credit' || entry.entryType === 'refund' ? '+' : '-'} {entry.amount} {entry.currency}
                    </div>
                  </div>
                ))}
                {ledger.length === 0 && <p className="text-sm text-gray-500">No entries yet.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-[#0b0e17] border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-4">Status Management</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                  reseller.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  reseller.status === 'SUSPENDED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                  {reseller.status}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {reseller.status !== 'ACTIVE' && (
                  <button
                    onClick={() => updateStatus('ACTIVE')}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Set Active
                  </button>
                )}
                {reseller.status !== 'SUSPENDED' && (
                  <button
                    onClick={() => updateStatus('SUSPENDED')}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Suspend
                  </button>
                )}
                {reseller.status !== 'DISABLED' && (
                  <button
                    onClick={() => updateStatus('DISABLED')}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-medium rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Disable
                  </button>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-6 rounded-xl bg-[#0b0e17] border border-white/10">
            <h2 className="text-lg font-semibold text-white mb-2">Catalog Scope</h2>
            <p className="text-xs text-gray-400 mb-4">
              Categories and products this reseller is permitted to sell.
            </p>
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300">
              Global Scope (All Categories)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
