import {
  isRecord,
} from "@/lib/account/validation";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isEvidenceLockerUuid(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    uuidPattern.test(value)
  );
}

export function parseEvidenceLockerCreateInput(
  value: unknown
) {
  if (!isRecord(value)) {
    return null;
  }

  return isEvidenceLockerUuid(
    value.savedAnalysisId
  )
    ? {
        savedAnalysisId:
          value.savedAnalysisId,
      }
    : null;
}
