// The layout (M48k, data/layout.json): where the things the operator places
// by hand sit, and the layout tool's moves and Copy, which are pure.

import { contentsOffset, dropCueAt, layoutText, moved, movedCount, noteNudge, pixelsToAxial, pixelsToRadii, validateLayout } from '../src/layout.js';
import { axialToPixel } from '../src/hex.js';
import { loadJson } from '../src/map.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
function equal(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

async function loadAll() {
  const missions = (await loadJson('data/missions.json')).missions;
  const layout = validateLayout(await loadJson('data/layout.json'), { missions: missions.map((m) => m.id) });
  return { missions, layout };
}

export default [
  ['data/layout.json is valid and names only missions there are', async () => {
    const { layout } = await loadAll();
    equal(contentsOffset(layout, 'flag').length, 2, 'START HERE has a place');
  }],

  ['every note in data/layout.json is for an objective of its mission, or its exfil', async () => {
    const { missions, layout } = await loadAll();
    for (const mission of missions) {
      const map = await loadJson(mission.map);
      const ids = new Set([...map.objectives.map((o) => o.id), 'exfil']);
      for (const key of Object.keys(layout.missions[mission.id]?.notes ?? {})) assert(ids.has(key), `${mission.id}: no objective "${key}"`);
    }
  }],

  ['no map still carries the positions moved into data/layout.json', async () => {
    const { missions } = await loadAll();
    for (const mission of missions) {
      const map = await loadJson(mission.map);
      for (const key of ['dropCueAt', 'exfilNoteNudge']) assert(!(key in map), `${mission.map} still has ${key}`);
      for (const o of map.objectives) assert(!('noteNudge' in o), `${mission.map} ${o.id} still has noteNudge`);
    }
  }],

  ['a mission\'s drop cue and notes read from the layout, and nothing where it says nothing', async () => {
    const { layout } = await loadAll();
    equal(dropCueAt(layout, 'airfield'), [7.2, 5.5], 'the airfield\'s cue on the strip');
    equal(noteNudge(layout, 'aqueduct', 'exfil'), [-1.97, -1.27], 'the aqueduct\'s way-out note');
    equal(noteNudge(layout, 'france', 'bridge'), null, 'France\'s bridge note where the ring puts it');
    equal(dropCueAt(layout, 'nowhere'), null, 'no mission, no cue');
  }],

  ['a drag in pixels turns into the units each thing is kept in', () => {
    const size = 46;
    equal(pixelsToRadii([46, -23], size), [1, -0.5], 'a note\'s hex radii');
    const [q, r] = pixelsToAxial([60, 90], size);
    const back = axialToPixel(q, r, size);
    assert(Math.abs(back.x - 60) < 1e-9 && Math.abs(back.y - 90) < 1e-9, `axial back to pixels: ${JSON.stringify(back)}`);
  }],

  ['a move is a new layout, rounded to hundredths, the old one untouched; and counted', async () => {
    const { layout } = await loadAll();
    const after = moved(layout, 'contents:flag', [12.345, -3]);
    equal(after.contents.flag, [round(layout.contents.flag[0] + 12.345), round(layout.contents.flag[1] - 3)], 'START HERE moved');
    equal(layout.contents.flag, (await loadJson('data/layout.json')).contents.flag, 'the old layout as it was');
    const note = moved(after, 'mission:france:bridge', [0.5, 1]);
    equal(note.missions.france.notes.bridge, [0.5, 1], 'a note with no nudge moves from none');
    const cue = moved(note, 'mission:france:dropCue', [1, 0]);
    equal(cue.missions.france.dropCue, [round(layout.missions.france.dropCue[0] + 1), layout.missions.france.dropCue[1]], 'the drop cue');
    equal(movedCount(layout, cue), 3, 'three things moved');
    equal(movedCount(layout, layout), 0, 'nothing moved');
  }],

  ['Copy gives the file back as it is when nothing has moved', async () => {
    const { layout } = await loadAll();
    const text = layoutText(layout);
    equal(JSON.parse(text), layout, 'the same data');
    assert(/"flag": \[-?[\d.]+, -?[\d.]+\]/.test(text), 'a pair on one line');
    assert(text.endsWith('}\n'), 'ends with a newline');
  }],
];

function round(value) {
  return Math.round(value * 100) / 100;
}
