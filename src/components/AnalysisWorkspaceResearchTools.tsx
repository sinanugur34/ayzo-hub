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
      className="group scroll-mt-24 overflow-hidden rounded-2xl border border-violet-500/20 bg-[#0e1a2b]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 sm:px-6">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.16em] text-violet-300">
            RESEARCH & INVESTIGATION TOOLS
          </div>

          <div className="mt-1 text-sm font-semibold text-zinc-100">
            Save, monitor and continue this investigation
          </div>

          <p className="mt-1 text-[10px] text-zinc-500">
            Available tools follow your live AYZO plan and network support.
          </p>
        </div>

        <span className="text-xl text-zinc-500 transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>

      <div className="border-t border-[#26384f] p-4 sm:p-5">
        {children}
      </div>
    </details>
  );
}
