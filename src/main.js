// Bootstrap: owns the state and the render loop. The render modules only draw;
// this module is the one place state actually changes (CLAUDE.md rule 7).

import { createInitialState, selectHex } from './state.js';
import { loadMap } from './map.js';
import { renderBoard, boardPixelBounds } from './render/board.js';
import { renderLegend, renderReadout, renderError } from './render/ui.js';

const svg = document.getElementById('board');
const readout = document.getElementById('coord-readout');
const legend = document.getElementById('legend');
const errorBox = document.getElementById('error');

let state = createInitialState();
let map = null;

function setupViewBox() {
  const b = boardPixelBounds(map);
  svg.setAttribute('viewBox', `${b.minX} ${b.minY} ${b.maxX - b.minX} ${b.maxY - b.minY}`);
}

function render() {
  renderBoard(svg, state, map, handleHexClick);
  renderReadout(readout, state, map);
}

function handleHexClick(q, r) {
  state = selectHex(state, q, r);
  render();
}

// Board dimensions and hex size now come from data/map.json — they were
// hardcoded here at M0 because there was no map data to load yet.
try {
  map = await loadMap();
  setupViewBox();
  renderLegend(legend, map);
  render();
} catch (error) {
  readout.textContent = '';
  renderError(errorBox, error);
}
