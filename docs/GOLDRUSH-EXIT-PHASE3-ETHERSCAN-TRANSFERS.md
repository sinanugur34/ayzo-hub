# Phase 3: Etherscan V2 bounded Sonic and Mantle ERC20 transfers

- Experimental and available only within the `AYZO_GOLDRUSH_EXIT_CANARY=1` Preview/local path.
- Requires `ETHERSCAN_API_KEY` on branch-scoped Preview, not exposed to browser.
- Uses fixed Etherscan V2 host, chain IDs 146/5000, account `tokentx`, 100 rows per page.
- Validates token and wallet, log index, amount, hash and block before creating evidence.
- Unknown or invalid provider payload is never accepted as zero transactions.
- Historical cursors remain owned by their original provider.
- Production routing untouched and no env or deployment performed by this script.
- Known acceptance gaps: Sonic holders, full Free/Pro/Advanced transfer history parity, API key tier and 100+ row continuation still require live tests.
