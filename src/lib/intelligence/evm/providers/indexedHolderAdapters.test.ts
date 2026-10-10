import assert from "node:assert/strict";
import test from "node:test";
import {
  decodeRoutescanHolders,
  decodeBlockscoutHolders,
  routescanHoldersProvider,
  blockscoutHoldersProvider,
} from "./indexedHolderAdapters";
const A = "0x1111111111111111111111111111111111111111";
const B = "0x2222222222222222222222222222222222222222";

test("routescan holder evidence is parsed with reported percentages", () => {
  const result = decodeRoutescanHolders({items:[
    {chainId:1, address:A, balance:"200", percentage:20},
    {chainId:1, address:B, balance:"100", percentage:10},
  ], count:2, countType:"exact", link:{}}, 1, 100);
  assert.ok(result);
  assert.equal(result.holders[0].percentage, 20);
  assert.equal(result.totalCount, 2);
});
test("missing Routescan percentages cannot become fabricated zero-percent data", () => {
  assert.equal(decodeRoutescanHolders({items:[{address:A, balance:"200"}]}, 1, 100), null);
});
test("Routescan derives missing percent only from on-chain total supply", () => {
  const result = decodeRoutescanHolders({items:[{chainId:1,address:A,balance:"200"}]},1,100,A,"1000");
  assert.ok(result);
  assert.equal(result.holders[0].percentage,20);
  assert.equal(result.totalSupply,"1000");
});
test("routescan rejects wrong chain and duplicate holders", () => {
  assert.equal(decodeRoutescanHolders({items:[{chainId:5000,address:A,balance:"2",percentage:1}]},1,100),null);
  assert.equal(decodeRoutescanHolders({items:[
    {address:A,balance:"2",percentage:1},{address:A,balance:"1",percentage:1},
  ]},1,100),null);
});
test("Blockscout holder percentages use raw bigint and contract total supply", () => {
  const result = decodeBlockscoutHolders({items:[
    {address:{hash:A},value:"200"},
    {address:{hash:B},value:"100"},
  ],next_page_params:null}, {total_supply:"1000"},100);
  assert.ok(result);
  assert.equal(result.holders[0].percentage,20);
  assert.equal(result.totalSupply,"1000");
});
test("Blockscout rejects missing supply, malformed balances and duplicated rows", () => {
  assert.equal(decodeBlockscoutHolders({items:[{address:{hash:A},value:"1"}]},{},100),null);
  assert.equal(decodeBlockscoutHolders({items:[{address:{hash:A},value:"1.5"}]},{total_supply:"10"},100),null);
  assert.equal(decodeBlockscoutHolders({items:[{address:{hash:A},value:"1"},{address:{hash:A},value:"2"}]},{total_supply:"10"},100),null);
});
test("adapters advertise only the network configurations we certified", () => {
  const net = (networkId: string, chainId: number) =>
    ({networkId,name:networkId,chainId,nativeCurrency:"ETH"} as Parameters<typeof routescanHoldersProvider.supportsNetwork>[0]);
  assert.ok(routescanHoldersProvider.supportsNetwork(net("ethereum",1)));
  assert.ok(routescanHoldersProvider.supportsNetwork(net("mantle",5000)));
  assert.ok(blockscoutHoldersProvider.supportsNetwork(net("ethereum",1)));
  assert.ok(blockscoutHoldersProvider.supportsNetwork(net("optimism",10)));
  assert.ok(blockscoutHoldersProvider.supportsNetwork(net("scroll",534352)));
  assert.ok(!blockscoutHoldersProvider.supportsNetwork(net("sonic",146)));
  assert.ok(!routescanHoldersProvider.supportsNetwork(net("monad",143)));
});

test("Routescan never accepts claimed percentage when on-chain balance exceeds supply", () => {
  const result = decodeRoutescanHolders({items:[
    {chainId:1,address:A,balance:"1500",percentage:15},
  ]},1,100,A,"1000");
  assert.equal(result,null);
});

// Round-down must never turn a balance ABOVE on-chain supply into a valid 100%.
test("Routescan rejects one-unit supply overflow before percentage rounding", () => {
  const supply = 10n ** 18n;
  assert.equal(decodeRoutescanHolders({ items: [
    { chainId: 1, address: A, balance: (supply + 1n).toString(), percentage: 100 },
  ] }, 1, 100, A, supply.toString()), null);
});

test("Routescan rejects an impossible total across multiple holders", () => {
  assert.equal(decodeRoutescanHolders({ items: [
    { chainId: 1, address: A, balance: "600", percentage: 60 },
    { chainId: 1, address: B, balance: "600", percentage: 60 },
  ] }, 1, 100, A, "1000"), null);
});

test("Blockscout rejects rounded overflow and impossible aggregate balances", () => {
  const supply = 10n ** 18n;
  assert.equal(decodeBlockscoutHolders({ items: [
    { address: { hash: A }, value: (supply + 1n).toString() },
  ] }, { total_supply: supply.toString() }, 100), null);
  assert.equal(decodeBlockscoutHolders({ items: [
    { address: { hash: A }, value: "600" },
    { address: { hash: B }, value: "600" },
  ] }, { total_supply: "1000" }, 100), null);
});


test("Blockscout rejects descending-order violations before sorting", () => {
  const bad = decodeBlockscoutHolders({ items: [
    { address: { hash: A }, value: "100" },
    { address: { hash: B }, value: "200" },
  ], next_page_params: null }, { total_supply: "1000" }, 100);
  assert.equal(bad, null);
});
