# Draft-versus-live gap checklist

The standard method for proving a hand-built or cloned page matches its design draft, for any client.
The tool is `scripts/parity/draft-live-walk.mjs` (the walker); each page has one config (for Eye Care:
`sites/eye-care-ward-end/build/qa/parity/<page>.mjs`). A page matches only when the walker exits 0:
config lint passes, 0 open differences, 0 unreviewed shots, 0 live console errors.

```bash
# from plugins/sgs-blocks (Playwright lives there); Hostinger sites need certifi's CA bundle
NODE_EXTRA_CA_CERTS=<certifi cacert.pem> node ../../scripts/parity/draft-live-walk.mjs <config.mjs>
node ../../scripts/parity/draft-live-walk.mjs <config.mjs> --lint     # config lint only, no browser
```

Outputs in `<config dir>/out/<name>/`: `report.md` (every difference, open or accepted with its reason),
`contact.md` (every state x width shot with its review note), `pair-<width>-<state>.png` (draft left, live
right), `report.json` (raw snapshots, action logs, structure).

Each class below says how it is detected, how a "this page matches" claim is falsified, and what covers it.

## 1. States driven by clicks, not URLs

- **Gap:** a state reached on live by loading a URL skips the code a shopper's click runs. The shop's filter
  states loaded `?filter_colour=black`, so WooCommerce's Interactivity re-render never ran and the run read
  clean while every real click turned the colour swatches into text chips.
