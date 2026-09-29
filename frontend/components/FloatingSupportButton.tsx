"use client";

import React from "react";
import { Send } from "lucide-react";
import { useNavigation } from "@/context/NavigationContext";

export default function FloatingSupportButton() {
  const { contentSettings } = useNavigation();
  const telegramUrl =
    (contentSettings as any)?.helpSupport?.telegramSupportUrl ||
    (contentSettings as any)?.support?.telegramSupportUrl ||
    "https://t.me/host_marketplace_support";

  return (
    <a
      href={telegramUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contact Host Market Place Support on Telegram"
      title="Main Support: @host_marketplace_support"
      className="fixed bottom-5 right-5 z-40 group flex items-center gap-2 p-3 sm:px-4 sm:py-3 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-mono text-xs font-bold shadow-[0_4px_25px_rgba(59,130,246,0.45)] border border-blue-400/30 transition-all duration-200 hover:scale-105 min-w-[48px] min-h-[48px] focus-visible:ring-2 focus-visible:ring-blue-400 outline-none"
    >
      <div className="relative flex items-center justify-center">
        <Send className="w-5 h-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#06080e]" />
      </div>
      <span className="hidden sm:inline-block tracking-wide">
        Main Support
      </span>
    </a>
  );
}
