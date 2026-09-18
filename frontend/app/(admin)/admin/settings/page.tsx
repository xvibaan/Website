"use client";

import React, { useState } from "react";
import { Settings, Save } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    howToBuyUrl: "https://youtube.com/watch?v=...",
    howToDepositUrl: "https://youtube.com/watch?v=...",
    broadcastMessage: "System maintenance at 00:00 UTC",
    maintenanceMode: false
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert("Settings saved successfully.");
    }, 1000);
  };

  return (
    <div className="space-y-8">
      <div className="border-b border-red-500/20 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-mono tracking-widest flex items-center gap-3">
            <Settings className="w-8 h-8 text-red-500" />
            SITE SETTINGS
          </h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-red-500 hover:bg-red-600 disabled:bg-red-900 text-black font-bold font-mono px-4 py-2 rounded text-sm transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" /> {isSaving ? "SAVING..." : "SAVE CONFIGURATION"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black/50 backdrop-blur-md border border-red-500/20 rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white font-mono uppercase mb-4">Global Links</h3>
          
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-2">HOW TO BUY URL (Top Header)</label>
            <input 
              type="text" 
              value={settings.howToBuyUrl}
              onChange={(e) => setSettings({...settings, howToBuyUrl: e.target.value})}
              className="w-full bg-black border border-red-500/30 rounded p-3 text-white font-mono focus:border-red-500 focus:outline-none" 
            />
          </div>
          
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-2">HOW TO DEPOSIT URL (Deposit Page)</label>
            <input 
              type="text" 
              value={settings.howToDepositUrl}
              onChange={(e) => setSettings({...settings, howToDepositUrl: e.target.value})}
              className="w-full bg-black border border-red-500/30 rounded p-3 text-white font-mono focus:border-red-500 focus:outline-none" 
            />
          </div>
        </div>

        <div className="bg-black/50 backdrop-blur-md border border-red-500/20 rounded-xl p-6 space-y-6">
          <h3 className="text-lg font-bold text-white font-mono uppercase mb-4">System Broadcast</h3>
          
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-2">BROADCAST MESSAGE (Visible to all users)</label>
            <textarea 
              value={settings.broadcastMessage}
              onChange={(e) => setSettings({...settings, broadcastMessage: e.target.value})}
              className="w-full bg-black border border-red-500/30 rounded p-3 text-white font-mono focus:border-red-500 focus:outline-none min-h-[100px]" 
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input 
              type="checkbox" 
              checked={settings.maintenanceMode}
              onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
              className="w-5 h-5 accent-red-500"
            />
            <span className="text-sm font-mono font-bold text-red-500">ENABLE MAINTENANCE MODE</span>
          </label>
        </div>
      </div>
    </div>
  );
}
