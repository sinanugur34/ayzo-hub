import assert from "node:assert/strict";
import test from "node:test";

import {
  generateApiKey,
  hashApiKey,
  isValidApiKeyToken,
  normalizeApiKeyName,
  readApiBearerToken,
} from "./apiKeys";

test(
  "generates high entropy AYZO API keys without exposing hash semantics",
  () => {
    const first =
      generateApiKey();

    const second =
      generateApiKey();

    assert.equal(
      isValidApiKeyToken(
        first.token
      ),
      true
    );

    assert.notEqual(
      first.token,
      second.token
    );

    assert.equal(
      first.keyHash,
      hashApiKey(
        first.token
      )
    );

    assert.match(
      first.keyHash,
      /^[0-9a-f]{64}$/
    );
  }
);

test(
  "reads only canonical AYZO bearer API keys",
  () => {
    const generated =
      generateApiKey();

    const request =
      new Request(
        "https://app.ayzo.io/api/v1/intelligence",
        {
          headers: {
            Authorization:
              `Bearer ${generated.token}`,
          },
        }
      );

    assert.equal(
      readApiBearerToken(
        request
      ),
      generated.token
    );

    const invalid =
      new Request(
        "https://app.ayzo.io/api/v1/intelligence",
        {
          headers: {
            Authorization:
              "Bearer not-an-ayzo-key",
          },
        }
      );

    assert.equal(
      readApiBearerToken(
        invalid
      ),
      null
    );
  }
);

test(
  "normalizes bounded API key names",
  () => {
    assert.equal(
      normalizeApiKeyName(
        "  Production  "
      ),
      "Production"
    );

    assert.equal(
      normalizeApiKeyName(
        ""
      ),
      null
    );

    assert.equal(
      normalizeApiKeyName(
        "x".repeat(
          81
        )
      ),
      null
    );
  }
);
