# AYZO Wave 22 — Final Two Production Contract

Generated before Stellar + Hyperliquid implementation.

## Current state

- Registered networks: 22
- Public live networks: 20
- Remaining gated networks:
  - Stellar
  - Hyperliquid

No public marketing claim may say 22 live networks until the
final release gate passes.

---

# Stellar

## Canonical model

Stellar must remain a Stellar-native evidence engine.

The implementation may use Horizon for indexed account history,
payments, operations, offers and trades.

The engine must not pretend Stellar is EVM.

## Required evidence

- account state
- XLM balance
- issued-asset balances
- trustline state
- asset issuer relationships
- account signers
- signature thresholds
- account flags
- recent transactions
- recent payments
- earliest bounded payment evidence
- recent operations
- current offers
- recent trades
- direct payment counterparties
- observed account-funding/create-account evidence where present
- bounded transaction/activity timeline
- evidence relationship graph

## Required product integration

- Free / Pro / Advanced monotonic evidence depth
- Public web intelligence API
- Mobile intelligence API
- Public v1 intelligence API
- internal smoke endpoint
- web analysis workspace
- mobile analysis support
- Ask AYZO adapter
- Historical Evidence
- Advanced Batch Analysis
- product capability mapping
- address detection
- canonical registry
- production tests

## Stellar caveat

Public Horizon is an indexed data source and its retained historical
window must not be described as exhaustive lifetime history.

---

# Hyperliquid

## Canonical model

Hyperliquid must be represented as TWO explicit execution surfaces:

1. HyperCore
2. HyperEVM

They must not be collapsed into a generic EVM-only result.

## HyperCore required evidence

- perpetual clearinghouse state
- open perpetual positions
- leverage / liquidation evidence where returned
- margin/account value state
- spot clearinghouse balances
- recent user fills
- recent funding payments
- portfolio history where available
- bounded trading activity timeline

## HyperEVM required evidence

- mainnet chain ID 999 verification
- HYPE native balance
- account transaction count / nonce
- deployed-code presence
- latest-state RPC evidence

The official RPC is NOT an indexed address-history provider.
AYZO must not invent HyperEVM wallet transaction history when
the source does not provide it.

## Address ambiguity

Hyperliquid account addresses use the EVM 20-byte 0x shape.

Automatic address detection must continue to classify an ambiguous
0x address as EVM.

If the user explicitly selects Hyperliquid, AYZO must preserve
Hyperliquid selection rather than silently changing to Ethereum.

## Required product integration

- Free / Pro / Advanced monotonic evidence depth
- Public web intelligence API
- Mobile intelligence API
- Public v1 intelligence API
- internal smoke endpoint
- web analysis workspace
- mobile analysis support
- Ask AYZO adapter
- Historical Evidence
- Advanced Batch Analysis
- product capability mapping
- canonical registry
- production tests

## Evidence safety

- fills are trading evidence, not identity evidence
- positions are account-state evidence
- funding payments are exchange funding-rate evidence and must not
  be mislabeled as wallet funding provenance
- HyperCore trading funding and wallet funding provenance are
  separate concepts
- HyperEVM latest-state evidence does not prove historical activity
- no common-ownership inference

---

# Release requirement

Stellar and Hyperliquid may be promoted from development to live only
after:

- provider live smokes pass
- focused tests pass
- TypeScript passes
- full AYZO suite passes
- ESLint passes
- mobile production build passes
- web production build passes
- canonical/product/mobile live parity is 22/22
- Stellar and Hyperliquid have explicit mobile readiness
- no unsupported Smart Alert coverage is introduced
- no premature public 22-live marketing copy is committed

Smart Alerts remain limited to their existing supported monitoring
families unless separate monitoring adapters are implemented.
