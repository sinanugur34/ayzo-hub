# AYZO Wave30 — Wave A
# Cardano + Aptos Deep Intelligence Contract

Date: 2026-09-30

Both networks remain NON-LIVE until every applicable
deep acceptance item passes.

==================================================
CARDANO
==================================================

## Provider strategy

Primary indexed provider:
- Blockfrost candidate

Independent fallback:
- Koios candidate

Optional later resilience provider:
- Maestro

Provider credentials must remain server-side.

Koios public access may be used for development/fallback
only after bounded production behavior is verified.

No provider may be treated as canonical identity truth.

## Address model

Required support:

- Cardano mainnet Shelley addresses
- stake addresses where analysis semantics support them
- address normalization
- malformed Bech32 rejection
- wrong HRP rejection
- wrong-network rejection where detectable
- whitespace normalization

Byron support must not be claimed unless explicitly
implemented and tested.

## Policy depth target

Initial deep target:

Free:
- 12 history records
- 1 bounded page
- bounded asset/staking evidence

Pro:
- 36 history records
- up to 3 bounded pages
- wider assets/counterparties

Advanced:
- 96 history records
- up to 6 bounded pages
- wider graph/funding evidence

Exact provider request budgets must be enforced.

## Native state

Required:

- ADA balance
- UTXO/account evidence where provider supports it
- native assets
- stake/delegation state where explicit
- reward/stake evidence where explicit

## Transaction evidence

Required where provider data supports it:

- transaction hash
- block/height/time
- explicit inputs
- explicit outputs
- lovelace values
- native assets
- fees
- metadata reference where useful
- success/inclusion state

## Flow

Derive:

- incoming
- outgoing
- self
- unresolved

Never infer change ownership.

Input/output addresses count only when explicitly
present in canonical/indexed evidence.

## Counterparties

Must exclude analyzed subject.

Must be explicit addresses only.

No common ownership inference.

## Observed funding

Allowed:

earliest directly observed inbound source inside
the bounded evidence window.

Forbidden:

- creator
- owner
- original funder
- ultimate funder

unless direct independent evidence proves it.

## Native assets

Required:

- policy id
- asset name
- quantity
- observed transfer activity

Do not invent ERC-20-like semantics.

Mint/burn or policy-authority intelligence must only
be exposed where provider evidence supports it.

## Staking

Where explicit provider evidence is available:

- stake address
- active pool/delegation
- rewards/withdrawals
- delegation changes

Delegation does not imply ownership.

## Presentation

Required:

- snapshot
- ADA activity
- native asset intelligence
- flow
- counterparties
- observed funding
- staking
- timeline
- evidence graph
- coverage
- limitations
- Ask AYZO evidence attachment

==================================================
APTOS
==================================================

## Provider strategy

Primary:
- official Aptos fullnode REST / production RPC surface

Historical/indexed:
- Aptos Indexer where required

Managed provider may be added only as bounded fallback
after explicit provider acceptance.

## Address model

Aptos addresses are 32-byte account addresses.

Required:

- full 0x representation
- accepted shortened canonical forms if the SDK/protocol
  accepts them
- normalized full representation internally
- malformed hex rejection
- >32-byte rejection
- whitespace normalization

Do NOT use EVM address validation.

## Aptos account semantics

Important:

A valid Aptos address does not imply an initialized
legacy account resource.

Account existence must not be inferred from EVM rules.

AIP-115/stateless-account semantics must be preserved.

## Policy depth target

Free:
- 16 account transactions
- bounded current account/assets/resources

Pro:
- 48 transactions
- wider fungible asset and Move evidence

Advanced:
- 96 transactions
- wider timeline/graph/native evidence

Provider request budgets remain bounded.

## Native state

Required where available:

- APT balance
- sequence/replay state where meaningful
- fungible assets
- Move resources
- objects
- account/module state

## Transaction evidence

Required:

- transaction hash
- ledger version
- timestamp
- sender
- success
- vm status
- gas used
- gas unit price
- entry function/module payload
- events
- state changes where bounded and useful

Committed Aptos transaction semantics must remain
native and not use EVM confirmation language.

## Flow

Derive only from explicit:

- APT transfers
- fungible asset transfers
- directly identifiable asset movement

Directions:

- incoming
- outgoing
- self
- unresolved

## Counterparties

Explicit addresses only.

Must exclude analyzed subject.

Function/module interaction must not automatically
be treated as wallet ownership relationship.

## Observed funding

Only when an explicit inbound transfer identifies
a source account.

Must remain "observed funding inside bounded evidence".

No ultimate funding claim.

## Fungible assets

Required:

- metadata address/type
- balance
- transfer evidence
- decimals/symbol only when explicit/verified

Do not flatten Move Fungible Assets into ERC-20 semantics.

## Move intelligence

Required:

- module address
- module name
- function name
- entry-function activity
- Move resources
- objects where explicit

Do not infer contract ownership from module calls.

## Presentation

Required:

- snapshot
- APT activity
- fungible asset intelligence
- Move activity
- flow
- counterparties
- observed funding
- timeline
- evidence graph
- coverage
- limitations
- Ask AYZO evidence attachment

==================================================
SHARED ACCEPTANCE
==================================================

Neither network becomes live until:

1. Address validation tests PASS
2. Provider normalization tests PASS
3. Policy tests PASS
4. Analysis tests PASS
5. Engine tests PASS
6. Rate-limit tests PASS
7. Timeout/degradation tests PASS
8. Malformed-provider-response tests PASS
9. Subject-self-counterparty guard PASS
10. Funding language guard PASS
11. Presentation tests PASS
12. Router tests PASS
13. Registry tests PASS
14. Product capability tests PASS
15. Mobile adapter parity PASS
16. TypeScript PASS
17. Full test suite PASS
18. ESLint PASS
19. Web build PASS
20. Android debug build PASS
21. npm audit high/critical = 0
22. Production real-mainnet smoke PASS when credentials exist

Registry status remains non-live/planned until this gate.
Marketing count remains unchanged.
