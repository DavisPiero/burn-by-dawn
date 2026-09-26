// The right-hand page and the captions under the board: the clock, End turn,
// the actions, the alert dial, the mission briefing, the turn report, the
// hover readout, the rollover popups and the back-page results. The roster
// rail is roster.js. Reads state and map data, never mutates them (CLAUDE.md
// hard rule 7) — clicks are handed straight back to the caller.

import { timesWord } from '../hints.js';
import { hexDistance } from '../hex.js';
import { columnOf, terrainAt } from '../map.js';
import { ALERT_STATE, DAWN, DIAL, portraitId } from './theme.js';

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
  box.replaceChildren(...[].concat(typeof content === 'function' ? content() : content));
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
  return [html('b', null, heading), `\n${body}`];
}

/** Give an element a rollover. `content` may be a function, so it is built when shown. */
export function attachPopup(element, content) {
  element.addEventListener('mouseenter', () => showPopup(element, content));
  element.addEventListener('mouseleave', hidePopup);
}

// SPEC.md §4's keys, for the KEYS rollover.
const KEYS = [
  'The drop: 1–3 pick a run · Space jump',
  '1–6 select a man · Esc deselect · Tab next · H hold',
  'G hide · S suppress · K kill · T throw a stone',
  'A stabilise · P pick up a charge · U pack parachute',
  'C place a charge · E pass a charge · X cut the line · W swim',
  'D RAF diversion · Space end turn · Z undo',
  'Esc or right-click also backs out of aiming an action',
  'R patrol routes · M sound',
  '',
  'Hover an enemy for its arc and route, an objective for what it needs, a report line to see where.',
].join('\n');

export function renderKeys(button) {
  attachPopup(button, () => [html('b', null, 'KEYS'), `\n${KEYS}`]);
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
  marginX: 8 + 22, // spread padding left and right (index.html #spread)
  marginY: 8 + 8,
  leftChromeX: 20 + 4 + 2 + 16, // outer gutter, its gap, left page padding
  leftChromeY: 10 + 10 + 8, // left page padding, gap above the captions
  captionMin: 92,
  captionMax: 170,
  panelMin: 380,
  panelMax: 480,
  panelShare: 0.27,
};

/** Size the board, captions and right page to the window. `aspect` is the board's width over height. */
export function fitSpread(aspect, root = document.documentElement) {
  const width = Math.max(window.innerWidth, SPREAD.minWidth);
  const height = Math.max(window.innerHeight, SPREAD.minHeight);
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
  const landmarks = [...objectives.map((o) => ({ label: o.label.toLowerCase(), hexes: o.hexes }))];
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
  killed: 0, blastKilled: 0, wounded: 1, explosion: 1, enemyBlastKilled: 1, noReserve: 1, withdrawn: 1, reserve: 2, spotted: 2, diversion: 2,
  pinned: 3, alertRise: 3, bodyFound: 3, parachuteFound: 3, searched: 4, heard: 4, alertDecay: 5, landed: 5,
};

/** The report's lines, most important first, as the card shows them. */
export function rankedReport(events, place) {
  return events
    .map((event, i) => ({ event, i, weight: EVENT_WEIGHT[event.kind] ?? 4 }))
    .sort((a, b) => a.weight - b.weight || a.i - b.i)
    .map(({ event }) => describeEvent(event, place));
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
 * { banner?: { title, tagline }, title, kicker, tone?, names?, paragraphs?, sections: [{ heading, lines, more?, hints? }],
 *   toggle?: { on }, choice?: { heading, options: [{ id, label, summary, selected }], onChoose(id) } }
 * — worded in main.js. `onToggle(on)` is the turn-update box.
 */
export function renderBriefing(backdrop, card, briefing, onToggle) {
  backdrop.hidden = !briefing;
  if (!briefing) return;
  card.replaceChildren();
  card.className = briefing.tone ? `tone-${briefing.tone}` : '';
  // The title card, over the orders only: the `title-card` sprite, drawn or
  // painted (theme.js TITLE_CARD), with the title set over it in type.
  if (briefing.banner) card.appendChild(titleBanner(briefing.banner));
  card.appendChild(html('div', 'brief-head', [html('span', 'brief-title', briefing.title), html('span', 'brief-kicker', briefing.kicker)]));
  for (const text of briefing.paragraphs ?? []) card.appendChild(html('p', null, text));
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
    box.addEventListener('change', () => onToggle(box.checked));
    const label = html('label', null, [box, ' Brief me at the start of every turn']);
    label.addEventListener('click', (event) => event.stopPropagation());
    foot.appendChild(label);
  } else if (briefing.choice) {
    foot.appendChild(briefChoice(briefing.choice));
  } else {
    foot.appendChild(html('span'));
  }
  foot.appendChild(html('span', 'brief-go', 'CARRY ON — any key or click'));
  card.appendChild(foot);
}

