// M10: the placeholder sounds (render/sound.js). Played into an offline
// context and measured, as nobody can listen from a test: every cue must make
// a sound, none may clip, and the same cue twice gives the same sound (the
// noise comes from a fixed seed, CLAUDE.md rule 4). Browser only.

import { CUE_NAMES, scheduleCue } from '../src/render/sound.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function render(name) {
  const ctx = new OfflineAudioContext(1, 44100 * 2, 44100);
  scheduleCue(ctx, ctx.destination, name, 0);
  const data = (await ctx.startRendering()).getChannelData(0);
  let peak = 0;
  for (const x of data) peak = Math.max(peak, Math.abs(x));
  return { data, peak };
}

export default typeof OfflineAudioContext === 'undefined' ? [] : [
  ['every cue is heard and none clips', async () => {
    for (const name of CUE_NAMES) {
      const { peak } = await render(name);
      assert(peak > 0.02, `${name} is silent (peak ${peak.toFixed(3)})`);
      assert(peak < 0.95, `${name} clips (peak ${peak.toFixed(3)})`);
    }
  }],

  ['a cue cut from the same stretch of noise sounds the same every time', async () => {
    const a = await render('card');
    const b = await render('card');
    // Within a hair: the browser's audio engine can round differently run to run
    // (seen: 1e-9), far below anything audible.
    assert(a.data.every((x, i) => Math.abs(x - b.data[i]) < 1e-6), 'two renders differ');
  }],
];
