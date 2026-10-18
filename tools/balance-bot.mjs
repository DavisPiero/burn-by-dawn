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
// SENSE=1 (M42) mends two faults in his play (below): the aqueduct's reference.
// PICK=1 (M49e): of a target's free charge points, those no enemy would see a
// man on come first (since M49d a point that has gone off is spent); since
// M50 also a carrier sets his charge on the free point he stands on, and a
// fetcher is not sent to a pile a man who cannot take from it stands on.
//
// PACK=1 has every man pack the parachute he landed on, first thing on turn 1.
// Without it the bot never packs, so `chutes found` is what packing would save.
//
// The `tidy` style (M42) is the player the aqueduct's alert budget is measured
// by (MISSION-AQUEDUCT.md): the `careful` mover who packs his parachute on
// turn 1 (PACK=1), plans one bang (PENCIL=plan), has SENSE=1, and would rather
// lose a turn than be seen, to the last turn of the night. KNIFE is as given.
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
// default), or `plan` (M42: the first charge on a target that takes several
// gets a pencil long enough for the others to reach their points and set
// theirs to the same turn, and waits hidden if none is; the rest take the
// game's offer, which goes off with it). Where there is no choice (France)
// every policy is the one fuse.
//
// BOWSER=1 (M30) has the bot go for a target that sets off its neighbours
// (the airfield's bowser) when that takes more of the job for its charges
// than the targets themselves: one bomb for the aircraft either side of it.
// M33: every such target (the bomb store too); BOWSER=<kind> (bowser,
// bombStore) goes only for that kind, to see what each is worth.
//
// TRAIN=1 (M34) has the men hold their charges on the goods train's target
// (France's Rail Bridge) until they would go off within its window, hiding on
// the charge point meanwhile: what waiting for the train costs. The printed
// line gains `train N%`, the share of games it was wrecked in.
//
// SCORES=1 (M32) adds a line per run with the winning scores' spread: lowest,
// quartiles, highest. The back page's ratings (missions.json) are set against it.
//
// FIRE=<policy> (M36) has a man who is no gunner return fire at an enemy
// that has him in its sights: `cornered` (only when the best move he can
// find would still get him shot, as a person would), or `always` (whenever
// he can, first thing: a check that firing is not a free way out of being
// seen). Without it the bot never returns fire.
// ALERT=1 (M42) adds a line per run saying where the dial's points came from
// (first sightings, parachutes, canisters, bodies and bangs, a game); of the
// wins, how many never reached the last state, how many were one bang, and
// the slips (everything but the bangs) in them; how many games reached the
// last state before the job was done; and the turn the stick is at the shore
// with the job done (as many men as must get out, within three hexes of the
// way out). The aqueduct's alert budget and the boat's turn are set by it
// (MISSION-AQUEDUCT.md). ALERT=who adds who raised it, before the job or after.
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
const TR = await mod('src/tracks.js');

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
  tidy: { fight: false, secondaries: false, tidy: true },
}[STRATEGY];
if (!OPTS) throw new Error(`unknown style "${STRATEGY}"`);
const KNIFE = process.env.KNIFE === '1' || Boolean(OPTS.hunt);
// SENSE=1 (M42): two faults in the bot's play, found on the aqueduct, mended.
// It never takes the knife (his whole turn) while he stands in a blast that
// goes this turn; and on a job target with more charge points than it wants
// charges it takes the points nearest the men, not the first listed. France's
// and the airfield's baselines were measured without it and are kept so; the
// aqueduct's reference is with it.
const SENSE = process.env.SENSE === '1' || Boolean(OPTS.tidy);
// PICK=1 (M49e): a man setting a charge picks a point nobody would see him on, where there is one.
const PICK = process.env.PICK === '1';
// CLEAR=1 (M51): a man standing where a blast goes this turn looks at every
// hex he can reach to get clear of it, as the game's ALL CHARGES SET · GET
// CLEAR tells a player to. Without it the naive man looked only along his
// route, and on the aqueduct stood still beside the piers as they went up.
const CLEAR = process.env.CLEAR === '1';
// STAY=1 (M59): a man with nothing to set does not go out while the job's
// charges are still to set: he lies up in cover near the way out, on the
// board to fetch a fallen carrier's charges. Without it he walks out at once,
// which on Gunnerside, whose way out is beside the landing, had the scouts
// gone on turn 2 and nobody left to fetch a wounded sapper's. (Standing by at
// the job instead, as a sapper's spare does, blocked the hall's one-hex floor.)
const STAY = process.env.STAY === '1';
const PACK = process.env.PACK === '1' || Boolean(OPTS.tidy);
const TRAIN = process.env.TRAIN === '1';
const PENCIL = process.env.PENCIL ?? (OPTS.tidy ? 'plan' : 'default');
if (!['default', 'long', 'sync', 'plan'].includes(PENCIL)) throw new Error(`PENCIL must be default, long, sync or plan, not "${PENCIL}"`);
const BOWSER = process.env.BOWSER === '1' ? true : process.env.BOWSER || false;
const HUNT_TURNS = Number(process.env.HUNT_TURNS ?? 12);
const FIRE = process.env.FIRE ?? null;
if (FIRE && !['cornered', 'always'].includes(FIRE)) throw new Error(`FIRE must be cornered or always, not "${FIRE}"`);

