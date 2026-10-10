# AYZO Phase 7 — Preview-only wallet ERC-20 Transfer logs adapter

## Evidence and deliberate scope

Phase 6 live (`17934fd`) reconciled one Etherscan `account.tokentx` sample with **one unique `logs.getLogs` event** on both Sonic and Mantle. The regular Phase 3 adapter is still unusable as-is: `tokentx` lacked `logIndex` and unbounded queries timed out. This phase adds a separate log-native transfer adapter **only on AYZO_GOLDRUSH_EXIT_CANARY=1**, which is hard-disabled in Vercel production.

The adapter queries chain head at first page, then at most **two** `logs/getLogs` directions for a specific token and wallet in one 2,048-block window. Exact topic filters select indexed `from` and `to` addresses. Event identity is `transactionHash:logIndex`, with deduplication for self-transfers. It returns up to 98 valid rows, a nullable actual timestamp and an opaque signed, wallet/token/chain-bound continuation that never serializes addresses for the next **older** window. Cursor retains the original head and expires after 24 hours. Malformed/ambiguous logs, invalid signatures, full directional pages (50 rows), rate limits, oversized responses and timeouts fail closed. A full directional page is NOT a complete window; this adapter will not silently truncate results.

## Important limitations (block merge)

**This is an experimental indexed wallet window reader, not certified complete token history.** A request reads a single bounded window; it can return **zero rows with a non-null continuation**. Consumer components MUST preserve and follow continuation even when the page is empty. Very active wallets may exceed the 50-per-direction limit and currently return unavailable rather than incomplete records. It does not provide per-event timestamps if the upstream omits them, does not certify archival coverage, and doesn't prove 20/60/200 Free/Pro/Advanced targets or cap provider spend across repeated pages. Stop if real Preview smoke tests do not support reliable page continuation.

Retire the older `etherscan-transfer:` cursors while canary is active rather than interpreting them as new log cursors. Alchemy/GoldRush routing outside this canary is unchanged. No PR merge, Production deployment, deletion of GoldRush keys, or plan parity claims are authorized.
