import assert from "node:assert/strict";
import test from "node:test";
import {
  isNativeAccountNetwork,
  validateNativeAccountPayload,
  validNativeEvidenceCache,
  verifyNativeAccount,
  verifyNativeCandidates,
} from "./nativeAccountVerification";

const STELLAR = "GDMQQNJM4UL7QIA66P7R2PZHMQINWZBM77BEBMHLFXD5JEUAHGJ7R4JZ";
const aptosBody = {
  type: "0x1::account::Account",
  data: { sequence_number: "1", authentication_key: "0x" + "1".repeat(64) },
};
const mocked = (status: number, body: unknown = {}): typeof fetch =>
  async () => new Response(JSON.stringify(body), { status });

test("only explicitly certified native account networks are probed", () => {
  assert.equal(isNativeAccountNetwork("hedera"), true);
  assert.equal(isNativeAccountNetwork("stellar"), true);
  assert.equal(isNativeAccountNetwork("aptos"), true);
  assert.equal(isNativeAccountNetwork("tron"), true);
});

test("Hedera observed requires matching account identifier", async () => {
  assert.deepEqual(await verifyNativeAccount("hedera", "0.0.123", mocked(200, {account:"0.0.123"})),
    {network:"hedera",status:"observed"});
  assert.equal((await verifyNativeAccount("hedera", "0.0.123", mocked(200, {account:"0.0.124"}))).status,
    "unavailable");
});

test("Stellar observed requires the exact StrKey account identifier", async () => {
  assert.equal((await verifyNativeAccount("stellar", STELLAR, mocked(200, {account_id:STELLAR}))).status,
    "observed");
  assert.equal((await verifyNativeAccount("stellar", STELLAR, mocked(200, {account_id:"wrong"}))).status,
    "unavailable");
});

test("Aptos observed requires actual on-chain Account resource", async () => {
  const aptosMock: typeof fetch = async (url) => {
    assert.equal(String(url), "https://api.mainnet.aptoslabs.com/v1/accounts/0x" +
      "0".repeat(63) + "1/resource/0x1%3A%3Aaccount%3A%3AAccount");
    return new Response(JSON.stringify(aptosBody), {status:200});
  };
  assert.equal((await verifyNativeAccount("aptos", "0x1", aptosMock)).status,
    "observed");
  assert.equal((await verifyNativeAccount("aptos", "0x1", mocked(200, {}))).status,
    "unavailable");
  assert.ok(validateNativeAccountPayload("aptos", "0x1", aptosBody));
  assert.equal(validateNativeAccountPayload("aptos", "0x1", {
    sequence_number: "0", authentication_key: "0x" + "1".repeat(64),
  }), false, "synthetic account metadata must not count as on-chain proof");
  assert.equal(validateNativeAccountPayload("aptos", "0x1", {
    type: "0x1::account::Account", data: { sequence_number: "0" },
  }), false, "partial on-chain resource is unavailable, not observed");
});

test("404 means not_observed, not wrong network", async () => {
  for (const network of ["hedera", "stellar", "aptos"] as const) {
    const address = network === "hedera" ? "0.0.123" : network === "stellar" ? STELLAR : "0x1";
    assert.equal((await verifyNativeAccount(network, address, mocked(404))).status,
      "not_observed");
  }
});

test("upstream outages and malformed 200 bodies remain unavailable", async () => {
  for (const status of [401, 403, 429, 500, 503]) {
    assert.equal((await verifyNativeAccount("hedera", "0.0.123", mocked(status))).status,
      "unavailable");
  }
  assert.equal((await verifyNativeAccount("aptos", "0x1", async () => new Response("not-json"))).status,
    "unavailable");
  assert.equal((await verifyNativeAccount("aptos", "0x1", async () => { throw new Error("timeout"); })).status,
    "unavailable");
});

test("untrusted user input never changes provider origin", async () => {
  let requests = 0;
  const request: typeof fetch = async () => { requests++; return new Response("{}",{status:200}); };
  assert.equal((await verifyNativeAccount("hedera", "http://attacker.invalid", request)).status,
    "unavailable");
  assert.equal(requests, 0);
});

test("ambiguous Sui/Aptos shape does not discard Sui", async () => {
  const address = "0x" + "1".repeat(64);
  const x = await verifyNativeCandidates(["sui","aptos"], address, mocked(200, aptosBody));
  assert.deepEqual(x, [
    {network:"sui",status:"unavailable"},
    {network:"aptos",status:"observed"},
  ]);
});

test("cache validates exact candidates, order, and allowed statuses", () => {
  assert.equal(validNativeEvidenceCache([{network:"hedera",status:"observed"}], ["hedera"]),true);
  assert.equal(validNativeEvidenceCache([{network:"hedera",status:"unavailable"}], ["hedera"]),false);
  assert.equal(validNativeEvidenceCache([{network:"stellar",status:"observed"}], ["hedera"]),false);
  assert.equal(validNativeEvidenceCache([{network:"aptos",status:"observed"}], ["sui","aptos"]),false);
  assert.equal(validNativeEvidenceCache([
    {network:"sui",status:"not_observed"},
    {network:"aptos",status:"observed"},
  ], ["sui","aptos"]),true);
});
