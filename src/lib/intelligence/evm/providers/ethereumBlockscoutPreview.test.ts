import assert from "node:assert/strict";
import test from "node:test";
import { blockscoutHoldersProvider } from "./indexedHolderAdapters";
import { getPreferredEvmTokenHolders } from "./preferredHolders";

const network = { networkId: "ethereum" as const, name: "Ethereum", chainId: 1, nativeCurrency: "ETH" };
const MANTLE = { networkId: "mantle" as const, name: "Mantle", chainId: 5000, nativeCurrency: "MNT" };
const token = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";
const urlPrefix = `https://eth.blockscout.com/api/v2/tokens/${token}`;
const amount = "1000000";
const holder = (n: number) => ({
  address: { hash: "0x" + n.toString(16).padStart(40, "0") },
  value: String(500 - n),
});
const pages = [
  Array.from({ length: 50 }, (_, i) => holder(i + 1)),
  Array.from({ length: 50 }, (_, i) => holder(i + 51)),
];
const response = (value: unknown) => new Response(JSON.stringify(value), {
  status: 200, headers: { "content-type": "application/json" },
});

test("Ethereum public Blockscout reads 100 ordered holders with a verified supply and no key in URL", async () => {
  const fetchOriginal = globalThis.fetch;
  const originalAlchemy = process.env.ALCHEMY_API_KEY;
  const originalBlockscout = process.env.BLOCKSCOUT_API_KEY;
  const originalInternal = process.env.AYZO_INTERNAL_API_KEY;
  const originalVercel = process.env.VERCEL_ENV;
  const originalIndexed = process.env.AYZO_INDEXED_HOLDER_CANARY;
  const called: string[] = [];
  process.env.VERCEL_ENV = "preview";
  process.env.AYZO_INDEXED_HOLDER_CANARY = "1";
  process.env.ALCHEMY_API_KEY = "test-eth-supply-credential";
  process.env.AYZO_INTERNAL_API_KEY = "unit-test-cursor-signing-secret-32-chars";
  delete process.env.BLOCKSCOUT_API_KEY;
  globalThis.fetch = (async (raw) => {
    const url = String(raw);
    called.push(url);
    if (url === urlPrefix) return response({ total_supply: amount, address: { hash: token } });
    if (url === `${urlPrefix}/holders`) return response({ items: pages[0], next_page_params: { address_hash: pages[0][49].address.hash, value: pages[0][49].value, items_count: 50 } });
    if (url.startsWith(`${urlPrefix}/holders?`)) return response({ items: pages[1], next_page_params: { address_hash: pages[1][49].address.hash, value: pages[1][49].value, items_count: 50 } });
    if (url === "https://eth-mainnet.g.alchemy.com/v2") return response({ jsonrpc: "2.0", id: 1, result: "0x" + BigInt(amount).toString(16) });
    throw new Error("Unexpected network target");
  }) as typeof fetch;
  try {
    const result = await blockscoutHoldersProvider.getTokenHolders({ network, address: token, limit: 100, cursor: null });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.providerId, "blockscout");
    assert.equal(result.data.totalSupply, amount);
    assert.equal(result.data.holders.length, 100);
    assert.ok(result.data.nextCursor?.startsWith("blockscout:"));
    assert.equal(called.length, 4); // 1 metadata + 1 chain RPC + 2 public indexer pages
    assert.ok(called.every(u => !u.includes("apikey=") && !u.includes("test-eth-supply-credential")));
    assert.ok(!called.some(u => u.includes("api.blockscout.com")));
  } finally {
    globalThis.fetch = fetchOriginal;
    if (originalAlchemy === undefined) delete process.env.ALCHEMY_API_KEY;
    else process.env.ALCHEMY_API_KEY = originalAlchemy;
    if (originalBlockscout === undefined) delete process.env.BLOCKSCOUT_API_KEY;
    else process.env.BLOCKSCOUT_API_KEY = originalBlockscout;
    if (originalInternal === undefined) delete process.env.AYZO_INTERNAL_API_KEY;
    else process.env.AYZO_INTERNAL_API_KEY = originalInternal;
    if (originalIndexed === undefined) delete process.env.AYZO_INDEXED_HOLDER_CANARY;
    else process.env.AYZO_INDEXED_HOLDER_CANARY = originalIndexed;
    if (originalVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = originalVercel;
  }
});

