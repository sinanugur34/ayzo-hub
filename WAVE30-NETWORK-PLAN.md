# AYZO Wave30 Network Plan

## Wave A

### Cardano

Target evidence:

- mainnet address validation
- UTXO/address history
- ADA flow
- native assets
- explicit counterparties
- observed funding
- stake/delegation
- asset policy evidence where supported
- timeline
- graph
- coverage

Provider strategy:

Primary candidate:
- Blockfrost or production-grade equivalent

Independent fallback candidate:
- Koios

Additional provider candidate:
- Maestro

Do not promote live until failover semantics,
rate limits and real-mainnet tests are proven.

### Aptos

Target evidence:

- account state
- APT balance
- transaction history
- fungible assets
- Move resources
- object evidence
- module/function interactions
- explicit counterparties
- observed flow
- timeline
- graph
- coverage

Use native Aptos semantics.

Do not treat Move resources as ERC-20 contracts.

---

## Wave B

### NEAR

Target evidence:

- account state
- native balance
- transaction/action history
- receipts/actions
- contract calls
- access-key evidence where reliable
- fungible-token evidence
- counterparties
- flow
- timeline
- graph

### Hedera

Target evidence:

- account state
- transaction history
- HBAR flow
- tokens
- NFT transfers where relevant
- token relationships
- explicit token control keys
- staking evidence where supported
- counterparties
- timeline
- graph

---

## Wave C

### Algorand

Target evidence:

- account state
- ALGO history
- ASA holdings
- ASA transfers
- created assets
- application activity
- rekey evidence
- counterparties
- observed funding
- timeline
- graph

### Polkadot

Target evidence:

- account/balance
- extrinsics/events
- transfers
- staking
- validator/delegator evidence
- governance evidence where supported
- counterparties
- flow
- timeline
- coverage

Do not flatten parachain data into Relay Chain claims.

---

## Wave D

### Cosmos Hub

Target evidence:

- account/balance
- transaction history
- bank transfers
- staking
- rewards
- undelegation/redelegation
- IBC transfer evidence
- counterparties
- timeline
- graph

IBC destination-chain evidence must remain explicit
and must not imply destination ownership.

### Injective

Target evidence:

- account/bank state
- subaccount evidence
- deposits
- withdrawals
- spot trades
- derivative trades
- positions
- funding payments
- market activity
- explicit counterparties where observable
- timeline
- graph

Trading funding payments are NOT wallet
funding provenance.
