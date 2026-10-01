// Balance bot for NIGHT DROP (SPEC.md §12 M8b). A developer tool, not part of
// the game: the game never loads it, and it is the one thing in the repo that
// needs Node. It plays whole missions through the game's own pure rule
// functions, headless, with the /data fetches read from disk, over many seeds
// and every drop run, and prints win rates and why the rest were lost.
//
//   node tools/balance-bot.mjs [seeds=100] [style=naive] [--json]
//
// Styles: careful (weighs every reachable hex by the readout's risk), naive (a
// first-timer: only a few hexes along the obvious route), and the same with
// `fight` (gunners suppress and kill) or `greedy` (secondaries too):
// careful, fight, greedy, greedyfight, naive, naivegreedy, naivefight.
//
// Try a balance change without editing /data: RULES_PATCH, ENEMIES_PATCH and
// MAP_PATCH take JSON deep-merged over that file (arrays are replaced whole),
// e.g. RULES_PATCH='{"turnLimit":16}' node tools/balance-bot.mjs 200 naive
//
// MISSION_PATCH does the same for the mission's entry in missions.json (M30),
// e.g. MISSION_PATCH='{"levels":{"hard":{"rules":{"objectives":{"bowser":{"reinforcements":2}}}}}}'
//
// RUN=<id> plays only that drop run, for trying a change to one run quickly.
//
// DIFFICULTY=<id> plays at a level from data/difficulty.json, as the game
// does: its patches over the files (and over any *_PATCH above).
//
// MISSION=<id> plays a playable mission from data/missions.json (M27), as
// ?mission= does in the game; the default one otherwise. Its patches go over
// the files first, then the level's, then the mission's own part of the level.
// The bot's plan aims at the win condition's targets (M28): France's primary,
// or the nearest of many where any few will do.
//
// KNIFE=1 has every man knife an enemy he finds himself behind (M12b); the
// bot never goes looking for one. Without it the bot never uses the knife.
//
// PACK=1 has every man pack the parachute he landed on, first thing on turn 1.
// Without it the bot never packs, so `chutes found` is what packing would save.
//
// The `hunter` style (M26) is the exception: it goes looking for kills, to
// check that kill-everything is never the best way to play. Each hunter walks
// to a hex behind the nearest killable enemy and knifes it; a gunner closes to
// spot range, suppresses, and kills. It is the `careful` mover with the knife
// on. By default only the men with no charge to place hunt ("free"); HUNTERS=all
// has every man hunt, sappers too, and the charges wait. They hunt until the
// job is done or turn HUNT_TURNS (default 12) has passed, then play the
// mission as `careful` does. Compare its win %, score and kills with `careful`
// and `fight`.
//
// PENCIL=<policy> (M30) picks the time pencil where the mission offers a
// choice (charges.fuseChoice): `default` (the one the game offers first, as a
// player who never chooses takes: the default, or since M30b the shortest
// longer one that lets every man get clear of the blast), `long` (the longest that goes off before dawn, to be walking to
// the trucks when it blows), or `sync` (the same turn as a charge already
// burning, if a pencil reaches it, so the bangs come together; else the
// default). Where there is no choice (France) every policy is the one fuse.
//
// BOWSER=1 (M30) has the bot go for a target that sets off its neighbours
// (the airfield's bowser) when that takes more of the job for its charges
// than the targets themselves: one bomb for the aircraft either side of it.
//
// SCORES=1 (M32) adds a line per run with the winning scores' spread: lowest,
// quartiles, highest. The back page's ratings (missions.json) are set against it.
//
// The bot never uses the RAF diversion or stabilise, so a person should do a
// little better than it does. Its win rate shows which way a change pushes
// and roughly how hard, not the absolute answer.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_OVERRIDE = process.env.RULES_PATCH ? JSON.parse(process.env.RULES_PATCH) : null;
globalThis.fetch = async (url) => {
  let json = JSON.parse(readFileSync(join(REPO, String(url)), 'utf8'));
  if (DATA_OVERRIDE && String(url).endsWith('rules.json')) json = deepMerge(json, DATA_OVERRIDE);
  if (process.env.MAP_PATCH && /(^|\/)map[^/]*\.json$/.test(String(url))) json = deepMerge(json, JSON.parse(process.env.MAP_PATCH));
  if (process.env.ENEMIES_PATCH && String(url).endsWith('enemies.json')) json = deepMerge(json, JSON.parse(process.env.ENEMIES_PATCH));
  // MISSION_PATCH (M30): merged over the mission MISSION names in missions.json,
  // for its own rules, enemies and levels, which RULES_PATCH cannot reach.
  if (process.env.MISSION_PATCH && String(url).endsWith('missions.json')) {
    json = { ...json, missions: json.missions.map((m) => (m.id === process.env.MISSION ? deepMerge(m, JSON.parse(process.env.MISSION_PATCH)) : m)) };
  }
  return { ok: true, json: async () => json };
};
function deepMerge(a, b) {
  if (Array.isArray(b) || typeof b !== 'object' || b === null) return b;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = deepMerge(a?.[k], v);
  return out;
}
const mod = (p) => import(pathToFileURL(join(REPO, p)).href);
const S = await mod('src/state.js');
const U = await mod('src/units.js');
const E = await mod('src/enemy.js');
const M = await mod('src/map.js');
const SB = await mod('src/sabotage.js');
const T = await mod('src/traits.js');
const D = await mod('src/difficulty.js');
const H = await mod('src/hex.js');
const MI = await mod('src/missions.js');

