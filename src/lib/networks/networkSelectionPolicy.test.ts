import assert from "node:assert/strict";
import test from "node:test";
import { isNetworkSelectionBlocked } from "./networkSelectionPolicy";

const address = "0x176211869cA2b568f2A7D4EE941E073a821EE1ff";
const canBlock = (
  detectionStatus: "pending" | "single" | "multiple" | "none" | "partial" | null,
  selectedForThisAddress: boolean,
  selectedBeforePasting: boolean
) => isNetworkSelectionBlocked({
  address, detectionStatus, selectedForThisAddress, selectedBeforePasting,
});

test("blocks EVM submissions while async detection is pending", () => {
  assert.equal(canBlock("pending", false, false), true);
  assert.equal(canBlock("pending", false, true), true);
});
test("automatically verified single network can proceed", () => {
  assert.equal(canBlock("single", false, false), false);
});
test("explicit manual choice after paste works despite partial RPC", () => {
  assert.equal(canBlock("partial", true, false), false);
  assert.equal(canBlock("pending", true, false), false);
});
test("manual choice before paste enables wallet and ambiguous analysis after detection", () => {
  for (const status of ["partial", "none", "multiple"] as const) {
    assert.equal(canBlock(status, false, true), false);
    assert.equal(canBlock(status, false, false), true);
  }
});
test("absent detector result does not bypass validation", () => {
  assert.equal(canBlock(null, false, true), true);
});
test("short native identifiers remain eligible for their native validator", () => {
  assert.equal(isNetworkSelectionBlocked({
    address: "0.0.123", detectionStatus: null,
    selectedForThisAddress: false, selectedBeforePasting: false,
  }), false);
});
