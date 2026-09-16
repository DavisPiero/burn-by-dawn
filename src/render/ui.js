// Panel chrome around the board: turn counter, roster rail, hover readout,
// terrain legend. Reads state and map data, never mutates them (CLAUDE.md hard
// rule 7) — clicks are handed straight back to the caller.
//
// SPEC.md §11 wants this as the right-hand page of a printed spread, with
// portraits and an alert dial. That is the art pass at M7, and the alert dial
// has nothing to show until M4. This is the plain version of the same panel.

import { terrainAt } from '../map.js';
import { terrainStyle } from './theme.js';

function describeCost(terrain) {
  return terrain.moveCost === null ? 'impassable' : `move ${terrain.moveCost}`;
}

/** Dawn arrives on turn 20 and that is the clock (SPEC.md §4). */
export function renderTurnCounter(element, state, rules) {
  const dawn = state.turn >= rules.turnLimit;
  element.textContent = dawn
    ? `TURN ${state.turn} / ${rules.turnLimit} — DAWN`
    : `TURN ${state.turn} / ${rules.turnLimit}`;
  element.classList.toggle('dawn', dawn);
}

export function renderEndTurnButton(button, state, rules) {
  const dawn = state.turn >= rules.turnLimit;
  button.disabled = dawn;
  button.textContent = dawn ? 'DAWN' : 'END TURN  (space)';
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

    const key = document.createElement('span');
    key.className = 'roster-key';
    key.textContent = String(i + 1);

    const who = document.createElement('span');
    who.className = 'roster-who';
    who.textContent = unit.name;

    const detail = document.createElement('span');
    detail.className = 'roster-detail';
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
 * The per-hex detection risk pips belong here too, and arrive at M4 with the
 * enemies that would generate them.
 */
export function renderReadout(element, state, map, view) {
  const hex = state.hoverHex ?? state.selectedHex;
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
  if (view?.moveLabel) line += `   ▸ ${view.moveLabel}`;
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
