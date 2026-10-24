"use client";

import React, { useState } from "react";
import {
  Download,
  FileDown,
  FileText,
  Package,
  BookOpen,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/lib/api";

export interface DigitalDeliverableFile {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes?: number;
  status: string;
}

export interface DigitalFileDownloadSectionProps {
  files: DigitalDeliverableFile[];
  orderStatus: string;
  paymentStatus?: string;
  compact?: boolean;
  className?: string;
}

function formatByteSize(bytes?: number): string {
  if (typeof bytes !== "number" || bytes <= 0 || isNaN(bytes)) return "File ready";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeTypeDetails(mimeType: string, filename: string) {
  const m = (mimeType || "").toLowerCase();
  const f = (filename || "").toLowerCase();

  if (m === "application/pdf" || f.endsWith(".pdf")) {
    return {
      label: "PDF",
      badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/25",
      icon: <FileText className="w-4 h-4 text-rose-400 shrink-0" />,
    };
  }

  if (m === "application/zip" || f.endsWith(".zip")) {
    return {
      label: "ZIP",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/25",
      icon: <Package className="w-4 h-4 text-amber-400 shrink-0" />,
    };
  }

  if (m === "application/epub+zip" || f.endsWith(".epub")) {
    return {
      label: "EPUB",
      badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/25",
      icon: <BookOpen className="w-4 h-4 text-purple-400 shrink-0" />,
    };
  }

  if (m === "application/vnd.android.package-archive" || f.endsWith(".apk")) {
    return {
      label: "APK",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
      icon: <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />,
    };
  }

  return {
    label: "FILE",
    badgeClass: "bg-primary/10 text-primary border-primary/25",
    icon: <FileDown className="w-4 h-4 text-primary shrink-0" />,
  };
}

export function DigitalFileDownloadSection({
  files,
  orderStatus,
  paymentStatus,
  compact = false,
  className = "",
}: DigitalFileDownloadSectionProps) {
  const [downloadStates, setDownloadStates] = useState<
    Record<string, { loading: boolean; success: boolean; error: string | null }>
  >({});

  if (!files || files.length === 0) {
    return null;
  }

  const isOrderCompleted = (orderStatus || "").toUpperCase() === "COMPLETED";
  const isPaymentSuccessful = (paymentStatus || "").toUpperCase() === "SUCCESSFUL";
  const isEntitled = isOrderCompleted && isPaymentSuccessful;

  const handleDownload = async (file: DigitalDeliverableFile) => {
    if (!isEntitled || file.status !== "READY") return;

    setDownloadStates((prev) => ({
      ...prev,
      [file.id]: { loading: true, success: false, error: null },
    }));

    try {
      // Requests authorized short-lived presigned R2 download URL through customer proxy
      const data = await api.get<{
        success: boolean;
        downloadUrl: string;
        fileId: string;
        expiresInSeconds: number;
      }>(`/digital-files/${file.id}/download`);

      if (!data?.downloadUrl) {
        throw new Error("Unable to generate download link. Please try again.");
      }

      // Trigger direct, secure download from presigned URL
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = file.filename;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadStates((prev) => ({
        ...prev,
        [file.id]: { loading: false, success: true, error: null },
      }));

      // Reset success indicator after 3.5s
      setTimeout(() => {
        setDownloadStates((prev) => ({
          ...prev,
          [file.id]: { ...(prev[file.id] || { loading: false, error: null }), success: false },
        }));
      }, 3500);
    } catch (err: any) {
      console.error("Digital file download error:", err);
      const msg =
        err?.message ||
        "Download currently unavailable. Please verify order status or retry.";
      setDownloadStates((prev) => ({
        ...prev,
        [file.id]: { loading: false, success: false, error: msg },
      }));
    }
  };

  return (
    <div
      className={`rounded-2xl border border-primary/20 bg-gradient-to-br from-[#0c1020]/90 via-[#0a0d1a]/80 to-[#070912]/90 backdrop-blur-xl p-3.5 sm:p-4 space-y-3 shadow-[0_4px_25px_rgba(0,194,255,0.06)] ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary shadow-[0_0_10px_rgba(0,194,255,0.2)]">
            <FileDown className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-mono font-bold text-white tracking-wide uppercase">
              Digital Deliverable{files.length > 1 ? "s" : ""}
            </span>
            <span className="text-[10px] font-mono text-gray-400 ml-2">
              ({files.length} file{files.length > 1 ? "s" : ""})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full">
          <ShieldCheck className="w-3 h-3" />
          <span>Cloudflare R2 Storage</span>
        </div>
      </div>

      {/* Files list */}
      <div className="space-y-2.5">
        {files.map((file) => {
          const typeInfo = getMimeTypeDetails(file.mimeType, file.filename);
          const state = downloadStates[file.id] || {
            loading: false,
            success: false,
            error: null,
          };
          const isFileReady = file.status === "READY";
          const canDownload = isEntitled && isFileReady;

          return (
            <div
              key={file.id}
              className="p-3 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition-all space-y-2"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {typeInfo.icon}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white truncate font-mono">
                      {file.filename}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-gray-400">
                      <span
                        className={`px-1.5 py-0.2 rounded border text-[10px] font-bold ${typeInfo.badgeClass}`}
                      >
                        {typeInfo.label}
                      </span>
                      <span>{formatByteSize(file.sizeBytes)}</span>
                      {!isFileReady && (
                        <span className="text-amber-400 font-bold text-[10px]">
                          [{file.status}]
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <div className="shrink-0">
                  {canDownload ? (
                    <button
                      type="button"
                      onClick={() => handleDownload(file)}
                      disabled={state.loading}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 min-h-[36px] outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${
                        state.success
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-primary/15 hover:bg-primary/25 border border-primary/35 hover:border-primary/60 text-primary hover:text-white shadow-[0_0_15px_rgba(0,194,255,0.15)] disabled:opacity-50"
                      }`}
                      title={`Download ${file.filename}`}
                    >
                      {state.loading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : state.success ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Downloading</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-[11px] font-mono text-gray-400 italic px-2 py-1">
                      {!isOrderCompleted
                        ? "Available on order completion"
                        : !isPaymentSuccessful
                        ? "Awaiting payment verification"
                        : "Processing asset"}
                    </span>
                  )}
                </div>
              </div>

              {/* Error banner with retry */}
              {state.error && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-between gap-2 text-red-300 text-[11px] font-mono">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                    <span className="truncate">{state.error}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownload(file)}
                    className="px-2 py-0.5 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30 text-[10px] font-bold flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DigitalFileDownloadSection;
