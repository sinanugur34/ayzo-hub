import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAdminConversionRate,
  buildAdminConversionRates,
  formatAdminConversionRate,
} from "./adminConversionRatesCore";

test(
  "builds directional conversion rates from unique session counts",
  () => {
    const rates =
      buildAdminConversionRates({
        product_session_started: {
          sessions: 5,
        },

        analysis_submitted: {
          sessions: 3,
        },

        analysis_started: {
          sessions: 1,
        },

        intelligence_completed: {
          sessions: 1,
        },

        pricing_viewed: {
          sessions: 1,
        },

        checkout_started: {
          sessions: 0,
        },

        checkout_created: {
          sessions: 0,
        },

        subscription_paid: {
          sessions: 0,
        },
      });

    assert.equal(
      rates
        .sessionToSubmit
        .percent,
      60
    );

    assert.equal(
      rates
        .submitToStart
        .percent,
      33
    );

    assert.equal(
      rates
        .startToComplete
        .percent,
      100
    );

    assert.equal(
      rates
        .submitToComplete
        .percent,
      33
    );

    assert.equal(
      rates
        .sessionToPricing
        .percent,
      20
    );

    assert.equal(
      rates
        .pricingToCheckout
        .percent,
      0
    );
  }
);

test(
  "zero denominator is unavailable rather than a fake zero percent conversion",
  () => {
    const rate =
      buildAdminConversionRate(
        0,
        0
      );

    assert.equal(
      rate.percent,
      null
    );

    assert.equal(
      formatAdminConversionRate(
        rate
      ),
      "—"
    );
  }
);

test(
  "directional rates do not clamp values above one hundred percent",
  () => {
    const rate =
      buildAdminConversionRate(
        2,
        1
      );

    assert.equal(
      rate.percent,
      200
    );

    /*
     * These are windowed directional
     * signals, not strict sequential
     * cohorts. A value over 100% must
     * remain visible instead of being
     * silently hidden.
     */
    assert.equal(
      formatAdminConversionRate(
        rate
      ),
      "200%"
    );
  }
);

test(
  "malformed counts fail safe",
  () => {
    const rate =
      buildAdminConversionRate(
        Number.NaN,
        -1
      );

    assert.deepEqual(
      rate,
      {
        numerator: 0,
        denominator: 0,
        percent: null,
      }
    );
  }
);
