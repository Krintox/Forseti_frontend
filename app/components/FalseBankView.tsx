import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, CreditCard, Smartphone, Bot } from 'lucide-react';
import { RoundStepResult, AuthorityState } from '../types/arena';

interface FalseBankViewProps {
  stepResults: RoundStepResult[];
  authorityState?: AuthorityState;
}

export const FalseBankView: React.FC<FalseBankViewProps> = ({
  stepResults,
  authorityState,
}) => {
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col h-full">
      {/* Header with Glowing Green Tag */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold font-mono uppercase tracking-wider text-slate-200">
              Legacy Bank Rail View
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1 shadow-sm shadow-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ALL SYSTEMS NOMINAL
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Isolated per-rail syntactic evaluation (Cards, UPI, AP2)
          </p>
        </div>
      </div>

      {/* 3 Rails Gauge Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Card Token Rail */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
              <CreditCard className="h-3.5 w-3.5 text-indigo-400" />
              Card Token (MDES)
            </div>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">100% OK</div>
          <p className="text-[10px] text-slate-400">MCC 5411 Valid | Limit ₹10k</p>
        </div>

        {/* UPI Circle Rail */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
              <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
              UPI Circle (OC 201-B)
            </div>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">100% OK</div>
          <p className="text-[10px] text-slate-400">Delegate VPA Linked | Cap ₹10k</p>
        </div>

        {/* Agentic AP2 Rail */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono">
              <Bot className="h-3.5 w-3.5 text-rose-400" />
              Agentic (AP2 Mandate)
            </div>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400">100% OK</div>
          <p className="text-[10px] text-slate-400">W3C VC Chained | Hash Match</p>
        </div>
      </div>

      {/* Live Transaction Feed from Bank perspective */}
      <div className="flex-1 overflow-y-auto max-h-64 space-y-2 pr-1 font-mono text-xs">
        {stepResults.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-800 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-slate-400 mb-1" />
            No active transaction stream. Click "FIRE ATTACK" to simulate.
          </div>
        ) : (
          stepResults.map((res, i) => (
            <div
              key={i}
              className="bg-slate-950/90 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between gap-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-bold">{res.tx.tx_id}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {res.tx.rail}
                  </span>
                  <span className="text-[10px] text-slate-400">{res.tx.merchant_name} (MCC: {res.tx.merchant_mcc})</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {res.tx.local_rail_message || 'Valid signature cryptogram; approved locally.'}
                </p>
              </div>

              <div className="text-right whitespace-nowrap">
                <div className="text-sm font-bold text-slate-100">₹{res.tx.amount.toFixed(2)}</div>
                <div className="text-[10px] text-emerald-400 font-semibold flex items-center justify-end gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {res.local_rail_verdict}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Per-Rail Fraud Alarm: <strong className="text-emerald-400 font-mono">0 Flags Fired</strong></span>
        <span>Local Bank Status: <strong className="text-slate-200 font-mono">Clean</strong></span>
      </div>
    </div>
  );
};
