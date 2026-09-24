import type { Scenario } from "./ScenarioToggle";

// ─── Data ────────────────────────────────────────────────────────────────────

export const CUMULATIVE_DATA: Record<Scenario, number[]> = {
  conservative: [-253000, -204271, -155542, -106813, -58084, -9355,  39374,  88103,  136832, 185561, 234290],
  base:         [-220000, -152718,  -85436,  -18154,  49128, 116410, 183692, 250974,  318256, 385538, 452820],
  upside:       [-198000, -129114,  -60228,    8658,  77544, 146430, 215316, 284202,  353088, 421974, 490860],
};

// ─── SVG constants ────────────────────────────────────────────────────────────

const W = 640;
const H = 280;
const PAD = { top: 24, right: 24, bottom: 48, left: 72 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const YEARS = 11; // 0..10

// ─── Scale helpers ────────────────────────────────────────────────────────────

function computeScale(chartData: Record<Scenario, number[]>) {
  const allValues = (["conservative", "base", "upside"] as Scenario[]).flatMap((s) => chartData[s]);
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const headroom = (dataMax - dataMin) * 0.12;
  const yMin = Math.floor((dataMin - headroom) / 50_000) * 50_000;
  const yMax = Math.ceil((dataMax + headroom) / 50_000) * 50_000;
  return { yMin, yMax };
}

function makeHelpers(yMin: number, yMax: number) {
  const yRange = yMax - yMin;
  const xOf = (year: number) => PAD.left + (year / (YEARS - 1)) * PLOT_W;
  const yOf = (value: number) => PAD.top + PLOT_H - ((value - yMin) / yRange) * PLOT_H;
  const toPath = (values: number[]) =>
    values.map((v, i) => `${i === 0 ? "M" : "L"} ${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(" ");

  const step = (yMax - yMin) > 800_000 ? 200_000 : 100_000;
  const ticks: number[] = [];
  for (let t = Math.ceil(yMin / step) * step; t <= yMax; t += step) ticks.push(t);

  return { xOf, yOf, toPath, ticks };
}

function fmtAxisUsd(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)    return `${sign}$${Math.round(abs / 1_000)}K`;
  return "$0";
}

// ─── Chart ───────────────────────────────────────────────────────────────────

interface CumulativeChartProps {
  activeScenario: Scenario;
  realData?: Record<Scenario, number[]>;
}

const SCENARIO_STROKE: Record<Scenario, { color: string; dash: string; label: string }> = {
  conservative: { color: "#94a3b8", dash: "6 3", label: "Conservative" },
  base:         { color: "#3b82f6", dash: "0",   label: "Base Case" },
  upside:       { color: "#10b981", dash: "0",   label: "Upside" },
};

export default function CumulativeChart({ activeScenario, realData }: CumulativeChartProps) {
  const chartData = realData ?? CUMULATIVE_DATA;

  const { yMin, yMax } = computeScale(chartData);
  const { xOf, yOf, toPath, ticks } = makeHelpers(yMin, yMax);
  const zeroY = yOf(0);

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-4 flex flex-col gap-3 h-96 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Cumulative Net Cash Flow</h3>
          <p className="text-xs text-slate-500 mt-0.5">Year 0–10 · All scenarios · Break-even at $0</p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4">
          {(["conservative", "base", "upside"] as Scenario[]).map((s) => {
            const cfg = SCENARIO_STROKE[s];
            const isActive = s === activeScenario;
            return (
              <div key={s} className={`flex items-center gap-1.5 transition-opacity duration-200 ${isActive ? "opacity-100" : "opacity-35"}`}>
                <svg width="20" height="8" viewBox="0 0 20 8">
                  <line
                    x1="0" y1="4" x2="20" y2="4"
                    stroke={cfg.color}
                    strokeWidth={isActive ? "2.5" : "1.5"}
                    strokeDasharray={cfg.dash}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-xs text-slate-600">{cfg.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SVG chart */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        aria-label="Cumulative net cash flow over 10 years"
      >
        {/* ── Horizontal grid lines ──────────────────────── */}
        {ticks.map((t) => {
          const y = yOf(t);
          return (
            <line
              key={t}
              x1={PAD.left} y1={y} x2={PAD.left + PLOT_W} y2={y}
              stroke="#f1f5f9" strokeWidth="1"
            />
          );
        })}

        {/* ── Y axis labels ────────────────────────────── */}
        {ticks.map((t) => {
          const y = yOf(t);
          return (
            <text
              key={t}
              x={PAD.left - 6}
              y={y + 4}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="9"
              fontFamily="monospace"
            >
              {fmtAxisUsd(t)}
            </text>
          );
        })}

        {/* ── X axis labels ────────────────────────────── */}
        {Array.from({ length: YEARS }, (_, i) => (
          <text
            key={i}
            x={xOf(i)}
            y={PAD.top + PLOT_H + 16}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
          >
            {i === 0 ? "Now" : `Yr ${i}`}
          </text>
        ))}

        {/* ── X axis line ──────────────────────────────── */}
        <line
          x1={PAD.left} y1={PAD.top + PLOT_H}
          x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H}
          stroke="#e2e8f0" strokeWidth="1"
        />

        {/* ── Y axis line ──────────────────────────────── */}
        <line
          x1={PAD.left} y1={PAD.top}
          x2={PAD.left} y2={PAD.top + PLOT_H}
          stroke="#e2e8f0" strokeWidth="1"
        />

        {/* ── Break-even reference line (Y = 0) ─────────── */}
        {zeroY >= PAD.top && zeroY <= PAD.top + PLOT_H && (
          <>
            <line
              x1={PAD.left} y1={zeroY}
              x2={PAD.left + PLOT_W} y2={zeroY}
              stroke="#cbd5e1" strokeWidth="1"
              strokeDasharray="4 4"
              opacity="0.6"
            />
            <text
              x={PAD.left + PLOT_W + 4}
              y={zeroY + 4}
              fill="#94a3b8"
              fontSize="8"
              fontFamily="monospace"
              opacity="0.7"
            >
              Break-even
            </text>
          </>
        )}

        {/* ── Scenario lines (inactive first, then active on top) ─ */}
        {(["conservative", "base", "upside"] as Scenario[])
          .filter((s) => s !== activeScenario)
          .map((s) => {
            const cfg = SCENARIO_STROKE[s];
            return (
              <path
                key={s}
                d={toPath(chartData[s])}
                fill="none"
                stroke={cfg.color}
                strokeWidth="1.5"
                strokeDasharray={cfg.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
              />
            );
          })}

        {/* Active scenario — rendered last (on top) */}
        {(() => {
          const cfg = SCENARIO_STROKE[activeScenario];
          const vals = chartData[activeScenario];
          return (
            <g>
              <path
                d={toPath(vals)}
                fill="none"
                stroke={cfg.color}
                strokeWidth="2.5"
                strokeDasharray={cfg.dash}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {vals.map((v, i) => (
                <circle
                  key={i}
                  cx={xOf(i)}
                  cy={yOf(v)}
                  r="2.5"
                  fill={cfg.color}
                  opacity="0.9"
                />
              ))}
            </g>
          );
        })()}

        {/* ── Break-even annotation for active scenario ─── */}
        {(() => {
          const vals = chartData[activeScenario];
          const crossYear = vals.findIndex((v, i) => i > 0 && vals[i - 1] < 0 && v >= 0);
          if (crossYear < 0) return null;
          const v0 = vals[crossYear - 1];
          const v1 = vals[crossYear];
          const frac = Math.abs(v0) / (Math.abs(v0) + Math.abs(v1));
          const breakX = xOf(crossYear - 1 + frac);
          const breakY = yOf(0);
          return (
            <g>
              <circle cx={breakX} cy={breakY} r="5" fill={SCENARIO_STROKE[activeScenario].color} opacity="0.2" />
              <circle cx={breakX} cy={breakY} r="3" fill={SCENARIO_STROKE[activeScenario].color} />
              <text
                x={breakX}
                y={breakY - 10}
                textAnchor="middle"
                fill={SCENARIO_STROKE[activeScenario].color}
                fontSize="8"
                fontFamily="monospace"
                fontWeight="bold"
              >
                Break-even ≈ Yr {(crossYear - 1 + frac).toFixed(1)}
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
