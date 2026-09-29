import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminAuthenticatedAttribution,
  formatAdminAttributionCoverage,
  isCanonicalAdminAttributionEvent,
  totalAdminAttributionUsers,
} from "./adminAttributionCore";

test(
  "builds privacy-safe authenticated acquisition attribution",
  () => {
    const result =
      buildAdminAuthenticatedAttribution([
        {
          metric:
            "coverage",
          dimension:
            "tracking",
          value:
            "recorded",
          total:
            3,
        },
        {
          metric:
            "coverage",
          dimension:
            "tracking",
          value:
            "unknown",
          total:
            1,
        },
        {
          metric:
            "analysis_submitted",
          dimension:
            "channel",
          value:
            "web",
          total:
            2,
        },
        {
          metric:
            "analysis_submitted",
          dimension:
            "channel",
          value:
            "android",
          total:
            1,
        },
        {
          metric:
            "intelligence_completed",
          dimension:
            "country",
          value:
            "TR",
          total:
            2,
        },
        {
          metric:
            "pricing_viewed",
          dimension:
            "device",
          value:
            "desktop",
          total:
            1,
        },
      ]);

    assert.deepEqual(
      result.coverage,
      {
        recorded: 3,
        unknown: 1,
        total: 4,
        percent: 75,
      }
    );

    assert.deepEqual(
      result
        .events
        .analysis_submitted
        .channel,
      [
        {
          value:
            "web",
          total:
            2,
        },
        {
          value:
            "android",
          total:
            1,
        },
      ]
    );

    assert.equal(
      totalAdminAttributionUsers(
        result
          .events
          .analysis_submitted
          .channel
      ),
      3
    );
  }
);

test(
  "zero authenticated attribution coverage is unavailable",
  () => {
    const result =
      buildAdminAuthenticatedAttribution(
        []
      );

    assert.equal(
      result.coverage.percent,
      null
    );

    assert.equal(
      formatAdminAttributionCoverage(
        result.coverage.percent
      ),
      "—"
    );
  }
);

test(
  "unknown signup metadata remains visible",
  () => {
    const result =
      buildAdminAuthenticatedAttribution([
        {
          metric:
            "checkout_created",
          dimension:
            "country",
          value:
            "unknown",
          total:
            2,
        },
      ]);

    assert.deepEqual(
      result
        .events
        .checkout_created
        .country,
      [
        {
          value:
            "unknown",
          total:
            2,
        },
      ]
    );
  }
);

test(
  "unsupported metrics and dimensions are ignored",
  () => {
    const result =
      buildAdminAuthenticatedAttribution([
        {
          metric:
            "private_event",
          dimension:
            "channel",
          value:
            "web",
          total:
            99,
        },
        {
          metric:
            "analysis_submitted",
          dimension:
            "email",
          value:
            "secret",
          total:
            99,
        },
      ]);

    assert.deepEqual(
      result
        .events
        .analysis_submitted
        .channel,
      []
    );
  }
);

test(
  "attribution event allowlist stays canonical",
  () => {
    assert.equal(
      isCanonicalAdminAttributionEvent(
        "analysis_submitted"
      ),
      true
    );

    assert.equal(
      isCanonicalAdminAttributionEvent(
        "subscription_paid"
      ),
      true
    );

    assert.equal(
      isCanonicalAdminAttributionEvent(
        "not_real"
      ),
      false
    );
  }
);
