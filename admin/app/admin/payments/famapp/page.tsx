"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  QrCode,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Eye,
  Check,
  X,
  FileText,
  Mail,
  Server,
  Lock,
  ArrowUpRight,
  ExternalLink,
  Copy,
  Info,
  Filter,
  AlertOctagon,
} from "lucide-react";
import { adminApi } from "@/lib/admin-api";

interface Submission {
  id: string;
  userId: string;
  walletId: string;
  utr: string;
  amount: string;
  currency: string;
  status: "PENDING" | "MATCHED" | "MANUAL_REVIEW" | "CREDITED" | "EXPIRED" | "REJECTED";
  matchedEmailEventId: string | null;
  failureReason: string | null;
  adminNotes: string | null;
  overrideReason: string | null;
  isOverridden: string;
  reviewedBy: string | null;
  expiresAt: string;
  createdAt: string;
  creditedAt: string | null;
}

interface EmailEvent {
  id: string;
  gmailMessageId: string;
  senderAddress: string;
  recipientAddress: string;
  parsedUtr: string;
  parsedTxId: string | null;
  parsedAmount: string;
  currency: string;
  parsedSenderName: string | null;
  parsedSenderVpa: string | null;
  parsedRecipientVpa: string | null;
  transactionTimestamp: string;
  dkimStatus: string;
  spfStatus: string;
  authStatus: "VERIFIED" | "FAILED" | "MISSING";
  status: "UNCLAIMED" | "CLAIMED" | "FLAGGED" | "EXPIRED" | "UNPARSEABLE";
  claimedBySubmissionId: string | null;
  rawSnippet: string | null;
  rawHeaders: string | null;
  createdAt: string;
}

interface SyncTelemetry {
  id: string;
  lastHistoryId?: string;
  lastSyncedMessageTimestamp?: string;
  lastSyncedAt: string;
  consecutiveErrors: string;
  lastError?: string;
}

