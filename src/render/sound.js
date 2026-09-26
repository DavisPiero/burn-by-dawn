// Sound (ART-ASSETS.md §9, SPEC.md §11). The sounds of the table: a counter
// snapped down, a pencil, a turned card, a dog a long way off — and, since
// M11, one from the battlefield: a charge going off is a real explosion, the
// payoff of the whole plan. Since M12 the back page has its own: the village
// church's bells for a mission accomplished, a tolling bell and a far siren
// for the rest. The RAF's bombs, miles off, stay muffled crumps. Presentation only, like the rest of render/: it
// is told what happened and never looks at a rule.
//
// Each sound is made in code with Web Audio until a file is supplied, the way
// theme.js draws art until a picture is: drop assets/audio/<id>.mp3 in and it
// is played instead. A missing file is fine.
//
// The noise the placeholders are made from comes from a fixed seed through
// rng.js (CLAUDE.md rule 4), so every rustle is drawn from the same sheet.

import { createRng } from '../rng.js';

// One format, MP3, which every current browser plays: a second would double the
// requests for files that are not there yet.
export const SOUND_FILES = { dir: 'assets/audio', types: ['mp3'] };

const NOISE_SEED = 1944;

let context = null;
// The noise sheet for each context: made once per context from the fixed seed.
const noiseByContext = new WeakMap();
// No sound until the player has pressed something: a cue before that would
// wait in a suspended context and all go off at the first click.
let unlocked = false;
let muted = false;
// Supplied files: fetched at load, decoded once there is an audio context
// (there is none until the player has pressed something), then played.
const fetched = new Map();
const supplied = new Map();

function audio() {
  if (context) return context;
  const Context = window.AudioContext ?? window.webkitAudioContext;
  if (!Context) return null;
  context = new Context();
  for (const [id, bytes] of fetched) decode(id, bytes);
  fetched.clear();
  return context;
}

function decode(id, bytes) {
  context.decodeAudioData(bytes).then((buffer) => supplied.set(id, buffer), () => {
    // Not a sound this browser can play: keep the placeholder.
  });
}

// --- building blocks ----------------------------------------------------------

/** A gain node shaped as quick attack, then decay to silence over `length` s. */
function envelope(ctx, at, peak, length, attack = 0.004) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  return gain;
}

function filter(ctx, type, frequency, q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = q;
  return f;
}

/** Two seconds of white noise for this context, made once: every placeholder is cut from it. */
function noiseSheet(ctx) {
  let sheet = noiseByContext.get(ctx);
  if (sheet) return sheet;
  const rng = createRng(NOISE_SEED);
  sheet = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = sheet.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = rng.next() * 2 - 1;
  noiseByContext.set(ctx, sheet);
  return sheet;
}

/** Noise through `nodes` in order to `out`, from `at` for `length` s, starting `offset` s into the sheet. */
function noiseThrough(ctx, out, at, length, nodes, offset = 0) {
  const source = ctx.createBufferSource();
  source.buffer = noiseSheet(ctx);
  let last = source;
  for (const node of nodes) {
    last.connect(node);
    last = node;
  }
  last.connect(out);
  source.start(at, offset % 1.5, length);
}

/**
 * A struck bell: a handful of sine partials at a bell's out-of-tune ratios
 * (hum, prime, minor third, fifth, nominal and above), each dying away at its
 * own rate, and a short tick of the clapper. `freq` is the prime.
 */
function bell(ctx, out, at, freq, peak, length) {
  const partials = [[0.5, 0.3, 1], [1, 0.5, 0.75], [1.19, 0.28, 0.5], [1.5, 0.18, 0.4], [2, 0.26, 0.32], [2.52, 0.12, 0.22], [3, 0.08, 0.16]];
  for (const [ratio, amp, share] of partials) {
    const tone = ctx.createOscillator();
    tone.frequency.value = freq * ratio;
    tone.connect(envelope(ctx, at, peak * amp, length * share, 0.003)).connect(out);
    tone.start(at);
    tone.stop(at + length * share + 0.05);
  }
  noiseThrough(ctx, out, at, 0.03, [filter(ctx, 'bandpass', Math.min(freq * 4, 8000), 2), envelope(ctx, at, peak * 0.25, 0.025, 0.001)], freq / 1000);
}

// --- the placeholders -----------------------------------------------------------
// Each is (ctx, out, at, variant): `variant` picks a different stretch of the
// noise so the same sound twice in a row is not identical.

