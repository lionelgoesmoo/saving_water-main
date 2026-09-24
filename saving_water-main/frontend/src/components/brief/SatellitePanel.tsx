import React from "react";

interface SatellitePanelProps {
  address: string;
  lat?: number;
  lng?: number;
  roofAreaSqft: number;
  coolingTowerCount: number;
  cvConfidencePct: number;
  urgencyScore: number;
  imageryDate?: string;
  imagerySource?: string;
  imageryUrl?: string;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <span className="text-sm font-bold text-slate-800 leading-tight">{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

export default function SatellitePanel({
  address,
  lat,
  lng,
  roofAreaSqft,
  coolingTowerCount,
  cvConfidencePct,
  urgencyScore,
  imageryDate,
  imagerySource,
  imageryUrl,
}: SatellitePanelProps) {
  const cvColor =
    cvConfidencePct >= 85 ? "text-emerald-600" :
    cvConfidencePct >= 65 ? "text-amber-600"   :
                            "text-rose-600";

  const urgencyColor =
    urgencyScore >= 8 ? "text-rose-600"   :
    urgencyScore >= 5 ? "text-amber-600"  :
                        "text-emerald-600";

  return (
    <div className="flex flex-col h-full bg-white">

      {/* ── Imagery area ─────────────────────────────────────── */}
      <div className="relative flex-1 min-h-0 overflow-hidden">

        {imageryUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageryUrl}
            alt={`Satellite view of ${address}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center relative bg-slate-900">
            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-20"
              style={{ backgroundImage: "radial-gradient(circle, #3b82f6 1px, transparent 1px)", backgroundSize: "28px 28px" }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/20 via-transparent to-slate-900/60" />
            <svg viewBox="0 0 320 240" className="w-full max-w-[340px] opacity-50 relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="40" y="60" width="240" height="140" rx="2" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6 3" />
              <rect x="60" y="80" width="80" height="100" rx="1" stroke="#3b82f6" strokeWidth="1" opacity="0.6" />
              <rect x="160" y="80" width="100" height="100" rx="1" stroke="#3b82f6" strokeWidth="1" opacity="0.6" />
              <circle cx="100" cy="175" r="8" stroke="#10b981" strokeWidth="1.5" />
              <circle cx="100" cy="175" r="3" fill="#10b981" opacity="0.6" />
              <circle cx="200" cy="175" r="8" stroke="#10b981" strokeWidth="1.5" />
              <circle cx="200" cy="175" r="3" fill="#10b981" opacity="0.6" />
              <circle cx="240" cy="155" r="8" stroke="#10b981" strokeWidth="1.5" />
              <circle cx="240" cy="155" r="3" fill="#10b981" opacity="0.6" />
              <line x1="290" y1="40" x2="290" y2="20" stroke="#6b7280" strokeWidth="1.5" />
              <polygon points="290,14 286,24 294,24" fill="#6b7280" />
              <text x="288" y="50" fill="#6b7280" fontSize="8" fontFamily="monospace">N</text>
              <line x1="40" y1="218" x2="140" y2="218" stroke="#4b5563" strokeWidth="1" />
              <line x1="40" y1="213" x2="40" y2="223" stroke="#4b5563" strokeWidth="1" />
              <line x1="140" y1="213" x2="140" y2="223" stroke="#4b5563" strokeWidth="1" />
              <text x="65" y="230" fill="#4b5563" fontSize="7" fontFamily="monospace">~200 ft</text>
              {lat !== undefined && <text x="36" y="55" fill="#94a3b8" fontSize="7" fontFamily="monospace">{lat.toFixed(4)}°N</text>}
              {lng !== undefined && <text x="36" y="215" fill="#94a3b8" fontSize="7" fontFamily="monospace">{lng.toFixed(4)}°W</text>}
            </svg>
            <div className="relative z-10 mt-4 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/30 rounded-full px-3 py-1 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                <span className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
                  Satellite imagery pending
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Top-left label */}
        <div className="absolute top-3 left-3 z-20">
          <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-slate-300/60 rounded-lg px-2.5 py-1 shadow-sm">
            <svg className="w-3 h-3 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Satellite View</span>
          </div>
        </div>

        {/* Top-right: source + date */}
        {(imagerySource ?? imageryUrl) && (
          <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-0.5">
            {imagerySource && (
              <span className="text-xs font-medium text-slate-600 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-lg shadow-sm">
                {imagerySource}
              </span>
            )}
            {imageryDate && (
              <span className="text-xs text-slate-500 bg-white/70 backdrop-blur-sm px-2 py-0.5 rounded-lg">
                {imageryDate}
              </span>
            )}
          </div>
        )}

        {/* Cooling tower legend */}
        <div className="absolute bottom-4 left-3 z-20 flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full border border-emerald-500 bg-emerald-400/30 inline-block" />
          <span className="text-xs text-slate-200 font-medium">Cooling tower detected</span>
        </div>
      </div>

      {/* ── Building intelligence stats ───────────────────────── */}
      <div className="border-t border-slate-100 bg-white px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
          Building Intelligence
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-0.5">CV Confidence</span>
            <span className={`text-2xl font-black leading-none tabular-nums ${cvColor}`}>{cvConfidencePct}%</span>
            <span className="text-xs text-slate-500 block mt-0.5">Satellite detection</span>
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-0.5">Urgency Score</span>
            <span className={`text-2xl font-black leading-none tabular-nums ${urgencyColor}`}>
              {urgencyScore}<span className="text-sm font-medium text-slate-500">/10</span>
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">Composite signal</span>
          </div>
          <Stat label="Roof Area" value={`${(roofAreaSqft / 1000).toFixed(0)}K sqft`} sub="Harvestable surface" />
          <Stat label="Cooling Towers" value={`${coolingTowerCount} detected`} sub="Active systems" />
        </div>
      </div>
    </div>
  );
}
