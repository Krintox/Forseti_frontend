'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info } from 'lucide-react';
import type { ArtifactEnvelope } from '../lib/types';
import { isArtifactMissing } from '../lib/types';

export function Card({
  title,
  subtitle,
  right,
  className = '',
  children,
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/50 ${className}`}
    >
      {(title || right) && (
        <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1.5 border-b border-slate-100 px-5 py-3.5">
          {/* `grow` (not `flex-1`) deliberately keeps flex-basis:auto. flex-1 sets
              flex-basis:0%, which makes the browser's line-wrap decision ignore
              this block's real content width entirely - it only ever sees the
              `right` block's width against the container, so the header never
              wraps and this title collapses to a few px with its text
              overflowing on top of `right` instead of dropping to a new line. */}
          <div className="min-w-0 grow">
            {title && (
              <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-800">{title}</h2>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {right && <div className="max-w-full shrink-0">{right}</div>}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'danger' | 'success' | 'warning';
  icon?: React.ReactNode;
}) {
  const toneClass = {
    default: 'text-slate-900',
    danger: 'text-rose-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className={`mt-1.5 font-mono text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-slate-500">{hint}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'slate',
}: {
  children: React.ReactNode;
  tone?: 'slate' | 'blue' | 'red' | 'green' | 'amber' | 'purple';
}) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  }[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tones}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  title,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md';
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600 disabled:bg-blue-300',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 border-rose-600 disabled:bg-rose-300',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600 disabled:bg-emerald-300',
    ghost: 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 disabled:text-slate-400',
  }[variant];
  const sizes = { sm: 'px-2.5 py-1.5 text-[11px]', md: 'px-4 py-2 text-xs' }[size];
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border font-bold uppercase tracking-wide transition-colors disabled:cursor-not-allowed ${variants} ${sizes} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Rendered whenever an experiment artifact has not been generated. This is the
 * project's honesty contract made visible: no metric is invented to fill a gap.
 */
export function NotRun({ artifact, label }: { artifact: ArtifactEnvelope | null; label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-900">{label}: NOT RUN</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            No measurement exists for this yet, so nothing is displayed in its place. Generate it by
            running:
          </p>
          <code className="mt-2 block overflow-x-auto rounded-md bg-amber-900/90 px-3 py-2 font-mono text-[11px] text-amber-50">
            {artifact?.regenerate_with ?? 'see docs/reproducibility.md'}
          </code>
        </div>
      </div>
    </div>
  );
}

export function Provenance({ artifact }: { artifact: ArtifactEnvelope | null }) {
  if (!artifact || isArtifactMissing(artifact)) return null;
  const meta = artifact._artifact;
  const expId =
    artifact.experiment_id ?? artifact.metadata?.experiment_id ?? artifact.benchmark_id ?? '-';
  const seed = artifact.seed ?? artifact.metadata?.seed ?? artifact.environment?.seed ?? '-';
  return (
    <div className="flex max-w-full flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono text-slate-500">
      <span className="break-words">experiment: {String(expId)}</span>
      <span className="break-words">seed: {String(seed)}</span>
      {meta && <span className="break-words">generated: {new Date(meta.generated_at).toLocaleString()}</span>}
      {/* Windows paths (backslash-separated) have no natural line-break point and
          previously forced this whole card header to blow out and overlap the
          title at laptop-width viewports. break-all lets it wrap mid-path. */}
      {meta && <span className="break-all">source: {meta.path}</span>}
    </div>
  );
}

export function InfoNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-[11px] leading-relaxed text-blue-900">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-600">{description}</p>
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** A number that visibly counts to its new value when it changes. */
export function AnimatedNumber({
  value,
  format,
  className = '',
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const [display, setDisplay] = React.useState(value);
  const fromRef = React.useRef(value);

  React.useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const duration = 550;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <motion.span
      key={value}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 0.4 }}
      className={`tabular-nums ${className}`}
    >
      {format(display)}
    </motion.span>
  );
}

export function SeverityDot({ severity }: { severity: string }) {
  const color =
    { critical: 'bg-rose-500', warning: 'bg-amber-500', success: 'bg-emerald-500', info: 'bg-blue-500' }[
      severity
    ] ?? 'bg-slate-400';
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} />;
}