const SYNTHS = {
  // A card counter put down on the board: a short knock with a click on top.
  'counter-snap': (ctx, out, at, v) => {
    noiseThrough(ctx, out, at, 0.08, [filter(ctx, 'bandpass', 1900 + v * 150, 1.4), envelope(ctx, at, 0.9, 0.06, 0.002)], v * 0.13);
    const tone = ctx.createOscillator();
    tone.frequency.setValueAtTime(420, at);
    tone.frequency.exponentialRampToValueAtTime(180, at + 0.05);
    const body = envelope(ctx, at, 0.5, 0.07, 0.002);
    tone.connect(body).connect(out);
    tone.start(at);
    tone.stop(at + 0.08);
  },

  // A page or card handled: bright noise in a handful of uneven swells.
  'paper-rustle': (ctx, out, at, v) => {
    const rng = createRng(NOISE_SEED + v);
    const swells = 5 + Math.floor(rng.next() * 3);
    for (let i = 0; i < swells; i++) {
      const t = at + i * 0.055 + rng.next() * 0.03;
      noiseThrough(ctx, out, t, 0.12, [
        filter(ctx, 'highpass', 1400),
        filter(ctx, 'bandpass', 3000 + rng.next() * 2500, 0.8),
        envelope(ctx, t, 0.25 + rng.next() * 0.35, 0.09 + rng.next() * 0.05, 0.015),
      ], v * 0.11 + i * 0.07);
    }
  },

  // A pencil note: three quick strokes of narrow, gritty noise.
  'pencil-scratch': (ctx, out, at, v) => {
    const rng = createRng(NOISE_SEED + 50 + v);
    for (let i = 0; i < 3; i++) {
      const t = at + i * 0.11 + rng.next() * 0.02;
      const band = filter(ctx, 'bandpass', 3200 + rng.next() * 900, 5);
      band.frequency.setValueAtTime(band.frequency.value, t);
      band.frequency.linearRampToValueAtTime(2600 + rng.next() * 600, t + 0.08);
      noiseThrough(ctx, out, t, 0.1, [band, envelope(ctx, t, 0.8, 0.085, 0.012)], v * 0.17 + i * 0.05);
    }
  },

  // A dog a long way off, twice: a falling nasal tone, dulled by the distance.
  'dog-distant': (ctx, out, at) => {
    const far = filter(ctx, 'lowpass', 1300);
    far.connect(out);
    for (const t of [at, at + 0.26]) {
      const bark = ctx.createOscillator();
      bark.type = 'sawtooth';
      bark.frequency.setValueAtTime(560, t);
      bark.frequency.exponentialRampToValueAtTime(330, t + 0.13);
      const mouth = filter(ctx, 'bandpass', 950, 2.5);
      bark.connect(mouth).connect(envelope(ctx, t, 0.6, 0.15, 0.01)).connect(far);
      bark.start(t);
      bark.stop(t + 0.17);
      noiseThrough(ctx, far, t, 0.1, [filter(ctx, 'bandpass', 1100, 1.2), envelope(ctx, t, 0.15, 0.08, 0.005)]);
    }
  },

  // The demolitions, heard through a wall: a low thump and a rumble after it.
  crump: (ctx, out, at, v) => {
    const thump = ctx.createOscillator();
    thump.frequency.setValueAtTime(75, at);
    thump.frequency.exponentialRampToValueAtTime(32, at + 0.6);
    thump.connect(envelope(ctx, at, 1, 0.9, 0.008)).connect(out);
    thump.start(at);
    thump.stop(at + 1);
    const rumble = filter(ctx, 'lowpass', 320);
    rumble.frequency.setValueAtTime(320, at);
    rumble.frequency.exponentialRampToValueAtTime(90, at + 1.2);
    noiseThrough(ctx, out, at, 1.4, [rumble, envelope(ctx, at, 0.9, 1.3, 0.02)], v * 0.2);
  },

  // A demolition charge going off, close (M11: the operator wanted the bangs
  // to land hard). A sharp crack, a deep boom with the air in it closing
  // down, a sub-bass shove, and debris pattering down for a second after.
  explosion: (ctx, destination, at, v) => {
    const rng = createRng(NOISE_SEED + 90 + v);
    // The parts are levelled against each other below; this keeps their sum
    // under full scale, where the crack and the boom land together.
    const out = ctx.createGain();
    out.gain.value = 0.62;
    out.connect(destination);
    // Grit on the body, as a real blast overdrives whatever hears it.
    const grit = ctx.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(2.2 * x); }
    grit.curve = curve;
    grit.connect(out);
    // The crack: a short, bright burst.
    noiseThrough(ctx, out, at, 0.14, [filter(ctx, 'highpass', 900), envelope(ctx, at, 0.55, 0.12, 0.001)], v * 0.19);
    // The boom: wide noise through a lowpass closing from bright to dull.
    const body = filter(ctx, 'lowpass', 2600, 0.7);
    body.frequency.setValueAtTime(2600, at);
    body.frequency.exponentialRampToValueAtTime(110, at + 1.7);
    noiseThrough(ctx, grit, at, 2, [body, envelope(ctx, at, 0.7, 1.9, 0.006)], v * 0.23 + 0.3);
    // The shove: a sine falling through the sub-bass.
    const sub = ctx.createOscillator();
    sub.frequency.setValueAtTime(62, at);
    sub.frequency.exponentialRampToValueAtTime(26, at + 1.1);
    sub.connect(envelope(ctx, at, 0.6, 1.4, 0.01)).connect(out);
    sub.start(at);
    sub.stop(at + 1.5);
    // Debris: small bright ticks, thinning out.
    for (let i = 0; i < 14; i++) {
      const t = at + 0.25 + rng.next() * 1.4;
      const loud = 0.12 * (1 - (t - at) / 1.8) + 0.02;
      noiseThrough(ctx, out, t, 0.04, [filter(ctx, 'bandpass', 1800 + rng.next() * 3500, 3), envelope(ctx, t, loud, 0.03, 0.001)], rng.next());
    }
  },

  // Mission accomplished (M12): the church in the village ringing at dawn,
  // six bells in rounds, twice through — one for each man — heard across the fields.
  'church-bells': (ctx, destination, at) => {
    const far = filter(ctx, 'lowpass', 3200);
    far.connect(destination);
    const tenor = 330;
    const scale = [5 / 3, 3 / 2, 4 / 3, 5 / 4, 9 / 8, 1];
    for (let round = 0; round < 2; round++) {
      scale.forEach((ratio, i) => {
        bell(ctx, far, at + round * 2.1 + i * 0.3, tenor * ratio, 0.17, 2.4);
      });
    }
  },

  // The mission failed (M12): one low bell tolling, slowly, and an air-raid
  // siren winding up and down a long way off under it.
  'bell-toll': (ctx, destination, at) => {
    for (const t of [0, 1.8, 3.6]) bell(ctx, destination, at + t, 98, 0.42, 4.2);
    const siren = ctx.createOscillator();
    siren.type = 'triangle';
    siren.frequency.setValueAtTime(300, at + 0.4);
    for (let k = 0; k < 3; k++) {
      siren.frequency.linearRampToValueAtTime(560, at + 1.4 + k * 1.8);
      siren.frequency.linearRampToValueAtTime(380, at + 2.2 + k * 1.8);
    }
    const level = ctx.createGain();
    level.gain.setValueAtTime(0.0001, at + 0.4);
    level.gain.exponentialRampToValueAtTime(0.07, at + 1.4);
    level.gain.setValueAtTime(0.07, at + 4.4);
    level.gain.exponentialRampToValueAtTime(0.0001, at + 6);
    siren.connect(filter(ctx, 'lowpass', 900)).connect(level).connect(destination);
    siren.start(at + 0.4);
    siren.stop(at + 6.1);
  },
};

