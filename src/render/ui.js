// The right-hand page and the captions under the board: the clock, End turn,
// the actions, the alert dial, the mission briefing, the turn report, the
// hover readout, the rollover popups and the back-page results. The roster
// rail is roster.js. Reads state and map data, never mutates them (CLAUDE.md
// hard rule 7) — clicks are handed straight back to the caller.

import { timesWord } from '../hints.js';
import { axialToPixel, hexDistance } from '../hex.js';
import { columnOf, moveCostAt, terrainAt } from '../map.js';
import { ALERT_STATE, DAWN, DIAL, portraitId, timePencilId } from './theme.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
}

function html(tag, className, content) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.append(...[].concat(content));
  return node;
}

// --- rollovers (SPEC.md §11) ---------------------------------------------------
// Detail lives in popups rather than on the page: the drop runs, the keys, the
// alert thresholds, each man's particulars. One popup element: for anything on
// the right page it sits just left of the page, level with what is hovered, so
// it covers the board rather than the panel; for anything else, below it.

const popupBox = () => document.getElementById('popup');
let popupAnchor = null;

/** Show `content` (text, or a node) beside `anchor`. */
export function showPopup(anchor, content) {
  const box = popupBox();
  if (!box) return;
  const parts = [].concat(typeof content === 'function' ? content() : content);
  // Every key a rollover mentions is set in bold (M12), whoever worded it.
  box.replaceChildren(...parts.flatMap((part) => (typeof part === 'string' ? boldKeys(part) : [part])));
  box.hidden = false;
  popupAnchor = anchor;
  const a = anchor.getBoundingClientRect();
  const b = box.getBoundingClientRect();
  const panel = anchor.closest?.('#panel');
  const onPanel = Boolean(panel);
  let x = onPanel ? panel.getBoundingClientRect().left - b.width - 6 : a.left;
  let y = onPanel ? a.top : a.bottom + 8;
  x = Math.max(8, Math.min(x, window.innerWidth - b.width - 8));
  if (y + b.height > window.innerHeight - 8) y = onPanel ? window.innerHeight - b.height - 8 : a.top - b.height - 8;
  box.style.left = `${Math.round(x)}px`;
  box.style.top = `${Math.round(Math.max(8, y))}px`;
}

export function hidePopup() {
  const box = popupBox();
  if (box) box.hidden = true;
  popupAnchor = null;
}

/**
 * Hide the popup if what it belongs to has been redrawn away — a drop-run tab
 * clicked, say — since the removed element will never report the mouse leaving.
 */
export function dropStalePopup() {
  if (popupAnchor && !popupAnchor.isConnected) hidePopup();
}

/** A rollover's usual content: a bold heading, then the text under it. */
export function titled(heading, body) {
  return [html('b', null, heading), `\n${capitalise(body)}`];
}

/**
 * A description's first word with a capital (M16, the operator's: "capitalise
 * the first word in descriptions"), for text that follows a label — a bold
 * heading, "Not now:", a trait's name, a bar in the readout. Words are worked
 * out in lower case, as they are often run into a sentence; this is only for
 * where one stands on its own.
 */
export function capitalise(text) {
  return typeof text === 'string' && text ? text[0].toUpperCase() + text.slice(1) : text;
}

/** Give an element a rollover. `content` may be a function, so it is built when shown. */
export function attachPopup(element, content) {
  element.addEventListener('mouseenter', () => showPopup(element, content));
  element.addEventListener('mouseleave', hidePopup);
}

// SPEC.md §4's keys, for the KEYBOARD rollover: one to a line, in the
// order of the keys (M13), each key in bold.
const KEYS = [
  ['1–3', 'pick a drop run'],
  ['1–6', 'select a man'],
  ['A', 'stabilise a wounded man (aid)'],
  ['C', 'place a charge'],
  ['D', 'the diversion (the leader\'s radio)'],
  ['E', 'pass a charge'],
  ['Esc', 'deselect, or back out of aiming (or right-click)'],
  ['H', 'hide'],
  ['K', 'kill (gunners)'],
  ['M', 'sound on or off'],
  ['N', 'knife'],
  ['P', 'pick up a charge'],
  ['R', 'patrol routes'],
  ['S', 'suppress (gunners); return fire (a man who has been seen)'],
  ['Space', 'jump, then end turn'],
  ['T', 'throw a stone'],
  ['Tab', 'next man'],
  ['U', 'pack chute'],
  ['W', 'swim'],
  ['X', 'cut the line (scouts)'],
  ['Z', 'undo'],
  ['?', 'how to play, at any time'],
];

export function renderKeys(button) {
  attachPopup(button, () => [
    html('b', null, 'KEYBOARD'),
    ...KEYS.flatMap(([key, what]) => ['\n', html('b', null, key), ` ${capitalise(what)}`]),
    '\n\nHover an enemy for its arc and route, an objective for what it needs, a report line to see where.',
  ]);
}

// --- fitting the spread to the window ---------------------------------------
// The board is the game, so it takes all the room it can: as tall as the page
// allows under the captions, or as wide as the page allows beside the right
// page. The right page's share grows with the window (panelShare of it, from
// panelMin to panelMax); it takes whatever the board leaves, up to panelMax,
// and past that the spread is centred on the table. What the left page
// has spare below a width-limited board goes to the captions. These numbers
// are index.html's paddings and gaps, which must agree with them.

export const SPREAD = {
  minWidth: 1280,
  minHeight: 760,
  minScale: 0.75, // the most the spread is zoomed down to fit a small window (M12b)
  marginX: 8 + 22, // spread padding left and right (index.html #spread)
  marginY: 8 + 8,
  leftChromeX: 20 + 4 + 2 + 16, // outer gutter, its gap, left page padding
  leftChromeY: 10 + 10 + 8, // left page padding, gap above the captions
  // Taller since M22 (92 to 170 until then), the operator's: a little more
  // room under the map; up to all the left page has spare below a
  // width-limited board.
  captionMin: 140,
  captionMax: 210,
  panelMin: 380,
  panelMax: 480,
  panelShare: 0.27,
};

/** Size the board, captions and right page to the window. `aspect` is the board's width over height. */
export function fitSpread(aspect, root = document.documentElement) {
  // A window smaller than the spread's minimum (a Chromebook's 1200 across,
  // M12b) shows the same spread zoomed down to fit, never a different layout;
  // below SPREAD.minScale it stops shrinking and the page scrolls instead.
  const scale = Math.max(SPREAD.minScale, Math.min(1, window.innerWidth / SPREAD.minWidth, window.innerHeight / SPREAD.minHeight));
  const width = Math.max(window.innerWidth / scale, SPREAD.minWidth);
  const height = Math.max(window.innerHeight / scale, SPREAD.minHeight);
  root.classList.toggle('scaled', scale < 1);
  root.style.setProperty('--spread-zoom', String(scale));
  root.style.setProperty('--spread-w', `${Math.floor(width)}px`);
  root.style.setProperty('--spread-h', `${Math.floor(height)}px`);
  const across = width - SPREAD.marginX - SPREAD.leftChromeX;
  const down = height - SPREAD.marginY - SPREAD.leftChromeY;
  const panelWanted = Math.min(SPREAD.panelMax, Math.max(SPREAD.panelMin, width * SPREAD.panelShare));
  const boardW = Math.floor(Math.min((down - SPREAD.captionMin) * aspect, across - panelWanted));
  const boardH = Math.floor(boardW / aspect);
  const panelW = Math.min(SPREAD.panelMax, across - boardW);
  const captionH = Math.min(SPREAD.captionMax, down - boardH);
  root.style.setProperty('--left-w', `${boardW + SPREAD.leftChromeX}px`);
  root.style.setProperty('--panel-w', `${panelW}px`);
  root.style.setProperty('--board-h', `${boardH}px`);
  root.style.setProperty('--caption-h', `${captionH}px`);
}

/** The cut-out note down the outer margin (ART-ASSETS.md ui-gutter-note). */
export function renderGutter(svg) {
  svg.replaceChildren(svgEl('use', { href: '#ui-gutter-note', width: 60, height: 900 }));
}

// --- places -------------------------------------------------------------------
// The hexes carry no printed coordinates (SPEC.md §11), so text names a place
// the way a briefing would: by the objective it is beside, or the part of the
// map it is in.

