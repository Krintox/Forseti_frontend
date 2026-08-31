'use client';

import React, { useState } from 'react';
import { CheckCircle2, ShieldAlert, XCircle } from 'lucide-react';
import { Badge, Button, Card, InfoNote, PageHeader } from '../components/ui';
import { useArtifact } from '../lib/useArtifact';
import { api } from '../lib/api';

export default function QuantumAuditPage() {
  const { data, loading, reload } = useArtifact(() => api.pqcStatus(), []);
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [tampered, setTampered] = useState<any>(null);

  const provider = data?.provider;
  const snapshot = data?.latest_snapshot;
  const tamper = data?.tamper_verification_results;
  const available = Boolean(provider?.available);

  const verifyAsIs = async () => {
    if (!snapshot) return;
    setVerifyResult(await api.pqcVerify(snapshot.snapshot_payload, snapshot.signature_hex));
  };

  const verifyTampered = async () => {
    if (!snapshot) return;
    const mutated = { ...snapshot.snapshot_payload, total_exposure: (snapshot.snapshot_payload.total_exposure ?? 0) + 5000 };
    setTampered(await api.pqcVerify(mutated, snapshot.signature_hex));
  };

  if (loading) return <p className="text-xs text-slate-400">Loading PQC status…</p>;

  return (
    <>
      <PageHeader
        title="Quantum Audit"
        description="DTL state snapshots are canonicalised and signed with NIST FIPS 204 ML-DSA-44. The status below reflects a real signature verification; if no genuine implementation were installed this page would read PQC MODULE UNAVAILABLE instead."
      >
        <Badge tone={available ? 'green' : 'amber'}>
          {available ? provider?.algorithm : 'PQC MODULE UNAVAILABLE'}
        </Badge>
        <Button variant="ghost" size="sm" onClick={reload}>
          Refresh
        </Button>
      </PageHeader>

      {!available ? (
        <Card title="Post-quantum module unavailable">
          <p className="text-xs text-slate-700">{provider?.unavailable_reason}</p>
          <p className="mt-2 text-[11px] text-slate-500">
            No signature is produced and no verified status is claimed. Install a FIPS 204
            implementation (<code className="font-mono">pip install dilithium-py</code>) and reload.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card title="Provider" subtitle="Which implementation is signing">
              <dl className="space-y-1.5 text-xs">
                <Row label="Algorithm" value={provider?.algorithm} />
                <Row label="Standard" value="NIST FIPS 204" />
                <Row label="Backend" value={`${provider?.backend} ${provider?.backend_version ?? ''}`} />
                <Row label="Security category" value={provider?.security_category} />
                <Row label="Public key" value={`${provider?.public_key_bytes} bytes`} />
                <Row label="Secret key" value={`${provider?.private_key_bytes} bytes`} />
                <Row label="Signature" value={`${provider?.signature_bytes} bytes`} />
                <Row label="Key fingerprint" value={provider?.public_key_fingerprint} />
              </dl>
              <div className="mt-3">
                <InfoNote>
                  ML-DSA is the standardised successor to CRYSTALS-Dilithium. This is a prototype
                  audit-signing implementation with ephemeral development keys, not an HSM or a
                  production key-management system.
                </InfoNote>
              </div>
            </Card>

            <Card
              title="Signed DTL snapshot"
              subtitle="The canonical state that was signed"
              className="lg:col-span-2"
            >
              <pre className="max-h-56 overflow-auto rounded-xl bg-slate-900 p-3 font-mono text-[10px] leading-relaxed text-emerald-300">
                {JSON.stringify(snapshot?.snapshot_payload, null, 2)}
              </pre>
              <dl className="mt-3 space-y-1.5 text-xs">
                <Row label="Canonical SHA-256" value={<span className="break-all">{snapshot?.canonical_state_hash}</span>} />
                <Row
                  label="Signature (first 64 hex)"
                  value={<span className="break-all">{snapshot?.signature_hex?.slice(0, 64)}…</span>}
                />
                <Row label="Signature length" value={`${snapshot?.signature_bytes_len} bytes`} />
                <Row
                  label="Status"
                  value={
                    <span className={snapshot?.is_cryptographically_valid ? 'text-emerald-600' : 'text-rose-600'}>
                      {snapshot?.verification_status}
                    </span>
                  }
                />
              </dl>
            </Card>
          </div>

          <Card
            title="Tamper-detection proof"
            subtitle="Four cases executed live against the real verifier"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <TamperCase
                label="Untouched snapshot"
                expectation="must verify"
                pass={Boolean(tamper?.valid_verification)}
              />
              <TamperCase
                label="Exposure amount mutated"
                expectation="must fail"
                pass={Boolean(tamper?.tampered_payload_rejected)}
              />
              <TamperCase
                label="One signature byte flipped"
                expectation="must fail"
                pass={Boolean(tamper?.tampered_signature_rejected)}
              />
              <TamperCase
                label="Verified under a different key"
                expectation="must fail"
                pass={Boolean(tamper?.wrong_public_key_rejected)}
              />
            </div>
            <p
              className={`mt-4 rounded-lg px-3 py-2 text-xs font-bold ${
                tamper?.all_tamper_tests_passed
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-rose-50 text-rose-800'
              }`}
            >
              {tamper?.all_tamper_tests_passed
                ? 'All four cryptographic integrity cases behaved correctly.'
                : 'One or more integrity cases did not behave as required.'}
            </p>
          </Card>

          <Card title="Verify it yourself" subtitle="Calls POST /api/pqc/verify against the live key">
            <div className="flex flex-wrap gap-2">
              <Button variant="success" onClick={verifyAsIs}>
                Verify authentic snapshot
              </Button>
              <Button variant="danger" onClick={verifyTampered}>
                Verify with ₹5,000 added
              </Button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {verifyResult && (
                <ResultBox title="Authentic snapshot" result={verifyResult} expectValid />
              )}
              {tampered && <ResultBox title="Mutated snapshot" result={tampered} />}
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function TamperCase({ label, expectation, pass }: { label: string; expectation: string; pass: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        pass ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
      }`}
    >
      <div className="flex items-start gap-2">
        {pass ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
        )}
        <div>
          <p className="text-[11px] font-bold text-slate-800">{label}</p>
          <p className="mt-0.5 text-[10px] text-slate-600">{expectation}</p>
          <p className={`mt-1 text-[10px] font-bold ${pass ? 'text-emerald-700' : 'text-rose-700'}`}>
            {pass ? 'BEHAVED CORRECTLY' : 'UNEXPECTED'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultBox({ title, result, expectValid }: { title: string; result: any; expectValid?: boolean }) {
  const valid = Boolean(result?.is_signature_valid);
  const asExpected = expectValid ? valid : !valid;
  return (
    <div
      className={`rounded-xl border p-3 ${
        asExpected ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'
      }`}
    >
      <p className="text-[11px] font-bold text-slate-800">{title}</p>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold">
        {valid ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
        ) : (
          <ShieldAlert className="h-3.5 w-3.5 text-rose-600" />
        )}
        {result?.verification_status}
      </p>
      <p className="mt-1 font-mono text-[10px] text-slate-500">
        {result?.algorithm} · {result?.backend}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1 last:border-0">
      <dt className="shrink-0 text-slate-500">{label}</dt>
      <dd className="text-right font-mono font-semibold text-slate-800">{value ?? '-'}</dd>
    </div>
  );
}