export const SOUND_IDS = Object.keys(SYNTHS);

// --- cues -----------------------------------------------------------------------
// What the game asks for, and which sounds answer: [sound, gain, delay s].
// main.js names a cue; it never names a sound, so a cue can be re-scored here.

const CUES = {
  move: [['counter-snap', 0.5, 0]],
  action: [['pencil-scratch', 0.35, 0]],
  card: [['paper-rustle', 0.35, 0]],
  alertRise: [['dog-distant', 0.18, 0.25]],
  explosion: [['explosion', 1, 0]],
  // Bombers over the town, miles off: three small crumps.
  diversion: [['crump', 0.25, 0], ['crump', 0.18, 0.4], ['crump', 0.22, 0.95]],
  // The back page (M12): bells for a mission accomplished, a toll for the rest,
  // just after the page has turned.
  victory: [['church-bells', 0.9, 0.35]],
  defeat: [['bell-toll', 0.55, 0.35]],
};

export const CUE_NAMES = Object.keys(CUES);

// Which stretch of noise the next sound is cut from, turning over each time.
let nextVariant = 0;

/** Play a cue by name. Nothing happens while muted or where the browser has no Web Audio. */
export function playCue(name) {
  const parts = CUES[name];
  if (muted || !parts || !unlocked) return;
  const ctx = audio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  scheduleCue(ctx, ctx.destination, name, ctx.currentTime + 0.01, nextVariant);
  nextVariant = (nextVariant + 1) % 7;
}

/**
 * Schedule a cue's sounds into `destination` from `start`; `variant` picks the
 * stretch of noise. Exported so the tests can play every cue into an
 * OfflineAudioContext and measure it.
 */
export function scheduleCue(ctx, destination, name, start, variant = 0) {
  for (const [i, [id, gain, delay]] of CUES[name].entries()) {
    const out = ctx.createGain();
    out.gain.value = gain;
    out.connect(destination);
    const at = start + delay;
    const buffer = ctx === context ? supplied.get(id) : null;
    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(out);
      source.start(at);
    } else {
      // Each part of a cue from its own stretch, so the diversion's three crumps differ.
      SYNTHS[id](ctx, out, at, (variant + i) % 7);
    }
  }
}

/**
 * Browsers keep audio silent until the player has pressed or clicked
 * something; call this from the first key or click so the first cue is heard.
 */
export function unlockSound() {
  unlocked = true;
  const ctx = audio();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function isMuted() {
  return muted;
}

export function setMuted(on) {
  muted = on;
}

/** Supplied files (ART-ASSETS.md §9) replace the placeholders; the first type found wins. */
export function loadSuppliedSounds() {
  for (const id of SOUND_IDS) {
    (async () => {
      for (const type of SOUND_FILES.types) {
        try {
          const response = await fetch(`${SOUND_FILES.dir}/${id}.${type}`);
          if (!response.ok) continue;
          const bytes = await response.arrayBuffer();
          if (context) decode(id, bytes);
          else fetched.set(id, bytes);
          return;
        } catch {
          // Not there: keep the placeholder.
        }
      }
    })();
  }
}
