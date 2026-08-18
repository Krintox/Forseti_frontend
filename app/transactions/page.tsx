'use client';

import React, { useMemo } from 'react';
import { Badge, Card, InfoNote, PageHeader, Stat } from '../components/ui';
import { useArena } from '../lib/ArenaProvider';
import { inr, num } from '../lib/api';

/**
 * Reconstructs a per-transaction view by joining the event stream on tx_id.
 * This makes the "each rail said yes, the aggregate said no" contradiction
 * visible in a single table.
 */
export default function TransactionMonitorPage() {
  const { events, lastRound } = useArena();

  const rows = useMemo(() => {
    const byTx: Record<string, any> = {};
    const order: string[] = [];

    for (const e of events) {
      const p = e.payload ?? {};
      const txId = p.tx_id;
      if (!txId) continue;
      if (!byTx[txId]) {
        byTx[txId] = { tx_id: txId, step: e.step };
        order.push(txId);
      }
      const row = byTx[txId];
      switch (e.event_type) {
        case 'ATTACK_STEP':
          row.rail = p.rail;
          row.amount = p.amount;
          row.merchant = p.merchant;
          row.mcc = p.mcc;
          break;
        case 'RAIL_APPROVED':
          row.local = 'APPROVED';
          break;
        case 'RAIL_DECLINED':
          row.local = 'DECLINED';
          break;
        case 'ML_SCORE':
          row.ml = p.model_loaded ? p.probability : null;
          row.mlLoaded = p.model_loaded;
          break;
        case 'PARTIAL_AUTH':
        case 'QUARANTINE':
          row.containment = p.detail;
          break;
        default:
          break;
      }
    }

    // Attach the invariant verdict from the step results of the last round.
    for (const sr of lastRound?.step_results ?? []) {
      const id = sr.tx?.tx_id;
      if (id && byTx[id]) {
        byTx[id].dtl = sr.dtl_defense_status;
        byTx[id].exposureAfter = sr.exposure_after;
        byTx[id].proof = sr.proof?.invariant_code ?? null;
      }
    }

    return order.map((id) => byTx[id]);
  }, [events, lastRound]);

  const approvedLocally = rows.filter((r) => r.local === 'APPROVED').length;
  const containedGlobally = rows.filter((r) => r.dtl === 'CONTAINED_BY_DTL').length;
  const totalValue = rows.reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Transaction Monitor"
        description="Live per-transaction view assembled from the backend event stream. The two verdict columns are the whole point: a rail can approve while the global authority check contains."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Transactions" value={rows.length} hint="this session" />
        <Stat label="Approved by rail" value={approvedLocally} tone="warning" hint="each looked legitimate locally" />
        <Stat label="Contained by DTL" value={containedGlobally} tone="success" hint="global authority violation" />
        <Stat label="Total value attempted" value={inr(totalValue)} />
      </div>

      <Card title="Transaction feed" subtitle="Local rail verdict vs global DTL verdict">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            No transactions yet. Launch an attack from the Live Arena.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="pb-2 font-bold">Tx</th>
                  <th className="pb-2 font-bold">Rail</th>
                  <th className="pb-2 font-bold">Amount</th>
                  <th className="pb-2 font-bold">Merchant</th>
                  <th className="pb-2 font-bold">MCC</th>
                  <th className="pb-2 font-bold">Rail verdict</th>
                  <th className="pb-2 font-bold">DTL verdict</th>
                  <th className="pb-2 font-bold">ML score</th>
                  <th className="pb-2 font-bold">Exposure after</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.tx_id}>
                    <td className="py-2 font-mono text-[10px] text-slate-500">{r.tx_id}</td>
                    <td className="py-2 font-semibold text-slate-700">
                      {String(r.rail ?? '').replace(/_/g, ' ')}
                    </td>
                    <td className="py-2 font-mono font-bold text-slate-900">{inr(r.amount)}</td>
                    <td className="py-2 text-slate-600">{r.merchant ?? '—'}</td>
                    <td className="py-2 font-mono text-slate-500">{r.mcc ?? '—'}</td>
                    <td className="py-2">
                      {r.local ? (
                        <Badge tone={r.local === 'APPROVED' ? 'amber' : 'slate'}>{r.local}</Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2">
                      {r.dtl ? (
                        <Badge tone={r.dtl === 'CONTAINED_BY_DTL' ? 'green' : 'slate'}>
                          {r.dtl === 'CONTAINED_BY_DTL' ? 'CONTAINED' : 'WITHIN AUTHORITY'}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 font-mono">
                      {r.mlLoaded === false ? (
                        <span className="text-amber-600">NOT TRAINED</span>
                      ) : r.ml !== undefined && r.ml !== null ? (
                        num(r.ml, 4)
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2 font-mono text-slate-600">{inr(r.exposureAfter)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4">
          <InfoNote>
            Rows showing <strong>APPROVED</strong> beside <strong>CONTAINED</strong> are the exact
            contradiction FORSETI exists to resolve — locally valid, globally unauthorised.
          </InfoNote>
        </div>
      </Card>
    </>
  );
}
