import "server-only";

import {
  parsePaidCheckoutEnabled,
} from "@/lib/billing/checkoutLaunchPolicyCore";

export const PAID_CHECKOUT_ENABLE_ENV =
  "AYZO_PAID_CHECKOUT_ENABLED";

export function isPaidCheckoutEnabled() {
  return parsePaidCheckoutEnabled(
    process.env[
      PAID_CHECKOUT_ENABLE_ENV
    ]
  );
}
