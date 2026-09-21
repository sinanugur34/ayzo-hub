import type {
  PlanId,
} from "../../src/lib/plans/types";

import type {
  MobileQuotaStatus,
} from "./mobileQuota";

function planName(
  plan: PlanId
) {
  switch (plan) {
    case "free":
      return "Free";

    case "pro":
      return "Pro";

    case "advanced":
      return "Advanced";
  }
}

function resetLabel(
  resetAt: number | null
) {
  if (!resetAt) {
    return "Reset time unavailable";
  }

  const remainingMs =
    Math.max(
      0,
      resetAt -
        Date.now()
    );

  const totalMinutes =
    Math.ceil(
      remainingMs /
        60_000
    );

  if (totalMinutes < 60) {
    return `Resets in ${totalMinutes}m`;
  }

  const hours =
    Math.floor(
      totalMinutes / 60
    );

  const minutes =
    totalMinutes % 60;

  return minutes > 0
    ? `Resets in ${hours}h ${minutes}m`
    : `Resets in ${hours}h`;
}

export default function MobileQuotaCard({
  plan,
  quota,
}: {
  plan: PlanId;
  quota: MobileQuotaStatus;
}) {
  const used =
    quota.remaining === null
      ? null
      : Math.max(
          0,
          quota.limit -
            quota.remaining
        );

  return (
    <div className="mobile-quota-card">
      <div className="mobile-quota-top">
        <div>
          <span>PLAN</span>
          <strong>
            {planName(plan)}
          </strong>
        </div>

        <div>
          <span>ANALYSES</span>
          <strong>
            {quota.remaining === null
              ? "Available"
              : `${quota.remaining}/${quota.limit} left`}
          </strong>
        </div>
      </div>

      {used !== null && (
        <div className="mobile-quota-track">
          <span
            style={{
              width:
                `${Math.min(
                  100,
                  (
                    used /
                    Math.max(
                      1,
                      quota.limit
                    )
                  ) *
                    100
                )}%`,
            }}
          />
        </div>
      )}

      <div className="mobile-quota-reset">
        {resetLabel(
          quota.resetAt
        )}
      </div>
    </div>
  );
}
