import "server-only";

import {
  parseProCheckoutEnabled,
} from "@/lib/billing/checkoutLaunchPolicyCore";

export const PRO_CHECKOUT_ENABLE_ENV =
  "AYZO_PRO_CHECKOUT_ENABLED";

export function isProCheckoutEnabled() {
  return parseProCheckoutEnabled(
    process.env[
      PRO_CHECKOUT_ENABLE_ENV
    ]
  );
}
