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

## 17. Where a pair sits in the page, and transforms that paint nothing (Spec 47 stage 3, F1 and F4)

- **Gap:** box rows compared only a pair's size and its distance to a configured anchor, so a whole page sitting 57px
  low (a page container's 104px top padding against the draft's 48px) produced no row at all; and `transform:
  matrix(1, 0, 0, 1, 0, 0)` (the identity a finished reveal leaves behind) against `none` produced rows that paint nothing.
- **Detected by (ref-traced walks, `refPrefix`):** `lib/compare-state.mjs::flowOffsets`. Pairs with no `anchor`, in draft
  reading order, are measured top to top from the pair before them (`y-after-<pair>`), and the first from the top of the
  outermost `<main>` (`y-in-main`), so a shift is one row where it starts. `lib/compare.mjs::sameValue` treats the identity
  matrix (2D or 3D) as `none`; any other matrix still compares.
- **Proof (2026-10-04):** unit cases in `scripts/computed-route/tests/walker-refs.test.mjs` (a page 57px low is one
  `y-in-main` row; a lift, a half-pixel shift and a scale stay differences). Live lean walks: About's identity rows 56 to 0
  with the WhatsApp scale and the shop button's 3px lift still reported; About's eyebrow `y-in-main` 68 against 124 at 1440
  (28 against 56 at 375), and Contact's form fields 62 against 87 apart at 375. Configs without `refPrefix` are unchanged.

## 18. Read where it paints: layout, hover text, icons, text runs and groups (Spec 47 stage 3, 2026-10-04)

- **Gap:** properties were read off an element that does not paint them, so a matching page showed rows and a
  differing one hid them: a container's gap off its wrapper (the flex band is its inner element), hover colour off a
  link whose label sits in a span, `<main>`'s position after a scroll pass while pair boxes were read before it (a
  shrinking sticky header), a border style on a side 0 wide, `line-height: normal` against a number, an icon's size in
  no row, and blocks whose draft text has no element of its own.
