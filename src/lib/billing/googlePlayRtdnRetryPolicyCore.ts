export const GOOGLE_PLAY_RTDN_STALE_PROCESSING_MS =
  5 * 60 * 1000;

export type GooglePlayRtdnProcessingStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed"
  | "ignored";

export function shouldTreatGooglePlayRtdnAsDuplicate(input: {
  status:
    GooglePlayRtdnProcessingStatus;

  processingStartedAt:
    string | null;

  nowMs:
    number;
}) {
  if (
    input.status === "processed" ||
    input.status === "ignored"
  ) {
    return true;
  }

  if (
    input.status !== "processing"
  ) {
    return false;
  }

  if (
    !input.processingStartedAt
  ) {
    return false;
  }

  const startedMs =
    Date.parse(
      input.processingStartedAt
    );

  if (
    !Number.isFinite(
      startedMs
    )
  ) {
    return false;
  }

  return (
    input.nowMs -
      startedMs <
    GOOGLE_PLAY_RTDN_STALE_PROCESSING_MS
  );
}

export function googlePlayRtdnStaleCutoffIso(
  nowMs: number
) {
  return new Date(
    nowMs -
      GOOGLE_PLAY_RTDN_STALE_PROCESSING_MS
  ).toISOString();
}
