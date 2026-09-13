import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAyzoEntityLabels,
} from "./ayzoEntityLabels";

import {
  planHasFeature,
} from "../plans/registry";

test(
  "entity labels are gated to Pro and Advanced",
  () => {
    assert.equal(
      planHasFeature(
        "free",
        "entityLabels"
      ),
      false
    );

    assert.equal(
      planHasFeature(
        "pro",
        "entityLabels"
      ),
      true
    );

    assert.equal(
      planHasFeature(
        "advanced",
        "entityLabels"
      ),
      true
    );
  }
);

test(
  "returns no-evidence when evidence payload is absent",
  () => {
    const result =
      buildAyzoEntityLabels({
        network:
          "solana",

        subjectType:
          "token",

        subjectValue:
          "Mint111",

        evidencePayload:
          null,
      });

    assert.equal(
      result.version,
      1
    );

    assert.equal(
      result.status,
      "no-evidence"
    );

    assert.deepEqual(
      result.labels,
      []
    );

    assert.match(
      result.limitation,
      /do not establish legal identity/i
    );
  }
);

test(
  "returns unsupported for non-Solana and non-EVM evidence",
  () => {
    const result =
      buildAyzoEntityLabels({
        network:
          "bitcoin",

        subjectType:
          "entity",

        subjectValue:
          "bc1qexample",

        evidencePayload:
          {},
      });

    assert.equal(
      result.status,
      "unsupported"
    );

    assert.deepEqual(
      result.labels,
      []
    );

    assert.match(
      result.limitation,
      /Solana and EVM/i
    );
  }
);

test(
  "resolves Solana authorities and shared funding evidence",
  () => {
    const result =
      buildAyzoEntityLabels({
        network:
          "solana",

        subjectType:
          "token",

        subjectValue:
          "Mint111",

        evidencePayload: {
          tokenVerification: {
            mintAuthority:
              "MintAuthority111",

            freezeAuthority:
              "FreezeAuthority111",
          },

          funding: {
            perWallet: [
              {
                wallet:
                  "WalletA",

                recentIncomingTransfers: [
                  {
                    source:
                      "SharedSource111",

                    sol:
                      1,

                    signature:
                      "sig-a",
                  },
                ],
              },

              {
                wallet:
                  "WalletB",

                recentIncomingTransfers: [
                  {
                    source:
                      "SharedSource111",

                    sol:
                      2,

                    signature:
                      "sig-b",
                  },
                ],
              },
            ],
          },
        },
      });

    assert.equal(
      result.status,
      "ready"
    );

    const mint =
      result.labels.find(
        label =>
          label.label ===
          "Mint authority"
      );

    const freeze =
      result.labels.find(
        label =>
          label.label ===
          "Freeze authority"
      );

    const funding =
      result.labels.find(
        label =>
          label.label ===
          "Shared recent funding source"
      );

    assert.ok(mint);
    assert.ok(freeze);
    assert.ok(funding);

    assert.equal(
      mint.address,
      "MintAuthority111"
    );

    assert.equal(
      mint.confidence,
      "high"
    );

    assert.equal(
      freeze.confidence,
      "high"
    );

    assert.equal(
      funding.address,
      "SharedSource111"
    );

    assert.equal(
      funding.confidence,
      "medium"
    );

    assert.match(
      funding.caveat ?? "",
      /does not prove common ownership/i
    );
  }
);

test(
  "resolves deterministic EVM burn address",
  () => {
    const zeroAddress =
      "0x0000000000000000000000000000000000000000";

    const result =
      buildAyzoEntityLabels({
        network:
          "ethereum",

        subjectType:
          "entity",

        subjectValue:
          zeroAddress,

        evidencePayload:
          {},
      });

    assert.equal(
      result.status,
      "ready"
    );

    const burn =
      result.labels.find(
        label =>
          label.address ===
          zeroAddress
      );

    assert.ok(burn);

    assert.equal(
      burn.label,
      "Zero Address"
    );

    assert.equal(
      burn.category,
      "burn"
    );

    assert.equal(
      burn.confidence,
      "high"
    );

    assert.equal(
      burn.source,
      "deterministic"
    );
  }
);

test(
  "resolves EVM deployer and repeated funding roles without ownership inference",
  () => {
    const subject =
      "0x1111111111111111111111111111111111111111";

    const deployer =
      "0x2222222222222222222222222222222222222222";

    const fundingSource =
      "0x3333333333333333333333333333333333333333";

    const result =
      buildAyzoEntityLabels({
        network:
          "base",

        subjectType:
          "entity",

        subjectValue:
          subject,

        evidencePayload: {
          modules: {
            deploymentIntelligence: {
              data: {
                deployment: {
                  deployerAddress:
                    deployer,
                },
              },
            },

            fundingProvenance: {
              data: {
                sources: [
                  {
                    sourceAddress:
                      fundingSource,

                    repeatedFundingSource:
                      true,
                  },
                ],
              },
            },
          },
        },
      });

    assert.equal(
      result.status,
      "ready"
    );

    const deployerLabel =
      result.labels.find(
        label =>
          label.label ===
          "Contract deployer"
      );

    const fundingLabel =
      result.labels.find(
        label =>
          label.label ===
          "Repeated funding source"
      );

    assert.ok(
      deployerLabel
    );

    assert.ok(
      fundingLabel
    );

    assert.equal(
      deployerLabel.address,
      deployer
    );

    assert.equal(
      deployerLabel.confidence,
      "high"
    );

    assert.equal(
      fundingLabel.address,
      fundingSource
    );

    assert.equal(
      fundingLabel.confidence,
      "medium"
    );

    assert.ok(
      result.labels.indexOf(
        deployerLabel
      ) <
        result.labels.indexOf(
          fundingLabel
        )
    );

    assert.match(
      deployerLabel.caveat ?? "",
      /does not establish current ownership/i
    );

    assert.match(
      fundingLabel.caveat ?? "",
      /does not establish identity/i
    );
  }
);
