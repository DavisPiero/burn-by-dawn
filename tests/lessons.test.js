// The lesson engine (M47, MISSION-TRAINING.md): a lesson's start is rebuilt
// from its data, only what a step lists is allowed, each step ends on its
// own condition, and going back is the state the step began from. The
// training mission's own lessons are played through here by the rules, so a
// lesson that cannot be passed fails a test, not a player.

import { dangerWash } from '../src/sight.js';
import { advance, allows, back, beginLesson, caughtOut, hold, lessonLandings, lessonStart, stepMet, stepStart, validateLessons } from '../src/lessons.js';
import { hexKey, loadJson, loadMap } from '../src/map.js';
import { missionById, missionEnemyTypes, missionRoster, missionRules, validateMissions } from '../src/missions.js';
import { chooseDropRun, createInitialState, endTurn, hideUnit, jump, killEnemy, knifeEnemy, moveUnit, packParachute, selectUnit, setHover, suppressEnemy, throwStone } from '../src/state.js';
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
      change(copy.lessons.find((l) => l.id === 'action-points'));
      return throws(() => validateLessons(copy, known));
    };
    assert(broken((l) => { l.start.men = { nobody: { at: [0, 0] } }; }), 'a man who is not in the roster');
    assert(broken((l) => { l.start.men.holloway.at = [99, 99]; }), 'a hex off the map');
    assert(broken((l) => { l.steps[0].until = { kind: 'danced' }; }), 'a condition that is not in the list');
    assert(broken((l) => { l.steps[0].allow = { actions: ['fly'] }; }), 'an action that does not exist');
    assert(broken((l) => { l.steps[0].say = 'THIS PEN LINE HAS FAR TOO MANY WORDS IN IT'; }), 'a pen line longer than seven words');
    assert(broken((l) => { l.steps = []; }), 'a lesson with no steps');
  }],

  ['the lessons built so far run on from one another, in order', async () => {
    const { lessons } = await course();
    const numbers = lessons.map((l) => l.number);
    assert(numbers.every((n, i) => i === 0 || n === numbers[i - 1] + 1), `PASSED leads to the next number, with none skipped: ${numbers}`);
  }],

  ['a lesson begins with only its own men and garrison on the board, in play', async () => {
    const { lessons, base, map, rules } = await course();
    for (const lesson of lessons) {
      const s = lessonStart(base, lesson, map, rules);
      // A lesson that starts in the drop (M48b): nobody down, its own men to jump.
      if (lesson.start.drop) {
        assert(s.phase === 'drop' && s.dropRunId === null && s.units.every((u) => !u.landed), `${lesson.id}: in the drop, nobody down`);
        assert(s.units.map((u) => u.id).sort().join() === Object.keys(lesson.start.drop.landings).sort().join(), `${lesson.id}: the men it lands are the men who jump`);
        continue;
      }
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
        const man = state.units.find((u) => u.id === (until.unit ?? step.does?.unit ?? state.selectedUnitId));
        // What a step's test does where its condition does not say: `does` in
        // the lessons file ({ unit, enemy, at }), read only here.
        const does = step.does ?? {};
        if (until.kind === 'runPicked') {
          assert(allows(step, { kind: 'run', runId: lesson.start.drop.run }) && !allows(step, { kind: 'jump' }), `${where}: the run may be picked, and nobody jumps yet`);
          state = chooseDropRun(state, map, lesson.start.drop.run);
        } else if (until.kind === 'landed') {
          assert(allows(step, { kind: 'jump' }), `${where}: jumping is allowed`);
          state = jump(state, map, rules, lessonLandings(lesson));
          for (const [id, at] of Object.entries(lesson.start.drop.landings)) {
            const u = state.units.find((x) => x.id === id);
            assert(u.landed && u.q === at[0] && u.r === at[1] && u.hits === 0 && u.turnsLost === 0 && u.ap === u.apMax, `${where}: ${id} is down at ${at}, unhurt, with his whole pool`);
          }
          assert(state.parachutes.length === Object.keys(lesson.start.drop.landings).length, `${where}: each on his parachute`);
        } else if (until.kind === 'acknowledged') {
          assert(!stepMet(step, from, state) && stepMet(step, from, state, { acknowledged: true }), `${where}: NEXT is what ends it`);
          progress = advance(progress, lesson, state);
          continue;
        } else if (until.kind === 'contactBroken') {
          assert(man.inContact && allows(step, { kind: 'endTurn' }), `${where}: he is in contact, and the turn may end`);
          state = endTurn(state, rules, map);
        } else if (until.kind === 'stoneThrown') {
          assert(allows(step, { kind: 'action', id: 'stone' }), `${where}: a stone is allowed`);
          state = throwStone(state, man.id, hex(does.at), map, rules);
        } else if (until.kind === 'suppressed') {
          assert(allows(step, { kind: 'action', id: 'suppress' }), `${where}: suppressing is allowed`);
          state = suppressEnemy(state, man.id, until.enemy, map, rules);
        } else if (until.kind === 'enemyDown') {
          const how = does.how ?? 'knife';
          assert(allows(step, { kind: 'action', id: how }), `${where}: the ${how} is allowed`);
          state = how === 'knife' ? knifeEnemy(state, man.id, until.enemy, rules) : killEnemy(state, man.id, until.enemy, map, rules);
        } else if (until.kind === 'selected') {
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
        } else if (until.kind === 'packed') {
          assert(allows(step, { kind: 'action', id: 'pack' }), `${where}: packing is allowed`);
          state = packParachute(state, man.id, rules);
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

  ['a lesson may start in the drop, and lands each man where it says with nothing rolled', async () => {
    const { lessons, base, map, rules, json, known } = await course();
    const lesson = lessons.find((l) => l.start.drop);
    assert(lesson?.number === 1, 'lesson 1 is the drop');
    const start = lessonStart(base, lesson, map, rules);
    const down = (seed) => jump(chooseDropRun({ ...start, seed }, map, lesson.start.drop.run), map, rules, lessonLandings(lesson)).units.map((u) => `${u.id}:${u.q},${u.r}`).join();
    assert(down(1) === down(977), 'the same landing on any seed');
    assert(lessonLandings(lessons.find((l) => !l.start.drop)) === null, 'no other lesson lands anyone');
    assert(!allows(lesson.steps[0], { kind: 'jump' }) && allows(lesson.steps[1], { kind: 'jump' }), 'nobody jumps until the step that asks');
    const broken = (change) => {
      const copy = JSON.parse(JSON.stringify(json));
      change(copy.lessons.find((l) => l.id === lesson.id));
      return throws(() => validateLessons(copy, known));
    };
    assert(broken((l) => { l.start.drop.run = 'nowhere'; }), 'a run the map does not have');
    assert(broken((l) => { l.start.men = { fitch: { at: [0, 0] } }; }), 'men placed as well as landed');
    assert(broken((l) => { l.steps[2].point = 'ceiling'; }), 'a part of the page that is not in the list');
    assert(broken((l) => { l.steps[0].until = { kind: 'enemyDown', enemy: 'nobody' }; }), 'an enemy the lesson does not have');
  }],

  ['a step done is held until NEXT, and Back from it is the same step again', async () => {
    const { lessons, base, map, rules, json, known } = await course();
    const lesson = lessons.find((l) => l.id === 'action-points');
    const start = lessonStart(base, lesson, map, rules);
    const begun = beginLesson(lesson, start);
    const held = hold(begun);
    assert(held.met && held.step === 0 && stepStart(held) === start, 'held on the step it was, with its start kept');
    assert(back(held).step === 0 && !back(held).met, 'Back from a step done is that step, to do again');
    const on = advance(held, lesson, selectUnit(start, 'holloway'));
    assert(on.step === 1 && !on.met, 'NEXT is the next step, not yet done');
    assert(back(on).step === 0 && !back(on).met, 'and Back from a step not yet done is the one before');
    for (const l of lessons) for (const [n, step] of l.steps.entries()) {
      assert(step.until.kind === 'acknowledged' || step.then, `${l.id}, step ${n + 1} says what is to be seen once it is done`);
    }
    const copy = JSON.parse(JSON.stringify(json));
    delete copy.lessons[1].steps[0].then;
    assert(throws(() => validateLessons(copy, known)), 'a step with nothing to say once done is refused');
  }],

  ['the three ways to fight: the knife wants a turn unspent, and firing back keeps a man from being shot', async () => {
    const { lessons, base, map, rules } = await course();
    // Lesson 7: he cannot knife in the turn he moved in, and can in the next.
    const knife = lessons.find((l) => l.id === 'the-knife');
    let k = lessonStart(base, knife, map, rules);
    const vance = k.units.find((u) => u.id === 'vance');
    k = moveUnit(k, 'vance', planMove(map, k.units, vance, { q: 2, r: 8 }, rules, k.enemies), map);
    assert(k.units.find((u) => u.id === 'vance').ap === vance.apMax - 2, 'the hedge cost him 2, as it says');
    assert(knifeEnemy(k, 'vance', 'umpire', rules) === k, 'no knife in the turn he spent AP');
    k = endTurn(k, rules, map);
    assert(!k.units.find((u) => u.id === 'vance').inContact && knifeEnemy(k, 'vance', 'umpire', rules).enemies.length === 0, 'unseen, and the next turn he can');
    // Lesson 9: seen as the first turn ends, shot at the second unless he fires back.
    const lesson = lessons.find((l) => l.id === 'firing-back');
    let s = endTurn(lessonStart(base, lesson, map, rules), rules, map);
    assert(s.units.find((u) => u.id === 'fitch').inContact && s.units.find((u) => u.id === 'fitch').hits === 0, 'Fitch is seen, and not yet shot');
    const unanswered = endTurn(s, rules, map);
    assert(unanswered.units.find((u) => u.id === 'fitch').hits === 1, 'left alone, he is shot');
    const fired = suppressEnemy(s, 'fitch', 'umpire', map, rules);
    assert(fired !== s && fired.units.find((u) => u.id === 'fitch').ap === 1 && fired.alert.points === s.alert.points + 2, 'firing back is 2 AP and 2 alert, as it says');
    const after = endTurn(fired, rules, map);
    const fitch = after.units.find((u) => u.id === 'fitch');
    assert(fitch.hits === 0 && !fitch.inContact, 'and he is not shot, and out of contact');
  }],

  ['an aimed action lands only where a step says, if it says', async () => {
    const step = { allow: { actions: ['stone'], target: [[13, 6]] } };
    assert(allows(step, { kind: 'target', at: { q: 13, r: 6 } }) && !allows(step, { kind: 'target', at: { q: 12, r: 6 } }), 'the hex it names');
    assert(allows({ allow: { actions: ['stone'] } }, { kind: 'target', at: { q: 0, r: 0 } }), 'anywhere, where it names none');
  }],

  ['what the lessons say of the ground is so: the stone opens the red hex, and the hedge breaks contact', async () => {
    const { lessons, base, map, rules } = await course();
    const washAt = (state, id, [q, r]) => {
      const man = state.units.find((u) => u.id === id);
      return dangerWash(map, rules, state, man, reachableFor(map, state.units, man, rules, state.enemies)).get(hexKey(q, r));
    };
    // Lesson 6: the ringed hex is red until the stone lands behind the sentry.
    const six = lessons.find((l) => l.id === 'watching-the-garrison');
    const start = lessonStart(base, six, map, rules);
    const stone = six.steps.find((s) => s.until.kind === 'stoneThrown');
    const goal = six.steps.find((s) => s.until.kind === 'movedTo').until.hexes[0];
    assert(washAt(start, 'nunn', goal) === 'spotted', `the hex it calls red is red: ${washAt(start, 'nunn', goal)}`);
    const thrown = throwStone(start, 'nunn', hex(stone.does.at), map, rules);
    assert(thrown.alert.points === start.alert.points + 1 && thrown.units.find((u) => u.id === 'nunn').ap === 2, 'a stone is 1 AP and 1 alert, as it says');
    assert(washAt(thrown, 'nunn', goal) !== 'spotted', 'and is not once the sentry has turned to the stone');
    const patrol = start.enemies.find((e) => e.id === 'umpire-patrol');
    assert(Math.abs(patrol.q - stone.does.at[0]) > rules.noise.stone + 1, 'the patrol is out of earshot of it');
    // He ends the turn there unseen, and the sentry goes back to his post.
    const there = moveUnit(thrown, 'nunn', planMove(map, thrown.units, thrown.units.find((u) => u.id === 'nunn'), hex(goal), rules, thrown.enemies), map);
    const after = endTurn(there, rules, map);
    assert(!after.units.find((u) => u.id === 'nunn').inContact, 'unseen while the sentry looks at the stone');
    assert(after.enemies.find((e) => e.id === 'umpire-post').facing === start.enemies.find((e) => e.id === 'umpire-post').facing, 'and the sentry is back to his post after it');
    // Lesson 5: seen on the red ground, he is in contact and the hedge is green.
    const five = lessons.find((l) => l.id === 'not-being-seen');
    let s = lessonStart(base, five, map, rules);
    s = moveUnit(s, 'fitch', planMove(map, s.units, s.units.find((u) => u.id === 'fitch'), { q: 3, r: 8 }, rules, s.enemies), map);
    s = endTurn(s, rules, map);
    const fitch = s.units.find((u) => u.id === 'fitch');
    assert(fitch.inContact && fitch.hits === 0 && s.alert.points === 1, 'seen: in contact, unhurt, the alert up by 1');
    assert(washAt(s, 'fitch', [2, 8]) === 'clear', `the hedge is green, where contact breaks: ${washAt(s, 'fitch', [2, 8])}`);
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
