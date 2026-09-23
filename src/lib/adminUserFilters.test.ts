import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAdminUserFilters,
} from "./adminUserFilters";

test(
  "parses normalized admin user filters",
  () => {
    const result =
      parseAdminUserFilters({
        page:
          "2",
        perPage:
          "25",
        email:
          " test@example.com ",
        channel:
          "android",
        device:
          "phone",
        os:
          "android",
        country:
          "tr",
        from:
          "2026-09-01",
        to:
          "2026-09-23",
      });

    assert.equal(
      result.page,
      2
    );

    assert.equal(
      result.perPage,
      25
    );

    assert.equal(
      result.emailSearch,
      "test@example.com"
    );

    assert.equal(
      result.signupChannel,
      "android"
    );

    assert.equal(
      result.deviceClass,
      "phone"
    );

    assert.equal(
      result.osFamily,
      "android"
    );

    assert.equal(
      result.countryCode,
      "TR"
    );

    assert.equal(
      result.createdFrom,
      "2026-09-01T00:00:00.000Z"
    );

    assert.equal(
      result.createdTo,
      "2026-09-24T00:00:00.000Z"
    );
  }
);

test(
  "fails closed for unsupported filter values",
  () => {
    const result =
      parseAdminUserFilters({
        channel:
          "desktop-app",
        device:
          "console",
        os:
          "beos",
        country:
          "TUR",
      });

    assert.equal(
      result.signupChannel,
      null
    );

    assert.equal(
      result.deviceClass,
      null
    );

    assert.equal(
      result.osFamily,
      null
    );

    assert.equal(
      result.countryCode,
      null
    );
  }
);

test(
  "supports unknown historical signup metadata",
  () => {
    const result =
      parseAdminUserFilters({
        channel:
          "unknown",
        device:
          "unknown",
        os:
          "unknown",
        country:
          "unknown",
      });

    assert.equal(
      result.signupChannel,
      "unknown"
    );

    assert.equal(
      result.deviceClass,
      "unknown"
    );

    assert.equal(
      result.osFamily,
      "unknown"
    );

    assert.equal(
      result.countryCode,
      "unknown"
    );
  }
);

test(
  "bounds pagination",
  () => {
    const result =
      parseAdminUserFilters({
        page:
          "-10",
        perPage:
          "9000",
      });

    assert.equal(
      result.page,
      1
    );

    assert.equal(
      result.perPage,
      100
    );
  }
);

test(
  "parses billing filters",
  () => {
    const result =
      parseAdminUserFilters({
        plan:
          "advanced",
        provider:
          "google_play",
        status:
          "canceling",
        interval:
          "annual",
      });

    assert.equal(
      result.plan,
      "advanced"
    );

    assert.equal(
      result.provider,
      "google_play"
    );

    assert.equal(
      result.subscriptionStatus,
      "canceling"
    );

    assert.equal(
      result.billingInterval,
      "annual"
    );
  }
);

test(
  "fails closed for unsupported billing filters",
  () => {
    const result =
      parseAdminUserFilters({
        plan:
          "enterprise",
        provider:
          "stripe",
        status:
          "refunded",
        interval:
          "weekly",
      });

    assert.equal(
      result.plan,
      null
    );

    assert.equal(
      result.provider,
      null
    );

    assert.equal(
      result.subscriptionStatus,
      null
    );

    assert.equal(
      result.billingInterval,
      null
    );
  }
);
