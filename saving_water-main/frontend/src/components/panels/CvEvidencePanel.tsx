import { Camera } from "lucide-react";
import { BuildingCandidate } from "@/types/building";

export default function CvEvidencePanel({ building }: { building: BuildingCandidate }) {
  const confPct = Math.round(building.cv_confidence_score * 100);
  const confColor =
    confPct >= 90 ? "text-emerald-400" :
    confPct >= 70 ? "text-amber-400"  :
    "text-red-400";

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">CV Evidence</p>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <Camera size={12} /> Satellite
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl p-3 border border-white/[0.08] shadow-md"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wide">CV Confidence</p>
          <p className={`text-xl font-bold ${confColor}`}>{confPct}%</p>
        </div>
        <div className="rounded-xl p-3 border border-white/[0.08] shadow-md"
          style={{ background: "rgba(255,255,255,0.05)" }}>
          <p className="text-[10px] text-slate-500 mb-1.5 font-medium uppercase tracking-wide">Cooling Towers</p>
          <p className={`text-xl font-bold ${building.cooling_tower_present ? "text-blue-400" : "text-slate-500"}`}>
            {building.cooling_tower_present ? `${building.cooling_tower_count}` : "—"}
          </p>
        </div>
      </div>

      <div className="flex justify-between mt-3 text-[11px] text-slate-600">
        <span>{building.imagery_source ?? "Satellite"}</span>
        <span>{building.imagery_date ?? "—"}</span>
      </div>
    </div>
  );
}