// The mission (M27): MISSION=<id>, as ?mission= in the address; the default otherwise.
const missions = MI.validateMissions(await M.loadJson('data/missions.json'));
if (process.env.MISSION && MI.missionFromQuery(`?mission=${process.env.MISSION}`, missions) === null) throw new Error(`unknown or unplayable mission "${process.env.MISSION}"`);
const mission = MI.missionById(missions, process.env.MISSION ?? null);
const loadedMap = await M.loadMap(mission.map, undefined, undefined, (types) => MI.missionEnemyTypes(mission, types));
const loadedRules = MI.missionRules(mission, await M.loadJson('data/rules.json'));
const difficulty = MI.missionLevels(mission, D.validateDifficulty(await M.loadJson('data/difficulty.json'), loadedRules, { types: loadedMap.enemyTypes }), loadedRules, loadedMap.enemyTypes);
if (process.env.DIFFICULTY && !difficulty.levels.some((l) => l.id === process.env.DIFFICULTY)) throw new Error(`unknown difficulty "${process.env.DIFFICULTY}"`);
const { rules, map: map0 } = D.applyDifficulty(D.levelById(difficulty, process.env.DIFFICULTY ?? null), loadedRules, loadedMap);
const traits = T.validateTraits(await M.loadJson('data/traits.json'));
const roster = MI.missionRoster(mission, await M.loadJson(mission.roster));

const args = process.argv.slice(2).filter((a) => a !== '--json');
const AS_JSON = process.argv.includes('--json');
const N = Number(args[0] ?? 100);
const STRATEGY = args[1] ?? 'naive';
const OPTS = {
  careful: { fight: false, secondaries: false },
  fight: { fight: true, secondaries: false },
  greedy: { fight: false, secondaries: true },
  greedyfight: { fight: true, secondaries: true },
  naive: { fight: false, secondaries: false, naive: true },
  naivegreedy: { fight: false, secondaries: true, naive: true },
  naivefight: { fight: true, secondaries: true, naive: true },
  hunter: { fight: true, secondaries: false, hunt: true },
}[STRATEGY];
if (!OPTS) throw new Error(`unknown style "${STRATEGY}"`);
const KNIFE = process.env.KNIFE === '1' || Boolean(OPTS.hunt);
const PACK = process.env.PACK === '1';
const PENCIL = process.env.PENCIL ?? 'default';
if (!['default', 'long', 'sync'].includes(PENCIL)) throw new Error(`PENCIL must be default, long or sync, not "${PENCIL}"`);
const BOWSER = process.env.BOWSER === '1';
const HUNT_TURNS = Number(process.env.HUNT_TURNS ?? 12);
const HUNTERS = process.env.HUNTERS ?? 'free';
if (!['free', 'all'].includes(HUNTERS)) throw new Error(`HUNTERS must be free or all, not "${HUNTERS}"`);

