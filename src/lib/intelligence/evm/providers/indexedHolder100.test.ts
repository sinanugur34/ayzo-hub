import assert from "node:assert/strict";
import test from "node:test";
import { blockscoutHoldersProvider } from "./indexedHolderAdapters";

const TOKEN = "0x" + "a".repeat(40);
const ADDRESS = (n: number) => "0x" + n.toString(16).padStart(40, "0");
const network = { networkId: "optimism" as const, chainId: 10, name: "Optimism", nativeCurrency: "ETH" };
const first = Array.from({ length: 50 }, (_, i) => ({address: {hash: ADDRESS(i + 1)}, value: String(1000 - i)}));
const second = Array.from({ length: 50 }, (_, i) => ({address: {hash: ADDRESS(i + 51)}, value: String(950 - i)}));
const marker = { address_hash: ADDRESS(50), value: "951", items_count: 50 };

/** Mock only the two official Blockscout paths; never access the network. */
async function withMock<T>(
  secondPage: "ok" | "error" | "duplicate",
  cb: (getCalls: () => number) => Promise<T>,
): Promise<T> {
  const old = globalThis.fetch;
  const oldKey = process.env.BLOCKSCOUT_API_KEY;
  process.env.BLOCKSCOUT_API_KEY = "proapi_test_only";
  let calls = 0;
  globalThis.fetch = async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://api.blockscout.com");
    assert.equal(url.pathname.startsWith(`/10/api/v2/tokens/${TOKEN}`), true);
    assert.equal(url.searchParams.get("apikey"), "proapi_test_only");
    calls++;
    if (url.pathname === `/10/api/v2/tokens/${TOKEN}`) {
      return Response.json({ total_supply: "1000000" });
    }
    assert.equal(url.pathname, `/10/api/v2/tokens/${TOKEN}/holders`);
    if (url.searchParams.has("address_hash")) {
      if (secondPage === "error") return Response.json({message:"transient"}, {status:503});
      if (secondPage === "duplicate") {
        return Response.json({items: [{ address: {hash: ADDRESS(50)}, value: "951" }], next_page_params: null});
      }
      return Response.json({ items: second, next_page_params: {address_hash: ADDRESS(100), value:"901", items_count:50} });
    }
    return Response.json({items:first, next_page_params:marker});
  };
  try { return await cb(() => calls); }
  finally {
    globalThis.fetch = old;
    if (oldKey === undefined) delete process.env.BLOCKSCOUT_API_KEY;
    else process.env.BLOCKSCOUT_API_KEY = oldKey;
  }
}

test("Blockscout aggregates 50 + 50 holder rows to full AYZO top-100", async () => {
  await withMock("ok", async calls => {
    const result = await blockscoutHoldersProvider.getTokenHolders({network,address:TOKEN,limit:100,cursor:null});
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.data.holders.length, 100);
    assert.equal(result.data.holders[0].balance, "1000");
    assert.equal(result.data.holders[99].balance, "901");
    assert.equal(result.data.totalSupply, "1000000");
    assert.match(result.data.nextCursor ?? "", /^blockscout:/);
    assert.equal(calls(), 3); // one metadata, two 50-row requests
  });
});

test("Blockscout keeps verified partial coverage and cursor if page two has a transient outage", async () => {
  await withMock("error", async calls => {
    const result = await blockscoutHoldersProvider.getTokenHolders({network,address:TOKEN,limit:100,cursor:null});
    assert.equal(result.ok,true);
    if (!result.ok) return;
    assert.equal(result.data.holders.length,50);
    assert.match(result.data.nextCursor ?? "", /^blockscout:/);
    assert.equal(calls(),3);
  });
});

test("Blockscout rejects duplicate holder addresses between pages", async () => {
  await withMock("duplicate", async calls => {
    const result = await blockscoutHoldersProvider.getTokenHolders({network,address:TOKEN,limit:100,cursor:null});
    assert.equal(result.ok,false);
    assert.equal(calls(),3);
  });
});
