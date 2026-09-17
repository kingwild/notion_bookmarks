/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');
const { shanghaiDay, isTaskToday } = require('./workspace-task-dates');
const { loadFeed }: typeof import('./workspace-news') = require('./workspace-news');

test('Shanghai date switches at UTC 16:00 and includes date ranges', () => {
  assert.equal(shanghaiDay(new Date('2026-09-15T15:59:59Z')), '2026-09-15');
  assert.equal(shanghaiDay(new Date('2026-09-15T16:00:00Z')), '2026-09-16');
  assert.equal(isTaskToday('2026-09-16', null, '2026-09-16'), true);
  assert.equal(isTaskToday('2026-09-15', '2026-09-17', '2026-09-16'), true);
  assert.equal(isTaskToday('2026-09-15', null, '2026-09-16'), false);
  assert.equal(isTaskToday('2026-09-15T16:10:00Z', null, '2026-09-16'), true);
});

test('Weibo official band feed keeps short titles, excludes ads, deduplicates and loads 50', async () => {
  const original = global.fetch;
  let requested = '';
  global.fetch = async (url) => { requested = String(url); return new Response(JSON.stringify({ data: { band_list: [
    { note: '广告', is_ad: true }, { note: '优酷', num: 100 }, { note: '优酷' },
    ...Array.from({ length: 60 }, (_, i) => ({ note: `新闻${i}`, num: 3000 })),
  ] } })); };
  try {
    const items = await loadFeed('weibo');
    assert.equal(requested, 'https://weibo.com/ajax/statuses/hot_band');
    assert.equal(items.length, 50);
    assert.equal(items[0].title, '优酷');
    assert.equal(new Set(items.map(i => i.url)).size, 50);
    assert.equal(items.some(i => i.title === '广告'), false);
  } finally { global.fetch = original; }
});

test('Upstream failures remain failures rather than fabricated headlines', async () => {
  const original = global.fetch;
  global.fetch = async () => new Response('unavailable', { status: 503 });
  try { await assert.rejects(loadFeed('weibo'), /503/); } finally { global.fetch = original; }
});
