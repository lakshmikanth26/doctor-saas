import { execSync } from 'node:child_process';
import { getTestEnv } from './test-env.js';

const testEnv = getTestEnv();
console.log('[test:api] Running integration tests against session pooler…');
execSync('node --test tests/api.integration.test.js', { stdio: 'inherit', env: testEnv });
