'use client';

import React, { useState } from 'react';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { Badge, Button, Card, InfoNote, PageHeader, Stat } from '../components/ui';
import { useArtifact } from '../lib/useArtifact';
import { API_BASE, api, inr, num } from '../lib/api';

/**
 * AI Studio: every agent is runnable here against live state.
 *
 * Each result shows which provider answered and whether it is model output, a
 * deterministic fallback, or an honest failure, so nothing on this page can be
 * mistaken for an enforced decision.
 */

async function callAgent(path: string, body?: any) {
  const res = await fetch(`${API_BASE}/api/ai/${path}`, {
    method: body === undefined ? 'POST' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  return res.json();
}

export default function AiStudioPage() {
  const { data: status, loading } = useArtifact(() => api.aiStatus(), []);

  if (loading) return <p className="text-xs text-slate-400">Loading AI layer…</p>;

  const llm = status?.llm;
  const agents = status?.agents ?? [];

  return (
    <>
      <PageHeader
        title="AI Studio"
        description="The invention is the delegation-authority engine, not this page. These twelve agents are the intelligence layer around it: the LLM explains, translates and proposes, and the deterministic engine still decides every outcome."
      >
        <Badge tone={llm?.available ? 'green' : 'amber'}>
          {llm?.available ? `${llm.keys_live}/${llm.keys_configured} keys live` : 'LLM unavailable'}
        </Badge>
      </PageHeader>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Agents" value={status?.agent_count ?? '-'} hint="each solves a named production problem" />
        <Stat label="Providers" value={llm?.providers_configured ?? 0} hint="fallback chain, tier ordered" />
        <Stat label="API keys" value={llm?.keys_configured ?? 0} hint={`${llm?.keys_live ?? 0} still live`} />
        <Stat
          label="Last provider"
          value={<span className="text-sm">{llm?.last_provider_used ?? 'none yet'}</span>}
          hint="whichever answered most recently"
        />
      </div>

      <InfoNote>{status?.design_rule}</InfoNote>

      {status?.hierarchy && <SystemHierarchy hierarchy={status.hierarchy} />}

      <div className="grid gap-5 lg:grid-cols-2">
        <IntentCompiler />
        <CartAuditor />
        <MerchantProfiler />
        <LogCopilot />
        <RedStrategist />
        <Counterfactual />
        <IncidentReport />
        <PolicyAdvisor />
        <CustomerNotice />
        <RegulatoryMapper />
        <ModelCard />
      </div>

      <Card title="Agent catalog" subtitle="What each one exists to solve">
        <div className="grid gap-2 md:grid-cols-2">
          {agents.map((a: any) => (
            <div key={a.id} className="rounded-xl border border-slate-200 p-3">
              <p className="text-[12px] font-bold text-slate-900">{a.name}</p>
              <p className="mt-1 text-[11px] leading-snug text-rose-700">
                <span className="font-semibold">Problem: </span>{a.problem}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-emerald-800">
                <span className="font-semibold">Solves: </span>{a.solves}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

/** Shared runner: button, spinner, status badge, provenance footer. */
function AgentCard({
  title,
  subtitle,
  action,
  children,
  run,
  result,
  busy,
}: {
  title: string;
  subtitle: string;
  action: string;
  children?: React.ReactNode;
  run: () => void;
  result: any;
  busy: boolean;
}) {
  const status = result?.status;
  const tone =
    status === 'OK' ? 'green' : status === 'FALLBACK' ? 'amber' : status ? 'red' : 'slate';
  return (
    <Card
      title={title}
      subtitle={subtitle}
      right={status ? <Badge tone={tone as any}>{status}</Badge> : null}
    >
      {children}
      <Button onClick={run} disabled={busy} className="mt-3">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {busy ? 'Working' : action}
      </Button>

      {result && (
        <div className="mt-3 space-y-2">
          {result.reason && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
              {result.reason}
            </p>
          )}
          {result.result && <ResultBody agent={result.agent} data={result.result} extra={result} />}
          {/* The incident report's deterministic_appendix is attached to the
              envelope UNCONDITIONALLY (see backend/app/ai/agents.py) so its
              facts survive even when no LLM answered - but ResultBody only
              renders when result.result is truthy, which hides it exactly in
              that case unless it's also rendered here as a fallback. */}
          {!result.result && result.deterministic_appendix && (
            <DeterministicAppendixBlock data={result.deterministic_appendix} />
          )}
          <p className="font-mono text-[9.5px] text-slate-400">
            {result.llm
              ? `${result.llm.provider} / ${result.llm.model} · ${result.llm.latency_ms}ms${result.llm.cached ? ' · cached' : ''}`
              : 'no model call'}
            {' · advisory only'}
          </p>
        </div>
      )}
    </Card>
  );
}

/** Incident report facts sourced directly from the round result, never the model - present even when LLM_UNAVAILABLE. */
function DeterministicAppendixBlock({ data }: { data: any }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
      <p className="text-[9.5px] font-bold uppercase text-slate-500">
        Cross-module facts (not from the model)
      </p>
      <dl className="mt-1 space-y-0.5">
        <KV k="Kill-chain stage" v={data.kill_chain_stage ?? '-'} />
        <KV k="Attack chain score" v={num(data.attack_chain_score, 2)} />
        <KV
          k="Intent Firewall hard-drift"
          v={`${data.intent_firewall_hard_drift_count} (${
            data.intent_firewall_violating_dimensions.join(', ') || 'none'
          })`}
        />
        <KV
          k="Deception Lab detections"
          v={`${data.deception_lab_detection_count} (${data.deception_lab_types.join(', ') || 'none'})`}
        />
      </dl>
    </div>
  );
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1 last:border-0">
      <dt className="text-[11px] text-slate-500">{k}</dt>
      <dd className="text-right font-mono text-[11px] font-semibold text-slate-800">{v}</dd>
    </div>
  );
}

/** Renders each agent's distinct result shape. */
function ResultBody({ agent, data, extra }: { agent: string; data: any; extra?: any }) {
  if (agent === 'intent_compiler') {
    return (
      <dl className="space-y-1">
        <KV k="Ceiling" v={inr(data.ceiling_inr)} />
        <KV k="Per-transaction cap" v={inr(data.per_transaction_cap_inr)} />
        <KV k="Window" v={`${data.window_hours}h`} />
        <KV k="Permitted MCCs" v={data.permitted_mccs.join(', ')} />
        <KV k="Exclusions" v={data.semantic_exclusions.join(', ') || 'none'} />
        <KV k="Confidence" v={num(data.confidence, 2)} />
        <p className="pt-2 text-[11px] italic text-slate-600">{data.economic_purpose}</p>
        {data.ambiguities?.length > 0 && (
          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase text-amber-800">Ambiguities resolved</p>
            <ul className="mt-1 list-disc pl-4 text-[11px] text-amber-900">
              {data.ambiguities.map((a: string, i: number) => <li key={i}>{a}</li>)}
            </ul>
          </div>
        )}
      </dl>
    );
  }

  if (agent === 'cart_auditor') {
    return (
      <dl className="space-y-1">
        <KV k="Verdict" v={<span className={data.verdict === 'WITHIN_PURPOSE' ? 'text-emerald-600' : 'text-rose-600'}>{data.verdict}</span>} />
        <KV k="Drift score" v={num(data.drift_score, 3)} />
        <KV k="Legitimate value" v={inr(data.legitimate_value_inr)} />
        <KV k="Suspicious value" v={<span className="text-rose-600">{inr(data.suspicious_value_inr)}</span>} />
        <p className="pt-2 text-[11px] leading-relaxed text-slate-700">{data.reasoning}</p>
      </dl>
    );
  }

  if (agent === 'merchant_profiler') {
    return (
      <dl className="space-y-1">
        <KV k="Declared" v={data.declared_category} />
        <KV k="Inferred" v={data.inferred_category} />
        <KV k="Mismatch" v={<span className={data.mismatch ? 'text-rose-600' : 'text-emerald-600'}>{String(data.mismatch)}</span>} />
        <KV k="Stored-value exposure" v={data.stored_value_exposure} />
        <KV k="Risk score" v={num(data.risk_score, 2)} />
        <KV k="Suggested MCC" v={data.suggested_mcc} />
        <KV k="Action" v={<span className="font-bold">{data.recommended_action}</span>} />
        <p className="pt-2 text-[11px] leading-relaxed text-slate-700">{data.reasoning}</p>
      </dl>
    );
  }

  if (agent === 'log_copilot') {
    return (
      <div>
        <p className="text-[11px] text-slate-700">{data.explanation}</p>
        <p className="mt-1 font-mono text-[10px] text-slate-500">
          matched {extra?.match_count ?? 0} of {extra?.searched ?? 0} events
        </p>
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto">
          {(extra?.matched_events ?? []).map((e: any) => (
            <li key={e.sequence} className="rounded border border-slate-100 bg-slate-50 px-2 py-1 text-[10.5px]">
              <span className="font-mono font-bold text-slate-700">{e.event_type}</span>
              <span className="ml-2 text-slate-600">{e.arrow_label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (agent === 'red_strategist') {
    return (
      <dl className="space-y-1">
        <KV k="Strategy" v={data.strategy} />
        <KV k="Legs" v={data.leg_amounts_inr.map((x: number) => inr(x)).join(' + ')} />
        <KV k="Total" v={inr(data.total_inr)} />
        <KV k="Rails" v={data.rails.join(', ')} />
        <KV k="Merchant" v={`${data.merchant_mcc} (${data.merchant_category})`} />
        <KV k="Confidence" v={num(data.confidence, 2)} />
        <p className="pt-2 text-[11px] leading-relaxed text-slate-700">
          <span className="font-semibold">Hypothesis: </span>{data.hypothesis}
        </p>
        <p className="text-[11px] leading-relaxed text-slate-700">{data.why_this_evades}</p>
        <p className="mt-1 text-[10px] italic text-slate-500">{data.sandbox_note}</p>
      </dl>
    );
  }

  if (agent === 'counterfactual_analyst') {
    return (
      <div>
        <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12px] font-semibold text-blue-900">
          {extra?.answer}
        </p>
        <table className="mt-2 w-full text-[11px]">
          <thead>
            <tr className="text-left text-[9.5px] uppercase text-slate-500">
              <th className="pb-1">Dimension</th><th className="pb-1">Parameter tested</th>
              <th className="pb-1">Outcome</th><th className="pb-1">Final exposure</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(extra?.simulated_outcomes ?? []).map((r: any, i: number) => (
              <tr key={i}>
                <td className="py-1 font-mono text-slate-500">{r.dimension}</td>
                <td className="py-1">
                  {r.dimension === 'AMOUNT' ? inr(r.ceiling_inr) : r.parameter_summary}
                </td>
                <td className={`py-1 font-bold ${r.contained ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {r.contained ? 'CONTAINED' : 'BREACHED'}
                </td>
                <td className="py-1 font-mono">{inr(r.final_exposure_inr)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[10px] italic text-slate-500">{extra?.method}</p>
      </div>
    );
  }

  if (agent === 'incident_report') {
    return (
      <div className="space-y-2">
        <p className="text-[12px] font-bold text-slate-900">{data.title}</p>
        <Badge tone={data.severity === 'CRITICAL' ? 'red' : 'amber'}>{data.severity}</Badge>
        <p className="text-[11px] leading-relaxed text-slate-700">{data.executive_summary}</p>
        <KV k="Exposure" v={inr(data.financial_exposure_inr)} />
        <div>
          <p className="text-[10px] font-bold uppercase text-emerald-700">Controls that fired</p>
          <ul className="list-disc pl-4 text-[11px] text-slate-700">
            {data.controls_that_fired.map((c: string, i: number) => <li key={i}>{c}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-600">Recommended actions</p>
          <ul className="list-disc pl-4 text-[11px] text-slate-700">
            {data.recommended_actions.map((c: string, i: number) => <li key={i}>{c}</li>)}
          </ul>
        </div>
        <p className="text-[10px] italic text-slate-500">{data.evidence_integrity}</p>
        {extra?.deterministic_appendix && <DeterministicAppendixBlock data={extra.deterministic_appendix} />}
      </div>
    );
  }

  if (agent === 'policy_advisor') {
    return (
      <div className="space-y-2">
        {data.recommended_changes.map((c: any, i: number) => (
          <div key={i} className="rounded-lg border border-slate-200 p-2">
            <p className="font-mono text-[11px] font-bold text-slate-800">
              {c.parameter}: {String(c.from)} → {String(c.to)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-600">{c.rationale}</p>
            <p className="mt-0.5 text-[10px] text-amber-700">
              False-positive impact: {c.expected_false_positive_impact}
            </p>
          </div>
        ))}
        <p className="text-[11px] text-slate-700">{data.legitimate_traffic_risk}</p>
        <p className="text-[10px] italic text-slate-500">{data.note}</p>
      </div>
    );
  }

  if (agent === 'customer_notice') {
    return (
      <div className="space-y-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
          <p className="text-[9.5px] font-bold uppercase text-slate-500">SMS</p>
          <p className="text-[11px] text-slate-800">{data.sms}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-2">
          <p className="text-[9.5px] font-bold uppercase text-blue-700">In-app</p>
          <p className="text-[11px] font-bold text-slate-900">{data.app_notification.title}</p>
          <p className="text-[11px] text-slate-700">{data.app_notification.body}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-2">
          <p className="text-[9.5px] font-bold uppercase text-slate-500">Email, {data.email_subject}</p>
          <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-slate-700">{data.email_body}</p>
        </div>
      </div>
    );
  }

  if (agent === 'regulatory_mapper') {
    return (
      <div className="space-y-2">
        {data.mappings.map((m: any, i: number) => (
          <div key={i} className="rounded-lg border border-slate-200 p-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold text-slate-900">{m.framework}</p>
              <Badge tone={m.relevance === 'DIRECT' ? 'green' : 'slate'}>{m.relevance}</Badge>
            </div>
            <p className="mt-1 text-[11px] text-slate-700">{m.obligation}</p>
            <p className="mt-0.5 text-[11px] text-slate-600">{m.how_this_control_helps}</p>
            {m.clause_reference && (
              <p className="mt-0.5 font-mono text-[10px] text-slate-500">{m.clause_reference}</p>
            )}
          </div>
        ))}
        <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-[10px] text-amber-900">
          {data.verification_note}
        </p>
      </div>
    );
  }

  if (agent === 'model_card') {
    return (
      <div className="space-y-2 text-[11px] text-slate-700">
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-semibold text-rose-900">
          {data.headline_caveat}
        </p>
        <p><span className="font-bold">Intended use: </span>{data.intended_use}</p>
        <p><span className="font-bold">Evaluation: </span>{data.evaluation_summary}</p>
        <div>
          <p className="text-[10px] font-bold uppercase text-slate-600">Known weaknesses</p>
          <ul className="list-disc pl-4">
            {data.known_weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      </div>
    );
  }

  return <pre className="max-h-56 overflow-auto rounded-lg bg-slate-900 p-2 font-mono text-[10px] text-emerald-300">
    {JSON.stringify(data, null, 2)}
  </pre>;
}

// ---------------------------------------------------------------- agents

function IntentCompiler() {
  const [text, setText] = useState(
    'My assistant can buy weekly groceries and household basics, up to 10000 rupees a week. No gift cards or anything resellable.',
  );
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setR(await callAgent('intent/compile', { instruction: text })); } finally { setBusy(false); }
  };
  return (
    <AgentCard
      title="1 · Intent Compiler"
      subtitle="Natural-language authority → enforceable policy"
      action="Compile policy"
      run={run} result={r} busy={busy}
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[11px] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </AgentCard>
  );
}

function CartAuditor() {
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      setR(await callAgent('cart/audit', {
        intent_summary: 'Household groceries within the delegated budget',
        merchant_mcc: '5411',
        merchant_name: 'Gourmet Mega Store & Vouchers',
        items: [
          { name: 'Organic Milk 2L', category: 'GROCERY', unit_price: 220, quantity: 1 },
          { name: 'Atta 10kg', category: 'GROCERY', unit_price: 480, quantity: 1 },
          { name: 'Amazon Pay Gift Card', category: 'GIFT_CARD', unit_price: 7800, quantity: 1, is_stored_value: true },
        ],
      }));
    } finally { setBusy(false); }
  };
  return (
    <AgentCard
      title="2 · Semantic Cart Auditor"
      subtitle="Is this basket really groceries?"
      action="Audit cart"
      run={run} result={r} busy={busy}
    >
      <p className="text-[11px] text-slate-600">
        A compliant grocery MCC with ₹7,800 of gift cards in the basket, the exact shape of
        intent laundering.
      </p>
    </AgentCard>
  );
}

function MerchantProfiler() {
  const [name, setName] = useState('FreshMart Grocery & Voucher Hub');
  const [desc, setDesc] = useState(
    'Neighbourhood supermarket. Around 70% of revenue comes from prepaid gift cards, mobile top-ups and gaming vouchers.',
  );
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setR(await callAgent('merchant/profile', { name, description: desc, declared_mcc: '5411' })); }
    finally { setBusy(false); }
  };
  return (
    <AgentCard
      title="3 · Merchant Risk Profiler"
      subtitle="Does the declared category match the inventory?"
      action="Profile merchant"
      run={run} result={r} busy={busy}
    >
      <input
        value={name} onChange={(e) => setName(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] outline-none focus:border-blue-500"
      />
      <textarea
        value={desc} onChange={(e) => setDesc(e.target.value)} rows={2}
        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] outline-none focus:border-blue-500"
      />
    </AgentCard>
  );
}

function LogCopilot() {
  const [q, setQ] = useState('Show me every time a rail approved but the DTL objected');
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setR(await callAgent('log/query', { question: q })); } finally { setBusy(false); }
  };
  return (
    <AgentCard
      title="4 · Log Copilot"
      subtitle="Plain English → a filter the engine runs"
      action="Search the log"
      run={run} result={r} busy={busy}
    >
      <input
        value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && run()}
        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] outline-none focus:border-blue-500"
      />
    </AgentCard>
  );
}

function RedStrategist() {
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setR(await callAgent('red/propose')); } finally { setBusy(false); }
  };
  return (
    <AgentCard
      title="5 · Adversarial Strategist"
      subtitle="Proposes an attack the authors never wrote"
      action="Propose attack"
      run={run} result={r} busy={busy}
    >
      <p className="text-[11px] text-slate-600">
        Reads what the defence has already caught, then proposes parameters. The simulator, not
        the model, executes and judges them.
      </p>
    </AgentCard>
  );
}

function Counterfactual() {
  const [q, setQ] = useState('What delegated limit would have stopped this attack entirely?');
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setR(await callAgent('counterfactual', { question: q })); } finally { setBusy(false); }
  };
  return (
    <AgentCard
      title="6 · Counterfactual Analyst"
      subtitle="Model proposes, the simulator answers"
      action="Run what-if"
      run={run} result={r} busy={busy}
    >
      <input
        value={q} onChange={(e) => setQ(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-[11px] outline-none focus:border-blue-500"
      />
      <p className="mt-1 text-[10px] text-slate-500">
        Re-runs the last attack for real against each proposed ceiling.
      </p>
    </AgentCard>
  );
}

function IncidentReport() {
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setR(await callAgent('incident/report')); } finally { setBusy(false); }
  };
  return (
    <AgentCard
      title="7 · Incident Report Writer"
      subtitle="Regulator-ready draft from the real timeline"
      action="Draft report"
      run={run} result={r} busy={busy}
    >
      <p className="text-[11px] text-slate-600">Run an attack in the Live Arena first.</p>
    </AgentCard>
  );
}

function PolicyAdvisor() {
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setR(await callAgent('policy/advise')); } finally { setBusy(false); }
  };
  return (
    <AgentCard
      title="8 · Policy Advisor"
      subtitle="Smallest sufficient change, with its cost"
      action="Advise policy"
      run={run} result={r} busy={busy}
    >
      <p className="text-[11px] text-slate-600">
        Over-tightening blocks genuine customers. This states the trade-off instead of hiding it.
      </p>
    </AgentCard>
  );
}

function CustomerNotice() {
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { setR(await callAgent('customer/notice')); } finally { setBusy(false); }
  };
  return (
    <AgentCard
      title="9 · Customer Notice Writer"
      subtitle="What the cardholder actually receives"
      action="Write notice"
      run={run} result={r} busy={busy}
    >
      <p className="text-[11px] text-slate-600">
        A generic decline destroys trust in agentic payments faster than the fraud does.
      </p>
    </AgentCard>
  );
}

function RegulatoryMapper() {
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      setR(await callAgent('regulatory/map', {
        control: 'Cross-rail delegation authority invariant (DTL)',
        description:
          'Aggregates settled, authorized, pending and reserved spend for one delegated agent across card, UPI and agentic rails, and blocks any transaction that would take the total past the ceiling the customer granted.',
      }));
    } finally { setBusy(false); }
  };
  return (
    <AgentCard
      title="10 · Regulatory Mapper"
      subtitle="Which obligation does this control evidence?"
      action="Map obligations"
      run={run} result={r} busy={busy}
    >
      <p className="text-[11px] text-slate-600">
        A novel control has no commercial value until a bank can map it to a duty it already carries.
      </p>
    </AgentCard>
  );
}

function ModelCard() {
  const [r, setR] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/ai/model-card`);
      setR(await res.json());
    } finally { setBusy(false); }
  };
  return (
    <AgentCard
      title="11 · Model Card Generator"
      subtitle="Honest documentation from real artifacts"
      action="Generate model card"
      run={run} result={r} busy={busy}
    >
      <p className="text-[11px] text-slate-600">
        Refuses to emit a card with no stated weaknesses.
      </p>
    </AgentCard>
  );
}

/**
 * The architectural hierarchy, served by the backend.
 *
 * This exists to prevent the most likely misreading of this project: that it is
 * twelve loosely-related AI features. It is one invention - the multidimensional
 * delegation-authority engine - with an intelligence layer wrapped around it.
 */
function SystemHierarchy({ hierarchy }: { hierarchy: any }) {
  const core = hierarchy.core ?? [];
  const attack = core.filter((c: any) => c.layer === 'ATTACK');
  const defense = core.filter((c: any) => c.layer === 'DEFENSE');

  return (
    <Card
      title="What is actually the invention"
      subtitle="Read this before the agent list below"
    >
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
        <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">The invention</p>
        <p className="mt-1 text-sm font-bold text-slate-900">{hierarchy.invention?.name}</p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-slate-700">{hierarchy.invention?.claim}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
          <span className="font-semibold">Why it is novel: </span>
          {hierarchy.invention?.why_novel}
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <HierarchyColumn label="Attack" tone="red" items={attack} />
        <HierarchyColumn label="Defense" tone="green" items={defense} />
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center gap-2">
          <Badge tone="purple">Intelligence layer</Badge>
          <span className="text-[11px] font-bold text-slate-700">
            {hierarchy.intelligence_layer?.count} AI agents
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
          {hierarchy.intelligence_layer?.rule}
        </p>
        <ol className="mt-2 space-y-1">
          {(hierarchy.intelligence_layer?.lifecycle ?? []).map((step: string, i: number) => (
            <li key={i} className="font-mono text-[10px] leading-relaxed text-slate-500">
              {step}
            </li>
          ))}
        </ol>
      </div>

      <p className="mt-4 rounded-lg bg-slate-900 px-4 py-2.5 text-center font-mono text-[11px] font-bold text-emerald-300">
        {hierarchy.headline}
      </p>
    </Card>
  );
}

function HierarchyColumn({
  label,
  tone,
  items,
}: {
  label: string;
  tone: 'red' | 'green';
  items: any[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <Badge tone={tone}>{label}</Badge>
      <div className="mt-2 space-y-2">
        {items.map((c: any) => (
          <div key={c.component} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
            <p className="text-[11px] font-bold text-slate-900">{c.component}</p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-slate-600">{c.role}</p>
            <p className="mt-0.5 font-mono text-[9px] text-slate-400">{c.module}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
