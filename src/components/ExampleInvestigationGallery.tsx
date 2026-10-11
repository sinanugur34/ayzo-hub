"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  trackEvent,
} from "@/lib/analytics/client";

type ExampleId =
  | "ethereum"
  | "solana"
  | "tron";

type ExampleInvestigation = {
  id: ExampleId;
  network: string;
  subject: string;
  description: string;
  evidence: readonly {
    label: string;
    value: string;
  }[];
  limitation: string;
};

const EXAMPLES:
  readonly ExampleInvestigation[] = [
    {
      id:
        "ethereum",

      network:
        "Ethereum",

      subject:
        "Sample wallet",

      description:
        "Explore how AYZO organizes EVM funding, relationships, verification and bounded activity evidence.",

      evidence: [
        {
          label:
            "Funding provenance",
          value:
            "Observed routes",
        },
        {
          label:
            "Relationships",
          value:
            "Evidence graph",
        },
        {
          label:
            "Verification",
          value:
            "On-chain state",
        },
        {
          label:
            "Activity",
          value:
            "Bounded history",
        },
      ],

      limitation:
        "Observed connections do not establish ownership, control, identity or intent.",
    },

    {
      id:
        "solana",

      network:
        "Solana",

      subject:
        "Sample token",

      description:
        "Explore network-native token authority, holder structure, funding and relationship evidence.",

      evidence: [
        {
          label:
            "Mint authority",
          value:
            "Evidence state",
        },
        {
          label:
            "Freeze authority",
          value:
            "Evidence state",
        },
        {
          label:
            "Holder structure",
          value:
            "Bounded view",
        },
        {
          label:
            "Funding",
          value:
            "Observed evidence",
        },
      ],

      limitation:
        "Holder concentration and authority state are descriptive evidence, not standalone risk conclusions.",
    },

    {
      id:
        "tron",

      network:
        "TRON",

      subject:
        "Sample wallet",

      description:
        "Explore TRON-native transaction flow, funding, contract interaction and resource evidence.",

      evidence: [
        {
          label:
            "TRX flow",
          value:
            "Observed activity",
        },
        {
          label:
            "Funding",
          value:
            "Incoming evidence",
        },
        {
          label:
            "Contracts",
          value:
            "Interactions",
        },
        {
          label:
            "Resources",
          value:
            "Energy / bandwidth",
        },
      ],

      limitation:
        "Funding observations do not establish ultimate origin, ownership or source identity.",
    },
  ];

export default function ExampleInvestigationGallery() {
  const [
    selected,
    setSelected,
  ] =
    useState<ExampleId>(
      "ethereum"
    );

  const [
    expanded,
    setExpanded,
  ] =
    useState(false);

  useEffect(() => {
    trackEvent(
      "example_gallery_viewed",
      {
        surface:
          "home",
      }
    );
  }, []);

  const example =
    EXAMPLES.find(
      item =>
        item.id ===
        selected
    ) ??
    EXAMPLES[0];

  function openExample(
    id: ExampleId
  ) {
    setSelected(
      id
    );

    setExpanded(
      false
    );

    trackEvent(
      "example_opened",
      {
        network:
          id,
        surface:
          "home",
      }
    );
  }

  function exploreExample() {
    setExpanded(
      current =>
        !current
    );

    trackEvent(
      "example_cta_clicked",
      {
        network:
          selected,
        surface:
          "home",
        action:
          expanded
            ? "collapse"
            : "expand",
      }
    );
  }

  return (
    <div
      data-ayzo-example-gallery
      data-selected-network={selected}
      className="ayzo-example-v2 relative overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="text-[10px] font-medium tracking-[0.18em] text-zinc-500">
            EXAMPLE INVESTIGATIONS
          </div>

          <div className="rounded-full border border-emerald-500/15 bg-emerald-500/[0.06] px-2.5 py-1 text-[9px] font-medium text-emerald-400">
            FROZEN SAMPLE
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {EXAMPLES.map(
            item => (
              <button
                key={
                  item.id
                }
                type="button"
                data-ayzo-example-tab
                aria-pressed={
                  selected ===
                  item.id
                }
                onClick={() =>
                  openExample(
                    item.id
                  )
                }
                className={
                  selected ===
                  item.id
                    ? "rounded-xl border border-violet-400/40 bg-violet-500/10 px-2 py-2 text-[9px] font-medium text-violet-200 transition"
                    : "rounded-xl border border-zinc-800 bg-black/25 px-2 py-2 text-[9px] font-medium text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-300"
                }
              >
                {
                  item.network
                }
              </button>
            )
          )}
        </div>

        <div className="mt-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-zinc-600">
            {
              example.subject
            }
          </div>

          <div className="mt-1 text-sm font-medium text-zinc-200">
            {
              example.network
            }
          </div>

          <p className="mt-3 text-[11px] leading-5 text-zinc-500">
            {
              example.description
            }
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {example.evidence.map(
            item => (
              <div
                key={
                  item.label
                }
                className="flex items-center justify-between border-b border-zinc-900 pb-3 text-xs last:border-0 last:pb-0"
              >
                <span className="text-zinc-600">
                  {
                    item.label
                  }
                </span>

                <span className="font-medium text-zinc-300">
                  {
                    item.value
                  }
                </span>
              </div>
            )
          )}
        </div>

        <button
          type="button"
          data-ayzo-example-expand
          aria-expanded={
            expanded
          }
          onClick={
            exploreExample
          }
          className="mt-6 w-full rounded-xl border border-violet-500/25 bg-violet-500/[0.07] px-4 py-3 text-xs font-medium text-violet-200 transition hover:border-violet-400/40 hover:bg-violet-500/[0.11]"
        >
          {expanded
            ? "Close evidence preview"
            : "Explore investigation"}
        </button>

        {expanded && (
          <div
            data-ayzo-example-preview
            className="mt-3 rounded-xl border border-zinc-800 bg-black/30 p-4"
          >
            <div className="text-[9px] font-medium uppercase tracking-[0.13em] text-violet-300">
              Evidence-first preview
            </div>

            <p className="mt-2 text-[10px] leading-5 text-zinc-500">
              This frozen example demonstrates the type of evidence AYZO can organize for this network. It does not run providers, consume an analysis credit or claim exhaustive blockchain coverage.
            </p>

            <p className="mt-3 border-t border-zinc-900 pt-3 text-[9px] leading-4 text-zinc-600">
              {
                example.limitation
              }
            </p>
          </div>
        )}

        <div className="mt-4 rounded-xl border border-zinc-900 bg-black/25 px-4 py-3 text-[10px] leading-4 text-zinc-600">
          Illustrative frozen examples only. No live request is made and no analysis credit is used.
        </div>
      </div>
    </div>
  );
}
