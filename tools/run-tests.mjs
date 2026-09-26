// Run the tests headless, for a quick check while working. A developer tool
// like balance-bot.mjs: the game and tests.html never need it, and tests.html
// under ./run.sh stays the real test run (CLAUDE.md rules 1 and 2).
//
//   node tools/run-tests.mjs
//
// Every tests/*.test.js suite is run, with the /data fetches read from disk.
// Suites that need a browser (sound: Web Audio) report no tests here, so the
// count is lower than tests.html's; run that before calling anything done.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
globalThis.fetch = async (url) => {
  const text = readFileSync(join(REPO, String(url)), 'utf8');
  return { ok: true, json: async () => JSON.parse(text) };
};

let passed = 0;
let failed = 0;
for (const file of readdirSync(join(REPO, 'tests')).filter((f) => f.endsWith('.test.js')).sort()) {
  const tests = (await import(pathToFileURL(join(REPO, 'tests', file)).href)).default;
  for (const [name, fn] of tests) {
    try {
      await fn();
      passed++;
    } catch (error) {
      failed++;
      console.log(`FAIL  ${file.replace('.test.js', '')} › ${name}\n      ${error.message}`);
    }
  }
}
console.log(`${passed} passed, ${failed} failed (browser-only suites skipped; tests.html runs everything)`);
process.exitCode = failed ? 1 : 0;
