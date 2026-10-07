import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeProviderUsagePropagation,
  encodeProviderUsagePropagation,
} from "./providerUsagePropagationCore";

const SECRET =
  "ayzo-test-internal-secret-0123456789";

const CONTEXT = {
  analysisId:
    "11111111-1111-4111-8111-111111111111",

  userId:
    "22222222-2222-4222-8222-222222222222",

  platform:
    "web" as const,

  planId:
    "advanced" as const,

  network:
    "solana",
};

test(
  "round-trips bounded signed provider context",
  () => {
    const now =
      1_800_000_000_000;

    const encoded =
      encodeProviderUsagePropagation(
        CONTEXT,
        SECRET,
        now
      );

    const decoded =
      decodeProviderUsagePropagation(
        encoded,
        SECRET,
        {
          nowMs:
            now + 1000,
        }
      );

    assert.deepEqual(
      decoded,
      CONTEXT
    );
  }
);

test(
  "rejects tampered propagation context",
  () => {
    const now =
      1_800_000_000_000;

    const encoded =
      encodeProviderUsagePropagation(
        CONTEXT,
        SECRET,
        now
      );

    const tampered =
      encoded.contextHeader
        .slice(
          0,
          -1
        ) +
      (
        encoded.contextHeader
          .endsWith(
            "A"
          )
          ? "B"
          : "A"
      );

    assert.equal(
      decodeProviderUsagePropagation(
        {
          contextHeader:
            tampered,

          signatureHeader:
            encoded.signatureHeader,
        },
        SECRET,
        {
          nowMs:
            now,
        }
      ),
      null
    );
  }
);

test(
  "rejects expired propagation context",
  () => {
    const now =
      1_800_000_000_000;

    const encoded =
      encodeProviderUsagePropagation(
        CONTEXT,
        SECRET,
        now
      );

    assert.equal(
      decodeProviderUsagePropagation(
        encoded,
        SECRET,
        {
          nowMs:
            now +
            10 * 60 * 1000,

          maxAgeMs:
            2 * 60 * 1000,
        }
      ),
      null
    );
  }
);

test(
  "propagated envelope carries operational context only",
  () => {
    const encoded =
      encodeProviderUsagePropagation(
        CONTEXT,
        SECRET,
        1_800_000_000_000
      );

    const decodedText =
      Buffer.from(
        encoded.contextHeader,
        "base64url"
      ).toString(
        "utf8"
      );

    assert.equal(
      decodedText.includes(
        "walletAddress"
      ),
      false
    );

    assert.equal(
      decodedText.includes(
        "tokenAddress"
      ),
      false
    );

    assert.equal(
      decodedText.includes(
        "requestBody"
      ),
      false
    );

    assert.equal(
      decodedText.includes(
        "apiKey"
      ),
      false
    );
  }
);
