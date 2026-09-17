// Panel chrome around the board: turn counter, roster rail, hover readout,
// terrain legend. Reads state and map data, never mutates them (CLAUDE.md hard
// rule 7) — clicks are handed straight back to the caller.
//
// SPEC.md §11 wants this as the right-hand page of a printed spread, with
// portraits and an alert dial. That is the art pass at M7. This is the plain
// version of the same panel.

import { terrainAt } from '../map.js';
import { ALERT_STATE, DIAL, PALETTE, terrainStyle } from './theme.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

/**
 * The garrison alert dial, SPEC.md §6. The face and needle are registry
 * sprites. The state names sit beside it rather than on the face, where they
 * are unreadable at panel size; they come from data/rules.json, so renaming a
 * state is data. `alert` is derived in main.js:
 * { index, states, points, quietTurns, quietTurnsToDecay }.
 */
export function renderAlertDial(svg, caption, alert) {
  svg.replaceChildren();
  svg.appendChild(svgEl('use', { href: '#ui-alert-dial', width: 240, height: 240 }));
  const step = DIAL.sweep / alert.states.length;
  const angle = DIAL.startAngle + step * (alert.index + 0.5);
  svg.appendChild(svgEl('use', {
    href: '#ui-alert-needle', x: 110, y: 10, width: 20, height: 120,
    transform: `rotate(${angle} 120 120)`,
  }));

  caption.replaceChildren();
  const heading = document.createElement('div');
  heading.className = 'alert-heading';
  heading.textContent = 'GARRISON ALERT';
  caption.appendChild(heading);
  const list = document.createElement('ol');
  list.className = 'alert-states';
  alert.states.forEach((s, i) => {
    const item = document.createElement('li');
    item.textContent = s.label;
    if (i === alert.index) {
      item.className = 'active';
      item.style.background = ALERT_STATE[s.id];
      item.style.color = ALERT_STATE.text;
    }
    list.appendChild(item);
  });
  caption.appendChild(list);

  const state = alert.states[alert.index];
  const note = document.createElement('div');
  note.className = 'alert-note';
  // Several events share one state (SPEC.md §6), so the needle alone cannot
  // warn that the next sighting tips the dial; the points to go do.
  const next = alert.states[alert.index + 1];
  const parts = [`alert ${alert.points}`];
  if (next) parts.push(`${next.from - alert.points} to ${next.label}`);
  parts.push(`vision +${state.visionBonus}`);
  if (alert.points > 0) parts.push(`quiet ${alert.quietTurns}/${alert.quietTurnsToDecay} to ease`);
  note.textContent = parts.join(' · ');
  caption.appendChild(note);
}

/** What happened at the last turn boundary, in words. */
export function renderReport(element, state) {
  element.replaceChildren();
  const lines = state.report.map(describeEvent);
  if (lines.length === 0) lines.push(state.turn === 1 ? 'No reports yet.' : 'A quiet night. Nothing seen.');
  for (const line of lines) {
    const item = document.createElement('li');
    item.textContent = line;
    element.appendChild(item);
  }
}

function describeEvent(event) {
  switch (event.kind) {
    case 'spotted': return `${event.unitName} spotted by ${event.enemyLabel} at (${event.q}, ${event.r}).`;
    case 'alertRise': return `Alert rises: ${event.from} → ${event.to}.`;
    case 'alertDecay': return `Alert eases: ${event.from} → ${event.to}.`;
    case 'reserve': return `${event.label} arrives on the road at (${event.q}, ${event.r}).`;
    case 'searched': return `${event.label} reaches (${event.q}, ${event.r}) and searches it.`;
    case 'wounded': return `${event.unitName} is hit by ${listOf(event.by)} — wounded.${event.line ? ` “${event.line}”` : ''}`;
    case 'killed': return `${event.unitName} is hit by ${listOf(event.by)} — killed.`;
    case 'pinned': return `${event.unitName} is fired on by ${listOf(event.by)} — pinned in cover, not hit.`;
    case 'heard': return `${listOf(event.labels)} react${event.labels.length === 1 ? 's' : ''} to ${NOISE_WORDS[event.noise] ?? 'something'} at (${event.q}, ${event.r}).`;
    case 'bodyFound': return `${event.label} finds ${event.name}'s body at (${event.q}, ${event.r}).`;
    case 'explosion': return event.destroyed ? `BANG — the ${event.label.toLowerCase()} goes up. Destroyed.` : `BANG — a charge goes off on the ${event.label.toLowerCase()}. It still stands.`;
    case 'blastKilled': return `${event.unitName} is caught in the blast at the ${event.label.toLowerCase()} — killed.`;
    case 'diversion': return 'RAF diversion called: bombers over the town. The garrison looks the other way.';
    default: return event.kind;
  }
}