function distanceField(map, goals) {
  // Cost to walk from any hex to the nearest goal (entering-cost of hexes on the way).
  const dist = new Map();
  for (const g of goals) {
    const reach = M.reachableWithin(map, g, 999, null);
    dist.set(M.hexKey(g.q, g.r), 0);
    for (const [k, v] of reach) if (!dist.has(k) || dist.get(k) > v.cost) dist.set(k, v.cost);
  }
  return dist;
}

function risk(map, state, unit, path, endHidden) {
  // What the detection check would do to him for this path, like the hover readout.
  let spotted = false; let shot = null;
  const probe = { ...unit, hidden: false };
  for (let i = 0; i < path.length; i++) {
    const hex = path[i];
    const last = i === path.length - 1;
    const u = last && endHidden ? { ...probe, hidden: true, q: hex.q, r: hex.r } : probe;
    const d = E.detectionAt(map, rules, state.enemies, state.alert.points, u, hex);
    if (!d || !d.spotted) continue;
    spotted = true;
    if (unit.inContact && d.firing) {
      const r = E.shotResultOf(d, rules);
      if (r === 'hit' || !shot) shot = r;
    }
  }
  return { spotted, shot };
}

// The hunter's target and where to stand to take it (M26): the nearest killable
// enemy; for a gunner, the enemy's own hex (the distance field leads him to it
// and he fires as soon as he is in range); for anyone else, the hexes beside it
// that it cannot see, where the knife works. Null when there is nothing to hunt.
function huntGoals(state, unit, map) {
  const prey = state.enemies.filter((e) => e.killable)
    .sort((a, b) => H.hexDistance(unit, a) - H.hexDistance(unit, b))[0];
  if (!prey) return null;
  if (rules.roles[unit.role].kill) return [{ q: prey.q, r: prey.r }];
  const behind = H.neighbors(prey.q, prey.r)
    .filter((h) => M.isInPlay(map, h.q, h.r) && M.enterCost(map, h.q, h.r, null) !== null && !H.inArc(prey, prey.facing, h, prey.arcDegrees));
  return behind.length ? behind : [{ q: prey.q, r: prey.r }];
}

// The targets the job still wants, and in what order to go for them: while the
// win can take any `needed` of several (destroyCount), the ones already
// started first, then the nearest to the stick, as many as are still to go.
// For France it is the Rail Bridge alone, as it always was.
function jobTargets(state) {
  const left = MI.winTargetsLeft(state, rules);
  const { targets, needed } = MI.winTargets(state, rules);
  const toGo = needed - targets.filter((o) => o.destroyed).length;
  const men = state.units.filter(U.onBoard);
  const near = (o) => Math.min(...o.chargeHexes.flatMap((h) => men.map((u) => H.hexDistance(u, h))));
  const started = (o) => o.detonated + state.charges.filter((c) => c.objectiveId === o.id).length;
  const pick = (list, n) => [...list].sort((a, b) => started(b) - started(a) || near(a) - near(b)).slice(0, n);
  // BOWSER=1 (M30): a setter that takes two or more of the job's targets with
  // it goes on the list first, and the targets it takes come off it.
  if (BOWSER && toGo > 0) {
    for (const setter of state.objectives.filter((o) => !o.destroyed && rules.objectives[o.kind].setsOff)) {
      const taken = SB.chainFrom(state.objectives, setter, setter.chargeHexes, rules).map((l) => l.objective).filter((o) => left.includes(o));
      if (taken.length < 2) continue;
      const rest = left.filter((o) => !taken.includes(o));
      return [setter, ...pick(rest, Math.max(0, toGo - taken.length))];
    }
  }
  if (left.length <= toGo) return left;
  return pick(left, toGo);
}

// The pencil this man sets his charge with, by PENCIL (M30).
function pencilFor(state, unit, map) {
  const open = SB.pencils(state, unit, rules).filter((p) => !p.afterDawn);
  const fallback = SB.offeredPencil(state, map, unit, rules)?.fuse;
  if (PENCIL === 'long') return open[open.length - 1]?.fuse ?? fallback;
  if (PENCIL === 'sync') {
    const latest = Math.max(0, ...state.charges.map((c) => state.turn + c.fuse - 1));
    return open.find((p) => p.blows === latest)?.fuse ?? fallback;
  }
  return fallback;
}

