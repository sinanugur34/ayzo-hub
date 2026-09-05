export const ALERT_RUNNER_LOCK_PREFIX =
  "ayzo:alerts:evaluator:v1";

export const ALERT_RUNNER_LOCK_TTL_SECONDS =
  300;

export interface AlertRunnerLease {
  release(): Promise<boolean>;
}

export interface AlertRunnerLeaseProvider {
  acquire(): Promise<AlertRunnerLease | null>;
}

export type AlertRunnerExecutionResult<T> =
  | {
      status: "skipped";
      reason: "already_running";
    }
  | {
      status: "executed";
      value: T;
      released: boolean;
    };

function normalizeLockSegment(
  value: string | undefined,
  fallback: string
) {
  const normalized =
    value
      ?.trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9._-]+/g,
        "_"
      )
      .replace(
        /^_+|_+$/g,
        ""
      )
      .slice(
        0,
        80
      ) ?? "";

  return normalized || fallback;
}

export function buildAlertRunnerLockKey(
  environment: string | undefined,
  branch: string | undefined
) {
  const environmentSegment =
    normalizeLockSegment(
      environment,
      "local"
    );

  if (
    environmentSegment ===
    "preview"
  ) {
    return [
      ALERT_RUNNER_LOCK_PREFIX,
      "preview",
      normalizeLockSegment(
        branch,
        "unknown"
      ),
    ].join(":");
  }

  return [
    ALERT_RUNNER_LOCK_PREFIX,
    environmentSegment,
  ].join(":");
}

export async function runWithAlertRunnerLease<T>(
  provider: AlertRunnerLeaseProvider,
  task: () => Promise<T>
): Promise<AlertRunnerExecutionResult<T>> {
  const lease =
    await provider.acquire();

  if (!lease) {
    return {
      status: "skipped",
      reason: "already_running",
    };
  }

  try {
    const value =
      await task();

    let released =
      false;

    try {
      released =
        await lease.release();
    } catch {
      released =
        false;
    }

    return {
      status: "executed",
      value,
      released,
    };
  } catch (error) {
    try {
      await lease.release();
    } catch {
      // TTL remains the final safety net.
    }

    throw error;
  }
}
