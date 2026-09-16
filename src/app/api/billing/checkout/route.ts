import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

import {
  isPaidCheckoutEnabled,
} from "@/lib/billing/checkoutLaunchPolicy";

import {
  resolveCheckoutAction,
} from "@/lib/billing/checkoutActionCore";

import {
  createCreemCheckout,
  upgradeCreemSubscription,
} from "@/lib/billing/creem";

import {
  createCreemWebhookAdminClient,
} from "@/lib/billing/creemWebhookAdmin";

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
    !isPaidCheckoutEnabled()
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

  const confirmUpgrade =
    record?.confirmUpgrade ===
      true;

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

  const checkoutAction =
    resolveCheckoutAction({
      currentPlan:
        entitlement.planId,
      targetPlan:
        plan,
      confirmUpgrade,
    });

  if (
    checkoutAction ===
      "same-plan"
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

  if (
    checkoutAction ===
      "downgrade-blocked"
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

  if (
    checkoutAction ===
      "upgrade-confirmation"
  ) {
    return Response.json(
      {
        ok: false,
        upgradeConfirmationRequired:
          true,
        error:
          "Confirm upgrade to AYZO Advanced. Creem may charge a prorated amount immediately.",
      },
      {
        status: 409,
      }
    );
  }

  /*
   * Existing Pro subscriptions must be
   * upgraded in-place at Creem.
   *
   * Never create a second subscription
   * through checkout.
   */
  if (
    checkoutAction ===
      "upgrade"
  ) {

    let admin:
      ReturnType<
        typeof createCreemWebhookAdminClient
      >;

    try {
      admin =
        createCreemWebhookAdminClient();
    } catch {
      return Response.json(
        {
          ok: false,
          error:
            "Billing management is temporarily unavailable.",
        },
        {
          status: 503,
        }
      );
    }

    const {
      data:
        subscriptions,
      error:
        subscriptionError,
    } =
      await admin
        .from(
          "subscriptions"
        )
        .select(
          "provider_subscription_id,status"
        )
        .eq(
          "user_id",
          userId
        )
        .eq(
          "provider",
          "creem"
        )
        .in(
          "status",
          [
            "active",
            "canceling",
          ]
        );

    if (
      subscriptionError ||
      !Array.isArray(
        subscriptions
      )
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Unable to resolve the current subscription.",
        },
        {
          status: 503,
        }
      );
    }

    const providerIds =
      subscriptions
        .map(
          row =>
            row
              .provider_subscription_id
        )
        .filter(
          (
            value
          ): value is string =>
            typeof value ===
              "string" &&
            value.length > 0
        );

    if (
      providerIds.length !==
        1
    ) {
      console.error(
        "Creem upgrade subscription invariant failed",
        {
          count:
            providerIds.length,
        }
      );

      return Response.json(
        {
          ok: false,
          error:
            "Unable to safely upgrade the current subscription.",
        },
        {
          status: 409,
        }
      );
    }

    const result =
      await upgradeCreemSubscription({
        providerSubscriptionId:
          providerIds[0],
        planId:
          "advanced",
        interval,
      });

    if (!result.ok) {
      console.error(
        "Creem subscription upgrade failed",
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
            "Unable to upgrade the subscription.",
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
        upgraded:
          true,
        plan:
          "advanced",
        interval,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
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
