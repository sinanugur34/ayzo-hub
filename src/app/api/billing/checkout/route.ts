import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

import {
  isProCheckoutEnabled,
} from "@/lib/billing/checkoutLaunchPolicy";

import {
  createCreemCheckout,
} from "@/lib/billing/creem";

import type {
  BillingInterval,
} from "@/lib/plans/types";

export const dynamic =
  "force-dynamic";

type PaidPlan =
  "pro" |
  "advanced";

function isBillingInterval(
  value: unknown
): value is BillingInterval {
  return (
    value === "monthly" ||
    value === "annual"
  );
}

function isPaidPlan(
  value: unknown
): value is PaidPlan {
  return (
    value === "pro" ||
    value === "advanced"
  );
}

export async function POST(
  request: Request
) {
  const {
    entitlement,
    billingAvailable,
    userId,
    userEmail,
  } =
    await getServerEntitlement();

  if (!userId) {
    return Response.json(
      {
        ok: false,
        error:
          "Authentication required.",
      },
      {
        status: 401,
      }
    );
  }

  if (!billingAvailable) {
    return Response.json(
      {
        ok: false,
        error:
          "Billing state is temporarily unavailable.",
      },
      {
        status: 503,
      }
    );
  }

  if (
    !isProCheckoutEnabled()
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Paid checkout is temporarily unavailable.",
      },
      {
        status: 503,
      }
    );
  }

  let body:
    unknown;

  try {
    body =
      await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        error:
          "Invalid request body.",
      },
      {
        status: 400,
      }
    );
  }

  const record =
    typeof body === "object" &&
    body !== null
      ? body as Record<
          string,
          unknown
        >
      : null;

  const plan =
    record?.plan;

  const interval =
    record?.interval;

  if (
    !isPaidPlan(
      plan
    )
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Plan must be pro or advanced.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    !isBillingInterval(
      interval
    )
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Billing interval must be monthly or annual.",
      },
      {
        status: 400,
      }
    );
  }

  /*
   * Never create a second checkout
   * for the currently active plan.
   */
  if (
    entitlement.planId ===
      plan
  ) {
    return Response.json(
      {
        ok: false,
        error:
          `An ${plan} subscription is already active.`,
      },
      {
        status: 409,
      }
    );
  }

  /*
   * Downgrades are intentionally
   * not handled through purchase.
   */
  if (
    entitlement.planId ===
      "advanced" &&
    plan === "pro"
  ) {
    return Response.json(
      {
        ok: false,
        error:
          "Advanced accounts cannot purchase Pro through upgrade checkout.",
      },
      {
        status: 409,
      }
    );
  }

  const result =
    await createCreemCheckout({
      userId,
      userEmail,
      planId:
        plan,
      interval,
    });

  if (!result.ok) {
    console.error(
      "Creem checkout failed",
      {
        stage:
          result.stage,
        status:
          result.providerStatus,
      }
    );

    return Response.json(
      {
        ok: false,
        error:
          "Unable to start checkout.",
      },
      {
        status:
          result.stage ===
            "config"
            ? 503
            : 502,
      }
    );
  }

  return Response.json(
    {
      ok: true,
      checkoutUrl:
        result.checkoutUrl,
      plan,
      interval,
    },
    {
      status: 201,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
