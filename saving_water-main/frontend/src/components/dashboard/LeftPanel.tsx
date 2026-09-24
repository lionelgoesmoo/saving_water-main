"use client";
import React from "react";
import { ChevronLeft } from "lucide-react";
import { SelectionState } from "./ProspectingDashboard";
import FilterPanel from "../filters/FilterPanel";

type LeftPanelProps = {
  selection: SelectionState;
  setSelection: React.Dispatch<React.SetStateAction<SelectionState>>;
};

const VIEW_LABELS: Record<SelectionState["mapMode"], string> = {
  national: "Continental View",
  state:    "Country View",
  metro:    "Metro View",
  building: "Building View",
};

export default function LeftPanel({ selection, setSelection }: LeftPanelProps) {
  const goNational = () => setSelection(prev => ({ ...prev, mapMode: "national", selectedState: null, selectedMetro: null, selectedBuildingId: null }));
  const goState    = () => setSelection(prev => ({ ...prev, mapMode: "state",    selectedMetro: null, selectedBuildingId: null }));
  const goMetro    = () => setSelection(prev => ({ ...prev, mapMode: "metro",    selectedBuildingId: null }));

  const parentAction =
    selection.mapMode === "building" ? goMetro :
    selection.mapMode === "metro"    ? goState  :
    selection.mapMode === "state"    ? goNational : null;

  return (
    <div className="flex flex-col h-full overflow-y-auto scrollbar-dark"
      style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(24px)" }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <img src="/assets/Hand Holding Water Droplet.png" alt="Tone" className="w-20 h-20 object-contain shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-black tracking-tight bg-gradient-to-r from-blue-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent leading-tight">Tone</h1>
            <p className="text-xs text-slate-500 leading-tight">East Africa Water Resilience</p>
          </div>
        </div>
      </div>

      {/* Current view + back button */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2.5 font-semibold">View</p>
        <div className="flex items-center gap-2">
          {parentAction && (
            <button
              onClick={parentAction}
              className="flex items-center justify-center w-6 h-6 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <ChevronLeft size={14} />
            </button>
          )}
          <span className="text-sm font-semibold text-slate-200">{VIEW_LABELS[selection.mapMode]}</span>
        </div>
      </div>

      {/* Scope breadcrumb */}
      <div className="px-4 py-4 border-b border-white/[0.06]">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2.5 font-semibold">Scope</p>
        <div className="space-y-1">
          <button
            onClick={goNational}
            className={`w-full text-left text-sm px-3 py-2 rounded-xl transition-all duration-200 font-medium border ${
              selection.mapMode === "national"
                ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-sm shadow-blue-500/10"
                : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.06]"
            }`}
          >
            Africa
          </button>

          {selection.selectedState && (
            <button
              onClick={goState}
              className={`w-full text-left text-sm px-3 py-2 rounded-xl transition-all duration-200 font-medium flex items-center gap-1.5 border ${
                selection.mapMode === "state"
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-sm shadow-blue-500/10"
                  : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.06]"
              }`}
            >
              <ChevronLeft size={12} className="text-slate-500 shrink-0" />
              <span className="truncate">Country: {selection.selectedState}</span>
            </button>
          )}

          {selection.selectedMetro && (
            <button
              onClick={goMetro}
              className={`w-full text-left text-sm px-3 py-2 rounded-xl transition-all duration-200 font-medium flex items-center gap-1.5 border ${
                selection.mapMode === "metro"
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-sm shadow-blue-500/10"
                  : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.06]"
              }`}
            >
              <ChevronLeft size={12} className="text-slate-500 shrink-0" />
              <span className="truncate">Metro: {selection.selectedMetro}</span>
            </button>
          )}

          {selection.selectedBuildingId && (
            <button
              onClick={() => setSelection(prev => ({ ...prev, mapMode: "building" }))}
              className={`w-full text-left text-sm px-3 py-2 rounded-xl transition-all duration-200 font-medium flex items-center gap-1.5 border ${
                selection.mapMode === "building"
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30 shadow-sm shadow-blue-500/10"
                  : "text-slate-400 hover:text-slate-200 border-transparent hover:bg-white/[0.06]"
              }`}
            >
              <ChevronLeft size={12} className="text-slate-500 shrink-0" />
              Building
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-4 flex-1 overflow-y-auto scrollbar-dark">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-3 font-semibold">Filters</p>
        {selection.mapMode === "national" ? (
          <p className="text-xs text-slate-500 leading-relaxed">
            Select a country to activate building filters.
          </p>
        ) : (
          <FilterPanel selection={selection} setSelection={setSelection} />
        )}
      </div>
    </div>
  );
}
