// The playtest record (M49, `?playtest`): the moments noted and the lines
// COPY RECORD gives, which are pure.

import { clock, newRecord, note, playtestFromQuery, recordText } from '../src/playtest.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function equal(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

/** A record from [seconds, what, detail] rows, begun at 1000 ms. */
function played(rows) {
  return rows.reduce((r, [s, what, detail]) => note(r, what, detail, 1000 + s * 1000), newRecord(1000));
}

export default [
  ['the record is asked for by ?playtest, and only by it', () => {
    assert(playtestFromQuery('?playtest'), '?playtest');
    assert(playtestFromQuery('?mission=france&playtest'), 'among others');
    assert(!playtestFromQuery('?mission=france'), 'not without it');
  }],

  ['a clock reads minutes and seconds', () => {
    equal([clock(0), clock(9400), clock(61000), clock(3600000)], ['0:00', '0:09', '1:01', '60:00'], 'clocks');
  }],

  ['a moment that is not known is refused', () => {
    let threw = false;
    try { note(newRecord(0), 'dance', null, 1); } catch { threw = true; }
    assert(threw, 'unknown moment throws');
  }],

  ['the firsts are timed from the page opening; the timeline keeps only the first move of each scene', () => {
    const text = recordText(played([
      [0, 'contents'], [12, 'mission', 'france'], [30, 'select'], [41, 'move'], [50, 'move'], [400, 'charge'], [401, 'charge'],
    ]), { build: 'M49', now: 1000 + 500000 });
    assert(text.includes('Build M49 · 8:20 since the page opened'), 'header');
    assert(/first move\s+0:41/.test(text), 'first move');
    assert(/first charge set\s+6:40/.test(text), 'first charge');
    assert(/first lesson PASSED\s+not yet/.test(text), 'no lesson');
    equal(text.split('\n').filter((l) => l.includes('first move')).length, 3, 'firsts row, scene line and timeline once each');
  }],

  ['each scene says its firsts from its own start, and how it ended', () => {
    const text = recordText(played([
      [0, 'contents'], [10, 'mission', 'training'], [20, 'lesson', 'Action points'], [25, 'shake', 'Action points, step 1'],
      [30, 'move'], [80, 'passed', 'Action points'], [90, 'mission', 'france'], [100, 'move'], [700, 'end', 'success, 140'],
    ]), { build: 'M49', now: 701000 });
    assert(text.includes('0:20 lesson started — Action points · first move +0:10 · 1 wrong click · PASSED after 1:00'), 'lesson scene');
    assert(text.includes('1:30 mission opened — france · first move +0:10 · success, 140 after 10:10'), 'mission scene');
  }],

  ['where they tripped is counted by step, most first', () => {
    const text = recordText(played([
      [0, 'lesson', 'Ground'], [1, 'shake', 'Ground, step 2'], [2, 'whistle', 'Not being seen, step 3: seen'],
      [3, 'shake', 'Ground, step 4'], [4, 'shake', 'Ground, step 4'],
    ]), { build: 'M49', now: 5000 });
    const block = text.split('WHERE THEY TRIPPED (most first)\n')[1].split('\n\n')[0].split('\n');
    equal(block, ['  2 × wrong clicks: Ground, step 4', '  1 × wrong clicks: Ground, step 2', '  1 × whistles: Not being seen, step 3: seen'], 'tally');
  }],
];
