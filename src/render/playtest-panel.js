/**
 * The playtest panel (M49): with `?playtest` in the address, a small dashed
 * box in the corner says the record is on, and COPY RECORD puts it on the
 * clipboard as plain lines for the operator to paste back to Claude. It reads
 * the record through `text()` and never touches the game's state.
 */

/** `text()` is the record as it stands, built by main.js from src/playtest.js. */
export function startPlaytestPanel(text) {
  const panel = document.createElement('div');
  panel.id = 'playtest-panel';
  const head = document.createElement('div');
  head.className = 'playtest-head';
  head.textContent = 'PLAYTEST · recording';
  const said = document.createElement('div');
  said.className = 'playtest-said';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn';
  copy.textContent = 'COPY RECORD';
  copy.addEventListener('click', async () => {
    const record = text();
    try {
      await navigator.clipboard.writeText(record);
      said.replaceChildren('Copied. Paste it into your notes for this player.');
      setTimeout(() => said.replaceChildren(), 4000);
    } catch {
      // No clipboard (an old browser, or not allowed): the text, selected, to copy by hand.
      const box = document.createElement('textarea');
      box.value = record;
      box.readOnly = true;
      said.replaceChildren(box);
      box.select();
      // Copied by hand, it goes again when the operator clicks back into the game.
      box.addEventListener('blur', () => said.replaceChildren());
    }
  });
  panel.append(head, copy, said);
  // The panel's clicks and keys are its own, never the game's.
  for (const type of ['pointerdown', 'click', 'keydown']) panel.addEventListener(type, (event) => event.stopPropagation());
  document.body.appendChild(panel);
}
