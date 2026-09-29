import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  isProductAnalyticsSessionId,
  sanitizeProductEventPayload,
} from "./productAnalyticsCore";

const migration =
  fs.readFileSync(
    "supabase/migrations/20260928203000_product_conversion_funnel_v2.sql",
    "utf8"
  );

const route =
  fs.readFileSync(
    "src/app/api/analytics/event/route.ts",
    "utf8"
  );

const reader =
  fs.readFileSync(
    "src/lib/adminConversionFunnel.ts",
    "utf8"
  );

const checkoutButton =
  fs.readFileSync(
    "src/components/billing/PlanCheckoutButton.tsx",
    "utf8"
  );

const checkoutRoute =
  fs.readFileSync(
    "src/app/api/billing/checkout/route.ts",
    "utf8"
  );

const creemCheckout =
  fs.readFileSync(
    "src/lib/billing/creem.ts",
    "utf8"
  );

const creemProcessor =
  fs.readFileSync(
    "src/lib/billing/creemSubscriptionProcessor.ts",
    "utf8"
  );

const creemWebhook =
  fs.readFileSync(
    "src/app/api/billing/webhooks/creem/route.ts",
    "utf8"
  );

const adminPage =
  fs.readFileSync(
    "src/app/admin/page.tsx",
    "utf8"
  );

test(
  "product funnel accepts only canonical event names and UUID sessions",
  () => {
    const valid =
      sanitizeProductEventPayload({
        eventName:
          "pricing_viewed",

        sessionId:
          "11111111-1111-4111-8111-111111111111",

        properties: {
          surface:
            "home",

          plan:
            "free",
        },
      });

    assert.equal(
      valid?.eventName,
      "pricing_viewed"
    );

    for (
      const eventName of [
        "analysis_started",
        "intelligence_completed",
        "analysis_failed",
        "analysis_quota_blocked",
      ]
    ) {
      const lifecycle =
        sanitizeProductEventPayload({
          eventName,

          sessionId:
            "11111111-1111-4111-8111-111111111111",

          properties: {
            network:
              "ethereum",

            feature:
              "ethereum_intelligence",
          },
        });

      assert.equal(
        lifecycle?.eventName,
        eventName
      );
    }

    assert.equal(
      sanitizeProductEventPayload({
        eventName:
          "unknown_event",

        sessionId:
          "11111111-1111-4111-8111-111111111111",
      }),
      null
    );
  }
);

test(
  "analytics attribution accepts only canonical UUID sessions",
  () => {
    assert.equal(
      isProductAnalyticsSessionId(
        "11111111-1111-4111-8111-111111111111"
      ),
      true
    );

    assert.equal(
      isProductAnalyticsSessionId(
        "not-a-session"
      ),
      false
    );

    const paid =
      sanitizeProductEventPayload({
        eventName:
          "subscription_paid",

        sessionId:
          "11111111-1111-4111-8111-111111111111",

        properties: {
          provider:
            "creem",

          plan:
            "pro",

          interval:
            "monthly",

          source:
            "verified_webhook",
        },
      });

    assert.equal(
      paid?.eventName,
      "subscription_paid"
    );
  }
);

test(
  "checkout attribution is consent-backed and provider metadata is server validated",
  () => {
    assert.match(
      checkoutButton,
      /getAnalyticsAttributionSessionId/
    );

    assert.match(
      checkoutButton,
      /analyticsSessionId/
    );

    assert.match(
      checkoutRoute,
      /isProductAnalyticsSessionId/
    );

    assert.match(
      creemCheckout,
      /ayzo_analytics_session_id/
    );
  }
);

test(
  "verified paid telemetry is written only after webhook finalization",
  () => {
    const finalizeGuard =
      creemWebhook.indexOf(
        "finalizeError ||"
      );

    const analyticsWrite =
      creemWebhook.indexOf(
        "await recordProductEvent"
      );

    assert.ok(
      finalizeGuard >= 0
    );

    assert.ok(
      analyticsWrite >
        finalizeGuard
    );

    assert.match(
      creemWebhook,
      /eventName:\s*"subscription_paid"/
    );

    assert.match(
      creemWebhook,
      /source:\s*"verified_webhook"/
    );

    assert.match(
      creemProcessor,
      /Existing subscriptions include[\s\S]*renewals[\s\S]*paidConversion:\s*null/
    );
  }
);

test(
  "Admin funnel separates checkout creation from verified payment",
  () => {
    assert.match(
      adminPage,
      /\.checkout_created/
    );

    assert.match(
      adminPage,
      /\.subscription_paid/
    );

    assert.match(
      adminPage,
      /Verified paid/
    );
  }
);

test(
  "sensitive analytics properties are discarded",
  () => {
    const value =
      sanitizeProductEventPayload({
        eventName:
          "analysis_submitted",

        sessionId:
          "11111111-1111-4111-8111-111111111111",

        properties: {
          network:
            "ethereum",

          surface:
            "home",

          address:
            "0xSECRET",

          subjectValue:
            "wallet-secret",

          email:
            "person@example.com",

          question:
            "private question",

          transactionHash:
            "secret-hash",
        },
      });

    assert.deepEqual(
      value?.properties,
      {
        network:
          "ethereum",

        surface:
          "home",
      }
    );
  }
);

test(
  "product event storage is server only and RLS protected",
  () => {
    assert.match(
      migration,
      /alter table public\.product_events\s+enable row level security/i
    );

    assert.match(
      migration,
      /revoke all[\s\S]*product_events[\s\S]*anon, authenticated/i
    );

    assert.match(
      migration,
      /raw IP addresses/i
    );
  }
);

test(
  "analytics API is bounded and telemetry failure does not control product behavior",
  () => {
    assert.match(
      route,
      /4096/
    );

    assert.match(
      route,
      /checkRateLimit/
    );

    assert.match(
      route,
      /recordProductEvent/
    );

    assert.match(
      route,
      /202/
    );
  }
);

test(
  "Admin funnel fails soft when telemetry dependency is unavailable",
  () => {
    assert.match(
      reader,
      /available:\s*false/
    );

    assert.match(
      reader,
      /ayzo_admin_product_funnel/
    );
  }
);

test(
  "Admin funnel RPC uses invoker rights instead of SECURITY DEFINER",
  () => {
    assert.doesNotMatch(
      migration,
      /security\s+definer/i
    );

    assert.match(
      migration,
      /security\s+invoker/i
    );

    assert.match(
      migration,
      /set\s+search_path\s*=\s*''/i
    );
  }
);

test(
  "product funnel grants only required service-role table access",
  () => {
    assert.match(
      migration,
      /grant\s+select,\s*insert[\s\S]*public\.product_events[\s\S]*service_role/i
    );

    assert.match(
      migration,
      /revoke\s+all[\s\S]*public\.product_events[\s\S]*public,\s*anon,\s*authenticated/i
    );
  }
);

test(
  "Admin funnel RPC execution remains service-role only",
  () => {
    assert.match(
      migration,
      /revoke\s+all[\s\S]*ayzo_admin_product_funnel[\s\S]*public,\s*anon,\s*authenticated/i
    );

    assert.match(
      migration,
      /grant\s+execute[\s\S]*ayzo_admin_product_funnel[\s\S]*service_role/i
    );
  }
);
