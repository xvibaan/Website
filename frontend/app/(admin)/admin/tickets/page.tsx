"use client";

import React, { useState } from "react";
import { MessageSquare, CheckCircle } from "lucide-react";

export default function AdminTicketsPage() {
  const [tickets, setTickets] = useState([
    { id: 1, user: "user1@test.com", subject: "Payment not added to wallet", status: "OPEN", date: "2023-10-25", message: "I paid via UPI 30 mins ago, but my wallet is still empty." },
    { id: 2, user: "user2@test.com", subject: "Key expired early", status: "CLOSED", date: "2023-10-20", message: "My 3-day key expired in 2 days." }
  ]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  return (
    <div className="space-y-8">
      <div className="border-b border-red-500/20 pb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-mono tracking-widest flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-red-500" />
            SUPPORT QUEUE
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 space-y-3">
          {tickets.map((t) => (
            <div 
              key={t.id} 
              onClick={() => setSelectedTicket(t)}
              className={`p-4 border rounded cursor-pointer transition-colors ${
                selectedTicket?.id === t.id ? 'bg-red-500/10 border-red-500' : 'bg-black/50 border-red-500/20 hover:border-red-500/50'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold font-mono text-gray-400">#{t.id}</span>
                <span className={`px-2 py-0.5 text-[10px] font-bold font-mono uppercase rounded border ${
                  t.status === 'OPEN' ? 'border-red-500/50 text-red-500 bg-red-500/10' : 'border-gray-700 text-gray-500 bg-gray-900'
                }`}>
                  {t.status}
                </span>
              </div>
              <h4 className="text-sm text-white font-bold font-mono mb-1">{t.subject}</h4>
              <p className="text-xs text-gray-500 truncate">{t.user}</p>
            </div>
          ))}
        </div>

        {/* Ticket Detail */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <div className="bg-black/50 backdrop-blur-md border border-red-500/20 rounded-xl p-6 flex flex-col h-full min-h-[400px]">
              <div className="border-b border-white/10 pb-4 mb-4">
                <h2 className="text-xl font-bold text-white font-mono mb-2">{selectedTicket.subject}</h2>
                <div className="flex justify-between text-xs text-gray-500 font-mono">
                  <span>From: <span className="text-white">{selectedTicket.user}</span></span>
                  <span>{selectedTicket.date}</span>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                {/* User Message */}
                <div className="bg-white/5 p-4 rounded text-sm text-gray-300 font-mono">
                  {selectedTicket.message}
                </div>
                
                {/* Mock Admin Reply Area */}
                <div className="mt-8">
                  <label className="block text-xs font-mono text-gray-400 mb-2">ADMIN REPLY</label>
                  <textarea 
                    className="w-full bg-black border border-red-500/30 rounded p-3 text-white font-mono focus:border-red-500 focus:outline-none min-h-[100px]" 
                    placeholder="Type your response here..."
                  />
                  <div className="flex gap-3 mt-3">
                    <button className="bg-red-500 hover:bg-red-600 text-black font-bold font-mono px-4 py-2 rounded text-sm transition-colors">
                      SEND REPLY
                    </button>
                    <button className="border border-green-500 text-green-500 hover:bg-green-500/10 font-bold font-mono px-4 py-2 rounded text-sm transition-colors flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> MARK RESOLVED
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-black/50 border border-red-500/20 rounded-xl p-6 h-full min-h-[400px] flex items-center justify-center text-gray-600 font-mono text-sm uppercase">
              SELECT A TICKET TO VIEW DETAILS
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
