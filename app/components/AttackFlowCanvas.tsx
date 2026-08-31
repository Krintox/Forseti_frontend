'use client';

import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bot, CreditCard, Landmark, Scale, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';
import { useArena } from '../lib/ArenaProvider';
import { inr } from '../lib/api';

/**
 * The flow diagram is a pure function of the backend event stream.
 *
 * Node positions are fixed; which edge is lit, what text rides on it, and every
 * amount shown all come from the last events received over the WebSocket. If
 * the backend emits nothing, nothing animates - by design, so the picture can
 * never disagree with the engine.
 */

interface NodeDef {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  icon: React.ElementType;
  accent: string;
}

const W = 1000;
const H = 560;

const NODES: NodeDef[] = [
  { id: 'principal', label: 'USER GRANT', sub: 'Delegated authority', x: 40, y: 40, w: 150, h: 78, icon: Scale, accent: '#0f172a' },
  { id: 'red_agent', label: 'RED AGENT', sub: 'AGT-7721', x: 40, y: 210, w: 150, h: 96, icon: Bot, accent: '#e11d48' },
  { id: 'card_token', label: 'CARD RAIL', sub: 'Card-token adapter', x: 268, y: 40, w: 168, h: 92, icon: CreditCard, accent: '#2563eb' },
  { id: 'upi_circle', label: 'UPI RAIL', sub: 'UPI-Circle adapter', x: 268, y: 172, w: 168, h: 92, icon: Smartphone, accent: '#7c3aed' },
  { id: 'agentic_ap2', label: 'AGENTIC RAIL', sub: 'AP2-style adapter', x: 268, y: 304, w: 168, h: 92, icon: Landmark, accent: '#059669' },
  { id: 'dtl', label: 'FORSETI DTL', sub: 'Global authority check', x: 520, y: 172, w: 190, h: 110, icon: Scale, accent: '#1d4ed8' },
  { id: 'ml_detector', label: 'ML DETECTOR', sub: 'XGBoost + SHAP', x: 540, y: 42, w: 168, h: 84, icon: Sparkles, accent: '#0891b2' },
  { id: 'cost_governor', label: 'COST GOVERNOR', sub: 'Graceful containment', x: 540, y: 330, w: 168, h: 84, icon: ShieldCheck, accent: '#059669' },
  { id: 'pqc_auditor', label: 'PQC AUDIT', sub: 'ML-DSA-44', x: 790, y: 330, w: 160, h: 84, icon: Sparkles, accent: '#7c3aed' },
  { id: 'outcome', label: 'OUTCOME', sub: 'Contained / breached', x: 790, y: 186, w: 160, h: 84, icon: ShieldCheck, accent: '#0f172a' },
  { id: 'exposure_meter', label: 'EXPOSURE', sub: 'Aggregate spend', x: 790, y: 44, w: 160, h: 84, icon: Scale, accent: '#d97706' },
];

const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]));

// Aliases so backend node names always resolve to a drawn node.
const ALIAS: Record<string, string> = {
  rails: 'card_token',
  rail_authorizer: 'dtl',
  quarantine: 'cost_governor',
  explanation_panel: 'ml_detector',
  policy: 'cost_governor',
  audit_panel: 'pqc_auditor',
  red_agent: 'red_agent',
};

function resolve(id: string | null | undefined): NodeDef | null {
  if (!id) return null;
  const key = ALIAS[id] ?? id;
  return NODE_BY_ID[key] ?? null;
}

