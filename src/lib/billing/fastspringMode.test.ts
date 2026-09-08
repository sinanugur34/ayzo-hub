import assert from "node:assert/strict";
import test from "node:test";

import {
  fastSpringCheckoutHost,
  fastSpringEventMatchesMode,
  fastSpringModeIsLive,
  parseFastSpringMode,
} from "@/lib/billing/fastspringMode";

test(
  "parses FastSpring test mode",
  () => {
    assert.equal(
      parseFastSpringMode(
        "test"
      ),
      "test"
    );
  }
);

test(
  "parses FastSpring live mode",
  () => {
    assert.equal(
      parseFastSpringMode(
        "live"
      ),
      "live"
    );
  }
);

test(
  "rejects missing FastSpring mode",
  () => {
    assert.throws(
      () =>
        parseFastSpringMode(
          undefined
        )
    );
  }
);

test(
  "rejects invalid FastSpring mode",
  () => {
    assert.throws(
      () =>
        parseFastSpringMode(
          "production"
        )
    );
  }
);

test(
  "maps FastSpring mode to session live flag",
  () => {
    assert.equal(
      fastSpringModeIsLive(
        "test"
      ),
      false
    );

    assert.equal(
      fastSpringModeIsLive(
        "live"
      ),
      true
    );
  }
);

test(
  "uses test checkout host in test mode",
  () => {
    assert.equal(
      fastSpringCheckoutHost(
        "ayzo",
        "test"
      ),
      "ayzo.test.onfastspring.com"
    );
  }
);

test(
  "uses live checkout host in live mode",
  () => {
    assert.equal(
      fastSpringCheckoutHost(
        "ayzo",
        "live"
      ),
      "ayzo.onfastspring.com"
    );
  }
);

test(
  "accepts only webhook events matching configured mode",
  () => {
    assert.equal(
      fastSpringEventMatchesMode(
        false,
        "test"
      ),
      true
    );

    assert.equal(
      fastSpringEventMatchesMode(
        true,
        "test"
      ),
      false
    );

    assert.equal(
      fastSpringEventMatchesMode(
        true,
        "live"
      ),
      true
    );

    assert.equal(
      fastSpringEventMatchesMode(
        false,
        "live"
      ),
      false
    );
  }
);
