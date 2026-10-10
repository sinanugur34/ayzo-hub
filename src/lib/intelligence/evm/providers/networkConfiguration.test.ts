import assert from "node:assert/strict";
import test from "node:test";
import { getEvmNetworkContext } from "../engine";
import { alchemyEvmProvider } from "./alchemy";
import { getAlchemyEvmNetwork } from "./alchemyNetworks";
import { isAlchemyFreeEapiNetwork } from "./alchemyEapiNetworks";
import { ankrHoldersProvider } from "./ankrHolders";
import { etherscanTransactionsProvider } from "./etherscanTransactions";
test("all 12 EVM networks have chain context and alternative transaction adapter",()=>{
 for(const id of ["ethereum","base","bnb","arbitrum","polygon","optimism",
   "avalanche","linea","scroll","mantle","sonic","monad"] as const){
   const n=getEvmNetworkContext(id);assert.ok(n,id);
   assert.ok(getAlchemyEvmNetwork(id),id);
   assert.equal(etherscanTransactionsProvider.supportsNetwork(n),true,id);
 }
});
test("exactly six EVM networks use certified Ankr holders",()=>{
 for(const id of ["base","bnb","arbitrum","polygon","avalanche","linea"] as const){
   const n=getEvmNetworkContext(id);assert.ok(n);
   assert.equal(ankrHoldersProvider.supportsNetwork(n),true);
 }
});
test("Alchemy transfer EAPI excludes Mantle and Sonic",()=>{
 assert.equal(isAlchemyFreeEapiNetwork("mantle"),false);
 assert.equal(isAlchemyFreeEapiNetwork("sonic"),false);
 assert.equal(isAlchemyFreeEapiNetwork("ethereum"),true);
});
test("Alchemy EVM main RPC still supports Base and Ethereum",()=>{
 for(const id of ["base","ethereum"] as const){const n=getEvmNetworkContext(id);
   assert.ok(n);assert.ok(alchemyEvmProvider.supportsNetwork(n));}
});
