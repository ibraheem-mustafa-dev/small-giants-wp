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

- **Read at rest on every pair** (besides type, colour, box and spacing): the underline a visitor sees (from the
  nearest decorated element at or above the painted text), text shadow, transform/rotate/scale/translate, outline,
  backdrop filter, all four border colours, and an svg icon's `fill` and `stroke` (`icon-fill`, `icon-stroke`). The
  automatic check also compares each word's underline and shadow.
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
  message by device, not width. A phone has no hover, so no hover end state is compared there (Bean 2026-09-28).
- **Viewport-scaled sizes:** put a width above 1440 in `widths` (1920): rem-fluid sites grow past 1440.
- **`--self draft|live`:** points both sides at one side; the baseline every header check must read 0 on. The
  per-side `auto.root`, `auto.exclude` and `linkRoot` follow, so both sides look for the same side's elements, and
  the links check skips what only a live site has (health and the `links` table).

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
  - **Words:** every painted word on both sides, matched in reading order (a Myers diff, then blocks moved elsewhere
    in the DOM; a lone word pairs across the DOM only when unique among the leftovers and in the same type).
    Repeated words ("from £59" on two cards, "frame" in a stage line and a footer link) are then checked by
    geometry: a matched run moves to its twin when that fits the matched words either side far better (a
    quarter of the error and 24px less), and a repeated word left over on both sides pairs with the one twin
    within 24px of where its neighbours put it. Two sides that order a card's parts differently in the DOM
    (price before or after the description) no longer cross-pair. `--dump-auto` writes each side's words
    (`auto-<side>-<width>-<state>.json`) to diagnose a pairing.
    Not painted, so left out: screen-reader-only and zero-size text, a closed `<details>` beyond its summary (Chrome
    still gives it boxes), and text clipped away by an ancestor's or its own overflow. Unmatched runs are
    `text-missing` / `text-extra` (".00", a missing panel, a button on one side only).
  - **Position:** each matched word's offset from the previous matched word; a change of more than 4px is one
    `moved "<prev> → <words>"` row, so a cascade reads as one row where it starts (Back above the action instead
    of beside it). Across words on one side only, only a horizontal change counts (made-up stars against "No
    reviews yet" push every later price down). A reveal's start pose (a faded ancestor's transform) is taken off
    first; fixed layers are compared on their own.
  - **Text style:** size, weight, family, style, case, letter spacing and colour per word, runs grouped.
  - **Clipped controls:** controls (inputs, sliders, buttons and links with no words, pictures) are paired through
    their nearest matched word only for this check; their presence, size and place are left to the words around
    them, the named pairs and the review (a draft and a live page build the same control from different elements).
    A range input flush (3px) with, or any other control crossing, the left or right edge of an ancestor that clips
    its overflow is `cut` when the screenshot shows ink in the last pixel column inside that edge; cut on one side
    only is a `clipped` row (a range handle, a pseudo-element, clipped by a drawer's scroll area).
  - **Scrolled state:** `auto-scrolled`, added after the opening state, scrolls a screen and a half (a floating
    button, a sticky bar, content below the first screen). `autoScroll: false` for a page that opens in a modal.
  - **Modals:** when both sides show a modal (`dialog[open]`, `aria-modal`, `role=dialog`), only its contents
    are compared; when one side draws its drawer in the page, both whole pages are.
- **Config:** `auto.exclude: { draft: [...], live: [...] }` adds to the default exclusions (header, footer,
  banner and contentinfo landmarks, the framework's floating WhatsApp button: the nav track); an entry is a selector
  or a `{ js: '(root) => element' }` finder (a draft with no class names); `auto.root` limits a side to one
  element; `auto.normalise: [{ side, from, to, reason }]` rewrites words before matching (a decision such as
  pennies on every price; linted for a reason); `autoTolerance` (`move`, `box`, `px`). Accept an `(auto)` row like
  any other, with `pair: '(auto)'` and a `when` on its key (strip a trailing ` #n` repeat counter). `auto: false`
  or `--no-auto` turns it off.
- **Falsified by:** an `(auto)` row left open; the catch-rate benchmark below scoring under 5 of 5.

### The catch-rate benchmark

`scripts/parity/benchmark.mjs` replays the six gaps (`benchmark/cases.mjs`) on today's live site (the pre-fix
CSS, or an init script, injected on the live side with `--inject-live-css` / `--inject-live-js`) against each
page config as it stood before the gaps were found (so no pair was written with the gap in mind), and scores
caught / 5 with `benchmark/score.mjs` (gap a is reported, never scored: the draft has it too). A row is new when the control run lacks it, or when its live value moved
more than 4px while its draft value held (the injection touches live only, so a moving draft value is noise). A
case is caught only when a new row matches its `match`, written from the gap alone ("polarised", ".00", "filter"
in a scrolled state), so noise elsewhere on the page never counts. `--noise` adds a no-op injection per config:
its new rows are the walker's run-to-run noise. Run it after any change to the walker's checks; re-score a
recorded run with `node scripts/parity/benchmark/score.mjs <out dir>`.

```bash
NODE_EXTRA_CA_CERTS=<certifi cacert.pem> node ../../scripts/parity/benchmark.mjs --noise
```

**Measured 2026-09-28:** the walker before this section caught **1 of 5** (only ".00", which the shop config then
accepted as pennies); with the automatic check it catches **5 of 5**, with 0 noise rows on the shop and 0 on the
lens (re-run after the repeated-word pairing, 2026-09-28: 5 of 5, 0 and 0). The catching rows: b `text-extra "filter"` in `auto-scrolled` at 768 and 375; c `clipped input:range "maximum
price"` (whole → right) at 768 and 375; d `text-extra "… £139.00 £171.00"` on every card; e `text-missing "perfect —
order now and i'll whatsapp you…"`, `"add to bag £418"` and `text-extra "continue"` at every width; f `moved "back →
add to bag"` (160,0 → 135,64).

**Re-measured 2026-10-02, after sections 13-15:** 5 of 5. Lens noise 0. Shop noise 2, both `moved` rows in
`auto-scrolled@1440` that are open in the control run too and whose values drift between runs (the shop's scroll
reveal, retimed by the 2026-10-01 motion batch). The walker before sections 13-15 reads the same values on an identical
invocation, so the drift is the page's, not the new checks'. The first run of the new checks opened 2 entrance rows
on a rotating ticker (now left out as a loop) and 8 lens rows, gone on the next run once the focus pass restored every
scroller it moved (one run: the restore is the suspected cause, not a proven one).

**Re-measured 2026-10-03, after section 16 (ref tracing, the divergence ledger, row ids):** 5 of 5, noise 0 on the shop and
0 on the lens (`benchmark/out/2026-10-03T13-18-29/summary.md`). The benchmark configs set no `refPrefix`, so they read exactly
the properties they read before.

**What no draft comparison can catch:** gap a (the Polarised tag's uneven place) is not scored (`draftHasIt`).
Measured, the pre-fix tag sat exactly as the draft's at every width (box 77x24, 8px each side, 17px from the card
edge, past the edge on a one-word name at 375): the draft has the flaw, and Bean's fix went beyond it. A flaw in the
draft itself is caught only by judging the design, so every page wave keeps an Opus review of the shots for the
draft's own faults (tags, overflow, uneven placement), not only for differences.

**False alarms on passing pages:** the first automatic check opened 4,100 rows on the shop and 480 on the lens,
nearly all from pairing controls built from different elements and from text in closed groups; after the fixes
the rows left are real differences. Every one is fixed, or accepted with Bean's dated decision (config `accept`
entries with `pair: '(auto)'`; `auto.normalise` for a word-level decision such as pennies).

## 13. Keyboard focus rings

- **Gap:** a control can match at rest and on hover and still show no ring (or a different one) to a keyboard user.
- **Detected by:** the focus pass, on every `hover: true` pair (or `focus: true`; `focus: false` opts out) at
  non-phone widths. Focus is parked on the tabbable control before the pair's own, then a real Tab moves it on (a
  scripted `el.focus()` after mouse clicks never matches `:focus-visible`). The control's `outline-*`, `box-shadow`,
  ground, colour and underline are compared (`focus` rows), only where focus changes them on at least one side (a
  difference already there at rest is the rest rows'). `focus reached` says the Tab landed on one side only. Every
  scroller the Tab moved (the window, a pop-up's scroll area) is put back instantly, so the next state starts as the
  last one left the page.
- **Falsified by:** a `focus` row, or `focusable none` on one side.

## 14. Links

- **Gap:** a link can match in look and words and go nowhere, or to the wrong page. A design draft is often a
  one-page prototype whose links are `#` and whose pages change by script, so its internal links cannot be
  compared side by side.
- **Detected by:** the `(links)` pseudo-pair, each problem reported once per run:
  - `dead "<text>"`: a visible live link whose href is `#`, empty or `javascript:`.
  - `broken "<text>"`: a same-origin target that answers 400 or more (a 403, 429 or 503 is the host's bot check and
    is left unjudged).
  - `missing` / `href "<text>"`: the draft's real hrefs (tel:, mailto:, an outside site) against the live link of the
    same text.
  - `table "<label>"`: the config's `links: { '<visible text>': '<path, URL, tel: or mailto:>' | [ ... ] }` states
    where each label must go; written once per site from the draft's click handlers. A listed label that no state
    shows is a row too.
- **Scope:** the page minus the header and footer (as the automatic check), or `linkRoot: { draft, live }` for a
  header or footer config. `links: false` turns it off.

## 15. Load entrances, judged by paint

- **Gap:** an entrance on a block no pair names, or one a draft runs by script and the copy by CSS, is not compared
  by the declared-motion rows.
- **Detected by:** the `(entrance)` pseudo-pair in the opening state: the page is reloaded and every block in the
  first screen (an element with its own words, or a picture) is sampled every 40ms for `entranceWindow` ms (1600)
  from DOMContentLoaded. A block's entrance is when its pose (effective opacity and the transforms on it and its
  ancestors) first and last changed, timed from that side's own first entrance (a draft that renders by script
  starts everything later than a server-rendered copy). Animated on one side only, or a start or end more than
  `entranceTolerance` ms (150) apart, is a row. A block still changing in the window's last 120ms on either side is a
  loop (a ticker, a marquee, Ken Burns), left out: whether its next turn falls in the window is chance. Loops are
  compared by their declared motion. `entrances: false` turns it off.