/** "the marsh by the rail bridge", "the field by Ferme Lebrun", "the field in the north-west". */
export function placeName(map, objectives, exfil, hex) {
  const terrain = terrainAt(map, hex.q, hex.r);
  const ground = terrain ? terrain.label.toLowerCase() : 'ground';
  let near = null;
  let best = Infinity;
  const landmarks = [...objectives.map((o) => ({ label: o.label, hexes: o.hexes }))];
  if (exfil.length) landmarks.push({ label: 'exfil', hexes: exfil });
  // Named places are proper names: no "the", and their own case. An
  // objective or the exfil wins a tie, being listed first.
  for (const place of map.places ?? []) landmarks.push({ label: place.name, proper: true, hexes: [{ q: place.at[0], r: place.at[1] }] });
  for (const mark of landmarks) {
    for (const h of mark.hexes) {
      const d = hexDistance(h, hex);
      if (d < best) { best = d; near = mark; }
    }
  }
  const named = near && (near.proper ? near.label : `the ${near.label}`);
  if (near && best === 0) return near.proper ? `the ${ground} at ${named}` : named;
  if (near && best <= 2) return `the ${ground} by ${named}`;
  const across = columnOf(hex.q, hex.r) / map.width;
  const down = hex.r / map.height;
  const ns = down < 1 / 3 ? 'north' : down >= 2 / 3 ? 'south' : '';
  const ew = across < 1 / 3 ? 'west' : across >= 2 / 3 ? 'east' : '';
  const region = [ns, ew].filter(Boolean).join('-');
  return region ? `the ${ground} in the ${region}` : `the ${ground} mid-map`;
}

// --- the alert dial -----------------------------------------------------------

/**
 * The garrison alert dial, SPEC.md §6. The face and needle are registry
 * sprites; the active state is named beside it, and the thresholds are its
 * rollover (SPEC.md §11). `alert` is derived in main.js:
 * { index, states, points, quietTurns, quietTurnsToDecay, floor }.
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

  const state = alert.states[alert.index];
  const chip = html('span', 'alert-state', state.label.toUpperCase());
  chip.style.background = ALERT_STATE[state.id];
  chip.style.color = ALERT_STATE.text;
  // Several events share one state (SPEC.md §6), so the needle alone cannot
  // warn that the next sighting tips the dial. A pip per point, grouped by the
  // state each point is in and printed in its colour, says how close the next
  // state is without a number to decode (M11: players could not read "0 pts").
  const pips = html('div', 'alert-pips');
  const top = alert.states.at(-1).from;
  for (let p = 1; p <= top; p++) {
    const at = alert.states.findLastIndex((st) => st.from <= p);
    const pip = html('span', alert.states[at].from === p && p > 1 ? 'pip gap' : 'pip');
    if (p <= alert.points) pip.style.background = ALERT_STATE[alert.states[at].id];
    pips.appendChild(pip);
  }
  const next = alert.states[alert.index + 1];
  const parts = [];
  if (next) parts.push(`${next.label} in ${next.from - alert.points} pip${next.from - alert.points === 1 ? '' : 's'}`);
  if (alert.canEase) {
    const left = alert.quietTurnsToDecay - alert.quietTurns;
    parts.push(`${left} quiet turn${left === 1 ? '' : 's'} to ease`);
  } else if (alert.points > 0 && alert.floor) {
    parts.push('held up by the bang');
  }
  caption.replaceChildren(
    html('div', 'alert-heading', 'GARRISON ALERT'),
    html('div', 'alert-level', [chip, pips]),
    ...parts.map((part) => html('div', 'alert-note', part)),
  );
}

/** The dial's rollover: every state, where it starts, and what it does. */
export function describeAlertStates(alert) {
  const lines = alert.states.map((s, i) => {
    const mark = i === alert.index ? '▶ ' : '  ';
    return `${mark}${s.label} — from ${s.from} pip${s.from === 1 ? '' : 's'} · vision +${s.visionBonus} · looks harder +${s.detectionBonus} · hearing +${s.hearingBonus}`;
  });
  return [
    html('b', null, 'GARRISON ALERT'),
    `\n${lines.join('\n')}\n\nEach pip is a point: ${alert.sources.join(', ')}.`
      + `\nAfter ${alert.quietTurnsToDecay} quiet turns (nothing raised, nobody seen) it eases to the start of the state below.`
      + (alert.floor ? `\nOnce anything has exploded it never eases below ${alert.floor}.` : ''),
  ];
}

// --- the briefing card (SPEC.md §11) ---------------------------------------------

// How much a line of the turn report matters, lowest first: the card puts the
// worst news at the top and cuts from the bottom.
const EVENT_WEIGHT = {
  killed: 0, blastKilled: 0, wounded: 1, blastWounded: 1, explosion: 1, train: 1, enemyBlastKilled: 1, noReserve: 1, withdrawn: 1, reinforcementsCalled: 1, reserve: 2, reinforcements: 2, spotted: 2, diversion: 2,
  pinned: 3, alertRise: 3, bodyFound: 3, parachuteFound: 3, canisterFound: 3, boat: 1, searched: 4, canisterLanded: 4, heard: 4, alertDecay: 5, landed: 5,
};

const DEATHS = new Set(['killed', 'blastKilled']);

/**
 * The report's events in reading order (M13): everything about one man
 * together, in the order it happened but with his death always last, each
 * man's lines placed by the worst of them; other lines by how much they
 * matter. The card and the report under the map both read it this way.
 */
export function orderReport(events) {
  const items = events.map((event, i) => ({ event, i, weight: EVENT_WEIGHT[event.kind] ?? 4, group: event.unitId ?? `#${i}` }));
  const groups = new Map();
  for (const item of items) {
    const group = groups.get(item.group);
    if (!group) groups.set(item.group, { weight: item.weight, first: item.i });
    else group.weight = Math.min(group.weight, item.weight);
  }
  const death = (item) => Number(DEATHS.has(item.event.kind));
  return items
    .sort((a, b) => {
      const ga = groups.get(a.group), gb = groups.get(b.group);
      return ga.weight - gb.weight || ga.first - gb.first || death(a) - death(b) || a.i - b.i;
    })
    .map(({ event }) => event);
}

/** The report's lines, most important first, as the card shows them. */
export function rankedReport(events, place) {
  return orderReport(events).map((event) => describeEvent(event, place));
}

/**
 * The title card, drawn or painted (theme.js TITLE_CARD), with the title set
 * over it in type and the tagline along its foot. Heads the orders, and the
 * back page smaller.
 */
function titleBanner({ title, tagline }) {
  const art = svgEl('svg', { class: 'title-banner-art', viewBox: '0 0 600 150', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' });
  art.appendChild(svgEl('use', { href: '#title-card', width: 600, height: 150 }));
  const parts = [art, html('h1', 'title-banner-title', title)];
  if (tagline) parts.push(html('div', 'title-banner-tagline', tagline));
  return html('div', 'title-banner', parts);
}

/**
 * Show the briefing card, or hide it when `briefing` is null. `briefing` is
 * { banner?: { title, tagline }, title, kicker, tone?, names?, paragraphs? (each a string, or lines), sections: [{ heading, lines, more?, hints? }],
 *   toggle?: { on }, choice?: { heading, options: [{ id, label, summary, selected }], onChoose(id) },
 *   contents?: { entries: [{ id, page, title, place, blurb, playable, panel? }], onChoose(id) } }
 * — worded in main.js. `onToggle(on)` is the turn-update box.
 */
export function renderBriefing(backdrop, card, briefing, onToggle) {
  backdrop.hidden = !briefing;
  backdrop.classList.toggle('orders', Boolean(briefing?.banner));
  if (!briefing) return;
  card.replaceChildren();
  card.className = briefing.tone ? `tone-${briefing.tone}` : '';
  // The title card, over the orders only: the `title-card` sprite, drawn or
  // painted (theme.js TITLE_CARD), with the title set over it in type.
  if (briefing.banner) card.appendChild(titleBanner(briefing.banner));
  // On the orders the level comes first, in the black bar, and the card's own
  // head goes under it in ink on the paper (M15, the operator's).
  const top = Boolean(briefing.choice?.top);
  if (top) card.appendChild(html('div', 'brief-top bar', briefChoice(briefing.choice)));
  card.appendChild(html('div', top ? 'brief-head plain' : 'brief-head', [html('span', 'brief-title', briefing.title), html('span', 'brief-kicker', briefing.kicker)]));
  // A paragraph may be several lines, each on its own line (M13); a line given
  // as { bold } is set in bold whole (M31d: the job on the orders).
  for (const text of briefing.paragraphs ?? []) {
    const lines = [].concat(text).map((line) => (typeof line === 'string' ? boldNames(line, briefing.names) : [html('b', null, line.bold)]));
    card.appendChild(html('p', null, lines.flatMap((line, i) => (i ? [html('br'), ...line] : line))));
  }
  if (briefing.contents) card.appendChild(contentsList(briefing.contents));
  for (const section of briefing.sections) {
    if (!section.lines.length) continue;
    card.appendChild(html('h3', null, section.heading));
    const list = html('ul', section.hints ? 'brief-hints' : null, section.lines.map((line) => html('li', null, boldNames(line, briefing.names))));
    if (section.more) list.appendChild(html('li', 'brief-more', section.more));
    card.appendChild(list);
  }
  const foot = html('div', 'brief-foot');
  if (briefing.toggle) {
    const box = html('input');
    box.type = 'checkbox';
    box.checked = briefing.toggle.on;
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => (briefing.toggle.onChange ?? onToggle)(box.checked));
    // The turn cards' box, or another card's own (M21: music off, on the orders).
    const label = html('label', null, [box, briefing.toggle.label ?? ' Brief me at the start of every turn']);
    label.addEventListener('click', (event) => event.stopPropagation());
    foot.appendChild(label);
  } else if (briefing.choice && !briefing.choice.top) {
    foot.appendChild(briefChoice(briefing.choice));
  } else if (briefing.confirm) {
    // The one card with a choice to make (M14, the exfil): its button acts,
    // any other key or click backs out.
    const button = html('button', 'btn', boldKeys(briefing.confirm.label));
    button.type = 'button';
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      briefing.confirm.onConfirm();
    });
    foot.appendChild(button);
  } else {
    foot.appendChild(html('span'));
  }
  foot.appendChild(html('span', 'brief-go', boldKeys(briefing.go ?? 'CARRY ON — any key or click')));
  card.appendChild(foot);
  fitBriefing(card);
}

