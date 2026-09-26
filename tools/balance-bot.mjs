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
// RUN=<id> plays only that drop run, for trying a change to one run quickly.
//
// DIFFICULTY=<id> plays at a level from data/difficulty.json, as the game
// does: its patches over the files (and over any *_PATCH above).
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
  if (process.env.MAP_PATCH && String(url).endsWith('map.json')) json = deepMerge(json, JSON.parse(process.env.MAP_PATCH));
  if (process.env.ENEMIES_PATCH && String(url).endsWith('enemies.json')) json = deepMerge(json, JSON.parse(process.env.ENEMIES_PATCH));
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

const loadedMap = await M.loadMap();
const loadedRules = await M.loadJson('data/rules.json');
const difficulty = D.validateDifficulty(await M.loadJson('data/difficulty.json'), loadedRules, { types: loadedMap.enemyTypes });
if (process.env.DIFFICULTY && !difficulty.levels.some((l) => l.id === process.env.DIFFICULTY)) throw new Error(`unknown difficulty "${process.env.DIFFICULTY}"`);
const { rules, map: map0 } = D.applyDifficulty(D.levelById(difficulty, process.env.DIFFICULTY ?? null), loadedRules, loadedMap);
const traits = T.validateTraits(await M.loadJson('data/traits.json'));
const roster = await M.loadJson('data/roster.json');

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
}[STRATEGY];
if (!OPTS) throw new Error(`unknown style "${STRATEGY}"`);

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

function goalFor(state, unit, map, assign) {
  if (assign.has(unit.id)) return [assign.get(unit.id)];
  // A spare man who can still carry a charge stands by near the primary until
  // its charges are all set, in case a carrier falls.
  const primary = state.objectives.find((o) => o.primary);
  const setOrGone = primary.detonated + state.charges.filter((c) => c.objectiveId === primary.id).length;
  if (!primary.destroyed && setOrGone < rules.objectives[primary.kind].chargesNeeded && U.canCarryCharges(unit) && U.chargeCapacity(unit, rules) > 0) {
    return primary.chargeHexes.map((h) => ({ ...h, standby: true }));
  }
  return map.exfil.map(([q, r]) => ({ q, r }));
}

function assignCharges(state, map) {
  // Nearest carriers to the free charge hexes of objectives still to do.
  const assign = new Map();
  const wanted = [];
  const objectives = state.objectives.filter((o) => !o.destroyed && (o.primary || OPTS.secondaries));
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
  // primary first
  wanted.sort((a, b) => (b.o.primary ? 1 : 0) - (a.o.primary ? 1 : 0));
  for (const w of wanted) {
    let best = null;
    for (const c of carriers) {
      if (assign.has(c.id)) continue;
      const d = Math.abs(c.q - w.q) + Math.abs(c.r - w.r);
      if (!best || d < best.d) best = { c, d };
    }
    if (best) assign.set(best.c.id, { q: w.q, r: w.r });
  }
  // Scouts cut the exchange if we go for secondaries.
  if (OPTS.secondaries) {
    const ex = state.objectives.find((o) => o.kind === 'exchange' && !o.destroyed);
    const scout = state.units.find((u) => U.onBoard(u) && rules.roles[u.role].cutLine && !assign.has(u.id));
    if (ex && scout) assign.set(scout.id, { ...ex.chargeHexes[0], cut: true });
  }
  return assign;
}

