# AYZO Wave30 Deep Intelligence Contract

Date: 2026-09-30

## Goal

Expand AYZO from 22 to 30 live networks.

Wave30 is NOT a network-count exercise.

Every added network must provide meaningful,
native, investigation-grade intelligence.

A basic implementation consisting only of:

- address validation
- balance
- latest block
- latest transactions

does NOT qualify as a live AYZO network.

A network remains planned/unavailable until its
deep acceptance contract passes.

---

# Candidate networks

1. Cardano
2. Aptos
3. NEAR
4. Hedera
5. Algorand
6. Polkadot
7. Cosmos Hub
8. Injective

Implementation order may change if provider
quality or native evidence requires it.

---

# Global evidence rules

AYZO is evidence-first.

Never infer:

- ownership
- identity
- common control
- intent
- beneficial ownership
- exchange identity without evidence
- change-address ownership
- ultimate funding origin
- wallet clustering without direct evidence

Observed relationship != common ownership.

Observed funding != ultimate provenance.

Transaction interaction != entity identity.

---

# Minimum Deep Network Contract

Every Wave30 network must implement all applicable
sections below before status can become live.

## 1. Native address validation

Must reject malformed and wrong-network addresses
before provider access.

Tests must include:

- valid mainnet vectors
- invalid checksum where applicable
- malformed length
- malformed encoding
- cross-network confusion
- surrounding whitespace
- ambiguous-address behavior

---

## 2. Native account state

Must expose chain-native state where available.

Examples:

- native balance
- nonce / sequence
- account existence/state
- staking/delegation state
- contract/resource state
- native asset holdings

No fake cross-chain parity.

---

## 3. Bounded transaction history

Must support deterministic bounded history.

Required:

Free < Pro <= Advanced

Depth may differ by network.

Policy must define:

- record limit
- page limit
- lookback window when applicable
- provider request budget
- timeout behavior

No unbounded pagination.

---

## 4. Canonical transaction evidence

Transaction evidence must retain native semantics.

Where supported:

- transaction hash
- timestamp/block/height/version
- sender
- receiver
- native value
- asset/token transfers
- fee
- execution status
- contract/module/program interaction
- staking action
- bridge/IBC action
- exchange/trading action

Unknown transaction types must remain unknown.

Do not invent classification.

---

## 5. Native flow analysis

Must derive only from explicit evidence:

- incoming
- outgoing
- self
- unresolved

Where supported:

- native coin flow
- token/native asset flow
- staking flow
- trading transfer flow
- bridge / IBC flow

Totals must only combine compatible assets.

---

## 6. Explicit counterparties

Counterparties may only originate from explicit
addresses/accounts in provider or canonical chain data.

Subject address must never appear as its own counterparty.

Counterparty != owner.

Counterparty != same entity.

---

## 7. Observed funding

Implement only where evidence supports it.

Allowed:

"earliest directly observed inbound source
inside the bounded evidence window"

Forbidden:

"original funder"
"ultimate source"
"owner"
"controller"

unless independently established by direct evidence.

---

## 8. Asset intelligence

Where native assets/tokens exist, support meaningful:

- holdings
- transfers
- asset metadata
- issuer/creator where explicit
- mint/supply information where available
- freeze/admin/authority controls where available
- contract/module/object/resource identifiers

Network-specific authority semantics must remain native.

---

## 9. Staking intelligence

Where supported:

- validator/delegator relationship
- delegation
- undelegation/unbonding
- redelegation
- rewards
- staking state

Staking relationship does not imply ownership.

---

## 10. Native specialist intelligence

Each network must have at least one meaningful
network-specific intelligence surface where the
chain provides such evidence.

Examples:

Cardano:
- UTXO/native assets
- stake/delegation evidence
- policy/asset evidence

Aptos:
- Move resources
- fungible assets
- objects
- module/function activity

NEAR:
- account/actions
- access-key evidence
- contract calls
- receipt/action semantics

Hedera:
- account/token relationships
- token control keys
- NFT/token transfers
- staking where available

