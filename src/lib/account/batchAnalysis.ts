export const MAX_BATCH_ANALYSIS_TARGETS =
  5;

export type BatchAnalysisParseResult =
  | {
      ok: true;
      targets: string[];
    }
  | {
      ok: false;
      error: string;
    };

export function parseBatchAnalysisTargets(
  value: string
): BatchAnalysisParseResult {
  const targets =
    value
      .split(/\r?\n/)
      .map(
        item =>
          item.trim()
      )
      .filter(Boolean);

  const unique =
    Array.from(
      new Set(
        targets
      )
    );

  if (
    unique.length ===
      0
  ) {
    return {
      ok: false,
      error:
        "Enter at least one address.",
    };
  }

  if (
    unique.length >
      MAX_BATCH_ANALYSIS_TARGETS
  ) {
    return {
      ok: false,
      error:
        `Batch Analysis supports up to ${MAX_BATCH_ANALYSIS_TARGETS} unique targets per run.`,
    };
  }

  return {
    ok: true,
    targets:
      unique,
  };
}

export function shouldStopBatchAfterStatus(
  status: number
) {
  return (
    status ===
      401 ||
    status ===
      403 ||
    status ===
      429 ||
    status ===
      503
  );
}
