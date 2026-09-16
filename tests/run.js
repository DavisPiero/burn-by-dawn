// A tiny in-browser test runner. Each test file exports an array of
// [name, fn] pairs; fn may be async and throws to fail.

import enemyTests from './enemy.test.js';
import traitTests from './traits.test.js';

const suites = [['traits', traitTests], ['enemies', enemyTests]];

const list = document.getElementById('results');
const summary = document.getElementById('summary');
let passed = 0;
let failed = 0;

for (const [suite, tests] of suites) {
  for (const [name, fn] of tests) {
    const item = document.createElement('li');
    try {
      await fn();
      passed++;
      item.className = 'pass';
      item.textContent = `PASS  ${suite} › ${name}`;
    } catch (error) {
      failed++;
      item.className = 'fail';
      item.textContent = `FAIL  ${suite} › ${name}\n      ${error.message}`;
      console.error(error);
    }
    list.appendChild(item);
  }
}

summary.className = failed ? 'fail' : 'pass';
summary.textContent = `${passed} passed, ${failed} failed`;
