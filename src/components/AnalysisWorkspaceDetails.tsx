import type {
  ReactNode,
} from "react";

export default function AnalysisWorkspaceDetails({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <details
      id="analysis-details"
      className="group scroll-mt-24 overflow-hidden rounded-2xl border border-[#26384f] bg-[#0e1a2b]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-4 sm:px-6">
        <div>
          <div className="text-[10px] font-semibold tracking-[0.16em] text-cyan-300">
            DETAILED EVIDENCE
          </div>

          <div className="mt-1 text-sm font-semibold text-zinc-100">
            Open technical evidence modules
          </div>

          <p className="mt-1 text-[10px] text-zinc-500">
            Raw modules, methodology and bounded evidence remain available here.
          </p>
        </div>

        <span className="text-xl text-zinc-500 transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>

      <div className="space-y-5 border-t border-[#26384f] p-4 sm:p-5">
        {children}
      </div>
    </details>
  );
}