// FIRE (M36): a suppress at the first enemy that has him in its sights, or null.
function returnFire(state, unit, map) {
  if (!FIRE || !U.returnsFire(unit, rules) || !unit.inContact) return null;
  for (const e of state.enemies) {
    if (U.checkSuppress(map, unit, e, rules).ok) return S.suppressEnemy(state, unit.id, e.id, map, rules);
  }
  return null;
}
const HUNTERS = process.env.HUNTERS ?? 'free';
if (!['free', 'all'].includes(HUNTERS)) throw new Error(`HUNTERS must be free or all, not "${HUNTERS}"`);

// The climb (M58, Gunnerside's gorge): ground dearer than any pool is entered
// only with the minimum step and takes his whole turn, so in the route sums it
// counts as one turn's walk, the largest role's pool, not its 30. Nowhere else
// has such ground, so nothing else changes.
const CLIMB_CAP = Math.max(...Object.values(rules.roles).map((r) => r.actionPoints));
const climbCost = (cost) => (cost > U.largestPool(rules) ? CLIMB_CAP : cost);

function distanceField(map, goals) {
  // Cost to walk from any hex to the nearest goal (entering-cost of hexes on the way).
  const dist = new Map();
  for (const g of goals) {
    const reach = M.reachableWithin(map, g, 999, null, climbCost);
    dist.set(M.hexKey(g.q, g.r), 0);
    for (const [k, v] of reach) if (!dist.has(k) || dist.get(k) > v.cost) dist.set(k, v.cost);
  }
  return dist;
}

// Tracks in the snow (M58): where the garrison walks in the coming enemy
// phase if the turn ended now, and every hex beside that: where prints laid
// now are found next turn, as the hover's TRACKS row tells a player. Worked out once a state, not once
// a candidate: the walk barely moves with one man's step. Nothing where the
// mission has no tracks.
let watchedFor = { enemies: null, units: null, hexes: null };
function watchedSnow(state, map) {
  if (!rules.tracks) return null;
  if (watchedFor.enemies === state.enemies && watchedFor.units === state.units) return watchedFor.hexes;
  const phase = E.runEnemyPhase(E.runDetection(state, map, rules).state, map, rules);
  const hexes = new Set();
  for (const e of phase.state.enemies) {
    const before = state.enemies.find((o) => o.id === e.id);
    for (const at of [...(before ? [before] : []), ...(e.walked ?? []), e]) {
      hexes.add(M.hexKey(at.q, at.r));
      for (const n of H.neighbors(at.q, at.r)) hexes.add(M.hexKey(n.q, n.r));
    }
  }
  watchedFor = { enemies: state.enemies, units: state.units, hexes };
  return hexes;
}
// The map his route sums are worked on: snow the garrison walks beside next
// turn costs him a turn's walk more (the sapper's pool), so he takes a way
// round where it is no longer than that and crosses where there is none, as
// MISSION-GUNNERSIDE.md (Balance) asks. A cost in the route, not in the choice
// of move: weighed against moving, it made standing still free, and the stick
// waited at the rim for a way that was never coming.
const TRAIL_COST = rules.roles.sapper.actionPoints;
function routeMap(state, map) {
  const watched = watchedSnow(state, map);
  if (!watched) return map;
  const moveCosts = new Map(map.moveCosts ?? []);
  for (const key of watched) {
    const [q, r] = key.split(',').map(Number);
    const cost = M.enterCost(map, q, r, null);
    if (cost !== null && TR.takesPrints(map, rules, { q, r })) moveCosts.set(key, cost + TRAIL_COST);
  }
  return { ...map, moveCosts };
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
  // it goes on the list first, and the targets it takes come off it. M33:
  // every such setter while the job still wants targets (the airfield has
  // two), nearest first; BOWSER=<kind> goes only for setters of that kind.
  if (BOWSER && toGo > 0) {
    const plan = [];
    let rest = left;
    let want = toGo;
    const setters = state.objectives.filter((o) => !o.destroyed && rules.objectives[o.kind].setsOff && (BOWSER === true || o.kind === BOWSER));
    for (const setter of pick(setters, setters.length)) {
      // One target still wanted is an aircraft's own bomb, not a second setter's.
      if (want < 2) break;
      const taken = SB.chainFrom(state.objectives, setter, setter.chargeHexes, rules).map((l) => l.objective).filter((o) => rest.includes(o));
      if (taken.length < 2) continue;
      plan.push(setter);
      rest = rest.filter((o) => !taken.includes(o));
      want -= taken.length;
    }
    if (plan.length) return [...plan, ...pick(rest, Math.max(0, want))];
  }
  if (left.length <= toGo) return left;
  return pick(left, toGo);
}

