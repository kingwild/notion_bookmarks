/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const { aiText }: typeof import('./workspace-ai') = require('./workspace-ai');

test('Capture switches models on overload, timeout or invalid output; preserves provider order and account limits', async () => {
  const names = ['ZHIPU_API_KEY', 'SILICONFLOW_API_KEY', 'AI_API_KEY'];
  const old = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const original = global.fetch;
  const success = () => Response.json({ choices: [{ message: { content: '[]' } }] });
  try {
    for (const name of names) delete process.env[name];
    process.env.ZHIPU_API_KEY = 'test-primary';
    for (const failure of ['busy', 'timeout', 'invalid']) {
      const calls: string[] = []; let used = '';
      global.fetch = async (_url, init) => {
        const body = JSON.parse(String(init?.body)); calls.push(body.model);
        assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer test-primary');
        if (calls.length === 1) {
          if (failure === 'timeout') throw new DOMException('test timeout', 'TimeoutError');
          return failure === 'busy' ? Response.json({ error: { code: '1305' } }, { status: 429 }) : Response.json({ choices: [{ message: { content: 'invalid JSON' } }] });
        }
        assert.equal(body.thinking, undefined); return success();
      };
      assert.equal(await aiText('test', 'test', { allowFlashFallback: true, validate: value => Array.isArray(JSON.parse(value)), onModel: model => { used = model; } }), '[]');
      assert.deepEqual(calls, ['glm-4.7-flash', 'glm-4-flash']); assert.equal(used, 'glm-4-flash');
    }
    for (const response of [
      () => Response.json({ error: { code: '1302' } }, { status: 429 }),
      () => Response.json({}, { status: 401 }),
      () => Response.json({ error: { code: '1305' } }, { status: 429, headers: { 'Retry-After': '60' } }),
      () => Response.json({ choices: [{ finish_reason: 'content_filter' }] }),
    ]) {
      let calls = 0; global.fetch = async () => { calls++; return response(); };
      await assert.rejects(aiText('test', 'test', { allowFlashFallback: true })); assert.equal(calls, 1);
    }
    process.env.SILICONFLOW_API_KEY = 'test-backup';
    const models: string[] = [], keys: string[] = [];
    global.fetch = async (_url, init) => {
      models.push(JSON.parse(String(init?.body)).model);
      keys.push((init?.headers as Record<string, string>).Authorization);
      return models.length < 3 ? Response.json({}, { status: 503 }) : success();
    };
    assert.equal(await aiText('test', 'test', { allowFlashFallback: true }), '[]');
    assert.equal(models[0], 'glm-4.7-flash'); assert.equal(models[2], 'glm-4-flash');
    assert.deepEqual(keys, ['Bearer test-primary', 'Bearer test-backup', 'Bearer test-primary']);
  } finally {
    global.fetch = original;
    for (const name of names) { if (old[name] === undefined) delete process.env[name]; else process.env[name] = old[name]; }
  }
});