function actFor(state, unit, map) {
  const assign = assignCharges(state, map);
  // At his goal: place or cut.
  const goal = assign.get(unit.id);
  if (goal && goal.q === unit.q && goal.r === unit.r) {
    if (goal.pickUp) {
      if (U.checkPickUpCharge(state.droppedCharges, unit, rules).ok) return S.pickUpCharge(state, unit.id, rules);
    } else if (goal.cut) {
      if (SB.checkCutLine(state, unit, rules).ok) return S.cutLine(state, unit.id, rules);
    } else if (SB.checkPlaceCharge(state, unit, rules).ok) {
      return S.placeCharge(state, unit.id, rules);
    }
  }
  if (OPTS.fight && rules.roles[unit.role].kill) {
    for (const e of state.enemies) if (U.checkKill(map, unit, e, rules).ok) return S.killEnemy(state, unit.id, e.id, map, rules);
    // Suppress whoever has one of ours in its sights.
    for (const e of state.enemies) {
      if (e.watching && U.checkSuppress(map, unit, e, rules).ok) return S.suppressEnemy(state, unit.id, e.id, map, rules);
    }
  }
  if (unit.ap <= 0) return null;

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
      const exfil = SB.isExfil(map, c) && !assign.has(unit.id);
      let score = d * 10;
      // Urgency: as dawn nears with the job undone, a sighting is worth risking.
      const left = rules.turnLimit - state.turn;
      const done = state.objectives.find((o) => o.primary).destroyed || !assign.has(unit.id);
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
  const ev = { spotted: 0, pinned: 0, wounded: 0, killed: 0, found: 0 };
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
    }
    const b = state.objectives.find((o) => o.primary);
    if (b.destroyed && bridgeTurn === null) bridgeTurn = state.turn;
    if (state.turn > 25) break;
  }
  const o = state.outcome;
  return {
    kind: o?.kind ?? 'stuck', reason: o?.reason, turn: o?.turn, score: o?.score.total ?? 0, bridgeTurn,
    peak: state.alert.peak, dead: state.units.filter((u) => u.dead).length,
    out: state.units.filter((u) => u.out).length,
    kills: state.bodies.filter((b) => b.enemyId).length,
    secondaries: state.objectives.filter((x) => !x.primary && x.destroyed).length,
    destroyedIds: state.objectives.filter((x) => !x.primary && x.destroyed).map((x) => x.id),
    ...ev,
  };
}

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
    endTurn: avg((r) => r.turn ?? 0), spotted: avg((r) => r.spotted), pinned: avg((r) => r.pinned), wounded: avg((r) => r.wounded), killedMen: avg((r) => r.killed), found: avg((r) => r.found),
    landedWet: avg((r) => r.wet), landedBad: avg((r) => r.bad),
    // How often each bonus target went up, as a share of games.
    bonusPct: Object.fromEntries(map0.objectives.filter((o) => !o.primary).map((o) => [o.id, `${((100 * res.filter((r) => r.destroyedIds.includes(o.id)).length) / N).toFixed(0)}%`])),
    alarmedPct: `${((100 * res.filter((r) => (r.peak ?? 0) >= rules.alert.states.at(-1).from).length) / N).toFixed(0)}%`,
  };
}
if (AS_JSON) {
  console.log(JSON.stringify({ strategy: STRATEGY, seeds: N, patch: DATA_OVERRIDE, summary }, null, 1));
} else {
  console.log(`${STRATEGY}, ${N} seeds per drop run${DATA_OVERRIDE ? `, rules patch ${JSON.stringify(DATA_OVERRIDE)}` : ''}`);
  for (const [run, v] of Object.entries(summary)) {
    console.log(`  ${run.padEnd(6)} win ${v.win.padStart(4)}  withdrawn ${v.withdrawn}  failed ${v.failed}  score ${v.avgScore}  ends turn ${v.endTurn}`
      + `  bridge down turn ${v.avgBridgeTurn}${OPTS.secondaries ? `  bonus ${Object.entries(v.bonusPct).map(([id, p]) => `${id} ${p}`).join(' ')}` : ''}  spotted ${v.spotted}  dead ${v.avgDead}  landed wet ${v.landedWet} bad ${v.landedBad}  reached ${rules.alert.states.at(-1).label} ${v.alarmedPct}  kills ${v.kills}`);
    for (const [why, n] of Object.entries(v.reasons).sort((a, b) => b[1] - a[1]).slice(0, 3)) console.log(`      ${String(n).padStart(3)}  ${why}`);
  }
}