Algorand:
- ASA holdings/transfers
- created assets
- applications
- rekey evidence

Polkadot:
- balance state
- staking/delegation
- extrinsic/event evidence
- governance where supported

Cosmos Hub:
- bank transfers
- staking
- rewards
- IBC transfers

Injective:
- bank/subaccount movement
- spot trades
- derivative trades
- positions
- funding payments
- deposits/withdrawals

---

# Deep investigation outputs

Before live status, each network should expose
all applicable outputs:

1. Account Snapshot
2. Activity Timeline
3. Flow Intelligence
4. Explicit Counterparties
5. Observed Funding
6. Asset Intelligence
7. Native Specialist Intelligence
8. Evidence Coverage
9. Limitations
10. Evidence Graph

---

# Evidence Graph

Graph nodes and edges must come only from observed
evidence.

Never synthesize:

- ownership edges
- entity edges
- inferred wallet clusters

Graph must exclude self-counterparty edges.

---

# Coverage model

Every deep engine must expose explicit coverage:

- complete
- partial
- unavailable

and where relevant:

- requested records
- returned records
- pages consumed
- provider used
- fallback used
- truncated
- unavailable evidence
- provider request budget

A provider failure must not silently look like
"zero activity".

---

# Provider architecture

Preferred order:

1. official/native source where suitable
2. production-grade indexed provider
3. independent fallback where suitable
4. self-hostable path where practical

Provider failures:

VALIDATION_ERROR:
do not fallback.

RATE_LIMITED:
fallback allowed where safe.

UPSTREAM_FAILURE:
fallback allowed.

MALFORMED_RESPONSE:
fail closed or fallback.

TIMEOUT:
bounded fallback allowed.

No provider secrets in client bundles.

---

# Plan depth

All network plans must obey:

Free <= Pro <= Advanced.

But plan value cannot be simulated only by UI.

Free:
- useful bounded analysis

Pro:
- wider history
- wider evidence set
- wider counterparties
- deeper native analysis where supported

Advanced:
- longest bounded evidence window
- wider graph
- deeper observed funding
- multi-hop investigation only when native evidence
  genuinely supports it
- additional native specialist evidence where supported

No fake Advanced feature.

---

# Ask AYZO

Ask AYZO may only reference evidence produced by
the network engine.

No unsupported entity/funding claims.

---

# Mobile

A live web network must not be left fake/planned
on mobile.

Required:

- network adapter
- summary
- native evidence modules
- limitations
- correct live status

---

# Smart Alerts

Wave30 DOES NOT automatically add Smart Alert support.

A network may become live for analysis while Smart
Alerts remain unsupported.

Smart Alerts require a real monitoring/observer
adapter and separate acceptance.

---

# Security

Required:

- bounded request body
- address validation before provider work
- provider timeout
- pagination bounds
- request budget
- rate-limit handling
- secret isolation
- no raw secret logging
- malformed provider response handling
- safe error normalization

---

# Test acceptance per network

Required before live:

1. address tests
2. provider normalization tests
3. policy tests
4. derived analysis tests
5. engine tests
6. fallback tests where applicable
7. malformed response tests
8. rate-limit tests
9. timeout/degradation tests
10. presentation tests
11. router tests
12. registry tests
13. product capability tests
14. mobile parity tests

Then:

- TypeScript PASS
- focused tests PASS
- full test suite PASS
- ESLint PASS
- web build PASS
- Android debug build PASS
- npm audit high/critical = 0
- working tree clean

---

# Production acceptance

Before declaring a network production-live:

- deployed production build
- public route reachable
- invalid address rejected
- unauth internal route rejected
- authenticated live provider smoke when credentials exist
- bounded real mainnet evidence returned
- no secrets leaked
- production registry parity confirmed

---

# Wave30 release rule

30/30 marketing claims are forbidden until:

- all eight network deep gates pass
- all eight are live in canonical registry
- web/mobile parity passes
- full CI passes
- production acceptance passes

Only then may:

- app copy
- marketing site
- metadata
- SEO pages

move from 22 to 30 networks.
