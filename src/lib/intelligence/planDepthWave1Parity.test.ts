import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import {
  getSolanaAnalysisPolicy,
} from "./solana/policy";

import {
  getBitcoinAnalysisPolicy,
} from "./bitcoin/policy";

import {
  getXrplAnalysisPolicy,
} from "./xrpl/policy";

const plans = [
  "free",
  "pro",
  "advanced",
] as const;

function assertStrictlyIncreasing(
  name: string,
  values: readonly number[]
) {
  assert.equal(
    values.length,
    3
  );

  assert.ok(
    values[0]! <
      values[1]!,
    `${name}: Free must be < Pro`
  );

  assert.ok(
    values[1]! <
      values[2]!,
    `${name}: Pro must be < Advanced`
  );
}

test(
  "Solana every plan depth axis is strictly increasing",
  () => {
    const rows =
      plans.map(
        getSolanaAnalysisPolicy
      );

    for (
      const key of
      Object.keys(
        rows[0]!
      ) as (
        keyof typeof rows[0]
      )[]
    ) {
      assertStrictlyIncreasing(
        `solana.${String(key)}`,
        rows.map(
          row =>
            row[key]
        )
      );
    }
  }
);

test(
  "Bitcoin every plan depth axis is strictly increasing",
  () => {
    const rows =
      plans.map(
        getBitcoinAnalysisPolicy
      );

    for (
      const key of
      Object.keys(
        rows[0]!
      ) as (
        keyof typeof rows[0]
      )[]
    ) {
      assertStrictlyIncreasing(
        `bitcoin.${String(key)}`,
        rows.map(
          row =>
            row[key]
        )
      );
    }
  }
);

test(
  "XRPL every plan depth axis is strictly increasing",
  () => {
    const rows =
      plans.map(
        getXrplAnalysisPolicy
      );

    for (
      const key of
      Object.keys(
        rows[0]!
      ) as (
        keyof typeof rows[0]
      )[]
    ) {
      assertStrictlyIncreasing(
        `xrpl.${String(key)}`,
        rows.map(
          row =>
            row[key]
        )
      );
    }
  }
);

test(
  "Solana engine publishes full policy coverage in both result paths",
  () => {
    const source =
      fs.readFileSync(
        "src/lib/intelligence/solana/engine.ts",
        "utf8"
      );

    assert.equal(
      (
        source.match(
          /evidenceCoverage:\s*\{\s*\.\.\.policy,/g
        ) ??
        []
      ).length,
      2
    );
  }
);

test(
  "all Wave 1 presentations consume graph and timeline plan depth",
  () => {
    const solana =
      fs.readFileSync(
        "src/components/IntelligenceReport.tsx",
        "utf8"
      );

    const bitcoin =
      fs.readFileSync(
        "src/components/BitcoinIntelligenceReport.tsx",
        "utf8"
      );

    const xrpl =
      fs.readFileSync(
        "src/lib/intelligence/xrpl/presentation.ts",
        "utf8"
      );

    for (
      const [
        name,
        source,
      ] of [
        [
          "solana",
          solana,
        ],
        [
          "bitcoin",
          bitcoin,
        ],
        [
          "xrpl",
          xrpl,
        ],
      ] as const
    ) {
      assert.ok(
        source.includes(
          "graphMaxNodes"
        ),
        name
      );

      assert.ok(
        source.includes(
          "graphMaxEdges"
        ),
        name
      );

      assert.ok(
        source.includes(
          "timelineMaxEvents"
        ),
        name
      );
    }
  }
);