const NOISE_WORDS = { spotted: 'a sighting', found: 'the shout over a body', stone: 'a noise', gunfire: 'gunfire', explosion: 'the explosion' };

function listOf(labels) {
  if (!labels || labels.length === 0) return 'someone';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
}

/**
 * SPEC.md §6's sum in words, one term at a time, so the player can see why:
 * "Bridge patrol: 3 − cover 2 − conceal 0 + close 1 = 2 of 3".
 */
export function describeDetection(d) {
  let sum = `${d.enemyLabel}: ${d.base} − cover ${d.cover} − conceal ${d.concealment}`;
  if (d.hidden) sum += ` − hidden ${d.hidden}`;
  sum += ` + close ${d.proximity}`;
  if (d.trait) sum += ` ${d.trait > 0 ? '+' : '−'} trait ${Math.abs(d.trait)}`;
  return `${sum} = ${d.score} of ${d.threshold}`;
}

/** The whole hover path's risk in one phrase. */
export function describeRisk(plan, risk) {
  if (!plan || !risk) return null;
  const tested = plan.steps === 0 ? [0] : plan.path.map((_, i) => i).slice(1);
  const seen = tested.filter((i) => risk[i]);
  if (seen.length === 0) return plan.steps === 0 ? 'unseen here' : 'unseen all the way';
  const spotted = seen.filter((i) => risk[i].spotted);
  const shot = seen.filter((i) => risk[i].shot);
  const worstAt = seen.reduce((a, b) => (risk[b].score > risk[a].score ? b : a));
  const hex = plan.path[worstAt];
  const where = `(${hex.q}, ${hex.r})`;
  if (shot.length > 0) {
    // The shot lands on the most exposed hex he would be shot on (SPEC.md §5).
    const worst = shot.find((i) => risk[i].shotResult === 'hit') ?? shot[0];
    const at = plan.path[worst];
    const outcome = risk[worst].shotResult === 'hit' ? 'SHOT — HIT in the open' : 'SHOT — PINNED in cover, not hit';
    return `${outcome}: he is in contact and ${risk[worst].enemyLabel} would see him again at (${at.q}, ${at.r}): ${describeDetection(risk[worst])}`;
  }
  if (spotted.length > 0) {
    return `SPOTTED on ${spotted.length} of ${tested.length} hex${tested.length === 1 ? '' : 'es'} — at ${where} ${describeDetection(risk[worstAt])}`;
  }
  return `seen, not spotted — worst ${where} ${describeDetection(risk[worstAt])}`;
}

function describeCost(terrain) {
  return terrain.moveCost === null ? 'impassable' : `move ${terrain.moveCost}`;
}

/** Dawn arrives on turn 20 and that is the clock (SPEC.md §4). */
export function renderTurnCounter(element, state, rules) {
  if (state.outcome) {
    element.textContent = `TURN ${state.turn} / ${rules.turnLimit} — MISSION OVER`;
    element.classList.add('dawn');
    return;
  }
  const dawn = state.turn >= rules.turnLimit;
  element.textContent = dawn
    ? `TURN ${state.turn} / ${rules.turnLimit} — DAWN`
    : `TURN ${state.turn} / ${rules.turnLimit}`;
  element.classList.toggle('dawn', dawn);
}

export function renderEndTurnButton(button, state, rules) {
  button.disabled = Boolean(state.outcome);
  if (state.outcome) button.textContent = 'MISSION OVER';
  else if (state.turn >= rules.turnLimit) button.textContent = 'END THE LAST TURN — DAWN  (space)';
  else button.textContent = 'END TURN  (space)';
}

/**
 * The mission at a glance (SPEC.md §7, §10): each objective and how far on it
 * is, how many men are out of how many needed, and a warning when there are no
 * longer enough charges for the primary.
 */