// The pencil this man sets his charge with, by PENCIL (M30). WAIT (M42, `plan`
// only): none yet, he holds his charge until the others are nearer.
const WAIT = Symbol('wait');
function pencilFor(state, unit, map, assign) {
  const open = SB.pencils(state, unit, rules).filter((p) => !p.afterDawn);
  const fallback = SB.offeredPencil(state, map, unit, rules)?.fuse;
  if (PENCIL === 'long') return open[open.length - 1]?.fuse ?? fallback;
  if (PENCIL === 'sync') {
    const latest = Math.max(0, ...state.charges.map((c) => state.turn + c.fuse - 1));
    return open.find((p) => p.blows === latest)?.fuse ?? fallback;
  }
  if (PENCIL === 'plan') return plannedPencil(state, unit, map, assign, open, fallback);
  return fallback;
}

// PENCIL=plan (M42): one bang for a target that takes several charges, as a
// player who has read the orders sets them. With charges already burning on
// it, the game's offer goes off with them. The first charge takes the
// shortest pencil that leaves the others time to walk to their points and
// set theirs to the same turn; if none is long enough he waits, hidden,
// while the night still has the turns for it.
function plannedPencil(state, unit, map, assign, open, fallback) {
  const o = state.objectives.find((x) => x.chargeHexes.some((h) => h.q === unit.q && h.r === unit.r));
  if (!o || state.charges.some((c) => c.objectiveId === o.id)) return fallback;
  const need = rules.objectives[o.kind].chargesNeeded - o.detonated;
  if (need <= 1) return fallback;
  // How many turns off the others are: men on their way to this target's
  // points, and men fetching a charge for it, who have that walk first.
  const points = distanceField(map, o.chargeHexes);
  const turnsOver = (cost) => Math.ceil(cost / 3);
  // A man with a second charge has the walk to the next point nobody is making for.
  const taken = new Set([...assign.values()].filter((g) => !g.pickUp).map((g) => M.hexKey(g.q, g.r)));
  const spare = o.chargeHexes.filter((h) => !taken.has(M.hexKey(h.q, h.r)) && !state.charges.some((c) => c.q === h.q && c.r === h.r) && !SB.isSpentPoint(o, h));
  const onward = (from) => (spare.length ? Math.max(1, turnsOver(Math.min(...spare.map((h) => distanceField(map, [h]).get(M.hexKey(from.q, from.r)) ?? 99)))) : 99);
  let latest = unit.charges > 1 ? onward(unit) : 0;
  let coming = unit.charges;
  for (const [id, goal] of assign) {
    const man = U.unitById(state.units, id);
    if (id === unit.id || goal.cut) continue;
    if (!goal.pickUp && !o.chargeHexes.some((h) => h.q === goal.q && h.r === goal.r)) continue;
    const walk = goal.pickUp
      ? (distanceField(map, [goal]).get(M.hexKey(man.q, man.r)) ?? 99) + (points.get(M.hexKey(goal.q, goal.r)) ?? 99)
      : (distanceField(map, [goal]).get(M.hexKey(man.q, man.r)) ?? 99);
    latest = Math.max(latest, turnsOver(walk) + (goal.pickUp ? 1 : 0) + (!goal.pickUp && man.charges > 1 ? onward(goal) : 0));
    coming += goal.pickUp ? 1 : man.charges;
  }
  // Fewer charges on their way than the job wants: somebody has yet to be sent.
  if (coming < need) latest = Math.max(latest, 99);
  // The last man sets his on turn + latest with the shortest pencil, which
  // goes off a turn after: this one must last at least that long.
  const pick = open.find((p) => p.blows >= state.turn + latest + 1 + PLAN_SLACK);
  if (pick) return pick.fuse;
  const longest = open[open.length - 1];
  const turnsLeft = SB.lastTurn(state, rules) - state.turn;
  return longest && turnsLeft > PLAN_WAIT_UNTIL ? WAIT : longest?.fuse ?? fallback;
}
const PLAN_WAIT_UNTIL = Number(process.env.PLAN_WAIT_UNTIL ?? 7);
const PLAN_SLACK = Number(process.env.PLAN_SLACK ?? 1);

// Is this man hunting now? Until the job is done or HUNT_TURNS is up; the
// free men by default, everyone with HUNTERS=all.
function isHunting(state, unit, assign) {
  if (!OPTS.hunt) return false;
  if (MI.winMet(state, rules) || state.turn > HUNT_TURNS) return false;
  if (HUNTERS === 'free' && assign.has(unit.id)) return false;
  return state.enemies.some((e) => e.killable);
}

function jobUndone(state) {
  return jobTargets(state).some((o) => o.detonated + state.charges.filter((c) => c.objectiveId === o.id).length < rules.objectives[o.kind].chargesNeeded);
}

