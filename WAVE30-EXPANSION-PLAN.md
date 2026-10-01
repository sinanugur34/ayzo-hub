# AYZO — 30 Live Blockchain Expansion Plan

Date: 2026-10-01

## Product target

AYZO currently has:

- 24 production-live blockchain networks
- Hedera prepared for final production promotion
- NEAR retained but deferred

The next accepted blockchain targets are:

1. Hedera
2. Zcash
3. Algorand
4. Polkadot
5. Cosmos Hub
6. Injective

If all six are accepted:

- production-live blockchain networks: 30

NEAR remains registered/deferred and is not required
for the 30-live target.

The eventual blockchain registry may therefore contain
31 registered networks while only 30 are live.

---

# Chainlink / LINK

Chainlink is an additional AYZO intelligence surface.

It MUST NOT be represented as a synthetic blockchain
network.

Chainlink Intelligence initial scope:

- LINK token evidence on supported underlying chains
- explicit LINK transfer evidence
- holder evidence where provider support exists
- contract evidence
- Data Feed contract evidence where explicit
- CCIP message evidence where explicit
- source-chain identity
- destination-chain identity
- transaction references
- contract references
- explicit coverage
- explicit limitations

Chainlink intelligence MUST preserve the identity of
the underlying blockchain.

A LINK transfer on Ethereum remains Ethereum evidence.

A CCIP message must preserve both source and
destination network identities.

AYZO must not infer:

- oracle operator identity beyond explicit evidence
- cross-chain ownership
- common wallet control
- asset ownership
- message intent
- ultimate funding origin

---

# Zcash

Target:

- native Zcash intelligence

Required evidence-first behavior:

- distinguish transparent and shielded surfaces
- transparent address validation
- transparent balance where supported
- transparent transaction history
- transparent input/output flow
- explicit counterparties where observable
- observed funding only where observable
- transaction detail
- block / confirmation evidence
- shielded evidence coverage state

AYZO MUST NOT attempt to reconstruct information hidden
by Zcash shielding.

A shielded surface must be reported as unavailable or
private where the public chain does not expose the
required evidence.

---

# Algorand

Target:

- native Algorand intelligence

Required surfaces:

- account state
- ALGO balance
- asset holdings
- account transaction history
- payment transactions
- asset transfers
- application calls
- inner transactions where explicit
- rekey evidence where explicit
- counterparties
- observed flows
- funding evidence
- timeline
- evidence graph

Preferred architecture:

- algod for current canonical state
- Indexer V2 for historical indexed evidence

Pagination must be bounded.

---

# Polkadot

Target:

- native Polkadot / Substrate intelligence

Required surfaces:

- account state
- DOT balance
- extrinsic history
- event evidence
- transfers
- staking evidence where explicit
- proxy / multisig evidence where explicit
- counterparties
- flow
- timeline
- graph

Native Substrate evidence must not be flattened into
generic EVM semantics.

Provider/indexer acceptance is required before live.

---

# Cosmos Hub

Target:

- native Cosmos Hub intelligence

Required surfaces:

- bech32 account validation
- ATOM balance
- transaction history
- message evidence
- bank transfers
- staking / delegation evidence
- validator relationships where explicit
- IBC evidence where explicit
- counterparties
- flow
- timeline
- graph

IBC relationship != common ownership.

Delegation != ownership.

---

# Injective

Target:

- native Injective intelligence

Required surfaces:

- account state
- INJ balance
- transaction history
- bank transfers
- staking evidence
- token evidence
- exchange/module evidence where explicit
- contract evidence where explicit
- counterparties
- flow
- timeline
- graph

Injective native semantics must be preserved rather
than represented as generic EVM-only evidence.

---

# Development order

Production work order:

Wave B closeout:
- Hedera final live promotion
- NEAR deferred

Expansion Wave 1:
- Zcash
- Algorand

Expansion Wave 2:
- Polkadot
- Cosmos Hub

Expansion Wave 3:
- Injective
- Chainlink Intelligence

Provider feasibility MUST be proven before large
product-surface implementation.

A provider that is expensive, unstable, ambiguous or
commercially unsuitable MUST NOT be accepted merely to
meet a network-count target.

---

# Global acceptance

Every new live blockchain requires:

- native validation
- explicit provider contract
- bounded Free / Pro / Advanced depth
- real-mainnet tests
- evidence normalization
- coverage contract
- failure semantics
- web surface
- mobile surface
- API surface
- Ask AYZO
- Historical Evidence
- Batch compatibility where applicable
- TypeScript
- tests
- lint
- build
- secret scan
- Preview acceptance
- Production acceptance

The public live count changes only after all applicable
acceptance gates pass.
