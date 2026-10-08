import assert from "node:assert/strict";
import test from "node:test";
import { verifyNativeCandidates, validNativeEvidenceCache, isNativeAccountNetwork } from "./nativeAccountVerification";
import { tronAddressToHex } from "@/lib/intelligence/tron/address";
import { solanaAccountStatus, tronAccountStatus, suiActivityStatus, verifyWave2Account } from "./nativeAccountVerificationWave2";

const SOLANA = "11111111111111111111111111111111";
const TRON = "TJRabPrwbZy45sbavfcjinPJC18kjpRTv8";
const SUI = "0x" + "1".repeat(64);
const SOLANA_FOUND = {
  jsonrpc: "2.0", result: { context: { slot: 123 },
    value: { owner: SOLANA, lamports: 8000, executable: true } },
};
const SOLANA_EMPTY = { jsonrpc: "2.0", result: { context: { slot: 123 }, value: null } };
const mock = (body: unknown, status = 200): typeof fetch =>
  async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const suiPayload = (objects: unknown[] = [], transactions: unknown[] = []) => ({
  data: { chainIdentifier: "35834a8a", subject: { address: SUI,
    objects: { nodes: objects }, recentTransactions: { nodes: transactions } } },
});

test("wave2 networks are registered while legacy account strategies remain", () => {
  for (const name of ["solana", "tron", "sui", "hedera", "stellar", "aptos"] as const) {
    assert.equal(isNativeAccountNetwork(name), true);
  }
});

test("Solana account-state proof requires a real owner and finalized RPC envelope", () => {
  assert.equal(solanaAccountStatus(SOLANA_FOUND), "observed");
  assert.equal(solanaAccountStatus(SOLANA_EMPTY), "not_observed");
  assert.equal(solanaAccountStatus({ jsonrpc: "2.0", result: { value: null } }), "unavailable");
  assert.equal(solanaAccountStatus({ ...SOLANA_FOUND, error: { code: 429 } }), "unavailable");
  assert.equal(solanaAccountStatus({ jsonrpc: "2.0", result: { context: { slot: 2 }, value: {owner:"INVALID",lamports:1,executable:false} } }), "unavailable");
});

test("Solana verification uses keyless body, primary Alchemy and Helius fallback", async () => {
  const called: string[] = [];
  const handler: typeof fetch = async (url, init) => {
    called.push(String(url));
    const body = JSON.parse(String(init?.body));
    assert.equal(body.method, "getAccountInfo");
    assert.equal(body.params[0], SOLANA);
    assert.equal(body.params[1].dataSlice.length, 0);
    assert.equal(body.params[1].commitment, "finalized");
    return new Response(JSON.stringify(called.length === 1 ? { error: {code:429} } : SOLANA_FOUND), {status:200});
  };
  assert.deepEqual(await verifyWave2Account("solana", SOLANA, handler,
    { alchemy: "primary-key", helius: "fallback-key" }),
    { network: "solana", status: "observed" });
  assert.equal(called.length, 2);
  assert.ok(called[0]?.startsWith("https://solana-mainnet.g.alchemy.com/v2/"));
  assert.ok(called[1]?.startsWith("https://mainnet.helius-rpc.com/"));
});

test("Solana nonexistent account is never guessed to be invalid chain", async () => {
  assert.equal((await verifyWave2Account("solana", SOLANA, mock(SOLANA_EMPTY), {alchemy:"test"})).status, "not_observed");
  let attempts = 0;
  const unreachable: typeof fetch = async () => {attempts++; throw new Error("timeout");};
  assert.equal((await verifyWave2Account("solana", SOLANA, unreachable, {alchemy:"test"})).status, "unavailable");
  assert.equal(attempts, 1);
});

