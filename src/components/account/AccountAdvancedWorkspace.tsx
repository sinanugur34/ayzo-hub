"use client";

import {
  useState,
  type ReactNode,
} from "react";

type TabId =
  | "investigations"
  | "monitoring"
  | "automation"
  | "developer"
  | "customization";

type TabDefinition = {
  id: TabId;
  label: string;
  description: string;
};

const tabs: readonly TabDefinition[] = [
  {
    id: "investigations",
    label: "Investigations",
    description:
      "Cases, evidence, comparison and deeper watchlist research.",
  },
  {
    id: "monitoring",
    label: "Monitoring",
    description:
      "Advanced monitoring rules and evidence thresholds.",
  },
  {
    id: "automation",
    label: "Automation",
    description:
      "Batch analysis and priority analysis controls.",
  },
  {
    id: "developer",
    label: "Developer",
    description:
      "Programmatic access to AYZO intelligence.",
  },
  {
    id: "customization",
    label: "Customization",
    description:
      "Private labels, notes and no-code dashboards.",
  },
];

export default function AccountAdvancedWorkspace({
  title,
  investigations,
  monitoring,
  automation,
  developer,
  customization,
}: {
  title: string;
  investigations: ReactNode;
  monitoring: ReactNode;
  automation: ReactNode;
  developer: ReactNode;
  customization: ReactNode;
}) {
  const [
    activeTab,
    setActiveTab,
  ] =
    useState<TabId>(
      "investigations"
    );

  const active =
    tabs.find(
      tab =>
        tab.id ===
        activeTab
    ) ?? tabs[0];

  const content: Record<
    TabId,
    ReactNode
  > = {
    investigations,
    monitoring,
    automation,
    developer,
    customization,
  };

  return (
    <section
      id="advanced-workspace"
      className="mt-8 scroll-mt-24 border-t border-violet-500/10 pt-6"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
            {title}
          </div>

          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-white">
            Your advanced research workspace
          </h2>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-zinc-500">
            Open only the tools you need. Investigation, monitoring,
            automation and developer controls stay organized in one place.
          </p>
        </div>

        <span className="rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-300">
          Advanced
        </span>
      </div>

      <div
        role="tablist"
        aria-label="Advanced workspace tools"
        className="sticky top-3 z-20 mt-5 flex gap-2 overflow-x-auto rounded-2xl border border-zinc-800 bg-black/90 p-2 shadow-2xl shadow-black/30 backdrop-blur"
      >
        {tabs.map(
          tab => {
            const selected =
              tab.id ===
              activeTab;

            return (
              <button
                key={
                  tab.id
                }
                type="button"
                role="tab"
                aria-selected={
                  selected
                }
                aria-controls={`advanced-panel-${tab.id}`}
                id={`advanced-tab-${tab.id}`}
                onClick={() =>
                  setActiveTab(
                    tab.id
                  )
                }
                className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-medium transition ${
                  selected
                    ? "border border-violet-500/30 bg-violet-500/10 text-violet-200"
                    : "border border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            );
          }
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-zinc-900 bg-zinc-950/40 px-4 py-3">
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-600">
          {active.label}
        </div>

        <p className="mt-1 text-xs leading-5 text-zinc-500">
          {active.description}
        </p>
      </div>

      <div
        id={`advanced-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`advanced-tab-${activeTab}`}
        className="min-w-0"
      >
        {content[
          activeTab
        ]}
      </div>
    </section>
  );
}
