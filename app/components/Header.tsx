import React from 'react';
import { ShieldCheck, ShieldAlert, Sparkles, Cpu, Layers } from 'lucide-react';

interface HeaderProps {
  dtlActive: boolean;
  onToggleDtl: () => void;
  onOpenTaxonomy: () => void;
  onOpenFidelity: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dtlActive,
  onToggleDtl,
  onOpenTaxonomy,
  onOpenFidelity,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Theme */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-rose-500 via-indigo-600 to-cyan-400 p-0.5 shadow-lg shadow-rose-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-mono">
                FORSETI <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">CHIMERA DTL</span>
              </h1>
              <span className="text-xs text-slate-400">| Mastercard Innovation Challenge 2026</span>
            </div>
            <p className="text-xs text-slate-400">
              Adversarial AI Defense Lab for Multi-Rail Delegated Payment Security
            </p>
          </div>
        </div>

        {/* Global Controls & Modals */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTaxonomy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-cyan-400" />
            52-Vector Taxonomy
          </button>

          <button
            onClick={onOpenFidelity}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition-colors"
          >
            <Cpu className="h-3.5 w-3.5 text-indigo-400" />
            Fidelity Harness (PaySim/ULB)
          </button>

          {/* DTL Master Toggle */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <span className="text-xs text-slate-400 font-mono">DTL DEFENSE:</span>
            <button
              onClick={onToggleDtl}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 shadow-sm ${
                dtlActive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-emerald-500/10'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-rose-500/10'
              }`}
            >
              {dtlActive ? (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  ENABLED (ACTIVE)
                </>
              ) : (
                <>
                  <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
                  DISABLED (BLIND)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
