const BASE = "http://localhost:3000";
const BONK = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

async function post(path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ayzo-test-request": "smoke",
    },
    body: JSON.stringify(body),
  });

  return response.json();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log("\nAYZO V0.1 SMOKE TEST\n");

  console.log("1/6 BONK full intelligence...");
  const bonk = await post("/api/solana/intelligence", {
    address: BONK,
  });

  assert(bonk.ok === true, "BONK analysis failed");
  assert(bonk.coverage === "full", "BONK should have full coverage");
  assert(
    typeof bonk.holders?.concentration?.top20 === "number",
    "BONK Top 20 concentration missing"
  );
  assert(bonk.relationships?.ok === true, "BONK relationships missing");
  assert(bonk.funding?.ok === true, "BONK funding missing");
  assert(
    bonk.modules?.relationships?.status === "complete",
    "BONK relationship module should be complete"
  );
  assert(
    bonk.modules?.funding?.status === "complete",
    "BONK funding module should be complete"
  );

  console.log("PASS — BONK full coverage");

  console.log("2/6 USDC large-token handling...");
  const usdc = await post("/api/solana/intelligence", {
    address: USDC,
  });

  assert(usdc.ok === true, "USDC analysis failed");
  assert(usdc.coverage === "limited", "USDC should be limited coverage");
  assert(usdc.relationships === null, "USDC relationships should not run");
  assert(usdc.funding === null, "USDC funding should not run");
  assert(
    usdc.holders?.concentration?.top20 === null,
    "USDC Top 20 must be null, not estimated"
  );

  console.log("PASS — USDC limited coverage");

  console.log("3/6 Non-token address rejection...");
  const nonToken = await post("/api/solana/token", {
    address: "11111111111111111111111111111111",
  });

  assert(nonToken.ok === false, "System Program must not verify as token");

  console.log("PASS — non-token rejected");

  console.log("4/6 Invalid address rejection...");
  const invalid = await post("/api/solana/token", {
    address: "not-a-solana-address",
  });

  assert(invalid.ok === false, "Invalid address must be rejected");

  console.log("PASS — invalid address rejected");

  console.log("5/6 Relationship failure simulation...");
  const relationshipFailure = await post("/api/solana/intelligence", {
    address: BONK,
    __testFailure: "relationships",
  });

  assert(
    relationshipFailure.ok === true,
    "Pipeline should survive relationship failure"
  );
  assert(
    relationshipFailure.relationships === null,
    "Failed relationship module must return null"
  );
  assert(
    relationshipFailure.modules?.relationships?.status === "unavailable",
    "Relationship module must be unavailable"
  );
  assert(
    relationshipFailure.modules?.funding?.status === "complete",
    "Funding should still complete"
  );
  assert(
    relationshipFailure.findings?.some(
      (finding) => finding.id === "relationship-unavailable"
    ),
    "Relationship unavailable finding missing"
  );
  assert(
    !relationshipFailure.findings?.some(
      (finding) =>
        finding.id === "wallet-interaction" &&
        finding.title === "No direct wallet interaction detected"
    ),
    "Incomplete relationship analysis produced a false negative conclusion"
  );

  console.log(
    "PASS — relationship failure produces no false conclusion"
  );

  console.log("6/6 Funding failure simulation...");
  const fundingFailure = await post("/api/solana/intelligence", {
    address: BONK,
    __testFailure: "funding",
  });

  assert(
    fundingFailure.ok === true,
    "Pipeline should survive funding failure"
  );
  assert(
    fundingFailure.funding === null,
    "Failed funding module must return null"
  );
  assert(
    fundingFailure.modules?.funding?.status === "unavailable",
    "Funding module must be unavailable"
  );
  assert(
    fundingFailure.modules?.relationships?.status === "complete",
    "Relationship should still complete"
  );
  assert(
    fundingFailure.findings?.some(
      (finding) => finding.id === "funding-unavailable"
    ),
    "Funding unavailable finding missing"
  );
  assert(
    !fundingFailure.findings?.some(
      (finding) =>
        finding.id === "funding-signal" &&
        finding.title === "No shared recent funding source detected"
    ),
    "Incomplete funding analysis produced a false negative conclusion"
  );

  console.log(
    "PASS — funding failure produces no false conclusion"
  );

  console.log("\n✅ AYZO V0.1 SMOKE TEST: 6/6 ALL PASS\n");
}

run().catch((error) => {
  console.error("\n❌ AYZO V0.1 SMOKE TEST FAILED");
  console.error(error.message);
  process.exit(1);
});
