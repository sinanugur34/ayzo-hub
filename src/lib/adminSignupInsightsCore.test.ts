import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminSignupInsights,
} from "./adminSignupInsightsCore";

test(
  "builds normalized signup insights",
  () => {
    const result =
      buildAdminSignupInsights([
        {
          dimension:
            "tracking",
          value:
            "recorded",
          total:
            "8",
        },
        {
          dimension:
            "tracking",
          value:
            "unknown",
          total:
            2,
        },
        {
          dimension:
            "period",
          value:
            "last_7d",
          total:
            4,
        },
        {
          dimension:
            "period",
          value:
            "last_30d",
          total:
            9,
        },
        {
          dimension:
            "channel",
          value:
            "web",
          total:
            6,
        },
        {
          dimension:
            "channel",
          value:
            "android",
          total:
            2,
        },
        {
          dimension:
            "device",
          value:
            "desktop",
          total:
            5,
        },
        {
          dimension:
            "device",
          value:
            "phone",
          total:
            3,
        },
        {
          dimension:
            "country",
          value:
            "TR",
          total:
            5,
        },
        {
          dimension:
            "country",
          value:
            "US",
          total:
            3,
        },
      ]);

    assert.equal(
      result.tracking.recorded,
      8
    );

    assert.equal(
      result.tracking.unknown,
      2
    );

    assert.equal(
      result.period.last7d,
      4
    );

    assert.equal(
      result.period.last30d,
      9
    );

    assert.equal(
      result.channel.web,
      6
    );

    assert.equal(
      result.channel.android,
      2
    );

    assert.equal(
      result.device.desktop,
      5
    );

    assert.equal(
      result.countries[0]?.code,
      "TR"
    );
  }
);

test(
  "fails safe for malformed counts",
  () => {
    const result =
      buildAdminSignupInsights([
        {
          dimension:
            "channel",
          value:
            "web",
          total:
            "not-a-number",
        },
      ]);

    assert.equal(
      result.channel.web,
      0
    );
  }
);
