import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

function read(
  relative: string
) {
  return readFileSync(
    new URL(
      relative,
      import.meta.url
    ),
    "utf8"
  );
}

const auth =
  read(
    "./auth.ts"
  );

const callback =
  read(
    "../../app/auth/callback/route.ts"
  );

const proxy =
  read(
    "../supabase/proxy.ts"
  );

const account =
  read(
    "../../app/account/page.tsx"
  );

test(
  "central account auth enforces device ledger",
  () => {
    assert.match(
      auth,
      /ensureCurrentAccountDevice/
    );

    assert.match(
      auth,
      /deviceRevoked/
    );
  }
);

test(
  "auth callback registers authenticated device",
  () => {
    assert.match(
      callback,
      /registerAccountDevice/
    );

    assert.match(
      callback,
      /DEVICE_COOKIE_NAME/
    );
  }
);

test(
  "revoked device needs fresh token after genuine login",
  () => {
    assert.match(
      callback,
      /isRevokedDeviceError/
    );

    assert.match(
      callback,
      /createDeviceToken/
    );
  }
);

test(
  "proxy installs HttpOnly device cookie",
  () => {
    assert.match(
      proxy,
      /DEVICE_COOKIE_NAME/
    );

    assert.match(
      proxy,
      /httpOnly:\s*true/
    );

    assert.match(
      proxy,
      /sameSite:\s*"lax"/
    );
  }
);

test(
  "account page distinguishes replaced device",
  () => {
    assert.match(
      account,
      /device_replaced/
    );
  }
);