- **Reveal sweep:** before a `fullPage: true` shot the page is scrolled top to bottom a screen at a time, so every
  scroll reveal has fired on both sides (`revealSweep: false` turns it off). Reveal timing stays with `scrollIn` pairs.

## 16. Ref tracing and the divergence ledger (Spec 47 FR-47-6 items 6 and 7)

- **Gap:** a row names a pair, not the layout node a tool must change; and an intended difference lived only in a
  config's `accept` list, invisible to the tools that write settings.
- **Ref tracing (`refPrefix: 'cr-ref-'`):** every style, hover and box row carries `ref` (the measured live element's
  nearest ancestor-or-self class with that prefix), `block` (that element's block root class) and `path` (the selector
  path from it: BEM classes, never a per-instance id class such as `sgs-text-aebb51cc`, joined by ` > `;
  `lib/ref-trace.mjs::elementPath`). Text properties take the path of the element that paints the text. With
  `refPrefix` every pair also reads its full CSS: the default list, its own list, and margins, `width`, `max-width`, `flex-direction`, `flex-wrap`,
  `text-wrap` and `gap`. A config without it is unchanged.
- **Divergence ledger (`divergences: '<path>'`):** entries in the site's `divergences.json` (Spec 47 §3.5) match a row
  on node (ref, block slug or `*`), state (`hover` matches hover rows), property and width. A rule entry accepts the
  row; a value entry accepts it only while live shows that value, and otherwise shows the expected value as the row's
  draft side (`10px (D-2)`). Every report row carries an `id` for `scripts/computed-route/ledger.mjs accept`.
- **Planted faults (2026-10-03, footer at 1440, `--inject-live-js` and a planted ledger):**
  - The wordmark's `cr-ref-footer-3` class removed on live: its trace became `cr-ref-footer-2`, path
    `.sgs-container__inner > h4`, where the unplanted run reads `cr-ref-footer-3`, path `""`.
  - A value entry matching live (hours `font-weight` 600) was accepted; one not matching (column `row-gap` 10px)
    stayed open with draft `10px (D-2)`.
  - Unit level: `scripts/computed-route/tests/walker-refs.test.mjs`.
- **Falsified by:** a traced row without `ref`, a path holding an id class, or a ledger entry accepting a row whose
  live value differs from its expected value.

## 10. Text, data and draft bugs

- Word-multiset text comparison (DOM order ignored). Real-data differences (review counts, stock counts,
  pennies) and draft bugs (a filter returning 0) are accepts with Bean's dated decision in the reason.
  Anything "PROPOSED to Bean" is open work until answered.
