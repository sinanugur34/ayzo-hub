# AYZO Deep Analyze Acceptance Contract

Status: LOCKED

## Core rule

AYZO does not ship beta, lite, partial-live or reduced-truth network intelligence.

A blockchain may be registered as `development` while engineering is in progress,
but it MUST NOT be promoted to `live` until all Deep Analyze acceptance gates pass.

## Truth model

Free, Pro and Advanced use the same evidence semantics and the same truth standard.

Plans may differ only in bounded depth:

- history depth
- canonical transaction samples
- asset/token evidence limits
- graph size
- timeline size
- provider request budget
- multi-hop investigation depth

A cheaper plan MUST NOT use weaker interpretation rules or fabricated inference.

## Mandatory Deep Analyze surfaces

Every live network must support, where the chain exposes the relevant evidence:

1. native address/account validation
2. account/wallet state
3. native balance
4. asset/token holdings
5. bounded transaction/action/event history
6. explicit flow evidence
7. explicit counterparties
8. observed direct funding evidence
9. chain-native authority / permission semantics
10. chain-native asset / contract / application semantics
11. activity timeline
12. evidence graph
13. Free < Pro < Advanced bounded depth
14. web intelligence
15. mobile intelligence
16. API v1 intelligence
17. Ask AYZO compatibility
18. Historical Evidence compatibility
19. Batch Analysis compatibility where applicable
20. provider failure mapping
21. provider resilience where a credible independent fallback exists
22. invalid input fail-closed
23. real mainnet acceptance
24. Preview acceptance
25. Production acceptance

## Evidence safety

AYZO reports observed evidence only.

It MUST NOT infer, without explicit supporting evidence:

- real-world identity
- beneficial ownership
- common control
- intent
- criminality
- insider status
- ultimate funding origin
- hidden shielded counterparties
- hidden shielded amounts

## Zcash-specific contract

Zcash analysis must keep transparent and shielded evidence distinct.

Transparent evidence may include:

- transparent address validation
- transparent balance
- transparent UTXOs
- transparent transaction IDs
- canonical transparent inputs/outputs
- transparent counterparties
- transparent observed funding
- transparent flow graph

Shielded pools MUST NOT be reverse-engineered into sender, recipient or amount
when those values are not publicly exposed.

## Algorand-specific contract

Algorand analysis must preserve native semantics including:

- Algo balance
- account state
- ASA holdings
- created assets
- asset configuration
- freeze / clawback / manager / reserve authority evidence
- payments
- asset transfers
- asset freeze transactions
- application calls
- inner transactions
- rekey evidence
- application local state
- created applications
- explicit counterparties
- observed funding
- graph and timeline

A rekey relationship is authorization evidence, not ownership evidence.

## Promotion rule

`development -> live` requires all relevant gates above to pass.

No exceptions.
