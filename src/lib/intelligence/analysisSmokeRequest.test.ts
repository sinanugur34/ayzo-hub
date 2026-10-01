import assert from "node:assert/strict";
import test from "node:test";

import {
  isAuthorizedAnalysisSmokeRequest,
} from "./analysisSmokeRequest";

const mutableEnv =
  process.env as Record<
    string,
    string |
    undefined
  >;

function request(
  {
    smoke =
      true,

    internalKey =
      null,
  }: {
    smoke?:
      boolean;

    internalKey?:
      string |
      null;
  } = {}
) {
  const headers =
    new Headers();

  if (smoke) {
    headers.set(
      "x-ayzo-test-request",
      "smoke"
    );
  }

  if (internalKey) {
    headers.set(
      "x-ayzo-internal-key",
      internalKey
    );
  }

  return new Request(
    "https://app.ayzo.io/api/intelligence",
    {
      method:
        "POST",

      headers,
    }
  );
}

function setEnv(
  key:
    string,
  value:
    string |
    undefined
) {
  if (
    value ===
      undefined
  ) {
    delete mutableEnv[
      key
    ];

    return;
  }

  mutableEnv[
    key
  ] =
    value;
}

function withEnvironment(
  {
    nodeEnv,
    vercelEnv,
    key,
  }: {
    nodeEnv:
      string |
      undefined;

    vercelEnv:
      string |
      undefined;

    key:
      string |
      undefined;
  },
  callback:
    () => void
) {
  const oldNode =
    mutableEnv
      .NODE_ENV;

  const oldVercel =
    mutableEnv
      .VERCEL_ENV;

  const oldKey =
    mutableEnv
      .AYZO_INTERNAL_API_KEY;

  try {
    setEnv(
      "NODE_ENV",
      nodeEnv
    );

    setEnv(
      "VERCEL_ENV",
      vercelEnv
    );

    setEnv(
      "AYZO_INTERNAL_API_KEY",
      key
    );

    callback();
  } finally {
    setEnv(
      "NODE_ENV",
      oldNode
    );

    setEnv(
      "VERCEL_ENV",
      oldVercel
    );

    setEnv(
      "AYZO_INTERNAL_API_KEY",
      oldKey
    );
  }
}

test(
  "local non-production smoke behavior remains available",
  () => {
    withEnvironment(
      {
        nodeEnv:
          "test",

        vercelEnv:
          undefined,

        key:
          undefined,
      },
      () => {
        assert.equal(
          isAuthorizedAnalysisSmokeRequest(
            request()
          ),
          true
        );
      }
    );
  }
);

test(
  "production-mode preview requires valid internal authentication",
  () => {
    withEnvironment(
      {
        nodeEnv:
          "production",

        vercelEnv:
          "preview",

        key:
          "preview-secret",
      },
      () => {
        assert.equal(
          isAuthorizedAnalysisSmokeRequest(
            request({
              internalKey:
                "preview-secret",
            })
          ),
          true
        );

        assert.equal(
          isAuthorizedAnalysisSmokeRequest(
            request({
              internalKey:
                "wrong-secret",
            })
          ),
          false
        );

        assert.equal(
          isAuthorizedAnalysisSmokeRequest(
            request()
          ),
          false
        );
      }
    );
  }
);

test(
  "production deployment never accepts the smoke bypass",
  () => {
    withEnvironment(
      {
        nodeEnv:
          "production",

        vercelEnv:
          "production",

        key:
          "production-secret",
      },
      () => {
        assert.equal(
          isAuthorizedAnalysisSmokeRequest(
            request({
              internalKey:
                "production-secret",
            })
          ),
          false
        );
      }
    );
  }
);

test(
  "smoke header is mandatory in every environment",
  () => {
    withEnvironment(
      {
        nodeEnv:
          "production",

        vercelEnv:
          "preview",

        key:
          "preview-secret",
      },
      () => {
        assert.equal(
          isAuthorizedAnalysisSmokeRequest(
            request({
              smoke:
                false,

              internalKey:
                "preview-secret",
            })
          ),
          false
        );
      }
    );
  }
);
