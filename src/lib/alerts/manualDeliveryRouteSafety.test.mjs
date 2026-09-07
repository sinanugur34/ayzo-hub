import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const deliverRoute =
  fs.readFileSync(
    "src/app/api/internal/alerts/deliver/route.ts",
    "utf8"
  );

const scheduledRoute =
  fs.readFileSync(
    "src/app/api/internal/alerts/scheduled/route.ts",
    "utf8"
  );

const deliveryConstants =
  fs.readFileSync(
    "src/lib/alerts/delivery.ts",
    "utf8"
  );

test(
  "manual delivery requires explicit single claim limit",
  () => {
    assert.match(
      deliverRoute,
      /isValidManualAlertDeliveryClaimLimit\s*\(\s*body\.claimLimit\s*\)/
    );

    assert.match(
      deliverRoute,
      /SINGLE_DELIVERY_LIMIT_REQUIRED/
    );
  }
);

test(
  "manual route binds database claim to one",
  () => {
    assert.match(
      deliverRoute,
      /claimAlertDeliveries\s*\(\s*MANUAL_ALERT_DELIVERY_CLAIM_LIMIT\s*\)/
    );
  }
);

test(
  "scheduled route retains normal delivery worker claim",
  () => {
    assert.match(
      scheduledRoute,
      /claim:\s*claimAlertDeliveries/
    );
  }
);

test(
  "normal delivery batch remains ten",
  () => {
    assert.match(
      deliveryConstants,
      /ALERT_DELIVERY_CLAIM_LIMIT\s*=\s*10/
    );
  }
);
