/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanExcerpt, readableExcerpt, relatedScore, selectRelated }: typeof import('./workspace-summary') = require('./workspace-summary');
const { marketingMonth }: typeof import('./workspace-calendar') = require('./workspace-calendar');
const { fixedMarketingEvents, monthlyCampaigns }: typeof import('./workspace-marketing-data') = require('./workspace-marketing-data');
const { NEWS_SOURCES }: typeof import('./workspace') = require('./workspace');

test('Public excerpts preserve tutorials about login and reject actual access gates', () => {
  const content = '内网打印服务支持权限与审计，普通用户登录后可以提交打印任务，管理员可查看日志。';
  assert.equal(readableExcerpt(`<td id="postmessage_1"><div class="pstatus">编辑于今天</div>${content}</td><script>fake()</script>`), content);
  assert.equal(cleanExcerpt('请登录后才能查看本帖内容，您尚未登录本站。'), '');
  assert.equal(cleanExcerpt('A useful tool for managing documents Discussion | Link'), 'A useful tool for managing documents');
});
test('Related stories require matching phrases, recent dates and safe source URLs', () => {
  const now = Date.parse('2026-09-20T06:00:00Z');
  const query = '中国队夺金速度太快';
  const valid = { title: '中国队夺金速度也太快了', intro: '今天举行的比赛中，中国队在多个项目接连夺金，运动员发挥出色。', url: 'https://news.sina.com.cn/c/2026-09-20/example.shtml', ctime: now / 1000, media_show: '示例媒体' };
  assert.ok(relatedScore(query, valid.title, valid.intro) >= .75);
  assert.ok(selectRelated(query, [valid], now));
  for (const changed of [{title:'中国队公布下一届比赛计划',intro:'球队正在为下一届比赛做准备，相关赛事将在下个月开始。'}, {ctime:now/1000 - 86400*8}, {url:'https://sina.com.cn.evil.test/'}, {url:'https://user:pass@news.sina.com.cn/a'}, {url:'javascript:alert(1)'}]) assert.equal(selectRelated(query, [{...valid,...changed}], now), undefined);
  assert.equal(relatedScore('中国队连夺8金','中国队连夺3金','中国队今天连夺3金，多个项目发挥出色。'), 0);
  assert.equal(relatedScore('波音','波音发布消息','波音发布消息，宣布新的产品计划与研发方向。'), 0);
});
test('Marketing calendar includes industrial and cultural sources, specific ideas and monthly campaigns', () => {
  const events = Object.values(fixedMarketingEvents).flat();
  assert.ok(events.length >= 60);
  assert.ok(events.filter(e => e.source).length >= 40);
  assert.ok(events.every(e => e.idea.length > 20 && e.leadDays > 0));
  const september = marketingMonth(2026,9);
  assert.ok(september.flatMap(d=>d.events).length >= 16);
  assert.ok(monthlyCampaigns(2026,9).some(e=>e.name==='全国质量月' && e.source));
  assert.ok(monthlyCampaigns(2026,9).some(e=>e.name==='全国科普月' && e.source));
  assert.equal(monthlyCampaigns(2027,9).some(e=>e.name==='全国质量月'), false);
  assert.equal(monthlyCampaigns(2024,9).some(e=>e.name==='全国科普月'), false);
  assert.equal(NEWS_SOURCES.some(s => String(s.id)==='xiaohongshu'), false);
});

test('Private read routes reject anonymous users before accessing Notion and disable shared caching', async () => {
  const Module = require('node:module');
  const original = Module._load;
  let owner = false, reads = 0;
  const tasks = [{id:'test-task',title:'private task'}];
  Module._load = function(id: string, ...args: unknown[]) {
    if (id === '@/lib/workspace-owner') return { isOwner:async()=>owner, privateSetting:async()=>{reads++;return null} };
    if (id === '@/lib/workspace-tasks') return { getTodayTasks:async()=>{reads++;return tasks} };
    if (id === '@/lib/notion') return {notion:{}};
    if (id === '@/lib/workspace-validation') return require('./workspace-validation');
    return original.call(this,id,...args);
  };
  let taskRoute, preferenceRoute;
  try { taskRoute=require('../app/api/workspace/tasks/route'); preferenceRoute=require('../app/api/workspace/preferences/route'); }
  finally {Module._load=original}
  for(const route of [taskRoute,preferenceRoute]) {
    const response=await route.GET(); assert.equal(response.status,401); assert.match(response.headers.get('cache-control'),/private, no-store/);
  }
  assert.equal(reads,0);
  owner=true;
  const taskResponse=await taskRoute.GET(); assert.equal(taskResponse.status,200); assert.deepEqual((await taskResponse.json()).tasks,tasks);
  const preferenceResponse=await preferenceRoute.GET(); assert.equal(preferenceResponse.status,200); assert.match(preferenceResponse.headers.get('cache-control'),/private, no-store/);
  assert.equal(reads,2);
});
