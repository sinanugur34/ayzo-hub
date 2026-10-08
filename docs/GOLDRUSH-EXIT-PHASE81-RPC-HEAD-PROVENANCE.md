# AYZO GoldRush Exit — Phase 8.1: canonical RPC head and honest provenance

## Source and scope

After Phase 7.5 live acceptance, Sonic and Mantle each passed two-page real-witness tests with bounded canonical RPC logs and signed cursors (2/2). The Phase 8 baseline exposed two technical dependencies: the first page still fetched `eth_blockNumber` from Etherscan V2 using an API key, and the successful RPC results were labelled `etherscan`.

## Changes

For **Preview canary** Sonic (146) and Mantle (5000) transfers, the first page now reads `eth_blockNumber` and `eth_chainId` directly from the chain's configured public RPC; the chain identity must match the registry or the result fails closed. No `ETHERSCAN_API_KEY` is needed for the canonical branch. Signed cursor continuations preserve their immutable head and validate chain identity before reading logs. Invalid signatures and wrong-wallet cursors are rejected before provider I/O. Successful and failed canonical results use providerId `sonic-rpc` or `mantle-rpc`. Every physical request uses existing `providerUsageFetch` telemetry, including head/identity calls. These providers remain `request_only` with unknown public USD cost; we do **not** invent monetary estimates.

The older `preferCanonicalRpc:false` Etherscan/indexer adapter and its regression tests are retained. The cursor prefix `etherscan-log:` stays unchanged for compatibility with already-issued signed Preview cursors. It is not a statement of current provider provenance. Production remains gated off from this canary adapter.

## Remaining release gates

Verify new exact-SHA first/second-page Sonic/Mantle live acceptance with the new providerId strings; measure dense-wallet deep paging, retention, actual provider cost, and holder/transaction/trace replacement across 30 live networks. Free/Pro/Advanced 20/60/200 target is not proven by transaction-page configuration alone. Keep PR #151 Draft; do not merge or deploy Production.
