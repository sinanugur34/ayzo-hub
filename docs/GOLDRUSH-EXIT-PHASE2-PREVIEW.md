# AYZO — GoldRush exit Phase 2: zero-egress Preview drill

- Production: **unchanged**. Even a value of `AYZO_GOLDRUSH_EXIT_CANARY=1` in Vercel Production is ignored by the gate.
- Preview: opt in only by setting `AYZO_GOLDRUSH_EXIT_CANARY=1` in the **feature-branch-scoped** Preview environment, then deploy that exact branch afresh.
- Local: `NODE_ENV=development` with no `VERCEL_ENV` and flag `1` can opt in.
- One chokepoint rejects **all four existing GoldRush adapter HTTP calls before network I/O** (EVM holders, transactions, transfers, Bitcoin history). Mislabelled covalenthq domains also blocked.
- Explicit transfer/holder/transaction/Bitcoin selectors skip GoldRush where an alternative is available; unsupported networks return unavailable evidence, not fabricated results.
- Transactions use a separate Redis cache/circuit namespace in the drill to avoid reusing legacy GoldRush success entries.
- Existing provider-owned GoldRush cursors stay recognised but cannot trigger GoldRush during Preview opt-in.
- Existing production feature, existing plan limits, price accounting and provider fallback logic remain unchanged without opt in.
- **Not complete removal:** verified live coverage, pagination, transfer completeness, transaction parity, and Bitcoin Mempool robustness still need sign-off before enabling a permanent GoldRush-free Production implementation or removing keys.
- Rollback: turn branch-specific flag back to `0` and generate a fresh Preview deployment; immutable Preview deployments created with ON retain their historical setting.
- Never delete GoldRush secrets or legacy adapters on Production before independent Free/Pro/Advanced coverage acceptance.
