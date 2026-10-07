import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const FILES = [
  "src/lib/providerUsageTelemetryCore.ts",
  "src/lib/providerUsageScopeCore.ts",
  "src/lib/providerUsageScope.ts",
  "src/lib/providerUsageTelemetry.ts",
  "src/lib/providerUsageAnalysis.ts",
];

test(
  "provider telemetry foundation does not accept analyzed subject fields",
  () => {
    const combined =
      FILES
        .map(
          file =>
            fs.readFileSync(
              file,
              "utf8"
            )
        )
        .join(
          "\n"
        );

    for (
      const forbidden of [
        "subjectValue:",
        "walletAddress:",
        "tokenAddress:",
        "contractAddress:",
        "requestBody:",
        "rawResponse:",
        "apiKey:",
      ]
    ) {
      assert.equal(
        combined.includes(
          forbidden
        ),
        false,
        forbidden
      );
    }
  }
);
