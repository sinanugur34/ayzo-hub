# AYZO GoldRush exit — Phase 6: Etherscan ERC-20 log correlation (Preview-only)

## Evidence

Phase 5 live immutable Preview returned `EVENT_MISSING_LOG_INDEX` for both Sonic (291 ms) and Mantle (173 ms), one bounded `tokentx` row on each network. Etherscan `account/tokentx` must not be treated as an authoritative unique log identifier where `logIndex` is absent.

## Diagnostic, never normal routing

New internal authenticated and Preview-canary-only route `POST /api/internal/evm/etherscan-log-correlation-probe` accepts exactly `sonic` or `mantle`. Fixed public wS/WMNT contracts. Read-only Etherscan V2: head block (`proxy.eth_blockNumber`), a single `account.tokentx` sample within 2,048 blocks, then `logs.getLogs` scoped to the **sample's block, token contract, ERC-20 Transfer signature, indexed sender, and indexed receiver**. Logs are matched to the `tokentx` result by transaction hash, event topics, transfer value and block. A valid unique `logIndex` from logs is required, and ambiguous duplicate amounts in one transaction fail closed. Query results and key never leave the service; only outcome codes, durations and counts are returned.

Each upstream request is at most 5 seconds, 128 KiB, no redirects, retries, caches. Log page cap is 50; a full 50-row page is **not accepted** because records may be truncated. All physical fetches are included in provider usage accounting.

`MATCHED_SINGLE_LOG` is limited structural reconciliation evidence. It is NOT wallet-query certification, full historical coverage, pagination parity, multi-log wallet transaction semantics, or a basis for Production deployment. `NO_MATCH`, `AMBIGUOUS_MATCH`, `TRUNCATED_LOG_RESULTS`, missing indices, rate limits, timeouts and plan failures all fail closed.

No Production codepaths change; feature branch and PR #151 remain Draft until all Free/Pro/Advanced and supported network parity checks pass.
