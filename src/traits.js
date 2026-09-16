// The trait hook system, SPEC.md §5.
//
// A trait is one entry in data/traits.json naming one hook and one modifier.
// The rules engine calls a hook with a base value and gets back that value
// with the owning trooper's matching modifiers applied. That is the whole
// system, and it stays this small on purpose:
//
//   - The hooks below are fixed. A trait that needs a hook that is not here
//     becomes flavour text; the list is never extended for one character.
//   - A modifier is `add` or `set` on one named stat. No conditions, no usage
//     counts, no references to other traits — validation rejects any field it
//     does not know, so a condition cannot sneak in as data either.
//   - A modifier only ever changes the trooper who owns the trait.
//
// Pure functions. Nothing here knows a trooper by name (CLAUDE.md rule 6).

/**
 * Every hook, the stats it may modify, and the structural floor for each
 * stat. Floors are not balance numbers: they are the values below which the
 * stat stops meaning anything — a negative AP pool, or a move that costs
 * nothing (which would also break A*'s distance heuristic in map.js).
 * `null` means no floor: a detection score can legitimately go negative.
 */
export const HOOKS = {
  onLand:           { landingPenalty: 0, scatterDistance: 0 },
  onActionPoints:   { actionPoints: 0 },
  onMoveCost:       { moveCost: 1 },
  onSpotRadius:     { spotRadius: 0 },
  onDetectionCheck: { detection: null },
  onChargeCapacity: { charges: 0 },
  onPlaceCharge:    { apCost: 0, fuse: 0 },
  onFire:           { alert: 0 },
};

const OPS = ['add', 'set'];
const TRAIT_FIELDS = ['name', 'description', 'hook', 'modifier'];
const MODIFIER_FIELDS = ['stat', 'op', 'value'];

/**
 * Validate data/traits.json and return its table of trait id -> definition.
 * Throws naming the file, the trait and the field, because a typo in a hook
 * name would otherwise be a trait that silently never fires.
 */
export function validateTraits(json, url = 'data/traits.json') {
  const traits = json?.traits;
  if (!traits || typeof traits !== 'object' || Array.isArray(traits)) {
    throw new Error(`${url}: expected a "traits" object of id -> trait`);
  }
  for (const [id, trait] of Object.entries(traits)) {
    const where = `${url}: trait "${id}"`;
    rejectUnknownFields(trait, TRAIT_FIELDS, where);
    if (typeof trait.name !== 'string' || trait.name === '') {
      throw new Error(`${where} needs a "name"`);
    }
    if (!Object.hasOwn(HOOKS, trait.hook)) {
      throw new Error(`${where} names hook "${trait.hook}"; the hooks are ${Object.keys(HOOKS).join(', ')}`);
    }
    const modifier = trait.modifier;
    if (!modifier || typeof modifier !== 'object') {
      throw new Error(`${where} needs one "modifier" object`);
    }
    rejectUnknownFields(modifier, MODIFIER_FIELDS, `${where} modifier`);
    if (!Object.hasOwn(HOOKS[trait.hook], modifier.stat)) {
      throw new Error(`${where}: hook ${trait.hook} cannot modify "${modifier.stat}"; it modifies ${Object.keys(HOOKS[trait.hook]).join(', ')}`);
    }
    if (!OPS.includes(modifier.op)) {
      throw new Error(`${where}: modifier "op" must be ${OPS.join(' or ')}, got ${JSON.stringify(modifier.op)}`);
    }
    if (!Number.isInteger(modifier.value)) {
      throw new Error(`${where}: modifier "value" must be an integer, got ${JSON.stringify(modifier.value)}`);
    }
  }
  return traits;
}

function rejectUnknownFields(object, allowed, where) {
  if (!object || typeof object !== 'object') throw new Error(`${where} must be an object`);
  for (const key of Object.keys(object)) {
    if (!allowed.includes(key)) {
      throw new Error(`${where} has field "${key}"; allowed fields are ${allowed.join(', ')}. A trait is one hook and one modifier (SPEC.md §5)`);
    }
  }
}

/**
 * Call a hook. Applies every modifier the unit's traits hold for this hook and
 * stat to `base`, in the order the traits are listed on the roster entry, then
 * clamps to the stat's floor. Returns the new value and the ids of the traits
 * that changed it, so a readout can say why a number is what it is.
 *
 * `unit.traits` is the array of resolved definitions units.js attaches at
 * creation, each carrying its own `id`.
 */
export function applyHook(unit, hook, stat, base) {
  if (!Object.hasOwn(HOOKS, hook) || !Object.hasOwn(HOOKS[hook], stat)) {
    throw new Error(`applyHook: ${hook}.${stat} is not a hook stat`);
  }
  let value = base;
  const applied = [];
  for (const trait of unit.traits ?? []) {
    if (trait.hook !== hook || trait.modifier.stat !== stat) continue;
    value = trait.modifier.op === 'set' ? trait.modifier.value : value + trait.modifier.value;
    applied.push(trait.id);
  }
  const floor = HOOKS[hook][stat];
  if (floor !== null && value < floor) value = floor;
  return { value, base, applied };
}
