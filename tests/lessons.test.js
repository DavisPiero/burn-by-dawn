// The lesson engine (M47, MISSION-TRAINING.md): a lesson's start is rebuilt
// from its data, only what a step lists is allowed, each step ends on its
// own condition, and going back is the state the step began from. The
// training mission's own lessons are played through here by the rules, so a
// lesson that cannot be passed fails a test, not a player.

import { dangerWash } from '../src/sight.js';
import { advance, allows, back, beginLesson, caughtOut, lessonStart, stepMet, stepStart, validateLessons } from '../src/lessons.js';
import { hexKey, loadJson, loadMap } from '../src/map.js';
import { missionById, missionEnemyTypes, missionRoster, missionRules, validateMissions } from '../src/missions.js';
import { createInitialState, endTurn, hideUnit, moveUnit, selectUnit, setHover } from '../src/state.js';
import { validateTraits } from '../src/traits.js';
import { planMove, reachableFor } from '../src/units.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const ACTIONS = ['hide', 'suppress', 'knife', 'kill', 'stone', 'stabilise', 'signal', 'pack', 'pickUp', 'pass', 'charge', 'cut', 'swim', 'diversion'];

async function course() {
  const missions = validateMissions(await loadJson('data/missions.json'));
  const mission = missionById(missions, 'training');
  const map = await loadMap(mission.map, undefined, undefined, (types) => missionEnemyTypes(mission, types));
  const rules = missionRules(mission, await loadJson('data/rules.json'));
  const roster = missionRoster(mission, await loadJson(mission.roster));
  const base = createInitialState(roster, validateTraits(await loadJson('data/traits.json')), rules, map, 1);
  const known = { map, unitIds: base.units.map((u) => u.id), objectiveIds: base.objectives.map((o) => o.id), actionIds: ACTIONS };
  const json = validateLessons(await loadJson(mission.lessons), known, mission.lessons);
  return { mission, map, rules, base, known, lessons: json.lessons, json };
}

const hex = ([q, r]) => ({ q, r });
const throws = (fn) => { try { fn(); } catch { return true; } return false; };

