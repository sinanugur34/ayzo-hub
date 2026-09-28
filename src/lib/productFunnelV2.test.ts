import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
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
