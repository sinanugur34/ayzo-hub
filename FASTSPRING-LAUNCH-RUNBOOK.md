# AYZO FastSpring Launch Runbook

## Current State

- Branch: feat/fastspring-live-mode
- Preview FastSpring mode: test
- Preview checkout UI: CLOSED
- Preview checkout API gate: CLOSED
- Production checkout: CLOSED
- Production FastSpring billing: NOT ENABLED
- FastSpring live payments: NOT ENABLED
- Billing regression: PASS
- Webhook lifecycle tests: PASS
- FastSpring Support case: OPEN

## Current External Blocker

FastSpring Sessions V2:

1. Session creation -> HTTP 201
2. checkoutStatus -> PRODUCTS_REQUIRED
3. Session cart -> empty
4. Add valid product to cart -> HTTP 500

Do not weaken AYZO safeguards to bypass this issue.

---

## Gate 1 — Provider Fix

Before enabling checkout verify:

- API authentication -> PASS
- Monthly product -> HTTP 200
- Annual product -> HTTP 200
- V2 session -> HTTP 201
- Selected product appears in cart
- Checkout URL uses test FastSpring host

If FastSpring returns 5xx or cart stays empty:

STOP. Keep checkout CLOSED.

---

## Gate 2 — Preview Activation

Preview only:

FASTSPRING_MODE=test
AYZO_PRO_CHECKOUT_ENABLED=true
NEXT_PUBLIC_AYZO_PRO_CHECKOUT_ENABLED=true

Then redeploy Preview.

Verify:

- Pricing shows Monthly / Annual checkout
- Free Account shows Upgrade to Pro
- Unauthenticated checkout -> 401
- Existing Pro checkout -> 409
- Authenticated Free checkout -> HTTP 201
- Checkout hostname is TEST FastSpring

Production remains untouched.

---

## Gate 3 — Preview Test Purchase

Test Monthly first, then Annual.

Verify:

- Correct product
- Correct price
- Test checkout completes
- FastSpring webhook reaches AYZO
- webhook_events row created
- subscriptions row created
- Account changes Free -> Pro
- founding_customer=true
- billing interval correct
- period dates valid
- page refresh keeps Pro access

---

## Gate 4 — Lifecycle

Verify:

subscription.activated
-> active
-> Pro granted

subscription.charge.completed
-> Pro remains active

subscription.canceled
-> cancel_at_period_end=true
-> access preserved until period end

subscription.uncanceled
-> active restored

subscription.deactivated
-> paid access removed
-> Free restored

---

## Gate 5 — Duplicate Safety

Replay the same valid webhook.

Expected:

- no duplicate subscription
- webhook recognized as duplicate
- entitlement unchanged

Conflicting payload with the same provider event ID must not be silently accepted.

---

## Gate 6 — Production Preparation

Only after every Preview gate passes:

1. Working tree CLEAN
2. Billing tests PASS
3. TypeScript PASS
4. Lint PASS
5. Build PASS
6. Merge reviewed billing commits
7. Deploy Production code with checkout CLOSED
8. Smoke-test login/account/free analysis/alerts

Production code deployment and billing activation are separate gates.

---

## Gate 7 — Production FastSpring

Configure Production only after Preview acceptance:

FASTSPRING_API_USERNAME
FASTSPRING_API_PASSWORD
FASTSPRING_WEBHOOK_SECRET
FASTSPRING_CHECKOUT_PATH
FASTSPRING_PRO_MONTHLY_PATH
FASTSPRING_PRO_ANNUAL_PATH
FASTSPRING_MODE=live

Do not print secret values.

Checkout gates must remain CLOSED during configuration verification.

---

## Gate 8 — Controlled Live Smoke Test

Only after Production configuration passes:

AYZO_PRO_CHECKOUT_ENABLED=true
NEXT_PUBLIC_AYZO_PRO_CHECKOUT_ENABLED=true

Redeploy and verify:

1. Checkout UI visible
2. unauthenticated -> 401
3. existing Pro -> 409
4. authenticated Free -> checkout created
5. LIVE FastSpring hostname
6. correct product
7. correct price
8. one controlled real purchase
9. webhook accepted
10. subscription stored
11. Account becomes Pro

Do not publicly announce checkout before this passes.

---

## Emergency Rollback

Immediately set:

AYZO_PRO_CHECKOUT_ENABLED=false
NEXT_PUBLIC_AYZO_PRO_CHECKOUT_ENABLED=false

Redeploy.

Verify:

- Pricing returns to waitlist
- Upgrade buttons disappear
- authenticated Free checkout -> 503

Do not delete subscription history.

---

## Stop Conditions

Close checkout immediately for:

- unexpected FastSpring 5xx
- test/live mismatch
- wrong product
- wrong price
- duplicate subscription
- webhook signature failures
- ownership conflict
- entitlement mismatch
- webhook ledger failure

Fail closed first. Investigate second.

---

## Security Rules

- Never print API credentials.
- Never expose Basic Authorization headers.
- Never commit secrets.
- Never send secrets in support screenshots.
- Preview before Production.
- Test before live.
- UI gate is not the security boundary.
- Server checkout gate is authoritative.

## Public Launch Rule

FastSpring fixed
+ Preview Monthly PASS
+ Preview Annual PASS
+ Webhook lifecycle PASS
+ Duplicate handling PASS
+ Production configuration PASS
+ Controlled live purchase PASS
= PUBLIC PRO CHECKOUT
