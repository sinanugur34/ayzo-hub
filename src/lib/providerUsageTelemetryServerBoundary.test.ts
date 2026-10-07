import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test(
  "production provider usage scope keeps the server-only boundary",
  () => {
    const wrapper =
      fs.readFileSync(
        "src/lib/providerUsageScope.ts",
        "utf8"
      );

    assert.ok(
      wrapper.includes(
        'import "server-only";'
      )
    );

    assert.ok(
      wrapper.includes(
        "providerUsageScopeCore"
      )
    );
  }
);

test(
  "testable scope core does not import the Next server-only sentinel",
  () => {
    const core =
      fs.readFileSync(
        "src/lib/providerUsageScopeCore.ts",
        "utf8"
      );

    assert.equal(
      core.includes(
        'import "server-only";'
      ),
      false
    );

    assert.ok(
      core.includes(
        "AsyncLocalStorage"
      )
    );
  }
);

test(
  "production analysis executor imports only the protected scope wrapper",
  () => {
    const analysis =
      fs.readFileSync(
        "src/lib/providerUsageAnalysis.ts",
        "utf8"
      );

    assert.ok(
      analysis.includes(
        'from "@/lib/providerUsageScope"'
      )
    );

    assert.equal(
      analysis.includes(
        'from "@/lib/providerUsageScopeCore"'
      ),
      false
    );
  }
);
