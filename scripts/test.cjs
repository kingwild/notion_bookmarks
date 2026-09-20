/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const files = readdirSync('src/lib').filter(name => name.endsWith('.test.cts')).map(name => `src/lib/${name}`);
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=2', '-r', 'ts-node/register', ...files], {
  stdio: 'inherit', env: { ...process.env, TS_NODE_PROJECT: 'tsconfig.test.json', TS_NODE_FILES: 'true' },
});
process.exit(result.status ?? 1);
