# Hard Five: Ranged Chain
Build brief, final direction. One HTML file, published as an Artifact.

## Decision

**Winner: Ranged Chain.** Unanimous (53 / 56 / 58). No override. It is the only concept where the chain is literally one chain running through all five names, its calendar is real arithmetic (75 fathoms = 5 shots of 15), the ground is daylight haze grey, and it renders in 2D a phone can hold.

**Grafted in** (each strengthens the source):
- Bitter End: not-done is an **open lap link**, a C-shaped repair link with the jaw sprung, deck visible through the gap. The tap hammers the jaw shut and the run takes up slack. No link falls from the sky.
- Track Five: a plain chalk **countdown to midnight** as the one number Wade reads; finished runs **re-flake to the top of the deck** in finish order so "move over" is physical.
- Half Hour, Please: the **half-hour call**. At 2330 every open link on deck gets a chalk circle. No words.
- Hard Five Doubles: only your run at full iron and full volume; the others one tone lighter, one step quieter, each at its own pitch. Real bell partials for the all-hands bell. A guarded prototype clock scrub.
- Sheet Forty-One: corrections are struck, never erased; one `layout()` function feeds phone and laptop.
- Track Five / Bitter End: the sync seam is a painted word (LOCAL becomes LIVE); long-press to spring a link back open.

**Cut from Ranged Chain**: the watch name, the seven-segment watch bar, the bell marks, rust-ghost links. One time vocabulary, not two. **Not grafted**: painted turn links by finish order (red/white/blue already means shot number on this deck; two meanings for one paint is confusion), the loose broken link lying on deck (a fall is one mark and its number, not a memorial), yesterday's links at 25% (the deck is already alive from the countdown and the light), rust dust particles (particles are slop).

## Source and its rules

A cutter's stud-link anchor chain, ranged on the forecastle deck for inspection. Rules the build must obey because the deck obeys them:

1. Chain is measured in shots of 15 fathoms. 75 Hard is 75 fathoms: exactly five shots. One day is one fathom; one fathom of 3-inch chain is six links; the six links of today's fathom are the six checks.
2. Shots are marked at the detachable link that joins them: red at shot 1, white at shot 2, blue at shot 3, with 1 / 2 / 3 turns of seizing wire. The second-to-last shot is painted yellow end to end, the last shot red end to end, to warn that the bitter end is coming. So: days 1-15 red marker, 16-30 white, 31-45 blue, 46-60 the whole run yellow, 61-75 the whole run red.
3. Ranged chain is flaked in parallel runs joined by turns. Five people are five runs of one continuous chain, pad-eye (bitter end) at top left, hawsepipe at bottom right. Made runs are ranged forward: finished runs sit at the top.
4. A link that is not yet made is an open lap link, bright repair stock, hammered shut and painted with the rest.
5. Chalk is temporary crew marking (names, counts, times, circles). Stencil paint is permanent (column heads, LOCAL, ALL HANDS).
6. Darken ship: from 2000 the weather deck is under red light. Eight bells in the first watch is midnight: the chain is hauled and a fresh one flaked.
7. A chain that parted is shown parted. It is not erased, it is rechalked.

## Screen at rest

Everything is one inline SVG on a deck that fills the viewport. There is no HTML text, no header, no chrome.

### Phone (375 wide, portrait, no scroll)

