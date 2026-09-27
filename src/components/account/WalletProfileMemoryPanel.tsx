type WalletEvidenceSnapshot = {
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

type ProfileMemory = {
  key:
    string;

  network:
    string;

  subjectValue:
    string;

  latestAt:
    string;

  snapshotCount:
    number;
};

function short(
  value:
    string
) {
  if (
    value.length <=
    30
  ) {
    return value;
  }

  return `${value.slice(
    0,
    14
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
    return "Unavailable";
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      year:
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

function buildMemory(
  snapshots:
    readonly WalletEvidenceSnapshot[]
) {
  const memory =
    new Map<
      string,
      ProfileMemory
    >();

  const walletSnapshots =
    snapshots
      .filter(
        snapshot =>
          snapshot
            .subject_type ===
          "wallet"
      )
      .sort(
        (
          left,
          right
        ) =>
          Date.parse(
            right
              .captured_at
          ) -
          Date.parse(
            left
              .captured_at
          )
      );

  for (
    const snapshot of
    walletSnapshots
  ) {
    const key =
      `${snapshot.network}|${snapshot.subject_value}`;

    const current =
      memory.get(
        key
      );

    if (!current) {
      memory.set(
        key,
        {
          key,

          network:
            snapshot.network,

          subjectValue:
            snapshot
              .subject_value,

          latestAt:
            snapshot
              .captured_at,

          snapshotCount:
            1,
        }
      );

      continue;
    }

    current.snapshotCount +=
      1;
  }

  return [
    ...memory.values(),
  ].slice(
    0,
    6
  );
}

export default function WalletProfileMemoryPanel({
  snapshots,
  unavailable,
}: {
  snapshots:
    readonly WalletEvidenceSnapshot[];

  unavailable:
    boolean;
}) {
  const memory =
    buildMemory(
      snapshots
    );

  return (
    <section
      id="wallet-profile-memory"
      className="mt-5 scroll-mt-24 overflow-hidden rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.06] via-zinc-950/70 to-black"
    >
      <div className="p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
              WALLET PROFILER
            </div>

            <h2 className="mt-2 text-xl font-semibold tracking-[-0.02em] text-zinc-100">
              Profile Memory
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
              Recent wallet evidence baselines remembered by AYZO. Profile Memory records when evidence was captured; it does not assign wallet scores or identities.
            </p>
          </div>

          <span className="rounded-full border border-violet-500/20 bg-violet-500/[0.06] px-3 py-1.5 text-[9px] font-semibold tracking-[0.12em] text-violet-300">
            PRO
          </span>
        </div>

        {unavailable ? (
          <div className="mt-5 rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] p-4 text-xs text-rose-300">
            Wallet profile memory is temporarily unavailable.
          </div>
        ) : memory.length ===
          0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-zinc-800 p-5">
            <div className="text-sm text-zinc-300">
              No wallet profile memory yet.
            </div>

            <p className="mt-2 text-xs leading-5 text-zinc-600">
              Run supported wallet analyses to create automatic evidence baselines.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {memory.map(
              item => (
                <article
                  key={
                    item.key
                  }
                  className="rounded-2xl border border-zinc-900 bg-black/30 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-300">
                        {item.network}
                      </div>

                      <div className="mt-2 truncate font-mono text-xs text-zinc-300">
                        {short(
                          item.subjectValue
                        )}
                      </div>
                    </div>

                    <span className="rounded-full border border-zinc-800 px-2.5 py-1 text-[8px] font-medium text-zinc-500">
                      {item.snapshotCount}
                      {" "}
                      {item.snapshotCount ===
                      1
                        ? "BASELINE"
                        : "BASELINES"}
                    </span>
                  </div>

                  <div className="mt-4 border-t border-zinc-900 pt-3">
                    <div className="text-[8px] uppercase tracking-[0.12em] text-zinc-700">
                      Latest evidence
                    </div>

                    <div className="mt-1 text-[10px] text-zinc-500">
                      {formatDate(
                        item.latestAt
                      )}
                    </div>
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