/**
 * A card taller than the window is set tighter, a step at a time, before
 * anything is cut (M31d: the airfield's orders ran off the foot at 1280x800):
 * first the air between its parts, then the type to 14 px, then 13 (index.html
 * `data-fit`). Never below 13, the right page's least (SPEC.md §11).
 */
const BRIEFING_FIT_STEPS = 3;
// Fitted again when the window is resized, as the spread is (M31d).
let fittedCard = null;
if (typeof window !== 'undefined') window.addEventListener('resize', () => fittedCard && fitBriefing(fittedCard));
function fitBriefing(card) {
  fittedCard = card;
  delete card.dataset.fit;
  for (let step = 1; step <= BRIEFING_FIT_STEPS && card.scrollHeight > card.clientHeight + 1; step++) {
    card.dataset.fit = String(step);
  }
}

/**
 * The contents page (M27): each mission as a line of the annual's contents,
 * its title run to its page number with a dotted leader, where it is set and
 * a line about it under. A playable one is a button; a coming one is printed
 * all the same but stamped NEXT YEAR'S ANNUAL, and a click on it does nothing.
 */
function contentsList({ entries, onChoose }) {
  const list = html('ol', 'contents');
  for (const entry of entries) {
    const line = html('span', 'contents-line', [
      html('span', 'contents-title', entry.title),
      html('span', 'contents-leader'),
      html('span', 'contents-page', String(entry.page)),
    ]);
    const text = [line, html('span', 'contents-place', entry.place), html('span', 'contents-blurb', entry.blurb)];
    // Its panel beside it, if it has one (M31c, ART-ASSETS.md §7): a small
    // painting, as an annual's contents page has a picture for each story.
    const words = [html('span', 'contents-words', text)];
    if (entry.panel) {
      const panel = html('img', 'contents-panel');
      panel.src = entry.panel;
      panel.alt = '';
      words.unshift(panel);
    }
    const item = html('li', entry.playable ? 'contents-entry' : 'contents-entry coming');
    if (entry.playable) {
      const button = html('button', 'contents-pick', words);
      button.type = 'button';
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        onChoose(entry.id);
      });
      item.appendChild(button);
    } else {
      item.append(html('div', 'contents-pick', words), html('span', 'contents-stamp', 'NEXT YEAR’S ANNUAL'));
      item.addEventListener('click', (event) => event.stopPropagation());
    }
    list.appendChild(item);
  }
  return list;
}

/**
 * A row of buttons in the card's foot, one picked; what each changes is its
 * rollover, as the orders have no room for another line at 1280x800. A click
 * picks and does not put the card away, as every other click on the card does.
 */
function briefChoice(choice) {
  const row = html('div', 'brief-choice', [html('span', 'brief-choice-head', choice.heading)]);
  // Locked (M16, the orders opened again in play): only the level being
  // played, and a click on it carries on like any other.
  if (choice.locked) {
    const picked = choice.options.find((o) => o.selected);
    const button = html('button', 'btn active', picked.label.toUpperCase());
    button.type = 'button';
    attachPopup(button, [html('b', null, picked.label.toUpperCase()), `\n${picked.summary}\nFixed once the stick has jumped.`]);
    row.appendChild(button);
    return row;
  }
  for (const option of choice.options) {
    const button = html('button', option.selected ? 'btn active' : 'btn', option.label.toUpperCase());
    button.type = 'button';
    button.setAttribute('aria-pressed', String(option.selected));
    attachPopup(button, [html('b', null, option.label.toUpperCase()), `\n${option.summary}${option.selected ? '' : '\nClick to play at this level.'}`]);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      choice.onChoose(option.id);
    });
    row.appendChild(button);
  }
  row.addEventListener('click', (event) => event.stopPropagation());
  return row;
}

// --- the turn report ----------------------------------------------------------

/**
 * What happened at the last turn boundary, in words. A line about a place
 * rings that hex on the board while it is hovered: `onLocate(hex | null)`.
 */
export function renderReport(element, state, place, onLocate, earlier = []) {
  element.replaceChildren();
  if (state.phase === 'drop') {
    // A plain line, not a log line with a mark (M22: M21b's mark column took it, a word to a line).
    element.appendChild(html('li', 'rep-note', 'The Dakota troop aircraft flies one of these lines; your men jump along it and drift downwind a hex or two. Pick a run, then jump.'));
    return;
  }
  // A log (M21b, the operator's: it read as a wall of text): a bar for each
  // turn, this one first and the two before it faded under it; each line
  // with the board's mark for what it is, bad news in red, routine in grey.
  const names = state.units.map((u) => u.shortName);
  const turns = [{ turn: state.turn, events: state.report }, ...earlier.slice(0, 2)];
  turns.forEach(({ turn, events }, k) => {
    const old = k > 0 ? ' old' : '';
    element.appendChild(html('li', `rep-turn${old}`, turn === 1 ? 'THE DROP · TURN 1' : `END OF TURN ${turn - 1} · TURN ${turn}`));
    if (events.length === 0) {
      element.appendChild(html('li', `rep-none${old}`, turn === 1 ? 'No reports yet.' : 'A quiet night. Nothing seen.'));
      return;
    }
    for (const event of orderReport(events)) {
      const weight = EVENT_WEIGHT[event.kind] ?? 4;
      const tone = weight <= 1 ? 'grave' : weight <= 3 ? 'warn' : 'quiet';
      const item = html('li', `rep-${tone}${old}`, [reportMark(event.kind), html('span', 'rep-text', boldNames(describeEvent(event, place), names))]);
      if (!old && Number.isInteger(event.q) && Number.isInteger(event.r)) {
        item.classList.add('located');
        item.addEventListener('mouseenter', () => onLocate({ q: event.q, r: event.r }));
        item.addEventListener('mouseleave', () => onLocate(null));
      }
      element.appendChild(item);
    }
  });
}

/**
 * The report's scroll buttons (M22, the operator's: the wheel alone was
 * fiddly in so small a box): ▲ and ▼ step most of a box at a time, each
 * greyed at its end, both hidden while everything fits. Returns the function
 * that brings them up to date, for after each redraw.
 */
export function attachReportScroll(list, strip, up, down) {
  const sync = () => {
    const max = list.scrollHeight - list.clientHeight;
    strip.hidden = max <= 1;
    up.disabled = list.scrollTop <= 1;
    down.disabled = list.scrollTop >= max - 1;
  };
  const step = (sign) => list.scrollBy({ top: sign * Math.max(40, list.clientHeight * 0.7), behavior: 'smooth' });
  up.addEventListener('click', () => step(-1));
  down.addEventListener('click', () => step(1));
  list.addEventListener('scroll', sync);
  window.addEventListener('resize', sync);
  return sync;
}

// The board's own mark for a line of the report (M21b), from the sprites in
// the board's defs; a plain dot for the rest.
const REPORT_MARKS = {
  spotted: 'marker-spotted', pinned: 'marker-spotted', wounded: 'marker-wounded', blastWounded: 'marker-wounded',
  killed: 'marker-body', blastKilled: 'marker-body', explosion: 'marker-blast', enemyBlastKilled: 'marker-blast',
  bodyFound: 'marker-body', parachuteFound: 'marker-parachute', landed: 'marker-parachute',
  canisterLanded: 'marker-canister', canisterFound: 'marker-canister',
};

