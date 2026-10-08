/**
 * Address shape and provider availability must never silently decide a chain.
 * A preselected chain is an explicit fallback after discovery completes,
 * while a unique verified contract may replace the earlier selection.
 */
export type NetworkDetectionStatus =
  | "pending" | "single" | "multiple" | "none" | "partial" | null;

export function isNetworkSelectionBlocked(input: {
  address: string;
  detectionStatus: NetworkDetectionStatus;
  selectedForThisAddress: boolean;
  selectedBeforePasting: boolean;
}): boolean {
  const value = input.address.trim();
  if (value.length < 20) return false;
  if (input.selectedForThisAddress) return false;
  if (input.detectionStatus === "single") return false;
  // Do not race the async network detection response on an old selection.
  if (input.detectionStatus === "pending" || input.detectionStatus === null) {
    return true;
  }
  // No confident single match: an earlier explicit choice is a valid fallback.
  return !input.selectedBeforePasting;
}
