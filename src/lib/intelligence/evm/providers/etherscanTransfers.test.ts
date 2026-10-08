import assert from "node:assert/strict";
import test from "node:test";
import { EtherscanTransfersProvider, parseEtherscanTransferCursor, normalizeEtherscanErc20Transfers } from "./etherscanTransfers";
const wallet = "0x1111111111111111111111111111111111111111";
const token = "0x2222222222222222222222222222222222222222";
const row = {hash: "0x"+"a".repeat(64), from: wallet, to: "0x3333333333333333333333333333333333333333",
  contractAddress: token, value: "1000", blockNumber: "12", timeStamp: "1700000000", logIndex: "1"};
test("bounded provider continuation", () => {
  assert.equal(parseEtherscanTransferCursor(null), 1);
  assert.equal(parseEtherscanTransferCursor("etherscan-transfer:2"), 2);
  for (const x of ["2", "etherscan-transfer:0", "etherscan-transfer:1001", "etherscan-transfer:2abc"])
    assert.equal(parseEtherscanTransferCursor(x), null);
});
test("Sonic/Mantle only, correct chain IDs", () => {
  const p = new EtherscanTransfersProvider();
  for (const [networkId, chainId] of ([["sonic",146],["mantle",5000]] as const)) {
    assert.equal(p.supportsNetwork({networkId: networkId as "sonic",chainId,name:networkId,nativeCurrency:"ETH"}), true);
  }
  assert.equal(p.supportsNetwork({networkId:"sonic",chainId:1,name:"Sonic",nativeCurrency:"S"}),false);
});
test("valid ERC-20 evidence, never invent amounts", () => {
  const x=normalizeEtherscanErc20Transfers({status:"1",result:[row]},wallet,token,1);
  assert.equal(x?.transfers.length,1);
  assert.equal(x?.transfers[0].value,"1000");
  assert.equal(x?.nextCursor,null);
});
test("reject wrong token or wallet and duplicates", () => {
  assert.equal(normalizeEtherscanErc20Transfers({status:"1",result:[{...row,contractAddress:wallet}]},wallet,token,1),null);
  assert.equal(normalizeEtherscanErc20Transfers({status:"1",result:[row,row]},wallet,token,1),null);
  assert.equal(normalizeEtherscanErc20Transfers({status:"1",result:[{...row,from:token,to:token}]},wallet,token,1),null);
});
test("full page creates continuation", () => {
  const rows=Array.from({length:100},(_,i)=>({...row,logIndex:String(i)}));
  assert.equal(normalizeEtherscanErc20Transfers({status:"1",result:rows},wallet,token,1)?.nextCursor,"etherscan-transfer:2");
});