export function renderMission(element, mission) {
  element.replaceChildren();
  for (const o of mission.objectives) {
    const item = document.createElement('li');
    if (o.destroyed) item.className = 'done';
    const name = document.createElement('b');
    name.textContent = o.primary ? `${o.label} ★` : o.label;
    item.append(name, ` — ${o.detail}`);
    element.appendChild(item);
  }
  const out = document.createElement('li');
  out.textContent = `Men out: ${mission.out} of ${mission.minimumOut} needed`;
  element.appendChild(out);
}

/** The RAF diversion (SPEC.md §4): one button for the whole stick, not a trooper action. */
export function renderDiversion(button, check) {
  button.disabled = !check.ok;
  button.textContent = check.ok ? 'RAF DIVERSION [D] — once, no AP' : `RAF diversion — ${check.reason}`;
  button.title = check.ok
    ? 'The alert drops a state, every search and held contact is dropped, every man is out of contact. Costs the clean-run bonus.'
    : check.reason;
}

const OUTCOME_WORDS = { success: 'MISSION ACCOMPLISHED', withdrawn: 'WITHDRAWN', failed: 'MISSION FAILED' };
const FATE_WORDS = { out: 'got out', killed: 'killed', 'left behind': 'left behind' };

/**
 * The results (SPEC.md §10): outcome, all six by name and fate, and the score.
 * Plain for now; M7 prints it as the back page of the annual.
 */
export function renderResults(element, outcome) {
  element.replaceChildren();
  element.hidden = !outcome;
  if (!outcome) return;
  element.className = outcome.kind;
  const heading = document.createElement('h2');
  heading.textContent = OUTCOME_WORDS[outcome.kind];
  const reason = document.createElement('p');
  reason.textContent = `${outcome.reason[0].toUpperCase()}${outcome.reason.slice(1)}. Turn ${outcome.turn}.`;
  const fates = document.createElement('ul');
  for (const f of outcome.fates) {
    const item = document.createElement('li');
    item.className = f.fate === 'out' ? 'fate-out' : 'fate-lost';
    item.textContent = `${f.name} — ${FATE_WORDS[f.fate]}`;
    fates.appendChild(item);
  }
  const score = document.createElement('table');
  for (const line of outcome.score.lines) {
    const row = score.insertRow();
    row.insertCell().textContent = line.label;
    row.insertCell().textContent = `+${line.points}`;
  }
  const total = score.insertRow();
  total.className = 'total';
  total.insertCell().textContent = 'Score';
  total.insertCell().textContent = String(outcome.score.total);
  const again = document.createElement('button');
  again.type = 'button';
  again.textContent = 'Play again';
  again.addEventListener('click', () => window.location.reload());
  element.append(heading, reason, fates, score, again);
}

/**
 * The six, always visible, in roster order — the rail of SPEC.md §11 without
 * its portraits. The number in front of each is its `1`–`6` hotkey. Each man's
 * traits are listed with what they do to his numbers, worked out in main.js.
 */
export function renderRoster(element, state, map, view, onSelect) {
  element.replaceChildren();

  state.units.forEach((unit, i) => {
    const item = document.createElement('li');
    item.className = 'roster-item';
    if (unit.id === state.selectedUnitId) item.classList.add('selected');
    if (unit.ap === 0) item.classList.add('spent');
    if (unit.dead || unit.out) item.classList.add('dead');

    const key = document.createElement('span');
    key.className = 'roster-key';
    key.textContent = String(i + 1);
    // The same colour as his counter's name strip, so the panel and the board
    // point at the same man.
    if (unit.leader) key.style.color = PALETTE.leader;

    const who = document.createElement('span');
    who.className = 'roster-who';
    who.textContent = unit.name;

    const status = describeStatus(unit);
    if (status) {
      const tag = document.createElement('span');
      tag.className = 'roster-status';
      tag.textContent = status;
      who.append(' ', tag);
    }

    const detail = document.createElement('span');
    detail.className = 'roster-detail';
    if (unit.dead || unit.out) {
      detail.textContent = unit.roleLabel;
      const text = document.createElement('span');
      text.className = 'roster-text';
      text.append(who, detail);
      item.append(key, text);
      element.appendChild(item);
      return;
    }
    const terrain = terrainAt(map, unit.q, unit.r);
    const where = `${unit.roleLabel} · ${terrain ? terrain.label : 'off map'} (${unit.q}, ${unit.r})`;
    // An AP pool that is bigger than the role's own number needs to say why,
    // or the player is left guessing where the extra point came from.
    detail.textContent = unit.leader ? `${where} · leading` : where;
    detail.append(` · ${unit.charges} charge${unit.charges === 1 ? '' : 's'}`);

    const ap = document.createElement('span');
    ap.className = 'roster-ap';
    ap.textContent = `${unit.ap}/${unit.apMax} AP`;
    if (unit.commandBonus > 0) {
      const bonus = document.createElement('span');
      bonus.className = 'roster-bonus';
      bonus.textContent = `+${unit.commandBonus} orders`;
      detail.append(' · ', bonus);
    }

    const text = document.createElement('span');
    text.className = 'roster-text';
    text.append(who, detail);
    for (const effect of view.traitEffectsById.get(unit.id) ?? []) {
      const trait = document.createElement('span');
      trait.className = 'roster-trait';
      trait.title = effect.description ?? '';
      const name = document.createElement('b');
      name.textContent = effect.name;
      trait.append(name, ` — ${describeEffect(effect)}`);
      text.appendChild(trait);
    }

    item.append(key, text, ap);
    item.addEventListener('click', () => onSelect(unit.id));
    element.appendChild(item);
  });
}

