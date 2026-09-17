// The one source of randomness (SPEC.md §1, CLAUDE.md rule 4). Seeded, so a
// seed and the player's choices reproduce a playthrough exactly.
//
// mulberry32: 32 bits of state, fast, and plenty for scatter dice. Nothing
// here is cryptographic and nothing needs to be.

/** A seed from the page address, `?seed=N`, or null if there is none or it is not a whole number. */
export function seedFromQuery(search) {
  const raw = new URLSearchParams(search).get('seed');
  if (raw === null || !/^\d+$/.test(raw)) return null;
  return Number(raw) >>> 0;
}

/** A fresh seed when none was asked for. The clock picks it; the RNG never touches the clock. */
export function freshSeed(now) {
  return Math.floor(now) >>> 0;
}

/**
 * A generator for `seed`. Each call to next() advances it. Two generators made
 * from the same seed give the same numbers in the same order.
 */
export function createRng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    /** A float in [0, 1). */
    next,
    /**
     * An index into `weights`, chosen in proportion to them. Returns -1 if
     * every weight is zero, so a caller can fall back rather than get a
     * silent pick of index 0.
     */
    weighted(weights) {
      const total = weights.reduce((n, w) => n + w, 0);
      if (total <= 0) return -1;
      let roll = next() * total;
      for (let i = 0; i < weights.length; i++) {
        roll -= weights[i];
        if (roll < 0 && weights[i] > 0) return i;
      }
      return weights.findLastIndex((w) => w > 0);
    },
  };
}
