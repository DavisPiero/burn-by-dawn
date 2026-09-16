// Bootstrap: owns the state, the input handling and the render loop. The
// render modules only draw; this module is the one place state actually
// changes (CLAUDE.md rule 7), and the one place game rules and rendering meet.

import { loadMap, loadJson } from './map.js';
import {
  createInitialState, deselect, endTurn, holdUnit, isDawn, moveUnit,
  nextUnitId, selectHex, selectUnit, selectedUnit, setHover,
} from './state.js';
import { planMove, reachableFor, unitAt } from './units.js';
import { boardPixelBounds, createBoard, renderPieces } from './render/board.js';
import {
  describePlan, renderEndTurnButton, renderError, renderLegend, renderReadout,
  renderRoster, renderTurnCounter,
} from './render/ui.js';

const svg = document.getElementById('board');
const readout = document.getElementById('coord-readout');
const legend = document.getElementById('legend');
const errorBox = document.getElementById('error');
const turnCounter = document.getElementById('turn-counter');
const endTurnButton = document.getElementById('end-turn');
const rosterList = document.getElementById('roster');

let state = null;
let map = null;
let rules = null;
let layers = null;

/**
 * Everything the renderers need that is derived rather than stored: where the
 * selected trooper can go, and what the hovered move would cost. Pathing is a
 * game rule, so it is computed here and handed to the render modules already
 * worked out.
 */
function deriveView() {
  const unit = selectedUnit(state);
  if (!unit) return { reachable: null, plan: null, moveLabel: null };

  const reachable = reachableFor(map, state.units, unit, rules);
  const hex = state.hoverHex;
  const plan = hex ? planMove(map, state.units, unit, hex, rules) : null;
  const moveLabel = hex ? describePlan(plan, unit) : null;
  return { reachable, plan, moveLabel };
}

function render() {
  const view = deriveView();
  renderPieces(layers, state, view);
  renderTurnCounter(turnCounter, state, rules);
  renderEndTurnButton(endTurnButton, state, rules);
  renderRoster(rosterList, state, map, handleRosterClick);
  renderReadout(readout, state, map, view);
}

// --- input ------------------------------------------------------------------

function handleHexClick(q, r) {
  const unit = unitAt(state.units, q, r);
  if (unit) {
    state = selectUnit(state, unit.id);
  } else {
    const mover = selectedUnit(state);
    const plan = mover ? planMove(map, state.units, mover, { q, r }, rules) : null;
    // An unaffordable target does nothing rather than moving part of the way:
    // a half-finished move the player did not ask for is worse than no move.
    if (plan && plan.affordable) {
      state = moveUnit(state, mover.id, plan);
    } else if (!mover) {
      state = selectHex(state, q, r);
    }
  }
  render();
}

function handleHexHover(q, r) {
  state = setHover(state, { q, r });
  render();
}

function handleHexLeave() {
  state = setHover(state, null);
  render();
}

function handleRosterClick(unitId) {
  state = selectUnit(state, unitId);
  render();
}

function handleEndTurn() {
  if (isDawn(state, rules)) return;
  state = endTurn(state, rules);
  render();
}

// SPEC.md §4: 1–6 select, Tab cycle, Space end turn, Esc cancel, H hold.
// R toggles the patrol-route overlay, which has nothing to toggle until the
// patrols exist at M4, so it is left unbound rather than bound to nothing.
function handleKey(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key;

  if (key >= '1' && key <= '9') {
    const unit = state.units[Number(key) - 1];
    if (unit) {
      state = selectUnit(state, unit.id);
      render();
    }
    return;
  }

  switch (key) {
    case 'Tab': {
      event.preventDefault();
      const next = nextUnitId(state);
      if (next) state = selectUnit(state, next);
      break;
    }
    case ' ':
      event.preventDefault();
      if (isDawn(state, rules)) return;
      state = endTurn(state, rules);
      break;
    case 'Escape':
      state = deselect(state);
      break;
    case 'h':
    case 'H': {
      const unit = selectedUnit(state);
      if (!unit) return;
      state = holdUnit(state, unit.id);
      const next = nextUnitId(state);
      if (next) state = selectUnit(state, next);
      break;
    }
    default:
      return;
  }
  render();
}

// --- start ------------------------------------------------------------------

// Tells the failure reporter in index.html that the module did run, so it can
// tell "the browser would not run this" apart from "this threw".
window.dispatchEvent(new Event('night-drop-started'));

try {
  map = await loadMap();
  rules = await loadJson('data/rules.json');
  const roster = await loadJson('data/roster.json');

  state = createInitialState(roster, rules, map);

  const bounds = boardPixelBounds(map);
  svg.setAttribute('viewBox', `${bounds.minX} ${bounds.minY} ${bounds.maxX - bounds.minX} ${bounds.maxY - bounds.minY}`);

  layers = createBoard(svg, map, {
    onHexClick: handleHexClick,
    onHexHover: handleHexHover,
    onHexLeave: handleHexLeave,
  });

  // Right-click cancels (SPEC.md §4), so the browser menu has to get out of
  // the way over the board.
  svg.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    state = deselect(state);
    render();
  });
  endTurnButton.addEventListener('click', handleEndTurn);
  window.addEventListener('keydown', handleKey);

  renderLegend(legend, map);
  render();

  // The board is up. The failure reporter in index.html stops attributing
  // stray page errors — extensions throw plenty — to the game's startup.
  window.dispatchEvent(new Event('night-drop-ready'));
} catch (error) {
  readout.textContent = '';
  renderError(errorBox, error);
}
