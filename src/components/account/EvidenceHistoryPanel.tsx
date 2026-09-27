type EvidenceSnapshotRow = {
  id:
    string;

  network:
    string;

  subject_type:
    string;

  subject_value:
    string;

  captured_at:
    string;

  created_at:
    string;
};

function shortSubject(
  value:
    string
) {
  if (
    value.length <=
    34
  ) {
    return value;
  }

  return `${value.slice(
    0,
    16
  )}…${value.slice(
    -10
  )}`;
}

function formatDate(
  value:
    string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

export default function EvidenceHistoryPanel({
  snapshots,
  unavailable,
}: {
  snapshots:
    EvidenceSnapshotRow[];

  unavailable:
    boolean;
}) {
  const trackedSubjects =
    new Set(
      snapshots.map(
        snapshot =>
          [
            snapshot.network,
            snapshot.subject_type,
            snapshot.subject_value,
          ].join(
            "::"
          )
      )
    ).size;

  return (
    <section
      id="evidence-history"
      className="mt-5 scroll-mt-24 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-zinc-950/80 to-black"
    >
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
              EVIDENCE MEMORY
            </div>

            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-zinc-100">
              Evidence History
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
              AYZO automatically keeps bounded evidence baselines as you analyze the same subject. Manual Saved Analyses stay separate and remain curated by you.
            </p>
          </div>

          <div className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300">
            AUTOMATIC
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800/80 bg-black/30 p-4">
            <div className="text-[9px] uppercase tracking-[0.13em] text-zinc-600">
              Recent baselines
            </div>

            <div className="mt-2 text-lg font-semibold text-zinc-200">
              {snapshots.length}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-black/30 p-4">
            <div className="text-[9px] uppercase tracking-[0.13em] text-zinc-600">
              Tracked subjects
            </div>

            <div className="mt-2 text-lg font-semibold text-zinc-200">
              {trackedSubjects}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-black/30 p-4">
            <div className="text-[9px] uppercase tracking-[0.13em] text-zinc-600">
              Retention
            </div>

            <div className="mt-2 text-lg font-semibold text-zinc-200">
              20
            </div>

            <div className="mt-1 text-[9px] text-zinc-600">
              baselines per subject
            </div>
          </div>
        </div>

        {unavailable ? (
          <div className="mt-5 rounded-2xl border border-rose-500/10 bg-rose-500/[0.04] p-4 text-xs text-rose-200/80">
            Evidence History is temporarily unavailable.
          </div>
        ) : snapshots.length ===
          0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 bg-black/20 p-5">
            <div className="text-sm font-medium text-zinc-300">
              Automatic tracking is ready.
            </div>

            <p className="mt-2 text-xs leading-5 text-zinc-600">
              Analyze a token or wallet to capture the first bounded evidence baseline. AYZO will compare later analyses automatically.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-2 md:grid-cols-2">
            {snapshots
              .slice(
                0,
                6
              )
              .map(
                snapshot => (
                  <article
                    key={
                      snapshot.id
                    }
                    className="group rounded-2xl border border-zinc-900 bg-black/25 p-4 transition hover:border-violet-500/20 hover:bg-violet-500/[0.03]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-mono text-xs text-zinc-300">
                          {shortSubject(
                            snapshot.subject_value
                          )}
                        </div>

                        <div className="mt-2 text-[9px] uppercase tracking-[0.12em] text-zinc-600">
                          {snapshot.network}
                          {" · "}
                          {snapshot.subject_type}
                        </div>
                      </div>

                      <span className="shrink-0 rounded-full border border-zinc-800 px-2 py-1 text-[8px] text-zinc-600">
                        {formatDate(
                          snapshot.captured_at
                        )}
                      </span>
                    </div>
                  </article>
                )
              )}
          </div>
        )}
      </div>
    </section>
  );
}
