import test from "node:test";
import assert from "node:assert/strict";
import { isLocalDevelopmentSmokeAllowed } from "./internalSmokeSecurity";

test("all deployed environments fail closed irrespective of smoke header", () => {
  for (const nodeEnv of ["production", "development", "test", undefined]) {
    for (const vercelEnv of ["production", "preview", "development"]) {
      assert.equal(isLocalDevelopmentSmokeAllowed({nodeEnv, vercelEnv}, "smoke"), false,
        `${nodeEnv}/${vercelEnv}`);
    }
  }
});

test("local non-production test context with exact smoke header is accepted", () => {
  assert.equal(isLocalDevelopmentSmokeAllowed({nodeEnv:"development"}, "smoke"), true);
  assert.equal(isLocalDevelopmentSmokeAllowed({nodeEnv:"production"}, "smoke"), false);
  for (const nodeEnv of ["test", undefined]) {
    assert.equal(isLocalDevelopmentSmokeAllowed({nodeEnv}, "smoke"), true);
  }
  for (const header of [null, "SMOKE", " smoke", "invalid", ""]) {
    assert.equal(isLocalDevelopmentSmokeAllowed({nodeEnv:"development"}, header), false);
  }
});
