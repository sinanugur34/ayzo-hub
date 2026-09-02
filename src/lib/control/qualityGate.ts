import type {
  QualityCheckId,
  QualityCheckResult,
  QualityGateResult,
} from "./types";

export function evaluateQualityGate(
  checks: readonly QualityCheckResult[],
  requiredChecks: readonly QualityCheckId[]
): QualityGateResult {
  const results = new Map(
    checks.map((check) => [
      check.id,
      check.status,
    ])
  );

  const passedChecks: QualityCheckId[] = [];
  const failedChecks: QualityCheckId[] = [];

  for (const id of requiredChecks) {
    if (results.get(id) === "pass") {
      passedChecks.push(id);
    } else {
      failedChecks.push(id);
    }
  }

  return {
    status:
      failedChecks.length === 0
        ? "pass"
        : "fail",
    requiredChecks,
    passedChecks,
    failedChecks,
  };
}