export default [
  ['only a mission that names a lessons file has lessons', async () => {
    const missions = validateMissions(await loadJson('data/missions.json'));
    const withLessons = missions.missions.filter((m) => m.lessons).map((m) => m.id);
    assert(withLessons.join() === 'training', `lessons are off everywhere else: ${withLessons}`);
    assert(missionById(missions, 'training').status === 'draft', 'the training mission is a draft until the course is built (M48)');
  }],

  ['a lessons file is checked against the map and the men, and says what is wrong', async () => {
    const { json, known } = await course();
    const broken = (change) => {
      const copy = JSON.parse(JSON.stringify(json));
      change(copy.lessons[0]);
      return throws(() => validateLessons(copy, known));
    };
    assert(broken((l) => { l.start.men = { nobody: { at: [0, 0] } }; }), 'a man who is not in the roster');
    assert(broken((l) => { l.start.men.holloway.at = [99, 99]; }), 'a hex off the map');
    assert(broken((l) => { l.steps[0].until = { kind: 'danced' }; }), 'a condition that is not in the list');
    assert(broken((l) => { l.steps[0].allow = { actions: ['fly'] }; }), 'an action that does not exist');
    assert(broken((l) => { l.steps[0].say = 'THIS PEN LINE HAS FAR TOO MANY WORDS IN IT'; }), 'a pen line longer than seven words');
    assert(broken((l) => { l.steps = []; }), 'a lesson with no steps');
  }],

  ['a lesson begins with only its own men and garrison on the board, in play', async () => {
    const { lessons, base, map, rules } = await course();
    for (const lesson of lessons) {
      const s = lessonStart(base, lesson, map, rules);
      const on = s.units.filter((u) => u.landed).map((u) => u.id).sort().join();
      assert(on === Object.keys(lesson.start.men).sort().join(), `${lesson.id}: on the board ${on}`);
      for (const [id, m] of Object.entries(lesson.start.men)) {
        const u = s.units.find((x) => x.id === id);
        assert(u.q === m.at[0] && u.r === m.at[1] && u.ap === u.apMax && u.ap > 0, `${lesson.id}: ${id} where it says, with a full pool`);
      }
      assert(s.phase === 'play' && s.enemies.length === (lesson.start.enemies ?? []).length, `${lesson.id}: in play, with its own garrison`);
      assert(s.enemies.every((e) => !base.enemies.some((b) => b.id === e.id)), `${lesson.id}: the map's own enemies are not on`);
    }
    assert(base.phase === 'drop' && base.units.every((u) => !u.landed), 'the state it was built on is untouched');
  }],

  ['only what a step lists is allowed', async () => {
    const step = { allow: { select: ['fitch'], move: [[2, 3]], actions: ['hide'] } };
    assert(allows(step, { kind: 'select', unitId: 'fitch' }) && !allows(step, { kind: 'select', unitId: 'vance' }), 'the man it names');
    assert(allows(step, { kind: 'move', to: { q: 2, r: 3 } }) && !allows(step, { kind: 'move', to: { q: 2, r: 4 } }), 'the hex it names');
    assert(allows(step, { kind: 'action', id: 'hide' }) && !allows(step, { kind: 'action', id: 'stone' }), 'the action it names');
    assert(!allows(step, { kind: 'endTurn' }) && allows({ allow: { endTurn: true } }, { kind: 'endTurn' }), 'the turn ends only where it says');
    assert(allows({ allow: { move: 'any', select: true } }, { kind: 'move', to: { q: 9, r: 9 } }), '"any" is anywhere');
    assert(!allows({}, { kind: 'select', unitId: 'fitch' }), 'a step that lists nothing allows nothing');
  }],

  ['every lesson of the course can be passed by doing what each step asks', async () => {
    const { lessons, base, map, rules } = await course();
    for (const lesson of lessons) {
      let state = lessonStart(base, lesson, map, rules);
      let progress = beginLesson(lesson, state);
      for (const [n, step] of lesson.steps.entries()) {
        const where = `${lesson.id}, step ${n + 1}`;
        const from = stepStart(progress);
        assert(!stepMet(step, from, state), `${where} is not met before it is done`);
        const { until } = step;
        const man = state.units.find((u) => u.id === (until.unit ?? state.selectedUnitId));
        if (until.kind === 'selected') {
          assert(allows(step, { kind: 'select', unitId: until.unit }), `${where}: selecting him is allowed`);
          state = selectUnit(state, until.unit);
        } else if (until.kind === 'hovered') {
          state = setHover(state, hex(until.hexes[0]));
        } else if (until.kind === 'movedTo') {
          const to = hex(until.hexes[0]);
          assert(allows(step, { kind: 'move', to }), `${where}: the move is allowed`);
          const plan = planMove(map, state.units, man, to, rules, state.enemies);
          assert(plan?.affordable, `${where}: ${man.shortName} can reach ${until.hexes[0]} with ${man.ap} AP`);
          state = moveUnit(state, man.id, plan, map);
        } else if (until.kind === 'turnEnded') {
          assert(allows(step, { kind: 'endTurn' }), `${where}: ending the turn is allowed`);
          state = endTurn(state, rules, map);
        } else if (until.kind === 'hidden') {
          assert(allows(step, { kind: 'action', id: 'hide' }), `${where}: hiding is allowed`);
          state = hideUnit(state, man.id, rules);
        } else {
          throw new Error(`${where}: this test does not know how to do "${until.kind}"`);
        }
        assert(caughtOut(step, from, state) === null, `${where}: doing it right is not caught out: ${caughtOut(step, from, state)}`);
        assert(stepMet(step, from, state), `${where} is met once it is done`);
        progress = advance(progress, lesson, state);
      }
      assert(progress.done, `${lesson.id} is passed after its last step`);
    }
  }],

  ['the umpire whistles for a man seen, and the step is put back as it began', async () => {
    const { lessons, base, map, rules } = await course();
    const lesson = lessons.find((l) => l.id === 'not-being-seen');
    const start = lessonStart(base, lesson, map, rules);
    const fitch = start.units.find((u) => u.id === 'fitch');
    const wash = dangerWash(map, rules, start, fitch, reachableFor(map, start.units, fitch, rules, start.enemies));
    const shown = lesson.steps.find((s) => s.until.kind === 'hovered').until.hexes[0];
    assert(wash.get(hexKey(shown[0], shown[1])) === 'spotted', 'the hex the lesson calls red is red');
    const hedge = lesson.steps.find((s) => s.until.kind === 'movedTo').until.hexes[0];
    assert(wash.get(hexKey(hedge[0], hedge[1])) === null, 'and the hedge it sends him to is not');
    // Walk him onto the red ground and end the turn: he is seen.
    const step = lesson.steps.find((s) => s.allow?.move === 'any');
    let progress = advance(advance(beginLesson(lesson, start), lesson, start), lesson, start);
    const moved = moveUnit(start, 'fitch', planMove(map, start.units, fitch, hex(shown), rules, start.enemies), map);
    assert(caughtOut(step, stepStart(progress), moved) === null, 'not caught until the garrison has looked');
    const after = endTurn(moved, rules, map);
    assert(/FITCH was seen/.test(caughtOut(step, stepStart(progress), after) ?? ''), `the whistle says who: ${caughtOut(step, stepStart(progress), after)}`);
    assert(caughtOut({ ...step, mayBeSeen: true }, stepStart(progress), after) === null, 'unless being seen is the lesson');
    assert(stepStart(progress) === start, 'and the step goes back to the state it began from');
    progress = back(progress);
    assert(progress.step === 1 && stepStart(progress) === start && back(back(progress)).step === 0, 'Back is the step before, as it began, and stops at the first');
  }],
];
