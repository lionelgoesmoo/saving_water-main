import React from "react";
import { cn } from "@/lib/utils";

export type Scenario = "conservative" | "base" | "upside";

interface ScenarioConfig {
  label: string;
  sub: string;
  active: string;
  inactive: string;
  dot: string;
}

const SCENARIOS: Record<Scenario, ScenarioConfig> = {
  conservative: {
    label: "Conservative",
    sub: "×0.75 rainfall · 80% efficiency · +15% capex",
    active:   "bg-slate-100 border-slate-300 text-slate-800 shadow-sm",
    inactive: "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700",
    dot: "bg-slate-500",
  },
  base: {
    label: "Base Case",
    sub: "30-yr avg rainfall · 85% efficiency · standard capex",
    active:   "bg-blue-50 border-blue-300 text-blue-800 shadow-sm shadow-blue-100",
    inactive: "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700",
    dot: "bg-blue-500",
  },
  upside: {
    label: "Upside",
    sub: "×1.15 rainfall · 90% efficiency · −10% capex",
    active:   "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-sm shadow-emerald-100",
    inactive: "bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700",
    dot: "bg-emerald-500",
  },
};

interface ScenarioToggleProps {
  scenario: Scenario;
  onChange: (s: Scenario) => void;
}

export default function ScenarioToggle({ scenario, onChange }: ScenarioToggleProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-500 shrink-0">
        Scenario
      </span>
      <div className="flex gap-2 flex-wrap">
        {(["conservative", "base", "upside"] as Scenario[]).map((s) => {
          const cfg = SCENARIOS[s];
          const isActive = scenario === s;
          return (
            <button
              key={s}
              onClick={() => onChange(s)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200",
                isActive ? cfg.active : cfg.inactive
              )}
            >
              <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
              <span>{cfg.label}</span>
              {isActive && (
                <span className="hidden lg:inline text-xs font-normal opacity-60 ml-1">
                  {cfg.sub}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Show sub-text for active scenario on smaller screens */}
      <span className="lg:hidden text-xs text-slate-500">
        {SCENARIOS[scenario].sub}
      </span>
    </div>
  );
}