function goalFor(state, unit, map, assign) {
  if (isHunting(state, unit, assign)) return huntGoals(state, unit, map);
  if (assign.has(unit.id)) return [assign.get(unit.id)];
  // A spare man who can still carry a charge stands by near the job until its
  // charges are all set, in case a carrier falls.
  const job = jobTargets(state).find((o) => o.detonated + state.charges.filter((c) => c.objectiveId === o.id).length < rules.objectives[o.kind].chargesNeeded);
  // Only a man whose loadout is charges stands by (M37: any man has room for
  // one now, and a stick that all waited at the job got nobody out).
  if (job && U.canCarryCharges(unit) && U.chargeCapacity(unit, rules) > 0) {
    return job.chargeHexes.map((h) => ({ ...h, standby: true }));
  }
  // The way out not open yet (M41, the aqueduct's boat): he lies up in heavy
  // cover near it until it is, as a player would, rather than stand on the beach.
  if (!SB.exfilOpen(state, rules) || (STAY && job && U.canCarryCharges(unit))) {
    const near = lieUpHexes(map).filter((h) => SB.exfilOpen(state, rules) ? !SB.isExfil(map, h) : true);
    if (near.length > 0) return near;
  }
  return map.exfil.map(([q, r]) => ({ q, r }));
}

/** Heavy cover within three hexes of the exfil: where a man waits for it to open. */
function lieUpHexes(map) {
  const out = [];
  M.forEachCell(map, (q, r) => {
    // An exfil hex in heavy cover counts (M50): he waits on it and boards from it.
    if (!M.isInPlay(map, q, r)) return;
    const terrain = M.terrainAt(map, q, r);
    if (!M.isPassable(terrain) || terrain.cover !== 'heavy') return;
    if (map.exfil.some(([eq, er]) => (Math.abs(q - eq) + Math.abs(q + r - eq - er) + Math.abs(r - er)) / 2 <= 3)) out.push({ q, r });
  });
  return out;
}

// The points to use on a target with more than it wants (SENSE=1, M42):
// the one the shortest walk from the stick first, then the others in order of
// the walk from that one, so the men work one end of a target together. The
// order is settled once a game and kept, or the men would change their minds
// every turn as they moved.
const pointOrder = new Map();
function nearestPoints(state, map, o, free) {
  if (!pointOrder.has(o.id)) {
    const men = state.units.filter(U.onBoard);
    const walkFrom = (h) => distanceField(map, [h]);
    const toMen = (h) => { const f = walkFrom(h); return men.reduce((n, u) => n + (f.get(M.hexKey(u.q, u.r)) ?? 99), 0); };
    const first = [...o.chargeHexes].sort((a, b) => toMen(a) - toMen(b))[0];
    const fromFirst = walkFrom(first);
    pointOrder.set(o.id, [...o.chargeHexes].sort((a, b) => (fromFirst.get(M.hexKey(a.q, a.r)) ?? 99) - (fromFirst.get(M.hexKey(b.q, b.r)) ?? 99)).map((h) => M.hexKey(h.q, h.r)));
  }
  const order = pointOrder.get(o.id);
  return [...free].sort((a, b) => order.indexOf(M.hexKey(a.q, a.r)) - order.indexOf(M.hexKey(b.q, b.r)));
}

function unwatchedFirst(state, map, free) {
  const carrier = state.units.find((u) => U.onBoard(u) && u.charges > 0) ?? state.units.find(U.onBoard);
  if (!carrier) return free;
  const seen = (h) => (E.detectionAt(map, rules, state.enemies, state.alert.points, { ...carrier, hidden: false, q: h.q, r: h.r }, h)?.spotted ? 1 : 0);
  return free.map((h, i) => ({ h, i, s: seen(h) })).sort((a, b) => a.s - b.s || a.i - b.i).map((x) => x.h);
}

