import React from "react";
import { SelectionState } from "../dashboard/ProspectingDashboard";
import { BuildingCandidate } from "@/types/building";

import { formatArea } from "@/lib/unitConversion";

type Props = {
  selection: SelectionState;
  setSelection: React.Dispatch<React.SetStateAction<SelectionState>>;
  filteredBuildings: BuildingCandidate[];
};

const ANGLE_COLORS: Record<BuildingCandidate["recommended_angle"], string> = {
  cost_savings:    "bg-teal-500/20 text-teal-300 border-teal-500/30",
  resilience:      "bg-blue-500/20 text-blue-300 border-blue-500/30",
  compliance:      "bg-amber-500/20 text-amber-300 border-amber-500/30",
  esg_credibility: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

export default function BuildingListPanel({ selection, setSelection, filteredBuildings }: Props) {
  const buildings = filteredBuildings.filter(b => b.metro === selection.selectedMetro);

  return (
    <div className="flex flex-col h-full">
      <div className="pb-3 border-b border-white/[0.08] mb-3">
        <h2 className="text-sm font-bold text-slate-200">{selection.selectedMetro?.split(",")[0]}</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          {buildings.length} candidate{buildings.length !== 1 ? "s" : ""} match current filters
        </p>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-dark space-y-1.5">
        {buildings.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No buildings match active filters.</p>
        ) : (
          buildings.map((b) => (
            <button
              key={b.building_id}
              onClick={() => setSelection(prev => ({ ...prev, mapMode: "building", selectedBuildingId: b.building_id }))}
              className="w-full text-left px-3 py-3 rounded-xl border border-white/[0.06] hover:border-white/[0.14] transition-all duration-200 hover:shadow-lg"
              style={{ background: "rgba(255,255,255,0.04)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-sm font-semibold text-slate-200 truncate">
                  {b.address?.trim() ? b.address.split(",")[0] : `${b.building_type.replace(/_/g, " ")} · ${b.metro}`}
                </span>
                <span className="text-base font-black text-emerald-400 shrink-0">{b.viability_score}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500 capitalize truncate">
                  {b.building_type.replace(/_/g, " ")} · {formatArea(b.roof_area_sqft, true)}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-slate-500">CV {(b.cv_confidence_score * 100).toFixed(0)}%</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${ANGLE_COLORS[b.recommended_angle] ?? ANGLE_COLORS["cost_savings"]}`}>
                    {b.recommended_angle.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