- **Deck**: full viewport, haze grey `#8E989B` with a non-skid grit tile (feTurbulence 160x160 baked once to a data URI, background-image). One rust bleed `#7A5A48` at 35%, 30x18, under the pad-eye. Nothing else on the deck but the chain and its markings.
- **Bulkhead strip**: y 0-48, `#7F898C`, 1 px bottom edge `#6F797C`. Left: `10 SEP`, Allerta Stencil 13 px, stencil white, x 16, baseline 30. Right, right-aligned at x 359: the countdown `4:48`, Courier Prime 700 22 px chalk, baseline 27; under it `TO MIDNIGHT`, Allerta Stencil 7 px, 70% stencil white, tracking 0.12 em, baseline 41.
- **Column heads**: y 48-70. `DIET LIFT OUT GAL READ PHOTO`, Allerta Stencil 9 px, 70% stencil white, centred on x = 73, 119, 165, 211, 257, 303, baseline 63.
- **Five run slots**, slot k (0-4) top = 72 + 84k, link centre line y = top + 30. Slot 0 runs left to right, slot 1 right to left, alternating; slot 4 runs into the hawsepipe. Columns are fixed by task regardless of direction: DIET is always leftmost.
  - Six **flat links** 36x22 at the six centres, pitch 46. Seven **edge-on connector links** 10x24 at x = 50, 96, 142, 188, 234, 280, 326, always iron, never tappable. Flat links are the checks; connectors are the depth.
  - **Chalk line** at baseline top + 66: name in Allerta Stencil 12 px at x 52 (`WADE`), day count in Courier Prime 700 14 px six px after (`23`), completion time in Courier Prime 400 13 px right-aligned at x 326 (`1740`), only when the run is made.
  - **Turn** after slots 0-3: a stadium-half path (arc r 30, straight 24, arc r 30) from the run's last connector to the next run's first connector, on the right after even slots, on the left after odd slots. Apex x 356 right / 20 left. Drawn as chain: an edge-on link at 40 degrees, the person's **detachable marker link** flat and vertical (36x22) on the straight section, an edge-on link at 140 degrees. The marker is painted in the person's shot colour with 1-5 wire turns (1 px `#E8E4D8` lines across the crown, 3 px apart). After slot 4 the turn goes down-right into the **hawsepipe**: a dark oval 34x20 `#3A3F42`, rim `#2A2E30`, centred (356, y4 + 60); slot 4's marker link sits on that turn.
  - **Pad-eye** at (30, y0): a 14 px D-shackle in iron, the first connector hangs from it.
- **Footer**: `LOCAL`, Allerta Stencil 9 px, 60% stencil white, right-aligned at x 359, baseline 548.
- Every link casts a hard-edged **deck shadow**: the link silhouette in `#5F6669` at 45%, offset by the sun (see Time left). No blur.

```
┌──────────────────────────────────────┐
│ 10 SEP                        4:48   │  bulkhead strip
│                          TO MIDNIGHT │
│     DIET  LIFT  OUT  GAL  READ PHOTO │
│ ◎═║(■)║(■)║(■)║(■)║(■)║(■)║╮        │  slot 0  TOM, made, yellow run
│   TOM 52                  1740 [Y⁴]  │           marker on the turn
│ ╭═║(■)║(■)║(■)║(■)║(⊂)║(⊂)║╯        │  slot 1  WADE, 4 closed, 2 open
│[W²] WADE 23                          │
│ ╰═║(■)║(■)║(■)║(■)║(⊂)║(⊂)║╮        │  slot 2  MIKE
│   MIKE 24                     [W²]   │
│ ╭═║(■)║(■)║(■)║(■)║(⊂)║(⊂)║╯        │  slot 3  JESS
│[B³] JESS 39                          │
│ ╰═║(■)║(■)║(■)║(⊂)║(⊂)║(⊂)║╮        │  slot 4  DAN, parted yesterday
│   DAN ~34~ 1                 >╳<  ◉  │           parted marker, hawsepipe
│                               LOCAL  │
└──────────────────────────────────────┘
(■) closed flat link   (⊂) open lap link, bright, jaw sprung
║ edge-on connector    [W²] marker link, white paint, 2 wire turns
```

### Laptop (viewport ≥ 900)

Same object from the same `layout()` function. An 800 px block centred, top 40. Bulkhead strip spans the full viewport width, 64 tall: `10 SEP` 20 px at block left, countdown 34 px and `TO MIDNIGHT` 10 px at block right. Column heads 14 px. Links scale 1.6x: flat 56x34, edge-on 16x38, pitch 72, link field x 184-616 within the block. Run pitch 118; turn arcs r 45 in the 60 px zones either side of the field. Names and counts chalked in the left gutter (0-120), vertically centred on the link line, 20 px / 22 px. Completion times in the right gutter (690-800), Courier Prime 20 px. Hawsepipe bottom right of the block; LOCAL beneath it. The rest of the viewport is deck.

## The move

Wade taps an open lap link in his run (pointerup within 400 ms and under 8 px of travel, so scrolling never fires it).