function assignCharges(state, map) {
  // Nearest carriers to the free charge hexes of objectives still to do.
  const assign = new Map();
  const wanted = [];
  const job = jobTargets(state);
  const objectives = state.objectives.filter((o) => !o.destroyed && (job.includes(o) || (OPTS.secondaries && !MI.isWinTarget(state, rules, o))));
  for (const o of objectives) {
    const need = rules.objectives[o.kind].chargesNeeded - o.detonated - state.charges.filter((c) => c.objectiveId === o.id).length;
    let free = o.chargeHexes.filter((h) => !state.charges.some((c) => c.q === h.q && c.r === h.r) && !SB.isSpentPoint(o, h));
    // A job target with more points than it wants charges (M42, the aqueduct's
    // six for four): the points the shortest walk from the men who will set them.
    if (SENSE && job.includes(o) && need > 0 && free.length > need) free = nearestPoints(state, map, o, free);
    // PICK=1 (M49e): of those, the points nobody would see a man on come first,
    // as a player looking at the arcs would choose. Without it a man may wait
    // forever a hex from a watched point (the aqueduct guard's pier feet).
    if (PICK && need > 0 && free.length > need) free = unwatchedFirst(state, map, free);
    // Nor one another man is standing on, while there are others (PICK, M49e).
    if (PICK && free.length > need) {
      const open = free.filter((h) => !state.units.some((u) => U.onBoard(u) && !u.charges && u.q === h.q && u.r === h.r));
      if (open.length >= need) free = open;
    }
    // A carrier already standing on a free point sets his charge there (PICK, M50):
    // sent to another, he stood on it all night, blocking the canister under him.
    if (PICK && need > 0) {
      const under = free.filter((h) => state.units.some((u) => U.onBoard(u) && u.charges > 0 && u.q === h.q && u.r === h.r));
      free = [...under, ...free.filter((h) => !under.includes(h))];
    }
    wanted.push(...free.slice(0, Math.max(0, need)).map((h) => ({ ...h, o })));
  }
  const carriers = state.units.filter((u) => U.onBoard(u) && u.charges > 0);
  // A dropped charge the job still needs: the nearest man who can carry it fetches it.
  // Counted in charges, not men (M41: a sapper may carry two where they come
  // down in canisters; elsewhere a carrier has one, and the count is the same).
  const short = wanted.length - carriers.reduce((n, u) => n + u.charges, 0);
  if (short > 0) {
    // A pile a man stands on who cannot take from it comes last (PICK, M50):
    // the fetcher sent to it could never step onto his hex.
    const blocked = (dc) => state.units.some((u) => U.onBoard(u) && u.q === dc.q && u.r === dc.r && !(u.charges < U.chargeRoom(u, rules) && U.canCarryCharges(u)));
    const pile = PICK ? [...state.droppedCharges].sort((a, b) => blocked(a) - blocked(b)) : state.droppedCharges;
    for (const dc of pile.slice(0, short)) {
      // Any man with room for one more; where the charges are in canisters, a
      // man it would slow (M38's weight) goes only if he is well the nearest.
      const fetchers = state.units.filter((u) => U.onBoard(u) && u.charges < U.chargeRoom(u, rules) && U.canCarryCharges(u) && !assign.has(u.id));
      const far = (u) => Math.abs(u.q - dc.q) + Math.abs(u.r - dc.r) + (rules.canisters && u.charges + 1 > U.chargeCapacity(u, rules) ? 3 : 0);
      fetchers.sort((a, b) => far(a) - far(b));
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
  // Waiting on the beach with the boat in (M49d): he boards it.
  if (SB.checkBoardBoat(state, unit, rules, map0).ok) return S.settleMission(S.boardBoat(state, unit.id, rules, map0), rules, map0);
  const assign = assignCharges(state, map);
  // At his goal: place or cut.
  const goal = assign.get(unit.id);
  const hunting = isHunting(state, unit, assign);
  if (goal && !hunting && goal.q === unit.q && goal.r === unit.r) {
    if (goal.pickUp) {
      if (U.checkPickUpCharge(state.droppedCharges, unit, rules).ok) return S.pickUpCharge(state, unit.id, rules);
    } else if (goal.cut) {
      if (SB.checkCutLine(state, unit, rules).ok) return S.cutLine(state, unit.id, rules);
    } else {
      const pencil = pencilFor(state, unit, map, assign);
      const check = pencil === WAIT ? { ok: false } : SB.checkPlaceCharge(state, unit, rules, pencil);
      if (check.ok) {
        // TRAIN=1 (M34): on the goods train's target he holds his charge until
        // it would go off within the train's window, standing where he is.
        const early = TRAIN && rules.train && check.objective.kind === rules.train.objective
          && state.turn + check.fuse - 1 < rules.train.turn - rules.train.window;
        if (!early) return S.placeCharge(state, unit.id, rules, pencil);
        if (U.checkHide?.(unit, rules)?.ok) return S.hideUnit(state, unit.id, rules);
        return null;
      }
    }
  }
  if (FIRE === 'always') { const fired = returnFire(state, unit, map); if (fired) return fired; }
  if (OPTS.fight && rules.roles[unit.role].kill) {
    for (const e of state.enemies) if (U.checkKill(map, unit, e, rules).ok) return S.killEnemy(state, unit.id, e.id, map, rules);
    // Suppress whoever has one of ours in its sights; a hunter, anything he could then kill.
    for (const e of state.enemies) {
      if ((e.watching || (hunting && e.killable)) && U.checkSuppress(map, unit, e, rules).ok) return S.suppressEnemy(state, unit.id, e.id, map, rules);
    }
  }
  // KNIFE=1 (M12b): any man beside an enemy that cannot see him knifes it,
  // as a player would who noticed. The bot never goes looking for one.
  if (KNIFE && !(SENSE && SB.inBlast(SB.blastHexesThisTurn(state, rules), unit))) {
    for (const e of state.enemies) if (U.checkKnife(unit, e, rules).ok) return S.knifeEnemy(state, unit.id, e.id, rules);
  }
  if (unit.ap <= 0) return null;
  // PACK=1 (m26b): on turn 1 a man packs the parachute he stands on before
  // he moves, as a careful player would. Without it the bot never packs.
  if (PACK && state.turn === 1 && U.checkPackParachute(state.parachutes, unit, rules).ok) return S.packParachute(state, unit.id, rules);

  const goals = goalFor(state, unit, map, assign);
  const dist = distanceField(routeMap(state, map), goals);
  const blasts = SB.blastHexesThisTurn(state, rules);
  const reach = U.reachableFor(map, state.units, unit, rules, state.enemies);
  const here = { q: unit.q, r: unit.r, cost: 0 };
  let cands = [here, ...reach.values()];
  if (OPTS.naive) {
    // A first-timer: hovers the next few hexes of the obvious route toward his
    // goal, and a couple of hexes either side of it, not the whole board.
    const onRoute = [...reach.values()].sort((a, b) => (dist.get(M.hexKey(a.q, a.r)) ?? 999) - (dist.get(M.hexKey(b.q, b.r)) ?? 999));
    cands = CLEAR && SB.inBlast(blasts, here) ? [here, ...onRoute] : [here, ...onRoute.slice(0, 4)];
  }
  const hideCost = rules.actions.hide.apCost;
  // STAY=1: a man lying up for the job does not step out by the way out.
  const staying = STAY && goals.length > 0 && !goals[0].standby && U.canCarryCharges(unit) && jobUndone(state);
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
    // A man standing by does not park on a charge point a carrier needs (PICK, M49e:
    // since M49d a carrier cannot use a spent one instead, and waited beside him all night).
    if (PICK && goals[0]?.standby && state.objectives.some((o) => !o.destroyed && o.chargeHexes.some((h) => h.q === c.q && h.r === c.r) && !SB.isSpentPoint(o, c))) continue;
    for (const hide of [false, true]) {
      if (hide && (apLeft < hideCost || unit.hidden)) continue;
      const r = risk(map, state, unit, path, hide || (c === here && unit.hidden));
      let d = dist.get(M.hexKey(c.q, c.r)) ?? 999;
      if (goals[0]?.standby) d = Math.max(0, d - 4); // near enough: wait in cover
      // Out by ending his move there, once the boat is in (M49d: before it, only waiting).
      const exfil = SB.isExfil(map, c) && SB.exfilOpen(state, rules) && !assign.has(unit.id) && !hunting;
      if (exfil && staying) continue;
      let score = d * 10;
      // Urgency: as dawn nears with the job undone, a sighting is worth risking.
      const left = SB.lastTurn(state, rules) - state.turn;
      const done = MI.winMet(state, rules) || !assign.has(unit.id);
      // The tidy man (M42) would rather lose a turn than be seen, to the last turn of the night.
      const urgency = OPTS.tidy ? (left > 0 ? 1 : 0.2) : done ? Math.min(1, left / 6) : Math.min(1, Math.max(0.2, (left - 8) / 6));
      if (r.spotted && !unit.inContact) score += 45 * urgency;
      if (r.shot === 'hit') score += 400;
      if (r.shot === 'pinned') score += 60 * urgency;
      if (r.spotted && unit.inContact && !r.shot) score += 5;
      if (hide) score += 2;
      // A careful man does not walk out to a boat under an enemy's eye while
      // there is another turn to do it in (M42: the coast watcher sweeps).
      const waits = exfil && !OPTS.naive && rules.exfil?.opensTurn && r.spotted && !unit.inContact && left > 0;
      if (exfil && !waits) score -= 1000;
      if (!best || score < best.score) best = { score, c, plan, hide, shot: r.shot };
    }
  }
  if (!best) return U.onBoard(unit) ? S.holdUnit(state, unit.id) : null;
  if (FIRE === 'cornered' && best.shot) { const fired = returnFire(state, unit, map); if (fired) return fired; }
  let next = state;
  if (best.plan) next = S.moveUnit(next, unit.id, best.plan, map0, rules);
  const moved = U.unitById(next.units, unit.id);
  if (best.hide && U.onBoard(moved)) next = S.hideUnit(next, unit.id, rules);
  else if (!best.plan) next = S.holdUnit(next, unit.id);
  return S.settleMission(next, rules, map0);
}

function playTurn(state) {
  // Each man acts until he has nothing better to do.
  for (let guard = 0; guard < 60 && !state.outcome; guard++) {
    const map = SB.effectiveMap(map0, state.objectives, rules, state);
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
  pointOrder.clear();
  let state = S.createInitialState(roster, traits, rules, map0, seed);
  state = S.jump(S.chooseDropRun(state, map0, runId), map0, rules);
  let bridgeTurn = null;
  const ev = { spotted: 0, pinned: 0, wounded: 0, killed: 0, found: 0, chutes: 0, reinforced: 0, canisters: 0, bodies: 0, bangs: 0, prints: 0, alarmedTurn: null, beachTurn: null, by: {}, spotted1: 0, slipsBefore: 0 };
  const top = rules.alert.states.at(-1).from;
  // How the stick came down: hurt in the water, or a bad landing that costs turns.
  const landings = state.report.filter((e) => e.kind === 'landed');
  ev.wet = landings.filter((e) => e.outcome === 'wounds').length;
  ev.bad = landings.filter((e) => e.outcome === 'bad').length;
  while (!state.outcome) {
    state = playTurn(state);
    if (TRACE_ON) console.log(`turn ${state.turn - 1}: ${(state.report ?? []).map((e) => `${e.kind}${e.label ? ` ${e.label}` : ''}${e.unitName ? ` ${e.unitName}` : ''}${e.enemyLabel ? ` by ${e.enemyLabel}` : ''}${e.q !== undefined ? ` (${e.q},${e.r})` : ''}`).join(' · ')}\n   men ${state.units.map((u) => `${u.shortName}${u.out ? ' out' : u.dead ? ' dead' : ` (${u.q},${u.r})${u.charges ? ` c${u.charges}` : ''}`}`).join(', ')}\n   charges ${state.charges.map((c) => `(${c.q},${c.r}) f${c.fuse}`).join(' ')}  dial ${state.alert.points}  enemies ${state.enemies.map((e) => `${e.label.split(' ')[0]}(${e.q},${e.r})`).join(' ')}`);
    // Prints found (M59): they raise the dial once an enemy phase at most.
    if ((state.report ?? []).some((e) => e.kind === 'tracksFound')) ev.prints++;
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
      // ALERT=1 (M42): the rest of what raises the dial.
      if (e.kind === 'canisterFound') ev.canisters++;
      if (e.kind === 'bodyFound') ev.bodies++;
      if (e.kind === 'explosion') ev.bangs++;
      // Who raised it, and whether the job was done yet.
      const who = e.kind === 'spotted' ? e.enemyLabel : ['bodyFound', 'parachuteFound', 'canisterFound', 'tracksFound'].includes(e.kind) ? e.label : null;
      if (e.kind === 'spotted' && e.first) ev.spotted1++;
      if (who && (e.kind !== 'spotted' || e.first)) { const k = `${e.kind} ${who} ${bridgeTurn === null ? 'before' : 'after'}`; ev.by[k] = (ev.by[k] ?? 0) + 1; }
    }
    if (ev.alarmedTurn === null && (state.alert.peak ?? 0) >= top) ev.alarmedTurn = state.turn;
    // The turn the stick is at the shore with the job done: as many men as
    // must get out, out or within three hexes of the way out. What the boat's turn is set by.
    if (ev.beachTurn === null && MI.winMet(state, rules)
      && state.units.filter((u) => u.out || (U.onBoard(u) && map0.exfil.some(([q, r]) => H.hexDistance(u, { q, r }) <= 3))).length >= rules.mission.minimumOut) ev.beachTurn = state.turn - 1;
    // The dial's points before and at the job, bangs left out: the slips.
    if (bridgeTurn === null && !MI.winMet(state, rules)) ev.slipsBefore = ev.spotted1 + ev.chutes + ev.canisters + ev.bodies + ev.prints;
    // When the job was done (the key keeps France's name for it).
    if (MI.winMet(state, rules) && bridgeTurn === null) bridgeTurn = state.turn;
    if (state.turn > 25) break;
  }
  const o = state.outcome;
  return {
    kind: o?.kind ?? 'stuck', reason: o?.reason, turn: o?.turn, score: o?.score.total ?? 0, bridgeTurn,
    peak: state.alert.peak, clean: o ? o.score.lines.some((l) => l.points === rules.scoring.clean && / diversion$/.test(l.label)) : false, salvo: o ? o.score.lines.some((l) => / up in one bang$/.test(l.label)) : false, train: o ? o.score.lines.some((l) => / wrecked with it$/.test(l.label)) : false, dead: state.units.filter((u) => u.dead).length,
    out: state.units.filter((u) => u.out).length,
    kills: state.bodies.filter((b) => b.enemyId && !b.blast).length,
    secondaries: state.objectives.filter((x) => !MI.isWinTarget(state, rules, x) && x.destroyed).length,
    destroyedIds: state.objectives.filter((x) => !MI.isWinTarget(state, rules, x) && x.destroyed).map((x) => x.id),
    ...ev,
  };
}

// The win's targets, so the bonus targets are the rest (M28).
// TRACE=1 (M42) prints every turn of every game: the report, the men, the charges, the dial. For one seed and one run.
const TRACE_ON = Boolean(process.env.TRACE);
// SEED=<n> starts the batch at the nth seed (1 otherwise): with a count of 1, that one game.
const FIRST_SEED = Number(process.env.SEED ?? 1);
const WIN_IDS = new Set(MI.winTargets({ objectives: SB.createObjectives(map0) }, rules).targets.map((o) => o.id));
const runs = map0.dropRuns.map((r) => r.id).filter((id) => !process.env.RUN || id === process.env.RUN);
if (runs.length === 0) throw new Error(`unknown drop run "${process.env.RUN}"`);
const summary = {};
for (const run of runs) {
  const res = [];
  for (let seed = FIRST_SEED; seed < FIRST_SEED + N; seed++) res.push(play(seed * 7919, run));
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
    trainPct: `${((100 * res.filter((r) => r.train).length) / N).toFixed(0)}%`,
    salvoPct: `${((100 * res.filter((r) => r.salvo).length) / N).toFixed(0)}%`,
    cleanPct: `${((100 * res.filter((r) => r.clean).length) / N).toFixed(0)}%`,
    alarmedPct: `${((100 * res.filter((r) => (r.peak ?? 0) >= rules.alert.states.at(-1).from).length) / N).toFixed(0)}%`,
  };
  if (process.env.ALERT) {
    const wins = res.filter((r) => r.kind === 'success');
    const top = rules.alert.states.at(-1).from;
    const pct = (n, of) => (of ? `${((100 * n) / of).toFixed(0)}%` : '-');
    const mean = (list, f) => (list.length ? (list.reduce((n, r) => n + f(r), 0) / list.length).toFixed(1) : '-');
    summary[run].alert = {
      sightings: avg((r) => r.spotted1), chutes: avg((r) => r.chutes), canisters: avg((r) => r.canisters), bodies: avg((r) => r.bodies), bangs: avg((r) => r.bangs), prints: avg((r) => r.prints),
      winsBelow: pct(wins.filter((r) => (r.peak ?? 0) < top).length, wins.length),
      slips: mean(wins, (r) => r.spotted1 + r.chutes + r.canisters + r.bodies + r.prints),
      slipsBefore: mean(wins, (r) => r.slipsBefore),
      slips3: pct(wins.filter((r) => r.spotted1 + r.chutes + r.canisters + r.bodies + r.prints <= 3).length, wins.length),
      oneBang: pct(wins.filter((r) => r.bangs === 1).length, wins.length),
      beforeJob: pct(res.filter((r) => r.alarmedTurn !== null && (r.bridgeTurn === null || r.alarmedTurn < r.bridgeTurn)).length, N),
      beachTurn: mean(res.filter((r) => r.beachTurn !== null && r.bridgeTurn !== null), (r) => r.beachTurn),
      winBeachTurn: mean(wins.filter((r) => r.beachTurn !== null), (r) => r.beachTurn),
      by: (() => { const all = {}; for (const r of res) for (const [k, n] of Object.entries(r.by)) all[k] = (all[k] ?? 0) + n; return Object.entries(all).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${(n / N).toFixed(2)}`); })(),
    };
  }
}
if (AS_JSON) {
  console.log(JSON.stringify({ strategy: STRATEGY, seeds: N, patch: DATA_OVERRIDE, summary }, null, 1));
} else {
  console.log(`${STRATEGY}, ${N} seeds per drop run${DATA_OVERRIDE ? `, rules patch ${JSON.stringify(DATA_OVERRIDE)}` : ''}`);
  for (const [run, v] of Object.entries(summary)) {
    console.log(`  ${run.padEnd(6)} win ${v.win.padStart(4)}  withdrawn ${v.withdrawn}  failed ${v.failed}  score ${v.avgScore}  ends turn ${v.endTurn}`
      + `  bridge down turn ${v.avgBridgeTurn}${OPTS.secondaries ? `  bonus ${Object.entries(v.bonusPct).map(([id, p]) => `${id} ${p}`).join(' ')}` : ''}  spotted ${v.spotted}  dead ${v.avgDead}  landed wet ${v.landedWet} bad ${v.landedBad}  reached ${rules.alert.states.at(-1).label} ${v.alarmedPct}  clean ${v.cleanPct}${rules.scoring.salvo ? `  salvo ${v.salvoPct}` : ''}${rules.train ? `  train ${v.trainPct}` : ''}  kills ${v.kills}  chutes found ${v.chutes}${Number(v.reinforced) > 0 ? `  reinforcements ${v.reinforced}` : ''}`);
    if (v.alert) console.log(`      dial: sightings ${v.alert.sightings}  chutes ${v.alert.chutes}  canisters ${v.alert.canisters}  bodies ${v.alert.bodies}  bangs ${v.alert.bangs}${rules.tracks ? `  prints ${v.alert.prints}` : ''}\n      wins: below ${rules.alert.states.at(-1).label} ${v.alert.winsBelow}  one bang ${v.alert.oneBang}  slips ${v.alert.slips} (${v.alert.slipsBefore} before the job), three or fewer ${v.alert.slips3}  |  ${rules.alert.states.at(-1).label} before the job ${v.alert.beforeJob}  |  stick at the shore, turn ${v.alert.winBeachTurn}`);
    if (v.alert && process.env.ALERT === 'who') console.log(`      who: ${v.alert.by.join(' · ')}`);
    if (process.env.SCORES) console.log(`      winning scores, lowest / quartiles / highest: ${v.winScores.join(' / ')}`);
    for (const [why, n] of Object.entries(v.reasons).sort((a, b) => b[1] - a[1]).slice(0, 3)) console.log(`      ${String(n).padStart(3)}  ${why}`);
  }
}
