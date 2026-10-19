// The lesson engine (M47, MISSION-TRAINING.md): a lesson's start is rebuilt
// from its data, only what a step lists is allowed, each step ends on its
// own condition, and going back is the state the step began from. The
// training mission's own lessons are played through here by the rules, so a
// lesson that cannot be passed fails a test, not a player.

import { dangerWash } from '../src/sight.js';
import { advance, allows, back, beginLesson, caughtOut, hold, lessonLandings, lessonStart, live, qualifications, stepMet, stepStart, umpireSays, validateLessons } from '../src/lessons.js';
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
    const training = missionById(missions, 'training');
    assert(training.status === 'playable' && missions.missions[0].id === 'training', 'the course is playable and first on the contents page');
    assert(missions.missions.every((m) => m.flag === undefined), 'no START HERE: the operator took it out (M60b)');
    // Its garrison is umpires: a drawn kit, a folder for the paintings, and English cries.
    assert(training.enemyKit === 'umpire' && training.enemyChips === 'assets/enemies/umpire', 'umpires, drawn until painted');
    const cries = [...training.words.cries.spotted, ...training.words.cries.found];
    assert(cries.length >= 4 && !cries.some((c) => /ACHTUNG|HALT|ALARM|GOTT|WAS IST/.test(c)), `an umpire does not cry out in German: ${cries}`);
    const json = await loadJson('data/missions.json');
    for (const bad of [{ enemyKit: '' }]) {
      assert(throws(() => validateMissions({ ...json, missions: json.missions.map((m) => (m.id === 'training' ? { ...m, ...bad } : m)) })), `refused: ${JSON.stringify(bad)}`);
    }
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
    assert(broken((l) => { l.steps[0].show = 'nowhere'; }), 'a part of the page to light up that is not one');
    assert(!broken((l) => { l.steps[0].show = 'readout'; }), 'the box under the map lit up once a step is done');
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
        if (step.free) {
          // A free step (M48f): the playthrough its `does.script` gives, each thing allowed.
          if (until.kind === 'landed') {
            assert(allows(step, { kind: 'run', runId: lesson.start.drop.run }) && allows(step, { kind: 'jump' }), `${where}: the run and the jump are allowed`);
            state = jump(chooseDropRun(state, map, lesson.start.drop.run), map, rules, lessonLandings(lesson));
          }
          for (const op of does.script) {
            const before = state;
            if (op.move) {
              const [id, to] = op.move;
              assert(allows(step, { kind: 'select', unitId: id }) && allows(step, { kind: 'move', to: hex(to) }), `${where}: ${id} may be picked and moved`);
              const plan = planMove(map, state.units, state.units.find((u) => u.id === id), hex(to), rules, state.enemies);
              assert(plan?.affordable, `${where}: ${id} can reach ${to}`);
              state = moveUnit(state, id, plan, map);
            } else if (op.charge) {
              assert(allows(step, { kind: 'action', id: 'charge' }) && allows(step, { kind: 'fuse', turns: op.charge[1] }), `${where}: a charge may be set, with any pencil`);
              state = placeCharge(state, op.charge[0], rules, op.charge[1]);
            } else if (op.stone) {
              assert(allows(step, { kind: 'action', id: 'stone' }) && allows(step, { kind: 'target', at: hex(op.stone[1]) }), `${where}: a stone may be thrown anywhere`);
              state = throwStone(state, op.stone[0], hex(op.stone[1]), map, rules);
            } else if (op.end) {
              assert(allows(step, { kind: 'endTurn' }), `${where}: the turn may end`);
              state = endTurn(state, rules, map);
            }
            assert(state !== before, `${where}: ${JSON.stringify(op)} did something`);
            assert(caughtOut(step, from, state) === null, `${where}: ${JSON.stringify(op)} is not whistled: ${caughtOut(step, from, state)}`);
          }
          assert(stepMet(step, from, state), `${where} is met once its playthrough is done`);
          progress = advance(progress, lesson, state);
          continue;
        }
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
      assert(step.until.kind === 'acknowledged' || step.free || step.then, `${l.id}, step ${n + 1} says what is to be seen once it is done`);
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
    s = walk(s, 'holloway', [0, 8]);
    assert(of(s, 'fitch').ap === 3, 'orders are not given mid-turn');
    s = endTurn(s, rules, map);
    assert(of(s, 'fitch').ap === 5 && s.units.every((u) => !u.inContact), `beside Dutch at the turn's start Fitch has 5 AP, and nobody is seen yet: ${of(s, 'fitch').ap}`);
    const post = s.enemies[0].facing;
    assert(washAt(s, 'fitch', [4, 7]) === 'spotted', 'the hex it calls red is red');
    s = walk(s, 'fitch', [4, 7]);
    assert(of(s, 'fitch').ap === 1, '4 AP away, as it says: more than his own 3');
    s = endTurn(s, rules, map);
    assert(of(s, 'fitch').inContact && of(s, 'fitch').hits === 0 && !of(s, 'holloway').inContact && stateOf(s) === 'suspicious' && s.enemies[0].facing !== post, 'Fitch is seen, the umpire has turned to him, the dial Suspicious');
    const called = callDiversion(s, rules);
    assert(!of(called, 'fitch').inContact && stateOf(called) === 'calm' && called.enemies[0].facing === post && of(called, 'fitch').ap === of(s, 'fitch').ap, 'the radio: out of contact, Calm, the umpire turned back to his post, and no AP spent');
    assert(callDiversion(called, rules) === called, 'once only');
    // Lesson 13: Quick Work sets a charge for nothing; the ringed hex is red for Fitch and not for Vance.
    const men = by('the-men');
    const ring = men.steps.find((x) => x.until.kind === 'hovered').until.hexes[0];
    s = placeCharge(lessonStart(base, men, map, rules), 'fitch', rules, 4);
    assert(s.charges.length === 1 && of(s, 'fitch').ap === 3, 'Fitch sets his charge and has all 3 AP');
    assert(washAt(s, 'fitch', ring) === 'spotted' && washAt(s, 'vance', ring) === null, `red for Fitch, not for Vance: ${washAt(s, 'fitch', ring)}, ${washAt(s, 'vance', ring)}`);
    const there = walk(s, 'vance', ring);
    assert(of(there, 'vance').ap === 2 && endTurn(there, rules, map).units.every((u) => !u.inContact), 'Vance stands there with 2 AP left, and nobody is seen');
    // Standing there, not for the way he came: from Vance's own hex Barrow, the other scout, is seen there too.
    const asVance = lessonStart(base, { ...men, start: { ...men.start, men: { barrow: men.start.men.vance } } }, map, rules);
    assert(of(endTurn(walk(asVance, 'barrow', ring), rules, map), 'barrow').inContact, 'any man but Vance is seen on it, even the other scout');
    // Lesson 14: the lane to the gate is his turn's walk, and he is out.
    s = lessonStart(base, by('getting-out'), map, rules);
    assert(of(walk(s, 'barrow', [0, 12]), 'barrow').ap === 0 && of(walk(s, 'barrow', [0, 12]), 'barrow').out && !walk(s, 'barrow', [0, 12]).outcome, 'out by the gate, and an exercise is not settled by it');
    // Lesson 15: one stone makes Calm Suspicious, and the hex 4 off is then red; the umpire has not turned.
    const dial = by('the-alert');
    const road = dial.steps.find((x) => x.until.kind === 'hovered').until.hexes[0];
    s = lessonStart(base, dial, map, rules);
    assert(stateOf(s) === 'calm' && washAt(s, 'nunn', road) === null, 'Calm, and the grass 4 hexes off is not red');
    const thrown = throwStone(s, 'nunn', hex(dial.steps.find((x) => x.until.kind === 'stoneThrown').does.at), map, rules);
    assert(stateOf(thrown) === 'suspicious' && washAt(thrown, 'nunn', road) === 'spotted' && thrown.enemies[0].facing === s.enemies[0].facing, 'Suspicious, that grass red, the umpire out of earshot of the stone');
    assert(rules.alert.quietTurnsToDecay === 4 && rules.explosionFloor === 'suspicious', 'and it drops as the last card says');
    // Lesson 16: 1 AP wounded; dressing him is Barrow's whole turn; his pool is back the turn after.
    s = lessonStart(base, by('a-wounded-man'), map, rules);
    assert(of(s, 'nunn').ap === 1 && of(s, 'barrow').ap === 4, 'a wounded man has 1 AP');
    s = stabiliseUnit(s, 'barrow', 'nunn');
    assert(of(s, 'barrow').ap === 0 && stepMet({ until: { kind: 'dressed', unit: 'nunn' } }, s, s) && !stepMet({ until: { kind: 'dressed', unit: 'barrow' } }, s, s), 'dressed, for all of Barrow\'s AP');
    assert(of(endTurn(s, rules, map), 'nunn').ap === 3 && of(endTurn(s, rules, map), 'nunn').hits === 1, 'his 3 AP back, and still one hit from death');
  }],

  ['the passing-out exercise: free steps run on, the umpire says what it would cost on a real mission, and the record counts', async () => {
    const { lessons, base, map, rules, json, known } = await course();
    const last = lessons[lessons.length - 1];
    assert(last.number === 17 && last.steps.every((s) => s.free && s.mayBeSeen && !s.then), 'lesson 17 is free steps: no card between them, and being seen does not stop it');
    assert(last.steps[last.steps.length - 1].until.count === Object.keys(last.start.drop.landings).length, 'it ends with every man out');
    // M48g, the operator's: its name, and what its card claims of the bridge and its umpire.
    assert(last.title === 'Ready for Action' && last.qualification === 'PASSED OUT', 'named Ready for Action; the record still says PASSED OUT');
    const bridge = map.objectives.find((o) => o.id === 'dummy-bridge');
    const points = bridge.chargeHexes.map((h) => h.join()).sort().join(' ');
    const setting = last.steps.filter((x) => ['chargeSet', 'destroyed'].includes(x.until.kind));
    assert(rules.objectives[bridge.kind].chargesNeeded === 2 && setting.length === 2 && setting.every((x) => /TWO/.test(x.tell) && x.ring.map((h) => h.join()).sort().join(' ') === points), 'two charges, said on both cards, and both charge points ringed');
    for (const at of bridge.chargeHexes) {
      const stood = lessonStart(base, { ...last, start: { men: { fitch: { at } }, enemies: last.start.enemies } }, map, rules);
      assert(endTurn(stood, rules, map).units.find((u) => u.id === 'fitch').inContact, `the bridge umpire watches the charge point at ${at}, as the card says`);
    }
    const broken = (change) => {
      const copy = JSON.parse(JSON.stringify(json));
      change(copy.lessons.find((l) => l.id === last.id));
      return throws(() => validateLessons(copy, known));
    };
    assert(broken((l) => { l.steps[1].free = 'yes'; }) && broken((l) => { delete l.steps[1].free; }) && broken((l) => { l.steps[3].until.count = 0; }), 'a step with no `then` must be free, and a count is 1 or more');
    // So many men out.
    const outs = (n) => ({ units: base.units.map((u, i) => ({ ...u, out: i < n })) });
    assert(!stepMet({ until: { kind: 'manOut', count: 6 } }, base, outs(5)) && stepMet({ until: { kind: 'manOut', count: 6 } }, base, outs(6)) && stepMet({ until: { kind: 'manOut' } }, base, outs(1)), 'all six, where it says six; one, where it says none');
    // The umpire's words: seen is said and not whistled; shot is whistled, in a real mission's words.
    const free = { free: true, mayBeSeen: true };
    const five = lessons.find((l) => l.id === 'firing-back');
    const start = lessonStart(base, five, map, rules);
    const seen = endTurn(start, rules, map);
    assert(caughtOut(free, start, seen) === null, 'seen is not a whistle in a free step');
    const said = umpireSays(free, start, seen);
    assert(said.length === 1 && /FITCH HAS BEEN SEEN!/.test(said[0].head) && /real mission/.test(said[0].text), `the umpire says he was seen: ${JSON.stringify(said)}`);
    assert(umpireSays(free, seen, seen).length === 0 && umpireSays({}, start, seen).length === 0, 'once, and only in a free step');
    const shot = endTurn(seen, rules, map);
    assert(caughtOut(free, start, shot) === 'FITCH WOULD BE SHOT HERE ON A REAL MISSION!', `shot is whistled in a real mission's words: ${caughtOut(free, start, shot)}`);
    assert(caughtOut({ mayBeSeen: true }, start, shot) === 'FITCH was hit.', 'and in the old words in any other lesson');
    // A parachute found is said.
    const two = lessons.find((l) => l.id === 'parachutes');
    let p = lessonStart(base, two, map, rules);
    let found = [];
    for (let i = 0; i < 4 && !found.length; i++) { const next = endTurn(p, rules, map); found = umpireSays(free, p, next).filter((n) => /PARACHUTE/.test(n.head)); p = next; }
    assert(found.length === 1, 'a parachute left by the beat is found, and the umpire says so');
    // The clipboard: each qualification once, counted over its lessons.
    const none = qualifications(lessons, new Set());
    assert(none.length === 10 && none.every((r) => !r.done && r.passed === 0) && none.reduce((n, r) => n + r.of, 0) === lessons.length, `ten qualifications over seventeen lessons: ${none.map((r) => r.name)}`);
    const some = qualifications(lessons, new Set(['parachutes', 'the-drop']));
    assert(some.find((r) => r.name === 'PARACHUTIST').done && some.find((r) => r.name === 'FIELDCRAFT').passed === 1 && !some.find((r) => r.name === 'FIELDCRAFT').done, 'ticked only when every lesson that gives it is passed');
    assert(qualifications(lessons, new Set(lessons.map((l) => l.id))).every((r) => r.done), 'and all of them once the course is');
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
