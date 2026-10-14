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
| `whistle.m4a` | the operator's "40 Whistles Multiple Short" (assets/audio/SRC_Select/Whistle.aiff) | the operator's | 0.30 s from 0.62 s, the second blast (M48h, the umpire's) |
| `train.m4a` | the operator's "Steam Train Passing" (SRC_Select/Train.mp3) | the operator's | 4.0 s from 21.0 s, the pass and its high whistle-like note; faded 0.6 s in, 1.0 s out |
| `canister-thump.m4a` | the operator's (SRC_Select/Cannister_Thump.wav) | the operator's | 0.39 s from the hit at 0.235 s, faded over its last 0.08 s |
| `oars.m4a` | the operator's (SRC_Select/Oars.mp3) | the operator's | 3.0 s from 0.45 s, the first strokes; faded 0.4 s out |
| `surf.m4a` | the operator's "Ocean Ambience With Seagulls And Heavy Surf Close" (SRC_Select/Surf.mp3) | the operator's | 3.6 s from 31.0 s, one wave; faded 0.4 s in, 0.9 s out |
| `stab.m4a` | the operator's (SRC_Select/Stab.wav) | the operator's | 0.36 s from 0.04 s (M48h, the knife: a new cue) |
| `silenced-shot.m4a` | the operator's "SI-6025_15 Gun Machine Gun Thompson Sub Machine Gun Single Shot" (Src/) | the operator's | 0.84 s from 0.36 s, the first single shot; faded 0.25 s out; loudest 0.4 s at RMS 0.095 (held by its peak) and played at gain 0.2, under the gunfire (M48j) |
| `dog-distant.m4a` | the operator's `dogs.mp3` (SRC_Select/) | the operator's | 0.75 s from 3.38 s, two barks; levelled to the old file's RMS 0.031 (M48j: the old one sounded like bells) |
| `line-cut.m4a` | the operator's "electric-long-15" (Src/) | the operator's | 1.6 s from 1.9 s, the crack and the buzz after; faded 0.45 s out; RMS 0.15 (M48j, a new cue) |
| `stamp.m4a` | the operator's "SoundsCrate-Fight-Impact-12" (Src/) | the operator's | whole, 0.5 s; held by its peak (M48j, a new cue) |
| `music-contents.m4a` | the operator's "soundscrate-optimistic-long-strings-2" (Src/) | the operator's | 18.5 s of 24.7, its silent tail cut so it loops; raised ×12 to the title music's loudest 0.4 s (RMS 0.145); stereo AAC 80 kbps (M48j) |
| `music-france.m4a` | the operator's "soundscrate-beneath-the-surface" (Src/) | the operator's | 161.4 s, trailing silence cut, levelled as above (M48j) |
| `music-desert.m4a` | the operator's "SoundsCrate-Rangers" (Src/) | the operator's | 114.7 s, as above (M48j) |
| `music-aqueduct.m4a` | the operator's "SoundsCrate-Darkest_Path" (Src/) | the operator's | 110.6 s, as above (M48j) |

**M48h, the operator's own files.** The six above came from the operator's folders
`Src/` (a library) and `SRC_Select/` (the six asked for), which are kept out of git
(`.gitignore`: 156 MB of WAVs). Each was made mono at 44.1 kHz, cut, faded, and levelled
so its loudest 0.4 s sits at an RMS of 0.2 (whistle, thump), 0.15 (train, surf) or
0.12 (oars, stab, which are held lower by their peaks), with peaks under 0.97, then
encoded at 64 kbps AAC with `afconvert`. The licences are as the operator's library
gives them.

**Licences.** CC0 is public domain. The Pixabay Content License allows use in a game with
no credit, but not passing the files on "as-is"; these are cut, faded and levelled, and
live in the game. For anything to go into the repo untouched, prefer CC0 from Freesound.

The "WW2 UK Bomb Blast" first picked for the explosion was a long air-raid rumble with no
sharp start, cut off dead at its end, so the listed backup was used instead.
