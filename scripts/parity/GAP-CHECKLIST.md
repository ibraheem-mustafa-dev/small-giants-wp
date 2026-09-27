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
- **Falsified by:** a `structure` or `y-from-*` row, or a control with no neighbouring pairs to anchor it.

## 5. Hidden-by-scroll and scroll-in content

- **Gap:** content that fades or slides in as it scrolls into view (the draft's card fade) is invisible to
  an at-rest snapshot, and a full-page screenshot reveals it on one side only.
- **Detected by:** `scrollIn: true` on a pair: its opacity/transform/translate/scale/filter are read before
  anything scrolls, the animations started ~60ms after it is scrolled to, and the values once settled
  (`scrollWait`, default 1500ms). Differences are `scroll` rows (`pre:opacity`, `running-on-reveal`, ...).
- **Config pattern:** mark one below-the-fold item of each repeated kind (a card in the second row, a
  section heading) `scrollIn: true`; put `fullPage: true` on the opening state so the review sees it all.

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

## 10. Text, data and draft bugs

- Word-multiset text comparison (DOM order ignored). Real-data differences (review counts, stock counts,
  pennies) and draft bugs (a filter returning 0) are accepts with Bean's dated decision in the reason.
  Anything "PROPOSED to Bean" is open work until answered.
