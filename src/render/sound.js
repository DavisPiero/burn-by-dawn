// Sound (ART-ASSETS.md §9, SPEC.md §11). The sounds of the table: a counter
// snapped down, a pencil, a turned card, a dog a long way off — and, since
// M11, one from the battlefield: a charge going off is a real explosion, the
// payoff of the whole plan. Since M12 the back page has its own: the village
// church's bells for a mission accomplished, a tolling bell and a far siren
// for the rest. The RAF's bombs, miles off, stay muffled crumps. Presentation only, like the rest of render/: it
// is told what happened and never looks at a rule.
//
// Each sound is made in code with Web Audio until a file is supplied, the way
// theme.js draws art until a picture is: drop assets/audio/<id>.m4a (or .mp3)
// in and it is played instead. A missing file is fine. Since M21c every sound
// has a supplied file (assets/audio/README.md); the made ones stay as the
// fallback and are what the tests measure.
//
// The noise the placeholders are made from comes from a fixed seed through
// rng.js (CLAUDE.md rule 4), so every rustle is drawn from the same sheet.

import { createRng } from '../rng.js';

// The first type found wins. M4A (AAC) first since M21c: the supplied sounds
// are cut and levelled here with macOS's afconvert, which writes AAC but not
// MP3, and every current browser plays both. An MP3 of the same name is still
// played if there is no M4A.
export const SOUND_FILES = { dir: 'assets/audio', types: ['m4a', 'mp3'] };

const NOISE_SEED = 1944;

// The bang (M17, the operator's: lower and slower): every frequency in it
// times `pitch`, every length times `stretch`.
export const BOOM = { pitch: 0.7, stretch: 1.4 };

let context = null;
// The noise sheet for each context: made once per context from the fixed seed.
const noiseByContext = new WeakMap();
// No sound until the player has pressed something: a cue before that would
// wait in a suspended context and all go off at the first click.
let unlocked = false;
let muted = false;
// Supplied files: fetched at load, decoded once there is an audio context
// (there is none until the player has pressed something), then played.
const supplied = new Map();
// Each sound's file on its way (M23): a promise of the decoded file, or of null
// if there is none. The music waits on it rather than starting the made music
// and then being overtaken by the file.
const arriving = new Map();
let contextMade;
const contextReady = new Promise((resolve) => {
  contextMade = resolve;
});

