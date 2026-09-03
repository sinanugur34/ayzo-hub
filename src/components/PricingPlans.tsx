import WaitlistForm from "@/components/WaitlistForm";

type Feature = {
  label: string;
  roadmap?: boolean;
  emphasis?: boolean;
};

const freeFeatures: Feature[] = [
  {
    label:
      "14 live networks",
  },
  {
    label:
      "3 analyses per 24 hours",
  },
  {
    label:
      "Basic token and wallet intelligence",
  },
  {
    label:
      "Basic wallet relationships",
  },
  {
    label:
      "Basic funding insight",
  },
  {
    label:
      "Evidence-backed summaries",
  },
];

const proFeatures: Feature[] = [
  {
    label:
      "Everything in Free",
    emphasis:
      true,
  },
  {
    label:
      "Higher analysis limits",
  },
  {
    label:
      "Deeper wallet relationships",
  },
  {
    label:
      "Funding provenance",
  },
  {
    label:
      "Developer history",
  },
  {
    label:
      "Deployment intelligence",
  },
  {
    label:
      "Longer activity history",
  },
  {
    label:
      "Advanced evidence explanations",
  },
  {
    label:
      "Saved analyses",
    roadmap:
      true,
  },
  {
    label:
      "Smart alerts",
    roadmap:
      true,
  },
  {
    label:
      "PDF / CSV export",
    roadmap:
      true,
  },
];

const advancedFeatures: Feature[] = [
  {
    label:
      "Everything in Pro",
    emphasis:
      true,
  },
  {
    label:
      "Full multi-hop wallet graph",
  },
  {
    label:
      "Coordinated-wallet intelligence",
  },
  {
    label:
      "Deep funding tracing",
  },
  {
    label:
      "Deep developer / deployer investigation",
  },
  {
    label:
      "Professional investigation reports",
  },
  {
    label:
      "Maximum investigation depth",
  },
  {
    label:
      "Batch wallet analysis",
    roadmap:
      true,
  },
  {
    label:
      "AYZO API access",
    roadmap:
      true,
  },
  {
    label:
      "Saved investigations & watchlists",
    roadmap:
      true,
  },
  {
    label:
      "Custom labels & notes",
    roadmap:
      true,
  },
  {
    label:
      "PDF / CSV / JSON export",
    roadmap:
      true,
  },
  {
    label:
      "Team workspace",
    roadmap:
      true,
  },
  {
    label:
      "Priority processing",
    roadmap:
      true,
  },
];

function FeatureList({
  features,
}: {
  features: Feature[];
}) {
  return (
    <div className="mt-7 space-y-3">
      {features.map(
        feature => (
          <div
            key={
              feature.label
            }
            className="flex items-start gap-3"
          >
            <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10 text-[9px] text-violet-300">
              ✓
            </div>

            <div className="min-w-0">
              <div
                className={`text-sm leading-5 ${
                  feature.emphasis
                    ? "font-medium text-white"
                    : "text-zinc-400"
                }`}
              >
                {feature.label}
              </div>

              {feature.roadmap && (
                <span className="mt-1 inline-block rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[8px] font-semibold tracking-[0.12em] text-zinc-500">
                  ROADMAP
                </span>
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default function PricingPlans() {
  return (
    <section
      id="plans"
      className="mt-24 w-full max-w-6xl text-left"
    >
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs font-medium tracking-[0.2em] text-violet-300">
          AYZO PLANS
        </div>

        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
          Start simple. Go as deep as you need.
        </h2>

        <p className="mt-4 text-sm leading-6 text-zinc-500 sm:text-base">
          Free for exploration. Pro for deeper analysis.
          Advanced for professional investigations at scale.
        </p>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {/* FREE */}
        <div className="flex flex-col rounded-3xl border border-zinc-800 bg-zinc-950/60 p-6 sm:p-7">
          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-zinc-500">
              FREE
            </div>

            <h3 className="mt-3 text-2xl font-semibold text-white">
              Explore
            </h3>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Understand the basics before going deeper.
            </p>

            <div className="mt-6 text-3xl font-semibold text-white">
              $0
            </div>

            <div className="mt-1 text-xs text-zinc-600">
              No wallet connection required
            </div>
          </div>

          <FeatureList
            features={
              freeFeatures
            }
          />

          <div className="mt-auto pt-8">
            <a
              href="#analyzer"
              className="flex h-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 text-sm font-semibold text-white transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              Use Free
            </a>
          </div>
        </div>

        {/* PRO */}
        <div className="relative flex flex-col rounded-3xl border border-violet-500/30 bg-gradient-to-b from-violet-500/10 to-zinc-950/70 p-6 shadow-xl shadow-purple-950/10 sm:p-7">
          <div className="absolute right-5 top-5 rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[9px] font-semibold tracking-[0.12em] text-violet-300">
            COMING SOON
          </div>

          <div>
            <div className="text-xs font-semibold tracking-[0.18em] text-violet-300">
              PRO
            </div>

            <h3 className="mt-3 text-2xl font-semibold text-white">
              Analyze Deeper
            </h3>

            <p className="mt-3 pr-20 text-sm leading-6 text-zinc-400">
              For active traders, investors and on-chain researchers.
            </p>

            <div className="mt-6 text-lg font-semibold text-zinc-200">
              Pricing coming soon
            </div>
          </div>

          <FeatureList
            features={
              proFeatures
            }
          />

          <div className="mt-auto pt-8">
            <WaitlistForm
              source="pro-card"
              compact
              buttonLabel="Join Pro Waitlist"
            />
          </div>
        </div>

        {/* ADVANCED */}
        <div className="relative flex flex-col overflow-hidden rounded-3xl border border-purple-400/40 bg-gradient-to-b from-purple-500/15 via-violet-500/5 to-zinc-950/80 p-6 shadow-2xl shadow-purple-950/20 sm:p-7">
          <div className="pointer-events-none absolute right-[-70px] top-[-70px] h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs font-semibold tracking-[0.18em] text-purple-300">
                ADVANCED
              </div>

              <span className="rounded-full border border-purple-400/30 bg-purple-400/10 px-2.5 py-1 text-[9px] font-semibold tracking-[0.12em] text-purple-200">
                MOST POWERFUL
              </span>
            </div>

            <h3 className="mt-3 text-2xl font-semibold text-white">
              Investigate at Scale
            </h3>

            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Professional investigation workflows for analysts,
              funds, teams and high-volume users.
            </p>

            <div className="mt-6 text-lg font-semibold text-zinc-200">
              Pricing coming soon
            </div>
          </div>

          <div className="relative">
            <FeatureList
              features={
                advancedFeatures
              }
            />
          </div>

          <div className="relative mt-auto pt-8">
            <WaitlistForm
              source="advanced-card"
              compact
              buttonLabel="Join Advanced Waitlist"
            />
          </div>
        </div>
      </div>

      <div className="mt-5 text-center text-[11px] leading-5 text-zinc-600">
        Roadmap features are planned for the paid launch and
        are not represented as available today.
      </div>
    </section>
  );
}
