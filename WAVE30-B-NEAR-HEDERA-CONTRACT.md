# AYZO Wave30 B — NEAR + Hedera Deep Intelligence Contract

Date: 2026-09-30

## Goal

Expand the AYZO Wave30 program from the accepted
24-live-network state toward 26 live networks by
implementing native, evidence-first intelligence for:

1. NEAR
2. Hedera

Registration does not mean production readiness.

Both networks MUST remain `development` until their
native engines, plan-aware bounded evidence, reports,
web/mobile/API surfaces, provider acceptance and
real-mainnet runtime gates pass.

---

# Global evidence rules

AYZO must not infer:

- ownership
- common control
- identity
- intent
- ultimate funding origin
- exchange identity without explicit evidence
- wallet clustering without direct evidence

Observed counterparty != owner.

Observed inbound source != original funder.

Contract interaction != contract ownership.

Token control key != beneficial ownership.

---

# NEAR

## Network semantics

Native currency:

- NEAR

Primary native identifier:

- NEAR account ID

Support must distinguish:

- named accounts
- implicit accounts where valid
- malformed account identifiers
- explicit account selection
- contract accounts without inventing contract ownership

NEAR execution semantics must preserve the distinction
between:

- signed transaction
- actions
- receipts
- execution outcomes
- contract calls

Receipts must not be flattened into EVM-style
transactions.

---

## NEAR target evidence

Before live promotion, implement:

- native account validation
- account existence/state
- native balance
- locked balance where available
- storage usage
- transaction history
- action history
- receipt/action evidence
- execution status
- contract calls
- function-call method evidence
- access-key evidence where reliable
- fungible-token evidence
- explicit counterparties
- native flow
- token flow
- observed inbound funding
- activity timeline
- evidence graph
- explicit coverage
- limitations

---

## NEAR specialist intelligence

Required native specialist surfaces:

### Account / action intelligence

Preserve native action types such as:

- Transfer
- FunctionCall
- CreateAccount
- DeleteAccount
- AddKey
- DeleteKey
- Stake
- DeployContract

Unknown actions remain unknown.

### Receipt intelligence

Expose observed receipt relationships where reliable.

Do not imply that every receipt receiver is an
independent human-controlled wallet.

### Access-key intelligence

Where available expose:

- public key
- permission type
- allowance where explicit
- receiver restriction
- method-name restriction

Access-key evidence must not be described as
ownership evidence.

### Contract-call intelligence

Expose explicit contract and method names from
FunctionCall actions.

Method names are evidence.
Method intent must not be invented.

---

## NEAR provider architecture

Native state / canonical transaction verification:

- official NEAR JSON-RPC
- default mainnet RPC candidate:
  https://rpc.mainnet.near.org

Indexed account history:

- production-grade NEAR indexed source required
- NEAR Lake or equivalent indexed architecture may be
  evaluated
- provider must be proven on real mainnet before live

Do not pretend the RPC alone provides exhaustive
arbitrary-account indexed history.

Provider failures must produce explicit partial or
unavailable coverage.

---

# Hedera

## Network semantics

Native currency:

- HBAR

Native identifiers may include:

- account IDs
- token IDs
- NFT serials
- contract IDs

Initial AYZO Wave B account intelligence must be
account-centric.

Do not collapse Hedera native accounts, tokens and
EVM aliases into one generic EVM identity model.

---

## Hedera target evidence

Before live promotion, implement:

- account validation
- account state
- HBAR balance
- transaction history
- HBAR transfers
- token holdings
- fungible-token transfers
- NFT transfers where relevant
- token relationships
- token metadata
- explicit token control keys where available
- staking node/account evidence where supported
- decline-reward state where available
- explicit counterparties
- observed inbound funding where directly supported
- activity timeline
- evidence graph
- explicit coverage
- limitations

---

## Hedera specialist intelligence

### Token relationship intelligence

Expose explicit account-token relationships where
provided by canonical/mirror evidence.

Do not infer beneficial ownership.

### Token control keys

Where present expose native Hedera key roles such as:

- admin
- supply
- wipe
- freeze
- kyc
- pause
- fee schedule

Only report keys explicitly returned by chain/mirror
evidence.

A control key is authority evidence, not identity
evidence.

### NFT intelligence

Where relevant expose:

- token ID
- serial number
- sender
- receiver
- consensus timestamp
- spender/allowance information only when explicit

### Staking intelligence

Where supported expose:

- staked node/account
- pending reward
- decline reward

Staking relationship != ownership.

---

## Hedera provider architecture

Indexed historical evidence:

- Hedera Mirror Node REST API

Development / mainnet verification candidate:

- https://mainnet-public.mirrornode.hedera.com/api/v1

Important:

The Hedera-managed public Mirror Node must NOT be
treated as sufficient production availability proof
by itself.

Before live promotion AYZO must prove either:

- a production-grade mirror provider, or
- a controlled/self-hosted production mirror source,
  or
- an independently validated resilient provider
  strategy.

Fallback semantics must be explicit.

---

# Plan-aware depth

Both engines must implement bounded analysis depth.

Required ordering:

Free < Pro <= Advanced

Each policy must define at minimum:

- transaction/history limit
- page limit
- token/asset limit
- specialist evidence limit
- graph node limit
- graph edge limit
- provider request budget
- timeout behavior

No unlimited history.

No unlimited pagination.

---

# Required engine outputs

Before live promotion both networks must expose:

1. Account Snapshot
2. Activity Timeline
3. Flow Intelligence
4. Explicit Counterparties
5. Observed Funding where supported
6. Asset / Token Intelligence
7. Native Specialist Intelligence
8. Evidence Coverage
9. Limitations
10. Evidence Graph

---

# Coverage contract

Coverage must explicitly distinguish:

- complete
- partial
- unavailable

Provider failure must never silently become
"zero activity".

Coverage should retain where applicable:

- requested records
- returned records
- pages consumed
- provider requests used
- provider request budget
- provider used
- fallback used
- truncated
- unavailable evidence

---

# Registration state

Wave B foundation state:

- NEAR: development
- Hedera: development

Public live network count MUST remain:

- 24

Mobile live network count MUST remain:

- 24

The registry may contain:

- 26 total networks

but NEAR and Hedera must not be exposed as live
analysis networks until final acceptance.

---

# Promotion gate

NEAR or Hedera may become `live` only after:

- native validation tests pass
- provider adapters pass
- plan depth tests pass
- engine tests pass
- presentation tests pass
- web route integration passes
- mobile integration passes
- public API v1 integration passes
- Ask AYZO integration passes
- Historical Evidence integration passes
- Batch Analysis integration passes
- real mainnet provider smoke passes
- Preview HTTP acceptance passes
- production acceptance passes
- full regression suite passes
- TypeScript passes
- lint passes
- production build passes
- secrets scan passes

Wave B must not reduce any existing Wave22/WaveA
network capability.
