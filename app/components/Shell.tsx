'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  Bot,
  BarChart3,
  BookOpen,
  Crosshair,
  Eye,
  FileCheck2,
  FlaskConical,
  LayoutDashboard,
  Lock,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  Swords,
  Users,
} from 'lucide-react';
import { useArena } from '../lib/ArenaProvider';
import { inr } from '../lib/api';

/** Every entry here resolves to a real page. No dead navigation. */
export const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, group: 'Command' },
  { href: '/arena', label: 'Live Arena', icon: Swords, group: 'Command' },
  { href: '/simulator', label: 'Attack Simulator', icon: Crosshair, group: 'Command' },
  { href: '/defense', label: 'Defense Center', icon: ShieldCheck, group: 'Command' },
  { href: '/transactions', label: 'Transaction Monitor', icon: Activity, group: 'Operations' },
  { href: '/ledger', label: 'Delegation Ledger', icon: BookOpen, group: 'Operations' },
  { href: '/agents', label: 'Agents', icon: Users, group: 'Operations' },
  { href: '/threat-intel', label: 'Threat Intelligence', icon: Eye, group: 'Operations' },
  { href: '/detection', label: 'Detection Lab', icon: BarChart3, group: 'Science' },
  { href: '/fidelity', label: 'Fidelity Lab', icon: FlaskConical, group: 'Science' },
  { href: '/explainability', label: 'Explainability', icon: Sparkles, group: 'Science' },
  { href: '/ai', label: 'AI Studio', icon: Bot, group: 'Science' },
  { href: '/policy', label: 'Policy Center', icon: FileCheck2, group: 'Governance' },
  { href: '/audit', label: 'Quantum Audit', icon: Lock, group: 'Governance' },
  { href: '/replay', label: 'Replay & Demo', icon: Activity, group: 'Governance' },
  { href: '/settings', label: 'System Settings', icon: Settings, group: 'Governance' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { connected, exposure, ceiling, utilization, state } = useArena();

  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  const breached = exposure > ceiling && ceiling > 0;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col justify-between overflow-y-auto border-r border-slate-200 bg-white">
        <div>
          <Link href="/" className="flex items-center gap-3 border-b border-slate-100 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-800 text-white shadow-md shadow-blue-500/20">
              <Scale className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-base font-black leading-none tracking-tight">FORSETI</h1>
              <p className="mt-1 text-[9px] font-medium leading-none text-slate-400">
                Delegated Authority. Global Integrity.
              </p>
            </div>
          </Link>

          <nav className="p-2.5">
            {groups.map((group) => (
              <div key={group} className="mb-3">
                <p className="px-2.5 pb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {NAV.filter((n) => n.group === group).map((item) => {
                    const Icon = item.icon;
                    const active =
                      item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                          active
                            ? 'bg-blue-50 font-bold text-blue-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="border-t border-slate-100 p-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              Global Authority
            </p>
            <p
              className={`mt-1 font-mono text-sm font-bold tabular-nums ${
                breached ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {inr(exposure)} <span className="text-slate-400">/ {inr(ceiling)}</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  utilization >= 100 ? 'bg-rose-500' : utilization >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, utilization)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10px] font-semibold text-slate-500">
              {utilization.toFixed(1)}% utilised
            </p>
          </div>

          <div className="mt-2 flex items-center justify-between px-1 text-[10px]">
            <span className="flex items-center gap-1.5 font-semibold text-slate-500">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connected ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'
                }`}
              />
              {connected ? 'Live stream' : 'Reconnecting'}
            </span>
            <span className="font-mono text-slate-400">
              {state?.detector_status?.model_loaded ? 'MODEL OK' : 'NO MODEL'}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-[1600px] flex-1 space-y-5 p-6">{children}</main>
        <footer className="border-t border-slate-200 px-6 py-3 text-center text-[10px] font-mono text-slate-400">
          FORSETI — synthetic, standards-inspired payment simulator. No real payment credentials,
          no production connections. Mastercard Innovation Challenge @ GFF 2026.
        </footer>
      </div>
    </div>
  );
}