export default function FamappVerificationAdminPage() {
  const [activeTab, setActiveTab] = useState<"submissions" | "email_events" | "sync_telemetry">("submissions");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Statistics
  const [stats, setStats] = useState<any>({
    totalSubmissions: 0,
    pendingCount: 0,
    creditedCount: 0,
    manualReviewCount: 0,
    expiredCount: 0,
    rejectedCount: 0,
    totalEmailEvents: 0,
    unclaimedEventsCount: 0,
    claimedEventsCount: 0,
    flaggedEventsCount: 0,
  });

  // Submissions State
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subPage, setSubPage] = useState<number>(1);
  const [subTotalPages, setSubTotalPages] = useState<number>(1);
  const [subTotalCount, setSubTotalCount] = useState<number>(0);
  const [subStatusFilter, setSubStatusFilter] = useState<string>("ALL");
  const [subSearchUtr, setSubSearchUtr] = useState<string>("");

  // Email Events State
  const [emailEvents, setEmailEvents] = useState<EmailEvent[]>([]);
  const [eventPage, setEventPage] = useState<number>(1);
  const [eventTotalPages, setEventTotalPages] = useState<number>(1);
  const [eventTotalCount, setEventTotalCount] = useState<number>(0);
  const [eventStatusFilter, setEventStatusFilter] = useState<string>("ALL");
  const [eventSearchUtr, setEventSearchUtr] = useState<string>("");

  // Sync Telemetry State
  const [syncTelemetry, setSyncTelemetry] = useState<SyncTelemetry | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [merchantVpa, setMerchantVpa] = useState<string>("");

  // Selected for Review Modal
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [matchedEvent, setMatchedEvent] = useState<EmailEvent | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "OVERRIDE_APPROVE" | "REJECT">("APPROVE");
  const [reviewReason, setReviewReason] = useState<string>("");
  const [confirmedSettlement, setConfirmedSettlement] = useState<boolean>(false);
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Selected for Raw Snippet Modal
  const [selectedEventDetails, setSelectedEventDetails] = useState<EmailEvent | null>(null);

  // Load High-Level Stats
  const loadStats = useCallback(async () => {
    try {
      const res = await adminApi.getFamappStats();
      if (res?.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err: any) {
      console.error("Failed to load FamApp stats:", err);
    }
  }, []);

  // Load Submissions
  const loadSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getFamappSubmissions({
        page: subPage,
        limit: 15,
        status: subStatusFilter,
        utr: subSearchUtr.trim() || undefined,
      });

      if (res?.success) {
        setSubmissions(res.submissions || []);
        setSubTotalPages(res.pagination?.totalPages || 1);
        setSubTotalCount(res.pagination?.total || 0);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to fetch customer UPI submissions");
    } finally {
      setLoading(false);
    }
  }, [subPage, subStatusFilter, subSearchUtr]);

  // Load Email Events
  const loadEmailEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await adminApi.getFamappEmailEvents({
        page: eventPage,
        limit: 15,
        status: eventStatusFilter,
        utr: eventSearchUtr.trim() || undefined,
      });

      if (res?.success) {
        setEmailEvents(res.emailEvents || []);
        setEventTotalPages(res.pagination?.totalPages || 1);
        setEventTotalCount(res.pagination?.total || 0);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to fetch ingested email events");
    } finally {
      setLoading(false);
    }
  }, [eventPage, eventStatusFilter, eventSearchUtr]);

  // Load Sync Telemetry
  const loadSyncTelemetry = useCallback(async () => {
    try {
      const res = await adminApi.getFamappSyncStatus();
      if (res?.success) {
        setSyncTelemetry(res.syncStatus);
        setIsConfigured(res.isConfigured);
        setMerchantVpa(res.merchantVpa);
      }
    } catch (err: any) {
      console.error("Failed to load sync telemetry:", err);
    }
  }, []);

  // Initial and Tab Trigger
  useEffect(() => {
    loadStats();
    loadSyncTelemetry();
  }, [loadStats, loadSyncTelemetry]);

  useEffect(() => {
    if (activeTab === "submissions") {
      loadSubmissions();
    } else if (activeTab === "email_events") {
      loadEmailEvents();
    } else if (activeTab === "sync_telemetry") {
      loadSyncTelemetry();
    }
  }, [activeTab, loadSubmissions, loadEmailEvents, loadSyncTelemetry]);

  // Handle Review Modal Open
  const handleOpenReviewModal = async (submission: Submission) => {
    setSelectedSubmission(submission);
    setReviewAction("APPROVE");
    setReviewReason("");
    setConfirmedSettlement(false);
    setReviewError(null);
    setMatchedEvent(null);

    // If matchedEmailEventId is present, attempt to locate the event
    if (submission.matchedEmailEventId) {
      try {
        const res = await adminApi.getFamappEmailEvents({
          utr: submission.utr,
          limit: 1,
        });
        if (res?.success && res.emailEvents?.length > 0) {
          setMatchedEvent(res.emailEvents[0]);
          // If the event is FLAGGED or unverified, default action to OVERRIDE_APPROVE
          if (res.emailEvents[0].status === "FLAGGED" || res.emailEvents[0].authStatus !== "VERIFIED") {
            setReviewAction("OVERRIDE_APPROVE");
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
  };

  // Submit Review Action
  const handleSubmitReview = async () => {
    if (!selectedSubmission) return;

    if ((reviewAction === "APPROVE" || reviewAction === "OVERRIDE_APPROVE") && !confirmedSettlement) {
      setReviewError("You must verify and confirm actual settlement in the merchant account.");
      return;
    }

    if (reviewAction === "OVERRIDE_APPROVE" && reviewReason.trim().length < 10) {
      setReviewError("Exceptional manual override requires an audit reason of at least 10 characters.");
      return;
    }

    if (reviewAction === "REJECT" && !reviewReason.trim()) {
      setReviewError("Please provide an explanation for rejecting this customer submission.");
      return;
    }

    setSubmittingReview(true);
    setReviewError(null);

    try {
      const res = await adminApi.reviewFamappSubmission(selectedSubmission.id, {
        action: reviewAction,
        reason: reviewReason.trim() || undefined,
        settlementConfirmed: reviewAction === "REJECT" ? undefined : confirmedSettlement,
      });

      if (res?.success) {
        setSelectedSubmission(null);
        await Promise.all([loadStats(), loadSubmissions()]);
      } else {
        setReviewError(res?.message || "Review action failed");
      }
    } catch (err: any) {
      setReviewError(err?.message || "Failed to execute review action");
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CREDITED":
      case "CLAIMED":
      case "VERIFIED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      case "MATCHED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <RefreshCcw className="w-3.5 h-3.5 animate-spin" />
            MATCHED (REVIEW)
          </span>
        );
      case "PENDING":
      case "UNCLAIMED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      case "MANUAL_REVIEW":
      case "FLAGGED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-purple-400" />
            {status}
          </span>
        );
      case "REJECTED":
      case "FAILED":
      case "UNPARSEABLE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" />
            {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                FamApp UPI Payment Verification
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Assisted Review
                </span>
              </h1>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Authoritative Gmail notification ingestion, cryptographic DKIM matching, and dual-layer authorization
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadStats();
              if (activeTab === "submissions") loadSubmissions();
              if (activeTab === "email_events") loadEmailEvents();
              if (activeTab === "sync_telemetry") loadSyncTelemetry();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-gray-300 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#00c2ff]" : ""}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-[#0c101a] border border-white/10 space-y-1">
          <span className="text-[10px] font-mono uppercase text-gray-400 block">Total Claims</span>
          <span className="text-xl font-black font-mono text-white">{stats.totalSubmissions}</span>
          <span className="text-[10px] text-gray-500 block">All-time customer claims</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c101a] border border-cyan-500/20 space-y-1">
          <span className="text-[10px] font-mono uppercase text-cyan-400 block">Awaiting Review</span>
          <span className="text-xl font-black font-mono text-cyan-300">
            {stats.pendingCount}
          </span>
          <span className="text-[10px] text-cyan-500/80 block">Requires Admin sign-off</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c101a] border border-purple-500/20 space-y-1">
          <span className="text-[10px] font-mono uppercase text-purple-400 block">Manual Review</span>
          <span className="text-xl font-black font-mono text-purple-300">
            {stats.manualReviewCount}
          </span>
          <span className="text-[10px] text-purple-400/80 block">Discrepancy / Competing</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c101a] border border-emerald-500/20 space-y-1">
          <span className="text-[10px] font-mono uppercase text-emerald-400 block">Credited</span>
          <span className="text-xl font-black font-mono text-emerald-300">
            {stats.creditedCount}
          </span>
          <span className="text-[10px] text-emerald-400/80 block">Wallets funded</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c101a] border border-white/10 space-y-1">
          <span className="text-[10px] font-mono uppercase text-gray-400 block">Ingested Emails</span>
          <span className="text-xl font-black font-mono text-white">
            {stats.totalEmailEvents}
          </span>
          <span className="text-[10px] text-gray-500 block">Gmail credit receipts</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0c101a] border border-amber-500/20 space-y-1">
          <span className="text-[10px] font-mono uppercase text-amber-400 block">Flagged Events</span>
          <span className="text-xl font-black font-mono text-amber-300">
            {stats.flaggedEventsCount}
          </span>
          <span className="text-[10px] text-amber-500/80 block">Failed auth or recipient</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-white/10 space-x-2">
        <button
          onClick={() => setActiveTab("submissions")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-semibold transition-all border-b-2 -mb-px ${
            activeTab === "submissions"
              ? "border-emerald-400 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Submissions & Claims</span>
          {stats.pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-bold">
              {stats.pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("email_events")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-semibold transition-all border-b-2 -mb-px ${
            activeTab === "email_events"
              ? "border-emerald-400 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Ingested Gmail Events</span>
          {stats.flaggedEventsCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
              {stats.flaggedEventsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("sync_telemetry")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-semibold transition-all border-b-2 -mb-px ${
            activeTab === "sync_telemetry"
              ? "border-emerald-400 text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Sync Health & Posture</span>
          {syncTelemetry && Number(syncTelemetry.consecutiveErrors) > 0 ? (
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
        </button>
      </div>

      {/* TAB 1: SUBMISSIONS & CLAIMS */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3 bg-[#0c101a] border border-white/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {["ALL", "PENDING", "MATCHED", "MANUAL_REVIEW", "CREDITED", "REJECTED"].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setSubStatusFilter(st);
                    setSubPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                    subStatusFilter === st
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search UTR / RRN (12 digits)..."
                value={subSearchUtr}
                onChange={(e) => {
                  setSubSearchUtr(e.target.value);
                  setSubPage(1);
                }}
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 font-mono"
              />
            </div>
          </div>

          {/* Submissions Table */}
          <div className="rounded-2xl border border-white/10 bg-[#0c101a] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-black/40 text-gray-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Claimed UTR / RRN</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Customer ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Gmail Match</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading && submissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        <RefreshCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                        <span>Querying customer UPI verification submissions...</span>
                      </td>
                    </tr>
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500 font-mono">
                        No customer submissions found matching current criteria.
                      </td>
                    </tr>
                  ) : (
                    submissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{sub.utr}</span>
                            {sub.isOverridden === "true" && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-sans border border-amber-500/30">
                                Overridden
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          ₹{Number(sub.amount).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400 truncate max-w-[140px]" title={sub.userId}>
                          {sub.userId}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(sub.status)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {sub.matchedEmailEventId ? (
                            <span className="text-cyan-400 inline-flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              Matched Event
                            </span>
                          ) : (
                            <span className="text-gray-500">Unmatched</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-gray-400 font-mono text-[11px]">
                          {new Date(sub.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenReviewModal(sub)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold transition-all inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Review</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 font-mono">
              <span>
                Showing <strong className="text-white">{submissions.length}</strong> of{" "}
                <strong className="text-white">{subTotalCount}</strong> submissions
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSubPage((p) => Math.max(1, p - 1))}
                  disabled={subPage <= 1 || loading}
                  className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  {subPage} / {Math.max(1, subTotalPages)}
                </span>
                <button
                  onClick={() => setSubPage((p) => Math.min(subTotalPages, p + 1))}
                  disabled={subPage >= subTotalPages || loading}
                  className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GMAIL INGESTED EVENTS */}
      {activeTab === "email_events" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-3 bg-[#0c101a] border border-white/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {["ALL", "UNCLAIMED", "CLAIMED", "FLAGGED", "UNPARSEABLE"].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setEventStatusFilter(st);
                    setEventPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all ${
                    eventStatusFilter === st
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold"
                      : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-transparent"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search UTR / RRN in emails..."
                value={eventSearchUtr}
                onChange={(e) => {
                  setEventSearchUtr(e.target.value);
                  setEventPage(1);
                }}
                className="w-full bg-black/50 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 font-mono"
              />
            </div>
          </div>

          {/* Email Events Table */}
          <div className="rounded-2xl border border-white/10 bg-[#0c101a] overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-black/40 text-gray-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Message ID / Txn ID</th>
                    <th className="py-3 px-4">Sender & VPA</th>
                    <th className="py-3 px-4">Extracted UTR</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">DKIM Alignment</th>
                    <th className="py-3 px-4">Auth Status</th>
                    <th className="py-3 px-4">Event Status</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading && emailEvents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        <RefreshCcw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-400" />
                        <span>Querying Gmail notification records...</span>
                      </td>
                    </tr>
                  ) : emailEvents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500 font-mono">
                        No Gmail notification events found matching filter.
                      </td>
                    </tr>
                  ) : (
                    emailEvents.map((evt) => (
                      <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 font-mono text-white">
                          <span className="block truncate max-w-[120px]" title={evt.gmailMessageId}>
                            {evt.gmailMessageId}
                          </span>
                          {evt.parsedTxId && (
                            <span className="text-[10px] text-gray-500 block">
                              Txn: {evt.parsedTxId}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-gray-200 block font-mono text-[11px]">{evt.senderAddress}</span>
                          <span className="text-[10px] text-cyan-400 block font-mono">
                            {evt.parsedSenderVpa || "No VPA"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          {evt.parsedUtr}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                          ₹{Number(evt.parsedAmount).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {evt.dkimStatus === "PASS" ? (
                            <span className="text-emerald-400 inline-flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              PASS (Aligned)
                            </span>
                          ) : (
                            <span className="text-red-400 inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {evt.dkimStatus}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(evt.authStatus)}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(evt.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setSelectedEventDetails(evt)}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all"
                            title="Inspect Email Evidence"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs text-gray-400 font-mono">
              <span>
                Showing <strong className="text-white">{emailEvents.length}</strong> of{" "}
                <strong className="text-white">{eventTotalCount}</strong> events
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEventPage((p) => Math.max(1, p - 1))}
                  disabled={eventPage <= 1 || loading}
                  className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-40"
                >
                  Previous
                </button>
                <span>
                  {eventPage} / {Math.max(1, eventTotalPages)}
                </span>
                <button
                  onClick={() => setEventPage((p) => Math.min(eventTotalPages, p + 1))}
                  disabled={eventPage >= eventTotalPages || loading}
                  className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SYNC HEALTH & CONFIGURATION POSTURE */}
      {activeTab === "sync_telemetry" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Poller Synchronization Telemetry */}
          <div className="rounded-2xl border border-white/10 bg-[#0c101a] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Server className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  Gmail Sync Daemon Telemetry
                </h3>
              </div>
              {syncTelemetry && Number(syncTelemetry.consecutiveErrors) > 0 ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-400 border border-red-500/30">
                  Degraded ({syncTelemetry.consecutiveErrors} Errors)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Healthy Sync Active
                </span>
              )}
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Sync Cursor State:</span>
                <span className="text-white font-bold">{syncTelemetry?.id || "primary"}</span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Last Execution Timestamp:</span>
                <span className="text-white">
                  {syncTelemetry?.lastSyncedAt ? new Date(syncTelemetry.lastSyncedAt).toLocaleString() : "Never run"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Recovery Scan Cursor:</span>
                <span className="text-cyan-400">
                  {syncTelemetry?.lastSyncedMessageTimestamp
                    ? new Date(syncTelemetry.lastSyncedMessageTimestamp).toLocaleString()
                    : "No baseline cursor"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Overlapping Lookback Buffer:</span>
                <span className="text-white">1,800 Seconds (30 Minutes)</span>
              </div>

              {syncTelemetry?.lastError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                  <span className="font-bold block text-[11px] mb-1">Last Error Message:</span>
                  <span className="break-all font-mono text-[11px]">{syncTelemetry.lastError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Security & Configuration Guard */}
          <div className="rounded-2xl border border-white/10 bg-[#0c101a] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Lock className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                  Security Guard & Configuration
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Phase 2 Enforced
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Merchant UPI VPA:</span>
                <span className="text-emerald-400 font-bold">{merchantVpa || "merchant@fam"}</span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Production Auto-Credit:</span>
                <span className="text-emerald-400 font-bold">Hard-Blocked (Disabled)</span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Gmail API OAuth Scope:</span>
                <span className="text-white">https://www.googleapis.com/auth/gmail.readonly</span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Sender Allowlist:</span>
                <span className="text-white">no-reply@famapp.in, no-reply@fampay.in</span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Default Auth Status:</span>
                <span className="text-cyan-400 font-bold">MISSING (Fail-Closed)</span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex justify-between items-center">
                <span className="text-gray-400">Google OAuth Configured:</span>
                <span className={isConfigured ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                  {isConfigured ? "Yes (Client ID & Token Present)" : "Pending Staging Secrets"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: SUBMISSION REVIEW MODAL */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b0e17] border border-white/15 max-w-2xl w-full rounded-2xl p-6 space-y-5 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Manual Verification Review</h3>
                  <span className="text-xs font-mono text-gray-400">UTR: {selectedSubmission.utr}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Critical Settlement Disclaimer Alert */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-3">
              <AlertOctagon className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold block">Critical Settlement Verification Requirement</span>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  Incoming Gmail receipts provide proof of transfer notification, but are <strong>NOT settlement proof</strong>.
                  You must confirm that the credit of <strong>₹{selectedSubmission.amount}</strong> is physically present in the merchant bank/FamApp account before approving.
                </p>
              </div>
            </div>

            {/* Claim Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase block">Submission Amount</span>
                <span className="text-emerald-400 font-bold text-base">₹{Number(selectedSubmission.amount).toFixed(2)}</span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase block">Current Status</span>
                <span className="text-white font-bold">{selectedSubmission.status}</span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-[10px] text-gray-500 uppercase block">Customer User ID</span>
                <span className="text-white truncate block" title={selectedSubmission.userId}>{selectedSubmission.userId}</span>
              </div>
            </div>

            {/* Matched Bank Receipt (if present) */}
            {matchedEvent ? (
              <div className="p-4 rounded-xl bg-black/50 border border-cyan-500/20 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between text-cyan-400 pb-1.5 border-b border-white/5">
                  <span className="font-bold flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Matched Bank Receipt Evidence
                  </span>
                  <span className="text-[10px]">ID: {matchedEvent.gmailMessageId}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div><span className="text-gray-500">Sender VPA:</span> <span className="text-white">{matchedEvent.parsedSenderVpa || "N/A"}</span></div>
                  <div><span className="text-gray-500">Recipient VPA:</span> <span className="text-white">{matchedEvent.parsedRecipientVpa || "N/A"}</span></div>
                  <div><span className="text-gray-500">Bank Amount:</span> <span className="text-emerald-400 font-bold">₹{matchedEvent.parsedAmount}</span></div>
                  <div><span className="text-gray-500">DKIM Status:</span> <span className={matchedEvent.dkimStatus === "PASS" ? "text-emerald-400" : "text-red-400"}>{matchedEvent.dkimStatus}</span></div>
                  <div><span className="text-gray-500">Auth Status:</span> <span className={matchedEvent.authStatus === "VERIFIED" ? "text-emerald-400" : "text-amber-400"}>{matchedEvent.authStatus}</span></div>
                  <div><span className="text-gray-500">Event Status:</span> <span className="text-white">{matchedEvent.status}</span></div>
                </div>

                {matchedEvent.status === "FLAGGED" && (
                  <div className="p-2 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px]">
                    ⚠️ This receipt was FLAGGED due to authentication or recipient mismatch. Standard approval is prohibited. You must use OVERRIDE_APPROVE with an audit explanation if bank statement confirms the funds.
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-black/30 border border-white/5 font-mono text-xs text-gray-400">
                ℹ️ No automated Gmail receipt currently linked. If the customer sent funds, verify the bank statement directly and execute an Exceptional Override if valid.
              </div>
            )}

            {/* Action Selection */}
            <div className="space-y-3 font-mono text-xs">
              <span className="text-gray-400 block font-semibold">Select Administrative Action:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReviewAction("APPROVE")}
                  disabled={matchedEvent?.status === "FLAGGED" || matchedEvent?.authStatus !== "VERIFIED"}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    reviewAction === "APPROVE"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  }`}
                >
                  Standard Approve
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction("OVERRIDE_APPROVE")}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    reviewAction === "OVERRIDE_APPROVE"
                      ? "bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  Exceptional Override
                </button>

                <button
                  type="button"
                  onClick={() => setReviewAction("REJECT")}
                  className={`py-2 px-3 rounded-xl border text-center transition-all ${
                    reviewAction === "REJECT"
                      ? "bg-red-500/20 border-red-500 text-red-300 font-bold shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  Reject Claim
                </button>
              </div>

              {/* Reason Input */}
              {(reviewAction === "OVERRIDE_APPROVE" || reviewAction === "REJECT") && (
                <div className="space-y-1 pt-1">
                  <label className="text-[11px] text-gray-300 block">
                    {reviewAction === "OVERRIDE_APPROVE"
                      ? "Mandatory Independent Verification Reason (Min 10 characters):"
                      : "Rejection Reason:"}
                  </label>
                  <textarea
                    rows={2}
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    placeholder={
                      reviewAction === "OVERRIDE_APPROVE"
                        ? "e.g. Verified manually via ICICI corporate banking statement at 19:30 ref #892"
                        : "e.g. Invalid UTR, duplicate submission, or payment refunded by bank"
                    }
                    className="w-full bg-black/60 border border-white/15 rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Mandatory Settlement Confirmation Checkbox (Required for APPROVE / OVERRIDE_APPROVE) */}
              {(reviewAction === "APPROVE" || reviewAction === "OVERRIDE_APPROVE") && (
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmedSettlement}
                    onChange={(e) => setConfirmedSettlement(e.target.checked)}
                    className="mt-0.5 rounded border-white/20 bg-black/50 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-gray-300 leading-normal">
                    I certify under audit log that I have verified the payment settlement of ₹{selectedSubmission.amount} in our bank/FamApp account and take responsibility for this wallet crediting action.
                  </span>
                </label>
              )}

              {reviewError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {reviewError}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSelectedSubmission(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-mono font-medium transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center gap-2"
              >
                {submittingReview ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm {reviewAction}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RAW EMAIL EVENT DETAILS */}
      {selectedEventDetails && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b0e17] border border-white/15 max-w-xl w-full rounded-2xl p-6 space-y-4 shadow-2xl my-8 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Gmail Notification Event Evidence</h3>
              </div>
              <button onClick={() => setSelectedEventDetails(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-black/50 border border-white/5">
                <span className="text-[10px] text-gray-500 block uppercase">Gmail Message ID</span>
                <span className="text-white break-all">{selectedEventDetails.gmailMessageId}</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-black/50 border border-white/5">
                  <span className="text-[10px] text-gray-500 block uppercase">Sender Envelope</span>
                  <span className="text-white">{selectedEventDetails.senderAddress}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/50 border border-white/5">
                  <span className="text-[10px] text-gray-500 block uppercase">Recipient Envelope</span>
                  <span className="text-white">{selectedEventDetails.recipientAddress}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-black/50 border border-white/5 space-y-1">
                <span className="text-[10px] text-gray-500 block uppercase">Raw Snippet Text</span>
                <p className="text-gray-300 text-[11px] font-sans leading-relaxed whitespace-pre-wrap">
                  {selectedEventDetails.rawSnippet || "No snippet captured"}
                </p>
              </div>

              {selectedEventDetails.rawHeaders && (
                <div className="p-2.5 rounded-lg bg-black/50 border border-white/5 space-y-1">
                  <span className="text-[10px] text-gray-500 block uppercase">Authentication Headers</span>
                  <pre className="text-[10px] text-gray-400 overflow-x-auto max-h-40 p-2 bg-black rounded">
                    {selectedEventDetails.rawHeaders}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-white/10">
              <button
                onClick={() => setSelectedEventDetails(null)}
                className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-mono"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
