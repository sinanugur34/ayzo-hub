import type {
  WalletTrackRecord,
} from "@/lib/intelligence/walletTrackRecord";

function formatDate(
  value:
    string | null
) {
  if (!value) {
    return "Unavailable";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "Unavailable";
  }

  return parsed
    .toISOString()
    .slice(
      0,
      10
    );
}

export default function WalletTrackRecordPanel({
  record,
  subjectLabel =
    "Analyzed wallet",
}: {
  record:
    WalletTrackRecord;

  subjectLabel?:
    string;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-500/5 via-zinc-950/70 to-zinc-950/80">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-900 p-5 sm:p-6">
        <div>
          <div className="text-[10px] font-medium tracking-[0.16em] text-violet-400">
            WALLET TRACK RECORD
          </div>

          <h3 className="mt-2 text-lg font-semibold text-zinc-100">
            Observed on-chain history
          </h3>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
            {subjectLabel} · Evidence-backed activity only
          </p>
        </div>

        <span
          className={
            record.status ===
            "limited"
              ? "rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[9px] font-medium tracking-[0.12em] text-violet-300"
              : "rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[9px] font-medium tracking-[0.12em] text-zinc-500"
          }
        >
          {record.status ===
          "limited"
            ? "BOUNDED"
            : "UNAVAILABLE"}
        </span>
      </div>

      {record.status ===
      "unavailable" ? (
        <div className="p-6 text-xs leading-5 text-zinc-600">
          Sufficient supported historical evidence is not available for this Track Record.
        </div>
      ) : (
        <>
          <div className="grid gap-3 border-b border-zinc-900 p-5 sm:grid-cols-3 sm:p-6">
            <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[9px] tracking-[0.12em] text-zinc-700">
                FIRST OBSERVED
              </div>

              <div className="mt-2 text-sm font-medium text-zinc-300">
                {formatDate(
                  record.firstObservedAt
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[9px] tracking-[0.12em] text-zinc-700">
                LAST OBSERVED
              </div>

              <div className="mt-2 text-sm font-medium text-zinc-300">
                {formatDate(
                  record.lastObservedAt
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/20 p-4">
              <div className="text-[9px] tracking-[0.12em] text-zinc-700">
                OBSERVED SPAN
              </div>

              <div className="mt-2 text-sm font-medium text-zinc-300">
                {record.observedSpanDays ===
                null
                  ? "Unavailable"
                  : `${record.observedSpanDays} day${
                      record.observedSpanDays ===
                      1
                        ? ""
                        : "s"
                    }`}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {record.metrics.map(
                item => (
                  <div
                    key={
                      item.id
                    }
                    className="rounded-2xl border border-zinc-900 bg-black/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[9px] tracking-[0.1em] text-zinc-700">
                        {item.label.toUpperCase()}
                      </div>

                      <span className="text-[8px] font-medium text-emerald-400">
                        SUPPORTED
                      </span>
                    </div>

                    <div className="mt-2 text-lg font-semibold text-zinc-200">
                      {item.value}
                    </div>

                    {item.detail && (
                      <p className="mt-2 text-[10px] leading-4 text-zinc-700">
                        {item.detail}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="border-t border-zinc-900 px-5 py-4 sm:px-6">
            <div className="text-[9px] font-medium tracking-[0.12em] text-zinc-700">
              EVIDENCE LIMITATION
            </div>

            <p className="mt-2 text-[10px] leading-5 text-zinc-600">
              {record.limitation}
            </p>

            <p className="mt-2 text-[10px] leading-5 text-zinc-700">
              {record.methodology}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