// Is this man hunting now? Until the job is done or HUNT_TURNS is up; the
// free men by default, everyone with HUNTERS=all.
function isHunting(state, unit, assign) {
  if (!OPTS.hunt) return false;
  if (MI.winMet(state, rules) || state.turn > HUNT_TURNS) return false;
  if (HUNTERS === 'free' && assign.has(unit.id)) return false;
  return state.enemies.some((e) => e.killable);
}

function goalFor(state, unit, map, assign) {
  if (isHunting(state, unit, assign)) return huntGoals(state, unit, map);
  if (assign.has(unit.id)) return [assign.get(unit.id)];
  // A spare man who can still carry a charge stands by near the job until its
  // charges are all set, in case a carrier falls.
  const job = jobTargets(state).find((o) => o.detonated + state.charges.filter((c) => c.objectiveId === o.id).length < rules.objectives[o.kind].chargesNeeded);
  if (job && U.canCarryCharges(unit) && U.chargeCapacity(unit, rules) > 0) {
    return job.chargeHexes.map((h) => ({ ...h, standby: true }));
  }
  return map.exfil.map(([q, r]) => ({ q, r }));
}

function assignCharges(state, map) {
  // Nearest carriers to the free charge hexes of objectives still to do.
  const assign = new Map();
  const wanted = [];
  const job = jobTargets(state);
  const objectives = state.objectives.filter((o) => !o.destroyed && (job.includes(o) || (OPTS.secondaries && !MI.isWinTarget(state, rules, o))));
  for (const o of objectives) {
    const need = rules.objectives[o.kind].chargesNeeded - o.detonated - state.charges.filter((c) => c.objectiveId === o.id).length;
    const free = o.chargeHexes.filter((h) => !state.charges.some((c) => c.q === h.q && c.r === h.r));
    wanted.push(...free.slice(0, Math.max(0, need)).map((h) => ({ ...h, o })));
  }
  const carriers = state.units.filter((u) => U.onBoard(u) && u.charges > 0);
  // A dropped charge the job still needs: the nearest man who can carry it fetches it.
  const short = wanted.length - carriers.length;
  if (short > 0) {
    for (const dc of state.droppedCharges.slice(0, short)) {
      const fetchers = state.units.filter((u) => U.onBoard(u) && u.charges === 0 && U.canCarryCharges(u) && U.chargeCapacity(u, rules) > 0 && !assign.has(u.id));
      fetchers.sort((a, b) => (Math.abs(a.q - dc.q) + Math.abs(a.r - dc.r)) - (Math.abs(b.q - dc.q) + Math.abs(b.r - dc.r)));
      if (fetchers[0]) assign.set(fetchers[0].id, { q: dc.q, r: dc.r, pickUp: true });
    }
  }
  // the job first
  wanted.sort((a, b) => (job.includes(b.o) ? 1 : 0) - (job.includes(a.o) ? 1 : 0));
  for (const w of wanted) {
    let best = null;
    for (const c of carriers) {
      if (assign.has(c.id)) continue;
      const d = Math.abs(c.q - w.q) + Math.abs(c.r - w.r);
      if (!best || d < best.d) best = { c, d };
    }
    if (best) assign.set(best.c.id, { q: w.q, r: w.r });
  }
  // Scouts cut a line (France's exchange, the airfield's signals tent) if we go for secondaries.
  if (OPTS.secondaries) {
    const ex = state.objectives.find((o) => rules.objectives[o.kind].cutLine && !o.destroyed);
    const scout = state.units.find((u) => U.onBoard(u) && rules.roles[u.role].cutLine && !assign.has(u.id));
    if (ex && scout) assign.set(scout.id, { ...ex.chargeHexes[0], cut: true });
  }
  return assign;
}

