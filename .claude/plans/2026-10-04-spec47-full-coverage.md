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

**Done when** (measured before the change, 2026-10-04; About met, and Lenses' pairing met (28 of 29 blocks) on 2026-10-04):
- About: blocks measured 16 of 24 → at least 22 of 24, the page container (cr-ref-about-0) among them, and a Solve
  run writes its top padding (register S6: 104px against the draft's 48px).
- Lenses: 7 of 29 → at least 26 of 29.
- 0 doubtful pairs kept; every rejected one listed with its reason.
- No regression on About or Lenses (Solve's guard, 0 new rows).

**Then:** every paused surface once with its full config (Spec 47 §5 stage 3, residual). F5, the whole-page score, is built in `lib/solve-report.mjs::wholePage`.

## Progress (2026-10-04)

Per-surface work below pauses for `plans/2026-10-04-eye-care-sweep-audit-fix.md` (whole-site sweep, gap audit,
framework fixes); it resumes in that plan's Session D, ranked by the sweep.

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
- [x] **Foundations built on 2026-10-04** (each a general fix with a MUST FAIL test and a tool-log line below): the
  walker measures aspect ratio (CR10), min-height, flex-grow and a control's tag; layout rows compare only between flex
  or grid sides except gaps (a block-flow side's gap reads as 0px); grid tracks compare and write as proportions (CR16);
  calibration records where an inherited setting's value reaches (`reaches`) and each element's tag, and marks minimum
  sizes above the 44px floor; Solve resolves a row on the nearest enclosing block whose setting paints that element (a
  form's field style), matches enclosing slots on tag, and reports a second clashing value for one part of a shared
  setting as a `conflict`; extension settings are seeded in the framework DB (`source='sgs-ext'`, from
  `plugins/sgs-blocks/src/blocks/extensions/extension-roster.json`, gate `check-extension-roster`) and written through
  calibration's discovered effects (`resolve.mjs::tierWrite` for per-device ones); the ledger takes one entry for every
  property or every width (`ledger.mjs accept --rule --every-width --every-property`). Framework: the form's Field style
  group (register N45), label-less fields without the floating-label gap, business-info `labelFontWeight` and the
  address line height, the business-info link's 44px tap area takes one line in the flow.
- [ ] **Contact to 100% (in progress): 19 distinct issues open, 0 labelled gaps** (last Solve
  `qa/solve/contact/2026-10-04T11-15-35/`: 0 new rows, 0 wrong writes). Ledger D-16 (map, register 132 and 141), D-17 to D-30, D-32 and
  D-33 (the phone link's 44px tap area), D-31 (WhatsApp lift, S1). Open, all box rows:
  1. The hours list (cr-ref-contact-16, 18, 19): rows 5 to 6px further apart than the draft. The walker now measures
     it (`f7d9003f5`: a text run's rows give a `row-gap` row from the space between line boxes, and Solve reads the
     draft's); left: a Solve run on Contact to write the hours row gap setting.
  2. The address (cr-ref-contact-13, 15, 17): the draft's address text is 168px wide at every width and wraps to two
     lines at 375; live fills its column. The walker now reads the draft's declared width from its matched rules
     (`f7d9003f5`, `devtools.mjs::declaredValues`) and Solve writes a declared width; left: a Solve run on Contact,
     and if no business-info setting holds the address width, the gap goes to Session B's triage.
  3. Consequences that close with 1 and 2: page and column heights (cr-ref-contact-0, 1, 20) and rows compared across
     the two columns at 1440 (cr-ref-contact-14, 15, 27, 29).
  Then the done line: fresh rebuild of the committed tree, 0 unexplained and 0 labelled gaps, 0 new rows, wrong writes at
  most 10%, `independent-check.mjs --surface contact` 0 differences beyond the ledger, planted-fault control.
- [ ] **Contact form (surface `contact-form`, post 285): 46 distinct issues open.** Paired 6 of 6 with every field
  measured at its control (`liveControl`). The last Solve (`qa/solve/contact-form/2026-10-04T11-24-38/`) closed 27 but
  regressed 4 rows with 7 wrong writes, so the tree was restored from git and rebuilt; two of its causes are now fixed
  (the per-round `conflict` rule, tag matching). Still open before it can run clean: the draft's select is not the
  inputs' 52px height, so `fieldMinHeight` (input and select) moved the textarea 6px; decide the select's own height
  (a `fieldSelectMinHeight`, or the select measured against the inputs) at the framework, then re-run Solve.
- [ ] **Lenses: paired 28 of 29 blocks (cr-ref-lenses-28 left out: its draft element holds another block's words),
  `walkerFull` set.** First Solve (`qa/solve/lenses/2026-10-04T11-32-37/`): 57 to 33 distinct issues, but 3 rows
  regressed (a `gap: 0` write on cr-ref-lenses-22 shrank its parent cr-ref-lenses-21 at 375; the process-steps padding
  and step gap writes moved the next item 16px at 1440) and only one write round ran; the tree was restored from git
  and rebuilt. Also seen: cr-ref-lenses-25's gap setting holds 0 yet its inner band paints a 16px column gap (Hardcode
  class). Diagnose those three, fix generally, re-run.
- [ ] Pair and solve every other surface, in Spec 47 §5 stage 3 Residual's order (Help, Home, header, mobile-menu, the
  four megas, size-guide, lens, shop, product): `node scripts/computed-route/pairs.mjs --client eye-care-ward-end --surface <s>`,
  set its `walkerFull`, then Solve it. Surfaces whose states open a panel (Help's FAQ, the megas, size-guide, lens) are
  paired at rest only today: blocks inside a closed panel paint no words and are listed as left out. CR10's live
  planted-fault proof runs on the first image-heavy surface (Home).
- [ ] **Recalibration of every block with today's calibration changes** (`reaches`, `_tag`, min-height, aspect ratio,
  flex-grow, extension settings): done with all of them for form, accordion-item, accordion, account, audio and
  before-after. Every other block in `scripts/computed-route/cache/` remains, business-info, container, whatsapp-cta,
  card-grid, hero, product-card, gallery, post-grid, image-sequence, brand-strip and breadcrumbs included (their runs
  predate `_tag`): each `node scripts/computed-route/calibrate.mjs --site <its cache file's "site"> --client
  <eye-care-ward-end for eye-care-test, mamas-munches for sandybrown> --blocks sgs/<slug> --recalibrate`,
  `SGS_HEADED=1`. sgs/modal's fixture now carries inner blocks (it failed "changedOnReload"); confirm it calibrates.

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
| 2026-10-04 | A draft's single-line inputs with 0 vertical padding (height from min-height) against live 12px: one shared field padding could not also hold the textarea's 12px, so Solve flip-flopped | `compare.mjs::controlPaddingIrrelevant`: an input or select held at its min-height on both pages shows no vertical-padding row (`collectPair` reports the element's tag) | Any draft with fixed-height form controls |
| 2026-10-04 | One shared setting (a form's field padding) written in turn from two elements with different draft values, so the last write won and the guard reverted the rest | `solve.mjs::writeRound` claims each written part (side, device) of a setting per round; a later group wanting a claimed part at another value is a `conflict` gap, not a write | Any parent setting shared by unlike children |
| 2026-10-05 | Motion timing differences only visible as one transition shorthand row Solve never writes | `collect.mjs::DEFAULT_PROPS` reads transition and animation duration, delay and easing as style rows; `compare.mjs::sameValue` compares each as its set of distinct values, `timingIrrelevant` skips timings that run nothing | Any draft with hover or entrance timings |
| 2026-10-05 | Paint on a `::before`/`::after` layer (rings, overlay grounds) never compared | `collect.mjs::collectPair` reads `PSEUDO_PROPS` on each painting layer; `compare.mjs::comparePair` emits rows with `pseudo`, stamped on `<path>::before` (calibration's key for the layer); Solve reads the draft value on the layer | Any draft painting through pseudo-elements |
| 2026-10-05 | Rows read mid-entrance after a fixed wait | `parity/lib/devtools.mjs::settleAnimations` waits until no finite animation is left (`document.getAnimations()`), from a 300ms floor to a 6s cap | Every walk |
| 2026-10-05 | Hover read only on pairs a hand config flags | `devtools.mjs::forcedHover` forces `:hover` (DevTools protocol) on every other pair and its ancestors, read after its transitions finish | Every ref-traced walk |
| 2026-10-05 | A width the draft declares (168px, 50%) seen only as used pixels, never written | `devtools.mjs::declaredValues` reads the matched rules' declared sizes; `solve.mjs::writeRound` writes a width only as a declared plain length or percentage | Any draft sizing a box by a declared width |
| 2026-10-05 | A list's spacing between rows never compared on a text run | `paint.mjs::textRun` groups its text into rows; `compare.mjs::comparePair` emits `row-gap` from the space between line boxes; Solve reads the draft's | Any draft list measured as a text run |
