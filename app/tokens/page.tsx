'use client';

import React, { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, XCircle } from 'lucide-react';
import { Badge, Button, Card, InfoNote, PageHeader } from '../components/ui';
import { api, inr } from '../lib/api';
import type { PaymentToken, TokenScopeViolation } from '../lib/types';

const RAILS = ['CARD_TOKEN', 'UPI_CIRCLE', 'AGENTIC_AP2'];

const STATUS_TONE: Record<PaymentToken['status'], 'slate' | 'blue' | 'red' | 'green' | 'amber' | 'purple'> = {
  ISSUED: 'slate',
  ACTIVE: 'green',
  SCOPED: 'blue',
  USED: 'purple',
  REVOKED: 'red',
  EXPIRED: 'amber',
};

export default function TokensPage() {
  const [tokens, setTokens] = useState<PaymentToken[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scope, setScope] = useState('Household groceries and consumables');
  const [ceiling, setCeiling] = useState('4000');
  const [perTx, setPerTx] = useState('');
  const [validityHours, setValidityHours] = useState('24');
  const [rails, setRails] = useState<string[]>(RAILS);

  const [probeRail, setProbeRail] = useState('UPI_CIRCLE');
  const [probeAmount, setProbeAmount] = useState('1000');
  const [probeMcc, setProbeMcc] = useState('5411');
  const [probeResult, setProbeResult] = useState<{ status: string; ok: boolean; violation: TokenScopeViolation | null } | null>(null);

  const refresh = () => api.listTokens().then((r) => setTokens(r.tokens)).catch(() => {});

  useEffect(() => {
    refresh();
  }, []);

  const selectedToken = tokens.find((t) => t.token_id === selected) ?? null;

  async function handleIssue() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.issueToken({
        scope,
        amount_ceiling: ceiling ? Number(ceiling) : null,
        per_transaction_limit: perTx ? Number(perTx) : null,
        validity_hours: Number(validityHours) || 24,
        allowed_rails: rails.length ? rails : null,
      });
      setSelected(res.token.token_id);
      await refresh();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(tokenId: string) {
    setBusy(true);
    try {
      await api.revokeToken(tokenId);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleProbe() {
    if (!selectedToken) return;
    setBusy(true);
    setProbeResult(null);
    try {
      const res = await api.useToken(selectedToken.token_id, {
        rail: probeRail,
        amount: Number(probeAmount) || 0,
        merchant_mcc: probeMcc,
      });
      setProbeResult(res);
      await refresh();
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Payment Tokenization"
        description="A synthetic scoped-token model that demonstrates how tokenized payment credentials can inherit and enforce delegated authority, not an implementation of any real network's token vault."
      >
        <Badge tone="slate">TOKEN SCOPE → DTL AUTHORITY → PAYMENT ACTION</Badge>
      </PageHeader>

      <InfoNote>
        A token's scope is clamped to the live delegation at issuance, and every use is
        independently re-checked against the delegation&apos;s <em>current</em> state, a token minted
        while the grant was generous cannot outlive that grant being tightened or revoked. Try
        issuing a token, then narrowing the delegated authority on the{' '}
        <a href="/ledger" className="underline">Delegation Ledger</a> before testing a use.
      </InfoNote>

      {error && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card title="Issue a token" subtitle="Clamped to the live DTL delegation">
            <div className="space-y-3">
              <Field label="Scope description">
                <input
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Amount ceiling (₹)">
                  <input
                    type="number" min={0} value={ceiling} onChange={(e) => setCeiling(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </Field>
                <Field label="Per-tx limit (₹, optional)">
                  <input
                    type="number" min={0} value={perTx} onChange={(e) => setPerTx(e.target.value)}
                    placeholder="unconstrained"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </Field>
              </div>
              <Field label="Validity (hours)">
                <input
                  type="number" min={1} value={validityHours} onChange={(e) => setValidityHours(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </Field>
              <Field label="Allowed rails">
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {RAILS.map((r) => {
                    const on = rails.includes(r);
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRails(on ? rails.filter((x) => x !== r) : [...rails, r])}
                        className={`rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                          on ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        {r.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Button onClick={handleIssue} disabled={busy} className="w-full">
                {busy ? 'Issuing…' : 'Issue token'}
              </Button>
            </div>
          </Card>

          {selectedToken && (
            <Card title="Test a transaction" subtitle={`Against ${selectedToken.token_id}`}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Rail">
                    <select
                      value={probeRail}
                      onChange={(e) => setProbeRail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-blue-500"
                    >
                      {RAILS.map((r) => (
                        <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Amount (₹)">
                    <input
                      type="number" min={0} value={probeAmount} onChange={(e) => setProbeAmount(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-blue-500"
                    />
                  </Field>
                </div>
                <Field label="Merchant MCC">
                  <input
                    value={probeMcc} onChange={(e) => setProbeMcc(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-blue-500"
                  />
                </Field>
                <Button onClick={handleProbe} disabled={busy} variant="success" className="w-full">
                  {busy ? 'Checking…' : 'Attempt use'}
                </Button>

                {probeResult && (
                  probeResult.ok ? (
                    <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <p className="text-[11px] font-semibold text-emerald-800">
                        ALLOWED. Inside token scope and inside the live DTL authority.
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      <div>
                        <p className="text-[11px] font-black text-rose-800">{probeResult.violation?.violation_code}</p>
                        <p className="mt-1 text-[11px] leading-relaxed text-rose-700">{probeResult.violation?.explanation}</p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </Card>
          )}
        </div>

        <Card title="Tokens" subtitle={`${tokens.length} issued this session`}>
          {tokens.length === 0 ? (
            <p className="text-xs text-slate-400">No tokens issued yet.</p>
          ) : (
            <div className="space-y-2">
              {tokens.map((t) => (
                <div
                  key={t.token_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(t.token_id)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelected(t.token_id)}
                  className={`w-full cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    selected === t.token_id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-800">
                      <KeyRound className="h-3.5 w-3.5 text-slate-400" />
                      {t.token_id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                      {!['REVOKED', 'EXPIRED'].includes(t.status) && (
                        <span onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="danger" onClick={() => handleRevoke(t.token_id)}>
                            Revoke
                          </Button>
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-600">{t.scope}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
                    <MiniField label="Used / Ceiling" value={`${inr(t.cumulative_used)} / ${inr(t.amount_ceiling)}`} />
                    <MiniField label="Rails" value={t.allowed_rails.map((r) => r.split('_')[0]).join(', ')} />
                    <MiniField label="Uses" value={String(t.use_count)} />
                  </dl>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">
      <dt className="text-[8px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-mono text-[10px] font-bold text-slate-700">{value}</dd>
    </div>
  );
}