function audio() {
  if (context) return context;
  const Context = window.AudioContext ?? window.webkitAudioContext;
  if (!Context) return null;
  context = new Context();
  contextMade(context);
  return context;
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

/** Four seconds of white noise for this context, made once: every placeholder is cut from it (M17: the slower bang runs 2.8 s). */
function noiseSheet(ctx) {
  let sheet = noiseByContext.get(ctx);
  if (sheet) return sheet;
  const rng = createRng(NOISE_SEED);
  sheet = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
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
  // to land hard; M17: lower and slower). A crack, a deep boom with the air in
  // it closing down, a sub-bass shove, and debris pattering down after it.
  // BOOM.pitch scales every frequency and BOOM.stretch every time.
  explosion: (ctx, destination, at, v) => {
    const { pitch, stretch } = BOOM;
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
    // The crack: a short burst, duller than it was.
    noiseThrough(ctx, out, at, 0.14 * stretch, [filter(ctx, 'highpass', 900 * pitch), envelope(ctx, at, 0.5, 0.12 * stretch, 0.001)], v * 0.19);
    // The boom: wide noise through a lowpass closing from bright to dull.
    const body = filter(ctx, 'lowpass', 2600 * pitch, 0.7);
    body.frequency.setValueAtTime(2600 * pitch, at);
    body.frequency.exponentialRampToValueAtTime(110 * pitch, at + 1.7 * stretch);
    noiseThrough(ctx, grit, at, 2 * stretch, [body, envelope(ctx, at, 0.72, 1.9 * stretch, 0.01)], v * 0.23 + 0.3);
    // The shove: a sine falling through the sub-bass.
    const sub = ctx.createOscillator();
    sub.frequency.setValueAtTime(62 * pitch, at);
    sub.frequency.exponentialRampToValueAtTime(26 * pitch, at + 1.1 * stretch);
    sub.connect(envelope(ctx, at, 0.7, 1.4 * stretch, 0.015)).connect(out);
    sub.start(at);
    sub.stop(at + 1.5 * stretch);
    // Debris: small ticks, thinning out.
    for (let i = 0; i < 14; i++) {
      const t = at + (0.25 + rng.next() * 1.4) * stretch;
      const loud = 0.12 * (1 - (t - at) / (1.8 * stretch)) + 0.02;
      noiseThrough(ctx, out, t, 0.04, [filter(ctx, 'bandpass', (1800 + rng.next() * 3500) * pitch, 3), envelope(ctx, t, loud, 0.03, 0.001)], rng.next());
    }
  },

  // A gunner's burst (M13, suppressing): four quick shots, each a hard crack
  // with a short, dull body behind it.
  gunfire: (ctx, out, at, v) => {
    const rng = createRng(NOISE_SEED + 140 + v);
    for (let i = 0; i < 4; i++) {
      const t = at + i * 0.11 + rng.next() * 0.012;
      noiseThrough(ctx, out, t, 0.05, [filter(ctx, 'highpass', 1600), envelope(ctx, t, 0.7, 0.04, 0.001)], v * 0.13 + i * 0.09);
      noiseThrough(ctx, out, t, 0.16, [filter(ctx, 'lowpass', 900 + rng.next() * 300), envelope(ctx, t, 0.55, 0.14, 0.002)], v * 0.17 + i * 0.11 + 0.4);
    }
  },

  // A silenced Sten (M13, a kill): one muffled cough and the bolt's click.
  'silenced-shot': (ctx, out, at, v) => {
    noiseThrough(ctx, out, at, 0.09, [filter(ctx, 'lowpass', 700), envelope(ctx, at, 0.8, 0.08, 0.002)], v * 0.21 + 0.2);
    noiseThrough(ctx, out, at + 0.05, 0.03, [filter(ctx, 'bandpass', 3500, 4), envelope(ctx, at + 0.05, 0.25, 0.02, 0.001)], v * 0.07);
  },

  // Mission accomplished (M12): the church in the village ringing at dawn,
  // six bells twice through — one for each man — heard across the fields.
  // Rising since M15 (the operator: falling rounds sounded sad): tenor up
  // to the octave, and the octave and tenor struck together to finish.
  'church-bells': (ctx, destination, at) => {
    const far = filter(ctx, 'lowpass', 3200);
    far.connect(destination);
    const tenor = 262;
    const scale = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];
    for (let round = 0; round < 2; round++) {
      scale.forEach((ratio, i) => {
        bell(ctx, far, at + round * 2.1 + i * 0.3, tenor * ratio, 0.17, 2.4);
      });
    }
    for (const ratio of [1, 2]) bell(ctx, far, at + 4.3, tenor * ratio, 0.2, 3);
  },

  // The Dakota going over (M15, the operator's): two radial engines a few
  // beats apart, swelling as it comes, the pitch sinking as it passes, and
  // gone. Over the drop, and under the RAF diversion's flyover.
  aircraft: (ctx, destination, at, v) => {
    const length = 3.4;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, at);
    out.gain.exponentialRampToValueAtTime(0.5, at + 1.1);
    out.gain.setValueAtTime(0.5, at + 1.7);
    out.gain.exponentialRampToValueAtTime(0.0001, at + length);
    const air = filter(ctx, 'lowpass', 520, 0.8);
    air.connect(out).connect(destination);
    for (const [base, type, level] of [[88, 'sawtooth', 0.5], [91.5, 'sawtooth', 0.45], [176, 'square', 0.12]]) {
      const engine = ctx.createOscillator();
      engine.type = type;
      engine.frequency.setValueAtTime(base * 1.06, at);
      engine.frequency.setValueAtTime(base * 1.06, at + 1.2);
      engine.frequency.linearRampToValueAtTime(base * 0.94, at + 2.0);
      const gain = ctx.createGain();
      gain.gain.value = level;
      engine.connect(gain).connect(air);
      engine.start(at);
      engine.stop(at + length + 0.05);
    }
    // The propellers' wash: a band of noise under the engines.
    noiseThrough(ctx, out, at, length, [filter(ctx, 'bandpass', 380, 0.9), envelope(ctx, at, 0.25, length - 0.1, 1)], v * 0.11);
  },

  // The airfield's diversion (M31): a jeep going by outside the wire, a
  // four-cylinder engine revving hard, its note falling as it passes, and
  // the rattle of its wheels on the stones.
  jeep: (ctx, destination, at, v) => {
    const length = 3.2;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, at);
    out.gain.exponentialRampToValueAtTime(0.45, at + 1.2);
    out.gain.setValueAtTime(0.45, at + 1.6);
    out.gain.exponentialRampToValueAtTime(0.0001, at + length);
    const air = filter(ctx, 'lowpass', 900, 0.9);
    air.connect(out).connect(destination);
    for (const [base, type, level] of [[62, 'sawtooth', 0.5], [124, 'square', 0.12], [186, 'sawtooth', 0.1]]) {
      const engine = ctx.createOscillator();
      engine.type = type;
      engine.frequency.setValueAtTime(base * 0.95, at);
      engine.frequency.linearRampToValueAtTime(base * 1.12, at + 1.3);
      engine.frequency.linearRampToValueAtTime(base * 0.88, at + 1.9);
      const gain = ctx.createGain();
      gain.gain.value = level;
      engine.connect(gain).connect(air);
      engine.start(at);
      engine.stop(at + length + 0.05);
    }
    noiseThrough(ctx, out, at, length, [filter(ctx, 'bandpass', 1400, 0.7), envelope(ctx, at, 0.2, length - 0.1, 1)], v * 0.13 + 0.5);
  },

  // The airfield's back page, mission accomplished (M31b, the operator's: the
  // trucks and crumps sounded sinister, like a failure): a bugle call, bright
  // and rising, on the bugle's own notes, G C E G, a fall to E and the top G
  // held with a little vibrato.
  bugle: (ctx, destination, at) => {
    const out = ctx.createGain();
    out.gain.value = 0.8;
    out.connect(destination);
    const calls = [[392, 0, 0.16], [523.25, 0.18, 0.16], [659.25, 0.36, 0.16], [783.99, 0.54, 0.3], [659.25, 0.9, 0.18], [783.99, 1.12, 1.3]];
    for (const [f, start, length] of calls) {
      const t = at + start;
      const brass = filter(ctx, 'lowpass', 900, 1.2);
      brass.frequency.setValueAtTime(700, t);
      brass.frequency.exponentialRampToValueAtTime(3200, t + 0.05);
      brass.frequency.exponentialRampToValueAtTime(1800, t + length);
      const level = ctx.createGain();
      level.gain.setValueAtTime(0.0001, t);
      level.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
      level.gain.setValueAtTime(0.1, t + length - 0.05);
      level.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.12);
      brass.connect(level).connect(out);
      const vibrato = ctx.createOscillator();
      vibrato.frequency.value = 5.5;
      const wobble = ctx.createGain();
      wobble.gain.setValueAtTime(0, t);
      wobble.gain.linearRampToValueAtTime(length > 1 ? f * 0.006 : 0, t + length);
      vibrato.connect(wobble);
      for (const detune of [-5, 5]) {
        const tone = ctx.createOscillator();
        tone.type = 'sawtooth';
        tone.frequency.value = f;
        tone.detune.value = detune;
        wobble.connect(tone.frequency);
        tone.connect(brass);
        tone.start(t);
        tone.stop(t + length + 0.15);
      }
      vibrato.start(t);
      vibrato.stop(t + length + 0.15);
    }
  },

  // The airfield's back page, withdrawn or failed (M31): the landing ground's
  // air-raid siren, close, winding up and down as dawn comes.
  siren: (ctx, destination, at) => {
    const siren = ctx.createOscillator();
    siren.type = 'triangle';
    siren.frequency.setValueAtTime(180, at);
    siren.frequency.linearRampToValueAtTime(420, at + 1.6);
    siren.frequency.linearRampToValueAtTime(360, at + 2.6);
    siren.frequency.linearRampToValueAtTime(420, at + 3.6);
    siren.frequency.linearRampToValueAtTime(160, at + 6);
    const level = ctx.createGain();
    level.gain.setValueAtTime(0.0001, at);
    level.gain.exponentialRampToValueAtTime(0.22, at + 1.2);
    level.gain.setValueAtTime(0.22, at + 3.8);
    level.gain.exponentialRampToValueAtTime(0.0001, at + 6);
    siren.connect(filter(ctx, 'lowpass', 1400)).connect(level).connect(destination);
    siren.start(at);
    siren.stop(at + 6.1);
  },

  // The mission failed (M12): one low bell tolling, slowly, and an air-raid
  // siren winding up and down a long way off under it.
  'bell-toll': (ctx, destination, at) => {
    // Lower, and the siren's wail shallower (M13: it wobbled too much).
    for (const t of [0, 1.8, 3.6]) bell(ctx, destination, at + t, 73, 0.46, 4.4);
    const siren = ctx.createOscillator();
    siren.type = 'triangle';
    siren.frequency.setValueAtTime(250, at + 0.4);
    for (let k = 0; k < 3; k++) {
      siren.frequency.linearRampToValueAtTime(330, at + 1.4 + k * 1.8);
      siren.frequency.linearRampToValueAtTime(290, at + 2.2 + k * 1.8);
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

  // The opening screens (M17, the operator's): four bars of a war film's
  // main title, tense and low, in D minor — strings trembling on the chord,
  // a cello's spiccato worrying at the root and the semitone above it, a
  // side drum far off, the timpani, and on every other pass a horn's call.
  // The chords run D minor, D minor, B flat, A: the A at the end leans back
  // to the D, so it loops without an end. Played round and round by
  // startMusic; `v` odd brings in the horn.
  'music-title': (ctx, destination, at, v) => {
    const beat = MUSIC.beat;
    const bar = beat * 4;
    const out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(destination);
    const roots = [73.42, 73.42, 58.27, 55];
    const semitone = (f, n) => f * 2 ** (n / 12);
    roots.forEach((root, b) => {
      const t0 = at + b * bar;
      // Strings: root, fifth and octave, bowed in tremolo, swelling in.
      const tremolo = ctx.createGain();
      tremolo.gain.value = 0.75;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 7.5;
      const depth = ctx.createGain();
      depth.gain.value = 0.25;
      lfo.connect(depth).connect(tremolo.gain);
      const swell = ctx.createGain();
      swell.gain.setValueAtTime(0.0001, t0);
      swell.gain.exponentialRampToValueAtTime(0.1, t0 + bar * 0.45);
      swell.gain.setValueAtTime(0.1, t0 + bar * 0.8);
      swell.gain.exponentialRampToValueAtTime(0.0001, t0 + bar + 0.25);
      tremolo.connect(filter(ctx, 'lowpass', 650, 0.7)).connect(swell).connect(out);
      for (const [ratio, detune] of [[1, -4], [1.5, 5], [2, -7], [3, 6]]) {
        const bow = ctx.createOscillator();
        bow.type = 'sawtooth';
        bow.frequency.value = root * ratio;
        bow.detune.value = detune;
        bow.connect(tremolo);
        bow.start(t0);
        bow.stop(t0 + bar + 0.3);
      }
      lfo.start(t0);
      lfo.stop(t0 + bar + 0.3);
      // The cello's eighths: the root, and the semitone above it to grate.
      const figure = b === 3 ? [0, 0, 1, 0, 0, 1, 0, 1] : [0, 0, 0, 1, 0, 0, 1, 0];
      figure.forEach((n, i) => {
        const t = t0 + i * beat / 2;
        const note = ctx.createOscillator();
        note.type = 'sawtooth';
        note.frequency.value = semitone(root * 2, n);
        note.connect(filter(ctx, 'lowpass', 1000, 2)).connect(envelope(ctx, t, i % 4 === 0 ? 0.16 : 0.11, 0.2, 0.006)).connect(out);
        note.start(t);
        note.stop(t + 0.24);
      });
      // The side drum, a long way off: a march's rattle on the sixteenths.
      const drum = b === 3 ? 'x..x x.x. x.xx xxxx' : 'x..x x... x..x x.x.';
      [...drum.replace(/ /g, '')].forEach((hit, i) => {
        if (hit !== 'x') return;
        const t = t0 + i * beat / 4;
        const loud = i % 8 === 0 ? 0.11 : 0.065;
        noiseThrough(ctx, out, t, 0.12, [filter(ctx, 'highpass', 700), filter(ctx, 'bandpass', 2300, 0.8), envelope(ctx, t, loud, 0.1, 0.002)], v * 0.13 + b * 0.31 + i * 0.047);
      });
      // Timpani on the first and third bars' downbeat, and a roll up to the loop's end.
      const timp = (t, f, loud, length) => {
        const drumhead = ctx.createOscillator();
        drumhead.frequency.setValueAtTime(f * 1.02, t);
        drumhead.frequency.exponentialRampToValueAtTime(f, t + 0.08);
        drumhead.connect(envelope(ctx, t, loud, length, 0.004)).connect(out);
        drumhead.start(t);
        drumhead.stop(t + length + 0.05);
        noiseThrough(ctx, out, t, 0.08, [filter(ctx, 'lowpass', 260), envelope(ctx, t, loud * 0.5, 0.07, 0.002)], b * 0.19 + t % 1);
      };
      if (b === 0 || b === 2) timp(t0, root, 0.34, 1.5);
      if (b === 3) for (let i = 0; i < 8; i++) timp(t0 + bar / 2 + i * beat / 4, root, 0.06 + i * 0.03, 0.3);
    });
    // The horn's call, every other time round: up to the minor third, down,
    // and at the end the raised seventh, C sharp, pulling home.
    if (v % 2 === 1) {
      const calls = [[293.66, 0, 3], [349.23, 3, 1], [329.63, 4, 2], [293.66, 6, 2], [349.23, 8, 3], [293.66, 11, 1], [329.63, 12, 2], [277.18, 14, 2]];
      for (const [f, start, beats] of calls) {
        const t = at + start * beat;
        const length = beats * beat;
        const brass = filter(ctx, 'lowpass', 500, 1.5);
        brass.frequency.setValueAtTime(420, t);
        brass.frequency.exponentialRampToValueAtTime(1500, t + 0.12);
        brass.frequency.exponentialRampToValueAtTime(900, t + length);
        const level = ctx.createGain();
        level.gain.setValueAtTime(0.0001, t);
        level.gain.exponentialRampToValueAtTime(0.085, t + 0.09);
        level.gain.setValueAtTime(0.075, t + length - 0.12);
        level.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.08);
        brass.connect(level).connect(out);
        const vibrato = ctx.createOscillator();
        vibrato.frequency.value = 5;
        const wobble = ctx.createGain();
        wobble.gain.value = f * 0.004;
        vibrato.connect(wobble);
        for (const detune of [-6, 6]) {
          const tone = ctx.createOscillator();
          tone.type = 'sawtooth';
          tone.frequency.value = f;
          tone.detune.value = detune;
          wobble.connect(tone.frequency);
          tone.connect(brass);
          tone.start(t);
          tone.stop(t + length + 0.1);
        }
        vibrato.start(t);
        vibrato.stop(t + length + 0.1);
      }
    }
  },

  // The goods train coming on (M35), a long way off: a steam whistle, one long
  // blast and a short one, two reedy notes a little out of tune that scoop up
  // as the steam comes and sag as it goes, breath in it; then the engine's
  // chuffing dying away. Made in code until a recording is supplied.
  train: (ctx, out, at, v) => {
    const far = filter(ctx, 'lowpass', 2600, 0.6);
    far.connect(out);
    for (const [start, length] of [[0, 0.95], [1.2, 0.34]]) {
      const t = at + start;
      const level = ctx.createGain();
      level.gain.setValueAtTime(0.0001, t);
      level.gain.exponentialRampToValueAtTime(0.3, t + 0.07);
      level.gain.setValueAtTime(0.3, t + length - 0.1);
      level.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.12);
      level.connect(far);
      for (const [f, amp, type] of [[784, 0.5, 'triangle'], [1046, 0.42, 'triangle'], [1058, 0.2, 'sine'], [1568, 0.1, 'sine']]) {
        const pipe = ctx.createOscillator();
        pipe.type = type;
        pipe.frequency.setValueAtTime(f * 0.93, t);
        pipe.frequency.exponentialRampToValueAtTime(f, t + 0.12);
        pipe.frequency.setValueAtTime(f, t + length - 0.08);
        pipe.frequency.exponentialRampToValueAtTime(f * 0.96, t + length + 0.1);
        const part = ctx.createGain();
        part.gain.value = amp;
        pipe.connect(part).connect(level);
        pipe.start(t);
        pipe.stop(t + length + 0.15);
      }
      noiseThrough(ctx, level, t, length + 0.1, [filter(ctx, 'bandpass', 2100, 1.2)], v * 0.17 + start);
    }
    for (let i = 0; i < 10; i++) {
      const t = at + 1.75 + i * 0.17;
      const loud = 0.95 * (1 - i / 11) * (i % 4 === 0 ? 1 : 0.7);
      noiseThrough(ctx, out, t, 0.14, [filter(ctx, 'bandpass', 420, 0.9), envelope(ctx, t, loud, 0.13, 0.012)], v * 0.11 + i * 0.09);
    }
  },

  // The aqueduct's three (M43, SPEC.md §14), made in code until recordings
  // are supplied. A supply canister coming down: a steel drum's dull thud on
  // hard ground, its clank on top, short and close.
  'canister-thump': (ctx, out, at, v) => {
    const thud = ctx.createOscillator();
    thud.frequency.setValueAtTime(130 - v * 4, at);
    thud.frequency.exponentialRampToValueAtTime(48, at + 0.16);
    thud.connect(envelope(ctx, at, 0.9, 0.24, 0.003)).connect(out);
    thud.start(at);
    thud.stop(at + 0.28);
    for (const [f, amp, length] of [[523, 0.16, 0.2], [817, 0.1, 0.13], [1340, 0.06, 0.08]]) {
      const ring = ctx.createOscillator();
      ring.type = 'triangle';
      ring.frequency.value = f * (1 + v * 0.012);
      ring.connect(envelope(ctx, at, amp, length, 0.002)).connect(out);
      ring.start(at);
      ring.stop(at + length + 0.03);
    }
    noiseThrough(ctx, out, at, 0.07, [filter(ctx, 'bandpass', 900, 0.8), envelope(ctx, at, 0.5, 0.06, 0.002)], v * 0.19);
  },

  // The boat's oars, out on the water: three strokes, each a creak in the
  // rowlocks and then the blades' dip and pull, the wash of it dying away.
  oars: (ctx, out, at, v) => {
    const far = filter(ctx, 'lowpass', 2200, 0.6);
    far.connect(out);
    for (let i = 0; i < 3; i++) {
      const t = at + i * 0.95;
      const creak = ctx.createOscillator();
      creak.type = 'sawtooth';
      creak.frequency.setValueAtTime(190 + i * 12, t);
      creak.frequency.linearRampToValueAtTime(250 + i * 12, t + 0.16);
      const wood = filter(ctx, 'bandpass', 760, 5);
      creak.connect(wood).connect(envelope(ctx, t, 0.22, 0.2, 0.05)).connect(far);
      creak.start(t);
      creak.stop(t + 0.22);
      const dip = filter(ctx, 'bandpass', 520, 0.7);
      dip.frequency.setValueAtTime(380, t + 0.2);
      dip.frequency.linearRampToValueAtTime(900, t + 0.5);
      dip.frequency.linearRampToValueAtTime(420, t + 0.85);
      noiseThrough(ctx, far, t + 0.2, 0.7, [dip, envelope(ctx, t + 0.2, 0.8, 0.68, 0.16)], v * 0.17 + i * 0.31);
    }
  },

  // Surf on the shingle: one small wave that gathers, breaks, and drags back
  // down the stones.
  surf: (ctx, out, at, v) => {
    const length = 2.4;
    const wave = filter(ctx, 'lowpass', 500, 0.5);
    wave.frequency.setValueAtTime(350, at);
    wave.frequency.exponentialRampToValueAtTime(2600, at + 0.9);
    wave.frequency.exponentialRampToValueAtTime(700, at + length);
    const swell = ctx.createGain();
    swell.gain.setValueAtTime(0.0001, at);
    swell.gain.exponentialRampToValueAtTime(0.8, at + 0.9);
    swell.gain.exponentialRampToValueAtTime(0.25, at + 1.4);
    swell.gain.exponentialRampToValueAtTime(0.0001, at + length);
    noiseThrough(ctx, out, at, length, [wave, swell], v * 0.11);
    // The stones dragged back: a thinner hiss under the wave's tail.
    noiseThrough(ctx, out, at + 1.1, 1.2, [filter(ctx, 'highpass', 2800, 0.5), envelope(ctx, at + 1.1, 0.12, 1.15, 0.3)], v * 0.11 + 0.7);
  },
};

