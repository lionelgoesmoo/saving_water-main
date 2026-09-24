import React from "react";
import { SelectionState } from "../dashboard/ProspectingDashboard";
import { StateScore } from "@/types/state";

type Props = {
  selection: SelectionState;
  setSelection: React.Dispatch<React.SetStateAction<SelectionState>>;
  stateScores: StateScore[];
};

export default function MetroSummaryPanel({ selection, setSelection, stateScores }: Props) {
  const currentState = stateScores.find(
    s => s.state_code === selection.selectedState || s.state === selection.selectedState
  );

  if (!currentState || currentState.metros.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] p-4 text-slate-500 text-xs"
        style={{ background: "rgba(255,255,255,0.05)" }}>
        No metros available for this state.
      </div>
    );
  }

  const metros = [...currentState.metros].sort((a, b) => b.market_readiness_score - a.market_readiness_score);

  return (
    <div className="rounded-2xl border border-white/[0.08] p-4"
      style={{ background: "rgba(255,255,255,0.05)" }}>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-3">Metro Markets</p>
      <div className="space-y-1.5">
        {metros.map((m) => (
          <button
            key={m.metro}
            onClick={() => setSelection(prev => ({ ...prev, mapMode: "metro", selectedMetro: m.metro }))}
            className="w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] hover:border-white/[0.14] transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.04)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
          >
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-200 truncate">
                {m.metro.split(",")[0]}
              </div>
              {m.top_drivers.length > 0 && (
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  {m.top_drivers.join(" · ")}
                </div>
              )}
            </div>
            <div className="shrink-0 text-lg font-black text-blue-400">
              {m.market_readiness_score}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
