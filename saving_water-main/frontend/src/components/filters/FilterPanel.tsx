"use client";
import React from "react";
import { SelectionState } from "../dashboard/ProspectingDashboard";

type FilterPanelProps = {
  selection: SelectionState;
  setSelection: React.Dispatch<React.SetStateAction<SelectionState>>;
};

const FILTER_META: Record<keyof SelectionState["filters"], { label: string; sub?: string; dotColor: string; activeGlow: string }> = {
  roofAboveThreshold: { label: "Roof area > 50K sqft (4,645 m²)", sub: "Commercial / industrial footprint", dotColor: "bg-blue-400", activeGlow: "shadow-blue-500/20" },
  coolingTowerOnly:   { label: "Cooling tower detected",          sub: "Confirmed CV detection",            dotColor: "bg-emerald-400", activeGlow: "shadow-emerald-500/20" },
  highWaterCostOnly:  { label: "High water cost market",          sub: "≥ $10/kgal ($2.64/m³) tariff",     dotColor: "bg-amber-400", activeGlow: "shadow-amber-500/20" },
  esgPrioritizedOnly: { label: "ESG-prioritized owner",           sub: "SBTi, Green Star / LEED, ESG >80",  dotColor: "bg-purple-400", activeGlow: "shadow-purple-500/20" },
};

export default function FilterPanel({ selection, setSelection }: FilterPanelProps) {
  const toggle = (key: keyof SelectionState["filters"]) => {
    setSelection(prev => ({
      ...prev,
      filters: { ...prev.filters, [key]: !prev.filters[key] },
    }));
  };

  return (
    <div className="space-y-2">
      {(Object.entries(selection.filters) as [keyof SelectionState["filters"], boolean][]).map(([key, active]) => {
        const meta = FILTER_META[key];
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-xl transition-all duration-200 border ${
              active
                ? `bg-white/[0.1] border-white/20 shadow-md ${meta.activeGlow}`
                : "bg-white/[0.04] border-white/[0.06] hover:bg-white/[0.08] hover:border-white/10"
            }`}
          >
            <span className={`mt-1 w-2 h-2 rounded-full shrink-0 transition-all duration-200 ${active ? meta.dotColor : "bg-slate-600"}`} />
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-medium leading-tight transition-colors duration-200 ${active ? "text-slate-100" : "text-slate-400"}`}>
                {meta.label}
              </div>
              {active && meta.sub && (
                <div className="text-[11px] text-slate-500 mt-0.5">{meta.sub}</div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