export const SOUND_IDS = Object.keys(SYNTHS);

// --- cues -----------------------------------------------------------------------
// What the game asks for, and which sounds answer: [sound, gain, delay s].
// main.js names a cue; it never names a sound, so a cue can be re-scored here.

const CUES = {
  // A move taken back (M24: a move itself is silent, the operator's).
  move: [['counter-snap', 0.5, 0]],
  action: [['pencil-scratch', 0.35, 0]],
  card: [['paper-rustle', 0.35, 0]],
  alertRise: [['dog-distant', 0.18, 0.25]],
  explosion: [['explosion', 1, 0]],
  // The Dakota over the garrison, and bombers over the town, miles off: three small crumps.
  diversion: [['aircraft', 0.45, 0], ['crump', 0.25, 0.9], ['crump', 0.18, 1.3], ['crump', 0.22, 1.85]],
  // The drop (M15): the Dakota going over as the stick jumps.
  drop: [['aircraft', 0.6, 0]],
  // The back page (M12): bells for a mission accomplished, a toll for the rest,
  // just after the page has turned.
  suppress: [['gunfire', 0.45, 0]],
  kill: [['silenced-shot', 0.5, 0]],
  victory: [['church-bells', 0.9, 0.35]],
  defeat: [['bell-toll', 0.55, 0.35]],
  // The airfield's (M31; data/missions.json names a mission's cues): its
  // diversion, jeeps going by outside the wire with their guns going; and its
  // back page, a bugle call (M31b; the trucks pulling away were sinister), or
  // the landing ground's siren.
  jeepRaid: [['jeep', 0.6, 0], ['gunfire', 0.3, 0.8], ['gunfire', 0.34, 1.35], ['gunfire', 0.28, 2.0], ['gunfire', 0.2, 2.6]],
  desertVictory: [['bugle', 0.8, 0.35]],
  desertDefeat: [['siren', 0.7, 0.35]],
  // France's goods train coming onto the board (M35): its whistle.
  train: [['train', 0.5, 0]],
  // The aqueduct's (M43): the canisters down after the stick, one thump
  // each, played as its ring pops on (M43b); the boat far off as it is sighted or answers the signal; and its
  // last strokes with the surf under them as it lands.
  canister: [['canister-thump', 0.5, 0]],
  boatComing: [['oars', 0.3, 0.2]],
  boatIn: [['oars', 0.5, 0], ['surf', 0.5, 1.6]],
  // The opening screens' music (M17): one pass of it; startMusic loops it.
  titleMusic: [['music-title', 0.5, 0]],
};

