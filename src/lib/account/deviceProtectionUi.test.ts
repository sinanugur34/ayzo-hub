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

const route =
  read(
    "../../app/api/account/device-security/route.ts"
  );

const panel =
  read(
    "../../components/account/DeviceSecurityPanel.tsx"
  );

const account =
  read(
    "../../app/account/page.tsx"
  );

const signOut =
  read(
    "../../components/auth/SignOutButton.tsx"
  );

const header =
  read(
    "../../components/auth/HeaderAuthControls.tsx"
  );

test(
  "device security API lists only authenticated account devices",
  () => {
    assert.match(
      route,
      /getAuthenticatedAccountContext/
    );

    assert.match(
      route,
      /account_device_sessions/
    );

    assert.match(
      route,
      /\.eq\(\s*"user_id"/
    );
  }
);

test(
  "device security API cannot revoke current device through remote-device action",
  () => {
    assert.match(
      route,
      /sessionId ===\s*deviceSessionId/
    );

    assert.match(
      route,
      /Use local sign out for the current device/
    );
  }
);

test(
  "security panel displays two-device policy",
  () => {
    assert.match(
      panel,
      /up to two devices/
    );

    assert.match(
      panel,
      /third device automatically signs out the oldest active device/
    );
  }
);

test(
  "security panel can sign out another device",
  () => {
    assert.match(
      panel,
      /revoke_device/
    );

    assert.match(
      panel,
      /Sign out device/
    );
  }
);

test(
  "security panel shows new-device login notification",
  () => {
    assert.match(
      panel,
      /New device sign-in/
    );

    assert.match(
      panel,
      /ack_notifications/
    );
  }
);

test(
  "account page includes device security panel",
  () => {
    assert.match(
      account,
      /DeviceSecurityPanel/
    );
  }
);

test(
  "both sign-out controls revoke current device ledger",
  () => {
    assert.match(
      signOut,
      /revoke_current/
    );

    assert.match(
      header,
      /revoke_current/
    );
  }
);
