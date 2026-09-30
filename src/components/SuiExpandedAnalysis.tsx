"use client";

import type {
  SuiIntelligence,
} from "@/lib/intelligence/sui/engine";

function formatMist(
  value:
    string
) {
  try {
    const mist =
      BigInt(
        value
      );

    const whole =
      mist /
      1_000_000_000n;

    const fraction =
      (
        mist %
        1_000_000_000n
      )
        .toString()
        .padStart(
          9,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return fraction
      ? `${whole}.${fraction} SUI`
      : `${whole} SUI`;
  } catch {
    return `${value} MIST`;
  }
}

function Stat({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
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

export default function SuiExpandedAnalysis({
  data,
}: {
  data:
    SuiIntelligence;
}) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          SUI ACCOUNT & OBJECT INTELLIGENCE
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="SUI balance"
            value={formatMist(
              data.account
                .suiBalanceMist
            )}
          />

          <Stat
            label="Coin balance types"
            value={String(
              data.derived
                .assets
                .positiveBalanceCount
            )}
          />

          <Stat
            label="Owned objects sampled"
            value={String(
              data.ownedObjects.length
            )}
          />

          <Stat
            label="Affected transactions"
            value={String(
              data.history
                .transactions
                .length
            )}
          />

          <Stat
            label="Incoming SUI"
            value={formatMist(
              data.derived
                .flow
                .incomingMist
            )}
          />

          <Stat
            label="Outgoing SUI"
            value={formatMist(
              data.derived
                .flow
                .outgoingMist
            )}
          />

          <Stat
            label="Relationship signals"
            value={String(
              data.derived
                .counterparties
                .count
            )}
          />

          <Stat
            label="Subject role"
            value={
              data.subjectObject
                .kind ??
              "account / unresolved"
            }
          />
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          OBJECT ACTIVITY
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Stat
            label="Objects touched"
            value={String(
              data.derived
                .objectActivity
                .touched
            )}
          />

          <Stat
            label="Objects created"
            value={String(
              data.derived
                .objectActivity
                .created
            )}
          />

          <Stat
            label="Objects deleted"
            value={String(
              data.derived
                .objectActivity
                .deleted
            )}
          />
        </div>
      </section>

      {data.derived
        .observedFunding && (
        <section className="rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.03] p-6 sm:p-8">
          <div className="text-xs font-medium tracking-[0.16em] text-emerald-400">
            OBSERVED INBOUND SUI EVIDENCE
          </div>

          <div className="mt-4 break-all font-mono text-xs text-zinc-400">
            Sender:{" "}
            {
              data.derived
                .observedFunding
                .observedSender
            }
          </div>

          <div className="mt-2 text-xs text-zinc-500">
            Amount:{" "}
            {formatMist(
              data.derived
                .observedFunding
                .amountMist
            )}
          </div>

          <p className="mt-3 text-xs leading-5 text-zinc-600">
            This is bounded on-chain transaction-sender evidence,
            not a claim of ultimate funding origin or common ownership.
          </p>
        </section>
      )}

      <section className="rounded-3xl border border-zinc-900 bg-zinc-950/60 p-6 sm:p-8">
        <div className="text-xs font-medium tracking-[0.16em] text-zinc-500">
          SUI ANALYSIS DEPTH
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Plan"
            value={
              data.analysisPlan
                .toUpperCase()
            }
          />

          <Stat
            label="Transaction limit"
            value={String(
              data.evidenceCoverage
                .historyLimit
            )}
          />

          <Stat
            label="Balance limit"
            value={String(
              data.evidenceCoverage
                .balanceLimit
            )}
          />

          <Stat
            label="Object limit"
            value={String(
              data.evidenceCoverage
                .objectLimit
            )}
          />
        </div>
      </section>
    </div>
  );
}
