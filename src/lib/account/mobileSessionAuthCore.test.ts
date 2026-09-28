import assert from "node:assert/strict";

import {
  test,
} from "node:test";

import {
  Buffer,
} from "node:buffer";

import {
  isFreshAuthenticationToken,
  isFreshReviewPasswordAuthenticationToken,
  isGooglePlayReviewAccountMetadata,
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


test(
  "keeps password auth outside the standard mobile fresh-auth policy",
  () => {
    const now =
      Date.parse(
        "2026-09-28T12:00:00.000Z"
      );

    const token =
      makeJwt({
        session_id:
          "review-session-standard-check",

        amr: [
          {
            method:
              "password",

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
      false
    );
  }
);

test(
  "accepts recent password auth only through the review-specific helper",
  () => {
    const now =
      Date.parse(
        "2026-09-28T12:00:00.000Z"
      );

    const token =
      makeJwt({
        session_id:
          "review-session-password",

        amr: [
          {
            method:
              "password",

            timestamp:
              Math.floor(
                now / 1000
              ) -
              60,
          },
        ],
      });

    assert.equal(
      isFreshReviewPasswordAuthenticationToken(
        token,
        now
      ),
      true
    );
  }
);

test(
  "rejects stale reviewer password authentication",
  () => {
    const now =
      Date.parse(
        "2026-09-28T12:00:00.000Z"
      );

    const token =
      makeJwt({
        session_id:
          "review-session-stale",

        amr: [
          {
            method:
              "password",

            timestamp:
              Math.floor(
                now / 1000
              ) -
              60 * 60,
          },
        ],
      });

    assert.equal(
      isFreshReviewPasswordAuthenticationToken(
        token,
        now
      ),
      false
    );
  }
);

test(
  "review password helper does not accept OTP or OAuth",
  () => {
    const now =
      Date.parse(
        "2026-09-28T12:00:00.000Z"
      );

    for (
      const method of
      [
        "otp",
        "oauth",
      ]
    ) {
      const token =
        makeJwt({
          session_id:
            `review-session-${method}`,

          amr: [
            {
              method,

              timestamp:
                Math.floor(
                  now / 1000
                ),
            },
          ],
        });

      assert.equal(
        isFreshReviewPasswordAuthenticationToken(
          token,
          now
        ),
        false
      );
    }
  }
);

test(
  "recognizes only the exact Google Play review app metadata marker",
  () => {
    assert.equal(
      isGooglePlayReviewAccountMetadata({
        ayzo_account_type:
          "google_play_review",
      }),
      true
    );

    assert.equal(
      isGooglePlayReviewAccountMetadata({
        ayzo_account_type:
          "customer",
      }),
      false
    );

    assert.equal(
      isGooglePlayReviewAccountMetadata({
        google_play_review:
          true,
      }),
      false
    );

    assert.equal(
      isGooglePlayReviewAccountMetadata(
        null
      ),
      false
    );

    assert.equal(
      isGooglePlayReviewAccountMetadata(
        "google_play_review"
      ),
      false
    );
  }
);
