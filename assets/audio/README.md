# Audio

The game's sounds (ART-ASSETS.md §9). Each file replaces the sound made in code
(`src/render/sound.js`) of the same name; delete one and the made sound comes back.
`.m4a` (AAC) is tried first, then `.mp3`.

Supplied in M21c (the airfield's three in M31c), chosen by Claude from free libraries and approved by the operator. Each
was cut to the moment the game wants, faded, levelled to the made sound it replaces
(the loudest 0.4 s at the same RMS, so the loudness set per cue in sound.js still holds),
and encoded as AAC with macOS `afconvert`. None needs a credit line.

| File | Source | Licence | Cut |
|---|---|---|---|
| `counter-snap.m4a` | "Chess Pieces hitting wooden board", freesound_community, [Pixabay](https://pixabay.com/sound-effects/film-special-effects-chess-pieces-hitting-wooden-board-99336/) | Pixabay Content License | 0.11 s, the first hit |
| `paper-rustle.m4a` | "Paper rustle", Squidems, [Freesound 709961](https://freesound.org/people/Squidems/sounds/709961/) | CC0 | 0.46 s from 4.44 s |
| `pencil-scratch.m4a` | "Writing with pencil – energetic", fthgurdy, [Freesound 376706](https://freesound.org/people/fthgurdy/sounds/376706/) | CC0 | 0.43 s from 5.82 s |
| `dog-distant.m4a` | "country rural night crickets and distant dog bark", kyles, [Freesound 450341](https://freesound.org/people/kyles/sounds/450341/) | CC0 | 1.3 s from 4.99 s, one bark and its echo |
| `gunfire.m4a` | "Clean Machine Gun Burst", freesound_community, [Pixabay](https://pixabay.com/sound-effects/film-special-effects-clean-machine-gun-burst-98224/) | Pixabay Content License | whole, 1.55 s |
| `silenced-shot.m4a` | "Gun Silencer shot", freesound_community, [Pixabay](https://pixabay.com/sound-effects/film-special-effects-gun-silencer-shot-39174/) | Pixabay Content License | 0.59 s from 0.36 s |
| `crump.m4a` | "Distant Explosion", freesound_community, [Pixabay](https://pixabay.com/sound-effects/film-special-effects-distant-explosion-90743/) | Pixabay Content License | 2 s from 0.12 s |
| `explosion.m4a` | "Huge Distant Explosion", freesound_community, [Pixabay](https://pixabay.com/sound-effects/film-special-effects-huge-distant-explosion-25317/) | Pixabay Content License | 4.95 s from the hit |
| `church-bells.m4a` | "church bells", jasonlee3071, [Pixabay](https://pixabay.com/sound-effects/city-church-bells-194653/) | Pixabay Content License | 8.9 s from 0.7 s |
| `bell-toll.m4a` | "Church Bell Toll", Universfield, [Pixabay](https://pixabay.com/sound-effects/film-special-effects-church-bell-toll-156464/) | Pixabay Content License | whole, 5.25 s |
| `aircraft.m4a` | "Low Airplane Fly By", freesound_community, [Pixabay](https://pixabay.com/sound-effects/film-special-effects-low-airplane-fly-by-90354/) | Pixabay Content License | 5 s from 5.0 s, the pass |
| `jeep.m4a` | "Jeep-CJ5-1965-final", freesound_community, [Pixabay](https://pixabay.com/sound-effects/city-jeep-cj5-1965-final-19997/) | Pixabay Content License | 3.5 s from 16.5 s, the pass nearest; faded 0.35 s in, 0.7 s out (M31c, the airfield's jeep raid) |
| `bugle.m4a` | "Tada Military 3", floraphonic, [Pixabay](https://pixabay.com/sound-effects/film-special-effects-tada-military-3-183975/) | Pixabay Content License | whole, 4.3 s, a drum roll and trumpet fanfare, faded out over its last 0.5 s (M31c, the airfield's win; named for the made bugle it replaces) |
| `siren.m4a` | "Sound Effect - WW2 UK Air Raid Siren", ScottishPerson, [Pixabay](https://pixabay.com/sound-effects/film-special-effects-sound-effect-ww2-uk-air-raid-siren-164346/) | Pixabay Content License | 6 s from 23.5 s, faded 0.8 s in, 1.6 s out (M31c, the airfield's withdrawn or failed) |
| `music-title.m4a` | "War Epic", PaulYudin, [Pixabay music](https://pixabay.com/music/main-title-war-epic-182501/) | Pixabay Content License | whole, 1:33, faded out over its last 2 s |

**Licences.** CC0 is public domain. The Pixabay Content License allows use in a game with
no credit, but not passing the files on "as-is"; these are cut, faded and levelled, and
live in the game. For anything to go into the repo untouched, prefer CC0 from Freesound.

The "WW2 UK Bomb Blast" first picked for the explosion was a long air-raid rumble with no
sharp start, cut off dead at its end, so the listed backup was used instead.
