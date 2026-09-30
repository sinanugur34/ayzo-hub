# AYZO Bitcoin + Hyperliquid Deep Intelligence V2

Date: 2026-09-30

## Global rule

A live network must provide meaningful native deep analysis.
Depth must remain bounded, evidence-first, provider-safe and plan-aware.

Free <= Pro <= Advanced.

No ownership, identity, intent or common-control inference may be invented.

---

## Bitcoin V2

Required:

1. Multi-transaction canonical evidence
   - Free: >= 1 canonical transaction
   - Pro: > Free
   - Advanced: > Pro

2. Native UTXO flow analysis
   - observed incoming transactions
   - observed outgoing transactions
   - self/unresolved classification
   - bounded exact satoshi totals where evidence supports it

3. Counterparty evidence
   - source/output addresses only when directly available from canonical scripts/provider evidence
   - no inferred change ownership

4. Observed funding
   - earliest directly observed inbound source in bounded canonical evidence
   - must not be called ultimate funding source

5. Canonical coverage
   - requested
   - verified
   - unavailable
   - prevout resolution coverage

6. Activity timeline

7. Bounded wallet graph
   - observed evidence only
   - no ownership inference

8. Provider safety
   - bounded prevout fanout
   - timeout/rate-limit safe degradation
   - no unbounded recursion

---

## Hyperliquid V2

HyperCore and HyperEVM remain separate execution surfaces.

Required HyperCore evidence:

1. clearinghouse state
2. positions
3. spot balances
4. fills
5. perpetual funding payments
6. portfolio
7. role
8. non-funding ledger updates

Non-funding ledger updates must support evidence classification for:
- deposits
- withdrawals
- transfers
- account-class transfers
- vault-related ledger movements when present
- other supported ledger delta types without inventing meaning

Required derived analysis:

1. account/trading state
2. position exposure
3. fill/trading activity
4. perpetual funding-payment history
5. portfolio evidence
6. deposit/withdrawal/transfer flow
7. directly observed counterparties when an address exists in the ledger evidence
8. bounded timeline
9. plan-aware lookback/depth

Important semantic rule:

HyperCore perpetual funding payments are trading-economics evidence.
They are NOT wallet funding provenance.

Non-funding ledger deposit/transfer/withdrawal evidence may describe observed fund movement,
but must not be promoted to ultimate provenance unless the evidence directly establishes it.

---

## HyperEVM

Required:
- chain ID 999 validation
- native HYPE balance
- nonce / transaction count
- runtime code / contract state

Do NOT claim indexed address transaction history from standard JSON-RPC.

---

## Product capability rule

Hyperliquid must not receive `fundingTrace` or `connections`
until the implemented ledger evidence genuinely supports those product capabilities
and tests prove the semantics.

Bitcoin registry capability claims must match real engine output.

---

## Acceptance

- TypeScript PASS
- focused BTC tests PASS
- focused Hyperliquid tests PASS
- product capability tests PASS
- full test suite PASS
- lint PASS
- web build PASS
- mobile build PASS
- no new secrets
- working tree clean
