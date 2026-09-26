// Developer tool, not part of the game: makes the counter chips
// (portrait-<id>-chip.png, ART-ASSETS.md §2) from the painted full portraits.
//
// Run it by pasting this whole file into the browser console on the running
// game (./run.sh, localhost:8000): it fetches each full portrait from
// assets/portraits, crops to helmet and face, keys out the flat background
// (flood-filled from the edges, so blue inside the picture survives), fades
// the shoulders, scales to 128 x 128 with an ink edge so the helmet holds on
// the green counter, and downloads the six PNGs. Move them into
// assets/portraits/.
//
// CROPS is [x, y, size, fade] in the 960 x 1200 portrait: the square to cut,
// and where down it the fade to transparent starts. Retune a man's entry if
// his portrait is regenerated.
(async () => {
  const CROPS = {
    holloway: [96, 0, 736, 0.8], fitch: [64, 16, 736, 0.8], vance: [128, 0, 736, 0.8],
    barrow: [78, 70, 816, 0.82], speers: [64, 60, 832, 0.9], nunn: [86, 16, 768, 0.8],
  };
  const out = {};
  for (const [name, [x, y, s, fade]] of Object.entries(CROPS)) {
    const img = await createImageBitmap(await (await fetch(`assets/portraits/portrait-${name}-full.png`)).blob());
    const full = document.createElement('canvas'); full.width = img.width; full.height = img.height;
    const fx = full.getContext('2d'); fx.drawImage(img, 0, 0);
    const k = fx.getImageData(8, 8, 1, 1).data; // the flat background
    const c = document.createElement('canvas'); c.width = s; c.height = s;
    const cx = c.getContext('2d'); cx.drawImage(img, x, y, s, s, 0, 0, s, s);
    const d = cx.getImageData(0, 0, s, s); const p = d.data;
    const dist = (i) => Math.hypot(p[i] - k[0], p[i + 1] - k[1], p[i + 2] - k[2]);
    // Flood from the edges through background-coloured pixels only.
    const seen = new Uint8Array(s * s); const stack = [];
    for (let i = 0; i < s; i++) stack.push(i, (s - 1) * s + i, i * s, i * s + s - 1);
    while (stack.length) {
      const j = stack.pop(); if (seen[j]) continue;
      const dd = dist(j * 4); if (dd > 80) continue;
      seen[j] = 1;
      p[j * 4 + 3] = dd < 40 ? 0 : Math.round(((dd - 40) / 40) * 255);
      const px = j % s, py = (j - px) / s;
      if (px > 0) stack.push(j - 1); if (px < s - 1) stack.push(j + 1);
      if (py > 0) stack.push(j - s); if (py < s - 1) stack.push(j + s);
    }
    // Fade the shoulders out below the chin.
    for (let py = Math.floor(s * fade); py < s; py++) {
      const f = 1 - (py - s * fade) / (s * (1 - fade));
      for (let px = 0; px < s; px++) p[(py * s + px) * 4 + 3] *= f;
    }
    cx.putImageData(d, 0, 0);
    const step = (src, size) => { const t = document.createElement('canvas'); t.width = t.height = size; const tx = t.getContext('2d'); tx.imageSmoothingQuality = 'high'; tx.drawImage(src, 0, 0, size, size); return t; };
    const small = step(step(c, 256), 120);
    // An ink edge round the silhouette, so it holds on the green counter.
    const o = document.createElement('canvas'); o.width = o.height = 128; const ox = o.getContext('2d');
    for (let a = 0; a < 16; a++) ox.drawImage(small, 4 + Math.cos(a / 16 * Math.PI * 2) * 3, 4 + Math.sin(a / 16 * Math.PI * 2) * 3);
    ox.globalCompositeOperation = 'source-in'; ox.fillStyle = '#1A1A18'; ox.fillRect(0, 0, 128, 128);
    ox.globalCompositeOperation = 'source-over'; ox.drawImage(small, 4, 4);
    out[name] = o.toDataURL('image/png');
  }
  for (const [name, url] of Object.entries(out)) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `portrait-${name}-chip.png`;
    link.click();
  }
  return Object.keys(out);
})()
