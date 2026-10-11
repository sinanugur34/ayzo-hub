# AYZO Phase 22.7.48 — Optimism WETH indexed snapshot

Scope: isolated Preview candidate; **not certified for Production**.

## Root cause
Optimism WETH Blockscout `total_supply` was consistently below independent on-chain `totalSupply()`.
The old adapter required exact supply equality and returned `UPSTREAM_ERROR` before fetching holders.

## Narrow recovery
After at most two paired metadata + on-chain reads, allow an indexed-only result solely
for Optimism WETH (`0x4200000000000000000000000000000000000006`) when the on-chain
supply is strictly greater than indexed supply and drift <= 1 basis point.

Indexed-only evidence returns the provider's validated raw holder list and signed cursor
with `supplyEvidence: indexed_snapshot_only`, `totalSupply: null`, and **all percentages null**.
This is NOT an on-chain-certified, synchronized Top 100 snapshot. Never label it as such.
On-chain-reconciled results retain supply and percentages, with `supplyEvidence: verified`.

Still reject malformed supply, missing RPC, older chain supply, drift >1 bps,
duplicates, unsorted results, impossible balances, invalid cursors, wrong chain,
and any Production or disabled-canary usage. On mismatched source snapshots,
strict aggregate guards apply to both the on-chain and indexed supplies.

## Validation
Run full focused mock tests, TypeScript, ESLint, and a new protected Preview deployment.
The Preview response must explicitly show `indexed_snapshot_only` with null percentages
and null supply for drift. A `200` response alone is NOT certification.

If the live drift exceeds 1 bps or Alchemy cannot reconcile the RPC data, the
provider deliberately remains unavailable; DO NOT raise the bound without evidence.
No Git push, deployment, or Production modification is performed by this installer.