function reportMark(kind) {
  const box = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  box.setAttribute('class', 'rep-mark');
  box.setAttribute('viewBox', '0 0 20 20');
  const id = REPORT_MARKS[kind];
  if (id) {
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${id}`);
    use.setAttribute('width', 20);
    use.setAttribute('height', 20);
    box.appendChild(use);
  } else {
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', 10);
    dot.setAttribute('cy', 10);
    dot.setAttribute('r', 3);
    dot.setAttribute('class', 'rep-dot');
    box.appendChild(dot);
  }
  return box;
}

// The mission's own phrases for the turn report (data/missions.json `words`,
// M28), set once when the mission loads.
let missionWords = { diversionName: 'RAF diversion', diversionLog: 'bombers over the target' };

/** Use this mission's phrases in the turn report. */
export function useMissionWords(words) {
  missionWords = { ...missionWords, ...words };
}

export function describeEvent(event, place) {
  const at = () => place({ q: event.q, r: event.r });
  switch (event.kind) {
    case 'spotted': return `${event.unitName} spotted by ${event.enemyLabel} in ${at()}${HID_WORDS[event.hid] ?? ''}.`;
    case 'alertRise': return `Alert rises: ${event.from} → ${event.to}.`;
    // The goods train (M34): scenery, said as it comes, crosses, stops or is wrecked.
    case 'train': return {
      comes: `The ${event.label.toLowerCase()} comes on from the west: on the ${event.target} in the garrison's turn ${event.crossesOn}.`,
      crosses: `The ${event.label.toLowerCase()} is on the ${event.target}.`,
      halts: `The ${event.label.toLowerCase()} stops short: the ${event.target} is gone.`,
      wrecked: `The ${event.label.toLowerCase()} goes down with the ${event.target}!`,
    }[event.what];
    case 'alertDecay': return `Alert eases: ${event.from} → ${event.to}.`;
    case 'reserve': return `${event.label} arrives on the road, ${at()}.`;
    case 'reinforcements': return `${event.label} come on down the road, ${at()}, making for the way to the exfil.`;
    case 'reinforcementsCalled': return `The garrison calls up ${event.count === 1 ? 'a squad' : `${event.count} squads`} of reinforcements after the ${event.label}: on next turn.`;
    case 'searched': return `${event.label} reaches ${at()} and searches it.`;
    case 'wounded': return `${event.unitName} is hit by ${listOf(event.by)} — wounded.`;
    case 'killed': return `${event.unitName} is hit by ${listOf(event.by)} — killed.`;
    case 'pinned': return `${event.unitName} is fired on by ${listOf(event.by)} — pinned, not hit (heavy cover, or too far off to hit him).`;
    case 'heard': return `${listOf(event.labels)} react${event.labels.length === 1 ? 's' : ''} to ${NOISE_WORDS[event.noise] ?? 'something'} in ${at()}.`;
    case 'bodyFound': return `${event.label} finds ${event.name}'s body in ${at()}.`;
    case 'parachuteFound': return `${event.label} finds ${event.name}'s parachute in ${at()}.`;
    case 'landed': return describeLanding(event, at());
    // Supply canisters (SPEC.md §9, M41).
    case 'canisterLanded': return `A canister comes down in ${at()}: ${event.charges} ${event.charges === 1 ? 'charge' : 'charges'} in it.`;
    case 'canisterFound': return `${event.label} finds a canister in ${at()}. Its charges are still in it.`;
    // The boat (SPEC.md §10, M41): scenery, said as it is sighted and as it comes in.
    case 'boat': return {
      sighted: `The boat is sighted, coming in: on the beach on turn ${event.opens}.`,
      in: `The boat is in. The way out is open until dawn, the end of turn ${event.leaves}.`,
    }[event.what];
    case 'explosion': if (event.setOffBy) return `The ${event.label} beside it goes up with the ${event.setOffBy}. Destroyed.`;
      return event.destroyed ? `BOOM — the ${event.label} goes up. Destroyed.` : `BOOM — a charge goes off on the ${event.label}. It still stands.`;
    case 'blastKilled': return `${event.unitName} is caught in the blast at the ${event.label} — killed.`;
    case 'blastWounded': return `${event.unitName} is caught at the edge of the blast at the ${event.label} — wounded.`;
    case 'enemyBlastKilled': return `The ${event.enemyLabel.toLowerCase()} is caught in the blast at the ${event.label} and dies.`;
    case 'diversion': return `${capitalise(missionWords.diversionName)} called: ${missionWords.diversionLog}. The garrison looks the other way.`;
    case 'noReserve': return event.deployed
      ? `With the ${event.label} gone, the garrison can call up nobody more — but the reserve is already out.`
      : `With the ${event.label} gone, the garrison cannot call up its reserve squad.`;
    case 'withdrawn': return `The ${event.enemyLabel.toLowerCase()} leaves the field to deal with the ${event.label}.`;
    default: return event.kind;
  }
}

/**
 * SPEC.md §9: where he came down, how far the wind carried him from where he
 * jumped, and what it cost him. Players read a bare "1 hex off" as a mistake,
 * so the drift is said as drift.
 */
function describeLanding(event, where) {
  const name = event.unitName;
  const drifts = event.distance > 0 ? `drifts ${event.distance} hex${event.distance === 1 ? '' : 'es'} and ` : '';
  const onMark = event.distance === 0 ? ' right on his mark' : '';
  if (event.outcome === 'wounds') {
    return `${name} ${drifts}comes down in the ${event.terrain.toLowerCase()}${onMark} — ${event.dead ? 'drowned' : 'WOUNDED'}, and drags himself out onto ${where}.`;
  }
  if (event.outcome === 'bad') {
    const cost = event.turnsLost > 0
      ? `loses ${event.turnsLost === 1 ? 'his first turn' : `${event.turnsLost} turns`}`
      : 'lands clean anyway';
    return `${name} ${drifts}lands${onMark} in ${where} — ${cost}.`;
  }
  return `${name} ${drifts}lands${onMark} in ${where}.`;
}

/**
 * A line of text with every man's name in it set in bold, as nodes for
 * `append`. `names` are the names as the text spells them (the counters'
 * short names); a name only counts as a whole word.
 */
export function boldNames(line, names) {
  const parts = names?.length ? boldNamesOnly(line, names) : [line];
  return parts.flatMap((part) => (typeof part === 'string' ? markKilled(part) : [part]))
    .flatMap((part) => (typeof part === 'string' ? boldKeys(part) : [part]));
}

/** "killed" in a report or card line, in bold red (M13): one of ours is dead. */
function markKilled(line) {
  const parts = line.split(/\b(killed)\b/);
  return parts.map((part, i) => (i % 2 ? html('b', 'killed', part) : part)).filter((p) => p !== '');
}

