import React from 'react';
import { BriefResult } from '@/types/brief';

type Props = {
  briefResult: BriefResult | null;
  loading: boolean;
  error: string | null;
};

export default function BriefPreviewPanel({ briefResult, loading, error }: Props) {
  if (error) {
    return (
      <div className="p-4 rounded-xl border border-red-500/30 text-red-400 text-xs"
        style={{ background: "rgba(239,68,68,0.08)" }}>
        {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 rounded-xl border border-purple-500/30 text-center flex flex-col items-center gap-2"
        style={{ background: "rgba(168,85,247,0.08)" }}>
        <div className="animate-spin w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full" />
        <span className="font-semibold text-purple-300 text-xs">Generating AI Investment Brief...</span>
      </div>
    );
  }

  if (!briefResult) return null;

  return (
    <div className="rounded-xl border border-purple-500/20 overflow-hidden"
      style={{ background: "rgba(168,85,247,0.07)" }}>
      <div className="p-3 border-b border-purple-500/20 border-l-4 border-l-purple-500 font-bold text-purple-300 text-xs">
        AI Investment Brief
      </div>
      <div className="p-3 space-y-3">
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest">Executive Summary</div>
          <p className="text-slate-300 leading-relaxed text-xs">{briefResult.executive_summary}</p>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest">Pitch Script</div>
          <div className="border border-white/[0.08] italic p-2 text-xs text-slate-300 rounded-lg"
            style={{ background: "rgba(255,255,255,0.04)" }}>
            "{briefResult.pitch_script}"
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 tracking-widest">Risks & Mitigations</div>
          <ul className="list-disc list-outside ml-4 space-y-1 text-xs text-slate-400">
            {briefResult.risks_and_mitigation.map((risk, i) => (
              <li key={i}>{risk}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
