/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const { passwordHash, checkPassword, issueSession, validSession } = require('./workspace-owner-crypto');
const { validateStocks, validateCapture, validDate } = require('./workspace-validation');
const { marketingMonth }: typeof import('./workspace-calendar') = require('./workspace-calendar');
const { shortOverview, allowedArticle, newsOverview } = require('./workspace-summary');
const { loadFeed } = require('./workspace-news');

test('Owner session rejects tampering, expiry and password rotation', () => {
  const hash = passwordHash('a sufficiently long sample password');
  assert.equal(checkPassword('a sufficiently long sample password', hash), true);
  assert.equal(checkPassword('wrong', hash), false);
  assert.equal(checkPassword('x', ''), false);
  const now = 1800000000000, token = issueSession('test-key', hash, now);
  assert.equal(validSession(token, 'test-key', hash, now), true);
  assert.equal(validSession(token.slice(0,-1) + (token.endsWith('a') ? 'b' : 'a'), 'test-key', hash, now), false);
  assert.equal(validSession(token, 'test-key', hash, now + 43200001), false);
  assert.equal(validSession(token, 'test-key', passwordHash('new password'), now), false);
  assert.equal(validSession('', '', '', now), false);
});
test('Stock validation rejects duplicates, mismatched codes and malformed values', () => {
  const stock = { secid: '1.603019', code: '603019', name: '中科曙光', market: '沪A' };
  assert.equal(validateStocks([stock]).length, 1);
  for (const input of [[], [stock, stock], [{ ...stock, code: '000001' }], [{ ...stock, secid: 'http://localhost' }], null]) assert.equal(validateStocks(input), null);
});
test('Capture requires explicit valid money and date, preserving zero as invalid', () => {
  const item = { id: '8d57f31a-927b-4885-aa49-4c78c7e18c11', kind: 'expense', title: '午餐', date: '2026-09-20', amount: '35.50' };
  assert.equal(validateCapture(item).amount, '35.50');
  for (const amount of ['', '0', '-10', '1.999', 'NaN', '1e5']) assert.equal(validateCapture({ ...item, amount }), null);
  assert.equal(validDate('2026-02-30'), false); assert.equal(validDate('2028-02-29'), true);
  assert.equal(validateCapture({ ...item, kind: 'transfer' }), null);
});
test('Marketing calendar resolves lunar festivals and leap-year month boundaries', () => {
  assert.equal(marketingMonth(2026,9).find(d => d.date === '2026-09-25')?.events.some(e => e.name === '中秋节'), true);
  assert.equal(marketingMonth(2026,2).length, 28);
  assert.equal(marketingMonth(2028,2).length, 29);
  assert.equal(marketingMonth(2026,13).length, 0);
  assert.equal(marketingMonth(2026,5).find(d => d.date === '2026-05-10')?.events.some(e => e.name === '母亲节'), true);
});
test('News summary caps Unicode characters and denies arbitrary fetch targets', async () => {
  assert.equal(Array.from(shortOverview('😀'.repeat(150))).length, 100);
  for (const url of ['http://localhost/a','https://127.0.0.1/', 'https://www.toutiao.com.evil.test/article/123', 'https://user:pass@socialbeta.com/campaign/123','https://socialbeta.com:8443/campaign/123']) assert.equal(allowedArticle(url), false);
  assert.equal(allowedArticle('https://www.52pojie.cn/thread-123-1-1.html'), true);
  const result = await newsOverview({ title: '只有标题，无法推断事实', url: 'https://s.weibo.com/weibo?q=test' });
  assert.equal(result.kind, 'unavailable');
});
test('52pojie decodes GBK, excludes unrelated links and keeps 50 unique threads', async () => {
  const original = global.fetch;
  const iconv = require('iconv-lite');
  global.fetch = async () => new Response(iconv.encode(`<a href="/login">登录</a>${Array.from({length:55}, (_,i)=>`<a class="xst" href="thread-${i}-1-1.html">工具${i}</a>`).join('')}`, 'gbk'));
  try { const items = await loadFeed('52pojie'); assert.equal(items.length, 50); assert.equal(items[0].title, '工具0'); } finally { global.fetch = original; }
});