function actFor(state, unit, map) {
  const assign = assignCharges(state, map);
  // At his goal: place or cut.
  const goal = assign.get(unit.id);
  const hunting = isHunting(state, unit, assign);
  if (goal && !hunting && goal.q === unit.q && goal.r === unit.r) {
    if (goal.pickUp) {
      if (U.checkPickUpCharge(state.droppedCharges, unit, rules).ok) return S.pickUpCharge(state, unit.id, rules);
    } else if (goal.cut) {
      if (SB.checkCutLine(state, unit, rules).ok) return S.cutLine(state, unit.id, rules);
    } else if (SB.checkPlaceCharge(state, unit, rules, pencilFor(state, unit, map)).ok) {
      return S.placeCharge(state, unit.id, rules, pencilFor(state, unit, map));
    }
  }
  if (OPTS.fight && rules.roles[unit.role].kill) {
    for (const e of state.enemies) if (U.checkKill(map, unit, e, rules).ok) return S.killEnemy(state, unit.id, e.id, map, rules);
    // Suppress whoever has one of ours in its sights; a hunter, anything he could then kill.
    for (const e of state.enemies) {
      if ((e.watching || (hunting && e.killable)) && U.checkSuppress(map, unit, e, rules).ok) return S.suppressEnemy(state, unit.id, e.id, map, rules);
    }
  }
  // KNIFE=1 (M12b): any man beside an enemy that cannot see him knifes it,
  // as a player would who noticed. The bot never goes looking for one.
  if (KNIFE) {
    for (const e of state.enemies) if (U.checkKnife(unit, e, rules).ok) return S.knifeEnemy(state, unit.id, e.id, rules);
  }
  if (unit.ap <= 0) return null;
  // PACK=1 (m26b): on turn 1 a man packs the parachute he stands on before
  // he moves, as a careful player would. Without it the bot never packs.
  if (PACK && state.turn === 1 && U.checkPackParachute(state.parachutes, unit, rules).ok) return S.packParachute(state, unit.id, rules);

  const goals = goalFor(state, unit, map, assign);
  const dist = distanceField(map, goals);
  const blasts = SB.blastHexesThisTurn(state, rules);
  const reach = U.reachableFor(map, state.units, unit, rules, state.enemies);
  const here = { q: unit.q, r: unit.r, cost: 0 };
  let cands = [here, ...reach.values()];
  if (OPTS.naive) {
    // A first-timer: hovers the next few hexes of the obvious route toward his
    // goal, and a couple of hexes either side of it, not the whole board.
    const onRoute = [...reach.values()].sort((a, b) => (dist.get(M.hexKey(a.q, a.r)) ?? 999) - (dist.get(M.hexKey(b.q, b.r)) ?? 999));
    cands = [here, ...onRoute.slice(0, 4)];
  }
  const hideCost = rules.actions.hide.apCost;
  let best = null;
  for (const c of cands) {
    if (SB.inBlast(blasts, c)) continue;
    let plan = null; let path = unit.trail.length ? unit.trail : [here];
    if (c !== here) {
      plan = U.planMove(map, state.units, unit, c, rules, state.enemies);
      if (!plan || !plan.affordable) continue;
      path = [...unit.trail, ...plan.path.slice(1)];
    }
    const apLeft = unit.ap - (plan ? plan.total : 0);
    for (const hide of [false, true]) {
      if (hide && (apLeft < hideCost || unit.hidden)) continue;
      const r = risk(map, state, unit, path, hide || (c === here && unit.hidden));
      let d = dist.get(M.hexKey(c.q, c.r)) ?? 999;
      if (goals[0]?.standby) d = Math.max(0, d - 4); // near enough: wait in cover
      const exfil = SB.isExfil(map, c) && !assign.has(unit.id) && !hunting;
      let score = d * 10;
      // Urgency: as dawn nears with the job undone, a sighting is worth risking.
      const left = rules.turnLimit - state.turn;
      const done = MI.winMet(state, rules) || !assign.has(unit.id);
      const urgency = done ? Math.min(1, left / 6) : Math.min(1, Math.max(0.2, (left - 8) / 6));
      if (r.spotted && !unit.inContact) score += 45 * urgency;
      if (r.shot === 'hit') score += 400;
      if (r.shot === 'pinned') score += 60 * urgency;
      if (r.spotted && unit.inContact && !r.shot) score += 5;
      if (hide) score += 2;
      if (exfil) score -= 1000;
      if (!best || score < best.score) best = { score, c, plan, hide };
    }
  }
  if (!best) return U.onBoard(unit) ? S.holdUnit(state, unit.id) : null;
  let next = state;
  if (best.plan) next = S.moveUnit(next, unit.id, best.plan, map0);
  const moved = U.unitById(next.units, unit.id);
  if (best.hide && U.onBoard(moved)) next = S.hideUnit(next, unit.id, rules);
  else if (!best.plan) next = S.holdUnit(next, unit.id);
  return S.settleMission(next, rules, map0);
}