function boldNamesOnly(line, names) {
  if (!names?.length) return [line];
  const pattern = new RegExp(`\\b(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'g');
  const parts = [];
  let last = 0;
  for (const match of line.matchAll(pattern)) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    parts.push(html('b', null, match[0]));
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts;
}

// Keys as the game's text mentions them (M12: the operator wants every one in
// bold): anything in square brackets, "[D]", "[SPACE]"; the named keys; a run
// of number keys, "1–6"; and a letter after "press".
const KEY_WORDS = /\[([^\]\n]{1,12})\]|\b(SPACE|Space|Esc|Tab)\b|\b([1-9]–[1-9])\b(?! (?:hex|turn|AP|charge|men))|(?<=\b[Pp]ress )([A-Z])\b/g;

/** Set an element's text with its keys in bold. */
function setText(element, text) {
  element.replaceChildren(...boldKeys(text));
}

/** A line of text with every keyboard key in it set in bold, as nodes for `append`. */
export function boldKeys(line) {
  const parts = [];
  let last = 0;
  for (const match of line.matchAll(KEY_WORDS)) {
    if (match.index > last) parts.push(line.slice(last, match.index));
    if (match[1] !== undefined) parts.push('[', html('b', 'key', match[1]), ']');
    else parts.push(html('b', 'key', match[0]));
    last = match.index + match[0].length;
  }
  if (last < line.length) parts.push(line.slice(last));
  return parts.length ? parts : [line];
}

// Why a man who went to ground was spotted anyway (enemy.js runDetection `hid`).
const HID_WORDS = {
  here: ', although he was hiding: too little cover, or the enemy too close',
  before: ', on his way to where he hid — hiding covers only the hex he stops on',
};

const NOISE_WORDS = { spotted: 'a sighting', found: 'a shout over something found', stone: 'a noise', gunfire: 'gunfire', silenced: 'a muffled shot', explosion: 'the explosion' };

function listOf(labels) {
  if (!labels || labels.length === 0) return 'someone';
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} and ${labels.at(-1)}`;
}

// --- detection in words -------------------------------------------------------

/**
 * SPEC.md §6's sum in words, one term at a time, so the player can see why:
 * "Bridge patrol: 3 − cover 2 − conceal 0 + close 1 = 2 of 3".
 */
export function describeDetection(d, { dots = false } = {}) {
  // A term that is nought for most men is left out (M22: the readout ran off its box).
  let sum = `${d.enemyLabel}: ${d.base} − cover ${d.cover}`;
  if (d.concealment) sum += ` − conceal ${d.concealment}`;
  if (d.hidden) sum += ` − hidden ${d.hidden}`;
  if (d.proximity) sum += ` + close ${d.proximity}`;
  if (d.alert) sum += ` + alert ${d.alert}`;
  if (d.trait) sum += ` ${d.trait > 0 ? '+' : '−'} trait ${Math.abs(d.trait)}`;
  return `${sum} = ${d.score} of ${d.threshold}${dots ? ' dots' : ''}`;
}

/**
 * The whole hover path's risk: { text, sum }, where the text says how it goes
 * and where, and `sum` is the worst hex's detection sum, which the readout
 * sets on a row of its own beside the dots (M23: the two on one row were the
 * readout's longest line). `sum` is null when nobody sees him.
 */
export function describeRisk(plan, risk, place) {
  if (!plan || !risk) return null;
  const tested = plan.steps === 0 ? [0] : plan.path.map((_, i) => i).slice(1);
  const seen = tested.filter((i) => risk[i]);
  if (seen.length === 0) return { text: plan.steps === 0 ? 'unseen here' : 'unseen all the way', sum: null };
  const spotted = seen.filter((i) => risk[i].spotted);
  const shot = seen.filter((i) => risk[i].shot);
  const worstAt = seen.reduce((a, b) => (risk[b].score > risk[a].score ? b : a));
  if (shot.length > 0) {
    // The shot lands on the most exposed hex he would be shot on (SPEC.md §5).
    const worst = shot.find((i) => risk[i].shotResult === 'hit') ?? shot[0];
    const cover = risk[worst].coverLabel;
    const outcome = risk[worst].shotResult === 'hit' ? `HIT ${cover === 'none' ? 'in the open' : `through ${cover} cover`}` : `PINNED in ${cover} cover`;
    return { text: `${outcome}: in contact, and seen again in ${place(plan.path[worst])}`, sum: describeDetection(risk[worst]) };
  }
  const where = place(plan.path[worstAt]);
  // In contact and seen, but every enemy seeing him is firing at another man
  // (M26d: one man a turn each), so he is not shot.
  const drawn = spotted.map((i) => risk[i].drawnOff).find(Boolean);
  if (drawn) return { text: `NOT SHOT: in contact and seen in ${place(plan.path[spotted[0]])}, but ${drawn}`, sum: describeDetection(risk[worstAt]) };
  const text = spotted.length > 0
    ? `spotted on ${spotted.length} of ${tested.length} hex${tested.length === 1 ? '' : 'es'}, worst in ${where}`
    : `seen, not spotted, worst in ${where}`;
  return { text, sum: describeDetection(risk[worstAt]) };
}

function describeCost(terrain, cost = terrain.moveCost) {
  return cost === null ? 'impassable' : `move ${cost}`;
}

// --- the clock and End turn ---------------------------------------------------

/** Dawn arrives on turn 20 and that is the clock (SPEC.md §4). */
export function renderTurnCounter(element, state, rules) {
  const dawn = state.phase !== 'drop' && (state.outcome || state.turn >= rules.turnLimit);
  element.classList.toggle('dawn', Boolean(dawn));
  if (state.phase === 'drop') element.textContent = 'THE DROP';
  else if (state.outcome) element.textContent = `TURN ${state.turn}/${rules.turnLimit} · OVER`;
  else if (state.turn >= rules.turnLimit) element.textContent = `TURN ${state.turn}/${rules.turnLimit} · DAWN`;
  else element.textContent = `TURN ${state.turn} / ${rules.turnLimit}`;
}

/**
 * The dawn strip (ART-ASSETS.md ui-dawn-strip): night lightening to dawn, one
 * cell per turn from rules.json, the turns gone shaded and this one ringed.
 */
export function renderDawnStrip(svg, state, rules) {
  svg.replaceChildren(svgEl('use', { href: '#ui-dawn-strip', width: 600, height: 60 }));
  const turns = rules.turnLimit;
  const cell = 600 / turns;
  const now = state.phase === 'drop' ? 0 : state.turn;
  if (now > 1) {
    svg.appendChild(svgEl('rect', { x: 0, y: 0, width: (now - 1) * cell, height: 60, fill: DAWN.burnt, 'fill-opacity': DAWN.burntOpacity }));
  }
  for (let i = 1; i < turns; i++) {
    svg.appendChild(svgEl('line', { x1: i * cell, y1: 48, x2: i * cell, y2: 60, stroke: DAWN.tick, 'stroke-width': 2 }));
  }
  if (now > 0) {
    svg.appendChild(svgEl('rect', {
      x: (now - 1) * cell + 2, y: 3, width: cell - 4, height: 54, fill: 'none', stroke: DAWN.now, 'stroke-width': 5,
    }));
  }
}

export function renderEndTurnButton(button, state, rules) {
  if (state.phase === 'drop') {
    button.disabled = state.dropRunId === null;
    // Once a run is picked, the jump is the one thing to do: in red (M21).
    button.classList.toggle('jump', state.dropRunId !== null);
    setText(button, state.dropRunId === null ? 'PICK A DROP RUN (1–3)' : 'JUMP!  [SPACE]');
    return;
  }
  button.classList.remove('jump');
  button.disabled = Boolean(state.outcome);
  if (state.outcome) setText(button, 'MISSION OVER');
  else if (state.turn >= rules.turnLimit) setText(button, 'END THE LAST TURN — DAWN  [SPACE]');
  else setText(button, 'END TURN  [SPACE]');
}

/** Undo's rollover, for how many steps the level allows (rules.json `undo.steps`; null is the whole turn). */
export function describeUndo(steps) {
  const reach = steps === null
    ? 'Press it again to go further back, as far as the start of this turn.'
    : steps === 1
      ? 'Only that one: undo cannot be repeated to go further back.'
      : `Up to ${steps} steps back, never past the start of this turn.`;
  return `Take back the last move or action you made. ${reach} Once you end the turn, what happened stands.`;
}

/** Undo, beside End turn: live while there is something this turn to take back. */
export function renderUndoButton(button, state, canUndo) {
  button.hidden = state.phase === 'drop';
  button.disabled = !canUndo || Boolean(state.outcome);
  setText(button, 'UNDO  [Z]');
}

// --- the briefing -------------------------------------------------------------

/**
 * The mission at a glance (SPEC.md §7, §10): each objective, whether it is
 * needed or optional and how far on it is, and how many men are out.
 */
export function renderMission(element, mission) {
  element.replaceChildren();
  for (const o of mission.objectives) {
    const item = html('li', o.destroyed ? 'done' : null);
    // SPEC.md §10: only the win's targets are needed. The star says so, and
    // the optional ones carry their score, or the three read as a checklist.
    const name = html('span', null, [html('b', null, o.win ? `★ ${o.label}` : o.label), html('i', null, o.win ? ' needed' : o.points == null ? '' : ` +${o.points}`)]);
    item.append(name, html('span', null, o.progress));
    attachPopup(item, () => [
      html('b', null, o.label.toUpperCase()),
      `\n${o.win ? 'Primary: needed to win.' : o.points == null ? '' : `Optional: +${o.points} score.`}\n${o.detail}.`,
    ]);
    element.appendChild(item);
  }
  const out = html('li', null, [html('span', null, [html('b', null, 'Men out'), ' at the exfil']), html('span', null, `${mission.out}/${mission.minimumOut}`)]);
  attachPopup(out, [html('b', null, 'MEN OUT'), `\nAt least ${mission.minimumOut} must reach the exfil for the mission to count.`]);
  element.appendChild(out);
}

/** The RAF diversion (SPEC.md §4): one button for the whole stick, not a trooper action. */
export function renderDiversion(button, check) {
  button.disabled = !check.ok;
  // In a pickle (M26d): red, and saying so.
  button.classList.toggle('suggest', Boolean(check.ok && check.suggest));
  const small = !check.ok ? capitalise(check.reason) : check.suggest ? '[D] Call it now!' : `[D] ${check.left === 1 ? 'once' : `${check.left} left`}, no AP`;
  button.replaceChildren(missionWords.diversionName.toUpperCase(), html('small', null, boldKeys(small)));
}

/** The diversion's rollover; `uses` is how many calls the mission allows. */
export function describeDiversion(uses) {
  const times = timesWord(uses);
  return `The alert drops a state, every search and held contact is dropped, every man is out of contact. ${times[0].toUpperCase()}${times.slice(1)} per mission, while the leader lives. Costs the clean-run bonus.`;
}

// --- the back page ------------------------------------------------------------

const OUTCOME_WORDS = { success: 'MISSION ACCOMPLISHED', withdrawn: 'WITHDRAWN', failed: 'MISSION FAILED' };
const FATE_WORDS = { out: 'got out', killed: 'killed', 'left behind': 'left behind' };

/**
 * The results (SPEC.md §10), printed as the back page of the annual over the
 * right page: masthead, outcome, all six by name and fate, and the score.
 */
export function renderResults(element, outcome, levelLabel, banner, onAgain, onContents, rating = null) {
  element.replaceChildren();
  element.hidden = !outcome;
  if (!outcome) return;
  element.className = outcome.kind;


  const fates = html('ul', 'fates');
  for (const f of outcome.fates) {
    const chip = svgEl('svg', { viewBox: '0 0 32 32' });
    chip.appendChild(svgEl('use', { href: `#${portraitId(f.id, 'chip')}`, width: 32, height: 32 }));
    const item = html('li', f.fate === 'out' ? 'fate-out' : 'fate-lost');
    item.append(chip, html('span', null, [`${f.name} — `, html('b', null, FATE_WORDS[f.fate])]));
    fates.appendChild(item);
  }

  const score = document.createElement('table');
  for (const line of outcome.score.lines) {
    const row = score.insertRow();
    // Each scoring line with a bullet before it (M13).
    row.insertCell().textContent = `• ${line.label}`;
    row.insertCell().textContent = line.points < 0 ? `−${-line.points}` : `+${line.points}`;
  }
  const total = score.insertRow();
  total.className = 'total';
  total.insertCell().textContent = 'SCORE';
  total.insertCell().textContent = String(outcome.score.total);

  // The rating (M32): the annual's "how did you score?" table, a success's
  // score against the mission's bands (missions.js ratingOf), best first, the
  // one earned set in bold with the pen's arrow.
  let ladder = null;
  if (rating) {
    ladder = html('div', 'rating', [html('div', 'rating-earned', [html('small', null, 'RATING'), html('b', null, rating.label)])]);
    const bands = document.createElement('table');
    for (const band of [...rating.ladder].reverse()) {
      const row = bands.insertRow();
      if (band.earned) row.className = 'earned';
      row.insertCell().textContent = band.to === null ? `${band.from} or more` : band.from === 0 ? `Under ${band.to + 1}` : `${band.from} to ${band.to}`;
      row.insertCell().textContent = band.label;
      row.insertCell().textContent = band.earned ? '◄' : '';
    }
    ladder.appendChild(bands);
  }

  const again = html('button', 'btn', 'PLAY AGAIN');
  again.type = 'button';
  again.addEventListener('click', () => onAgain());
  // Back to the contents page (M27), to pick another mission.
  const contents = html('button', 'btn', 'CONTENTS');
  contents.type = 'button';
  contents.addEventListener('click', () => onContents());

  element.append(
    titleBanner(banner),
    html('div', 'kicker', 'THE BACK PAGE · HOW DID YOUR SQUAD DO?'),
    html('h2', null, OUTCOME_WORDS[outcome.kind]),
    // The turn and level on a line of their own (M13).
    html('p', null, [`${outcome.reason[0].toUpperCase()}${outcome.reason.slice(1)}.`, html('br'), `Turn ${outcome.turn}, on ${levelLabel}.`]),
    fates,
    score,
    ...(ladder ? [ladder] : []),
    html('div', 'again', [again, contents]),
  );
}

// --- the drop runs, the seed, the actions --------------------------------------

/**
 * The drop runs (SPEC.md §9), as buttons with their key, in place of the
 * actions before anyone has landed; each description is the button's rollover.
 * `runs` is derived in main.js: [{ id, key, label, description, wind, selected }].
 */
export function renderDropRuns(element, runs, onChoose) {
  element.replaceChildren();
  element.classList.remove('idle');
  element.classList.add('runs');
  for (const run of runs) {
    // The name with the run's word under it: the three have the row to themselves.
    const words = html('span', 'action-words', [html('span', 'action-name', run.label), html('span', 'action-tag', run.tag.toUpperCase())]);
    const button = html('button', 'action', [html('span', 'action-key', run.key), words]);
    button.type = 'button';
    if (run.selected) button.classList.add('active');
    attachPopup(button, () => describeRun(run));
    button.addEventListener('click', () => onChoose(run.id));
    element.appendChild(button);
  }
}

/** A drop run's rollover, on its button and on its tab on the board. */
export function describeRun(run) {
  // What to do next in red capitals of its own (M21, from playtesting: the
  // jump was easy to miss at the end of the description).
  return [
    html('b', null, `${run.label.toUpperCase()} · ${run.tag.toUpperCase()}`),
    `\n${run.description}\nWind ${run.wind}: the scatter leans that way.\n`,
    html('b', 'popup-cue', run.selected ? 'PRESS SPACE TO JUMP, OR CLICK AGAIN' : 'CLICK TO PICK THIS RUN'),
  ];
}

/** Restart, in the margin under the sound: a first click arms it and says so (M12). */
export function renderRestart(button, armed) {
  button.textContent = armed ? 'CLICK AGAIN TO RESTART' : 'RESTART';
  button.classList.toggle('armed', armed);
}

/** The way back to the contents (M31d), top of the margin: an arrow and its word, asked twice in play. */
export function renderContentsBack(button, armed) {
  button.replaceChildren(html('span', 'arrow', '←'), html('span', 'label', armed ? 'CLICK AGAIN: CONTENTS' : 'CONTENTS'));
  button.classList.toggle('armed', armed);
}

/** Sound on or off, in the margin under the seed. */
export function renderSoundToggle(button, muted) {
  button.textContent = muted ? 'sound off' : 'sound on';
  button.setAttribute('aria-pressed', String(!muted));
}

/**
 * The seed (SPEC.md §1), with a link that replays the same drop at the same
 * difficulty, and the difficulty (§10). `levelQuery` is the level's id for
 * the address, or null for the default level. `onLevelClick` reopens the
 * orders, where the level is chosen.
 */
export function renderSeed(element, seed, level, levelQuery, onLevelClick) {
  element.replaceChildren();
  const link = document.createElement('a');
  link.href = `?seed=${seed}${levelQuery ? `&difficulty=${levelQuery}` : ''}`;
  link.textContent = `seed ${seed}`;
  attachPopup(link, 'Reload with this seed: the same run lands the same way, at the same difficulty.');
  const levelButton = html('button', 'seed-level', level.label.toLowerCase());
  levelButton.type = 'button';
  levelButton.addEventListener('click', () => {
    // Off the button, so the next Space jumps rather than pressing it again.
    levelButton.blur();
    onLevelClick();
  });
  attachPopup(levelButton, [html('b', null, `DIFFICULTY: ${level.label.toUpperCase()}`), `\n${level.summary}\nChosen on the orders: click to change it until the stick jumps.`]);
  element.append(link, ' · ', levelButton);
}

/** Which build this is (M15), on its own line above the seed and level: data/version.json. */
export function renderVersion(element, version) {
  element.textContent = version ? `build ${version}` : '';
  attachPopup(element, `This is build ${version}, the milestone it was made in.`);
}

/**
 * The selected man's actions (SPEC.md §4), as buttons with their key and name.
 * `actions` is worked out in main.js: [{ id, key, label, cost, ok, reason,
 * help, active }]. What an action does, and why it cannot be taken, are its
 * rollover.
 */
export function renderActions(element, actions, onAction) {
  element.replaceChildren();
  element.classList.remove('runs');
  if (!actions) {
    element.classList.add('idle');
    // One span: the strip is a flex box, which would space out each bold key.
    element.replaceChildren(html('span', null, boldKeys('Select a man: 1–6, Tab, or click him.')));
    return;
  }
  element.classList.remove('idle');
  // Three rows at most (index.html): a man with more than nine actions — a
  // gunner who also carries a charge — gets a fourth column instead.
  const four = actions.filter((a) => !a.heading).length > 9;
  element.classList.toggle('four', four);
  for (const action of actions) {
    // A line across the strip saying what to do (M30b: the timers).
    if (action.heading) {
      element.appendChild(html('div', 'actions-heading', action.heading));
      continue;
    }
    // Key, verb and its AP under it (M19, the operator's); the full cost,
    // and why not, are the rollover, which has the full name where the
    // button has a short one. Four across, one shorter still, as a name
    // there has a line to itself and no more (M19: it had two).
    const words = [html('span', 'action-name', action.lines?.[0] ?? ((four && action.tight) || action.short || action.label))];
    // A name too long for one line (m26b, the operator's: "Pass" alone read
    // as passing the turn) ends on the cost's line, "charge 2 AP"; four
    // across there is no room for both, and the rollover keeps the cost.
    if (action.lines) words.push(html('span', 'action-cost', [html('b', null, action.lines[1]), four ? '' : ` ${action.apLabel}`]));
    else if (action.apLabel) words.push(html('span', 'action-cost', action.apLabel));
    const button = html('button', 'action', [html('span', 'action-key', action.key), html('span', 'action-words', words)]);
    button.type = 'button';
    if (action.active) button.classList.add('active');
    // A time pencil that would go off after dawn (M30): struck out.
    if (action.struck) button.classList.add('struck');
    // A timer too short for every man to get clear (M30b).
    if (action.danger) button.classList.add('danger');
    // A use is open right now (M26): Stabilise or Pass, marked on the button.
    if (action.suggest && action.ok) button.classList.add('suggest');
    button.disabled = !action.ok && !action.active;
    button.addEventListener('click', () => onAction(action.id));
    // A disabled button gets no mouse events in some browsers, and "why not"
    // is exactly the rollover a disabled one needs, so it goes on a wrapper.
    const wrap = html('div', 'action-wrap', button);
    attachPopup(wrap, () => [
      html('b', null, action.label.toUpperCase()),
      `\n${action.suggest && action.ok ? `${action.suggest}\n` : ''}${action.help}\n${action.ok || action.active ? `Cost: ${capitalise(action.cost)}` : `Not now: ${capitalise(action.reason)}`}`,
    ]);
    element.appendChild(wrap);
  }
}

/**
 * The tin of time pencils (M31d, the operator's): laid on the map beside the
 * man setting the charge, on his side away from his target where it fits, so
 * the eye stays where the charge goes and the blast stays in view. A
 * pencil clicked is lifted out; SET takes the one lifted. `tin` is from
 * main.js timerTin, or null to put it away. `on` is { pick(fuse), set(), back() }.
 */
export function renderTimerTin(element, tin, board, map, on) {
  element.hidden = !tin;
  if (!tin) return;

  const stop = (event) => event.stopPropagation();
  const rows = tin.pencils.map((p) => {
    const art = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    art.setAttribute('viewBox', '0 0 200 26');
    art.setAttribute('class', 'tin-pencil-art');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${timePencilId(p.fuse)}`);
    use.setAttribute('width', '200');
    use.setAttribute('height', '26');
    art.appendChild(use);
    const row = html('button', 'tin-pencil', [
      art,
      html('span', 'tin-words', [html('b', null, `${p.fuse} TURN${p.fuse === 1 ? '' : 'S'}`), html('span', null, p.words)]),
      html('span', 'tin-key', String(p.fuse)),
    ]);
    row.type = 'button';
    row.classList.toggle('lifted', p.lifted);
    row.classList.toggle('danger', p.danger);
    row.classList.toggle('struck', !p.ok);
    row.disabled = !p.ok;
    row.addEventListener('click', (event) => {
      stop(event);
      on.pick(p.fuse);
    });
    return row;
  });
  const lifted = tin.pencils.find((p) => p.lifted);
  const set = html('button', 'tin-set', [html('span', null, 'SET'), html('small', null, 'Enter')]);
  set.type = 'button';
  set.disabled = !lifted;
  set.addEventListener('click', (event) => {
    stop(event);
    on.set();
  });
  const back = html('button', 'tin-back', 'Back · Esc');
  back.type = 'button';
  back.addEventListener('click', (event) => {
    stop(event);
    on.back();
  });
  element.replaceChildren(
    html('div', 'tin-lid', [html('span', 'tin-make', 'SWITCH, DELAY, No. 10'), html('span', 'tin-name', 'TIME PENCILS')]),
    html('div', 'tin-card', [
      html('div', 'tin-head', [html('b', null, 'SET THE TIMER'), html('span', null, tin.title)]),
      html('div', 'tin-rows', rows),
      html('div', 'tin-foot', [
        html('span', 'tin-say', lifted ? `Goes off at the end of turn ${lifted.blows}.` : 'Pick a pencil.'),
        back,
        set,
      ]),
    ]),
  );
  element.onclick = stop;
  element.onmousedown = stop;
  placeTin(element, tin, board, map);
}

/**
 * Beside the man (M31d, the operator's: in a corner it was far from the
 * charge). Eight places round him, each a hex clear of his counter and kept
 * inside the map; the one taken covers the fewest hexes of his blast and his
 * own, then is the nearest to him. Measured in the page's own pixels, under
 * any zoom of the spread.
 */
function placeTin(element, tin, board, map) {
  const host = element.offsetParent;
  const ctm = board.getScreenCTM();
  if (!host || !ctm) return;
  const frame = host.getBoundingClientRect();
  const scale = frame.width / host.offsetWidth || 1;
  const toPage = (h) => {
    const p = axialToPixel(h.q, h.r, map.hexSize);
    return { x: (ctm.a * p.x + ctm.e - frame.left) / scale, y: (ctm.d * p.y + ctm.f - frame.top) / scale };
  };
  const man = toPage(tin.anchor);
  const clear = [man, ...(tin.keepClear ?? []).map(toPage)];
  const boardBox = board.getBoundingClientRect();
  const bounds = { width: boardBox.width / scale, height: boardBox.height / scale };
  const w = element.offsetWidth, h = element.offsetHeight;
  const gap = (ctm.a * map.hexSize * 1.1) / scale; // a hex radius and a bit: clear of his counter
  const xs = { left: man.x - gap - w, middle: man.x - w / 2, right: man.x + gap };
  const ys = { up: man.y - gap - h, middle: man.y - h / 2, down: man.y + gap };
  const spots = [['right', 'middle'], ['left', 'middle'], ['middle', 'up'], ['middle', 'down'], ['right', 'up'], ['right', 'down'], ['left', 'up'], ['left', 'down']]
    .map(([sx, sy]) => {
      const x = Math.min(Math.max(xs[sx], 8), bounds.width - w - 8);
      const y = Math.min(Math.max(ys[sy], 8), bounds.height - h - 8);
      const pad = gap * 0.6;
      const covered = clear.filter((c) => c.x > x - pad && c.x < x + w + pad && c.y > y - pad && c.y < y + h + pad).length;
      const far = Math.hypot(x + w / 2 - man.x, y + h / 2 - man.y);
      return { x, y, covered, far };
    })
    .sort((a, b) => a.covered - b.covered || a.far - b.far);
  element.style.left = `${Math.round(spots[0].x)}px`;
  element.style.top = `${Math.round(spots[0].y)}px`;
}

// --- traits in words (used by roster.js) ----------------------------------------

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

// A trait's effect as short as it will go, for the roster row itself (M11d:
// the names alone told the player nothing): base → value where the base is
// known, the change where it depends on the situation. A stat missing here
// falls back to describeEffect.
const SHORT_EFFECT = {
  fuse: (b, v) => `fuse ${b} → ${v} turn${v === 1 ? '' : 's'}`,
  apCost: (b, v) => `set a charge ${b} → ${v} AP`,
  charges: (b, v) => `carries ${b} → ${v} charge${v === 1 ? '' : 's'}`,
  alert: (b, v) => `gunfire alert ${b} → ${v}`,
  landingPenalty: (b, v) => `bad landing ${b} → ${v} turns`,
  spotRadius: (b, v) => `sees ${b} → ${v} hexes`,
  actionPoints: (b, v) => `AP ${b} → ${v}`,
};

/** "Steady Hands: fuse 3 → 2 turns", "Cat's Eyes: 1 harder to spot". */
export function shortEffect(effect) {
  const { stat, base, value, modifier } = effect;
  let words;
  if (stat === 'detection' && modifier.op === 'add') words = `${Math.abs(modifier.value)} ${modifier.value < 0 ? 'harder' : 'easier'} to spot`;
  else if (base !== null && SHORT_EFFECT[stat]) words = SHORT_EFFECT[stat](base, value);
  else words = describeEffect(effect);
  return `${effect.name}: ${capitalise(words)}`;
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

// --- the hover readout ----------------------------------------------------------

// Between the readout's items: a bar, not an arrow, which read as "this
// leads to that" (M13).
const READOUT_GAP = '  |  ';

/**
 * A fixed-height readout about whatever the mouse is over. With a trooper
 * selected this is the path readout SPEC.md §4 asks for: route, total AP, and
 * why not if not, with the detection risk along the path. Over an enemy, what
 * that enemy is doing. The terrain legend is folded in here (SPEC.md §11).
 */
export function renderReadout(element, state, map, view) {
  const hex = state.hoverHex ?? state.selectedHex;
  element.classList.remove('rows');
  if (view?.targetLabel) {
    setText(element, view.targetLabel);
    return;
  }
  if (view?.hoverEnemy) {
    const e = view.hoverEnemy;
    let doing = e.speed === 0 ? 'holds its post' : e.route ? `walks its route, speed ${e.speed}` : `speed ${e.speed}`;
    // The garrison has not set out yet (M36, the airfield's first turn).
    if (e.route && view.garrisonSetsOut) doing = `stands here this turn: the patrols set out at the end of turn ${view.garrisonSetsOut}, speed ${e.speed}`;
    if (e.investigating) doing = `going to look at ${view.place(e.investigating)}`;
    if (e.watching) doing = `has a man in its sights in ${view.place(e.watching)}`;
    if (e.suppressed) doing = `SUPPRESSED — head down: will not see, fire or move this turn${e.killable ? ', and a gunner can kill it until the end of next turn' : ''}`;
    else if (e.openToKill && e.killable) doing = `${doing}; still shaken — a gunner can kill it this turn`;
    const killable = e.killable ? '' : ' CANNOT BE KILLED — suppress it to get past.';
    // What it will do if the turn ended now (M13b), which the dashed outline shows.
    const n = view.hoverEnemyNext;
    // What put the "!" on its chip (M20).
    const raised = view.alarmed?.get(e.id);
    // In rows under its name (M21b), as a hex's readout is.
    const stamp = e.suppressed ? { word: 'SUPPRESSED', tone: 'safe' } : raised ? { word: 'RAISED THE ALARM', tone: 'danger' } : null;
    renderRows(element, `${e.label.toUpperCase()} · ${e.typeLabel.toUpperCase()}`, stamp, null, [
      { label: 'DOING', text: `${doing}.${killable}` },
      raised && { label: 'ALARM', text: `raised it last turn: ${raised.map((r) => r.words).join(', and ')}.`, tone: 'danger' },
      // What the selected man can do to it (M26d), before its movements.
      ...(view.enemyActs ?? []),
      n && { label: 'NEXT', text: `${n.moves ? `moves to ${view.place(n)}, ` : ''}faces ${n.facing} (dashed outline)` },
      { label: 'SEES', text: `${view.hoverEnemyVision} hexes facing ${view.hoverEnemyFacing} · detection base ${e.detection}` },
    ]);
    return;
  }
  // A man under the mouse (M23): his particulars, and over the selected man's
  // own hex what standing there means this turn.
  if (view?.manReadout) {
    const m = view.manReadout;
    const own = view.plan?.steps === 0;
    const verdict = own ? riskVerdict(view.plan, view.risk) : null;
    const blast = own ? view.blastLabel : null;
    renderRows(element, m.head.toUpperCase(), m.stamp ?? verdict, m.note, [
      blast && { label: 'BLAST', text: blast.replace(/^BLAST — /, ''), tone: 'danger' },
      ...(own ? riskRows(view.riskLabel, verdict) : []),
      own && { label: 'HIDE', text: view.hideLabel },
      ...m.rows,
    ]);
    return;
  }
  if (!hex) {
    if (state.phase === 'drop') {
      setText(element, view?.dropLabel ?? 'Pick a drop run with 1–3 or its button. Hover the board to see what landing there would mean.');
      return;
    }
    setText(element, state.selectedUnitId
      ? `${view?.aidLabel ? `${view.aidLabel}${READOUT_GAP}` : ''}Hover a hex to preview the move. Right-click or Esc to cancel.${view?.commandLabel ? `${READOUT_GAP}${view.commandLabel[0].toUpperCase()}${view.commandLabel.slice(1)}.` : ''}`
      : 'Click a man to select him, or a hex to see what it is.');
    return;
  }

  const terrain = terrainAt(map, hex.q, hex.r);
  if (!terrain) {
    setText(element, 'Off the map');
    return;
  }

  // Only what the ground does, not what it does not (M22: room).
  const parts = [describeCost(terrain, moveCostAt(map, hex.q, hex.r)), `cover ${terrain.cover}`];
  if (terrain.blocksLOS) parts.push('blocks line of sight');
  if (terrain.spotBonus) parts.push(`spot ${terrain.spotBonus > 0 ? '+' : ''}${terrain.spotBonus}`);
  if (terrain.landing === 'bad') parts.push('bad landing');
  if (terrain.landing === 'wounds') parts.push('landing wounds');

  // Most important first: the readout is a fixed height (index.html), and
  // whatever does not fit is cut from the end. The move, a blast and the
  // detection risk must never be what gets cut. One labelled row each under
  // the ground's name and a stamp saying how it goes (M21b, the operator's:
  // one run-on line split by bars was a wall of text nobody read).
  const verdict = riskVerdict(view?.plan, view?.risk);
  const blast = view?.blastLabel;
  // A target, the exfil or a parachute is named in the headline over the ground (M22).
  const head = view?.site?.title ?? terrain.label;
  // The ground's name goes beside it when the headline names what stands on it.
  if (view?.site?.title) parts.unshift(terrain.label.toLowerCase());
  // The ground in the headline's spare room, not a row of its own (M22: room).
  renderRows(element, head.toUpperCase(), blast?.includes('KILLED') ? { word: 'KILLED', tone: 'danger' } : verdict, parts.join(' · '), [
    { label: 'LANDING', text: view?.dropLabel },
    { label: 'MOVE', text: view?.moveLabel },
    blast && { label: blast.startsWith('MISSION') ? 'EXFIL' : 'BLAST', text: blast.replace(/^BLAST — /, ''), tone: 'danger' },
    ...riskRows(view?.riskLabel, verdict),
    // Stabilise or Pass is open to him (M26); only while he is not off on a move.
    { label: 'AID', text: !view?.plan || view.plan.steps === 0 ? view?.aidLabel : null, tone: 'prompt' },
    { label: 'HIDE', text: view?.hideLabel },
    ...(view?.site?.rows ?? []),
    { label: 'HEARD', text: view?.noiseLabel?.replace(/^HEARD — /, '') },
    { label: 'SEARCH', text: view?.searchLabel },
    { label: 'ORDERS', text: view?.commandLabel },
  ]);
}

/**
 * The readout as a headline with a stamp, then one row per thing to say,
 * each under a short label (M21b). `stamp` is { word, tone } or null; `note`
 * is set small at the headline's right (M22: the ground); rows with no text
 * are left out.
 */
function renderRows(element, head, stamp, note, rows) {
  element.classList.add('rows');
  const kept = rows.filter((row) => row && row.text);
  // Set at the largest size that fits the box (M22, the operator's: rows
  // ran off the bottom where nothing could scroll to them), down to the 12px
  // floor for type (SPEC.md §11). One column, every row's words starting
  // at the same place (M23, the operator's: two columns of rows read as
  // clutter); two only at the floor if one will not fit, and whatever still
  // does not fit is cut from the end, which is the least important.
  const tries = [...READOUT_BOX.sizes.map((size) => [size, false]), [READOUT_BOX.sizes.at(-1), true]];
  for (const [size, paired] of tries) {
    element.dataset.fit = String(size);
    element.replaceChildren(
      html('div', 'ro-head', [html('span', 'ro-title', head), stamp ? html('span', `ro-stamp ${stamp.tone}`, stamp.word) : '', note ? html('span', 'ro-note', capitalise(note)) : '']),
      html('div', 'ro-body', readoutRows(kept, paired ? element.clientWidth : 0, size)),
    );
    if (element.scrollHeight <= element.clientHeight) break;
  }
}

/** A move's risk as two rows: how it goes, then the sum beside the dots. */
function riskRows(risk, verdict) {
  if (!risk) return [];
  const tone = verdict?.tone === 'safe' ? null : verdict?.tone;
  return [{ label: 'RISK', text: risk.text, tone }, { label: 'DOTS', text: risk.sum }];
}

/**
 * The rows, one to a line where they fit. With `width` (M22, the last resort
 * since M23) a row short enough for half the box sits beside the next short
 * one; the grid packs shorts into the gaps, so the order still runs most
 * important first.
 */
function readoutRows(rows, width, size) {
  const halfChars = width ? Math.floor(((width - READOUT_BOX.padding - READOUT_BOX.gap) / 2 - READOUT_BOX.label) / (size * READOUT_BOX.charWidth)) : 0;
  return rows.map((row) => {
    const text = capitalise(row.text);
    const half = text.length <= halfChars;
    return html('div', `ro-row${half ? ' half' : ''}${row.tone ? ` ${row.tone}` : ''}`, [
      html('span', 'ro-label', row.label),
      html('span', 'ro-text', boldKeys(text)),
    ]);
  });
}

// The readout's measures in px, as index.html sets them: its padding, the gap
// between its two columns, a label's column with its gap, and a character of
// the typewriter face (its advance, in ems); and the sizes tried, largest first.
const READOUT_BOX = { padding: 18 + 4, gap: 16, label: 62 + 6, charWidth: 0.6, sizes: [14, 13, 12] };

/** How a hovered move goes, in one word for the stamp: the worst hex on it. */
function riskVerdict(plan, risk) {
  if (!plan || !risk) return null;
  const tested = plan.steps === 0 ? [0] : plan.path.map((_, i) => i).slice(1);
  const seen = tested.filter((i) => risk[i]);
  if (seen.some((i) => risk[i].shot)) return seen.some((i) => risk[i].shot && risk[i].shotResult === 'hit') ? { word: 'SHOT', tone: 'danger' } : { word: 'FIRED ON', tone: 'warn' };
  if (seen.some((i) => risk[i].spotted)) return { word: 'SPOTTED', tone: 'danger' };
  if (seen.length) return { word: 'SEEN', tone: 'warn' };
  return { word: 'UNSEEN', tone: 'safe' };
}

/** What the hover path costs, in words. Derived in main.js, worded here. */
export function describePlan(plan, unit) {
  if (!unit) return null;
  if (!plan) return 'no route there';
  if (plan.steps === 0) return `${unit.shortName} is already here`;
  const route = `${plan.steps} hex${plan.steps === 1 ? '' : 'es'}, ${plan.total} AP`;
  if (plan.affordable && plan.minimumStep) return `${route} · one step, spends all ${unit.apMax} AP`;
  if (plan.affordable) return `${route} · click to move`;
  // "needs 12 AP, has 6" said the 12 twice (M23).
  if (unit.ap > 0 && plan.total > unit.ap) return `${route} · he has ${unit.ap}`;
  return `${route} · ${plan.reason}`;
}

/** Data problems have to be loud, or a data-driven map is a guessing game. */
export function renderError(element, error) {
  element.hidden = false;
  element.textContent = error.message;
  console.error(error);
}
