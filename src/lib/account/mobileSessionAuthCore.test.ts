import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  Buffer,
} from "node:buffer";

import {
  isFreshAuthenticationToken,
  normalizeAuthEmail,
  readBearerToken,
} from "./mobileSessionAuthCore";

function makeJwt(
  payload:
    Record<
      string,
      unknown
    >
) {
  const header =
    Buffer.from(
      JSON.stringify({
        alg:
          "RS256",
        typ:
          "JWT",
      })
    ).toString(
      "base64url"
    );

  const body =
    Buffer.from(
      JSON.stringify(
        payload
      )
    ).toString(
      "base64url"
    );

  return (
    `${header}.${body}.signature`
  );
}

test(
  "reads a valid bearer token",
  () => {
    const request =
      new Request(
        "https://app.ayzo.io/api/mobile/session",
        {
          headers: {
            authorization:
              "Bearer abc.def.ghi",
          },
        }
      );

    assert.equal(
      readBearerToken(
        request
      ),
      "abc.def.ghi"
    );
  }
);

test(
  "rejects malformed bearer authorization",
  () => {
    const request =
      new Request(
        "https://app.ayzo.io/api/mobile/session",
        {
          headers: {
            authorization:
              "Basic abc",
          },
        }
      );

    assert.equal(
      readBearerToken(
        request
      ),
      null
    );
  }
);

test(
  "normalizes account email",
  () => {
    assert.equal(
      normalizeAuthEmail(
        "  USER@Example.COM "
      ),
      "user@example.com"
    );
  }
);

test(
  "accepts recent OAuth authentication",
  () => {
    const now =
      Date.parse(
        "2026-09-15T10:00:00.000Z"
      );

    const token =
      makeJwt({
        session_id:
          "session-1",

        amr: [
          {
            method:
              "oauth",

            timestamp:
              Math.floor(
                now / 1000
              ) -
              5 * 60,
          },
        ],
      });

    assert.equal(
      isFreshAuthenticationToken(
        token,
        now
      ),
      true
    );
  }
);

test(
  "accepts recent OTP authentication",
  () => {
    const now =
      Date.parse(
        "2026-09-15T10:00:00.000Z"
      );

    const token =
      makeJwt({
        session_id:
          "session-2",

        amr: [
          {
            method:
              "otp",

            timestamp:
              Math.floor(
                now / 1000
              ) -
              60,
          },
        ],
      });

    assert.equal(
      isFreshAuthenticationToken(
        token,
        now
      ),
      true
    );
  }
);

test(
  "rejects stale auth even when token iat is new",
  () => {
    const now =
      Date.parse(
        "2026-09-15T10:00:00.000Z"
      );

    const token =
      makeJwt({
        session_id:
          "session-old",

        iat:
          Math.floor(
            now / 1000
          ),

        amr: [
          {
            method:
              "oauth",

            timestamp:
              Math.floor(
                now / 1000
              ) -
              60 * 60,
          },
        ],
      });

    assert.equal(
      isFreshAuthenticationToken(
        token,
        now
      ),
      false
    );
  }
);

test(
  "rejects token without session id",
  () => {
    const now =
      Date.now();

    const token =
      makeJwt({
        amr: [
          {
            method:
              "oauth",

            timestamp:
              Math.floor(
                now / 1000
              ),
          },
        ],
      });

    assert.equal(
      isFreshAuthenticationToken(
        token,
        now
      ),
      false
    );
  }
);

test(
  "rejects anonymous authentication",
  () => {
    const now =
      Date.now();

    const token =
      makeJwt({
        session_id:
          "session-3",

        amr: [
          {
            method:
              "anonymous",

            timestamp:
              Math.floor(
                now / 1000
              ),
          },
        ],
      });

    assert.equal(
      isFreshAuthenticationToken(
        token,
        now
      ),
      false
    );
  }
);

test(
  "rejects malformed JWT",
  () => {
    assert.equal(
      isFreshAuthenticationToken(
        "not-a-jwt"
      ),
      false
    );
  }
);
