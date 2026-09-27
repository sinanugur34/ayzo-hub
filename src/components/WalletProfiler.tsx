import type {
  WalletProfile,
} from "@/lib/intelligence/walletProfiler";

function formatDate(
  value:
    string | null
) {
  if (!value) {
    return "Unavailable";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "Unavailable";
  }

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}

export default function WalletProfilerPanel({
  profile,
  subjectLabel,
}: {
  profile:
    WalletProfile;

  subjectLabel:
    string;
}) {
  return (
    <section
      data-wallet-profiler="v1"
      className="overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-violet-500/[0.08] via-zinc-950/85 to-black"
    >
      <div className="flex flex-wrap items-start justify-between gap-5 border-b border-zinc-900 p-5 sm:p-6">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.18em] text-violet-300">
            WALLET PROFILE
          </div>

          <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-zinc-100">
            Observed evidence profile
          </h3>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
            {subjectLabel}
            {" · "}
            Activity, funding and relationship evidence synthesized from the current bounded AYZO analysis.
          </p>
        </div>

        <span
          className={
            profile.status ===
            "limited"
              ? "rounded-full border border-violet-500/20 bg-violet-500/[0.08] px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-violet-300"
              : "rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-zinc-500"
          }
        >
          {profile.status ===
          "limited"
            ? "BOUNDED EVIDENCE"
            : "UNAVAILABLE"}
        </span>
      </div>

      {profile.status ===
      "unavailable" ? (
        <div className="p-6">
          <div className="text-sm text-zinc-300">
            Wallet profile evidence unavailable
          </div>

          <p className="mt-2 text-xs leading-5 text-zinc-600">
            AYZO does not have enough supported wallet evidence in the current bounded analysis to construct a profile.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 border-b border-zinc-900 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
            <div className="rounded-2xl border border-zinc-900 bg-black/30 p-4">
              <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                First observed
              </div>

              <div className="mt-2 text-sm font-medium text-zinc-300">
                {formatDate(
                  profile.firstObservedAt
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/30 p-4">
              <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                Latest evidence
              </div>

              <div className="mt-2 text-sm font-medium text-zinc-300">
                {formatDate(
                  profile.lastObservedAt
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/30 p-4">
              <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                Observed span
              </div>

              <div className="mt-2 text-sm font-medium text-zinc-300">
                {profile.observedSpanDays ===
                null
                  ? "Unavailable"
                  : `${profile.observedSpanDays} day${
                      profile.observedSpanDays ===
                      1
                        ? ""
                        : "s"
                    }`}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-black/30 p-4">
              <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-700">
                Evidence metrics
              </div>

              <div className="mt-2 text-lg font-semibold text-zinc-200">
                {profile.evidenceMetricCount}
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-5 sm:p-6 lg:grid-cols-3">
            {profile.sections.map(
              section => (
                <article
                  key={
                    section.id
                  }
                  className="rounded-2xl border border-zinc-900 bg-black/25 p-4"
                >
                  <div className="text-[9px] font-semibold uppercase tracking-[0.13em] text-violet-300">
                    {section.title}
                  </div>

                  <p className="mt-2 min-h-10 text-[10px] leading-5 text-zinc-600">
                    {section.description}
                  </p>

                  <div className="mt-4 space-y-2">
                    {section.metrics.map(
                      metric => (
                        <div
                          key={
                            metric.id
                          }
                          className="rounded-xl border border-zinc-900 bg-black/30 p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="text-[9px] uppercase tracking-[0.1em] text-zinc-600">
                              {metric.label}
                            </div>

                            <span className="text-[8px] font-medium text-emerald-400">
                              SUPPORTED
                            </span>
                          </div>

                          <div className="mt-1.5 text-base font-semibold text-zinc-200">
                            {metric.value}
                          </div>

                          {metric.detail && (
                            <p className="mt-1.5 text-[9px] leading-4 text-zinc-700">
                              {metric.detail}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </article>
              )
            )}
          </div>

          <div className="border-t border-zinc-900 px-5 py-5 sm:px-6">
            <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-zinc-700">
              Evidence boundary
            </div>

            <p className="mt-2 text-[10px] leading-5 text-zinc-600">
              {profile.limitation}
            </p>

            <p className="mt-2 text-[10px] leading-5 text-zinc-700">
              {profile.methodology}
            </p>
          </div>
        </>
      )}
    </section>
  );
}
