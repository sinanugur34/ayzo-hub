# AYZO GoldRush Exit — Phase 7.5: adaptive canonical RPC windows

## Evidence and reason

Phase 7.4 live acceptance at exact SHA `57bb28d` returned **Mantle PASS** for a real wallet and two pages, including signed cursor invalidation. Sonic returned `UPSTREAM_ERROR` on page one. The accompanying Etherscan-only diagnostic showed **50 records in BOTH directions**, but it did not measure canonical RPC directly. The canonical source reader independently rejected any >=50 log array over its 2,048-block window. This change addresses that documented **code-level capacity limit**; it does not assert it was the only live failure cause.

## Preview-only behavior

When `eth_getLogs` returns >=50 in either wallet direction, or a bounded response is too large, the provider queries the newest quarter of the previous window and repeats, at most 7 bounded attempts (14 RPC calls), down to a single block. Ordinary HTTP/RPC errors and rate limits NEVER cause retries or are misclassified as dense pages. A single block with >=50 events, unresolved over-limit response or any malformed log fails closed. No Etherscan indexed transfer record is trusted; original event IDs and strict input checks are unchanged. The returned signed `etherscan-log:` cursor advances from **the actual accepted low block minus one**, not from the original 2,048-block lower bound; thus no older blocks are skipped or double-read. The original immutable head is preserved. The cursor binds wallet, token and network and expires after 24h.

## Cost and coverage warning

This change increases worst-case network calls to 14 per page (plus one initial indexed head fetch). Dense wallets will require more pages. **Do not claim 20/60/200 Free/Pro/Advanced parity or full historical coverage** until measured, and do not merge PR #151 before first+second-page live acceptance and provider-cost gates. Some public RPC nodes may reject large ranges rather than returning a response; those continue to fail closed and require separate evidence. This patch changes only the canary adapter on the Draft PR branch; Production behavior stays unchanged.
