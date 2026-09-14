import { getServerEntitlement } from "@/lib/billing/entitlement";

import { createCreemCustomerPortal } from "@/lib/billing/creem";

import { createCreemWebhookAdminClient } from "@/lib/billing/creemWebhookAdmin";

export const dynamic = "force-dynamic";

export async function POST() {
  const { entitlement, billingAvailable, userId } =
    await getServerEntitlement();

  if (!userId) {
    return Response.json(
      {
        ok: false,
        error: "Authentication required.",
      },
      {
        status: 401,
      },
    );
  }

  if (!billingAvailable) {
    return Response.json(
      {
        ok: false,
        error: "Billing state is temporarily unavailable.",
      },
      {
        status: 503,
      },
    );
  }

  if (entitlement.planId === "free") {
    return Response.json(
      {
        ok: false,
        error: "No paid subscription is available to manage.",
      },
      {
        status: 409,
      },
    );
  }

  let admin: ReturnType<typeof createCreemWebhookAdminClient>;

  try {
    admin = createCreemWebhookAdminClient();
  } catch {
    return Response.json(
      {
        ok: false,
        error: "Billing management is temporarily unavailable.",
      },
      {
        status: 503,
      },
    );
  }

  const { data: customer, error: customerError } = await admin
    .from("billing_customers")
    .select("provider_customer_id")
    .eq("user_id", userId)
    .eq("provider", "creem")
    .maybeSingle();

  if (customerError) {
    console.error("Creem portal customer lookup failed");

    return Response.json(
      {
        ok: false,
        error: "Billing management is temporarily unavailable.",
      },
      {
        status: 503,
      },
    );
  }

  const providerCustomerId = customer?.provider_customer_id;

  if (
    typeof providerCustomerId !== "string" ||
    providerCustomerId.length === 0
  ) {
    return Response.json(
      {
        ok: false,
        error: "Billing customer record is unavailable.",
      },
      {
        status: 409,
      },
    );
  }

  const result = await createCreemCustomerPortal(providerCustomerId);

  if (!result.ok) {
    console.error("Creem customer portal failed", {
      stage: result.stage,
      status: result.providerStatus,
    });

    return Response.json(
      {
        ok: false,
        error: "Unable to open subscription management.",
      },
      {
        status: result.stage === "config" ? 503 : 502,
      },
    );
  }

  return Response.redirect(result.portalUrl, 303);
}