/** His condition in a word or two, or null when there is nothing to say. */
function describeStatus(unit) {
  if (unit.dead) return 'KILLED';
  if (unit.out) return 'OUT';
  const parts = [];
  if (unit.hits > 0) parts.push(unit.stabilised ? 'DRESSED' : 'WOUNDED');
  if (unit.inContact) parts.push('IN CONTACT');
  if (unit.pinned) parts.push('PINNED');
  if (unit.hidden) parts.push('HIDDEN');
  return parts.length ? parts.join(' · ') : null;
}

/**
 * The selected man's actions (SPEC.md §4), as buttons with their key and cost.
 * `actions` is worked out in main.js: [{ id, key, label, cost, ok, reason,
 * active }]. A button that cannot be used says why on hover and underneath.
 */
export function renderActions(element, actions, onAction) {
  element.replaceChildren();
  if (!actions) {
    element.hidden = true;
    return;
  }
  element.hidden = false;
  for (const action of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'action';
    if (action.active) button.classList.add('active');
    button.disabled = !action.ok && !action.active;
    button.title = action.ok ? action.help : action.reason;
    const name = document.createElement('span');
    name.className = 'action-name';
    name.textContent = `${action.label} [${action.key}]`;
    const cost = document.createElement('span');
    cost.className = 'action-cost';
    cost.textContent = action.active ? 'click a target · Esc' : action.ok ? action.cost : action.reason;
    button.append(name, cost);
    button.addEventListener('click', () => onAction(action.id));
    element.appendChild(button);
  }
}

// How a hook stat reads to a player. A stat missing here still renders, by
// its id, so a trait on a new stat is ugly rather than invisible.
const STAT_WORDS = {
  landingPenalty: { label: 'bad landing', unit: ' turn lost', units: ' turns lost' },
  scatterDistance: { label: 'scatter', unit: ' hex', units: ' hexes' },
  actionPoints: { label: 'AP pool', unit: ' AP', units: ' AP' },
  moveCost: { label: 'move cost', unit: ' AP', units: ' AP' },
  spotRadius: { label: 'spot radius', unit: ' hex', units: ' hexes' },
  detection: { label: 'detection against him', unit: '', units: '' },
  charges: { label: 'charges carried', unit: '', units: '' },
  apCost: { label: 'placing a charge', unit: ' AP', units: ' AP' },
  fuse: { label: 'fuse', unit: ' turn', units: ' turns' },
  alert: { label: 'gunfire alert', unit: '', units: '' },
};

function amount(value, words) {
  return `${value}${Math.abs(value) === 1 ? words.unit : words.units}`;
}

/**
 * "fuse 3 → 2 turns" where the base is known; "move cost +1 AP" where it
 * depends on the situation.
 */