test("TRON activated account and empty success envelope are distinguishable", () => {
  assert.equal(tronAccountStatus({success:true,data:[{address:TRON}]}, TRON), "observed");
  // TronGrid returns the 21-byte address in hex; both equivalent encodings must match.
  assert.equal(tronAccountStatus({success:true,data:[{address:tronAddressToHex(TRON)}]}, TRON), "observed");
  assert.equal(tronAccountStatus({success:true,data:[]}, TRON), "not_observed");
  assert.equal(tronAccountStatus({success:false,data:[]}, TRON), "unavailable");
  assert.equal(tronAccountStatus({success:true,data:[{address:"BAD"}]}, TRON), "unavailable");
});

test("TRON key stays server-side and invalid addresses never reach provider", async () => {
  let calls=0;
  const handler: typeof fetch = async (url, options) => {
    calls++;
    assert.equal(String(url),`https://api.trongrid.io/v1/accounts/${TRON}`);
    assert.equal((options?.headers as Record<string,string>)["TRON-PRO-API-KEY"], "dummy");
    return new Response(JSON.stringify({success:true,data:[{address:TRON}]}),{status:200});
  };
  assert.equal((await verifyWave2Account("tron", TRON,handler,{tronGrid:"dummy"})).status,"observed");
  assert.equal((await verifyWave2Account("tron", "https://attacker.invalid",handler,{tronGrid:"dummy"})).status,"unavailable");
  assert.equal(calls,1);
});

test("Sui requires verifiable owned object or recorded transaction, not address syntax", () => {
  assert.equal(suiActivityStatus(suiPayload([{address:"0x2"}]),SUI),"observed");
  assert.equal(suiActivityStatus(suiPayload([],[{digest:"3".repeat(44)}]),SUI),"observed");
  assert.equal(suiActivityStatus(suiPayload(),SUI),"not_observed");
  assert.equal(suiActivityStatus({data:{subject:{address:SUI}}},SUI),"unavailable");
  assert.equal(suiActivityStatus({...suiPayload(),errors:[{message:"bad"}]},SUI),"unavailable");
  assert.equal(suiActivityStatus(suiPayload([{address:"BAD"}]),SUI),"unavailable");
});

test("Sui GraphQL uses normalized address in variables and fixed endpoint", async () => {
  let calls=0;
  const handler: typeof fetch = async (url,init) => {
    calls++;
    assert.equal(String(url),"https://graphql.mainnet.sui.io/graphql");
    const body=JSON.parse(String(init?.body));
    assert.equal(body.variables.address,SUI);
    return new Response(JSON.stringify(suiPayload([{address:"0x2"}])),{status:200});
  };
  assert.equal((await verifyWave2Account("sui",SUI,handler)).status,"observed");
  assert.equal((await verifyWave2Account("sui","https://attacker.invalid",handler)).status,"unavailable");
  assert.equal(calls,1);
});

test("Sui and Aptos candidates remain separate after positive evidence", async () => {
  const addr="0x" + "1".repeat(64);
  const result=await verifyNativeCandidates(["sui","aptos"],addr,mock(suiPayload([{address:"0x2"}])));
  assert.deepEqual(result,[{network:"sui",status:"observed"},{network:"aptos",status:"unavailable"}]);
});

test("native cache strictly preserves the new candidate order and existing protection", () => {
  assert.equal(validNativeEvidenceCache([
    {network:"sui",status:"observed"},{network:"aptos",status:"not_observed"}],
    ["sui","aptos"]),true);
  assert.equal(validNativeEvidenceCache([{network:"sui",status:"observed"}], ["sui","aptos"]),false);
  assert.equal(validNativeEvidenceCache([{network:"sui",status:"unavailable"}], ["sui"]),false);
});

test("Wave2 lookups reject provider errors and missing credentials fail closed", async () => {
  for (const network of ["solana","tron"] as const) {
    const address=network==="solana" ? SOLANA : TRON;
    assert.equal((await verifyWave2Account(network,address,mock({},429),{})).status,"unavailable");
  }
  assert.equal((await verifyWave2Account("sui",SUI,mock({},503))).status,"unavailable");
});
