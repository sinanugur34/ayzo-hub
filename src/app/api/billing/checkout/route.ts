import {
  getServerEntitlement,
} from "@/lib/billing/entitlement";

import {
  createProCheckoutSession,
  type ProBillingInterval,
} from "@/lib/billing/fastspring";

export const dynamic =
  "force-dynamic";

function isBillingInterval(
  value: unknown
): value is ProBillingInterval {
  return (
    value ===
      "monthly" ||
    value ===
      "annual"
  );
}

export async function POST(
  request: Request
) {
  const {
    entitlement,
    billingAvailable,
    userId,
  } =
    await getServerEntitlement();

  if (!userId) {
    return Response.json(
      {
        ok:
          false,
        error:
          "Authentication required.",
      },
      {
        status:
          401,
      }
    );
  }

  /*
   * If AYZO cannot safely
   * read billing state, do
   * not risk duplicate paid
   * subscriptions.
   */
  if (!billingAvailable) {
    return Response.json(
      {
        ok:
          false,
        error:
          "Billing state is temporarily unavailable.",
      },
      {
        status:
          503,
      }
    );
  }

  if (
    entitlement.planId ===
    "pro"
  ) {
    return Response.json(
      {
        ok:
          false,
        error:
          "A Pro subscription is already active.",
      },
      {
        status:
          409,
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
        ok:
          false,
        error:
          "Invalid request body.",
      },
      {
        status:
          400,
      }
    );
  }

  const interval =
    typeof body ===
      "object" &&
    body !==
      null &&
    "interval" in
      body
      ? (
          body as {
            interval?:
              unknown;
          }
        ).interval
      : null;

  if (
    !isBillingInterval(
      interval
    )
  ) {
    return Response.json(
      {
        ok:
          false,
        error:
          "Billing interval must be monthly or annual.",
      },
      {
        status:
          400,
      }
    );
  }

  try {
    const result =
      await createProCheckoutSession({
        userId,
        interval,
      });

    if (!result.ok) {
      /*
       * Do not expose FastSpring
       * response bodies or
       * credentials to the client.
       */
      console.error(
        "FastSpring checkout failed",
        {
          stage:
            result.stage,
          status:
            result.providerStatus,
        }
      );

      return Response.json(
        {
          ok:
            false,
          error:
            "Unable to start checkout.",
        },
        {
          status:
            502,
        }
      );
    }

    return Response.json(
      {
        ok:
          true,

        checkoutUrl:
          result.checkoutUrl,

        interval,
      },
      {
        status:
          201,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "FastSpring checkout configuration failed",
      error instanceof
        Error
        ? error.message
        : "unknown"
    );

    return Response.json(
      {
        ok:
          false,
        error:
          "Checkout is temporarily unavailable.",
      },
      {
        status:
          503,
      }
    );
  }
}