function playTurn(state) {
  // Each man acts until he has nothing better to do.
  for (let guard = 0; guard < 60 && !state.outcome; guard++) {
    const map = SB.effectiveMap(map0, state.objectives, rules);
    const actors = state.units.filter((u) => U.onBoard(u) && u.ap > 0);
    if (actors.length === 0) break;
    let progressed = false;
    for (const u of actors) {
      const cur = U.unitById(state.units, u.id);
      if (!U.onBoard(cur) || cur.ap <= 0) continue;
      const next = actFor(state, cur, map);
      if (next && next !== state) { state = next; progressed = true; }
      if (state.outcome) break;
    }
    if (!progressed) break;
  }
  return state.outcome ? state : S.endTurn(state, rules, map0);
}

function play(seed, runId) {
  let state = S.createInitialState(roster, traits, rules, map0, seed);
  state = S.jump(S.chooseDropRun(state, map0, runId), map0, rules);
  let bridgeTurn = null;
  const ev = { spotted: 0, pinned: 0, wounded: 0, killed: 0, found: 0, chutes: 0, reinforced: 0 };
  // How the stick came down: hurt in the water, or a bad landing that costs turns.
  const landings = state.report.filter((e) => e.kind === 'landed');
  ev.wet = landings.filter((e) => e.outcome === 'wounds').length;
  ev.bad = landings.filter((e) => e.outcome === 'bad').length;
  while (!state.outcome) {
    state = playTurn(state);
    for (const e of state.report ?? []) {
      if (e.kind === 'spotted') ev.spotted++;
      if (e.kind === 'pinned') ev.pinned++;
      if (e.kind === 'wounded') ev.wounded++;
      if (e.kind === 'killed') ev.killed++;
      if (e.kind === 'bodyFound' || e.kind === 'parachuteFound') ev.found++;
      // Parachutes found on their own: the bot never packs one, so this is how
      // many of the stick's six a patrol comes across.
      if (e.kind === 'parachuteFound') ev.chutes++;
      // Squads a bang called up coming on (M21b, Hard).
      if (e.kind === 'reinforcements') ev.reinforced++;
    }
    // When the job was done (the key keeps France's name for it).
    if (MI.winMet(state, rules) && bridgeTurn === null) bridgeTurn = state.turn;
    if (state.turn > 25) break;
  }
  const o = state.outcome;
  return {
    kind: o?.kind ?? 'stuck', reason: o?.reason, turn: o?.turn, score: o?.score.total ?? 0, bridgeTurn,
    peak: state.alert.peak, clean: o ? o.score.lines.some((l) => l.points === rules.scoring.clean && / diversion$/.test(l.label)) : false, dead: state.units.filter((u) => u.dead).length,
    out: state.units.filter((u) => u.out).length,
    kills: state.bodies.filter((b) => b.enemyId).length,
    secondaries: state.objectives.filter((x) => !MI.isWinTarget(state, rules, x) && x.destroyed).length,
    destroyedIds: state.objectives.filter((x) => !MI.isWinTarget(state, rules, x) && x.destroyed).map((x) => x.id),
    ...ev,
  };
}

