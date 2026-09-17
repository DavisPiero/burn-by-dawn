// The roster rail (SPEC.md §11): the six portraits, always visible, in roster
// order, greying out as men are lost. Each slot is compact — face, number,
// name, AP and one line of condition — and everything else about the man is
// its rollover. Reads state, never mutates it (CLAUDE.md rule 7); a click is
// handed back to the caller.

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
 * @param {HTMLElement} element the rail
 * @param {object} view derived in main.js: traitEffectsById, place
 * @param {Function} onSelect called with a unit id
 */
export function renderRoster(element, state, map, view, onSelect) {
  element.replaceChildren();

  state.units.forEach((unit, i) => {
    const lost = unit.dead;
    const slot = html('li', 'slot');
    if (unit.id === state.selectedUnitId) slot.classList.add('selected');
    if (lost) slot.classList.add('lost');
    // The same colour as his counter's name strip, so the rail and the board
    // point at the same man. A flag, not a name (CLAUDE.md rule 6).
    if (unit.leader) slot.classList.add('leader');

    const face = document.createElementNS(SVG_NS, 'svg');
    face.setAttribute('class', 'portrait');
    // Framed on the head and shoulders: at slot size the full drawing's
    // headroom would leave the face small.
    face.setAttribute('viewBox', '20 44 200 236');
    face.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#${portraitId(unit.id, 'full')}`);
    use.setAttribute('width', 240);
    use.setAttribute('height', 300);
    face.appendChild(use);

    const stamp = stampFor(unit);
    const strip = html('div', 'slot-strip', [
      html('div', 'slot-name', [html('span', null, unit.shortName), html('span', null, apText(unit))]),
      html('div', 'slot-line', lineFor(unit)),
    ]);
    slot.append(face, html('span', 'slot-num', String(i + 1)), strip);
    if (stamp) slot.appendChild(html('span', `slot-stamp${stamp.className ? ` ${stamp.className}` : ''}`, stamp.text));

    attachPopup(slot, () => describeUnit(unit, i + 1, state, map, view));
    if (!lost && !unit.out) slot.addEventListener('click', () => onSelect(unit.id));
    element.appendChild(slot);
  });
}

function apText(unit) {
  if (unit.dead || unit.out || !unit.landed) return '';
  return `${unit.ap}/${unit.apMax}`;
}

/** One line under his name: his condition, or his loadout when there is nothing wrong. */
function lineFor(unit) {
  if (unit.dead) return 'killed';
  if (unit.out) return 'out — safe';
  if (!unit.landed) return `${unit.roleLabel} · in the aircraft`;
  const status = conditions(unit);
  if (status.length) return status.join(' · ');
  const bits = [unit.roleLabel.toLowerCase()];
  if (unit.charges > 0) bits.push(`${unit.charges} charge${unit.charges === 1 ? '' : 's'}`);
  if (unit.commandBonus > 0) bits.push(`+${unit.commandBonus} orders`);
  return bits.join(' · ');
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

/** A rubber stamp across the portrait for the states that matter at a glance. */
function stampFor(unit) {
  if (unit.dead) return { text: 'KILLED' };
  if (unit.out) return { text: 'OUT', className: 'safe' };
  if (unit.inContact) return { text: 'IN CONTACT', className: 'warn' };
  if (unit.hits > 0 && !unit.stabilised) return { text: 'WOUNDED', className: 'warn' };
  return null;
}

/** The rollover: who he is, where he is, what he carries, and what his traits do. */
function describeUnit(unit, number, state, map, view) {
  const lines = [`${number}. ${unit.roleLabel}${unit.leader ? ' · leading the stick' : ''}`];
  if (unit.dead) lines.push('Killed.');
  else if (unit.out) lines.push('Out at the exfil: safe.');
  else if (!unit.landed) lines.push('In the aircraft.');
  else {
    const terrain = terrainAt(map, unit.q, unit.r);
    lines.push(`In ${view.place(unit)}${terrain ? ` (${terrain.label.toLowerCase()}, cover ${terrain.cover})` : ''}.`);
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
  const heading = html('b', null, unit.name);
  return [heading, `\n${lines.join('\n')}`];
}
