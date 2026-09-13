// Game state shape and pure transitions. Rendering reads state and never
// mutates it — see CLAUDE.md hard rule 7. Turn advance and save/load land
// in later milestones; M0 only needs hex selection.

export function createInitialState() {
  return {
    selected: null, // { q, r } | null
  };
}

export function selectHex(state, q, r) {
  return { ...state, selected: { q, r } };
}

export function deselectHex(state) {
  return { ...state, selected: null };
}
