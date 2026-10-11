import assert from "node:assert/strict";
import test from "node:test";
import { previewHolderAuthAllowed } from "./isolatedPreviewHolderAuth";

const host = "ayzo-3i1r0vr84-ayzo1.vercel.app";
const secret = "a".repeat(64);
const good = {
  vercelEnv: "preview", vercelGitRef: "feat/ayzo-phase22729-holder-e2e",
  enabled: "1", secret,
};

test("dedicated Preview branch accepts a strong matching key", () => {
  assert.equal(previewHolderAuthAllowed(good, host, secret), true);
});
test("production and local environments fail closed", () => {
  for (const vercelEnv of ["production", "development", undefined, "", "test"]) {
    assert.equal(previewHolderAuthAllowed({...good, vercelEnv}, host, secret), false);
  }
});
test("disabled and unconfigured gates fail closed", () => {
  for (const enabled of ["0", "true", undefined, ""]) {
    assert.equal(previewHolderAuthAllowed({...good, enabled}, host, secret), false);
  }
});
test("incorrect, missing, other and forged branch metadata reject", () => {
  for (const vercelGitRef of ["main", "feat/other", undefined, "", "feat/ayzo-phase22729-holder-e2e "]) {
    assert.equal(previewHolderAuthAllowed({...good, vercelGitRef}, host, secret), false);
  }
});
test("only direct AYZO deployment hostnames are admitted", () => {
  for (const candidate of ["app.ayzo.io", "other.vercel.app", "evil.example", "localhost", "ayzo-foo.vercel.app.evil", "ayzo-foo.vercel.app:443", "", null]) {
    assert.equal(previewHolderAuthAllowed(good, candidate, secret), false);
  }
});
test("wrong or missing credentials fail closed", () => {
  for (const provided of [null, undefined, "b".repeat(64), "a".repeat(63), "sk_live_fake", "A".repeat(64)]) {
    assert.equal(previewHolderAuthAllowed(good, host, provided ?? null), false);
  }
});
test("unconfigured and malformed signing auth secrets reject", () => {
  for (const candidate of [undefined, "", "b".repeat(63), "A".repeat(64), "sk_live_fake"]) {
    assert.equal(previewHolderAuthAllowed({...good, secret: candidate}, host, secret), false);
  }
});
