/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { transpileModule, ModuleKind } = require('typescript');
const { NextRequest, NextResponse } = require('next/server');
const { dailyReturns }: typeof import('./workspace-holdings') = require('./workspace-holdings');
const { validateStocks }: typeof import('./workspace-validation') = require('./workspace-validation');
const { addDays, isTaskInRange }: typeof import('./workspace-task-dates') = require('./workspace-task-dates');

test('Seven-day tasks include overlapping ranges and handle month/year and Shanghai boundaries', () => {
  assert.equal(addDays('2026-12-29', 6), '2027-01-04');
  assert.equal(isTaskInRange('2026-09-20', '2026-09-28', '2026-09-28', '2026-10-04'), true);
  assert.equal(isTaskInRange('2026-10-04T16:00:00Z', null, '2026-09-28', '2026-10-04'), false);
  assert.equal(isTaskInRange('2026-10-03T16:00:00Z', null, '2026-09-28', '2026-10-04'), true);
  assert.equal(isTaskInRange('2026-09-27', null, '2026-09-28', '2026-10-04'), false);
});
const stock = { secid: '1.603019', code: '603019', name: '示例', market: '1', shares: 100 };
test('Holdings validate and round-trip without losing shares; invalid quantities rejected', () => {
  assert.equal(validateStocks([stock])?.[0].shares,100);
  assert.equal(validateStocks([{...stock,shares:0}])?.[0].shares,0);
  assert.equal(validateStocks([{...stock,shares:0.1234}])?.[0].shares,0.1234);
  for (const shares of [-1,Infinity,NaN,1e10,'100',0.12345]) assert.equal(validateStocks([{...stock,shares}]),null);
});
test('Daily P&L separates currencies and never treats missing/stale prior-session quotes as zero', () => {
  const hk = {...stock,secid:'116.00700',code:'00700',shares:20};
  const q = {...stock,price:12,previousClose:10,updatedAt:'2026-09-28T03:00:00Z',isStale:false,change:2,changePercent:20,volume:null,amount:null,turnoverRate:null};
  assert.deepEqual(dailyReturns([stock,hk],[q,{...q,secid:hk.secid,price:9}],'2026-09-28').map(v=>[v.currency,v.amount,v.missing]),[['CNY',200,0],['HKD',-20,0]]);
  for (const patch of [{price:null},{previousClose:0},{isStale:true},{updatedAt:'2026-09-27T03:00:00Z'},{updatedAt:null}]) assert.equal(dailyReturns([stock],[{...q,...patch}],'2026-09-28')[0].missing,1);
  assert.deepEqual(dailyReturns([{...stock,shares:0}],[],'2026-09-28'),[]);
});

test('Owner write routes reject unauthorized and foreign-database records; completion and archive are idempotent', async () => {
  const db='201056cc-e99d-81a2-a7b8-cff3b7e7a45c', id='11111111-1111-4111-8111-111111111111';
  const old=process.env.NOTION_LINKS_DB_ID; process.env.NOTION_LINKS_DB_ID=db;
  let denied=401, parent=db, archived=false;
  const writes: unknown[]=[];
  const notion={pages:{retrieve:async()=>({id,parent:{type:'database_id',database_id:parent},archived}),update:async(v:unknown)=>{writes.push(v);return {}}},databases:{retrieve:async()=>({properties:{'状态':{type:'status',status:{options:[{id:'done',name:'已完成'}]}}}})}};
  function load(file:string) {
    const code=transpileModule(readFileSync(file,'utf8'),{compilerOptions:{module:ModuleKind.CommonJS}}).outputText;
    const exports:Record<string,(r:InstanceType<typeof NextRequest>)=>Promise<Response>>={};
    const imports:Record<string,unknown>={'next/server':{NextRequest,NextResponse},'next/cache':{revalidatePath:()=>{}},'@/lib/notion':{notion},'@/lib/workspace-tasks':{TASK_DATABASE_ID:db},'@/lib/workspace-owner':{requireOwner:async()=>denied?NextResponse.json({error:'denied'},{status:denied}):null,readBody:(r:Request)=>r.json()}};
    new Function('require','exports',code)((key:string)=>{if (!(key in imports)) throw Error(key);return imports[key]},exports);return exports;
  }
  try {
    const routes=[{fn:load('src/app/api/workspace/tasks/route.ts').PATCH,method:'PATCH',body:{id,completed:true}}, {fn:load('src/app/api/workspace/links/route.ts').DELETE,method:'DELETE',body:{id,confirmed:true}}];
    for (const route of routes) {
      const run=(body=route.body)=>route.fn(new NextRequest('https://site.test/api',{method:route.method,body:JSON.stringify(body)}));
      for (const status of [401,403]) {denied=status;assert.equal((await run()).status,status)}
      assert.equal(writes.length,0);denied=0;parent='other';assert.equal((await run()).status,400);assert.equal(writes.length,0);
      parent=db;assert.equal((await run()).status,200);assert.equal(writes.length,1);
      if(route.method==='DELETE'){assert.deepEqual(writes[0],{page_id:id,archived:true});archived=true;assert.equal((await run()).status,200);assert.equal(writes.length,1)}
      else assert.deepEqual(writes[0],{page_id:id,properties:{'状态':{status:{id:'done'}}}});
      writes.length=0;archived=false;
    }
  } finally { if(old===undefined)delete process.env.NOTION_LINKS_DB_ID;else process.env.NOTION_LINKS_DB_ID=old; }
});
