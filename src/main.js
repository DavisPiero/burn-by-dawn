// Bootstrap: owns the state, the input handling and the render loop. The
// render modules only draw; this module is the one place state actually
// changes (CLAUDE.md rule 7), and the one place game rules and rendering meet.

import { alertIndex, detectionAt, routePath, visibleHexes, visionRadiusOf } from './enemy.js';
import { DIRECTION_NAMES } from './hex.js';
import { loadMap, loadJson } from './map.js';
import {
  createInitialState, deselect, endTurn, holdUnit, isDawn, moveUnit,
  nextUnitId, selectHex, selectUnit, selectedUnit, setHover, toggleRoutes,
} from './state.js';
import { validateTraits } from './traits.js';
import { planMove, reachableFor, traitEffects, unitAt } from './units.js';
import { boardPixelBounds, createBoard, renderPieces } from './render/board.js';
import {
  describePlan, describeRisk, renderAlertDial, renderEndTurnButton, renderError, renderLegend,
  renderReadout, renderReport, renderRoster, renderTurnCounter,
} from './render/ui.js';

const svg = document.getElementById('board');
const readout = document.getElementById('coord-readout');
const legend = document.getElementById('legend');
const errorBox = document.getElementById('error');
const turnCounter = document.getElementById('turn-counter');
const endTurnButton = document.getElementById('end-turn');
const rosterList = document.getElementById('roster');
const alertDial = document.getElementById('alert-dial');
const alertCaption = document.getElementById('alert-caption');
const reportList = document.getElementById('report');

let state = null;
let map = null;
let rules = null;
let layers = null;

// Vision only changes when an enemy moves or the alert changes, not on every
// hover, so it is worked out once per enemy phase rather than per mouse move.
let visionCache = { enemies: null, points: null, byId: null };

function visionById() {
  if (visionCache.enemies !== state.enemies || visionCache.points !== state.alert.points) {
    visionCache = {
      enemies: state.enemies,
      points: state.alert.points,
      byId: new Map(state.enemies.map((e) => [e.id, visibleHexes(map, e, state.alert.points, rules)])),
    };
  }
  return visionCache.byId;
}

/**
 * Everything the renderers need that is derived rather than stored: where the
 * selected trooper can go, what the hovered move would cost and how likely it
 * is to get him seen, and what every enemy can see. Pathing, vision and
 * detection are game rules, so they are computed here and handed to the
 * render modules already worked out.
 */
function deriveView() {
  // What each man's traits do to his numbers, for the roster. Base values come
  // from rules.json, which the render modules do not read.
  const traitEffectsById = new Map(state.units.map((u) => [u.id, traitEffects(u, rules)]));

  const hex = state.hoverHex;
  const hoverEnemy = hex ? state.enemies.find((e) => e.q === hex.q && e.r === hex.r) ?? null : null;
  const routes = (state.showRoutes ? state.enemies : hoverEnemy ? [hoverEnemy] : [])
    .map((e) => routePath(map, e))
    .filter(Boolean);
  const spottedIds = new Set(state.report.filter((e) => e.kind === 'spotted').map((e) => e.unitId));

  const view = {
    traitEffectsById,
    visionById: visionById(),
    hoverEnemy,
    hoverEnemyVision: hoverEnemy ? visionRadiusOf(map, hoverEnemy, state.alert.points, rules) : null,
    hoverEnemyFacing: hoverEnemy ? DIRECTION_NAMES[hoverEnemy.facing] : null,
    routes,
    spottedIds,
    alert: {
      index: alertIndex(state.alert.points, rules),
      states: rules.alert.states,
      points: state.alert.points,
      quietTurns: state.alert.quietTurns,
      quietTurnsToDecay: rules.alert.quietTurnsToDecay,
    },
    reachable: null,
    plan: null,
    moveLabel: null,
    risk: null,
    riskLabel: null,
  };

  const unit = selectedUnit(state);
  if (!unit) return view;

  view.reachable = reachableFor(map, state.units, unit, rules, state.enemies);
  if (!hex || hoverEnemy) return view;

  const plan = planMove(map, state.units, unit, hex, rules, state.enemies);
  view.plan = plan;
  view.moveLabel = describePlan(plan, unit);
  if (plan) {
    // The detection phase tests every hex he enters, or the hex he stands on
    // if he stays put (enemy.js testedHexes), so that is what gets pips.
    view.risk = plan.path.map((step, i) => (
      i === 0 && plan.steps > 0 ? null : detectionAt(map, rules, state.enemies, state.alert.points, unit, step)
    ));
    view.riskLabel = describeRisk(plan, view.risk);
  }
  return view;
}

function render() {
  const view = deriveView();
  renderPieces(layers, state, view);
  renderAlertDial(alertDial, alertCaption, view.alert);
  renderReport(reportList, state);
  renderTurnCounter(turnCounter, state, rules);
  renderEndTurnButton(endTurnButton, state, rules);
  renderRoster(rosterList, state, map, view, handleRosterClick);
  renderReadout(readout, state, map, view);
}

// --- input ------------------------------------------------------------------

function handleHexClick(q, r) {
  const unit = unitAt(state.units, q, r);
  if (unit) {
    state = selectUnit(state, unit.id);
  } else {
    const mover = selectedUnit(state);
    const plan = mover ? planMove(map, state.units, mover, { q, r }, rules, state.enemies) : null;
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
  state = endTurn(state, rules, map);
  render();
}

// SPEC.md §4: 1–6 select, Tab cycle, Space end turn, Esc cancel, H hold,
// R toggle the patrol-route overlay.
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
      state = endTurn(state, rules, map);
      break;
    case 'r':
    case 'R':
      state = toggleRoutes(state);
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
  const traits = validateTraits(await loadJson('data/traits.json'));
  const roster = await loadJson('data/roster.json');

  state = createInitialState(roster, traits, rules, map);

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
