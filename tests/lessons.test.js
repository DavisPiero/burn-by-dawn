// The lesson engine (M47, MISSION-TRAINING.md): a lesson's start is rebuilt
// from its data, only what a step lists is allowed, each step ends on its
// own condition, and going back is the state the step began from. The
// training mission's own lessons are played through here by the rules, so a
// lesson that cannot be passed fails a test, not a player.

import { dangerWash } from '../src/sight.js';
import { advance, allows, back, beginLesson, caughtOut, hold, lessonLandings, lessonStart, live, stepMet, stepStart, validateLessons } from '../src/lessons.js';
import { hexKey, loadJson, loadMap } from '../src/map.js';
import { missionById, missionEnemyTypes, missionRoster, missionRules, validateMissions } from '../src/missions.js';
import { callDiversion, chooseDropRun, createInitialState, endTurn, hideUnit, jump, killEnemy, knifeEnemy, moveUnit, packParachute, passCharge, pickUpCharge, placeCharge, selectUnit, setHover, stabiliseUnit, suppressEnemy, throwStone } from '../src/state.js';
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
          // By ending a turn out of sight, or (`does.call`) by the leader's radio.
          assert(man.inContact && allows(step, does.call ? { kind: 'action', id: 'diversion' } : { kind: 'endTurn' }), `${where}: he is in contact, and ${does.call ? 'the diversion may be called' : 'the turn may end'}`);
          state = does.call ? callDiversion(state, rules) : endTurn(state, rules, map);
        } else if (until.kind === 'dressed') {
          assert(allows(step, { kind: 'action', id: 'stabilise' }), `${where}: dressing a wound is allowed`);
          state = stabiliseUnit(state, does.unit, until.unit);
        } else if (until.kind === 'stoneThrown') {
          assert(allows(step, { kind: 'action', id: 'stone' }), `${where}: a stone is allowed`);
          // The mouse is where he clicked.
          state = setHover(throwStone(state, man.id, hex(does.at), map, rules), hex(does.at));
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
        } else if (until.kind === 'manOut') {
          // He walks out by the exfil hex the step allows.
          const to = hex(step.allow.move[0]);
          const plan = planMove(map, state.units, man, to, rules, state.enemies);
          assert(plan?.affordable, `${where}: ${man.shortName} can reach the way out at ${step.allow.move[0]} with ${man.ap} AP`);
          state = moveUnit(state, man.id, plan, map);
        } else if (until.kind === 'turnEnded') {
          assert(allows(step, { kind: 'endTurn' }), `${where}: ending the turn is allowed`);
          state = endTurn(state, rules, map);
        } else if (until.kind === 'packed') {
          assert(allows(step, { kind: 'action', id: 'pack' }), `${where}: packing is allowed`);
          state = packParachute(state, man.id, rules);
        } else if (until.kind === 'carrying') {
          // Handed it by the man `does.from` names, or picked up from his own hex.
          assert(allows(step, { kind: 'action', id: does.from ? 'pass' : 'pickUp' }), `${where}: ${does.from ? 'passing' : 'picking up'} is allowed`);
          state = does.from ? passCharge(state, does.from, until.unit, rules) : pickUpCharge(state, man.id, rules);
        } else if (until.kind === 'chargeSet') {
          assert(allows(step, { kind: 'action', id: 'charge' }) && allows(step, { kind: 'fuse', turns: step.allow.fuse }), `${where}: setting a charge is allowed, with its pencil`);
          state = placeCharge(state, man.id, rules, step.allow.fuse);
        } else if (until.kind === 'destroyed') {
          assert(allows(step, { kind: 'endTurn' }), `${where}: ending the turn is allowed`);
          // As many turns as its timers want, and no more than the longest pencil.
          for (let i = 0; i < 4 && !stepMet(step, from, state); i++) state = endTurn(state, rules, map);
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

  ['a step done and held: only what the next step asks for does anything, and it is NEXT', async () => {
    const { lessons, base, map, rules } = await course();
    const lesson = lessons.find((l) => l.id === 'the-knife');
    const start = lessonStart(base, lesson, map, rules);
    const begun = beginLesson(lesson, start);
    const move = { kind: 'move', to: { q: 2, r: 8 } };
    assert(live(lesson, begun, { kind: 'select', unitId: 'vance' }) && !live(lesson, begun, move), 'not yet done: what the step lists');
    const held = hold(begun);
    assert(live(lesson, held, move), 'done and held: the move the next step asks for');
    assert(!live(lesson, held, { kind: 'select', unitId: 'vance' }), 'a click on the man already picked does not turn the card');
    assert(!live(lesson, held, { kind: 'action', id: 'knife' }) && !live(lesson, held, { kind: 'endTurn' }), 'nor anything from a later step');
    // Picking a man is NEXT where picking him is the next step.
    const picks = { steps: [{ until: { kind: 'acknowledged' } }, { allow: { select: ['fitch'] }, until: { kind: 'selected', unit: 'fitch' } }] };
    assert(live(picks, hold({ step: 0, starts: [start] }), { kind: 'select', unitId: 'fitch' }), 'picking him, where the next step is to pick him');
    const last = hold(advance(advance(advance(begun, lesson, start), lesson, start), lesson, start));
    assert(last.step === lesson.steps.length - 1 && !live(lesson, last, { kind: 'action', id: 'knife' }), 'the last step held leads only to PASSED');
    assert(!live(lesson, advance(last, lesson, start), move), 'and a lesson passed does nothing');
  }],

  ['charges: a canister is a pile of charges, its weight is as the lesson says, and the two timers make one bang', async () => {
    const { lessons, base, map, rules, json, known } = await course();
    // Lesson 10: the canister, the weight on a man who did not jump with one, the pass.
    const ten = lessons.find((l) => l.id === 'charges-fetch-and-carry');
    let s = lessonStart(base, ten, map, rules);
    assert(s.canisters.length === 1 && s.droppedCharges.filter((c) => c.q === 3 && c.r === 3).length === 2, 'one canister, of two charges');
    assert(s.units.find((u) => u.id === 'fitch').charges === 0, 'the sapper starts with none, as it says of him');
    s = moveUnit(s, 'barrow', planMove(map, s.units, s.units.find((u) => u.id === 'barrow'), { q: 3, r: 3 }, rules, s.enemies), map);
    s = pickUpCharge(s, 'barrow', rules);
    const barrow = s.units.find((u) => u.id === 'barrow');
    assert(barrow.charges === 1 && barrow.ap === 1 && barrow.apMax === 3, `picked up: 1 AP left, and a pool a point short: ${barrow.ap} of ${barrow.apMax}`);
    assert(s.canisters.length === 1 && s.droppedCharges.length === 1, 'the canister is still there with one in it');
    assert(passCharge(s, 'barrow', 'fitch', rules) === s, 'a pass is 2 AP, and he has 1');
    s = endTurn(s, rules, map);
    assert(s.units.find((u) => u.id === 'barrow').ap === 3, 'the next turn he has 3, not 4');
    s = passCharge(s, 'barrow', 'fitch', rules);
    const fitch = s.units.find((u) => u.id === 'fitch');
    assert(fitch.charges === 1 && fitch.ap === fitch.apMax && fitch.apMax === 3 && s.units.find((u) => u.id === 'barrow').ap === 1, 'passed: 2 AP from the giver, nothing from the taker, no weight on a sapper');
    assert(endTurn(s, rules, map).units.find((u) => u.id === 'barrow').ap === 4, 'and Barrow has his 4 AP again');
    // Lesson 11: he walks onto the point; the pencil a step names is the only one; both go off at the end of turn 4, as one explosion.
    const eleven = lessons.find((l) => l.id === 'charges-set-and-get-clear');
    const first = eleven.steps.find((x) => x.until.kind === 'chargeSet');
    assert(allows(first, { kind: 'fuse', turns: 4 }) && !allows(first, { kind: 'fuse', turns: 2 }) && allows({}, { kind: 'fuse', turns: 9 }), 'the pencil it names, or any where it names none');
    let b = lessonStart(base, eleven, map, rules);
    const walk = (to) => moveUnit(b, 'nunn', planMove(map, b.units, b.units.find((u) => u.id === 'nunn'), to, rules, b.enemies), map);
    const nunn = () => b.units.find((u) => u.id === 'nunn');
    assert(placeCharge(b, 'nunn', rules, 4) === b, 'no charge is set off a charge point');
    b = walk({ q: 7, r: 5 });
    b = placeCharge(b, 'nunn', rules, 4);
    assert(b.charges.length === 1 && nunn().ap === 1, 'onto the point and a charge set: 1 AP left, as it says');
    b = endTurn(b, rules, map);
    b = pickUpCharge(walk({ q: 6, r: 7 }), 'nunn', rules);
    assert(nunn().ap === 0 && nunn().charges === 1, 'the other point and the pick-up are his whole turn');
    b = placeCharge(endTurn(b, rules, map), 'nunn', rules, 2);
    assert(b.charges.length === 2 && b.turn === 3 && nunn().ap === 2, 'two charges burning in turn 3, and 2 AP to get clear with');
    const stayed = endTurn(endTurn(b, rules, map), rules, map);
    assert(/NUNN would be dead/.test(caughtOut({}, b, stayed) ?? ''), 'a man who stays on his charge is whistled');
    b = endTurn(walk({ q: 4, r: 7 }), rules, map);
    assert(b.turn === 4 && !b.objectives[0].destroyed, 'not before turn 4 ends');
    const bang = endTurn(b, rules, map);
    assert(bang.objectives[0].destroyed && bang.alert.points === b.alert.points + 3 && bang.units.find((u) => u.id === 'nunn').hits === 0, `the bridge is down, 3 alert, Nunn unhurt: alert ${bang.alert.points}`);
    const broken = (change) => {
      const copy = JSON.parse(JSON.stringify(json));
      change(copy.lessons.find((l) => l.id === ten.id));
      return throws(() => validateLessons(copy, known));
    };
    assert(broken((l) => { l.start.canisters[0].at = [99, 99]; }) && broken((l) => { l.start.canisters[0].charges = 0; }), 'a canister off the map, or empty, is refused');
  }],

  ['lessons 12 to 16: the orders and the radio, two skills, the way out, the dial, a wound dressed, each as its card says', async () => {
    const { lessons, base, map, rules } = await course();
    const by = (id) => lessons.find((l) => l.id === id);
    const of = (s, id) => s.units.find((u) => u.id === id);
    const walk = (s, id, to) => moveUnit(s, id, planMove(map, s.units, of(s, id), hex(to), rules, s.enemies), map);
    const washAt = (s, id, [q, r]) => dangerWash(map, rules, s, of(s, id), reachableFor(map, s.units, of(s, id), rules, s.enemies)).get(hexKey(q, r));
    const stateOf = (s) => rules.alert.states.filter((x) => x.from <= s.alert.points).pop().id;
    // Lesson 12: 3 hexes off he has no orders; beside Dutch at the turn's start, 2 AP more. Seen, then the radio.
    let s = lessonStart(base, by('the-leader'), map, rules);
    assert(of(s, 'fitch').ap === 3 && of(s, 'holloway').ap === 3, 'three hexes apart: nobody has orders');
    s = walk(s, 'holloway', [2, 8]);
    assert(of(s, 'holloway').ap === 0 && of(s, 'fitch').ap === 3, 'orders are not given mid-turn');
    s = endTurn(s, rules, map);
    assert(of(s, 'fitch').ap === 5 && of(s, 'fitch').inContact && !of(s, 'holloway').inContact && stateOf(s) === 'suspicious', `Fitch has 5 AP and is seen, Dutch is not, the dial Suspicious: ${of(s, 'fitch').ap}, ${stateOf(s)}`);
    const called = callDiversion(s, rules);
    assert(!of(called, 'fitch').inContact && stateOf(called) === 'calm' && of(called, 'fitch').ap === 5, 'the radio: out of contact, Calm, and no AP spent');
    assert(callDiversion(called, rules) === called, 'once only');
    // Lesson 13: Quick Work sets a charge for nothing; the ringed hex is red for Fitch and not for Vance.
    const men = by('the-men');
    const ring = men.steps.find((x) => x.until.kind === 'hovered').until.hexes[0];
    s = placeCharge(lessonStart(base, men, map, rules), 'fitch', rules, 4);
    assert(s.charges.length === 1 && of(s, 'fitch').ap === 3, 'Fitch sets his charge and has all 3 AP');
    assert(washAt(s, 'fitch', ring) === 'spotted' && washAt(s, 'vance', ring) === null, `red for Fitch, not for Vance: ${washAt(s, 'fitch', ring)}, ${washAt(s, 'vance', ring)}`);
    const there = walk(s, 'vance', ring);
    assert(of(there, 'vance').ap === 2 && endTurn(there, rules, map).units.every((u) => !u.inContact), 'Vance stands there with 2 AP left, and nobody is seen');
    assert(of(endTurn(walk(s, 'fitch', ring), rules, map), 'fitch').inContact, 'and Fitch would have been');
    // Lesson 14: the lane to the gate is his turn's walk, and he is out.
    s = lessonStart(base, by('getting-out'), map, rules);
    assert(of(walk(s, 'barrow', [0, 12]), 'barrow').out && !walk(s, 'barrow', [0, 12]).outcome, 'out by the gate, and an exercise is not settled by it');
    // Lesson 15: one stone makes Calm Suspicious, and the hex 4 off is then red; the umpire has not turned.
    const dial = by('the-alert');
    const road = dial.steps.find((x) => x.until.kind === 'hovered').until.hexes[0];
    s = lessonStart(base, dial, map, rules);
    assert(stateOf(s) === 'calm' && washAt(s, 'nunn', road) === null, 'Calm, and the road 4 hexes off is not red');
    const thrown = throwStone(s, 'nunn', hex(dial.steps.find((x) => x.until.kind === 'stoneThrown').does.at), map, rules);
    assert(stateOf(thrown) === 'suspicious' && washAt(thrown, 'nunn', road) === 'spotted' && thrown.enemies[0].facing === s.enemies[0].facing, 'Suspicious, the road red, the umpire out of earshot of the stone');
    assert(rules.alert.quietTurnsToDecay === 4 && rules.explosionFloor === 'suspicious', 'and it drops as the last card says');
    // Lesson 16: 1 AP wounded; dressing him is Barrow's whole turn; his pool is back the turn after.
    s = lessonStart(base, by('a-wounded-man'), map, rules);
    assert(of(s, 'nunn').ap === 1 && of(s, 'barrow').ap === 4, 'a wounded man has 1 AP');
    s = stabiliseUnit(s, 'barrow', 'nunn');
    assert(of(s, 'barrow').ap === 0 && stepMet({ until: { kind: 'dressed', unit: 'nunn' } }, s, s) && !stepMet({ until: { kind: 'dressed', unit: 'barrow' } }, s, s), 'dressed, for all of Barrow\'s AP');
    assert(of(endTurn(s, rules, map), 'nunn').ap === 3 && of(endTurn(s, rules, map), 'nunn').hits === 1, 'his 3 AP back, and still one hit from death');
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