function center(n: NodeDef) {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

/** Curved path between two nodes, bowed so parallel edges stay distinguishable. */
function edgePath(a: NodeDef, b: NodeDef): string {
  const p1 = center(a);
  const p2 = center(b);
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const mx = p1.x + dx / 2;
  const my = p1.y + dy / 2 - Math.min(60, Math.abs(dx) * 0.16);
  return `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`;
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: '#e11d48',
  warning: '#d97706',
  success: '#059669',
  info: '#2563eb',
};

export function AttackFlowCanvas({ onNodeClick }: { onNodeClick?: (nodeId: string) => void }) {
  const { events, latest, activeEdge, exposure, ceiling, railTotals, currentStep, totalSteps, strategy } =
    useArena();

  const from = resolve(activeEdge?.source);
  const to = resolve(activeEdge?.target);
  const color = SEVERITY_COLOR[activeEdge?.severity ?? 'info'] ?? '#2563eb';

  // Which rails have already been touched this round, so we can dim the rest.
  const touchedRails = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.event_type === 'RAIL_APPROVED' || e.event_type === 'RAIL_REQUEST') {
        const p = e.payload?.rail;
        if (p) set.add(p.toLowerCase());
      }
    }
    return set;
  }, [events]);

  const railAmount: Record<string, number> = {
    card_token: railTotals.CARD_TOKEN ?? 0,
    upi_circle: railTotals.UPI_CIRCLE ?? 0,
    agentic_ap2: railTotals.AGENTIC_AP2 ?? 0,
  };

  const breached = ceiling > 0 && exposure > ceiling;
  const utilization = ceiling > 0 ? Math.min(100, (exposure / ceiling) * 100) : 0;

  const pathD = from && to && from.id !== to.id ? edgePath(from, to) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div>
          <h2 className="text-[13px] font-bold uppercase tracking-wide text-slate-800">
            Live Attack Flow
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {strategy
              ? `${strategy.replace(/_/g, ' ')}, step ${currentStep}${totalSteps ? ` of ${totalSteps}` : ''}`
              : 'Idle. Launch a round to stream live backend events'}
            {onNodeClick && <span className="ml-1.5 text-slate-400">· click any box to explain it</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold">
          <Legend color="#e11d48" label="Attack action" />
          <Legend color="#2563eb" label="Rail / data" />
          <Legend color="#d97706" label="Aggregation" />
          <Legend color="#059669" label="Defense" />
        </div>
      </div>

      <div className="relative w-full overflow-x-auto bg-[radial-gradient(circle_at_1px_1px,#e2e8f0_1px,transparent_0)] [background-size:22px_22px]">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[900px]">
          <defs>
            <marker id="arrowhead" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto">
              <polygon points="0 0, 9 3.5, 0 7" fill={color} />
            </marker>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* static skeleton so the topology is readable while idle */}
          {[
            ['principal', 'dtl'],
            ['red_agent', 'card_token'],
            ['red_agent', 'upi_circle'],
            ['red_agent', 'agentic_ap2'],
            ['card_token', 'dtl'],
            ['upi_circle', 'dtl'],
            ['agentic_ap2', 'dtl'],
            ['dtl', 'ml_detector'],
            ['dtl', 'cost_governor'],
            ['dtl', 'exposure_meter'],
            ['cost_governor', 'outcome'],
            ['cost_governor', 'pqc_auditor'],
          ].map(([a, b]) => {
            const na = NODE_BY_ID[a];
            const nb = NODE_BY_ID[b];
            if (!na || !nb) return null;
            return (
              <path
                key={`${a}-${b}`}
                d={edgePath(na, nb)}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={2}
                strokeDasharray="5 6"
              />
            );
          })}

          {/* the live edge: drawn only when the backend says something moved */}
          <AnimatePresence mode="wait">
            {pathD && (
              <motion.g key={(activeEdge as any)?.eventId ?? 'edge'}>
                <motion.path
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={3.2}
                  markerEnd="url(#arrowhead)"
                  filter="url(#glow)"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
                {/* travelling pulse along the same path */}
                <motion.circle
                  r={5.5}
                  fill={color}
                  filter="url(#glow)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.1, ease: 'easeInOut' }}
                >
                  <animateMotion dur="1.1s" repeatCount="indefinite" path={pathD} />
                </motion.circle>
              </motion.g>
            )}
          </AnimatePresence>

          {/* nodes */}
          {NODES.map((node) => {
            const isRail = ['card_token', 'upi_circle', 'agentic_ap2'].includes(node.id);
            const touched = touchedRails.has(node.id);
            const isActive = from?.id === node.id || to?.id === node.id;
            const amount = railAmount[node.id];

            return (
              <g
                key={node.id}
                role={onNodeClick ? 'button' : undefined}
                tabIndex={onNodeClick ? 0 : undefined}
                aria-label={onNodeClick ? `Explain ${node.label}` : undefined}
                onClick={() => onNodeClick?.(node.id)}
                onKeyDown={(e) => {
                  if (onNodeClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onNodeClick(node.id);
                  }
                }}
                style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
              >
                <motion.rect
                  x={node.x}
                  y={node.y}
                  width={node.w}
                  height={node.h}
                  rx={14}
                  fill="#ffffff"
                  stroke={isActive ? node.accent : isRail && touched ? node.accent : '#e2e8f0'}
                  strokeWidth={isActive ? 3 : isRail && touched ? 2 : 1.5}
                  whileHover={onNodeClick ? { scale: 1.03 } : undefined}
                  animate={
                    isActive
                      ? { scale: [1, 1.025, 1], filter: 'drop-shadow(0 6px 18px rgba(15,23,42,0.13))' }
                      : { scale: 1, filter: 'drop-shadow(0 1px 3px rgba(15,23,42,0.06))' }
                  }
                  transition={{ duration: 0.45 }}
                  style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
                />
                <text x={node.x + 14} y={node.y + 26} className="fill-slate-900 text-[12px] font-bold">
                  {node.label}
                </text>
                {node.sub && (
                  <text x={node.x + 14} y={node.y + 43} className="fill-slate-500 text-[10px]">
                    {node.sub}
                  </text>
                )}
                {isRail && (
                  <>
                    <text
                      x={node.x + 14}
                      y={node.y + 72}
                      className="text-[15px] font-bold"
                      fill={touched ? node.accent : '#cbd5e1'}
                    >
                      {touched ? inr(amount) : '₹0'}
                    </text>
                    {touched && (
                      <text x={node.x + node.w - 14} y={node.y + 72} textAnchor="end" className="fill-emerald-600 text-[9px] font-bold">
                        LOCALLY OK
                      </text>
                    )}
                  </>
                )}
                {node.id === 'exposure_meter' && (
                  <>
                    <text
                      x={node.x + 14}
                      y={node.y + 66}
                      className="text-[14px] font-bold"
                      fill={breached ? '#e11d48' : '#0f172a'}
                    >
                      {inr(exposure)}
                    </text>
                    <rect x={node.x + 14} y={node.y + 72} width={node.w - 28} height={6} rx={3} fill="#e2e8f0" />
                    <motion.rect
                      x={node.x + 14}
                      y={node.y + 72}
                      height={6}
                      rx={3}
                      fill={breached ? '#e11d48' : utilization > 80 ? '#d97706' : '#059669'}
                      width={Math.max(0, ((node.w - 28) * utilization) / 100)}
                      initial={false}
                      animate={{ width: Math.max(0, ((node.w - 28) * utilization) / 100) }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </>
                )}
                {node.id === 'dtl' && (
                  <text
                    x={node.x + 14}
                    y={node.y + 88}
                    className="text-[11px] font-bold"
                    fill={breached ? '#e11d48' : '#475569'}
                  >
                    {inr(exposure)} / {inr(ceiling)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* the arrow's caption: what the attacker/defender is doing right now */}
        <AnimatePresence mode="wait">
          {activeEdge?.label && (
            <motion.div
              key={(activeEdge as any)?.eventId}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-6"
            >
              <div
                className="max-w-[90%] rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-wide shadow-sm backdrop-blur"
                style={{
                  borderColor: color,
                  color,
                  backgroundColor: `${color}12`,
                }}
              >
                {activeEdge.label}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-500">
      <span className="h-0.5 w-5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
