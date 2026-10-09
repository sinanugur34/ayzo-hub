import assert from 'node:assert/strict';
import test from 'node:test';
import { POST } from './route';

const token='0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const base=`https://eth.blockscout.com/api/v2/tokens/${token}`;
const endpoint='https://example.invalid/api/internal/evm/ethereum-holder-stage-diagnostic';
const key='only-test-internal-key-sufficiently-long';
const envs=['AYZO_INTERNAL_API_KEY','ALCHEMY_API_KEY','VERCEL_ENV','AYZO_GOLDRUSH_EXIT_CANARY','AYZO_INDEXED_HOLDER_CANARY'] as const;
const row=(n:number)=>({address:{hash:'0x'+n.toString(16).padStart(40,'0')},value:String(500-n)});
function json(data:unknown){return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});}
function request(){return new Request(endpoint,{method:'POST',headers:{'content-type':'application/json','x-ayzo-internal-key':key},body:'{}'});}
async function scenario(difference:boolean){
 const oldFetch=globalThis.fetch;
 const saved=Object.fromEntries(envs.map(n=>[n,process.env[n]]));
 const requests:string[]=[];
 process.env.AYZO_INTERNAL_API_KEY=key;
 process.env.ALCHEMY_API_KEY='test-only-alchemy-key';
 process.env.VERCEL_ENV='preview';
 process.env.AYZO_GOLDRUSH_EXIT_CANARY='1';
 process.env.AYZO_INDEXED_HOLDER_CANARY='1';
 globalThis.fetch=(async input=>{
  const url=String(input);requests.push(url);
  if(url===base)return json({total_supply:'1000000'});
  if(url==='https://eth-mainnet.g.alchemy.com/v2')return json({jsonrpc:'2.0',id:1,result:difference?'0x1':'0xf4240'});
  if(url===base+'/holders')return json({items:Array.from({length:50},(_,i)=>row(i+1)),next_page_params:{address_hash:row(50).address.hash,value:row(50).value,items_count:50}});
  if(url.startsWith(base+'/holders?'))return json({items:Array.from({length:50},(_,i)=>row(i+51)),next_page_params:null});
  throw Error('unapproved network call');
 }) as typeof fetch;
 try{
  const response=await POST(request());
  const body=await response.json();
  assert.deepEqual(Object.keys(body).sort(),difference?['category','stage']:['category','count','stage']);
  if(difference){assert.equal(response.status,502);assert.deepEqual(body,{stage:'SUPPLY_MATCH',category:'SUPPLY_MISMATCH'});assert.equal(requests.length,2);}
  else{assert.equal(response.status,200);assert.deepEqual(body,{stage:'DONE',category:'PASS',count:100});assert.equal(requests.length,4);}
  assert.ok(requests.every(url=>!url.includes('test-only-alchemy-key')));
 }finally{
  globalThis.fetch=oldFetch;
  for(const n of envs){const val=saved[n];if(val===undefined)delete process.env[n];else process.env[n]=val;}
 }
}
test('Preview Ethereum stage probe returns bounded DONE with 100 ordered verified holders',()=>scenario(false));
test('Preview Ethereum stage probe stops before holder requests on supply mismatch',()=>scenario(true));
