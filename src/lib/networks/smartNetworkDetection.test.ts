import assert from "node:assert/strict";
import test from "node:test";
import {
  LIVE_NETWORK_IDS,
  NATIVE_VALIDATORS,
  EVM_ACCOUNT_SHAPE,
  detectNativeCandidates,
  uncoveredLiveNetworks,
} from "./smartNetworkDetection";
import { NETWORKS } from "./registry";
import {
  DISCOVERY_NETWORKS,
  classifyContractEvidence,
} from "./evmContractDiscovery";

test("all thirty live AYZO networks have an explicit detection adapter", () => {
  assert.ok(LIVE_NETWORK_IDS.length >= 30);
  assert.deepEqual(uncoveredLiveNetworks(), []);
  for (const id of LIVE_NETWORK_IDS) {
    if (NETWORKS[id].family === "evm") {
      assert.ok(DISCOVERY_NETWORKS.includes(id), `missing EVM RPC: ${id}`);
    } else {
      assert.equal(typeof NATIVE_VALIDATORS[id], "function", `missing native validator: ${id}`);
    }
  }
});

test("Linea USDC EVM contract requires RPC, not syntax-only guessing", () => {
  const addr = "0x176211869cA2b568f2A7D4EE941E073a821EE1ff";
  assert.equal(EVM_ACCOUNT_SHAPE.test(addr), true);
  assert.deepEqual(detectNativeCandidates(addr), []);
  const results = DISCOVERY_NETWORKS.map(network => ({
    network,
    code: network === "linea" ? "0x6001" : "0x",
  }));
  const outcome = classifyContractEvidence(results);
  assert.equal(outcome.status, "single");
  assert.deepEqual(outcome.candidates, ["linea"]);
});

test("missing chain response cannot justify contract auto-selection", () => {
  const results = DISCOVERY_NETWORKS.map(network => ({
    network,
    code: network === "linea" ? "0x6001" : network === "base" ? null : "0x",
  }));
  assert.equal(classifyContractEvidence(results).status, "partial");
});

test("Hedera account IDs are recognized without external RPC", () => {
  assert.deepEqual(detectNativeCandidates("0.0.123"), ["hedera"]);
});

test("TRON and Stellar keep chain-specific address checksums", () => {
  assert.ok(detectNativeCandidates("TJRabPrwbZy45sbavfcjinPJC18kjpRTv8").includes("tron"));
  assert.ok(detectNativeCandidates("GDMQQNJM4UL7QIA66P7R2PZHMQINWZBM77BEBMHLFXD5JEUAHGJ7R4JZ").includes("stellar"));
});

test("32-byte hex addresses remain Sui / Aptos ambiguous", () => {
  const matches = detectNativeCandidates("0x" + "1".repeat(64));
  assert.ok(matches.includes("aptos"));
  assert.ok(matches.includes("sui"));
  assert.ok(matches.length >= 2);
});

test("Bitcoin and Litecoin overlapping legacy P2SH must not be guessed", () => {
  const matches = detectNativeCandidates("3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy");
  assert.ok(matches.includes("bitcoin"));
  assert.ok(matches.includes("litecoin"));
});
