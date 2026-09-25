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
      className="group scroll-mt-24 overflow-hidden rounded-xl border border-[#26384f] bg-[#0b1727]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="text-[9px] font-semibold tracking-[0.15em] text-cyan-300">
            DETAILED EVIDENCE
          </div>

          <div className="hidden text-[11px] text-zinc-500 sm:block">
            Technical modules
          </div>
        </div>

        <span className="text-base text-zinc-500 transition-transform group-open:rotate-90">
          ›
        </span>
      </summary>

      <div className="space-y-5 border-t border-[#26384f] p-4 sm:p-5">
        {children}
      </div>
    </details>
  );
}