test("Ethereum indexer supply disagreement fails closed before fetching holders", async () => {
  const fetchOriginal = globalThis.fetch;
  const previous = process.env.ALCHEMY_API_KEY;
  const previousVercel = process.env.VERCEL_ENV;
  const previousIndexed = process.env.AYZO_INDEXED_HOLDER_CANARY;
  const previousSigningKey = process.env.AYZO_INTERNAL_API_KEY;
  const requested: string[] = [];
  process.env.VERCEL_ENV = "preview";
  process.env.AYZO_INDEXED_HOLDER_CANARY = "1";
  process.env.ALCHEMY_API_KEY = "test-eth-supply-credential";
  process.env.AYZO_INTERNAL_API_KEY = "unit-test-cursor-signing-secret-32-chars";
  globalThis.fetch = (async (raw) => {
    const url = String(raw);
    requested.push(url);
    if (url === urlPrefix) return response({ total_supply: amount });
    if (url === "https://eth-mainnet.g.alchemy.com/v2") return response({ jsonrpc: "2.0", id: 1, result: "0x1" });
    throw new Error("Unexpected holder request after supply mismatch");
  }) as typeof fetch;
  try {
    const result = await blockscoutHoldersProvider.getTokenHolders({ network, address: token, limit: 100, cursor: null });
    assert.equal(result.ok, false);
    // Preview retries one paired metadata + RPC read, but never accesses holders.
    assert.equal(requested.length, 4);
    assert.equal(requested.filter(u => u === urlPrefix).length, 2);
    assert.equal(requested.filter(u => u === "https://eth-mainnet.g.alchemy.com/v2").length, 2);
    assert.equal(requested.filter(u => u.includes("/holders")).length, 0);
  } finally {
    globalThis.fetch = fetchOriginal;
    if (previous === undefined) delete process.env.ALCHEMY_API_KEY;
    else process.env.ALCHEMY_API_KEY = previous;
    if (previousSigningKey === undefined) delete process.env.AYZO_INTERNAL_API_KEY;
    else process.env.AYZO_INTERNAL_API_KEY = previousSigningKey;
    if (previousIndexed === undefined) delete process.env.AYZO_INDEXED_HOLDER_CANARY;
    else process.env.AYZO_INDEXED_HOLDER_CANARY = previousIndexed;
    if (previousVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercel;
  }
});

test("Direct Ethereum Blockscout adapter cannot activate on Vercel Production", async () => {
  const before = process.env.VERCEL_ENV;
  const oldFlag = process.env.AYZO_INDEXED_HOLDER_CANARY;
  const oldExit = process.env.AYZO_GOLDRUSH_EXIT_CANARY;
  const oldFetch = globalThis.fetch;
  let calls = 0;
  process.env.VERCEL_ENV = "production";
  process.env.AYZO_INDEXED_HOLDER_CANARY = "1";
  process.env.AYZO_GOLDRUSH_EXIT_CANARY = "1";
  globalThis.fetch = (async () => { calls++; throw new Error("PRODUCTION_EGRESS_FORBIDDEN"); }) as typeof fetch;
  try {
    const result = await blockscoutHoldersProvider.getTokenHolders({ network, address: token, limit: 100, cursor: null });
    assert.equal(result.ok, false);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = oldFetch;
    if (before === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = before;
    if (oldFlag === undefined) delete process.env.AYZO_INDEXED_HOLDER_CANARY;
    else process.env.AYZO_INDEXED_HOLDER_CANARY = oldFlag;
    if (oldExit === undefined) delete process.env.AYZO_GOLDRUSH_EXIT_CANARY;
    else process.env.AYZO_GOLDRUSH_EXIT_CANARY = oldExit;
  }
});

test("Routescan legacy cursor is closed in Preview and Mantle does not get a fallback", async () => {
  const oldFlag = process.env.AYZO_GOLDRUSH_EXIT_CANARY;
  const oldVercel = process.env.VERCEL_ENV;
  const oldIndexed = process.env.AYZO_INDEXED_HOLDER_CANARY;
  const fetchOriginal = globalThis.fetch;
  process.env.AYZO_GOLDRUSH_EXIT_CANARY = "1";
  process.env.AYZO_INDEXED_HOLDER_CANARY = "1";
  process.env.VERCEL_ENV = "preview";
  globalThis.fetch = (async () => { throw new Error("No provider network call permitted"); }) as typeof fetch;
  try {
    const invalidCursor = `routescan:${Buffer.from(JSON.stringify("a-token")).toString("base64url")}`;
    const x = await getPreferredEvmTokenHolders({ network, address: token, limit: 100, cursor: invalidCursor });
    assert.equal(x.ok, false);
    assert.equal(x.providerId, "routescan");
    const y = await getPreferredEvmTokenHolders({ network: MANTLE, address: token, limit: 100, cursor: null });
    assert.equal(y.ok, false);
    assert.equal(y.providerId, "goldrush"); // blocked before egress by exit canary
  } finally {
    globalThis.fetch = fetchOriginal;
    if (oldFlag === undefined) delete process.env.AYZO_GOLDRUSH_EXIT_CANARY;
    else process.env.AYZO_GOLDRUSH_EXIT_CANARY = oldFlag;
    if (oldIndexed === undefined) delete process.env.AYZO_INDEXED_HOLDER_CANARY;
    else process.env.AYZO_INDEXED_HOLDER_CANARY = oldIndexed;
    if (oldVercel === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = oldVercel;
  }
});


test("Ethereum signed holder continuation rejects tamper, other token and expiry before network", async () => {
  const beforeFetch = globalThis.fetch;
  const keys = ["VERCEL_ENV", "AYZO_INDEXED_HOLDER_CANARY", "ALCHEMY_API_KEY", "AYZO_INTERNAL_API_KEY"] as const;
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  const originalNow = Date.now;
  const addressAt = (n: number) => holder(n).address.hash;
  const observed: string[] = [];
  process.env.VERCEL_ENV = "preview";
  process.env.AYZO_INDEXED_HOLDER_CANARY = "1";
  process.env.ALCHEMY_API_KEY = "test-eth-supply-credential";
  process.env.AYZO_INTERNAL_API_KEY = "unit-test-cursor-signing-secret-32-chars";
  const start = Date.now();
  globalThis.fetch = (async raw => {
    const url = String(raw);
    observed.push(url);
    if (url === urlPrefix) return response({ total_supply: amount });
    if (url === "https://eth-mainnet.g.alchemy.com/v2")
      return response({ jsonrpc: "2.0", id: 1, result: "0x" + BigInt(amount).toString(16) });
    const path = url.split("?")[0];
    if (path === `${urlPrefix}/holders`) {
      const params = new URL(url).searchParams;
      const continuation = params.get("address_hash");
      const min = continuation === addressAt(50) ? 51 : continuation === addressAt(100) ? 101 : 1;
      const rows = Array.from({ length: 50 }, (_, i) => holder(min + i));
      const next = min === 101 ? null : {
        address_hash: rows[49].address.hash, value: rows[49].value, items_count: 50,
      };
      return response({ items: rows, next_page_params: next });
    }
    throw new Error("Unexpected transport target");
  }) as typeof fetch;
  try {
    const root = await blockscoutHoldersProvider.getTokenHolders({ network, address: token, limit: 100, cursor: null });
    assert.equal(root.ok, true);
    if (!root.ok) return;
    assert.equal(root.data.holders.length, 100);
    const cursor = root.data.nextCursor;
    assert.ok(cursor?.startsWith("blockscout:"));
    if (!cursor) return;
    const afterRoot = observed.length;
    const flip = cursor.slice(0, 25) + (cursor[25] === "A" ? "B" : "A") + cursor.slice(26);
    const altered = await blockscoutHoldersProvider.getTokenHolders({ network, address: token, limit: 100, cursor: flip });
    assert.equal(altered.ok, false);
    const otherToken = await blockscoutHoldersProvider.getTokenHolders({
      network, address: "0x1111111111111111111111111111111111111111", limit: 100, cursor,
    });
    assert.equal(otherToken.ok, false);
    Date.now = () => start + 16 * 60 * 1000;
    const expired = await blockscoutHoldersProvider.getTokenHolders({ network, address: token, limit: 100, cursor });
    assert.equal(expired.ok, false);
    Date.now = originalNow;
    assert.equal(observed.length, afterRoot, "invalid cursors must not spend provider requests");
    const page = await blockscoutHoldersProvider.getTokenHolders({ network, address: token, limit: 100, cursor });
    assert.equal(page.ok, true);
    if (page.ok) assert.equal(page.data.holders.length, 50);
  } finally {
    Date.now = originalNow;
    globalThis.fetch = beforeFetch;
    for (const k of keys) {
      const val = saved[k];
      if (val === undefined) delete process.env[k]; else process.env[k] = val;
    }
  }
});

test("Ethereum public holder adapter refuses missing HMAC signing secret before egress", async () => {
  const prevFetch = globalThis.fetch;
  const oldEnv = process.env.VERCEL_ENV;
  const oldIndexed = process.env.AYZO_INDEXED_HOLDER_CANARY;
  const oldInternal = process.env.AYZO_INTERNAL_API_KEY;
  let calls = 0;
  process.env.VERCEL_ENV = "preview";
  process.env.AYZO_INDEXED_HOLDER_CANARY = "1";
  delete process.env.AYZO_INTERNAL_API_KEY;
  globalThis.fetch = (async () => { calls++; throw Error("Forbidden network egress"); }) as typeof fetch;
  try {
    const result = await blockscoutHoldersProvider.getTokenHolders({ network, address: token, limit: 100, cursor: null });
    assert.equal(result.ok, false);
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = prevFetch;
    if (oldEnv === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = oldEnv;
    if (oldIndexed === undefined) delete process.env.AYZO_INDEXED_HOLDER_CANARY; else process.env.AYZO_INDEXED_HOLDER_CANARY = oldIndexed;
    if (oldInternal === undefined) delete process.env.AYZO_INTERNAL_API_KEY; else process.env.AYZO_INTERNAL_API_KEY = oldInternal;
  }
});


test("Ethereum Preview revalidates both supply sources once on transient drift and then serves 100", async () => {
  const originalFetch = globalThis.fetch;
  const keys = ["VERCEL_ENV", "AYZO_INDEXED_HOLDER_CANARY", "ALCHEMY_API_KEY", "AYZO_INTERNAL_API_KEY"] as const;
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  process.env.VERCEL_ENV = "preview";
  process.env.AYZO_INDEXED_HOLDER_CANARY = "1";
  process.env.ALCHEMY_API_KEY = "test-only-alchemy-retry";
  process.env.AYZO_INTERNAL_API_KEY = "unit-test-cursor-signing-secret-32-chars";
  const requested: string[] = [];
  let metadata = 0;
  globalThis.fetch = (async raw => {
    const url = String(raw);
    requested.push(url);
    if (url === urlPrefix) return response({total_supply: ++metadata === 1 ? "999999" : amount});
    if (url === "https://eth-mainnet.g.alchemy.com/v2")
      return response({jsonrpc:"2.0",id:1,result:"0x" + BigInt(amount).toString(16)});
    if (url === `${urlPrefix}/holders`)
      return response({items:pages[0],next_page_params:{address_hash:pages[0][49].address.hash,value:pages[0][49].value,items_count:50}});
    if (url.startsWith(`${urlPrefix}/holders?`))
      return response({items:pages[1],next_page_params:null});
    throw Error("unapproved network target");
  }) as typeof fetch;
  try {
    const result = await blockscoutHoldersProvider.getTokenHolders({network,address:token,limit:100,cursor:null});
    assert.equal(result.ok,true);
    if (result.ok) assert.equal(result.data.holders.length,100);
    assert.equal(metadata,2);
    assert.equal(requested.length,6); // 2 metadata + 2 RPC + 2 holder pages
  } finally {
    globalThis.fetch = originalFetch;
    for (const k of keys) { const value = saved[k]; if (value === undefined) delete process.env[k]; else process.env[k] = value; }
  }
});

test("Ethereum Preview rejects persistent supply drift after exactly two pairs with no holder egress", async () => {
  const originalFetch = globalThis.fetch;
  const keys = ["VERCEL_ENV", "AYZO_INDEXED_HOLDER_CANARY", "ALCHEMY_API_KEY", "AYZO_INTERNAL_API_KEY"] as const;
  const saved = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  process.env.VERCEL_ENV = "preview";
  process.env.AYZO_INDEXED_HOLDER_CANARY = "1";
  process.env.ALCHEMY_API_KEY = "test-only-alchemy-retry";
  process.env.AYZO_INTERNAL_API_KEY = "unit-test-cursor-signing-secret-32-chars";
  const requested: string[] = [];
  globalThis.fetch = (async raw => {
    const url = String(raw);
    requested.push(url);
    if (url === urlPrefix) return response({total_supply:"999999"});
    if (url === "https://eth-mainnet.g.alchemy.com/v2")
      return response({jsonrpc:"2.0",id:1,result:"0x" + BigInt(amount).toString(16)});
    throw Error("holders must not be fetched when supply differs");
  }) as typeof fetch;
  try {
    const result = await blockscoutHoldersProvider.getTokenHolders({network,address:token,limit:100,cursor:null});
    assert.equal(result.ok,false);
    assert.equal(requested.length,4);
    assert.equal(requested.filter(u=>u===urlPrefix).length,2);
    assert.equal(requested.filter(u=>u.includes("/holders")).length,0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const k of keys) { const value = saved[k]; if (value === undefined) delete process.env[k]; else process.env[k] = value; }
  }
});
