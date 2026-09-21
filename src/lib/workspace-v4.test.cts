/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createFeedCache }: typeof import('./workspace-feed-cache') = require('./workspace-feed-cache');
const { aiProviders, aiConfigured, aiText }: typeof import('./workspace-ai') = require('./workspace-ai');

test('Manual refresh bypasses five-minute cache, coalesces requests and preserves good results on failure', async () => {
  let now=100000, calls=0, fail=false;
  const cache=createFeedCache(async()=>{calls++;if(fail)throw Error('offline');return [{title:`story ${calls}`,url:'https://example.com/news'}]},()=>now);
  const first=await cache('weibo');
  assert.equal((await cache('weibo')).fetchedAt,first.fetchedAt);assert.equal(calls,1);
  assert.equal((await cache('weibo',true)).refreshAfter,10);assert.equal(calls,1);
  now+=11000;
  const [a,b]=await Promise.all([cache('weibo',true),cache('weibo',true)]);
  assert.equal(calls,2);assert.equal(a.items[0].title,'story 2');assert.equal(a.fetchedAt,b.fetchedAt);
  now+=11000;fail=true;
  const stale=await cache('weibo',true);assert.equal(stale.stale,true);assert.equal(stale.fetchedAt,a.fetchedAt);assert.equal(stale.items[0].title,'story 2');
  now+=31000;fail=false;await cache('weibo');assert.equal(calls,4);
  await cache('baidu');assert.equal(calls,5);
});

test('Provider selection uses fixed Zhipu primary and separately keyed SiliconFlow backup',()=>{
  const providers=aiProviders({ZHIPU_API_KEY:'primary-test',SILICONFLOW_API_KEY:'backup-test'});
  assert.deepEqual(providers.map(p=>p.id),['zhipu','siliconflow']);
  assert.equal(providers[0].model,'glm-4.7-flash');assert.equal(providers[1].model,'XingChenAGI/Xing4.0-29B');
  assert.equal(aiProviders({}).length,0);
  assert.equal(aiProviders({SILICONFLOW_API_KEY:'backup-test'})[0].id,'siliconflow');
});

test('AI falls back once on transient failures without mixing keys, and primary success avoids backup',async()=>{
  const keys=['ZHIPU_API_KEY','SILICONFLOW_API_KEY','AI_API_KEY','AI_BASE_URL','AI_MODEL'];
  const saved=Object.fromEntries(keys.map(k=>[k,process.env[k]]));const original=global.fetch;
  const calls: {url:string;key:string|null;body:Record<string,unknown>}[]=[];
  try{
    for(const k of keys)delete process.env[k];assert.equal(aiConfigured(),false);
    await assert.rejects(aiText('system','note'),/尚未配置/);
    process.env.ZHIPU_API_KEY='primary-test';process.env.SILICONFLOW_API_KEY='backup-test';assert.equal(aiConfigured(),true);
    global.fetch=async(url,init)=>{calls.push({url:String(url),key:new Headers(init?.headers).get('Authorization'),body:JSON.parse(String(init?.body))});return calls.length===1?new Response('',{status:429}):Response.json({choices:[{message:{content:'classified'},finish_reason:'stop'}]})};
    assert.equal(await aiText('system','note'),'classified');assert.equal(calls.length,2);
    assert.equal(calls[0].key,'Bearer primary-test');assert.equal(calls[1].key,'Bearer backup-test');
    assert.match(calls[0].url,/open\.bigmodel\.cn/);assert.match(calls[1].url,/api\.siliconflow\.cn/);
    assert.deepEqual(calls[0].body.thinking,{type:'disabled'});
    let count=0;global.fetch=async()=>{count++;return Response.json({choices:[{message:{content:'primary result'}}]})};
    assert.equal(await aiText('s','n'),'primary result');assert.equal(count,1);
    count=0;global.fetch=async()=>{count++;return Response.json({choices:[{message:{content:'blocked'},finish_reason:'content_filter'}]})};
    await assert.rejects(aiText('s','n'),/尚未保存/);assert.equal(count,1);
    count=0;global.fetch=async()=>{count++;throw Error('secret upstream details')};
    await assert.rejects(aiText('s','n'),(e: unknown)=>e instanceof Error&&!e.message.includes('secret'));assert.equal(count,2);
    count=0;global.fetch=async()=>{count++;return Response.json({choices:[{message:{content:count===1?'invalid':'[]'}}]})};
    assert.equal(await aiText('s','n',{validate:v=>{JSON.parse(v);return true}}),'[]');assert.equal(count,2);
  }finally{global.fetch=original;for(const k of keys){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k]}}
});
