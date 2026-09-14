export const CREEM_WEBHOOK_STALE_PROCESSING_MS = 5 * 60 * 1000;

export type CreemWebhookProcessingStatus =
  "received" | "processing" | "processed" | "failed" | "ignored";

export function shouldTreatCreemWebhookAsDuplicate(input: {
  status: CreemWebhookProcessingStatus;

  processingStartedAt: string | null;

  nowMs: number;
}) {
  if (input.status === "processed" || input.status === "ignored") {
    return true;
  }

  if (input.status !== "processing") {
    return false;
  }

  if (!input.processingStartedAt) {
    return false;
  }

  const startedMs = Date.parse(input.processingStartedAt);

  if (!Number.isFinite(startedMs)) {
    return false;
  }

  return input.nowMs - startedMs < CREEM_WEBHOOK_STALE_PROCESSING_MS;
}

export function creemWebhookStaleCutoffIso(nowMs: number) {
  return new Date(nowMs - CREEM_WEBHOOK_STALE_PROCESSING_MS).toISOString();
}
