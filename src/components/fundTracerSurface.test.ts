import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const types =
  fs.readFileSync(
    "src/lib/plans/types.ts",
    "utf8"
  );

const registry =
  fs.readFileSync(
    "src/lib/plans/registry.ts",
    "utf8"
  );

const overview =
  fs.readFileSync(
    "src/components/AnalysisWorkspaceOverview.tsx",
    "utf8"
  );

const tracer =
  fs.readFileSync(
    "src/components/FundTracer.tsx",
    "utf8"
  );

const evm =
  fs.readFileSync(
    "src/components/EvmIntelligenceReport.tsx",
    "utf8"
  );

const account =
  fs.readFileSync(
    "src/components/account/AccountPlanExperience.tsx",
    "utf8"
  );

const matrix =
  fs.readFileSync(
    "src/components/PlanComparisonMatrix.tsx",
    "utf8"
  );

test(
  "Fund Tracer is Pro and Advanced but not Free",
  () => {
    assert.match(
      types,
      /"fundTracer"/
    );

    const freeBlock =
      registry.slice(
        registry.indexOf(
          "const LIVE_PLATFORM_FEATURES"
        ),
        registry.indexOf(
          "const PRO_PLATFORM_FEATURES"
        )
      );

    const proBlock =
      registry.slice(
        registry.indexOf(
          "const PRO_PLATFORM_FEATURES"
        ),
        registry.indexOf(
          "const ADVANCED_PLATFORM_FEATURES"
        )
      );

    assert.doesNotMatch(
      freeBlock,
      /fundTracer/
    );

    assert.match(
      proBlock,
      /fundTracer:\s*true/
    );

    assert.match(
      registry,
      /\.\.\.PRO_PLATFORM_FEATURES/
    );
  }
);

test(
  "Workspace keeps the general evidence graph and adds dedicated paid Fund Tracer",
  () => {
    assert.match(
      overview,
      /InteractiveEvidenceGraph/
    );

    assert.match(
      overview,
      /FundTracerPanel/
    );

    assert.match(
      overview,
      /planHasFeature\(\s*fundTracerPlan,\s*"fundTracer"\s*\)/
    );

    assert.match(
      overview,
      /fundTracerPlan ===\s*"advanced"\s*\?\s*deepFundingTracing/
    );
  }
);

test(
  "Advanced EVM bridges existing Deep Funding evidence",
  () => {
    assert.match(
      evm,
      /deepFundingTracing=\{/
    );

    assert.match(
      evm,
      /funding\s*\?\s*\.deepFundingTracing/
    );
  }
);

test(
  "Fund Tracer distinguishes direct and multi-hop evidence",
  () => {
    assert.match(
      tracer,
      /INTERACTIVE FUND TRACER/
    );

    assert.match(
      tracer,
      /Follow observed funding paths/
    );

    assert.match(
      tracer,
      /MULTI-HOP/
    );

    assert.match(
      tracer,
      /DIRECT/
    );

    assert.match(
      tracer,
      /Ultimate source is not inferred/
    );
  }
);

test(
  "Public and Account plan contracts include Fund Tracer",
  () => {
    assert.match(
      account,
      /Interactive Fund Tracer/
    );

    assert.match(
      matrix,
      /Interactive Fund Tracer/
    );

    assert.match(
      matrix,
      /"fundTracer"/
    );
  }
);