- **0 ms**: the jaw (the detached 60-degree arc of the C, hinged at its stud-side end) rotates from -38 degrees to 0 over 180 ms, `cubic-bezier(.2,.9,.3,1.15)`: two degrees of overshoot, then it settles. One dry iron clank: Web Audio, two decaying sine partials at 2.2 kHz and 3.4 kHz plus a 20 ms noise burst, 140 ms total, no reverb. 10 ms vibrate where supported.
- **180 ms**: the link's fill crossfades from bright lap-link steel to the three iron tones over 200 ms. It is made.
- **180 ms**: the run takes up slack. Every link in the run translates 2 px toward the pad-eye along the chain's direction with a damped spring (stiffness 180, damping 14, ~220 ms); the two neighbouring links yaw 1.5 degrees and back. The whole run flinches once.
- **Sixth link, 400 ms**: the run comes taut: 3 px toward the pad-eye and holds. 0.8 s of chain running through a hawsepipe (filtered noise, 9 Hz clatter envelope). The time is chalked at the run's end, revealed left to right through a widening clipPath over 400 ms.
- **1200 ms**: the run re-flakes. It slides up to its slot in the finished block (slot index = number of runs already made); every run it passes slides down one slot; 380 ms per run, 60 ms stagger from the top; turns redraw after the move; 0.4 s of chain dragging on deck.
- **Thirtieth link**: one taut pull across all five runs (3 px, 300 ms), one bell, and `ALL HANDS` is stencilled across the deck under the runs, 100% stencil white, paint reveal 600 ms.

A friend's check arriving through sync is the identical event in their run: same jaw, same slack, clank at -6 dB and at that person's pitch (Mike -8%, Jess -4%, Dan +4%, Tom +8%), same taut-and-re-flake when they finish. A phone on the counter clanks when Mike finishes his outdoor workout.

**Undo**: long-press (700 ms) a closed link in your own run. The jaw springs back open with a duller tick (single 1.4 kHz partial, 60 ms), no slack change. If the run had been made, its chalked time is struck through with one chalk stroke and the run re-flakes back into the unfinished block; the next completion chalks the new time beside the struck one.

## Time left

One number, three kinds of light, one call. No bar, no percentage.

1. **The countdown**: `H:MM` to local midnight, chalk, updated on the minute. Under an hour it reads `0:47`.
2. **The sun**: a simplified solar position for 40.7 N, -74.0 W drives one shadow offset for every link: shadow falls away from the sun, length `clamp(2 / tan(altitude), 1.5, 6)` px on phone (x1.6 laptop), recomputed once a minute. 0900 is long and to the lower left; 1300 is short; 1800 is long and to the lower right.
3. **Floodlight**: from sunset until 2000 (winter evenings), a single overhead floodlight: shadow 2 px straight down, deck one step darker `#848E91`.
4. **Darken ship**: from 2000 to midnight the deck is under a red lamp. It is a lamp, not a theme: deck `#7B6866`, strip `#6E5C5A`, chalk `#E9B9B2`, stencil `#DDB0AA`, open lap links `#9A8F8F`, iron and paint unchanged, shadows 2 px straight down. The deck floor colour is `#7B6866`; it never goes darker.
5. **Half-hour call**, 2330: every open lap link on the deck gets a hand-drawn chalk circle (an ellipse path with two wobble points, 1.5 px, chalk at 85%). The circles persist until the link closes or midnight.

**Midnight**: eight bells (pairs, 0.9 s apart). Every run with fewer than six closed links: its marker link parts with a snap. Then the whole chain hauls along the serpentine into the hawsepipe over 1.2 s (chain running out), and a fresh chain flakes in from the pad-eye over 1.2 s, all lap links open. Day counts are rechalked: +1 for made runs; struck and rechalked `1` for parted ones. If the page was closed at midnight, the same evaluation runs silently on the next open, no haul animation, and the parted marker persists for that day.

## The five-person chain

- 5 people x 6 checks = 5 runs x 6 flat links. Row is the person, column is the task.
- **Done** = closed flat link, three iron tones, stud across the middle, hard shadow on deck.
- **Not done** = open lap link, bright repair steel, jaw sprung 38 degrees, deck visible through the gap. Yours are tappable; theirs are not.
- The five runs are **one chain**: pad-eye to hawsepipe, turns drawn as chain with the painted marker on each turn. If the turns are not drawn it is a table.
- **Your run** is full iron (`#1C1C1C / #3B3B3B / #7A7A7A`) and your name is chalk at 100%; the other four runs are one tone lighter (`#2A2A2A / #4A4A4A / #8A8A8A`), names at 80%.
- **Day count** is the chalked number and the marker paint. Shot 1-3: red / white / blue marker with 1 / 2 / 3 wire turns, black iron run. Shot 4: the whole run painted yellow. Shot 5: the whole run painted red. Paint on a run is an 85% tinted overlay so stud, crown highlight and shadow side still read through.

## First done, and a fall

