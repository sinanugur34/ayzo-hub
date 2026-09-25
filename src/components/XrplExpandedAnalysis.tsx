"use client";

import type {
  XrplIntelligence,
} from "@/lib/intelligence/xrpl/engine";

function short(value: string | null) {
  if (!value) return "Unavailable";
  return value.length <= 22
    ? value
    : `${value.slice(0, 8)}...${value.slice(-8)}`;
}

function formatXrp(drops: string | null) {
  if (drops === null) return "Unavailable";
  try {
    const value = BigInt(drops);
    const whole = value / 1_000_000n;
    const fraction = (value % 1_000_000n)
      .toString()
      .padStart(6, "0")
      .replace(/0+$/, "");
    return fraction ? `${whole}.${fraction} XRP` : `${whole} XRP`;
  } catch {
    return `${drops} drops`;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
      <div className="text-[9px] tracking-[0.12em] text-zinc-700">
        {label.toUpperCase()}
      </div>
      <div className="mt-2 break-words text-sm font-medium text-zinc-200">
        {value}
      </div>
    </div>
  );
}

export default function XrplExpandedAnalysis({
  data,
}: {
  data: XrplIntelligence;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          MONEY FLOW INTELLIGENCE
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Incoming" value={String(data.derived.flow.incomingCount)} />
          <Stat label="Outgoing" value={String(data.derived.flow.outgoingCount)} />
          <Stat label="Native XRP payments" value={String(data.derived.flow.observedNativePaymentCount)} />
          <Stat label="Issued-asset payments" value={String(data.derived.flow.observedIssuedPaymentCount)} />
          <Stat label="Observed incoming XRP" value={formatXrp(data.derived.flow.incomingDrops)} />
          <Stat label="Observed outgoing XRP" value={formatXrp(data.derived.flow.outgoingDrops)} />
          <Stat label="Unique relationships" value={String(data.derived.flow.uniqueCounterpartyCount)} />
          <Stat label="Self-directed" value={String(data.derived.flow.selfCount)} />
        </div>
      </section>

      {data.firstObservedFunding && (
        <section className="rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.03] p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.16em] text-emerald-400">
            OBSERVED FUNDING EVIDENCE
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Source" value={short(data.firstObservedFunding.source)} />
            <Stat label="Amount" value={formatXrp(data.firstObservedFunding.amountDrops)} />
            <Stat
              label="Ledger"
              value={
                data.firstObservedFunding.ledgerIndex === null
                  ? "Unavailable"
                  : String(data.firstObservedFunding.ledgerIndex)
              }
            />
            <Stat
              label="Result"
              value={data.firstObservedFunding.result ?? "Unavailable"}
            />
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          COUNTERPARTY INTELLIGENCE
        </div>
        <div className="mt-5 space-y-2">
          {data.derived.counterparties.counterparties.slice(0, 12).map((counterparty) => (
            <div
              key={counterparty.address}
              className="grid gap-2 rounded-xl border border-zinc-900 bg-black/20 px-4 py-3 text-xs sm:grid-cols-4"
            >
              <div className="font-mono text-zinc-300">{short(counterparty.address)}</div>
              <div className="text-zinc-500">Incoming: {counterparty.incomingCount}</div>
              <div className="text-zinc-500">Outgoing: {counterparty.outgoingCount}</div>
              <div className="text-zinc-500">Trust lines: {counterparty.trustLineCount}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          TRUST LINES & ISSUED ASSETS
        </div>
        <div className="mt-5 space-y-2">
          {data.trustLines.slice(0, 15).map((line, index) => (
            <div
              key={`${line.counterparty}:${line.currency}:${index}`}
              className="grid gap-2 rounded-xl border border-zinc-900 bg-black/20 px-4 py-3 text-xs sm:grid-cols-4"
            >
              <div className="font-medium text-zinc-300">{line.currency}</div>
              <div className="font-mono text-zinc-500">{short(line.counterparty)}</div>
              <div className="text-zinc-500">Balance: {line.balance}</div>
              <div className="text-zinc-500">
                {line.freeze === true || line.freezePeer === true
                  ? "Freeze observed"
                  : "No freeze observed"}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          SIGNER / MULTISIG EVIDENCE
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat label="Signer lists" value={String(data.derived.signer.signerListCount)} />
          <Stat label="Signer entries" value={String(data.derived.signer.signerCount)} />
          <Stat
            label="Highest quorum"
            value={
              data.derived.signer.highestQuorum === null
                ? "Unavailable"
                : String(data.derived.signer.highestQuorum)
            }
          />
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          ACCOUNT OBJECTS
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(data.derived.accountObjects.byType).map(([type, count]) => (
            <Stat key={type} label={type} value={String(count)} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          XRP ANALYSIS DEPTH
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Plan" value={data.analysisPlan.toUpperCase()} />
          <Stat label="History limit" value={String(data.evidenceCoverage.historyLimit)} />
          <Stat label="Trust-line limit" value={String(data.evidenceCoverage.trustLineLimit)} />
          <Stat label="Account-object limit" value={String(data.evidenceCoverage.accountObjectLimit)} />
        </div>
        <p className="mt-5 text-xs leading-5 text-zinc-600">
          Evidence depth is intentionally bounded according to the current Free, Pro or Advanced analysis plan.
        </p>
      </section>
    </div>
  );
}
