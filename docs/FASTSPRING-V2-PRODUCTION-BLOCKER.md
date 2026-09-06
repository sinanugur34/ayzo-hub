# FastSpring Sessions V2 Production Blocker

Status: BLOCKED — FastSpring Support contacted
Environment: FastSpring Test Mode
Checkout path: ayzoio/main

## Verified AYZO behavior

- Monthly FastSpring Test E2E: PASS
- Annual FastSpring Test E2E: PASS
- subscription.activated: PASS
- subscription.canceled: PASS
- subscription.uncanceled: PASS
- subscription.deactivated: PASS
- HMAC verification: PASS
- Vercel webhook delivery: PASS
- AYZO entitlement lifecycle: PASS
- Legacy Sessions v1 Test fallback: PASS

## Sessions V2 blocker

Create Session:

POST /v2/checkouts/ayzoio/main/sessions

AYZO sends:

- live: false
- orderTags: present
- cart.items[].productPath: valid product
- cart.items[].quantity: 1

FastSpring returns HTTP 201, but:

- returned cart is empty
- checkoutStatus contains PRODUCTS_REQUIRED

Add Session Item:

POST /v2/checkouts/ayzoio/main/sessions/{sessionId}/cart/items

with a valid productPath and quantity returns:

- HTTP 500 INTERNAL_SERVER_ERROR
- provider message indicates an internal FastSpring error

## Additional verification

- ayzoio/main is a valid Web Checkout.
- ayzoio/web-main returns 404 and is not valid.
- The same monthly and annual catalog products complete successful
  Test Mode purchases through legacy Sessions v1.
- Current AYZO V2 implementation remains fail-closed.
- No live billing has been enabled.

## Production rule

Do not enable FastSpring live billing until Sessions V2 cart population
works correctly or FastSpring provides an approved production-safe path.

Do not weaken AYZO's V2 cart/product validation as a workaround.

## External dependency

FastSpring Support has been contacted with the reproduced 201/empty-cart
and 500 Add Session Item behavior.

Add the FastSpring case/reference number here when received.