/**
 * A row of buttons in the card's foot, one picked; what each changes is its
 * rollover, as the orders have no room for another line at 1280x800. A click
 * picks and does not put the card away, as every other click on the card does.
 */
function briefChoice(choice) {
  const row = html('div', 'brief-choice', [html('span', 'brief-choice-head', choice.heading)]);
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
export function renderReport(element, state, place, onLocate) {
  element.replaceChildren();
  const events = state.report;
  if (state.phase === 'drop') {
    element.appendChild(html('li', null, 'The Dakota troop aircraft flies one of these lines; your men jump along it and drift downwind a hex or two. Pick a run, then jump.'));
    return;
  }
  if (events.length === 0) {
    element.appendChild(html('li', null, state.turn === 1 ? 'No reports yet.' : 'A quiet night. Nothing seen.'));
    return;
  }
  for (const event of events) {
    const item = html('li', null, boldNames(describeEvent(event, place), state.units.map((u) => u.shortName)));
    if (Number.isInteger(event.q) && Number.isInteger(event.r)) {
      item.classList.add('located');
      item.addEventListener('mouseenter', () => onLocate({ q: event.q, r: event.r }));
      item.addEventListener('mouseleave', () => onLocate(null));
    }
    element.appendChild(item);
  }
}

export function describeEvent(event, place) {
  const at = () => place({ q: event.q, r: event.r });
  switch (event.kind) {
    case 'spotted': return `${event.unitName} spotted by ${event.enemyLabel} in ${at()}${HID_WORDS[event.hid] ?? ''}.`;
    case 'alertRise': return `Alert rises: ${event.from} → ${event.to}.`;
    case 'alertDecay': return `Alert eases: ${event.from} → ${event.to}.`;
    case 'reserve': return `${event.label} arrives on the road, ${at()}.`;
    case 'searched': return `${event.label} reaches ${at()} and searches it.`;
    case 'wounded': return `${event.unitName} is hit by ${listOf(event.by)} — wounded.`;
    case 'killed': return `${event.unitName} is hit by ${listOf(event.by)} — killed.`;
    case 'pinned': return `${event.unitName} is fired on by ${listOf(event.by)} — pinned in heavy cover, not hit.`;
    case 'heard': return `${listOf(event.labels)} react${event.labels.length === 1 ? 's' : ''} to ${NOISE_WORDS[event.noise] ?? 'something'} in ${at()}.`;
    case 'bodyFound': return `${event.label} finds ${event.name}'s body in ${at()}.`;
    case 'parachuteFound': return `${event.label} finds ${event.name}'s parachute in ${at()}.`;
    case 'landed': return describeLanding(event, at());
    case 'explosion': return event.destroyed ? `BOOM — the ${event.label.toLowerCase()} goes up. Destroyed.` : `BOOM — a charge goes off on the ${event.label.toLowerCase()}. It still stands.`;
    case 'blastKilled': return `${event.unitName} is caught in the blast at the ${event.label.toLowerCase()} — killed.`;
    case 'enemyBlastKilled': return `The ${event.enemyLabel.toLowerCase()} is caught in the blast at the ${event.label.toLowerCase()} — killed.`;
    case 'diversion': return 'RAF diversion called: bombers over the town. The garrison looks the other way.';
    case 'noReserve': return event.deployed
      ? `With the ${event.label.toLowerCase()} gone, the garrison can call up nobody more — but the reserve is already out.`
      : `With the ${event.label.toLowerCase()} gone, the garrison cannot call up its reserve squad.`;
    case 'withdrawn': return `The ${event.enemyLabel.toLowerCase()} leaves the field to deal with the ${event.label.toLowerCase()}.`;
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
export function describeDetection(d) {
  let sum = `${d.enemyLabel}: ${d.base} − cover ${d.cover} − conceal ${d.concealment}`;
  if (d.hidden) sum += ` − hidden ${d.hidden}`;
  sum += ` + close ${d.proximity}`;
  if (d.alert) sum += ` + alert ${d.alert}`;
  if (d.trait) sum += ` ${d.trait > 0 ? '+' : '−'} trait ${Math.abs(d.trait)}`;
  return `${sum} = ${d.score} of ${d.threshold}`;
}

/** The whole hover path's risk in one phrase. The pips on the board say which hex. */
export function describeRisk(plan, risk, place) {
  if (!plan || !risk) return null;
  const tested = plan.steps === 0 ? [0] : plan.path.map((_, i) => i).slice(1);
  const seen = tested.filter((i) => risk[i]);
  if (seen.length === 0) return plan.steps === 0 ? 'unseen here' : 'unseen all the way';
  const spotted = seen.filter((i) => risk[i].spotted);
  const shot = seen.filter((i) => risk[i].shot);
  const worstAt = seen.reduce((a, b) => (risk[b].score > risk[a].score ? b : a));
  const where = place(plan.path[worstAt]);
  if (shot.length > 0) {
    // The shot lands on the most exposed hex he would be shot on (SPEC.md §5).
    const worst = shot.find((i) => risk[i].shotResult === 'hit') ?? shot[0];
    const cover = risk[worst].coverLabel;
    const outcome = risk[worst].shotResult === 'hit'
      ? `SHOT — HIT ${cover === 'none' ? 'in the open' : `through ${cover} cover`}`
      : `SHOT — PINNED in ${cover} cover, not hit`;
    return `${outcome}: he is in contact and ${risk[worst].enemyLabel} would see him again in ${place(plan.path[worst])}: ${describeDetection(risk[worst])}`;
  }
  if (spotted.length > 0) {
    return `SPOTTED on ${spotted.length} of ${tested.length} hex${tested.length === 1 ? '' : 'es'} — worst in ${where}: ${describeDetection(risk[worstAt])}`;
  }
  return `seen, not spotted — worst in ${where}: ${describeDetection(risk[worstAt])}`;
}

function describeCost(terrain) {
  return terrain.moveCost === null ? 'impassable' : `move ${terrain.moveCost}`;
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
    button.textContent = state.dropRunId === null ? 'PICK A DROP RUN (1–3)' : 'JUMP  [space]';
    return;
  }
  button.disabled = Boolean(state.outcome);
  if (state.outcome) button.textContent = 'MISSION OVER';
  else if (state.turn >= rules.turnLimit) button.textContent = 'END THE LAST TURN — DAWN  [space]';
  else button.textContent = 'END TURN  [space]';
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
  button.textContent = 'UNDO  [Z]';
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
    // SPEC.md §10: only the primary is needed to win. The star says so, and
    // the optional ones carry their score, or the three read as a checklist.
    const name = html('span', null, [html('b', null, o.primary ? `★ ${o.label}` : o.label), html('i', null, o.primary ? ' needed' : ` +${o.points}`)]);
    item.append(name, html('span', null, o.progress));
    attachPopup(item, () => [
      html('b', null, o.label.toUpperCase()),
      `\n${o.primary ? 'Primary: needed to win.' : `Optional: +${o.points} score.`}\n${o.detail}.`,
    ]);
    element.appendChild(item);
  }
  const out = html('li', null, [html('span', null, 'Men out at the exfil'), html('span', null, `${mission.out}/${mission.minimumOut}`)]);
  attachPopup(out, [html('b', null, 'MEN OUT'), `\nAt least ${mission.minimumOut} must reach the exfil for the mission to count.`]);
  element.appendChild(out);
}

/** The RAF diversion (SPEC.md §4): one button for the whole stick, not a trooper action. */
export function renderDiversion(button, check) {
  button.disabled = !check.ok;
  button.replaceChildren('RAF DIVERSION', html('small', null, check.ok ? `[D] ${check.left === 1 ? 'once' : `${check.left} left`}, no AP` : check.reason));
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
export function renderResults(element, outcome, levelLabel, banner) {
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
    row.insertCell().textContent = line.label;
    row.insertCell().textContent = `+${line.points}`;
  }
  const total = score.insertRow();
  total.className = 'total';
  total.insertCell().textContent = 'SCORE';
  total.insertCell().textContent = String(outcome.score.total);

  const again = html('button', 'btn', 'PLAY AGAIN');
  again.type = 'button';
  again.addEventListener('click', () => window.location.reload());

  element.append(
    titleBanner(banner),
    html('div', 'kicker', 'THE BACK PAGE · HOW DID YOUR STICK DO?'),
    html('h2', null, OUTCOME_WORDS[outcome.kind]),
    html('p', null, `${outcome.reason[0].toUpperCase()}${outcome.reason.slice(1)}. Turn ${outcome.turn}, on ${levelLabel}.`),
    fates,
    score,
    html('div', 'again', [again]),
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
  return [html('b', null, `${run.label.toUpperCase()} · ${run.tag.toUpperCase()}`), `\n${run.description}\nWind ${run.wind}: the scatter leans that way.\nClick to pick this run.`];
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
    element.textContent = 'Select a man: 1–6, Tab, or click him.';
    return;
  }
  element.classList.remove('idle');
  // Three rows at most (index.html): a man with more than nine actions — a
  // gunner who also carries a charge — gets a fourth column instead.
  element.classList.toggle('four', actions.length > 9);
  for (const action of actions) {
    // Key and verb only; the cost, and why not, are the rollover, which has
    // the full name where the button has a short one.
    const button = html('button', 'action', [html('span', 'action-key', action.key), html('span', 'action-name', action.short ?? action.label)]);
    button.type = 'button';
    if (action.active) button.classList.add('active');
    button.disabled = !action.ok && !action.active;
    button.addEventListener('click', () => onAction(action.id));
    // A disabled button gets no mouse events in some browsers, and "why not"
    // is exactly the rollover a disabled one needs, so it goes on a wrapper.
    const wrap = html('div', 'action-wrap', button);
    attachPopup(wrap, () => [
      html('b', null, action.label.toUpperCase()),
      `\n${action.help}\n${action.ok || action.active ? `Cost: ${action.cost}` : `Not now: ${action.reason}`}`,
    ]);
    element.appendChild(wrap);
  }
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
  return `${effect.name}: ${words}`;
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

/**
 * A fixed-height readout about whatever the mouse is over. With a trooper
 * selected this is the path readout SPEC.md §4 asks for: route, total AP, and
 * why not if not, with the detection risk along the path. Over an enemy, what
 * that enemy is doing. The terrain legend is folded in here (SPEC.md §11).
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
    if (e.investigating) doing = `going to look at ${view.place(e.investigating)}`;
    if (e.watching) doing = `has a man in its sights in ${view.place(e.watching)}`;
    if (e.suppressed) doing = `SUPPRESSED — will not fire or move this turn${e.killable ? ', and a gunner can kill it until the end of next turn' : ''}`;
    else if (e.openToKill && e.killable) doing = `${doing}; still shaken — a gunner can kill it this turn`;
    const killable = e.killable ? '' : ' CANNOT BE KILLED — suppress it to get past.';
    element.textContent = `${e.label} — ${e.typeLabel}, vision ${view.hoverEnemyVision} hexes, facing ${view.hoverEnemyFacing}, ${doing}. Detection base ${e.detection}.${killable}`;
    return;
  }
  if (!hex) {
    if (state.phase === 'drop') {
      element.textContent = view?.dropLabel ?? 'Pick a drop run with 1–3 or its button. Hover the board to see what landing there would mean.';
      return;
    }
    element.textContent = state.selectedUnitId
      ? `Hover a hex to preview the move. Right-click or Esc to cancel.${view?.commandLabel ? ` ▸ ${view.commandLabel[0].toUpperCase()}${view.commandLabel.slice(1)}.` : ''}`
      : 'Click a man to select him, or a hex to see what it is.';
    return;
  }

  const terrain = terrainAt(map, hex.q, hex.r);
  if (!terrain) {
    element.textContent = 'off the map';
    return;
  }

  const parts = [
    describeCost(terrain),
    `cover ${terrain.cover}`,
    terrain.blocksLOS ? 'blocks line of sight' : 'no line of sight block',
  ];
  if (terrain.spotBonus) parts.push(`spot ${terrain.spotBonus > 0 ? '+' : ''}${terrain.spotBonus}`);
  if (terrain.landing === 'bad') parts.push('bad landing');
  if (terrain.landing === 'wounds') parts.push('landing wounds');

  // Most important first: the readout is a fixed height (index.html), and
  // whatever does not fit is cut from the end. The move, a blast and the
  // detection risk must never be what gets cut.
  const pieces = [view?.dropLabel, view?.moveLabel, view?.blastLabel, view?.riskLabel, view?.hideLabel, view?.siteLabel, parts.join(', '), view?.commandLabel];
  element.textContent = `${terrain.label.toUpperCase()} — ${pieces.filter(Boolean).join('   ▸ ')}`;
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

/** Data problems have to be loud, or a data-driven map is a guessing game. */
export function renderError(element, error) {
  element.hidden = false;
  element.textContent = error.message;
  console.error(error);
}