- **First**: the finished block sits at the top of the deck, earliest time on top. Each made run has its 24-hour time chalked at its end. Unfinished runs keep a fixed order beneath: you first, then roster order. Nothing is numbered.
- **A fall**: the person's marker link is drawn parted for the whole day (two jagged halves in their shot colour, 8 px gap), and their day count is struck with one chalk stroke and rechalked `1` beside it. Day 1 people who did not fall are indistinguishable and that is correct.

## Palette

| Hex | Use |
|---|---|
| `#8E989B` | Haze grey deck, with grit; `#7F898C` bulkhead strip |
| `#1C1C1C` `#3B3B3B` `#7A7A7A` | Iron: your links (body, mid, crown highlight) |
| `#2A2A2A` `#4A4A4A` `#8A8A8A` | Iron, one tone lighter: the other four runs |
| `#A9AFB2` `#C7CBCD` `#7D8386` | Open lap link: bright repair steel (body, highlight, shadow side) |
| `#5F6669` at 45% | Link shadow on deck, hard edge |
| `#F1EEE4` | Chalk: names, counts, times, countdown, circles |
| `#ECEAE3` | Stencil paint: column heads and LOCAL at 60-70%, ALL HANDS at 100% |
| `#B4372B` `#E8E4D8` `#2A4B8A` | Red lead, white, blue: markers for shots 1-3; red lead again for the shot-5 run |
| `#D9B23A` | Chain yellow: the shot-4 run |
| `#7A5A48` at 35% | The one rust bleed |
| `#7B6866` `#6E5C5A` `#E9B9B2` | Darken-ship deck, strip, chalk (2000-0000) |

Colour belongs to a day count, never to a person. Paints are boatswain's paint on black iron, desaturated as listed; never brighten them.

## Type

- **Allerta Stencil** 400: all lettering (date, TO MIDNIGHT, column heads, names, LOCAL, ALL HANDS). Fallback `"Stencil", Impact, sans-serif`.
- **Courier Prime** 400 / 700: all figures (countdown, day counts, times). Fallback `"Courier New", monospace`.
- Stylesheets, verified 200: `https://fonts.googleapis.com/css2?family=Allerta+Stencil&display=swap` and `https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap`.
- No third face. All type is SVG `<text>` on the deck; zero HTML type.

## Rendering, libraries, state, seam

