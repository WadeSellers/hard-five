# Hard Five

Five people doing 75 Hard, one chain.

The screen is a cutter's stud-link anchor chain ranged on the forecastle deck for inspection. Five runs of six links: one run per person, one link per daily check (diet, workout, outdoor workout, gallon, ten pages, photo). A closed black link is done. An open bright lap link with the jaw sprung is still owed. Tap yours and it hammers shut. Close all six and your time is chalked and your run re-flakes to the top of the deck. The painted link on each turn is the person's day count, marked the way real chain is marked by shot. Miss a day and your marker parts. Nobody has a colour. A count does.

Chalk is temporary. Stencil is permanent. Time is the light on the deck, not a bar. After 2000 it is darken ship. At midnight, eight bells, the chain hauls out and a fresh one flakes in.

Live at https://wadesellers.com/hard-five/ (GitHub Pages, this repo, `main` branch root). Design contract: `proto/BRIEF.md`.

## How it works

- One static page, no build step, no framework. ES modules straight from the repo.
- `sync/` is the seam. `config.js` decides which adapter runs:
  - `FIREBASE = null` → `sync/local.js`: a sample crew that replays a day against the real clock, your taps kept on this device. Stencil reads LOCAL.
  - `FIREBASE = {...}` → `sync/firestore.js`: the crew shares one Firestore document per day. Stencil reads LIVE. See `SETUP.md`.
  - `?sync=fake` → `sync/fake.js`: an in-memory crew mirrored across browser tabs through `BroadcastChannel`, so two tabs act as two phones. Used by the tests.
- Day counts are never stored. `days.js` walks each person's anchor forward: plus one after a made day, back to one after a miss. Every phone computes the same number, so there is no writer at midnight.
- Each phone writes only its own person's map with dotted-path updates; the day document is created with a merge on the first write.

## Data model (Firestore)

```
crews/{crewId}                     { roster: [ { id, name, anchor: { date: 'YYYY-MM-DD', day }, uids: [] } ], createdAt }
crews/{crewId}/days/{YYYY-MM-DD}   { [pid]: { links: { DIET, LIFT, OUT, GAL, READ, PHOTO }, doneAt, doneSeq, struck: [] } }
```

Link values are `'HHMM'` stamps or `null`.

## Run it locally

```bash
python3 -m http.server 8080
```

Then http://localhost:8080/ (ES modules do not load from `file://`).

Query hooks for testing: `?t=13:00` freezes the clock, `?anim=0` disables animation, `?vw=390&vh=844` forces the phone layout, `?sync=fake` uses the tab-mirrored crew, `?reset=1` clears it, `?fresh=1` forgets this device's identity, `?nosw=1` skips the service worker, `?proto=1` enables the clock scrub on the bulkhead strip.

## Tests

```bash
node --test test/days.test.mjs
```

`test/drive.py` drives the page in headless Chrome over DevTools with real input. Headless Chrome will not open narrower than 500 px, so phone screenshots use `?vw=390&vh=844`.

## Files

`index.html` shell and link symbols · `app.js` the move, midnight, sound, gestures · `deck.js` layout and render · `state.js` clock, device, applied state · `days.js` day arithmetic · `sync/` adapters · `sw.js`, `manifest.webmanifest`, `icons/` the installable app · `firestore.rules` · `proto/` the accepted prototype and its brief.
