# AYZO Wave30 B — Provider Readiness

Date: 2026-09-30

## Engineering status

NEAR deep intelligence:
- native validation PASS
- official RPC mainnet PASS
- indexed NearBlocks mainnet PASS
- deep engine PASS
- web/mobile/API integration PASS
- Ask AYZO PASS
- Historical Evidence PASS
- Batch integration prepared

Hedera deep intelligence:
- native validation PASS
- Hedera public Mirror mainnet PASS
- deep engine PASS
- web/mobile/API integration PASS
- Ask AYZO PASS
- Historical Evidence PASS
- Batch integration prepared
- independent Hgraph fallback architecture implemented

## Production promotion status

NEAR remains `development`.

Reason:
production/commercial indexed provider credentials are
not configured. `NEARBLOCKS_API_KEY` is required before
commercial production acceptance.

Hedera remains `development`.

Reason:
independent mirror credentials are not configured.
`HGRAPH_API_KEY` is required before production acceptance.

## Canonical state

Registered networks: 26
Production-live networks: 24

No Wave B network may be promoted merely because an
anonymous/public provider responded successfully.

Promotion requires configured production credentials,
real provider smoke, Preview HTTP acceptance and
Production HTTP acceptance.
