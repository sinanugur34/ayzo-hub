# AYZO GoldRush Exit — Phase 4, Preview-only Etherscan diagnostics

## Reason

Phase 3 Etherscan V2 `tokentx` returned `TIMEOUT` on Sonic and Mantle. Runtime logs had no provider-level cause. A `Ready` deployment and correct provider routing did not prove successful transfer retrieval.

## Bounded diagnostic

A new **internal-authenticated, Preview-canary-only** endpoint accepts only `ethereum`, `sonic`, or `mantle` and makes one request per invocation to the fixed `https://api.etherscan.io/v2/api` origin: `module=proxy&action=eth_blockNumber`. The query has no wallet or token input. The response only contains network, chain ID, operation, status category, HTTP status, and duration. It never outputs the Etherscan key, raw URL, raw response, or upstream error text.

The probe is limited to 7s, 32 KiB, no redirects, no retries, and no cache. Missing keys, Free-plan restrictions, rate limits, invalid credentials, timeouts, invalid data, and transport errors are differentiated. It reuses AYZO physical provider usage accounting.

`AVAILABLE` is a **basic Etherscan proxy eligibility check**, **not** evidence that `account/tokentx` works or that ERC-20 transfer data is complete. Sonic/Mantle transfer parity and the remaining holder deficit still block a full GoldRush retirement.

The diagnostic route is additionally protected by AYZO internal auth and is disabled in Production even if the flag is set there. Branch Preview canary is rolled back to `0` after deployment tests. Immutable older Preview deployments may retain canary-on.

No Production env change, API key deletion, merge, or Production deployment is authorized by this phase.
