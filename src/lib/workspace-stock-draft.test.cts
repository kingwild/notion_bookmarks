/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const { stockDraft, moveStock, parseStockDraft }: typeof import('./workspace-stock-draft') = require('./workspace-stock-draft');
test('Batch holdings preserve order and original values until save; invalid row rejects entire batch', () => {
  const saved = [{ secid:'1.600000', code:'600000', name:'甲', market:'1', shares:100 }, { secid:'0.000001',code:'000001',name:'乙',market:'0',shares:200 }];
  const draft = stockDraft(saved); draft[0].sharesText = '120.1234'; draft[1].sharesText = '0';
  const reordered = moveStock(draft,1,-1); const result = parseStockDraft(reordered);
  assert.deepEqual(result.map(s=>[s.secid,s.shares]), [['0.000001',0],['1.600000',120.1234]]);
  assert.equal(saved[0].shares,100); assert.equal(saved[1].shares,200);
  assert.deepEqual(moveStock(draft,0,-1),draft);
  draft[1].sharesText='2e3'; assert.throws(()=>parseStockDraft(draft),/乙/);
  draft[1].sharesText=''; assert.equal(parseStockDraft(draft)[1].shares,undefined);
});
