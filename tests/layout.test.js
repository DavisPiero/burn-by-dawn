// The layout (M48k, data/layout.json): where the things the operator places
// by hand sit, and the layout tool's moves and Copy, which are pure.

import { clearHexes, contentsOffset, dropCueAt, groundSwatches, layoutText, moved, paintedCount, paintedRows, rowsText, targetsOn, toggledClear, movedCount, noteNudge, pixelsToAxial, pixelsToRadii, validateLayout } from '../src/layout.js';
import { axialToPixel } from '../src/hex.js';
import { checkMap, inBounds, legendCharAt, loadJson, loadMap } from '../src/map.js';

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
  ['a hex painted clear is switched in and out of the list, counted, and each one a real hex of its map (M58e)', async () => {
    const layout = validateLayout(await loadJson('data/layout.json'));
    const before = clearHexes(layout, 'france').size;
    const once = toggledClear(layout, 'france', 0, 0);
    const had = clearHexes(layout, 'france').has('0,0');
    equal(clearHexes(once, 'france').has('0,0'), !had, 'a click switches the hex');
    equal(clearHexes(layout, 'france').size, before, 'the old layout untouched');
    equal(movedCount(layout, once), 1, 'and counted as one change');
    const twice = toggledClear(once, 'france', 0, 0);
    equal(JSON.stringify(twice), JSON.stringify(layout), 'a second click puts it back as it was');
    let threw = false;
    try { validateLayout({ ...layout, missions: { france: { clear: [[1.5, 2]] } } }); } catch (error) { threw = /clear/.test(error.message); }
    assert(threw, 'a clear hex is whole numbers');
    const missions = (await loadJson('data/missions.json')).missions;
    for (const [id, entry] of Object.entries(layout.missions)) {
      if (!entry.clear) continue;
      const map = await loadJson(missions.find((m) => m.id === id).map);
      for (const [q, r] of entry.clear) {
        assert(inBounds(map, q, r), `${id}'s clear hex ${q},${r} is on its map`);
      }
    }
  }],
  ['the terrain painter (M59c): a hex painted changes that one letter of the rows, is counted, and paints back as it was', async () => {
    const map = await loadMap('data/map-gunnerside.json');
    equal(groundSwatches(map).map((s) => s.char).join(''), Object.keys(map.legend).join(''), 'the map\'s own ground, in the legend\'s order');
    equal(groundSwatches(map)[0].label, 'Snowfield', 'named as the terrain table names it');
    const was = legendCharAt(map, 11, 3);
    const rows = paintedRows(map, 11, 3, 'P');
    equal(legendCharAt({ ...map, rows }, 11, 3), 'P', 'the hex is pines');
    equal(paintedCount(map.rows, rows), 1, 'one hex painted');
    equal(map.rows[3], (await loadJson('data/map-gunnerside.json')).rows[3], 'the map as loaded untouched');
    equal(paintedRows({ ...map, rows }, 11, 3, was), map.rows, 'painted back as it was');
    assert(paintedRows(map, 11, 3, was) === map.rows, 'painting a hex its own ground is no change');
    assert(paintedRows(map, 11, 3, '?') === map.rows, 'a letter not in the legend paints nothing');
    assert(paintedRows(map, 99, 3, 'P') === map.rows, 'nor a hex off the map');
    equal(targetsOn(map, 2, 11), ['Cell Hall'], 'the cells are the hall\'s own ground');
    equal(targetsOn(map, 1, 10), [], 'a charge point is not');
  }],
  ['the terrain painter\'s rows are the map file\'s text, byte for byte, for every mission (M59c)', async () => {
    const missions = (await loadJson('data/missions.json')).missions;
    for (const mission of missions) {
      const map = await loadJson(mission.map);
      const file = await (await fetch(mission.map, { cache: 'no-cache' })).text();
      assert(file.includes(rowsText(map.rows)), `${mission.map}'s rows read as the painter writes them`);
    }
  }],
  ['a paint the map cannot take is refused, saying why (M59c): a patrol\'s waypoint painted crag', async () => {
    const map = await loadMap('data/map-gunnerside.json');
    checkMap(map);
    let said = '';
    try { checkMap({ ...map, rows: paintedRows(map, 14, 3, 'C') }); } catch (error) { said = error.message; }
    assert(/route\[1\] \(14, 3\) is crag, which is impassable/.test(said), `refused for the plateau patrol's beat: ${said}`);
  }],
];

function round(value) {
  return Math.round(value * 100) / 100;
}
