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
    <div className="grid w-full items-start gap-4 lg:grid-cols-[64px_minmax(0,1fr)]">
      <nav
        aria-label="Analysis sections"
        className="sticky top-24 hidden flex-col items-center gap-3 rounded-2xl border border-[#26384f] bg-[#0a1424]/95 p-2.5 backdrop-blur lg:flex"
      >
        <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] text-sm font-bold text-cyan-300">
          ◢
        </div>

        <a
          href="#analysis-overview"
          title="Evidence overview"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-lg text-zinc-500 transition hover:bg-cyan-500/10 hover:text-cyan-300"
        >
          ◫
          <span className="sr-only">
            Evidence overview
          </span>
        </a>

        <a
          href="#visual-evidence-graph"
          title="Evidence graph"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-zinc-500 transition hover:bg-cyan-500/10 hover:text-cyan-300"
        >
          ⌁
          <span className="sr-only">
            Evidence graph
          </span>
        </a>

        <a
          href="#analysis-timeline"
          title="Activity timeline"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-xl text-zinc-500 transition hover:bg-cyan-500/10 hover:text-cyan-300"
        >
          ≋
          <span className="sr-only">
            Activity timeline
          </span>
        </a>
      </nav>

      <div className="min-w-0">
        {children}
      </div>
    </div>
  );
}
