// How to play's pages (M48i): data/help.json's scenes, turned into frames by
// src/help.js and drawn by render/board.js drawHelpScene. The frames are held
// to the rules (a walk is a hex at a time over ground a man can cross, no AP
// is spent that he has not got), the words to three lines in every mission,
// and every page of every mission is drawn (that part in a browser only).

import { createEnemies } from '../src/enemy.js';
import { hexDistance } from '../src/hex.js';
import { helpFrames, helpLines, sceneHex, sceneMap, stepCost } from '../src/help.js';
import { isInPlay, loadJson, loadMap } from '../src/map.js';
import { missionEnemyTypes, missionRoster, missionRules, validateMissions } from '../src/missions.js';
import { validateTraits } from '../src/traits.js';
import { createUnits } from '../src/units.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function everyMission() {
  const missions = validateMissions(await loadJson('data/missions.json'));
  const raw = await loadJson('data/rules.json');
  const traits = validateTraits(await loadJson('data/traits.json'));
  const out = [];
  for (const mission of missions.missions ?? missions) {
    const map = await loadMap(mission.map, undefined, undefined, (types) => missionEnemyTypes(mission, types));
    const roster = missionRoster(mission, await loadJson(mission.roster));
    out.push({ mission, map, rules: missionRules(mission, raw), roster, traits });
  }
  return out;
}

const framesOf = (help, page, map, rules, missionId) => helpFrames(help, page, { terrain: map.terrain, rules, apOf: (role) => rules.roles[role].actionPoints, missionId });

export default [
  ['every page has a tab of its own, and TONIGHT is the last, with no scene', async () => {
    const help = await loadJson('data/help.json');
    const tabs = help.pages.map((p) => p.tab);
    assert(new Set(tabs).size === tabs.length, `tabs twice: ${tabs}`);
    assert(help.pages.at(-1).id === 'tonight' && !help.pages.at(-1).scene, 'TONIGHT is not the last page, or has a scene');
    assert(help.pages.slice(0, -1).every((p) => p.scene), 'a page before TONIGHT has no scene');
  }],

  ['a page says at most three lines in every mission, every rule it quotes filled in', async () => {
    const help = await loadJson('data/help.json');
    for (const { mission, rules } of await everyMission()) {
      for (const page of help.pages.filter((p) => p.scene)) {
        const lines = helpLines(page, rules);
        assert(lines.length >= 1 && lines.length <= 3, `${mission.id} ${page.tab}: ${lines.length} lines`);
        for (const line of lines) assert(!/[{}]/.test(line), `${mission.id} ${page.tab}: a rule not filled in: ${line}`);
      }
    }
  }],

  ['every scene walks a hex at a time over ground a man can cross, and never spends AP he has not got', async () => {
    const help = await loadJson('data/help.json');
    for (const { mission, map, rules } of await everyMission()) {
      for (const page of help.pages.filter((p) => p.scene)) {
        const board = sceneMap(help, page, map.terrain, mission.id);
        const frames = framesOf(help, page, map, rules, mission.id);
        assert(frames.length > 1, `${page.tab}: no frames`);
        assert(frames.every((f) => f.ms > 0), `${page.tab}: a frame with no time`);
        for (let i = 1; i < frames.length; i++) {
          for (const man of frames[i].men) {
            assert(isInPlay(board, man.q, man.r), `${mission.id} ${page.tab}: ${man.id} off the scene at ${man.q},${man.r}`);
            assert(man.ap >= 0, `${mission.id} ${page.tab}: ${man.id} spent AP he had not got (${man.ap}), frame ${i}`);
            const before = frames[i - 1].men.find((m) => m.id === man.id);
            if (!before || (before.q === man.q && before.r === man.r)) continue;
            assert(hexDistance(before, man) === 1, `${page.tab}: ${man.id} jumped from ${before.q},${before.r} to ${man.q},${man.r}`);
            assert(stepCost(board, man) != null, `${page.tab}: ${man.id} walked onto ground nobody crosses`);
          }
        }
      }
    }
  }],

  ['the scenes show what their pages say: seen on the red, a charge that goes off, a kill, the men out', async () => {
    const help = await loadJson('data/help.json');
    for (const { mission, map, rules } of await everyMission()) {
      const frames = (id) => framesOf(help, help.pages.find((p) => p.id === id), map, rules, mission.id);
      const seen = frames('seen');
      assert(seen.some((f) => f.men.some((m) => m.spotted)), `${mission.id}: nobody is seen on BEING SEEN`);
      assert(!seen.at(-1).men.some((m) => m.spotted), `${mission.id}: BEING SEEN ends with him still seen`);
      const charges = frames('charges');
      assert(charges.some((f) => f.charges.length && f.charges[0].fuse === rules.charges.fuseTurns), `${mission.id}: the charge is not set with tonight's fuse`);
      assert(charges.some((f) => f.objective.destroyed), `${mission.id}: the target never goes up`);
      const blast = charges.find((f) => f.blast);
      const inBlast = (m) => blast.blast.some((h) => h.q === m.q && h.r === m.r);
      assert(!blast.men.some(inBlast), `${mission.id}: the sapper is in his own blast`);
      assert(frames('fighting').at(-1).bodies.length === 1, `${mission.id}: no body after the kill`);
      assert(frames('out').at(-1).out === 3, `${mission.id}: not all three men get out`);
    }
  }],

  ['a mission\'s ground in the scenes is its own, and goes as the fields and woods do', async () => {
    const help = await loadJson('data/help.json');
    for (const { mission, map } of await everyMission()) {
      for (const [ch, id] of Object.entries({ ...help.legend, ...help.ground[mission.id] })) {
        const own = map.terrain[id], plain = map.terrain[help.legend[ch]];
        assert(own, `${mission.id}: ${ch} is ${id}, which terrain.json does not have`);
        assert(own.moveCost === plain.moveCost && own.blocksLOS === plain.blocksLOS, `${mission.id}: ${id} does not go as ${help.legend[ch]} does`);
      }
    }
  }],

  ['a scene\'s hex is read as a map\'s row is', () => {
    const h = sceneHex([3, 3]);
    assert(h.q === 2 && h.r === 3, `[3,3] read as ${h.q},${h.r}`);
  }],

  // Browser only: every page of every mission is drawn, with tonight's own counters.
  ...(typeof document === 'undefined' ? [] : [['every page of every mission draws, every frame', async () => {
    const { drawHelpScene } = await import('../src/render/board.js');
    const help = await loadJson('data/help.json');
    for (const { mission, map, rules, roster, traits } of await everyMission()) {
      const men = createUnits(roster, traits, rules);
      const enemies = createEnemies(map);
      const cast = {
        man: (role) => ({ unit: men.find((u) => u.role === role) ?? men[0], number: 1 }),
        enemy: (type) => enemies.find((e) => e.type === type) ?? enemies[0],
      };
      for (const page of help.pages.filter((p) => p.scene)) {
        const board = sceneMap(help, page, map.terrain, mission.id);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        for (const frame of framesOf(help, page, map, rules, mission.id)) {
          drawHelpScene(svg, board, frame, cast);
          assert(svg.querySelectorAll('polygon').length > 10, `${mission.id} ${page.tab}: no board drawn`);
          assert(svg.querySelectorAll('use').length >= frame.men.length + frame.enemies.length, `${mission.id} ${page.tab}: counters missing`);
        }
      }
    }
  }]]),
];
