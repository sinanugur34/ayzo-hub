import assert from "node:assert/strict";
import test from "node:test";

import { isAllowedCreemPortalUrl } from "./creemPortalCore";

test("accepts Creem HTTPS customer portal URLs", () => {
  assert.equal(
    isAllowedCreemPortalUrl("https://creem.io/my-orders/login/example"),
    true,
  );

  assert.equal(
    isAllowedCreemPortalUrl("https://app.creem.io/customer/example"),
    true,
  );
});

test("rejects non-Creem and deceptive portal URLs", () => {
  assert.equal(
    isAllowedCreemPortalUrl("https://creem.io.evil.example/login"),
    false,
  );

  assert.equal(isAllowedCreemPortalUrl("https://evil.example/creem.io"), false);
});

test("rejects insecure and malformed portal URLs", () => {
  assert.equal(
    isAllowedCreemPortalUrl("http://creem.io/my-orders/login/example"),
    false,
  );

  assert.equal(isAllowedCreemPortalUrl("not-a-url"), false);

  assert.equal(isAllowedCreemPortalUrl(null), false);
});
