# AYZO Wave30 B — Provider Readiness

Date: 2026-10-01

## Canonical state

Current canonical registry:

- registered blockchain networks: 26
- production-live blockchain networks: 24
- NEAR: development / deferred
- Hedera: development / production-provider gate complete

Registration does not equal production acceptance.

---

# Hedera

## Engineering

Hedera deep intelligence is implemented:

- native account validation
- public Hedera Mirror integration
- HBAR flow
- transaction evidence
- token relationships
- NFT evidence
- token control-key evidence
- staking evidence
- timeline
- graph
- web integration
- mobile integration
- API v1 integration
- Ask AYZO
- Historical Evidence
- Batch preparation

## Provider resilience

Primary:

- Hedera public Mirror

Independent fallback:

- Hgraph

Production credential:

- HGRAPH_API_KEY

Credential state:

- Preview configured
- Production configured

Real Hgraph authentication:

- PASS

Real forced-fallback acceptance:

- PASS

Observed accepted provider identity:

- hedera-hgraph

Provider identity regression:

- PASS

Fallback identity fix commit:

- 4a952b7

Hedera provider gate is CLOSED.

Hedera still remains `development` until its remaining
product activation, Preview HTTP acceptance and
Production HTTP acceptance gates are completed.

---

# NEAR

NEAR deep intelligence engineering remains preserved.

Completed engineering includes:

- native account validation
- official NEAR RPC state
- access-key evidence
- indexed-history adapter architecture
- deep engine
- flow analysis
- counterparties
- observed funding
- timeline
- graph
- web integration
- mobile integration
- API v1 integration
- Ask AYZO
- Historical Evidence
- Batch preparation
- provider-neutral indexed-evidence types

## Production provider decision

NEAR is DEFERRED.

AYZO will not promote NEAR merely to increase the
network count.

Reasons:

1. A sustainable commercial indexed-history provider
   has not been accepted.

2. BigQuery public NEAR data was proven technically,
   but a fresh one-day account-history proof processed
   approximately 4.33 GB.

3. BigQuery will therefore not be used as the
   per-analysis production primary in the current
   architecture.

4. NearScanner returned real bounded account-history
   fields, but its pagination / production reliability
   contract has not been accepted.

5. AYZO will not weaken evidence depth to expose a
   partial RPC-only NEAR product.

NEAR code MUST remain preserved.

NEAR remains unavailable through live public routing.

NEAR can be reconsidered later when:

- a suitable indexed provider is available,
- economics become justified,
- or AYZO operates an appropriate indexed architecture.

---

# Promotion rule

A network becomes `live` only after:

- provider acceptance
- real mainnet smoke
- plan-depth tests
- engine tests
- presentation tests
- web acceptance
- mobile acceptance
- API acceptance
- full regression
- TypeScript
- lint
- production build
- secret scan
- Preview acceptance
- Production acceptance

No network is promoted merely to increase a marketing
count.
