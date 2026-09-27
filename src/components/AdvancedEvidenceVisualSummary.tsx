type EvidenceModule = {
  label: string;
  value: string;
  detail: string;
  available: boolean;
  tone:
    | "cyan"
    | "violet"
    | "purple"
    | "emerald";
};

function toneClass(
  tone:
    EvidenceModule["tone"]
) {
  switch (tone) {
    case "cyan":
      return {
        border:
          "border-cyan-500/20",
        background:
          "bg-cyan-500/[0.055]",
        text:
          "text-cyan-200",
        dot:
          "bg-cyan-300",
      };

    case "emerald":
      return {
        border:
          "border-emerald-500/20",
        background:
          "bg-emerald-500/[0.055]",
        text:
          "text-emerald-200",
        dot:
          "bg-emerald-300",
      };

    case "purple":
      return {
        border:
          "border-purple-500/20",
        background:
          "bg-purple-500/[0.055]",
        text:
          "text-purple-200",
        dot:
          "bg-purple-300",
      };

    case "violet":
    default:
      return {
        border:
          "border-violet-500/20",
        background:
          "bg-violet-500/[0.055]",
        text:
          "text-violet-200",
        dot:
          "bg-violet-300",
      };
  }
}

function ModuleNode({
  module,
  className = "",
}: {
  module:
    EvidenceModule;

  className?:
    string;
}) {
  const tone =
    toneClass(
      module.tone
    );

  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-sm ${tone.border} ${tone.background} ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {module.label}
        </div>

        <span
          className={`h-2 w-2 rounded-full ${
            module.available
              ? tone.dot
              : "bg-zinc-700"
          }`}
        />
      </div>

      <div
        className={`mt-2 text-lg font-semibold ${
          module.available
            ? tone.text
            : "text-zinc-600"
        }`}
      >
        {module.value}
      </div>

      <div className="mt-1 text-[9px] leading-4 text-zinc-600">
        {module.detail}
      </div>
    </div>
  );
}