// The win's targets, so the bonus targets are the rest (M28).
const WIN_IDS = new Set(MI.winTargets({ objectives: SB.createObjectives(map0) }, rules).targets.map((o) => o.id));
const runs = map0.dropRuns.map((r) => r.id).filter((id) => !process.env.RUN || id === process.env.RUN);
if (runs.length === 0) throw new Error(`unknown drop run "${process.env.RUN}"`);
const summary = {};
for (const run of runs) {
  const res = [];
  for (let seed = 1; seed <= N; seed++) res.push(play(seed * 7919, run));
  const count = (k) => res.filter((r) => r.kind === k).length;
  const avg = (f) => (res.reduce((n, r) => n + f(r), 0) / res.length).toFixed(2);
  const reasons = {};
  for (const r of res) if (r.kind !== 'success') { const k = `${r.reason} [bridge ${r.bridgeTurn ? 'down' : 'up'}, ${r.out} out, ${r.dead} dead]`; reasons[k] = (reasons[k] ?? 0) + 1; }
  summary[run] = {
    win: `${((100 * count('success')) / N).toFixed(0)}%`, withdrawn: count('withdrawn'), failed: count('failed'), stuck: count('stuck'),
    avgScore: avg((r) => r.score), avgDead: avg((r) => r.dead), avgPeak: avg((r) => r.peak ?? 0),
    avgBridgeTurn: (() => { const down = res.filter((r) => r.bridgeTurn); return down.length ? (down.reduce((n, r) => n + r.bridgeTurn, 0) / down.length).toFixed(2) : '-'; })(), kills: avg((r) => r.kills), secondaries: avg((r) => r.secondaries), reasons,
    endTurn: avg((r) => r.turn ?? 0), spotted: avg((r) => r.spotted), pinned: avg((r) => r.pinned), wounded: avg((r) => r.wounded), killedMen: avg((r) => r.killed), found: avg((r) => r.found), chutes: avg((r) => r.chutes),
    landedWet: avg((r) => r.wet), landedBad: avg((r) => r.bad), reinforced: avg((r) => r.reinforced),
    // How often each bonus target went up, as a share of games.
    bonusPct: Object.fromEntries(map0.objectives.filter((o) => !WIN_IDS.has(o.id)).map((o) => [o.id, `${((100 * res.filter((r) => r.destroyedIds.includes(o.id)).length) / N).toFixed(0)}%`])),
    // The winning scores' spread (M32): lowest, quartiles, highest — what the back page's ratings are set against.
    winScores: (() => { const w = res.filter((r) => r.kind === 'success').map((r) => r.score).sort((a, b) => a - b); return w.length ? [0, 0.25, 0.5, 0.75, 1].map((f) => w[Math.min(w.length - 1, Math.floor(f * w.length))]) : []; })(),
    cleanPct: `${((100 * res.filter((r) => r.clean).length) / N).toFixed(0)}%`,
    alarmedPct: `${((100 * res.filter((r) => (r.peak ?? 0) >= rules.alert.states.at(-1).from).length) / N).toFixed(0)}%`,
  };
}
if (AS_JSON) {
  console.log(JSON.stringify({ strategy: STRATEGY, seeds: N, patch: DATA_OVERRIDE, summary }, null, 1));
} else {
  console.log(`${STRATEGY}, ${N} seeds per drop run${DATA_OVERRIDE ? `, rules patch ${JSON.stringify(DATA_OVERRIDE)}` : ''}`);
  for (const [run, v] of Object.entries(summary)) {
    console.log(`  ${run.padEnd(6)} win ${v.win.padStart(4)}  withdrawn ${v.withdrawn}  failed ${v.failed}  score ${v.avgScore}  ends turn ${v.endTurn}`
      + `  bridge down turn ${v.avgBridgeTurn}${OPTS.secondaries ? `  bonus ${Object.entries(v.bonusPct).map(([id, p]) => `${id} ${p}`).join(' ')}` : ''}  spotted ${v.spotted}  dead ${v.avgDead}  landed wet ${v.landedWet} bad ${v.landedBad}  reached ${rules.alert.states.at(-1).label} ${v.alarmedPct}  clean ${v.cleanPct}  kills ${v.kills}  chutes found ${v.chutes}${Number(v.reinforced) > 0 ? `  reinforcements ${v.reinforced}` : ''}`);
    if (process.env.SCORES) console.log(`      winning scores, lowest / quartiles / highest: ${v.winScores.join(' / ')}`);
    for (const [why, n] of Object.entries(v.reasons).sort((a, b) => b[1] - a[1]).slice(0, 3)) console.log(`      ${String(n).padStart(3)}  ${why}`);
  }
}