export const CUE_NAMES = Object.keys(CUES);

// Which stretch of noise the next sound is cut from, turning over each time.
let nextVariant = 0;

/**
 * Play a cue by name. Nothing happens while muted or where the browser has no
 * Web Audio. Returns a handle whose stop() fades it out at once (M15: a
 * skipped drop cuts the Dakota short), or null if nothing played.
 */
export function playCue(name) {
  const parts = CUES[name];
  if (muted || !parts || !unlocked) return null;
  const ctx = audio();
  if (!ctx) return null;
  if (ctx.state === 'suspended') ctx.resume();
  const out = ctx.createGain();
  out.connect(ctx.destination);
  scheduleCue(ctx, out, name, ctx.currentTime + 0.01, nextVariant);
  nextVariant = (nextVariant + 1) % 7;
  return { stop: () => out.gain.setTargetAtTime(0, ctx.currentTime, 0.08) };
}

/**
 * Schedule a cue's sounds into `destination` from `start`; `variant` picks the
 * stretch of noise. Exported so the tests can play every cue into an
 * OfflineAudioContext and measure it.
 */
export function scheduleCue(ctx, destination, name, start, variant = 0, { made = false } = {}) {
  for (const [i, [id, gain, delay]] of CUES[name].entries()) {
    const out = ctx.createGain();
    out.gain.value = gain;
    out.connect(destination);
    const at = start + delay;
    // `made` keeps to the made sound: the made music's passes never lay the
    // whole recording (M23, the bug: a 93 s file started every 11 s).
    const buffer = ctx === context && !made ? supplied.get(id) : null;
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
  if (on) stopMusic();
}

// --- music (M17) --------------------------------------------------------------
// The title music over the orders, played round and round until they are put
// away, and again between turns (M19, the operator's). Made in code as the
// sounds are; a supplied assets/audio/music-title.mp3 is looped instead, as
// it is, so it should be cut to loop cleanly. `beat` is the made music's tempo
// (88 a minute) and `phrase` one pass of it, four bars.
export const MUSIC = { cue: 'titleMusic', beat: 60 / 88, phrase: (60 / 88) * 16, lookahead: 2.5, fadeIn: 2, fadeOut: 1.6 };

let music = null;
// Where the music got to when it last faded (M19): the pass of the made music
// to lay next, or the seconds into a supplied file. Between turns it carries
// on from there, so the same opening bars are not heard every turn.
let resumeAt = { pass: 0, seconds: 0 };

/**
 * Start the title music, if it is not playing already: from the top, or with
 * `resume` from where it last faded. Silent while muted or before the first
 * key or click.
 */
export function startMusic({ resume = false } = {}) {
  if (music || muted || !unlocked) return;
  if (!resume) resumeAt = { pass: 0, seconds: 0 };
  const ctx = audio();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, ctx.currentTime);
  out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + MUSIC.fadeIn);
  out.connect(ctx.destination);
  const playing = { out, timer: null, source: null, pass: resumeAt.pass, startedAt: ctx.currentTime, offset: resumeAt.seconds, begun: false };
  music = playing;
  const [[id]] = CUES[MUSIC.cue];
  const buffer = supplied.get(id);
  if (buffer || !arriving.has(id)) begin(ctx, playing, buffer);
  // The file is still on its way (M23): nothing until it is here, then it, or
  // the made music if it never comes; not both.
  else arriving.get(id).then((file) => music === playing && begin(ctx, playing, file));
}

