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
    <div className="grid min-h-[760px] w-full grid-cols-1 overflow-visible bg-[#080f1d] lg:grid-cols-[76px_minmax(0,1fr)]">
      <nav
        aria-label="Analysis sections"
        className="hidden border-r border-[#26384f] bg-[#0a1424] lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:items-center lg:gap-[13px] lg:px-3 lg:py-6"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-xl text-[19px] font-extrabold tracking-[0.08em] text-cyan-300">
          ◢
        </div>

        <a
          href="#analysis-overview"
          title="Analysis overview"
          className="grid h-11 w-11 place-items-center rounded-xl bg-[#18334a] text-xl text-cyan-300"
        >
          ◫
          <span className="sr-only">
            Analysis overview
          </span>
        </a>

        <a
          href="#visual-evidence-graph"
          title="Relationship map"
          className="grid h-11 w-11 place-items-center rounded-xl text-xl text-[#94a8bf] transition hover:bg-[#18334a] hover:text-cyan-300"
        >
          ⌁
          <span className="sr-only">
            Relationship map
          </span>
        </a>

        <a
          href="#analysis-activity"
          title="Observed flows"
          className="grid h-11 w-11 place-items-center rounded-xl text-xl text-[#94a8bf] transition hover:bg-[#18334a] hover:text-cyan-300"
        >
          ≋
          <span className="sr-only">
            Observed flows
          </span>
        </a>

        <a
          href="#analysis-details"
          title="Detailed evidence"
          className="grid h-11 w-11 place-items-center rounded-xl text-xl text-[#94a8bf] transition hover:bg-[#18334a] hover:text-cyan-300"
        >
          ▤
          <span className="sr-only">
            Detailed evidence
          </span>
        </a>

        <div className="flex-1" />

        <span className="[writing-mode:vertical-rl] text-[10px] tracking-[0.15em] text-[#94a8bf]">
          AYZO EVIDENCE
        </span>
      </nav>

      <div className="mx-auto min-w-0 w-full max-w-[1540px] px-4 pb-[45px] pt-[25px] sm:px-4 lg:px-[clamp(16px,3vw,44px)]">
        {children}
      </div>
    </div>
  );
}
