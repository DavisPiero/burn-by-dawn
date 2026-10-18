/**
 * The layout tool (M48k): with `?layout` in the address, each thing the
 * operator places by hand (marked `data-layout` by the page and the board) is
 * outlined, dashed, and dragged where they want it. A panel says how many have
 * moved; COPY puts the whole of data/layout.json on the clipboard, to paste
 * over the file; PUT BACK returns everything to where the file has it. PAINT
 * CLEAR (M58e) turns the board's hexes into switches: a click leaves a hex bare
 * paper, or gives it back its ground colour. Nothing
 * is kept in the browser (CLAUDE.md rule 9): the file is the save.
 *
 * It reads the page and asks main.js, through `onChange`, for a new layout;
 * the game's state is never touched.
 */
import { layoutText, moved, movedCount, pixelsToAxial, pixelsToRadii, toggledClear } from '../layout.js';

/** Whether the address asks for the tool: `?layout`. */
export function layoutFromQuery(search) {
  return new URLSearchParams(search).has('layout');
}

/**
 * `layout()` is the layout now, `original` the file as loaded, `onChange(next)`
 * takes a new one (main.js redraws with it), `hexSize` the board's,
 * `missionId()` the mission on the board.
 */
export function startLayoutTool({ layout, original, onChange, hexSize, missionId }) {
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
  let painting = false;
  const paint = button('PAINT CLEAR: OFF', () => {
    painting = !painting;
    paint.textContent = `PAINT CLEAR: ${painting ? 'ON' : 'OFF'}`;
    paint.classList.toggle('on', painting);
    document.documentElement.classList.toggle('layout-painting', painting);
    say(painting ? 'Click a hex to leave it bare paper, or click again to give it back its ground colour.' : '');
  });
  panel.append(head, button('COPY', copy), button('PUT BACK', () => { onChange(original); say(''); update(); }), paint, said);
  // The panel's clicks and keys are its own, never the game's.
  for (const type of ['pointerdown', 'click', 'keydown']) panel.addEventListener(type, (event) => event.stopPropagation());
  document.body.appendChild(panel);

  function update() {
    const n = movedCount(original, layout());
    count.textContent = n === 0 ? 'nothing moved' : `${n} moved`;
  }
  function say(words) {
    said.replaceChildren(words);
  }
  async function copy() {
    const text = layoutText(layout());
    try {
      await navigator.clipboard.writeText(text);
      say('Copied. Open data/layout.json, select all, paste, save.');
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

  // A drag: the thing follows the mouse, and on letting go the layout is
  // moved by as much, in the thing's own units.
  let drag = null;
  document.addEventListener('pointerdown', (event) => {
    const target = event.target.closest?.('[data-layout]');
    if (!target || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    drag = { target, x: event.clientX, y: event.clientY, delta: [0, 0], base: target.style.translate, transform: target.getAttribute('transform') };
    target.classList.add('layout-dragging');
  }, true);
  document.addEventListener('pointermove', (event) => {
    if (!drag) return;
    event.preventDefault();
    drag.delta = local(drag.target, event.clientX - drag.x, event.clientY - drag.y);
    const [dx, dy] = drag.delta;
    if (drag.target.ownerSVGElement) drag.target.setAttribute('transform', `translate(${dx} ${dy})`);
    else drag.target.style.translate = translated(drag.base, dx, dy);
  }, true);
  document.addEventListener('pointerup', (event) => {
    if (!drag) return;
    event.stopPropagation();
    const { target, delta } = drag;
    drag = null;
    target.classList.remove('layout-dragging');
    if (!delta[0] && !delta[1]) return;
    const key = target.dataset.layout;
    const svgUnits = Boolean(target.ownerSVGElement);
    const step = !svgUnits ? delta.map(Math.round) : key.endsWith(':dropCue') ? pixelsToAxial(delta, hexSize) : pixelsToRadii(delta, hexSize);
    const from = target.dataset.layoutAt ? JSON.parse(target.dataset.layoutAt) : [0, 0];
    onChange(moved(layout(), key, step, from));
    say('');
    update();
  }, true);
  // A click on a placed thing is the end of a drag, never a choice (START HERE is on the course's line).
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

/** A move on the screen in the thing's own pixels: the board's units for SVG, or the page's before it is zoomed to fit. */
function local(target, dx, dy) {
  const svg = target.ownerSVGElement;
  if (svg) {
    const m = svg.getScreenCTM();
    return m ? [dx / m.a, dy / m.d] : [dx, dy];
  }
  const parent = target.parentElement;
  const zoom = parent.getBoundingClientRect().width / (parent.offsetWidth || 1) || 1;
  return [dx / zoom, dy / zoom];
}

/** A CSS `translate` moved by more. */
function translated(base, dx, dy) {
  const [x = 0, y = 0] = (base || '0px 0px').split(' ').map(parseFloat);
  return `${x + dx}px ${y + dy}px`;
}
