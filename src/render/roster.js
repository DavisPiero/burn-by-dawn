// The roster rail (SPEC.md §11): the six, always visible, in roster order,
// greying out as men are lost. One row each: a portrait and three short lines —
// name and AP, condition or loadout, the name of his trait — with the full
// particulars (where he is, what the trait does) and a bigger portrait as the
// row's rollover. Reads state, never mutates it (CLAUDE.md rule 7); clicks and
// hovers are handed back to the caller.

import { terrainAt } from '../map.js';
import { portraitId } from './theme.js';
import { attachPopup, describeEffect } from './ui.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function html(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.append(...[].concat(content));
  return node;
}

/**
 * A portrait framed on head and shoulders, 4:5. The drawing is 240 x 300 with
 * headroom; the frame crops to its middle so the face fills a small slot.
 */
function face(unitId, className) {
  const frame = document.createElementNS(SVG_NS, 'svg');
  if (className) frame.setAttribute('class', className);
  frame.setAttribute('viewBox', '24 36 192 240');
  frame.setAttribute('preserveAspectRatio', 'xMidYMid slice');
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `#${portraitId(unitId, 'full')}`);
  use.setAttribute('width', 240);
  use.setAttribute('height', 300);
  frame.appendChild(use);
  return frame;
}

/**
 * @param {HTMLElement} element the rail
 * @param {object} view derived in main.js: traitEffectsById, place
 * @param {{onSelect:Function, onHover:Function}} handlers onHover gets a unit id, or null
 */
export function renderRoster(element, state, map, view, handlers) {
  element.replaceChildren();

  state.units.forEach((unit, i) => {
    const lost = unit.dead;
    const slot = html('li', 'slot');
    if (unit.id === state.selectedUnitId) slot.classList.add('selected');
    if (lost) slot.classList.add('lost');
    // His number in the leader's blue, as on his counter's strip. A flag, not
    // a name (CLAUDE.md rule 6).
    if (unit.leader) slot.classList.add('leader');

    const portrait = html('div', 'slot-face', [face(unit.id), html('span', 'slot-num', String(i + 1))]);
    const effects = view.traitEffectsById.get(unit.id) ?? [];
    const text = html('div', 'slot-text', [
      html('div', 'slot-name', [html('span', null, unit.name), html('span', null, apText(unit))]),
      conditionLine(unit),
      html('div', 'slot-line slot-trait', effects.map((e) => e.name).join(' · ') || ' '),
    ]);
    slot.append(portrait, text);

    attachPopup(slot, () => describeUnit(unit, i + 1, state, map, view));
    slot.addEventListener('mouseenter', () => handlers.onHover(unit.id));
    slot.addEventListener('mouseleave', () => handlers.onHover(null));
    if (!lost && !unit.out) slot.addEventListener('click', () => handlers.onSelect(unit.id));
    element.appendChild(slot);
  });
}

function apText(unit) {
  if (unit.dead || unit.out || !unit.landed) return '';
  return `${unit.ap}/${unit.apMax} AP`;
}

/** His condition in red when something is wrong, or his role and loadout. */
function conditionLine(unit) {
  if (unit.dead) return html('div', 'slot-line slot-warn', `${unit.roleLabel} · KILLED`);
  if (unit.out) return html('div', 'slot-line', `${unit.roleLabel} · OUT — safe`);
  const status = conditions(unit);
  if (unit.landed && status.length) return html('div', 'slot-line slot-warn', status.join(' · '));
  const bits = [unit.roleLabel];
  if (unit.charges > 0) bits.push(`${unit.charges} charge${unit.charges === 1 ? '' : 's'}`);
  if (unit.commandBonus > 0) bits.push(`+${unit.commandBonus} orders`);
  if (unit.leader) bits.push('leading');
  return html('div', 'slot-line', bits.join(' · '));
}

function conditions(unit) {
  const parts = [];
  if (unit.hits > 0) parts.push(unit.stabilised ? 'DRESSED' : 'WOUNDED');
  if (unit.inContact) parts.push('IN CONTACT');
  if (unit.pinned) parts.push('PINNED');
  if (unit.hidden) parts.push('HIDDEN');
  if (unit.turnsLost > 0) parts.push('BAD LANDING');
  return parts;
}

/** The rollover: his portrait, who he is, where he is, what he carries, and what his traits do. */
function describeUnit(unit, number, state, map, view) {
  const lines = [`${number}. ${unit.roleLabel}${unit.leader ? ' · leading the stick' : ''}`];
  if (unit.dead) lines.push('Killed.');
  else if (unit.out) lines.push('Out at the exfil: safe.');
  else if (!unit.landed) lines.push('In the aircraft.');
  else {
    const terrain = terrainAt(map, unit.q, unit.r);
    lines.push(`In ${view.place(unit)}${terrain ? ` (cover ${terrain.cover})` : ''}.`);
    lines.push(`${unit.ap} of ${unit.apMax} AP${unit.commandBonus > 0 ? ` (+${unit.commandBonus} orders from the leader)` : ''} · ${unit.charges} charge${unit.charges === 1 ? '' : 's'}`);
    const status = conditions(unit);
    if (status.length) lines.push(status.join(' · '));
    if (state.parachutes.some((p) => p.unitId === unit.id && p.q === unit.q && p.r === unit.r)) {
      lines.push('Standing on his parachute: [U] to pack it.');
    }
  }
  for (const effect of view.traitEffectsById.get(unit.id) ?? []) {
    lines.push(`${effect.name} — ${describeEffect(effect)}`);
  }
  return [face(unit.id, 'popup-portrait'), html('b', null, unit.name), `\n${lines.join('\n')}`];
}
