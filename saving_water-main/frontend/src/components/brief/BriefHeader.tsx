"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { sendBriefByEmail } from "@/lib/api";

type RecommendedAngle = "cost_savings" | "resilience" | "compliance" | "esg_credibility";

interface BriefHeaderProps {
  address: string;
  metro: string;
  state: string;
  buildingType: string;
  ownerTenant?: string;
  viabilityScore: number;
  recommendedAngle: RecommendedAngle;
  generatedAt: string;
  buildingId: string;
  onExport?: () => void;
}

const ANGLE: Record<RecommendedAngle, { badge: string; label: string }> = {
  cost_savings:    { badge: "bg-teal-50 text-teal-700 border-teal-200",    label: "Cost Savings" },
  resilience:      { badge: "bg-blue-50 text-blue-700 border-blue-200",    label: "Resilience" },
  compliance:      { badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Compliance" },
  esg_credibility: { badge: "bg-purple-50 text-purple-700 border-purple-200", label: "ESG Credibility" },
};

const VIABILITY_COLOR = (score: number) =>
  score >= 80 ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
  score >= 60 ? "text-blue-700 bg-blue-50 border-blue-200" :
  score >= 40 ? "text-amber-700 bg-amber-50 border-amber-200" :
               "text-red-700 bg-red-50 border-red-200";


export default function BriefHeader({
  address,
  metro,
  state,
  buildingType,
  ownerTenant,
  viabilityScore,
  recommendedAngle,
  generatedAt,
  buildingId,
  onExport,
}: BriefHeaderProps) {
  const angle = ANGLE[recommendedAngle];
  const viabilityClasses = VIABILITY_COLOR(viabilityScore);
  const streetAddress = address.split(",")[0];
  const cityStateZip = address.split(",").slice(1).join(",").trim();

  // ── Email send state ─────────────────────────────────────────────────────
  const [emailOpen, setEmailOpen]   = useState(false);
  const [email, setEmail]           = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg]     = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (emailOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [emailOpen]);

  // Auto-reset after sent/error
  useEffect(() => {
    if (sendStatus === "sent" || sendStatus === "error") {
      const t = setTimeout(() => {
        setSendStatus("idle");
        if (sendStatus === "sent") { setEmail(""); setEmailOpen(false); }
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [sendStatus]);

  async function handleSend() {
    if (!email.trim() || sendStatus === "sending") return;
    setSendStatus("sending");
    setErrorMsg("");
    try {
      await sendBriefByEmail(buildingId, email.trim());
      setSendStatus("sent");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Delivery failed");
      setSendStatus("error");
    }
  }

  return (
    <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm">

      {/* ── Nav bar (hidden in print) ────────────────────────── */}
      <div className="print-hide flex items-center justify-between px-6 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <Link
            href="/map"
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors duration-200 group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Back to Map</span>
          </Link>

          <span className="text-slate-200">·</span>

          <div className="flex items-center gap-2">
            <img src="/assets/Hand Holding Water Droplet.png" alt="Pluvial" className="w-16 h-16 object-contain" />
            <span className="text-sm font-black tracking-tight bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-500 bg-clip-text text-transparent">Pluvial</span>
            <span className="text-sm text-slate-400">/ Investment Brief</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono hidden sm:block mr-1">
            {buildingId} · {generatedAt}
          </span>

          {/* ── Email send panel ──────────────────────────────── */}
          <div className="flex items-center gap-2">
            {emailOpen && (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
                <input
                  ref={inputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSend(); if (e.key === "Escape") setEmailOpen(false); }}
                  placeholder="recipient@company.com"
                  disabled={sendStatus === "sending" || sendStatus === "sent"}
                  className="text-sm text-slate-700 placeholder-slate-400 bg-transparent outline-none w-52"
                />
                <button
                  onClick={handleSend}
                  disabled={!email.trim() || sendStatus === "sending" || sendStatus === "sent"}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all duration-150 ${
                    sendStatus === "sent"
                      ? "bg-emerald-50 text-emerald-700"
                      : sendStatus === "error"
                      ? "bg-red-50 text-red-600"
                      : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40"
                  }`}
                >
                  {sendStatus === "sending" ? "Sending…" : sendStatus === "sent" ? "Sent ✓" : sendStatus === "error" ? "Failed" : "Send"}
                </button>
                <button
                  onClick={() => { setEmailOpen(false); setSendStatus("idle"); setErrorMsg(""); }}
                  className="text-slate-400 hover:text-slate-600 ml-0.5"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            )}

            {sendStatus === "error" && !emailOpen && (
              <span className="text-xs text-red-500">{errorMsg}</span>
            )}

            <button
              onClick={() => setEmailOpen((o) => !o)}
              disabled={!onExport}
              title="Send brief by email"
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm disabled:opacity-40"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m2 7 10 7 10-7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Send
            </button>
          </div>

          {/* ── Export PDF ────────────────────────────────────── */}
          <button
            onClick={onExport}
            disabled={!onExport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm disabled:opacity-40"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9V2h12v7" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="6" y="14" width="12" height="8" rx="1" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Print-only document header ───────────────────────── */}
      <div className="print-only hidden px-6 pt-5 pb-2 flex items-center justify-between border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Pluvial</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Investment Brief</span>
        </div>
        <span className="text-xs text-slate-400 font-mono">{buildingId} · {generatedAt}</span>
      </div>

      {/* ── Building identity ────────────────────────────────── */}
      <div className="px-6 py-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight truncate">
              {streetAddress}
            </h1>
            {ownerTenant && (
              <span className="text-base text-slate-500 font-medium shrink-0">{ownerTenant}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-sm text-slate-600">{metro}, {state}</span>
            <span className="text-slate-300">·</span>
            <span className="text-sm text-slate-500 capitalize">{buildingType.replace(/_/g, " ")}</span>
            {cityStateZip && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-sm text-slate-400">{cityStateZip}</span>
              </>
            )}
          </div>
        </div>

        {/* Right: badges */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-end">
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-bold shadow-sm ${viabilityClasses}`}>
            <span>{viabilityScore}</span>
            <span className="text-xs font-semibold uppercase tracking-wide opacity-75">Viability</span>
          </div>
          <div className={`px-3 py-2 rounded-xl border text-sm font-medium shadow-sm ${angle.badge}`}>
            {angle.label}
          </div>
        </div>
      </div>
    </div>
  );
}
