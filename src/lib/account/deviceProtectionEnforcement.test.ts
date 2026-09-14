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

const deviceServer =
  read(
    "./deviceProtectionServer.ts"
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


test(
  "unknown device token cannot use genuine-login registration path",
  () => {
    const start =
      deviceServer.indexOf(
        "export async function ensureCurrentAccountDevice"
      );

    const end =
      deviceServer.indexOf(
        "export async function getCurrentDeviceToken"
      );

    assert.ok(
      start >= 0 &&
      end > start
    );

    const ensureBlock =
      deviceServer.slice(
        start,
        end
      );

    assert.match(
      ensureBlock,
      /bootstrapAccountDevice/
    );

    assert.doesNotMatch(
      ensureBlock,
      /registerAccountDevice/
    );
  }
);


test(
  "legacy bootstrap uses dedicated zero-history database RPC",
  () => {
    assert.match(
      deviceServer,
      /ayzo_bootstrap_account_device/
    );

    assert.match(
      deviceServer,
      /export async function bootstrapAccountDevice/
    );
  }
);


test(
  "genuine auth callback still owns new-device registration",
  () => {
    assert.match(
      callback,
      /registerAccountDevice/
    );

    assert.doesNotMatch(
      callback,
      /bootstrapAccountDevice/
    );
  }
);


test(
  "device security signals use a domain-separated derived key",
  () => {
    assert.match(
      deviceServer,
      /ayzo:account-device-signals:v1/
    );

    assert.match(
      deviceServer,
      /createHmac/
    );

    assert.doesNotMatch(
      deviceServer,
      /function getSecuritySecret\(\)\s*\{\s*return getInternalApiKey\(\);\s*\}/
    );
  }
);
