/**
 * The playtest record (M49): with `?playtest` in the address, the moments a
 * new player passes are noted with the time since the page opened, and COPY
 * RECORD gives them as plain lines for the operator to bring back. It answers
 * ROADMAP's M49 measures: time to the first move, to the first charge set,
 * and where in the course a player trips (wrong clicks and whistles by step).
 *
 * Pure: main.js passes the clock in. Nothing is kept in the browser
 * (CLAUDE.md rule 9); a reload starts a new record.
 */

/** Whether the address asks for the record: `?playtest`. */
export function playtestFromQuery(search) {
  return new URLSearchParams(search).has('playtest');
}

/** What each moment is called in the record. A scene is a mission or a lesson, from its start. */
const SAID = {
  contents: 'contents page',
  mission: 'mission opened',
  level: 'level chosen',
  run: 'drop run chosen',
  jump: 'jumped',
  select: 'first man selected',
  move: 'first move',
  charge: 'first charge set',
  lesson: 'lesson started',
  step: 'step done',
  shake: 'wrong click',
  whistle: 'whistle',
  passed: 'lesson PASSED',
  help: '? opened',
  tips: 'play tips',
  undo: 'undo',
  restart: 'started again',
  end: 'mission over',
};
/** Only the first of these in a scene goes on the timeline; every one is counted. */
const ONCE = new Set(['select', 'move', 'charge']);
/** These begin a scene. */
const SCENES = new Set(['mission', 'lesson', 'restart']);

/** A record begun at `now` (milliseconds). */
export function newRecord(now) {
  return { since: now, events: [], scene: 0 };
}

/** The record with one more moment: `what` is a key of SAID, `detail` a few words or null. */
export function note(record, what, detail, now) {
  if (!SAID[what]) throw new Error(`playtest: no moment called ${what}`);
  const scene = SCENES.has(what) ? record.scene + 1 : record.scene;
  const event = { at: now - record.since, what, detail: detail ?? null, scene };
  return { ...record, scene, events: [...record.events, event] };
}

/** Milliseconds as m:ss. */
export function clock(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The record as plain lines, to paste: the firsts, each scene, where the wrong clicks were, then everything in order. */
export function recordText(record, { build, now }) {
  const { events } = record;
  const first = (what) => events.find((e) => e.what === what);
  const lines = [`BURN BY DAWN — PLAYTEST RECORD`, `Build ${build} · ${clock(now - record.since)} since the page opened`, ''];

  lines.push('FIRSTS (from the page opening)');
  for (const what of ['select', 'move', 'charge', 'passed']) {
    const e = first(what);
    lines.push(`  ${pad(what === 'passed' ? 'first lesson PASSED' : SAID[what], 22)}${e ? clock(e.at) : 'not yet'}`);
  }
  lines.push('');

  const scenes = sceneSummaries(events);
  if (scenes.length) {
    lines.push('SCENES');
    for (const s of scenes) lines.push(`  ${s}`);
    lines.push('');
  }

  const trips = tally(events.filter((e) => e.what === 'shake' || e.what === 'whistle').map((e) => `${e.what === 'shake' ? 'wrong clicks' : 'whistles'}: ${e.detail}`));
  if (trips.length) {
    lines.push('WHERE THEY TRIPPED (most first)');
    for (const [where, n] of trips) lines.push(`  ${n} × ${where}`);
    lines.push('');
  }

  lines.push('TIMELINE');
  const seen = new Set();
  for (const e of events) {
    if (ONCE.has(e.what)) {
      const key = `${e.scene}:${e.what}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    lines.push(`  ${pad(clock(e.at), 7)}${SAID[e.what]}${e.detail ? ` — ${e.detail}` : ''}`);
  }
  return lines.join('\n');
}

/** One line a scene: what it was, how long, and the firsts within it. */
function sceneSummaries(events) {
  const out = [];
  const starts = events.filter((e) => SCENES.has(e.what));
  for (const start of starts) {
    const inScene = events.filter((e) => e.scene === start.scene);
    const last = inScene[inScene.length - 1];
    const within = (what) => {
      const e = inScene.find((x) => x.what === what);
      return e ? clock(e.at - start.at) : null;
    };
    const parts = [`${clock(start.at)} ${SAID[start.what]}${start.detail ? ` — ${start.detail}` : ''}`];
    for (const what of ['move', 'charge']) {
      const t = within(what);
      if (t) parts.push(`${SAID[what]} +${t}`);
    }
    const count = (what) => inScene.filter((e) => e.what === what).length;
    if (count('shake')) parts.push(plural(count('shake'), 'wrong click'));
    if (count('whistle')) parts.push(plural(count('whistle'), 'whistle'));
    const ended = inScene.find((e) => e.what === 'passed' || e.what === 'end');
    if (ended) parts.push(`${ended.what === 'passed' ? 'PASSED' : ended.detail} after ${clock(ended.at - start.at)}`);
    else parts.push(`left after ${clock(last.at - start.at)}`);
    out.push(parts.join(' · '));
  }
  return out;
}

/** [thing, how many], most first, ties in the order first seen. */
function tally(things) {
  const counts = new Map();
  for (const t of things) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]);
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

function pad(text, width) {
  return text.length >= width ? `${text} ` : text + ' '.repeat(width - text.length);
}
