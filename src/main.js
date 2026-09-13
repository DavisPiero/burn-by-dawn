// Bootstrap: owns the state and the render loop. board.js only draws;
// this module is the one place state actually changes (CLAUDE.md rule 7).

import { createInitialState, selectHex } from './state.js';
import { renderBoard, boardPixelBounds } from './render/board.js';

// Grid dimensions and hex size, SPEC.md §2. These belong in data/map.json
// once terrain loading lands at M1 — hardcoded here only because M0 has no
// map data to load yet.
const CONFIG = { width: 18, height: 13, hexSize: 46 };

let state = createInitialState();

const svg = document.getElementById('board');
const coordReadout = document.getElementById('coord-readout');

function setupViewBox() {
  const b = boardPixelBounds(CONFIG);
  svg.setAttribute('viewBox', `${b.minX} ${b.minY} ${b.maxX - b.minX} ${b.maxY - b.minY}`);
}

function render() {
  renderBoard(svg, state, CONFIG, handleHexClick);
  coordReadout.textContent = state.selected
    ? `Selected hex: (${state.selected.q}, ${state.selected.r})`
    : 'No hex selected — click one.';
}

function handleHexClick(q, r) {
  state = selectHex(state, q, r);
  render();
}

setupViewBox();
render();
