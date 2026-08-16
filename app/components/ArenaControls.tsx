import React from 'react';
import { Play, RotateCcw, FastForward, Shield, Zap } from 'lucide-react';

interface ArenaControlsProps {
  currentRound: number;
  dtlActive: boolean;
  isRunning: boolean;
  onSelectRound: (round: number) => void;
  onRunCurrentRound: () => void;
  onRunDeterministicDemo: () => void;
  onReset: () => void;
}

export const ArenaControls: React.FC<ArenaControlsProps> = ({
  currentRound,
  dtlActive,
  isRunning,
  onSelectRound,
  onRunCurrentRound,
  onRunDeterministicDemo,
  onReset,
}) => {
  const rounds = [
    { num: 1, name: "Intent Laundering (Grocery MCC + Gift Card)" },
    { num: 2, name: "Flagship Cross-Rail Budget Splitting (₹4k x 3)" },
    { num: 3, name: "Adaptive Baseline Poisoning" },
    { num: 4, name: "Revocation Flooding (Race Condition)" },
    { num: 5, name: "Velocity Card Testing Spike" },
    { num: 6, name: "Sub-Agent Scope Creep (Hierarchy Escalation)" },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-xl mb-6">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Round Selector Dropdown / Pills */}
        <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
          <span className="text-xs font-mono text-slate-400 font-semibold uppercase whitespace-nowrap">
            Attack Round:
          </span>
          <div className="flex items-center gap-1.5">
            {rounds.map((r) => (
              <button
                key={r.num}
                onClick={() => onSelectRound(r.num)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                  currentRound === r.num
                    ? 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-600/30'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                R{r.num}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-300 font-mono hidden xl:inline ml-2 text-rose-300">
            [{rounds[currentRound - 1]?.name}]
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
          {/* Deterministic Replay Button */}
          <button
            onClick={onRunDeterministicDemo}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold font-mono bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Zap className="h-4 w-4 fill-slate-950" />
            1-CLICK DEMO (90s Replay)
          </button>

          {/* Run Round Button */}
          <button
            onClick={onRunCurrentRound}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold font-mono bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <Play className="h-4 w-4 fill-white" />
            FIRE ATTACK (R{currentRound})
          </button>

          {/* Reset Arena */}
          <button
            onClick={onReset}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};
