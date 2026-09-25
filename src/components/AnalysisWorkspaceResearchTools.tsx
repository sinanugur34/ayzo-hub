import type {
  ReactNode,
} from "react";

export default function AnalysisWorkspaceResearchTools({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <details
      id="analysis-tools"
      className="group scroll-mt-24 overflow-hidden rounded-xl border border-violet-500/15 bg-[#0b1727]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="text-[9px] font-semibold tracking-[0.15em] text-violet-300">
            RESEARCH TOOLS
          </div>

          <div className="hidden text-[11px] text-zinc-500 sm:block">
            Save, monitor and continue
          </div>
        </div>

        <span className="text-base text-zinc-500 transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>

      <div className="border-t border-[#26384f] p-4 sm:p-5">
        {children}
      </div>
    </details>
  );
}
