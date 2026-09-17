// Shared test setup. The game puts the stick on the board with a seeded drop
// (SPEC.md §9); most tests want the men somewhere known instead, so they land
// them on these hexes — the fixed deployment the game used before M6 — through
// the same landStick the drop uses.

import { landStick } from '../src/drop.js';
import { createInitialState } from '../src/state.js';

export const TEST_LANDING = [[2, 2], [6, 1], [2, 1], [8, 3], [9, 2], [7, 5]];

/** createInitialState, then everyone landed on TEST_LANDING in roster order (as many as it has hexes for). */
export function landedState(roster, traits, rules, map, seed = 0) {
  const state = createInitialState(roster, traits, rules, map, seed);
  const landings = state.units.slice(0, TEST_LANDING.length)
    .map((u, i) => ({ unitId: u.id, q: TEST_LANDING[i][0], r: TEST_LANDING[i][1] }));
  return landStick(state, landings, map, rules).state;
}
