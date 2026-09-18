"use client";

import React, { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { LifeBuoy, Plus, MessageSquare } from "lucide-react";

export default function SupportPage() {
  const [tickets, setTickets] = useState([
    { id: 1, subject: "Payment not added to wallet", status: "OPEN", date: "2023-10-25" },
    { id: 2, subject: "Key expired early", status: "CLOSED", date: "2023-10-20" }
  ]);
  const [isCreating, setIsCreating] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <LifeBuoy className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-white font-mono uppercase tracking-widest">SUPPORT TICKET</h1>
            </div>
            
            <button 
              onClick={() => setIsCreating(!isCreating)}
              className="cyber-btn flex items-center gap-2 text-xs !py-2"
            >
              {isCreating ? "CANCEL" : <><Plus className="w-4 h-4" /> NEW TICKET</>}
            </button>
          </div>

          {isCreating && (
            <div className="glass-card p-6 border-primary/20 mb-8">
              <h3 className="text-lg font-bold text-white font-mono mb-4 uppercase">Create New Ticket</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-primary/70 mb-2">SUBJECT</label>
                  <input type="text" className="cyber-input" placeholder="What is your issue about?" />
                </div>
                <div>
                  <label className="block text-xs font-mono text-primary/70 mb-2">MESSAGE</label>
                  <textarea className="cyber-input min-h-[120px]" placeholder="Describe your issue in detail..."></textarea>
                </div>
                <button className="cyber-btn w-full !py-3">SUBMIT TICKET</button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {tickets.map((t) => (
              <div key={t.id} className="glass-card p-4 border-primary/10 flex items-center justify-between hover:border-primary/40 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold font-mono group-hover:text-primary transition-colors">{t.subject}</h4>
                    <span className="text-xs text-gray-500 font-mono">ID: #{t.id} • {t.date}</span>
                  </div>
                </div>
                
                <span className={`px-2 py-1 text-[10px] font-bold font-mono uppercase rounded border ${
                  t.status === 'OPEN' ? 'border-primary/50 text-primary bg-primary/10' : 'border-gray-700 text-gray-500 bg-gray-900'
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
