import type {
  ReactNode,
} from "react";

export default function AnalysisWorkspaceFrame({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <div className="grid w-full items-start gap-4 rounded-[28px] border border-[#14243a] bg-[#080f1d] p-3 sm:p-4 lg:grid-cols-[76px_minmax(0,1fr)]">
      <nav
        aria-label="Analysis sections"
        className="sticky top-24 hidden min-h-[430px] flex-col items-center gap-3 rounded-2xl border border-[#26384f] bg-[#0a1424] px-3 py-5 lg:flex"
      >
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/20 bg-[#18334a] text-lg font-bold text-cyan-300">
          ◢
        </div>

        <a
          href="#analysis-overview"
          title="Overview"
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#18334a] text-lg text-cyan-300"
        >
          ◫
          <span className="sr-only">Overview</span>
        </a>

        <a
          href="#visual-evidence-graph"
          title="Evidence map"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-zinc-500 transition hover:bg-[#18334a] hover:text-cyan-300"
        >
          ⌁
          <span className="sr-only">Evidence map</span>
        </a>

        <a
          href="#analysis-activity"
          title="Observed activity"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-zinc-500 transition hover:bg-[#18334a] hover:text-cyan-300"
        >
          ≋
          <span className="sr-only">Observed activity</span>
        </a>

        <a
          href="#analysis-details"
          title="Detailed evidence"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-lg text-zinc-500 transition hover:bg-[#18334a] hover:text-cyan-300"
        >
          ▤
          <span className="sr-only">Detailed evidence</span>
        </a>

        <div className="flex-1" />

        <span className="[writing-mode:vertical-rl] text-[8px] tracking-[0.18em] text-zinc-700">
          AYZO EVIDENCE
        </span>
      </nav>

      <div className="min-w-0">
        {children}
      </div>
    </div>
  );
}