export function describeEffect(effect) {
  const words = STAT_WORDS[effect.stat] ?? { label: effect.stat, unit: '', units: '' };
  if (effect.base !== null) {
    return `${words.label} ${effect.base} → ${amount(effect.value, words)}`;
  }
  const { op, value } = effect.modifier;
  const change = op === 'set' ? `always ${amount(value, words)}` : `${value >= 0 ? '+' : ''}${amount(value, words)}`;
  return `${words.label} ${change}`;
}

/**
 * One line about whatever the mouse is over. With a trooper selected this is
 * the path readout SPEC.md §4 asks for: route, total AP, and why not if not.
 * With it comes the detection risk along that path, and over an enemy, what
 * that enemy is.
 */
export function renderReadout(element, state, map, view) {
  const hex = state.hoverHex ?? state.selectedHex;
  if (view?.targetLabel) {
    element.textContent = view.targetLabel;
    return;
  }
  if (view?.hoverEnemy) {
    const e = view.hoverEnemy;
    let doing = e.speed === 0 ? 'holds its post' : e.route ? `walks its route, speed ${e.speed}` : `speed ${e.speed}`;
    if (e.investigating) doing = `going to look at (${e.investigating.q}, ${e.investigating.r})`;
    if (e.watching) doing = `has a man in its sights at (${e.watching.q}, ${e.watching.r})`;
    if (e.suppressed) doing = 'SUPPRESSED — will not fire or move this turn';
    element.textContent = `(${e.q}, ${e.r}) ${e.label} — ${e.typeLabel}, vision ${view.hoverEnemyVision} hexes, facing ${view.hoverEnemyFacing}, ${doing}. Detection base ${e.detection}.`;
    return;
  }
  if (!hex) {
    element.textContent = state.selectedUnitId
      ? 'Hover a hex to preview the move. Right-click or Esc to cancel.'
      : 'Click a trooper to select him, or a hex to inspect it.';
    return;
  }

  const terrain = terrainAt(map, hex.q, hex.r);
  if (!terrain) {
    element.textContent = `(${hex.q}, ${hex.r}) — off map`;
    return;
  }

  const parts = [
    describeCost(terrain),
    `cover ${terrain.cover}`,
    terrain.blocksLOS ? 'blocks line of sight' : 'no line of sight block',
  ];
  if (terrain.spotBonus) parts.push(`spot ${terrain.spotBonus > 0 ? '+' : ''}${terrain.spotBonus}`);

  let line = `(${hex.q}, ${hex.r}) ${terrain.label} — ${parts.join(', ')}`;
  if (view?.siteLabel) line += `   ▸ ${view.siteLabel}`;
  if (view?.moveLabel) line += `   ▸ ${view.moveLabel}`;
  if (view?.blastLabel) line += `   ▸ ${view.blastLabel}`;
  if (view?.riskLabel) line += `   ▸ ${view.riskLabel}`;
  if (view?.hideLabel) line += `   ▸ ${view.hideLabel}`;
  element.textContent = line;
}

/** What the hover path costs, in words. Derived in main.js, worded here. */
export function describePlan(plan, unit) {
  if (!unit) return null;
  if (!plan) return 'no route there';
  if (plan.steps === 0) return `${unit.shortName} is already here`;
  const route = `${plan.steps} hex${plan.steps === 1 ? '' : 'es'}, ${plan.total} AP`;
  if (plan.affordable && plan.minimumStep) return `${route} — one step, spends all ${unit.apMax} AP`;
  if (plan.affordable) return `${route} — click to move`;
  return `${route} — ${plan.reason}`;
}

/**
 * The legend, built entirely from the map's own legend and the terrain table.
 * It lists the character to type in map.json for each terrain, so a new
 * terrain type appears here without touching any code.
 */
export function renderLegend(element, map) {
  element.replaceChildren();
  for (const [char, terrainId] of Object.entries(map.legend)) {
    const terrain = map.terrain[terrainId];
    const style = terrainStyle(terrainId);

    const item = document.createElement('li');
    item.className = 'legend-item';

    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = style.fill;
    swatch.style.color = style.ink;
    swatch.textContent = char;
    item.appendChild(swatch);

    const label = document.createElement('span');
    label.textContent = `${terrain.label} (${describeCost(terrain)})`;
    item.appendChild(label);

    element.appendChild(item);
  }
}

/** Data problems have to be loud, or a data-driven map is a guessing game. */
export function renderError(element, error) {
  element.hidden = false;
  element.textContent = error.message;
  console.error(error);
}
