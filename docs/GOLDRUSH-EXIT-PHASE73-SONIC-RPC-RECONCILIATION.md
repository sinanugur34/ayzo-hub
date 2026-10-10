# AYZO Phase 7.3 — Sonic canonical RPC log-index cross-check (Preview only)

## Evidence

Live Sonic Etherscan `logs.getLogs` returned HTTP 200 and one outgoing ERC-20 log, but the log had `INVALID_LOGINDEX`. Incoming was a known empty response. Mantle passed public-wallet, page 2, cursor signature and wallet binding live tests. Git HEAD before change `877718fa6a550f355caafa4797b2b3d31481c777`.

## Design

When **Sonic's** Etherscan directional result contains a missing logIndex, query **both** same-window Sonic public `eth_getLogs` directions with exact token/wallet/event filters. Compare every Etherscan row to a unique Sonic RPC canonical event using *block, transactionHash, contract address, topics and event data*. Require exact counts for **both directions**, even when Etherscan claims no events. Fill missing logIndex only when there is exactly one provable match. Reject ambiguous duplicate fingerprints, mismatched counts or values, missing RPC index, truncated >=50 rows, timeout and unexpected statuses. No insertion of fabricated events, no change to cursor format, no Mantle routing change. All RPC attempts enter provider usage accounting (`sonic-rpc` operation labels).

Fixed public RPC endpoint, no redirect, 5s timeout each, 256 KiB response cap. At most two extra RPC calls per transfer page and **only** when an indexed event lacks its log index. Fail closed if verification cannot be completed.

## Limits / non-certifications

An Etherscan page with log indices already present does not automatically invoke independent reconciliation. The feature is still Preview-canary-only. Not proof of complete historical coverage, dense account traversal, exact 20/60/200 Free/Pro/Advanced analysis or Production readiness. No GoldRush keys removed, PR #151 stays Draft.
