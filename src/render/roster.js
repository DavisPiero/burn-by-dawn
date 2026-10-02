// The roster rail (SPEC.md §11): the six, always visible, in roster order,
// greying out as men are lost. One row each: a portrait and three short lines —
// name and AP, condition or loadout, the name of his trait — with the full
// particulars (where he is, what the trait does) and a bigger portrait as the
// row's rollover. Reads state, never mutates it (CLAUDE.md rule 7); clicks and
// hovers are handed back to the caller.

import { ordersWords, timesWord } from '../hints.js';
import { terrainAt } from '../map.js';
import { portraitId } from './theme.js';
import { attachPopup, capitalise, describeEffect, shortEffect } from './ui.js';

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
    // Out and safe: the row goes army green, all in bold (M13).
    if (unit.out && !lost) slot.classList.add('safe');
    // His number in the leader's blue, as on his counter's strip. A flag, not
    // a name (CLAUDE.md rule 6).
    if (unit.leader) slot.classList.add('leader');

    // The key of Stabilise or Pass on his portrait, while either is open to him (M26).
    const keys = (view.aid ?? []).filter((p) => p.unitId === unit.id).map((p) => AID_KEYS[p.kind]);
    const portrait = html('div', 'slot-face', [face(unit.id), html('span', 'slot-num', String(i + 1)), ...(keys.length ? [html('span', 'slot-aid', keys.join(' '))] : [])]);
    const effects = view.traitEffectsById.get(unit.id) ?? [];
    const text = html('div', 'slot-text', [
      html('div', 'slot-name', [html('span', null, unit.name), html('span', null, apText(unit))]),
      conditionLine(unit),
      html('div', 'slot-line slot-trait', effects.map(shortEffect).join(' · ') || ' '),
    ]);
    slot.append(portrait, text);

    attachPopup(slot, () => describeUnit(unit, i + 1, state, map, view));
    slot.addEventListener('mouseenter', () => handlers.onHover(unit.id));
    slot.addEventListener('mouseleave', () => handlers.onHover(null));
    if (!lost && !unit.out) slot.addEventListener('click', () => handlers.onSelect(unit.id));
    element.appendChild(slot);
  });
}

/** The action each prompt is for (SPEC.md §4 keys). */
const AID_KEYS = { stabilise: 'A', pass: 'E' };

function apText(unit) {
  if (unit.dead || unit.out || !unit.landed) return '';
  return `${unit.ap}/${unit.apMax} AP`;
}