- **One inline SVG**, rebuilt from state by `render()`. Four `<symbol>`s: flat link (outer stadium and inner void with evenodd, stud rect, three stacked strokes for the iron tones, crown highlight), edge-on link, lap link (fixed C body plus a separate jaw path with its transform-origin at the hinge), detachable marker link (wire turns parameterised 1-5) with a parted variant. Links are `<use>` instances; shadows are a second `<use>` of the silhouette in the shadow group, offset by the sun. Grit is a baked data-URI tile, not a live filter.
- **No script libraries.** Nothing from cdnjs or jsdelivr is needed. three.js (`https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js`, verified) is explicitly forbidden: the concept is flat daylight on a deck, not a render. If, and only if, hand-rolled chalk circles look mechanical, `https://cdn.jsdelivr.net/npm/roughjs@4.6.6/bundled/rough.js` (verified, global `rough`) is the one permitted library, for the circles and strike-throughs only.
- **Layout**: one `layout(viewportWidth)` returns `{scale, linkX[6], connectorX[7], rowY(k), sideOf(k), gutters}`; phone and laptop cannot drift. Re-run on resize and orientation.
- **Animation budget**: only changed links animate; at most 24 in flight, the rest queue; `will-change` only during motion; full re-render on state change and once per minute (countdown, sun); no continuous rAF at rest.
- **Sound**: synthesised in Web Audio, no files. The context is created on the first link tap. Long-press the date to mute; muted, the date is drawn as a hollow stencil outline. Remembered in state.
- **State**: `localStorage["hardfive.v1"]` = `{ me, roster:[{id,name,day}], days:{ "YYYY-MM-DD": { [id]: { links:[t|null x6], doneAt, struck:[t], parted } } }, muted }`. Everything keyed to local ISO date; rollover evaluated on load, on `visibilitychange`, and on a 30 s tick.
- **Seam**: `window.HardFive.sync = { name, pull(): Promise<Snapshot>, push(event): Promise<void>, subscribe(cb) }`, `event = {who, task, at, done}`. Shipped adapter `LocalSample` replays the schedule below against the real clock (catch-up on load is instant and silent; only events that fire while open animate) and persists Wade's taps. The stencilled `LOCAL` is bound to `sync.name`; a real adapter (same three methods, WebSocket or Firestore) repaints it `LIVE` and touches nothing else. A comment block above `LocalSample` documents `Snapshot`.
- **Deck-log panel** (the only chrome, hidden): tap `LOCAL`. Five ruled chalk lines over the deck, each an editable name and day count in chalk, a chalk `ME` beside the selected person (tap a line's margin to move it), last line `ADAPTER  LOCAL SAMPLE`. Tap the deck to close and save.
- **PROTOTYPE = true**: drag horizontally on the bulkhead strip to scrub the clock (countdown, sun, darken ship, sample events all follow); tap the strip to snap to live. Guarded by the one flag beside the seam.
- Tap targets: invisible 46x60 rects over your six flat links, `role="button"`, `aria-label="DIET, open"`. Other runs have no targets.

## Sample data (LocalSample, times local)

- WADE, day 23, white marker: real taps, no schedule.
- TOM, day 52, yellow run: DIET 0630, LIFT 0655, OUT 0745, GAL 1420, READ 1630, PHOTO 1740. First finisher.
- MIKE, day 24, white marker: DIET 0700, LIFT 0745, GAL 1130, OUT 1800, READ 2110, PHOTO 2145.
- JESS, day 39, blue marker: OUT 0610, DIET 0900, GAL 1300, LIFT 1830, READ 2200, PHOTO 2240.
- DAN, parted yesterday, day 1, red marker drawn parted: DIET 1215, GAL 1500, LIFT 1900, nothing after. At 2330 his three open links are circled; at midnight he parts again.

## Interactions, complete

1. Tap an open lap link in your run: the move.
2. Long-press (700 ms) a closed link in your run: springs open; a made run's time is struck.
3. Tap any link in another run: nothing, no sound.
4. Tap `LOCAL`: deck-log panel. Tap the deck: close.
5. Long-press the date: mute / unmute.
6. Prototype only: drag the bulkhead strip to scrub time; tap it to snap back.
7. Resize / rotate: re-layout.

Nothing else responds to anything.

## Not on the screen

No title or wordmark (the tab is `Hard Five`). No avatars, no person colours. No progress bar, percentage, streak flame, or "day 23 of 75" sentence. No buttons, cards, borders, shadows on cards, gear, share, bell icon, tooltips, legend, or onboarding. No watch names or bell marks. No 01/02/03. No emoji. No gradients, glow, blur, bloom, vignette, or particles. No dark theme and no theme toggle. No notifications. Total vocabulary on screen: `10 SEP`, the countdown, `TO MIDNIGHT`, six column heads, five names, five counts, up to five times, `LOCAL`, and `ALL HANDS` only when the chain is made. Any new label requires a removed one.

## Three ways this slides into slop

1. **The chain becomes clip-art ovals in a table.** Rule: nothing is built before the link. Build one flat link, one edge-on connector, one open lap link and one painted marker on the gritted deck, screenshot at 390 px wide, and do not write a line of layout until that screenshot reads as iron: stud-link proportions, three tones, crown highlight, hard contact shadow, no `rect rx`, no single-fill shapes. Then the turns: if the turns do not read as the same chain going round, it is a grid and it fails.
2. **Darken ship reads as dark mode.** Rule: the deck never goes below `#7B6866`, iron stays black, paint stays paint, nothing glows; it is compared side by side with the 1300 deck before ship, and if it reads as a theme rather than a lamp it is cut to the floodlight state and the 2330 circles carry the last watch alone. Wade is shown the daylight deck first.
3. **Words and chrome creep back.** Rule: the vocabulary above is the whole vocabulary. No label, icon, tooltip, legend or explanation is added without one being removed; the deck-log panel stays the only chrome and stays hidden behind `LOCAL`. If a state needs a word to explain it, the state is redrawn, not captioned.

## Build order

1. Link symbols on the deck at phone scale; the screenshot gate.
2. The serpentine with turns, markers, pad-eye, hawsepipe; a run with mixed open and closed links; a parted marker.
3. `layout()` for both widths; chalk line, column heads, strip, countdown.
4. The move, with sound, slack, taut, chalked time, re-flake.
5. Sun shadows, floodlight, darken ship, 2330 circles, midnight haul.
6. State, `LocalSample`, seam, deck-log panel, prototype scrub, mute.
7. Test at 390 px and at 1440 px; test 0700, 1300, 1912, 2345, and the midnight haul via the scrub.