- **Detected by:** the drive check. Every `h.goto`/`h.click`/`h.clickText` is logged per state; a state the
  draft reaches by an interaction click and live reaches only by a URL is an open `drive` difference
  (`live-by-url`). Mark a click that only navigates (a single-page draft's menu link) `{ nav: true }`.
- **Falsified by:** a `drive` row in `report.md`; or a state whose live action is `h.goto(url + '?filter…')`.
- **Config pattern:** reach every state by the click a visitor makes, on both sides; pass `{ quiet: true }`
  on a click that re-renders by fetch, so the snapshot waits for the network. Include one state that leaves
  the changed panel open after the click (the shop's `panel-after-click`) and scope the panel's pairs to it.

## 2. Every state checks what it changed (config lint)

- **Gap:** a state with only page-wide pairs proves the page around the change, not the change.
- **Detected by:** config lint, before any browser opens: every state after the first needs a pair scoped
  to it (`states: [...]`); pair names are unique; every accept has a real reason and names a real pair;
  review keys are `state@width` with a note of at least 40 characters.
- **Falsified by:** `--lint` failing.

## 3. Screenshot review of every state at every width

- **Gap:** the metrics cover only the pairs someone thought to name. Bean found the Filter button's look and
  place, the brand-name size and the card fade on screenshots nobody had opened (only 1440 and the 375
  drawer had been looked at).
- **Detected by:** the review gate. `contact.md` lists every `pair-<width>-<state>.png`; a shot with no
  `review['<state>@<width>']` note in the config fails the run (`N shots unreviewed`). `--no-review` skips
  the gate while iterating; it is never the final run.
- **How to review a shot:** open it full size and compare draft against live region by region (title row,
  controls, panel, grid or content, footer of the view), then write what you compared and what you found:
  "title row: eyebrow, h1, count and sort aligned; Filter button outlined in the row; 3 columns, cards
  match; drawer closed". A note is rewritten whenever a fix changes that state. Any difference you see
  becomes a pair (so the walker measures it from then on) or an accept with a reason.
- **Falsified by:** an unreviewed shot, a note that does not name regions, or a note older than the last
  fix to that state.

## 4. Structure: where a control sits, not only how it looks

- **Gap:** a control can match in box and style and still sit in the wrong place: the shop's Filter button
  at 768/375 was a pill under the title where the draft has it in the title row beside the count and sort.
- **Detected by:** the structure check, for every pair on both sides: `inside` (which other pairs contain
  it) and `row` (which pairs share its row: vertical overlap of half the shorter box, heights within 3x,
  neither containing the other). A differing set is an open `structure` difference.
- **Config pattern:** name the neighbours as pairs too (title, count, sort beside a toolbar button), so the
  row has something to compare. `structure: false` on a pair opts it out (a full-page wrapper).
- **Spacing:** `anchor: '<pair>'` compares a pair's vertical distance from another pair (the grid from the
  title), so a missing gap or rule shows even when the header above differs in height. The shop's title row
  lacked the draft's 24px gap and hairline; `grid y-from-title` 101 against 77 is how that reads now.
  `anchorX: true` adds the right-edge gap (`right-from-<anchor>`): a card's tag anchored to its card reads
  17 when it sits inside the 16px inset and a negative number when a long name pushes it past the edge.
- **Falsified by:** a `structure` or `y-from-*` row, or a control with no neighbouring pairs to anchor it.

## 5. Hidden-by-scroll and scroll-in content

- **Gap:** content that fades or slides in as it scrolls into view (the draft's card fade) is invisible to
  an at-rest snapshot, and a full-page screenshot reveals it on one side only.
- **Detected by:** `scrollIn: true` on a pair: its opacity/transform/translate/scale/filter are read before
  anything scrolls, the animations started ~60ms after it is scrolled to, and the values once settled
  (`scrollWait`, default 1500ms). Differences are `scroll` rows (`pre:opacity`, `running-on-reveal`, ...).
- **Config pattern:** mark one below-the-fold item of each repeated kind (a card in the second row, a
  section heading) `scrollIn: true`; put `fullPage: true` on the opening state so the review sees it all.

## 5a. Scrolled states: what appears only after scrolling

- **Gap:** a sticky or fixed element that appears once the page scrolls (the shop's floating Filter button at 375,
  which the draft does not have) is absent from every at-rest state and every screenshot taken at the top.
- **Detected by:** a state whose action scrolls the page (`h.page.evaluate( () => window.scrollTo( 0, 1200 ) )`,
  then a wait), with a pair for each fixed element either side may show (a presence difference) and its review note.
- **Falsified by:** a narrow-width page with no scrolled state, or a scrolled shot with an element one side only.

## 5b. Clipped edges: a control cut off by its container

- **Gap:** part of a control painted outside a container that clips it (`overflow` on a drawer's scroll area): the
  price slider's right handle was cut off at 768 and 375 once its inset was removed. Box and style comparisons pass;
  pseudo-element parts (a range thumb) cannot be pairs at all.
- **Detected by:** the screenshot review (look at every edge of every control) and a pixel check where a part is not
  an element: the handle's painted width in the shot must equal its declared size (14px for the thin slider).
- **Falsified by:** a note that does not mention the control's edges, or a handle measuring less than its size.

## 6. Drawers and modals at narrow widths

- **Gap:** a drawer can exist on one side only, open from another edge, or hide its trigger.
- **Detected by:** an optional action (`{ optional: true }`) that finds its control on one side and not the
  other is an open `drive` difference (`control /^filter$/`); the trigger itself is a pair (look, hover,
  structure). Pairs inside a closed drawer resolve to nothing on both sides and are skipped.
- **Config pattern:** one state with the drawer open, one with a choice made and the drawer still open, and
  the trigger as a pair in the opening state. Walk 1440, 768 and 375 every time.

## 7. Measurement traps

Fixed in the walker; keep them in mind when a number looks wrong:
- **Smooth scroll before hover:** `centreOf` scrolls with `behavior: 'instant'`; a site with Lenis or CSS
  smooth scroll would otherwise still be moving when the hover point is read.
- **`display: contents` text:** text properties come from the element that paints the first visible text
  node, found by the text node's own rects (its parent may have no box).
- **Outer grids matching a card finder:** a `{ text }` finder picks the smallest visible match; a `{ js }`
  finder for a draft with no class names must pin the element (the shop's `DGRID`: the grid whose every
  child is a priced card). The structure check exposes a wrong match: its `inside` set changes.
- **Scripted clicks paint focus rings:** the helpers click with `el.click()`, which Chrome treats like a
  keyboard action, so a dialog heading or a returned-to button shows its `:focus-visible` ring in the shot.
  A real mouse click does not (proven on the shop drawer: mouse `focus-visible=false`, script and keyboard
  `true`). A ring that appears only after a scripted open is this trap, not a gap.
- **Hidden text is read:** `innerText` includes screen-reader text and text painted at `font-size: 0`
  (WooCommerce's count brackets), so a text difference can be unpainted; confirm on the shot before fixing.
- **Colour formats:** `oklab()`/`color()` values are normalised to sRGB through a canvas, channels within
  2/255.

## 8. Measured but not painted

- **Gap:** a property can differ with no visible effect (a flex versus block wrapper with one child,
  `999px` versus `9999px` radius, a gradient with or without explicit stops). Accepting it blindly also
  hides the day it does start moving pixels.
- **Accept safely:** give the accept a reason naming why nothing paints, scope it by `pair`/`key` where
  possible, and set `notPainted: true` on blanket layout-property accepts: the accept then applies only
  while that pair's box matches, so the difference reopens when the box moves.
- **Falsified by:** a `notPainted` accept on a pair that also has a box difference (the walker reopens it),
  or the shot showing the element differently.

## 9. Hover end states and motion

- **Detected by:** `hover: true` pairs (the hover end state after `hoverWait`), declared transitions and
  keyframes (by content, so a namespaced name matches), and the animations running ~60ms after each action.
- **Accept safely:** an easing or property-name difference with matching durations needs Bean's sign-off
  when it is visible; a colour on an element that paints no text is not painted.

## 11. Full checks (every page; `mode: 'basic'` turns them off)

On by default for every page since 2026-09-28. Built by proving the walker against a hand-read diff of two header copies
(`reports/visual-diff/u18-hand-read-diff-2026-09-27.md`; configs `plugins/sgs-blocks/scripts/nav-qa/gate3c/parity-*.mjs`).
Each check below missed rows the eye caught; each has a negative control (run a reference against itself with
`--self draft` and it reads 0; plant the difference with `--inject-live-css` and it turns red).

- **Transient states:** an earlier hover closes the panel a later pair lives in. The hover pass re-runs the
  state's action when a pair has gone, and reports `hover reached: unreached` rather than skipping it.
- **Motion timeline:** every `h.click`/`h.tap`/`h.hover` samples the `timeline`/`inventory` roots at 30, 120,
  250 and 450ms: growth of the box, root and children away from their settled pose, opacity, and staggered
  animation delays (`timeline@<t>ms:<aspect>`, `stagger`). The old `running-after-action` read came after the
  state's own wait, so every entrance had finished.
- **Painted ground:** the ground an element paints (own background, else a covering `::before`/`::after`, else
  a covering child) replaces the raw `background-color`, which read a `::before` ground as transparent.
- **Text inset** (`text-inset-x/y`, pairs that carry text): where the first painted text sits in its box.
- **Position along a bar:** `anchorLeft: true` compares left edges (`x-from-<anchor>`).
- **Inventory** (`inventory: true`, on a bar, panel or drawer root): every painted text in reading order (rows
  by vertical overlap) and every media or glyph (img, svg, video, canvas, a glyph of 2-4px dots) filed under
  its row with a part count: `text-missing`, `text-extra`, `order`, `media "<row>"`, `media-spill` (a glyph
  larger than its circle). Catches a missing logo row, glyph or showreel, and a CTA below the menu.
- **Hover effects:** what a hover visibly does, as a set: ground appears, small left marker appears, inner part
  scales, lifts, moves (`hoverAt: [fx, fy]` for a label that follows the pointer), indents, fades, and
  `text changes mid-hover` (a scramble, read at 60 and 200ms).
- **Taps:** `h.tap(finder)` clicks with the real mouse at the element's centre, so an overlay or a label that is
  a link takes it; its outcome (`navigated`, `opened`, `nothing`) is compared as a `drive` difference.
- **Phone widths:** below 500px the context is an iPhone 13 (touch, mobile user agent): lamalama hides its pill
  message by device, not width.
- **Viewport-scaled sizes:** put a width above 1440 in `widths` (1920): rem-fluid sites grow past 1440.
- **`--self draft|live`:** points both sides at one side; the baseline every header check must read 0 on.

**Exceptions, checked another way:** a canvas logo (content not in the DOM: presence and box, then the shot);
a rotating message (`inventoryIgnore` drops its words; presence, type and place are compared, and its inset is
accepted); scrambled characters (random, so only "text changes mid-hover" is compared); video content (presence
and box only). The Indus draft's declared entrances never run in its runtime (`componentDidUpdate` gets no
previous state). Bean (2026-09-28): the source intent is the reference; those entrances are proved on the copy
alone against their declared timings, not compared with the draft.

## 12. Automatic check: everything no config names (on with the full checks)

- **Gap:** named pairs and the screenshot review caught none of six gaps Bean then found by eye (the shop's
  Polarised tag place, a floating Filter button after scrolling, a clipped slider handle, card prices with ".00";
  the lens last question as two screens, its 375 footer stacking Back above the action). A config only measures
  what its author thought of.
- **Detected by:** the `(auto)` pseudo-pair, in every state at every width, with nothing to configure:
  - **Words:** every painted word on both sides (screen-reader-only and zero-size text left out), matched in
    reading order (a Myers diff, then blocks moved elsewhere in the DOM). Unmatched runs are `text-missing` /
    `text-extra` (".00", a missing panel, a button on one side only).
  - **Position:** each matched word's offset from the previous matched word; a change of more than 4px is one
    `moved "<prev> → <words>"` row, so a cascade reads as one row where it starts (a tag beside the name on one
    side and under it on the other, Back above the action instead of beside it). A reveal's start pose (a
    faded ancestor's transform) is taken off first; fixed layers are compared on their own.
  - **Text style:** size, weight, family, style, case, letter spacing and colour per word, runs grouped.
  - **Controls and media** (inputs, selects, sliders, buttons and links with no words, pictures): paired through
    their nearest matched word, else by type in order; `control-missing/extra`, `control-size`, `control-moved`.
  - **Clipped:** a control flush (3px) with the left or right edge of an ancestor that clips its overflow is
    `cut` when the screenshot shows ink in the last pixel column inside that edge over its rows; a pseudo-element
    part (a range handle) cut off on one side only is a `clipped` row.
  - **Scrolled state:** `auto-scrolled`, added after the opening state, scrolls a screen and a half (a floating
    button, a sticky bar, content below the first screen). `autoScroll: false` for a page that opens in a modal.
  - **Modals:** when both sides show a modal (`dialog[open]`, `aria-modal`, `role=dialog`), only its contents
    are compared; when one side draws its drawer in the page, both whole pages are.
- **Config:** `auto.exclude: { draft: [...], live: [...] }` adds to the default exclusions (header, footer,
  banner and contentinfo landmarks: the nav track); `auto.root` limits a side to one element; `autoTolerance`
  (`move`, `box`, `px`). Accept an `(auto)` row like any other, with `pair: '(auto)'` and a `when` on its key.
  `auto: false` or `--no-auto` turns it off.
- **Falsified by:** an `(auto)` row left open; the catch-rate benchmark below scoring under 6 of 6.

### The catch-rate benchmark

`scripts/parity/benchmark.mjs` replays the six gaps (`benchmark/cases.mjs`) on today's live site (the pre-fix
CSS, or an init script, injected on the live side with `--inject-live-css` / `--inject-live-js`) against each
page config as it stood before the gaps were found (so no pair was written with the gap in mind), and scores
caught / 6 with `benchmark/score.mjs`. A row is new when the control run lacks it, or when its live value moved
more than 4px while its draft value held (the injection touches live only, so a moving draft value is noise). A
case is caught only when a new row matches its `match`, written from the gap alone ("polarised", ".00", "filter"
in a scrolled state), so noise elsewhere on the page never counts. `--noise` adds a no-op injection per config:
its new rows are the walker's run-to-run noise. Run it after any change to the walker's checks; re-score a
recorded run with `node scripts/parity/benchmark/score.mjs <out dir>`.

```bash
NODE_EXTRA_CA_CERTS=<certifi cacert.pem> node ../../scripts/parity/benchmark.mjs --noise
```

**Measured 2026-09-28:** the walker before this section caught **1 of 6** (only ".00", which the shop config then
accepted as pennies); with the automatic check it catches **6 of 6**, with 0 noise rows on the shop and 0 on the
lens. The catching rows: a `moved "polarised → £119 …"` (the tag's offset -60 → -83 at 375); b `text-extra
"filter"` in `auto-scrolled` at 768 and 375; c `clipped input:range "maximum price"` (whole → right) at 768 and
375; d `text-extra "… £139.00 £171.00"` on every card; e `text-missing "perfect — order now and i'll whatsapp you…"`,
`"add to bag £418"` and `text-extra "continue"` at every width; f `moved "back → add to bag"` (160,0 → 135,64).

## 10. Text, data and draft bugs

- Word-multiset text comparison (DOM order ignored). Real-data differences (review counts, stock counts,
  pennies) and draft bugs (a filter returning 0) are accepts with Bean's dated decision in the reason.
  Anything "PROPOSED to Bean" is open work until answered.