- **Detected by:** `lib/paint.mjs` (self-contained, rebuilt in the page from `PAINT_SRC`): `layoutElement` (the first
  flex or grid element with two or more items down a single-child chain; layout rows carry its path), `textCarrier` and
  `paintedDecoration` (hover colour and underline where the text paints, as at rest), `textRun` (finder
  `{ textRun: { within, direct, match } }`: a block's rendered text, its extent and paint only), `groupBox` (finder
  `{ group: { paths } }`: the union box of elements, no styles). `collect.mjs::collectPair`: `line-height: normal` read
  as the pixels it paints, a flex or grid gap of `normal` as 0px, `icon-width`/`icon-height` from the first painted svg.
  `compare.mjs`: a border side's style and colour are no difference where the side is 0 wide on both pages.
  `paint.mjs::layoutComparable` (used by `compare.mjs::comparePair`, fed by `collectPair`'s `layoutDisplay`): layout
  properties compare only where both sides lay out with flex or grid, grid tracks only where both are grid, flex wrap
  and direction only where both are flex; `display` between two block-level values is no row (a block stack and a
  gapless flex column paint the same; the children's flow rows judge where the children sit). Gaps always compare: a
  side not laying out with flex or grid reads its gap as the 0px it paints (`collectPair`).
  `ratio.mjs::sameTracks`: grid tracks compare as proportions. `compare.mjs`: `min-height` only where the draft sets
  one, a property-less `transition` covers a list with the same timing (`allCovers`). `chrome-walk.mjs::compareChrome`:
  no painted-ground row for text-run or group pairs.
  `compare.mjs::controlPaddingIrrelevant`: a single-line control (input, select) held at its min-height on both pages
  shows no vertical-padding row (its text centres).
  `draft-live-walk.mjs`: `<main>`'s position read with the pair boxes. `compare-state.mjs`: refs stamped after the
  full-check rows (painted ground, text inset), so they reach Solve.
- **Proof (2026-10-04):** unit cases in `scripts/computed-route/tests/walker-refs.test.mjs` (layout element, stamping,
  border style at 0 width, icon rows, layout rows only between flex or grid; each red against the previous code). Live: About's button row gap and wrap, the
  WhatsApp hover colour, the label line height and the page grid's row gap closed on the next Solve; the 768 offset
  row from the draft's shrinking header disappeared.
- **Falsified by:** a gap or alignment row between a block stack and a flex column, a layout row read off an element with fewer than two items, a hover colour read off an element
  that paints no text, or a text-run or group pair reporting a style row.

## 19. Read what DevTools reads: settled animations, forced hover, declared sizes, pseudo layers, timings, row spacing (Spec 47 A-1, 2026-10-05)

- **Gap:** a fixed wait read rows mid-entrance (container `transform` and `opacity` rows); hover was read only on pairs a
  hand config flagged; computed style gives a declared `168px` or `50%` width only as used pixels, so Solve could not
  write it; paint on `::before`/`::after` layers was never compared; motion timings showed only as one shorthand row
  Solve never writes; a text run (an opening-hours list) never compared the spacing between its rows.
- **Detected by:** `lib/devtools.mjs` (ref-traced walks, one DevTools protocol session per page): `settleAnimations`
  waits a floor (a state's `settle`, default 900ms: a reveal class added on load runs no animation to wait on) then until no finite animation on the document timeline is left
  (6s cap; a state that hits it is recorded as `unsettled`); `forcedHover` forces `:hover` on the element and every
  ancestor (`CSS.forcePseudoState`, as a pointer hovers the chain), reads `hoverStyles` once its transitions finish and
  clears it, for every pair not flagged `hover` (`state-passes.mjs::hoverPass`; phones still skip hover and mark each
  measured pair `noHover`);
  `declaredValues` reads `DECLARED_PROPS` from `CSS.getMatchedStylesForNode` (`cascadeWinner`: author rules then inline,
  last wins, `!important` first, user-agent ignored) into `snap.declared`. `collect.mjs`: `DEFAULT_PROPS` reads
  transition and animation duration, delay and easing; `PSEUDO_PROPS` are read on each painting layer (`snap.pseudo`; a layer with content but `display:none`, such as a
  connector a list layout switches off, is not painting, 2026-10-07, `walker-l2.test.mjs`); text compares with straight and
  typographic quotes as one character (WordPress prints curly quotes for a static draft's straight ones).
  `compare.mjs`: timings compare as sets of distinct values and are skipped where nothing runs; animation timings only
  where both sides animate with CSS keyframes (a script-driven entrance leaves no CSS timing), and transition timings
  not where both sides' states were read (a hover end state, or a phone's `noHover`) and neither side's element changes
  in any of them (hover, focus, pressed): a heading carrying the site's hover timing with no hover effect plays no motion
  (`timingIrrelevant`; `walker-reads.test.mjs`, red without it, 2026-10-07);
  layer rows carry `pseudo` and stamp on `<path>::before` (`ref-trace.mjs`), calibration's key for the layer; a layer on
  one side only is one `content` row; `chrome-walk.mjs::compareChrome` keeps a layer's background row.
  `paint.mjs::textRun` groups its text boxes into rows by top; `rows.space` is the median space between rows less the
  line's leading; equal row counts spaced apart by more than the box tolerance give one `row-gap` row.
- **Proof (2026-10-05):** `scripts/computed-route/tests/walker-devtools.test.mjs` runs headless Chromium on local HTML
  (a 1.4s entrance read at opacity 1, an infinite loop ignored; a `.card:hover .title` colour and a finished 3px lift;
  `50%`/`20rem`/`168px`/`!important` declared values; a 14px list gap) and `walker-reads.test.mjs` the comparisons, each
  red against the previous code. A local walk of two `file://` pages read every one as a row in 6s. About measure-only on
  the local mirror (2026-10-05): 1 open issue, real (a button transition beating the site timing, found by the declared
  read); 8 false entrance-timing rows (CSS keyframes against a script-driven entrance) led to the keyframes rule.
- **Falsified by:** a row read while an entrance still runs, a hover row missing on a pair whose CSS hover differs, a
  declared width written where the draft declares none, a layer row on an element whose layers do not paint, or a
  `row-gap` row between lists with the same line-box spacing.

The sections from 20 on are Session C lane L2 (Spec 47 FR-47-6). Every one has a planted fault in
`scripts/computed-route/tests/walker-l2.test.mjs` (headless Chromium on local HTML, never a site), red against the walker at
the commit before the lane and green after (`L2_PARITY_DIR=<copy of scripts/parity at the old commit>` shows it red).

## 20. Two different kinds of element are one `tag` row (Spec 47 FR-47-6, L2.6)

- **Gap:** four combos in Session B compared a draft `<div>` against a live `<img>`, or a `<span>` against an `<h1>`; every
  style, box and hover row between two elements of different kinds is false (`object-fit`, `max-width` and `display` of an
  image against a block).
- **Detected by:** `lib/compare.mjs::comparePair` classes each side's tag (`tagClass`: media img, picture, video, canvas,
  svg, iframe; control input, select, textarea; inline text span, em, strong, b, i, small, abbr, code, label; block
  everything else). Different classes give one row, kind `tag`, key `tag`, values `<div> (block)` and `<img> (media)`, and
  nothing else: `compare-state.mjs::compareState` also leaves out the structure, scroll, flow and full-check rows
  (painted ground, timeline, hover) for that pair. Pairs whose finder is a `textRun` or `group` skip the guard (the recorded
  tag is the wrapper's). Configured pairs and the generated `gen-*` ones both run through `comparePair`; the automatic check
  pairs by words and control type, so it cannot meet this. `tag` rows are not in `issue-classes.mjs::VISUAL`, so they
  replace rows rather than adding to the issue count. A link (`a`, block class) against a `span` (inline text) is a `tag` row.
- **Proof:** `walker-l2.test.mjs`: a real `collectPair` of a `<div>` against an `<img>` gives 1 `tag` row and 0
  `object-fit`/`max-width`/`display` rows; `<span>` against `<h1>` gives 1; a `<div>` against a `<section>` still gives its
  `font-size` row (negative control).
- **Falsified by:** a style, box or hover row on a pair whose two elements are of different classes.

## 21. Rows on blocks the pairing left unmatched are dropped, and listed (Spec 47 FR-47-6, L2.7)

- **Gap:** `qa/pairs/<surface>.json::left` names the blocks the pairing could not pair with a draft element, yet a row on
  one still reached triage (24 of one agent's 58 rows in Session B, and two medium-confidence `woocommerce/product-template`
  rows).
- **Detected by:** `lib/ref-trace.mjs::dropUnmatched` (called from `compare-state.mjs::compareState` after `stampRefs`).
  The walker cannot import from the route, so `loadUnmatched` reads the pairing file: the config's `pairing: '<path>'`
  (relative to the config), else `../pairs/<name>.json` beside it (`<name>` = the config's file name without extension and
  without a trailing `.full`). A ref is dropped only when it is in `left` and in neither `keptPairs[].ref` nor
  `coveredByHand`, and only for the six reasons in `DROP_REASONS` (no draft element holds its words; only N% of its words
  matched; its draft element at N does not hold the same words; the draft element also holds N word(s) that belong outside
  this block; no matched words; no draft control with its name, id, placeholder or label). **Never dropped:** "no painted
  words (an image, an icon or an empty wrapper)" (images and icons were never doubtful pairings) and "its width is Npx on
  the draft against Npx live" (the width difference is the finding). Dropped rows are recorded as
  `run.pairs[name].unmatched = [{ ref, why, count }]` in `report.json` and listed under "Rows dropped for unmatched blocks"
  in `report.md` (`appendUnmatchedReport`), so nothing disappears silently. This is the one L2 item that lowers the sweep totals.
- **Proof:** `walker-l2.test.mjs`: a row stamped `cr-ref-x-5` with `x-5` in `left` for a drop reason disappears and is
  counted; the same row stays when `x-5` is in `keptPairs` or `coveredByHand`, or was left for a width or image reason; an
  unlisted reason is kept; through `compareState` the same four cases hold. Against the Eye Care pairings in the repo, 68 of the
  127 `left` entries are droppable (header 5, help 2, home 11, lens 2, lenses 1, product 12, shop 25, size-guide 10), 48
  "no painted words" and 11 "its width is" entries are kept.
- **Falsified by:** a dropped row whose ref is in `keptPairs` or `coveredByHand`, a dropped row with no entry in
  `unmatched`, or a width or image `left` entry whose rows were dropped.

## 22. 1920 is in every standard run (Spec 47 FR-47-6 item 2, L2.1)

- **Gap:** a hand-run walk used `cfg.widths || [1440, 768, 375]`, so the 1920 layout was read only when `solve.mjs` asked
  for it.
- **Detected by:** `draft-live-walk.mjs`'s default and both usage strings name `[1440, 768, 375, 1920]`;
  `benchmark/score.mjs` has the same fallback (it changes no present behaviour: the benchmark cases pass `--widths`
  explicitly, and `solve.mjs` passes all four itself).
- **Proof:** `walker-l2.test.mjs` reads the three strings.
- **Falsified by:** a walk with no `--widths` and no `cfg.widths` that reads three widths.

## 23. Focus and press feedback of every interactive element (Spec 47 FR-47-6 item 3, L2.2)

- **Gap:** focus rings were read only on pairs a config flagged (a real Tab), hover only through `forcedHover`, and
  `:active` never; an unflagged button with a focus ring or a press effect on one side only was invisible.
- **Detected by:** `collect.mjs::ACTIVE_PROPS` (beside `FOCUS_PROPS`); `devtools.mjs::forcedPseudo( cdp, page, finder,
  RESOLVE, states[], read )` forces `hover`, `active`, `focus` or `focus-visible` on the element (and the matching state on
  each ancestor: hover, active, `:focus-within`) and `forcedHover` is now its `['hover']` case. Configured pairs: 
  `state-passes.mjs::activePass` reads `:active` on every pair of a ref-traced walk (opt out `active: false`) and on pairs
  flagged `active: true` otherwise; `compare.mjs::comparePair` judges it as it judges hover and emits kind `active`
  (`ref-trace.mjs::stampRefs` stamps it). Every interactive element: `auto-collect.mjs::collectAuto` lists links, buttons,
  form controls, summaries and tabs in `interactives` (and `window.__crInter`); `state-passes.mjs::readInteractives` reads the
  first 60 per state at rest, with focus forced (not on a phone) and with `:active` forced; `auto-compare.mjs::compareInteractive`
  pairs them by type and name and emits kind `auto`, keys `focus:<property> "<type name>"` and `active:<property> "<type name>"`
  where the end value moves off rest on at least one side and the two differ (an outline's width, colour and offset are no
  row while either side's outline style is none). Phones keep skipping focus and hover; a touch presses, so `:active` is read there.
- **Proof:** `walker-l2.test.mjs`: `:focus-visible { outline: 3px solid red }` on one side only gives a `focus` row (real Tab)
  and an `focus:outline-style` auto row for the button and the link; `:active { transform: scale(.9) }` gives an `active` row
  and an `active:transform` auto row; identical pages give none; 70 buttons are read 60 at a time; `forcedPseudo` forces
  `:focus-within` on the parent and clears the force. Cost: about 90ms per interactive element, so a state of 60 reads in
  about 6s per side.
- **Falsified by:** a focus ring or press effect that differs on a matched interactive element with no row.

## 24. Link coverage: the same words must sit inside a link on both sides (Spec 47 FR-47-6 item 4, L2.3)

- **Gap:** `links.mjs::compareLinks` drops the draft's `#` links (`realDraftHref`), so a draft link whose live words are
  plain (or the reverse) was never caught.
- **Detected by:** `auto-collect.mjs::collectAuto` sets `lk: true` on each word inside an `a[href]`;
  `auto-compare.mjs::compareAuto` (`compareLinkCoverage`) groups consecutive matched words with the same difference into one
  row, kind `auto`, key `link-missing "<words>"` (a link in the draft, plain on live: draft `link`, live `plain`) or
  `link-extra "<words>"` (the reverse). The walker cannot know whether the block has a link setting, so a row says only that
  one side links the words and the other does not; triage decides the rest. The kind stays `auto` (no new kind): the sweep
  and triage filter on the key prefix.
- **Proof:** `walker-l2.test.mjs`: draft `<a href="#">Shop now</a>` against live `<span>Shop now</span>` gives one
  `link-missing "shop now"` row; both linked and both plain give none; the reverse is one `link-extra` row.
- **Falsified by:** matched words linked on one side only with no `link-missing` or `link-extra` row.

## 25. Line counts during state transitions (Spec 47 FR-47-6 item 5, L2.4)

- **Gap:** no line-count code existed: a header title that wraps to 2 lines for 300ms during a shrink (or a drawer's text
  that reflows as it opens) on one side only painted a different frame and produced no row.
- **Detected by:** `paint.mjs::lineRows( el )` (self-contained, in `PAINT_SRC`): the number of line boxes of the text inside
  an element, text rects grouped by top within 2px as `textRun` groups its rows. `state-passes.mjs::sampleLines` reads it for
  pairs flagged `lines: true` and any flagged `timeline: true` at 30, 120, 250 and 450ms after each action (run concurrently with
  the motion timeline from `draft-live-walk.mjs`'s `onAction`), `settledLines` reads the settled count into
  `snap.lines = { at: { <ms>: n }, settled: n }`, and `compare.mjs::compareLines` (from `comparePair`) emits kind `lines`, keys
  `lines@<t>ms` for a count that differs at that instant and `lines` for the settled count. `lines` rows are stamped with
  the ref like style rows and are not in `VISUAL`. Only actions (click, tap, hover) are sampled, not scrolls.
- **Proof:** `walker-l2.test.mjs`: a title that wraps for 300ms after an action on one side only gives `lines@120ms` (1 against
  3 lines here) and no settled `lines` row; both steady gives none; `lineRows` counts 1, a wrapped title and 0.
- **Falsified by:** a pair whose text wraps to a different number of lines at the same instant of an action with no `lines@` row.

## 26. Entrance motion of a region opened by an action (Spec 47 FR-47-6, L2.5)

- **Gap:** three, not one. (1) The walker sampled entrances only once, at page load, so a drawer or panel that staggers its
  items in after a click was never read; (2) `entrance` is not in `issue-classes.mjs::VISUAL`, so its rows are not counted as
  visual rows (lane L6's decision, untouched here); (3) a row carried no ref, so it could not be mapped to a block.
  A CSS keyframe on one side against none was reported as a row where the region is sampled (the third premise needed no
  separate fix: the sampler reads the painted pose, not the technique).
- **Detected by:** `entrances.mjs::sampleRegion( page, side, cfg, rootSel )` waits up to `cfg.regionWait` (400ms) for the
  region to show, then samples blocks as `sampleEntrances` does for `cfg.regionWindow` (1200ms), counted from the call. A state
  names the region with `region: { draft: '<selector>', live: '<selector>' }`; `draft-live-walk.mjs`'s `onAction` samples it
  as the action fires and `compare-state.mjs::compareState` compares it into the pseudo-pair `(region)`. Live blocks carry
  their `ref`, `block` and `path` (`ref-trace.mjs::traceRef`, ref-traced walks), and `compareEntrances` copies them onto its
  rows, load entrances included. Note the sampler starts after the click returns, so an entrance finished inside that gap is
  missed; `lint.mjs` does not list `(region)` among the pairs an `accept` may name.
- **Proof:** `walker-l2.test.mjs`: items staggered in 80ms steps by script on one side against all fading together on the other
  give an `entrance "charlie"` row carrying `ref: cr-ref-x-3` and `path: ''` and none for the first item; both together gives
  none; a CSS keyframe on one side against none gives a row.
- **Falsified by:** a drawer item that enters later on one side with no `entrance` row, or an `entrance` row of a ref-traced
  walk with no `ref`.

## 27. A drawn line's weight and dash, and where a positioned element sits (Spec 47 FR-47-6, measured-diagram plan (`.claude/plans/archive/2026-10-07-measured-diagram-block.md`) §C)

- **Gap:** a measured diagram's dimension line (an svg stroke) was read for its colour only (`icon-stroke`), so a thicker or
  dashed line on one side produced no row; and `left`/`top` were never read, so a label placed at a different spot on a
  drawing (or a decorative image placed elsewhere) produced no row Solve could write.
- **Detected by:** `collect.mjs::collectPair` reads `icon-stroke-width` and `icon-stroke-dasharray` from the same painted
  shape as `icon-stroke`, and reads `left`/`top` only on an absolutely or fixed positioned element (an in-flow element's
  offset is covered by the flow-position rows of section 17). `devtools.mjs::DECLARED_PROPS` carries `left`/`top`, and
  `computed-route/solve.mjs::USED_VALUES` lists them, so Solve writes an offset only from the draft's declared value (a
  declared `30%` stays `30%`; a computed `180px` would freeze it). Calibration reads `stroke-width`, `stroke-dasharray`,
  `left` and `top` (`calibrate-props.mjs::CAL_EXTRA_PROPS` plus the walker list).
- **Proof:** `computed-route/tests/walker-diagram-reads.test.mjs`: a 1.4px against a 3px dashed line gives
  `icon-stroke-width` and `icon-stroke-dasharray` rows; a label at 30% against 40% gives a `left` row; an in-flow element
  reads no offset; Solve's target is the declared `30%`, and with nothing declared it is a `used-value` gap. Planted fault:
  removing the `icon-stroke-width` read turns the line test red.
- **Falsified by:** a pair whose svg stroke weight or dash differs, or whose positioned box sits at another declared
  offset, with no row.
