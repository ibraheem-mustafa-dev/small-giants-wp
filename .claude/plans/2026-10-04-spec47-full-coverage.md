---
doc_type: plan
title: "Spec 47 F2: every block measured, paired by matched words"
spec: .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md
created: 2026-10-04
status: in progress
---

# F2: every block measured, paired by matched words

**Why (council, 2026-10-04).** Solve only sees the elements a hand-written walker config names: About 16 of 24 blocks,
Lenses 7 of 29, Help 15 of 41, Contact 21 of 33, Home 49 of 79. The page container behind every page's 57px top
offset (register S6) was in no config. Spec 47 §3.4 generates a full config for Fill only; Solve never got one. An
AI-written draft locator per block was rejected by the council (rater A): repeated text silently picks the wrong
element and Solve has no gate against a doubtful pair.

**Approach.** Pair blocks through the walker's own word matcher (`scripts/parity/lib/auto-compare.mjs::matchWords`,
benchmarked 5 of 5), which already pairs every painted word on the draft with its twin on live.
1. A discovery run opens the draft and live at 1440 (the config's own `draft.url`, `draft.open`, `live.url`), collects
   every painted word with the element that paints it, and pairs the words with `matchWords`.
2. Live words are grouped by their block (nearest `cr-ref-<surface>-<n>` ancestor).
3. A block's draft partner is the smallest draft element containing all the draft twins of its words; a word whose
   text repeats on the draft takes the occurrence nearest the block's unrepeated words (or its parent's, or its
   children's, partner). An unpadded draft element of a padded block climbs to its tight padded wrapper. A block whose
   draft text has no element of its own (a value beside its label, an inline span against a block) pairs as a text
   run; a form control pairs by name, id, placeholder, label or first option; a block whose draft element is shared
   with other blocks' words pairs as the group of its children's partners (box only).
4. Each pairing is checked before it is kept; a doubtful one is reported and left out, never written through:
   - the partner holds at least 80% of the block's matched words;
   - it holds no matched word that belongs to a block outside this one (otherwise it is too big);
   - its box is within half to double the block's box at 1440.
5. The kept pairs are appended to the hand config as `gen-<ref>` pairs (live finder `.cr-ref-…`, draft finder an
   element path from `<main>`), skipping blocks a hand pair already measures. Output:
   `sites/<client>/build/qa/parity/<surface>.full.mjs`, which imports the hand config (states, draft navigation,
   exclusions, divergences) and adds the pairs. `surfaces.json` gains `"walkerFull"`, which Solve walks when present.
6. The draft finder is checked at 375, 768 and 1440 (it must resolve to an element holding the same words).

**Files:** `scripts/computed-route/pairs.mjs` (command), `lib/pairs.mjs` (grouping, partner choice, checks, config
text), `lib/pairs-page.mjs` (in-page collectors), `scripts/parity/lib/auto-compare.mjs` (export `matchWords`),
`scripts/parity/lib/paint.mjs` (`textRun`, `groupBox` finders), `scripts/computed-route/solve.mjs` (`walkerFull`),
tests, README.

**Done when** (measured before the change, 2026-10-04; About met on 2026-10-04, Lenses not yet re-run):
- About: blocks measured 16 of 24 → at least 22 of 24, the page container (cr-ref-about-0) among them, and a Solve
  run writes its top padding (register S6: 104px against the draft's 48px).
- Lenses: 7 of 29 → at least 26 of 29.
- 0 doubtful pairs kept; every rejected one listed with its reason.
- No regression on About or Lenses (Solve's guard, 0 new rows).

**Then:** every paused surface once with its full config (Spec 47 §5 stage 3, residual). F5, the whole-page score, is built in `lib/solve-report.mjs::wholePage`.

## Progress (2026-10-04)

- [x] Pairing built: `scripts/computed-route/pairs.mjs` (command), `lib/pairs.mjs` (decisions: `PAIRING_LIMITS`,
  `judgePairing`, `paddedPartner`, `twinPlan`, `choosePartner`, `chooseControlPartner`, `chooseGroupPartner`,
  `commonPath`, `reconcileHandPairs`, `configText`), `lib/pairs-page.mjs` (in-page collectors). The generated config is
  `qa/parity/<surface>.full.mjs`; a surface's `walkerFull` in `surfaces.json` makes Solve walk it. Walker finders added
  for pairs a block-to-element match cannot express: `{ textRun }` (a block's rendered text) and `{ group }` (the union
  box of a block's children's partners), both in `scripts/parity/lib/paint.mjs`. Tests: `tests/pairs.test.mjs`.
- [x] Guard CR21 (`lib/guard.mjs::guardRound`): with no write on a regressed row's node, suspects are tried tier by
  tier: writes inside the node or its anchor pair, then each ancestor's writes, nearest first. On Contact it reverted
  four wrong padding writes on its own.
- [x] **About at 100% (2026-10-04).** Judged on a fresh rebuild of the committed tree: Whole page 0 unexplained, 0
  labelled gaps, 0 new rows, 0 wrong writes; 12 ledger entries, all citing register 104 / S1 / S4 (Shop the range and
  WhatsApp hover lifts). Independent check (`sites/eye-care-ward-end/build/qa/independent-check.mjs`): 0 differences
  over 24 blocks at 375/768/1440. Negative control: a planted 22px top padding on the page container was caught by
  both (Solve wrote it back; the check reported the inset and every block below at 1440 only), then restored.
  Distinct issues over the pilot: 50, 28, 19, 9, 6, 2, 0.
- [ ] **Contact to 100% (in progress).** Paired: Contact 31 of 32 blocks (`qa/pairs/contact.json`; the map,
  `cr-ref-contact-25`, is left out: register 418, the real Google Map replaces the draft's sketch), the contact form
  (post 285, surface `contact-form`) 6 of 6 (the form block as its fields' group). Both walk only the rest state
  (`walkStates: ["opening"]`; the hand config's form-flow states belong to FR-47-7). Solve so far: page container
  padding 48/90, phone 28/60 (S6), page grid gap 48px, WhatsApp icon 21px; 0 wrong writes since the padded-wrapper
  climb, 0 new rows. Open on the last run (`qa/solve/contact/2026-10-04T05-50-07/`): **134 distinct issues**, grouped:
  1. Layout mechanism, not paint (about 45 rows): the draft stacks label and value as blocks; live uses flex column
     with a 6px gap (`gap`, `row-gap`, `column-gap`, `flex-direction`, `display` rows on cr-ref-contact-7, 10, 13, 16
     and 1). General walker fix to build: compare layout properties only when both sides' layout element is flex or
     grid; the children's positions (flow rows) judge the rest. Same for `display` between block-level values.
  2. The phone link's tap area (12 rows on cr-ref-contact-9 `.sgs-business-info__link`): live pads the link and
     cancels it with negative margins (the 44px touch-target rule in CLAUDE.md non-negotiables); the text paints in
     the same place. Ledger, citing that rule.
  3. Decided divergences: the map (20 rows, register 418); WhatsApp hover lift 3px against the draft's 2px (S1).
  4. Settings Solve should reach: the page grid's columns (`grid-template-columns`, draft 496.562px 451.438px, live
     521.391px 426.609px at 1440: the tree's `1.1fr 1fr` against the draft), the phone label's hover colour (draft
     rgb(111,97,82)), the WhatsApp button height (56 vs 44), the hours day weight (400 vs 600), the address label
     line height (22.5px vs 24px), the Google and Instagram cards' ground (white) and widths.
  5. Width rows (`width` is a used value, about 25): consequences of 4; they close with it.
  Contact form (rest state, own blocks only): **101 distinct issues, 80 labelled framework gaps** (form field styling
  settings: register N45 / N45b).
- [ ] Lenses: re-pair with today's pairing, set its `walkerFull` again, Solve it.
- [ ] Pair and solve every other surface, in Spec 47 §5 stage 3 Residual's order (Help, Home, header, mobile-menu, the
  four megas, size-guide, lens, shop, product): `node scripts/computed-route/pairs.mjs --client eye-care-ward-end --surface <s>`,
  set its `walkerFull`, then Solve it. Surfaces whose states open a panel (Help's FAQ, the megas, size-guide, lens) are
  paired at rest only today: blocks inside a closed panel paint no words and are listed as left out.
- [ ] Recalibration (CR11 border styles, CR3, CR17, modal): 28 of 66 blocks done on 2026-10-04 with the parallel
  reader. Redo (measured headed before scrollbars were hidden, so about 15px narrow): accordion-item, account, audio,
  before-after, brand-strip, breadcrumbs. Still to run: heading, business-info, nav-bar-menu, nav-drawer,
  nav-drawer-menu, notice-banner, option-picker, physics-canvas, post-grid, pricing-table, process-steps,
  product-card, product-faq, product-faq-item, product-search, quote, responsive-logo, separator, site-footer,
  site-footer-row, site-header, site-header-row, social-icons, star-rating, store-selector, tab, table-of-contents,
  tabs, team-member, testimonial, testimonial-slider, text, timeline, trust-bar, trustpilot-reviews, whatsapp-cta (each
  `node scripts/computed-route/calibrate.mjs --site <its cache file's "site"> --client <eye-care-ward-end or
  mamas-munches> --blocks sgs/<slug> --recalibrate`, `SGS_HEADED=1` while the host challenges headless browsers).
  sgs/modal fails: without `modalRef` the editor rewrites the block on first load ("changedOnReload"), so the
  calibration page will not save; its fixture needs a modal it can render without a linked post.

## Universal tool log

One line per route fix: issue class → general fix → which drafts it now covers.

| Date | Issue class | General fix | Drafts covered |
|---|---|---|---|
| 2026-10-04 | A block's padding sits on a draft ancestor of the element holding its words | `lib/pairs.mjs::paddedPartner` climbs to the nearest padded wrapper; `judgePairing` leaves out an unpadded partner of a padded block | Any draft that pads an outer wrapper (page shells, section wrappers) |
| 2026-10-04 | A regression caused by a write on a row's ancestor (a parent's padding resizes every child) | `lib/guard.mjs::guardRound` tries ancestor writes, nearest first, when the row's node and its inside hold none | Every surface Solve runs |
| 2026-10-04 | Layout properties (gap, wrap, direction, grid columns, alignment) read off a wrapper whose inner band holds the layout | `scripts/parity/lib/collect.mjs::layoutElement`: read them from the element laying out the children, the same rule on both sides; rows stamped with that element's path (`ref-trace.mjs::stampRefs`) | Any framework that wraps a layout in an inner band (SGS containers, most page builders) |
| 2026-10-04 | Hover text colour and underline read off a link root whose label sits in a span | `collect.mjs::hoverStyles` reads colour and underline where the text is painted (`textCarrier`, `paintedDecoration`), as rest-state rows already did | Any button or link with a label element |
| 2026-10-04 | A page's `<main>` read after the scroll pass while pair boxes are read before it (a sticky header that shrinks moves `<main>`) | `draft-live-walk.mjs`: `mainY` read at the same scroll as the pair boxes | Any draft with a shrinking sticky header |
| 2026-10-04 | A border side's style compared where the side is 0 wide | `compare.mjs::borderColourIrrelevant` skips style and colour on a side 0 wide on both pages | Any single-side border (accent bars) |
| 2026-10-04 | A hand pair measuring a paired block's draft element on an element inside the block | `lib/pairs.mjs::reconcileHandPairs` moves it to the block root and drops the duplicate generated pair | Every surface with a hand config |
| 2026-10-04 | A draft's `line-height: normal` against a live number (no setting holds the keyword) | `collect.mjs::collectPair` measures `normal` as the pixels it paints (a one-line probe in the text's font), so a numeric setting can match it | Any draft that leaves line height at the browser default |
| 2026-10-04 | An icon's size no row measured (CR14 for icons) | `collect.mjs::collectPair` reads the first painted svg's `icon-width`/`icon-height`, stamped with the svg's path; `solve.mjs::cssProp` writes them as its width/height | Any block with an icon size setting |
| 2026-10-04 | A layout wrapper that is itself flex but holds one inner band | `paint.mjs::layoutElement` stops at the first flex or grid element with two or more items, down single-child chains | Any nested layout band |
| 2026-10-04 | Full-check rows (painted ground, text inset) carried no block ref, so Solve could not write them | `compare-state.mjs` stamps refs after the full-check rows; `lib/solve-rows.mjs::cssProp` writes a painted ground as background colour | Every surface |
| 2026-10-04 | A draft entrance that plays on page load against a live one waiting for a scroll (framework had no load start) | Framework: `sgsAnimationStart: 'load'` (Spec 38). Route: `lib/entrance.mjs::entranceStart` writes it when the draft shows a block at rest that live still hides | Any draft with time-based entrances |
| 2026-10-04 | A draft word that occurs more than once taken where the matcher put it (a card label matched to a map note) | `lib/pairs.mjs::twinPlan` + `pairs-page.mjs::draftChains`: repeated words take the occurrence nearest the block's sure words, else its parent's partner, else its children's partners' common ancestor (`commonPath`) | Any draft that repeats words (addresses, labels, link names) |
| 2026-10-04 | A block whose draft text has no element of its own (a value beside its label) or an inline span against a block | `lib/pairs.mjs::choosePartner` pairs it as a text run; the walker's `{ textRun }` finder (`paint.mjs::textRun`) measures the text's extent and paint on both sides | Any mock draft with bare text values |
| 2026-10-04 | Form controls paint no words, and a mock draft's controls carry placeholders only | `pairs-page.mjs::formControls` + `lib/pairs.mjs::chooseControlPartner`: pair by name, id, placeholder, label, first option, or the only control of its kind; hidden controls never count | Any draft with a form |
| 2026-10-04 | An embedded post's blocks counted as the page's (`cr-ref-contact-form-n` under the `cr-ref-contact-` prefix) | `liveBlocks` counts only `<prefix><n>` refs | Any page embedding a linked post |
| 2026-10-04 | An unpadded draft element paired with a padded block when content boxes differ | `lib/pairs.mjs::paddedPartner` climbs to the tight padded wrapper whenever the draft element holds no padding and the block does | Every page container |
| 2026-10-04 | A block whose draft has no element of its own (a form whose fields sit beside a heading in one card) | `lib/pairs.mjs::chooseGroupPartner`: the group of its children's partners, compared by union box; the walker's `{ group }` finder (`paint.mjs::groupBox`) | Any mock draft that flattens wrappers |
| 2026-10-04 | A flex or grid gap of `normal` against a pixel gap ("normal cannot be held") | `collect.mjs::collectPair` reads it as the 0px it paints | Any draft leaving gaps unset |
| 2026-10-04 | A surface sharing its walker judged on its neighbour's blocks (the embedded form post counted the whole contact page) | `lib/solve-report.mjs::wholePage` counts only the surface's own refs and rows with no block | Any page embedding a linked post |
| 2026-10-04 | A decided replacement (a real embed for a draft sketch) or a house rule spanning many rows needed one ledger entry per row, property and width | `lib/ledger.mjs::entryFromRow` (`ledger.mjs accept --rule <name> --every-width --every-property`): an entry names property `*` and/or no widths; `ledger.mjs::match` and `parity/lib/divergences.mjs::divergenceFor` honour `*` | Any draft with placeholder embeds or touch-target paddings |
| 2026-10-04 | Aspect-ratio settings never measured (CR10) | `collect.mjs::DEFAULT_PROPS` reads `aspect-ratio`; `parity/lib/ratio.mjs::sameRatio` compares ratios by value (0.5%); `normalise.mjs::ratioSetting` writes the enum value or `w / h` | Any draft with fixed-ratio media (cards, galleries, heroes) |
| 2026-10-04 | A draft block stack against a live flex column reported gap, direction, alignment and display rows that paint nothing | `paint.mjs::layoutComparable` (fed by `collectPair`'s `layoutDisplay`): layout properties compare only where both sides lay out with flex or grid (each model's own properties only where both share it), except gaps, which a block-flow side reads as the 0px it paints (a live flex gap the draft lacks stays a writable row); `display` between block-level values is no row; flow rows judge the children | Any draft that stacks blocks where the framework uses a flex or grid band |
| 2026-10-04 | Grid tracks compared and written in pixels (CR16): a container's width shifted every track, and Solve could not hold measured px in an fr setting | `parity/lib/ratio.mjs::trackRatios`/`sameTracks`: tracks compare as proportions; `normalise.mjs::tracksSetting` writes them as fr floored at 0 (`496.562px 451.438px` → `minmax(0, 1.1fr) minmax(0, 1fr)`) | Any draft with a column grid |
| 2026-10-04 | An inherited value (hover colour) measured on a descendant (a link's label) found no setting, because calibration kept only the shallowest element | `lib/calibrate.mjs::slotFor` records `reaches` (every element the marker's value reached; a child holding its own rule never does); `resolve.mjs::resolve` ties through `reaches` when no setting paints the slot itself | Any block whose colour or type setting paints a wrapper over labelled links |
| 2026-10-04 | A draft's min-height (a 56px button) never measured | `collect.mjs::DEFAULT_PROPS` reads `min-height`; `compare.mjs::partIrrelevant` keeps it only where the draft sets one (a live 44px touch target the draft lacks is judged by the box rows) | Any draft with fixed-height controls |
| 2026-10-04 | A live `transition: all` against a draft's property list with the same timing | `compare.mjs::allCovers` | Any framework whose buttons transition every property |
| 2026-10-04 | A text run or group reported its container's painted ground (the text sits directly in a white card on the draft) | `chrome-walk.mjs::compareChrome` passes `withGround` false to `chrome-compare.mjs::compareExtras` for text-run and group pairs; the card's own pair judges its ground | Any mock draft with bare text in coloured cards |
| 2026-10-04 | A row on a child block whose setting lives on its parent (a form's field style on each field's control) | `ref-trace.mjs::traceRef` records every enclosing ref with its own paths (`owners`, stamped by `stampRefs`); `solve.mjs::writeRound` resolves on the nearest enclosing block whose calibration paints that element (paths compared without `:nth-of-type`, `resolve.mjs` `anyIndex`) | Any block whose parent styles its children (forms, card grids, tabs) |
| 2026-10-04 | A form control paired with the draft control but measured on the live field's wrapper (label space, no border) | `pairs.mjs` marks `liveControl` when the draft partner is the control itself; `lib/pairs.mjs::configText` then measures the block's own control, and `reconcileHandPairs` moves a hand pair on that block to the control too | Any draft with a form |
| 2026-10-04 | Extension settings (child sizing, entrance start, hover lift) invisible to the route, so each needed a hand-written writer | Framework DB seeds every opted-in extension setting as `source='sgs-ext'` (with the extension roster); route: `lib/db.mjs` reads `sgs` and `sgs-ext`, `resolve.mjs::resolve` takes an extension setting's type, default and enum from its row, calibration discovers a per-device enum through its desktop tier and `resolve.mjs::tierWrite` writes the value fitting each tier | Every block using an SGS extension |
| 2026-10-04 | An enclosing block's setting matched without `:nth-of-type` steps conflated an input with a textarea (same BEM class) | Calibration records each element's tag (`_tag`); the trace stamps each owner path's tag; `resolve.mjs` matches an enclosing block's slot only where the tags agree | Any parent styling children that share a class |
| 2026-10-04 | A minimum size calibrated dead: its markers (37/23/7px) sat under the render's 44px floor | `lib/calibrate.mjs::markersFor` marks `min-height`/`min-width` above it (137/123/107px) | Every block with a floored size setting |
