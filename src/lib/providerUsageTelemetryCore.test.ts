import assert from "node:assert/strict";
import test from "node:test";

import {
  buildProviderUsageEvent,
  normalizeProviderUsageContext,
  summarizeProviderUsage,
} from "./providerUsageTelemetryCore";

const CONTEXT = {
  analysisId:
    "11111111-1111-4111-8111-111111111111",

  userId:
    "22222222-2222-4222-8222-222222222222",

  platform:
    "web" as const,

  planId:
    "advanced" as const,

  network:
    "bitcoin",
};

test(
  "normalizes bounded provider telemetry context",
  () => {
    assert.deepEqual(
      normalizeProviderUsageContext(
        CONTEXT
      ),
      CONTEXT
    );
  }
);

test(
  "rejects malformed analysis identifiers",
  () => {
    assert.throws(
      () =>
        normalizeProviderUsageContext({
          ...CONTEXT,

          analysisId:
            "not-a-uuid",
        })
    );
  }
);

test(
  "builds privacy-bounded provider usage events",
  () => {
    const event =
      buildProviderUsageEvent(
        CONTEXT,
        {
          provider:
            "alchemy",

          operation:
            "bitcoin.getrawtransaction",

          outcome:
            "success",

          latencyMs:
            45.4,

          httpStatus:
            200,

          attempt:
            1,

          estimatedUnits:
            5,

          metadata: {
            method:
              "getrawtransaction",

            page:
              2,

            cache:
              false,

            /*
             * These privacy-sensitive keys
             * must never survive normalization.
             */
            address:
              "secret-address",

            wallet:
              "secret-wallet",

            api_key:
              "secret-key",

            payload:
              "secret-payload",
          },
        }
      );

    assert.equal(
      event.provider,
      "alchemy"
    );

    assert.equal(
      event.operation,
      "bitcoin.getrawtransaction"
    );

    assert.equal(
      event.latencyMs,
      45
    );

    assert.deepEqual(
      event.metadata,
      {
        method:
          "getrawtransaction",

        page:
          2,

        cache:
          false,
      }
    );
  }
);

test(
  "summarizes requests failures fallbacks cache and units",
  () => {
    const events = [
      buildProviderUsageEvent(
        CONTEXT,
        {
          provider:
            "goldrush",

          operation:
            "bitcoin.history",

          outcome:
            "upstream_error",

          latencyMs:
            100,

          fallbackUsed:
            false,

          estimatedUnits:
            2,
        }
      ),

      buildProviderUsageEvent(
        CONTEXT,
        {
          provider:
            "mempool",

          operation:
            "bitcoin.history",

          outcome:
            "success",

          latencyMs:
            40,

          fallbackUsed:
            true,

          estimatedUnits:
            1,
        }
      ),

      buildProviderUsageEvent(
        CONTEXT,
        {
          provider:
            "alchemy",

          operation:
            "bitcoin.canonical",

          outcome:
            "cache_hit",

          latencyMs:
            0,

          cacheHit:
            true,

          estimatedUnits:
            0,
        }
      ),
    ];

    const rows =
      summarizeProviderUsage(
        events
      );

    assert.equal(
      rows.length,
      3
    );

    const mempool =
      rows.find(
        row =>
          row.provider ===
          "mempool"
      );

    assert.ok(
      mempool
    );

    assert.equal(
      mempool.fallbackCount,
      1
    );

    const alchemy =
      rows.find(
        row =>
          row.provider ===
          "alchemy"
      );

    assert.ok(
      alchemy
    );

    assert.equal(
      alchemy.cacheHitCount,
      1
    );

    assert.equal(
      alchemy.successCount,
      1
    );
  }
);

test(
  "bounds pathological telemetry values",
  () => {
    const event =
      buildProviderUsageEvent(
        CONTEXT,
        {
          provider:
            "x".repeat(
              100
            ),

          operation:
            "y".repeat(
              200
            ),

          outcome:
            "timeout",

          latencyMs:
            99_999_999,

          attempt:
            999,

          estimatedUnits:
            Number.POSITIVE_INFINITY,
        }
      );

    assert.equal(
      event.provider.length,
      64
    );

    assert.equal(
      event.operation.length,
      120
    );

    assert.equal(
      event.latencyMs,
      3_600_000
    );

    assert.equal(
      event.attempt,
      20
    );

    assert.equal(
      event.estimatedUnits,
      null
    );
  }
);


test(
  "cache-hit events do not inflate physical request count",
  () => {
    const rows =
      summarizeProviderUsage([
        buildProviderUsageEvent(
          CONTEXT,
          {
            provider:
              "goldrush",

            operation:
              "evm.transactions",

            outcome:
              "cache_hit",

            cacheHit:
              true,

            estimatedUnits:
              0,
          }
        ),
      ]);

    assert.equal(
      rows.length,
      1
    );

    assert.equal(
      rows[0]?.requestCount,
      0
    );

    assert.equal(
      rows[0]?.cacheHitCount,
      1
    );
  }
);
