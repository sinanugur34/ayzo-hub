# AYZO GoldRush Exit — Phase 5: bounded ERC-20 transfer probe

The Phase 4 basic Etherscan proxy `eth_blockNumber` check returned HTTP 200 in Ethereum (149 ms), Sonic (111 ms), and Mantle (119 ms). Meanwhile the older unbounded `account/tokentx` address=zero tests timed out at 12s. These are different endpoints; the former does **not** certify the latter.

This Phase 5 route is **internal-authenticated and only active under the Preview/localhost GoldRush exit canary**. It accepts exactly `sonic` or `mantle`, with hardcoded public wS/WMNT token contracts. For each request, it calls `eth_blockNumber` once to establish a chain head and then `account/tokentx` once for the token in only the last **2,048 blocks**, with `page=1`, `offset=1`, `sort=desc`, no wallet filter. Each call is bounded to 5s and 32KiB, without redirects, retries, or cache. It uses shared provider-usage accounting.

Results never expose API keys, query URLs, upstream errors, wallets, transaction hashes, or token amounts. `EVENT_WITH_LOG_INDEX` proves one structurally valid sample, **not** provider pagination, wallet-specific coverage or full parity. `EVENT_MISSING_LOG_INDEX` specifically identifies a schema incompatibility with the current `normalizeEtherscanErc20Transfers` parser and does **not** count as verified event identity. `EMPTY_WINDOW` is only a diagnostic result. Any other outcome means the bounded request was not confirmed.

Phase 5 adds diagnostics only; it does **not** change normal user analysis paths, GoldRush fallbacks, subscriptions, or Production. PR #151 stays Draft. Before merging: audit true token transfer event identity, real wallet-query performance, pagination, holders and Free/Pro/Advanced parity. Production deployment and GoldRush key deletion are not authorized by this phase.
