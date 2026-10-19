/**
 * The layout tool (M48k): with `?layout` in the address, each thing the
 * operator places by hand (marked `data-layout` by the page and the board) is
 * outlined, dashed, and dragged where they want it: since M59d the board's
 * labels too, each run's tab, each target's name, EXFIL and each place name. A panel says how many have
 * moved; COPY puts the whole of data/layout.json on the clipboard, to paste
 * over the file; PUT BACK returns everything to where the file has it. PAINT
 * CLEAR (M58e) turns the board's hexes into switches: a click leaves a hex bare
 * paper, or gives it back its ground colour. PAINT GROUND (M59c) is the
 * terrain painter: pick one of the map's own grounds and click or drag over
 * hexes, before the jump; COPY ROWS gives the map's rows, which are rules,
 * for Claude to put in the map file after the tests. Nothing
 * is kept in the browser (CLAUDE.md rule 9): the file is the save.
 *
 * It reads the page and asks main.js, through `onChange`, for a new layout;
 * the game's state is never touched.
 */
import { groundSwatches, layoutText, moved, movedCount, paintedCount, paintedRows, pixelsToAxial, pixelsToRadii, rowsText, targetsOn, toggledClear } from '../layout.js';
import { terrainArt } from './theme.js';

/** Whether the address asks for the tool: `?layout`. */
export function layoutFromQuery(search) {
  return new URLSearchParams(search).has('layout');
}

/**
 * `layout()` is the layout now, `original` the file as loaded, `onChange(next)`
 * takes a new one (main.js redraws with it), `hexSize` the board's,
 * `missionId()` the mission on the board. `ground()` is the map on the board
 * as painted, its rows as the file has them and the file's name ({ map,
 * fileRows, file }), and `onPaint(rows)` sets the mission up over new rows,
 * returning why not if it cannot (M59c).
 */
