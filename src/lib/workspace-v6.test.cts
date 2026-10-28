/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { transpileModule, ModuleKind, ScriptTarget } = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
const { validateStocks }: typeof import('./workspace-validation') = require('./workspace-validation');
const { stockSettingText }: typeof import('./workspace-stock-settings') = require('./workspace-stock-settings');
const { extractRichText }: typeof import('../types/notion/common') = require('../types/notion/common');
const { aiText }: typeof import('./workspace-ai') = require('./workspace-ai');
const stocks=Array.from({length:100},(_,i)=>({secid:`0.${String(i+100).padStart(6,'0')}`,code:String(i+100).padStart(6,'0'),name:'测试股票🪴'.repeat(8),market:'0',shares:100.1234}));

test('100 holdings round-trip through Notion segments; 101 rejected and every segment stays within its size limit',()=>{
  const normalized=validateStocks(stocks);assert.equal(normalized?.length,100);
  assert.equal(validateStocks([...stocks,{...stocks[0],secid:'0.999999',code:'999999'}]),null);
  const parts=stockSettingText(normalized);assert.ok(parts.length>1);assert.ok(parts.every(p=>p.text.content.length<=2000));
  const decoded=extractRichText({rich_text:parts.map(p=>({plain_text:p.text.content}))});
  assert.deepEqual(validateStocks(JSON.parse(decoded)),normalized);
});

function route(file:string,imports:Record<string,unknown>) {
  const exports:Record<string,(request:InstanceType<typeof NextRequest>)=>Promise<Response>>={};
  const code=transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2022}}).outputText;
  new Function('require','exports',code)((id:string)=>{if(id==='next/server')return {NextRequest,NextResponse};if(!(id in imports))throw Error(id);return imports[id]},exports);return exports;
}
test('100-stock save uses large body budget and segmented Notion rich text, with revision checks retained',async()=>{
  let written: {properties:{Value:{rich_text:ReturnType<typeof stockSettingText>}}}|undefined;
  const handlers=route('src/app/api/workspace/preferences/route.ts',{
    '@/lib/workspace-validation':require('./workspace-validation'), '@/lib/workspace-stock-settings':{stockSettingText},
    '@/lib/notion':{notion:{pages:{update:async(v:typeof written)=>{written=v;return {last_edited_time:'next'}}}}},
    '@/lib/workspace-owner':{requireOwner:async()=>null,privateSetting:async()=>({id:'config',revision:'current'}),readBody:async(r:Request,limit:number)=>{assert.equal(limit,64000);return r.json()}}
  });
  const run=(revision:string)=>handlers.PUT(new NextRequest('https://site.test/api',{method:'PUT',body:JSON.stringify({stocks,revision})}));
  assert.equal((await run('old')).status,409);assert.equal(written,undefined);
  const result=await run('current');assert.equal(result.status,200);assert.equal((await result.json()).stocks.length,100);
  assert.ok(written!.properties.Value.rich_text.length>1);
});
test('Quotes fetch 100 symbols in batches, preserve order, and retain healthy batches on partial failure',async()=>{
  const original=global.fetch;let batches=0,fail=false;
  const handlers=route('src/app/api/workspace/markets/route.ts',{'@/lib/workspace-validation':require('./workspace-validation'),'@/lib/stock/api':require('./stock/api')});
  global.fetch=async(url)=>{
    batches++;const symbols=String(url).split('q=')[1].split(',');assert.ok(symbols.length<=20);
    if(fail&&batches===2)throw Error('one batch down');
    return new Response(symbols.map(symbol=>{const fields=Array(50).fill('');fields[1]='Test';fields[2]=symbol.slice(2);fields[3]='12';fields[4]='10';fields[30]='20261028103000';return `v_${symbol}="${fields.join('~')}";`}).join('\n'));
  };
  const run=(ids:string[])=>handlers.GET(new NextRequest('https://site.test/api?ids='+ids.join(',')));
  try {
    const ids=stocks.map(s=>s.secid);const full=await run(ids);assert.equal(full.status,200);assert.equal(batches,5);assert.deepEqual((await full.json()).quotes.map((q:{secid:string})=>q.secid),ids);
    batches=0;fail=true;const partial=await(await run(ids)).json();assert.equal(partial.quotes.length,80);assert.equal(partial.partial,true);
    batches=0;assert.equal((await run([...ids,'0.999999'])).status,400);assert.equal(batches,0);
  } finally {global.fetch=original}
});
test('AI retries temporary overload once, respects long retry-after, and never retries account rate limits',async()=>{
  const names=['ZHIPU_API_KEY','SILICONFLOW_API_KEY','AI_API_KEY'];const old=Object.fromEntries(names.map(n=>[n,process.env[n]]));const original=global.fetch;let calls=0;
  try {
    for(const n of names)delete process.env[n];process.env.ZHIPU_API_KEY='test-only';
    global.fetch=async()=>{calls++;return calls===1?Response.json({error:{code:'1305'}},{status:429}):Response.json({choices:[{message:{content:'ok'}}]})};
    assert.equal(await aiText('test','test'),'ok');assert.equal(calls,2);
    calls=0;global.fetch=async()=>{calls++;return Response.json({error:{code:'1305'}},{status:429,headers:{'Retry-After':'60'}})};
    await assert.rejects(aiText('test','test'),/繁忙/);assert.equal(calls,1);
    calls=0;global.fetch=async()=>{calls++;return Response.json({error:{code:'1302'}},{status:429})};
    await assert.rejects(aiText('test','test'),/频率限制/);assert.equal(calls,1);
  } finally {global.fetch=original;for(const n of names){if(old[n]===undefined)delete process.env[n];else process.env[n]=old[n]}}
});