/** His condition in red when something is wrong, or his role and loadout. */
function conditionLine(unit) {
  if (unit.dead) return html('div', 'slot-line slot-warn', `${unit.roleLabel} · KILLED`);
  if (unit.out) return html('div', 'slot-line', `${unit.roleLabel} · OUT — safe`);
  const status = conditions(unit);
  const carrying = unit.charges > 0 ? `${unit.charges} charge${unit.charges === 1 ? '' : 's'}` : null;
  // His condition in red, but never at the cost of the charge he carries (M14
  // bug: a hidden man handed a charge still read "HIDDEN", as taking one
  // costs him no AP and so leaves him hidden).
  if (unit.landed && status.length) {
    return html('div', 'slot-line', [html('span', 'slot-warn', status.join(' · ')), ...(carrying ? [` · ${carrying}`] : [])]);
  }
  const bits = [unit.roleLabel];
  if (carrying) bits.push(carrying);
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

/**
 * The rollover: his portrait, who he is, where he is, what he carries, and
 * what his traits do. His counter on the board shows it too (M22, the
 * operator's: an enemy said plenty when hovered, our men nothing).
 */
export function describeUnit(unit, number, state, map, view) {
  const lines = [`${number}. ${unit.roleLabel}${unit.leader ? ' · leading the stick' : ''}`];
  if (unit.dead) lines.push('Killed.');
  else if (unit.out) lines.push('Out at the exfil: safe.');
  else if (!unit.landed) lines.push('In the aircraft.');
  else {
    const terrain = terrainAt(map, unit.q, unit.r);
    lines.push(`In ${view.place(unit)}${terrain ? ` (cover ${terrain.cover})` : ''}.`);
    lines.push(`${unit.ap} of ${unit.apMax} AP${unit.commandBonus > 0 ? ` (+${unit.commandBonus} orders from the leader)` : ''}${view.weightById?.has(unit.id) ? ` (−${view.weightById.get(unit.id)} for the weight of a charge he did not jump with)` : ''} · ${unit.charges} charge${unit.charges === 1 ? '' : 's'}`);
    const status = conditions(unit);
    if (status.length) lines.push(status.join(' · '));
    if (!unit.everSpotted) lines.push(`Never seen yet: +${view.unseenPoints} score if he gets out unseen.`);
    else lines.push('Seen by the garrison: no stealth bonus for him.');
    if (unit.inContact) lines.push(`In contact: if he is seen again at the end of this turn, he is fired on, unless the enemy is firing at another man (one a turn). Break contact: out of sight, hide, or ${view.returnFire ? 'fire back' : 'suppress'}.`);
    lines.push(...aidLines(unit, state, view));
    const chute = state.parachutes.find((p) => p.q === unit.q && p.r === unit.r);
    if (chute) {
      lines.push(`Standing on ${chute.unitId === unit.id ? 'his' : `${chute.name}'s`} parachute: [U] to pack it.`);
    }
  }
  for (const effect of view.traitEffectsById.get(unit.id) ?? []) {
    lines.push(`${effect.name} — ${capitalise(describeEffect(effect))}`);
  }
  if (unit.leader) lines.push(...leaderLines(unit, state, view.command, view.diversionUses, view.diversionName));
  return [face(unit.id, 'popup-portrait'), html('b', null, unit.name), `\n${lines.join('\n')}`];
}

/**
 * A man's particulars for the readout under the map, while the mouse is on
 * his counter (M23, the operator's: his card in a popup over the board was
 * too busy). { head, note, stamp, rows } for ui.js renderReadout: his name,
 * his number and role, his worst condition as the stamp, and a short row for
 * each thing worth knowing.
 */
export function describeUnitReadout(unit, number, state, map, view) {
  const status = conditions(unit);
  const stamp = status.length ? { word: status[0], tone: STAMP_TONE[status[0]] ?? 'warn' } : null;
  const terrain = terrainAt(map, unit.q, unit.r);
  const charges = unit.charges === 0 ? 'no charges' : `${unit.charges} charge${unit.charges === 1 ? '' : 's'}`;
  const chute = state.parachutes.find((p) => p.q === unit.q && p.r === unit.r);
  const rows = [
    { label: 'HAS', text: `${unit.ap} of ${unit.apMax} AP${unit.commandBonus > 0 ? ` (+${unit.commandBonus} orders)` : ''}${view.weightById?.has(unit.id) ? ` (−${view.weightById.get(unit.id)} the charge's weight)` : ''} · ${charges}` },
    status.length > 1 && { label: 'STATE', text: status.join(' · ').toLowerCase() },
    unit.inContact && { label: 'CONTACT', text: `seen again at the turn's end, he is fired on, unless it is firing at another man: get out of sight, hide [H] or ${view.returnFire ? 'fire back' : 'suppress'} [S]`, tone: 'danger' },
    { label: 'WHERE', text: `${view.place(unit)}${terrain ? ` · cover ${terrain.cover}` : ''}` },
    ...aidLines(unit, state, view).map((text) => ({ label: 'AID', text, tone: 'prompt' })),
    chute && { label: 'CHUTE', text: `on ${chute.unitId === unit.id ? 'his' : `${chute.name}'s`} parachute: [U] to pack it` },
    ...(view.traitEffectsById.get(unit.id) ?? []).map((effect) => ({ label: 'TRAIT', text: `${effect.name}: ${describeEffect(effect)}` })),
    { label: 'SCORE', text: unit.everSpotted ? 'seen already: no stealth bonus' : `never seen: +${view.unseenPoints} if he gets out unseen` },
  ];
  if (unit.leader) {
    const led = state.units.filter((u) => u.commandBonus > 0).length;
    rows.push(
      { label: 'ORDERS', text: `${ordersWords(view.command).replace(/ of him$/, '').replace(/, \+(\d+) AP/, ', +$1')} · ${led === 0 ? 'nobody has' : led === 1 ? '1 has' : `${led} have`} them` },
      { label: 'RADIO', text: `${view.diversionName} [D], ${timesWord(view.diversionUses)} a mission${state.diversionsCalled >= view.diversionUses ? ' · called' : ''}` },
    );
  }
  return { head: unit.name, note: `${number} · ${unit.roleLabel}${unit.leader ? ' · leader' : ''}`, stamp, rows };
}

/**
 * Stabilise and Pass a charge, wherever one is open to this man or to someone
 * beside him (M26): what he can do, or what a neighbour can do for him.
 */
function aidLines(unit, state, view) {
  const name = (id) => state.units.find((u) => u.id === id)?.shortName;
  const lines = [];
  for (const p of view.aid ?? []) {
    if (p.unitId === unit.id) lines.push(p.words);
    else if (p.otherId === unit.id) {
      lines.push(p.kind === 'stabilise'
        ? `${name(p.unitId)} is beside him and can stabilise him: select ${name(p.unitId)}, then [A].`
        : `${name(p.unitId)} is beside him and can pass him a charge: select ${name(p.unitId)}, then [E].`);
    }
  }
  return lines;
}

const STAMP_TONE = { 'IN CONTACT': 'danger', WOUNDED: 'danger', HIDDEN: 'safe' };

/**
 * What the ranking man gives the stick (SPEC.md §5 Command, §4 RAF diversion):
 * his orders, and the radio. Keyed to the `leader` flag, never a name
 * (CLAUDE.md rule 6); the numbers are rules.json's `command` and `diversion.uses`.
 */
function leaderLines(unit, state, command, uses, diversionName) {
  if (unit.dead) return ['He led the stick. His orders and the radio went with him.'];
  const lines = [
    `Orders — at the start of each turn, ${ordersWords(command)}${command.leaderReceivesOwnBonus ? ', himself included' : ''}. Keep the stick close to move faster.`,
  ];
  if (unit.landed && !unit.out) {
    const led = state.units.filter((u) => u.commandBonus > 0).length;
    lines.push(`${led} ${led === 1 ? 'man has' : 'men have'} his orders this turn.`);
  }
  const called = state.diversionsCalled;
  const calledText = !called ? '' : called >= uses ? ' Already called.' : ` Called ${timesWord(called)}.`;
  lines.push(`Radio — he can call the ${diversionName} [D]: ${timesWord(uses)} per mission, only while he lives.${calledText}`);
  return lines;
}
