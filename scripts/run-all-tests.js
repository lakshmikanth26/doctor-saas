import { execSync } from 'node:child_process';
import { getTestEnv } from './test-env.js';

const testEnv = getTestEnv();

console.log('[test] Running smoke tests…');
execSync('node --test tests/api.smoke.test.js', { stdio: 'inherit', env: testEnv });

console.log('[test] Running integration tests…');
execSync('node --test tests/api.integration.test.js', { stdio: 'inherit', env: testEnv });