function begin(ctx, playing, buffer) {
  const { out } = playing;
  playing.begun = true;
  playing.startedAt = ctx.currentTime;
  if (buffer) {
    const level = ctx.createGain();
    level.gain.value = CUES[MUSIC.cue][0][1];
    level.connect(out);
    playing.source = ctx.createBufferSource();
    playing.source.buffer = buffer;
    playing.source.loop = true;
    playing.source.connect(level);
    playing.offset %= buffer.duration;
    playing.source.start(0, playing.offset);
    return;
  }
  // Each pass is laid down a little before it is due, the horn every other time.
  playing.offset = 0;
  let next = ctx.currentTime + 0.05;
  const lay = () => {
    while (next < ctx.currentTime + MUSIC.lookahead) {
      scheduleCue(ctx, out, MUSIC.cue, next, playing.pass % 2, { made: true });
      next += MUSIC.phrase;
      playing.pass++;
    }
  };
  lay();
  playing.timer = setInterval(lay, 500);
}

/** Fade the title music out: the orders are put away, a turn begins, or the sound is off. */
export function stopMusic() {
  if (!music) return;
  const { out, timer, source, pass, startedAt, offset, begun } = music;
  music = null;
  clearInterval(timer);
  const now = context.currentTime;
  // The passes already laid play out under the fade; the next time starts after them.
  resumeAt = { pass, seconds: offset + (begun ? now - startedAt : 0) };
  out.gain.cancelScheduledValues(now);
  out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), now);
  out.gain.setTargetAtTime(0, now, MUSIC.fadeOut / 4);
  setTimeout(() => {
    source?.stop();
    out.disconnect();
  }, MUSIC.fadeOut * 1000 + 300);
}

export function isMusicPlaying() {
  return music !== null;
}

/** Supplied files (ART-ASSETS.md §9) replace the placeholders; the first type found wins. */
export function loadSuppliedSounds() {
  for (const id of SOUND_IDS) {
    arriving.set(id, (async () => {
      for (const type of SOUND_FILES.types) {
        let bytes;
        try {
          const response = await fetch(`${SOUND_FILES.dir}/${id}.${type}`);
          if (!response.ok) continue;
          bytes = await response.arrayBuffer();
        } catch {
          continue; // Not there: try the next type, then keep the placeholder.
        }
        // Decoded once there is an audio context, after the first key or click.
        const ctx = await contextReady;
        try {
          const buffer = await ctx.decodeAudioData(bytes);
          supplied.set(id, buffer);
          return buffer;
        } catch {
          return null; // Not a sound this browser can play: keep the placeholder.
        }
      }
      return null;
    })());
  }
}