export default function AdvancedEvidenceVisualSummary({
  sourceModules,
  evidenceTransactions,
  fundingPaths,
  graphNodes,
  graphEdges,
  graphDepth,
  coordinationSignals,
  multiHopCorroborations,
  deployments,
  fundingAvailable,
  graphAvailable,
  coordinationAvailable,
  deployerAvailable,
}: {
  sourceModules:
    string;

  evidenceTransactions:
    string;

  fundingPaths:
    string;

  graphNodes:
    string;

  graphEdges:
    string;

  graphDepth:
    string;

  coordinationSignals:
    string;

  multiHopCorroborations:
    string;

  deployments:
    string;

  fundingAvailable:
    boolean;

  graphAvailable:
    boolean;

  coordinationAvailable:
    boolean;

  deployerAvailable:
    boolean;
}) {
  const modules:
    readonly EvidenceModule[] =
    [
      {
        label:
          "Deep Funding",

        value:
          fundingPaths,

        detail:
          "Observed bounded funding path(s)",

        available:
          fundingAvailable,

        tone:
          "cyan",
      },

      {
        label:
          "Wallet Graph",

        value:
          graphAvailable
            ? `${graphNodes} · ${graphEdges}`
            : "Unavailable",

        detail:
          graphAvailable
            ? `nodes · edges · ${graphDepth}`
            : "No supported graph evidence",

        available:
          graphAvailable,

        tone:
          "violet",
      },

      {
        label:
          "Coordination",

        value:
          coordinationSignals,

        detail:
          coordinationAvailable
            ? `${multiHopCorroborations} multi-hop corroboration(s)`
            : "No supported coordination evidence",

        available:
          coordinationAvailable,

        tone:
          "purple",
      },

      {
        label:
          "Deployer",

        value:
          deployments,

        detail:
          deployerAvailable
            ? "Verified deployment evidence"
            : "No supported deployer evidence",

        available:
          deployerAvailable,

        tone:
          "emerald",
      },
    ];

  return (
    <section
      data-advanced-evidence-visual
      className="overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-[#0b1525] to-[#08111e]"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-violet-500/10 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <div>
          <div className="text-[9px] font-semibold tracking-[0.17em] text-violet-300">
            INVESTIGATION MAP
          </div>

          <div className="mt-1 text-sm font-semibold text-zinc-100">
            Cross-module evidence structure
          </div>

          <p className="mt-1 text-[10px] leading-5 text-zinc-600">
            Visualizes which existing evidence modules contribute to
            the bounded synthesis. Lines do not imply ownership,
            identity, control or intent.
          </p>
        </div>

        <div className="flex gap-2">
          <span className="rounded-full border border-violet-500/15 bg-violet-500/[0.07] px-3 py-1.5 text-[8px] font-medium tracking-[0.1em] text-violet-300">
            {sourceModules} MODULES
          </span>

          <span className="rounded-full border border-cyan-500/15 bg-cyan-500/[0.06] px-3 py-1.5 text-[8px] font-medium tracking-[0.1em] text-cyan-300">
            {evidenceTransactions} EVIDENCE TX
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
          {modules.map(
            module => (
              <ModuleNode
                key={
                  module.label
                }
                module={
                  module
                }
              />
            )
          )}

          <div className="sm:col-span-2 rounded-2xl border border-violet-400/25 bg-violet-500/[0.08] p-4 text-center">
            <div className="text-[9px] font-semibold tracking-[0.15em] text-violet-300">
              AYZO SYNTHESIS
            </div>

            <div className="mt-1 text-lg font-semibold text-zinc-100">
              Evidence-linked
            </div>

            <div className="mt-1 text-[9px] text-zinc-600">
              Existing modules only · no added inference
            </div>
          </div>
        </div>

        <div className="relative hidden min-h-[330px] lg:block">
          <svg
            viewBox="0 0 1000 330"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full text-violet-400/20"
          >
            <path
              d="M500 165 L210 78"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5 8"
            />

            <path
              d="M500 165 L790 78"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5 8"
            />

            <path
              d="M500 165 L210 252"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5 8"
            />

            <path
              d="M500 165 L790 252"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="5 8"
            />

            <circle
              cx="500"
              cy="165"
              r="72"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 8"
            />
          </svg>

          <ModuleNode
            module={
              modules[0]
            }
            className="absolute left-4 top-4 w-[250px]"
          />

          <ModuleNode
            module={
              modules[1]
            }
            className="absolute right-4 top-4 w-[250px]"
          />

          <ModuleNode
            module={
              modules[2]
            }
            className="absolute bottom-4 left-4 w-[250px]"
          />

          <ModuleNode
            module={
              modules[3]
            }
            className="absolute bottom-4 right-4 w-[250px]"
          />

          <div className="absolute left-1/2 top-1/2 flex h-[150px] w-[190px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-[28px] border border-violet-400/30 bg-[#11172a]/95 px-5 text-center shadow-2xl shadow-violet-950/30">
            <span className="absolute -top-2 h-4 w-4 rounded-full border border-violet-300/40 bg-violet-400 shadow-lg shadow-violet-500/40" />

            <div className="text-[9px] font-semibold tracking-[0.16em] text-violet-300">
              AYZO SYNTHESIS
            </div>

            <div className="mt-2 text-2xl font-semibold text-zinc-100">
              {sourceModules}
            </div>

            <div className="text-[9px] uppercase tracking-[0.12em] text-zinc-600">
              evidence modules
            </div>

            <div className="mt-2 text-[9px] text-cyan-300">
              {evidenceTransactions} evidence tx
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "Funding paths",
              fundingPaths,
            ],
            [
              "Graph depth",
              graphDepth,
            ],
            [
              "Coordination",
              coordinationSignals,
            ],
            [
              "Multi-hop",
              multiHopCorroborations,
            ],
          ].map(
            item => (
              <div
                key={
                  item[0]
                }
                className="rounded-xl border border-[#29364c] bg-black/20 px-3 py-3"
              >
                <div className="text-[8px] uppercase tracking-[0.12em] text-zinc-600">
                  {item[0]}
                </div>

                <div className="mt-1 text-sm font-semibold text-zinc-200">
                  {item[1]}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