export function startLayoutTool({ layout, original, onChange, hexSize, missionId, ground, onPaint }) {
  document.documentElement.classList.add('layout-mode');
  const count = document.createElement('span');
  const said = document.createElement('div');
  said.className = 'layout-said';
  const button = (label, act) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = label;
    b.addEventListener('click', act);
    return b;
  };
  const panel = document.createElement('div');
  panel.id = 'layout-panel';
  const head = document.createElement('div');
  head.className = 'layout-head';
  head.append('LAYOUT · drag what is dashed · ', count);
  // One paint at a time: bare paper (PAINT CLEAR) or the ground itself (PAINT GROUND).
  let painting = false;
  let brush = null;
  const swatches = document.createElement('div');
  swatches.className = 'layout-swatches';
  const paint = button('PAINT CLEAR: OFF', () => {
    painting = !painting;
    if (painting) setBrush(null);
    paint.textContent = `PAINT CLEAR: ${painting ? 'ON' : 'OFF'}`;
    paint.classList.toggle('on', painting);
    document.documentElement.classList.toggle('layout-painting', painting);
    say(painting ? 'Click a hex to leave it bare paper, or click again to give it back its ground colour.' : '');
  });
  const paintGround = button('PAINT GROUND: OFF', () => {
    if (brush) {
      setBrush(null);
      say('');
      return;
    }
    if (painting) paint.click();
    showSwatches();
    setBrush(groundSwatches(ground().map)[0].char);
    say('Pick a ground, then click a hex, or hold the button down and drag. Before the jump only.');
  });
  function setBrush(char) {
    brush = char;
    paintGround.textContent = `PAINT GROUND: ${brush ? 'ON' : 'OFF'}`;
    paintGround.classList.toggle('on', Boolean(brush));
    swatches.hidden = !brush;
    for (const swatch of swatches.children) swatch.classList.toggle('on', swatch.dataset.char === brush);
    document.documentElement.classList.toggle('layout-painting', Boolean(brush) || painting);
  }
  // The map's own grounds, each with its colour on the board, its name and its letter.
  function showSwatches() {
    swatches.replaceChildren(...groundSwatches(ground().map).map(({ char, id, label }) => {
      const swatch = button('', () => setBrush(char));
      swatch.dataset.char = char;
      swatch.title = `${label}: ${char} in the map's rows`;
      swatch.append(groundChip(id), `${label} ${char}`);
      return swatch;
    }));
  }
  const putBack = () => {
    onChange(original);
    const { map, fileRows } = ground();
    const refused = paintedCount(fileRows, map.rows) ? onPaint(fileRows) : null;
    say(refused ?? '');
    update();
  };
  const buttons = [button('COPY', copy), button('PUT BACK', putBack), paint];
  if (onPaint) buttons.push(paintGround, button('COPY ROWS', copyRows));
  panel.append(head, ...buttons, swatches, said);
  swatches.hidden = true;
  // The panel's clicks and keys are its own, never the game's.
  for (const type of ['pointerdown', 'click', 'keydown']) panel.addEventListener(type, (event) => event.stopPropagation());
  document.body.appendChild(panel);

  function update() {
    const n = movedCount(original, layout());
    const painted = onPaint ? paintedCount(ground().fileRows, ground().map.rows) : 0;
    count.textContent = `${n === 0 ? 'nothing moved' : `${n} moved`}${painted ? ` · ${painted} ${painted === 1 ? 'hex' : 'hexes'} painted` : ''}`;
  }
  function say(words) {
    said.replaceChildren(words);
  }
  function copy() {
    return copyText(layoutText(layout()), 'Copied. Open data/layout.json, select all, paste, save.');
  }
  // The rows are rules (M59c): they go to Claude, who checks them before they are the map's.
  function copyRows() {
    const { map, file } = ground();
    return copyText(rowsText(map.rows), `Copied the rows of ${file}. Send them to Claude, who puts them in the map after the tests.`);
  }
  async function copyText(text, words) {
    try {
      await navigator.clipboard.writeText(text);
      say(words);
    } catch {
      // No clipboard (an old browser, or not allowed): the text, selected, to copy by hand.
      const box = document.createElement('textarea');
      box.value = text;
      box.readOnly = true;
      say(box);
      box.select();
    }
  }

  // Painting: a click on a hex switches it, and the game never hears the click.
  document.addEventListener('click', (event) => {
    if (!painting) return;
    const hex = event.target.closest?.('#board g[data-q][data-r]');
    if (!hex) return;
    event.preventDefault();
    event.stopPropagation();
    onChange(toggledClear(layout(), missionId(), Number(hex.dataset.q), Number(hex.dataset.r)));
    update();
  }, true);

  // Painting the ground (M59c): the button down on a hex paints it, and every
  // hex the mouse goes over until it comes up; the game hears none of it.
  let brushing = false;
  let lastPainted = null;
  const hexUnder = (event) => event.target.closest?.('#board g[data-q][data-r]');
  const paintHex = (hex) => {
    const key = `${hex.dataset.q},${hex.dataset.r}`;
    if (key === lastPainted) return;
    lastPainted = key;
    const q = Number(hex.dataset.q), r = Number(hex.dataset.r);
    const { map } = ground();
    const rows = paintedRows(map, q, r, brush);
    if (rows === map.rows) return;
    const refused = onPaint(rows);
    if (refused) {
      brushing = false;
      say(`Not painted. ${refused}`);
    } else {
      const targets = targetsOn(map, q, r);
      say(targets.length ? `Painted the ${targets.join(' and the ')}'s own ground: what its ruins take the place of when it goes up.` : '');
    }
    update();
  };
  document.addEventListener('pointerdown', (event) => {
    if (!brush || event.button !== 0) return;
    const hex = hexUnder(event);
    if (!hex) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    brushing = true;
    lastPainted = null;
    paintHex(hex);
  }, true);
  document.addEventListener('pointermove', (event) => {
    if (!brushing) return;
    const hex = hexUnder(event);
    if (hex) paintHex(hex);
  }, true);
  document.addEventListener('pointerup', () => { brushing = false; }, true);
  document.addEventListener('click', (event) => {
    if (!brush || !hexUnder(event)) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  // A drag: the thing follows the mouse, and on letting go the layout is
  // moved by as much, in the thing's own units.
  let drag = null;
  document.addEventListener('pointerdown', (event) => {
    const target = event.target.closest?.('[data-layout]');
    if (!target || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    // What it is and its scale are taken now (M58e): the board may be redrawn
    // under the drag, which leaves this element out of the page.
    const svgUnits = Boolean(target.ownerSVGElement);
    drag = { target, key: target.dataset.layout, svgUnits, scale: scaleOf(target), x: event.clientX, y: event.clientY, delta: [0, 0], base: target.style.translate };
    target.classList.add('layout-dragging');
    // No hover while dragging: a hex hovered redraws the board (the operator's
    // M58e error, dragging a note in Norway across the plateau).
    document.documentElement.classList.add('layout-drag-on');
  }, true);
  document.addEventListener('pointermove', (event) => {
    if (!drag) return;
    event.preventDefault();
    drag.delta = [(event.clientX - drag.x) / drag.scale[0], (event.clientY - drag.y) / drag.scale[1]];
    const [dx, dy] = drag.delta;
    const target = live(drag);
    if (!target) return;
    if (drag.svgUnits) target.setAttribute('transform', `translate(${dx} ${dy})`);
    else target.style.translate = translated(drag.base, dx, dy);
  }, true);
  document.addEventListener('pointerup', (event) => {
    if (!drag) return;
    event.stopPropagation();
    const { delta, key, svgUnits } = drag;
    const target = live(drag);
    drag = null;
    document.documentElement.classList.remove('layout-drag-on');
    target?.classList.remove('layout-dragging');
    if (!delta[0] && !delta[1]) return;
    const step = !svgUnits ? delta.map(Math.round) : key.endsWith(':dropCue') ? pixelsToAxial(delta, hexSize) : pixelsToRadii(delta, hexSize);
    const from = target?.dataset.layoutAt ? JSON.parse(target.dataset.layoutAt) : [0, 0];
    onChange(moved(layout(), key, step, from));
    say('');
    update();
  }, true);
  // A click on a placed thing is the end of a drag, never a choice (the clipboard sits on the course's page).
  document.addEventListener('click', (event) => {
    if (!event.target.closest?.('[data-layout]')) return;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  // The board's things are SVG, which takes no CSS outline: a dashed box is
  // drawn round each after every redraw.
  const board = document.getElementById('board');
  const outline = () => {
    watch.disconnect();
    for (const old of board.querySelectorAll('.layout-outline')) old.remove();
    for (const thing of board.querySelectorAll('[data-layout]')) {
      const box = thing.getBBox();
      if (!box.width) continue;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      for (const [name, value] of Object.entries({ x: box.x - 6, y: box.y - 4, width: box.width + 12, height: box.height + 8, class: 'layout-outline' })) rect.setAttribute(name, value);
      thing.before(rect);
    }
    watch.observe(board, { childList: true, subtree: true });
  };
  const watch = new MutationObserver(() => setTimeout(outline, 0));
  outline();
  update();
}

/** Screen pixels per the thing's own pixel, [x, y]: the board's units for SVG, or the page's before it is zoomed to fit. */
function scaleOf(target) {
  const svg = target.ownerSVGElement;
  if (svg) {
    const m = svg.getScreenCTM();
    return m && m.a && m.d ? [m.a, m.d] : [1, 1];
  }
  const parent = target.parentElement;
  const zoom = parent ? parent.getBoundingClientRect().width / (parent.offsetWidth || 1) || 1 : 1;
  return [zoom, zoom];
}

/** The thing being dragged as the page has it now: the same element, or, if the board was redrawn, the one drawn in its place. */
function live(drag) {
  if (drag.target.isConnected) return drag.target;
  const now = [...document.querySelectorAll('[data-layout]')].find((el) => el.dataset.layout === drag.key);
  if (now) {
    drag.target = now;
    now.classList.add('layout-dragging');
  }
  return now ?? null;
}

/** A CSS `translate` moved by more. */
function translated(base, dx, dy) {
  const [x = 0, y = 0] = (base || '0px 0px').split(' ').map(parseFloat);
  return `${x + dx}px ${y + dy}px`;
}

/** A ground as a small square of the board (M59c): its colour, its tint and its mark, from the sprite registry. */
function groundChip(terrainId) {
  const ns = 'http://www.w3.org/2000/svg';
  const art = terrainArt(terrainId);
  const chip = document.createElementNS(ns, 'svg');
  chip.setAttribute('class', 'layout-chip');
  chip.setAttribute('viewBox', '0 0 20 20');
  const square = (fill, opacity) => {
    const rect = document.createElementNS(ns, 'rect');
    for (const [name, value] of Object.entries({ width: 20, height: 20, fill, 'fill-opacity': opacity })) rect.setAttribute(name, value);
    chip.appendChild(rect);
  };
  square(art.fill, 1);
  const tint = art.tint ?? art.area?.tint;
  if (tint) square(art.tintFill ?? art.area.tintFill, tint[1]);
  if (art.motif) {
    const use = document.createElementNS(ns, 'use');
    for (const [name, value] of Object.entries({ href: `#${art.variants ? `${art.motif}-01` : art.motif}`, width: 20, height: 20 })) use.setAttribute(name, value);
    chip.appendChild(use);
  }
  return chip;
}
