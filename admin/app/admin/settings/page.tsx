"use client";

import React, { useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sliders,
  Shield,
  Clock,
  Mail,
  Send,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, { value: string; description: string | null; updatedAt: string }>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({
    marketplace_name: "HOST MARKET PLACE",
    support_email: "support@hostmarketplace.com",
    telegram_support_url: "https://t.me/HostMarketPlaceSupport",
    default_currency: "INR",
    timezone: "Asia/Kolkata",
    maintenance_mode: "false",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getSettings();
      if (res && res.settings) {
        setSettings(res.settings);
        const newValues: Record<string, string> = {};
        Object.entries(res.settings).forEach(([k, v]) => {
          newValues[k] = v.value;
        });
        setFormValues((prev) => ({ ...prev, ...newValues }));
      }
    } catch (err: any) {
      console.error("Settings fetch error:", err);
      setError(err?.message || "Failed to load platform settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApi.updateSettings(formValues);
      setActionSuccess("Platform settings updated successfully in PostgreSQL.");
      fetchSettings();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err?.message || "Failed to update settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-[#00c2ff]" />
            <span>Platform Governance &amp; Settings</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Authoritative platform metadata, support endpoints, and global configuration values
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-gray-300 hover:text-white transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#00c2ff]" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Success Banner */}
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
            <span className="font-semibold block mb-0.5">Settings update error</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Settings Form */}
      <div className="bg-[#0b0e17] border border-white/10 rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleSave} className="space-y-6 max-w-2xl text-xs">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                Marketplace Name
              </label>
              <input
                type="text"
                value={formValues.marketplace_name || ""}
                onChange={(e) => setFormValues({ ...formValues, marketplace_name: e.target.value })}
                className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>Support Email</span>
                </label>
                <input
                  type="email"
                  value={formValues.support_email || ""}
                  onChange={(e) => setFormValues({ ...formValues, support_email: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-[#00c2ff]" />
                  <span>Telegram Support URL</span>
                </label>
                <input
                  type="url"
                  value={formValues.telegram_support_url || ""}
                  onChange={(e) => setFormValues({ ...formValues, telegram_support_url: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Default Platform Currency
                </label>
                <input
                  type="text"
                  value={formValues.default_currency || "INR"}
                  onChange={(e) => setFormValues({ ...formValues, default_currency: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 uppercase mb-1">
                  Timezone
                </label>
                <input
                  type="text"
                  value={formValues.timezone || "Asia/Kolkata"}
                  onChange={(e) => setFormValues({ ...formValues, timezone: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 focus:border-[#00c2ff] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="maintenance_mode"
                  checked={formValues.maintenance_mode === "true"}
                  onChange={(e) =>
                    setFormValues({
                      ...formValues,
                      maintenance_mode: e.target.checked ? "true" : "false",
                    })
                  }
                  className="rounded bg-black/50 border-white/10 text-amber-500 focus:ring-0"
                />
                <label htmlFor="maintenance_mode" className="text-gray-200 font-medium">
                  Enable Marketplace Maintenance Mode
                </label>
              </div>
              <span className="text-[11px] text-gray-500 block mt-1">
                When enabled, customer checkout and wallet top-ups are temporarily paused.
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex items-center justify-end">
            <button
              type="submit"
              disabled={saving || loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00c2ff] hover:bg-[#00c2ff]/90 text-black font-semibold text-xs transition-all shadow-[0_0_15px_rgba(0,194,255,0.25)] disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save System Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
