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
3. A block's draft partner is the smallest draft element containing all the draft twins of its words. A block with no
   words of its own (a wrapper) takes the smallest draft element containing its children's partners.
4. Each pairing is checked before it is kept; a doubtful one is reported and left out, never written through:
   - the partner holds at least 80% of the block's matched words;
   - it holds no matched word that belongs to a block outside this one (otherwise it is too big);
   - its box is within half to double the block's box at 1440.
5. The kept pairs are appended to the hand config as `gen-<ref>` pairs (live finder `.cr-ref-…`, draft finder an
   element path from `<main>`), skipping blocks a hand pair already measures. Output:
   `sites/<client>/build/qa/parity/<walker>.full.mjs`, which imports the hand config (states, draft navigation,
   exclusions, divergences) and adds the pairs. `surfaces.json` gains `"walkerFull"`, which Solve walks when present.
6. The draft finder is checked at 375, 768 and 1440 (it must resolve to an element holding the same words).

**Files:** `scripts/computed-route/pairs.mjs` (command) and `lib/pairs.mjs` (grouping, partner, checks, config text),
`scripts/parity/lib/auto-compare.mjs` (export `matchWords`), `scripts/computed-route/solve.mjs` (`walkerFull`), tests,
README.

**Done when** (measured before the change, 2026-10-04):
- About: blocks measured 16 of 24 → at least 22 of 24, the page container (cr-ref-about-0) among them, and a Solve
  run writes its top padding (register S6: 104px against the draft's 48px).
- Lenses: 7 of 29 → at least 26 of 29.
- 0 doubtful pairs kept; every rejected one listed with its reason.
- No regression on About or Lenses (Solve's guard, 0 new rows).

**Then:** every paused surface once with its full config (Spec 47 §5 stage 3, residual). F5, the whole-page score, is built in `lib/solve-report.mjs::wholePage`.

## Progress (2026-10-04)

- [x] Steps 1-6 built: `scripts/computed-route/pairs.mjs`, `lib/pairs.mjs` (`PAIRING_LIMITS`, `judgePairing`),
  `auto-collect.mjs` `tagEls`, `auto-compare.mjs` exports `matchWords`, `solve.mjs` walks `walkerFull`. Tests:
  `scripts/computed-route/tests/pairs.test.mjs` (a partner holding another block's words is left out).
- [x] About paired 24 of 24 (before 16), page container `cr-ref-about-0` included; Lenses 29 of 29 (before 7). Every
  pairing at 100% of its words; every finder held its words at 375 and 768. Reports: `sites/eye-care-ward-end/build/qa/pairs/`.
- [ ] **Proof by Solve failed (About, 2026-10-04, run `qa/solve/about/2026-10-04T00-35-46/`).** It wrote the page
  container's padding (S6), but to 0 on every side: the pairing matched cr-ref-about-0 to a draft element of the same
  size whose padding sits on its parent, so Solve read the draft's padding as 0. Content went full width at 375 (335px to
  375px wide); whole page 63 issues before, 108 after (61 new). The guard did not revert it (CR21 below). About's tree was
  restored from git and rebuilt; `walkerFull` was removed from about and lenses until the two fixes below land.
- [x] Pairing for padded containers (`lib/pairs.mjs::paddedPartner`, `PAIRING_LIMITS.boxTolerance`): a partner that
  holds no padding where the block does, with matching content boxes, climbs to the nearest draft ancestor wrapping it
  with padding of its own; with none, `judgePairing` leaves it out. Border boxes are not required to match: About's
  draft `<main>` is 1100x672 (padding 48px 52px 90px) against live 1100x742 (104px 52px), a real difference Solve must
  close. Re-pair: About 24 of 24, `cr-ref-about-0` paired to the draft `<main>`. Tests: `tests/pairs.test.mjs`
  (MUST FAIL TO KEEP: an unpadded partner of a padded block).
- [x] Guard CR21 (`lib/guard.mjs::guardRound`): with no write on a regressed row's node, suspects are tried tier by
  tier: writes inside the node or its anchor pair, then each ancestor's writes, nearest first. Tests:
  `tests/solve.test.mjs` (MUST FAIL TO MISS: a row on a node with no writes tries the nearest ancestor's write;
  proven red against the previous guard).
- [ ] Re-run the proof: About, then Lenses, with `walkerFull` set again: 0 regressions, wrong writes at most 10%, S6's
  top padding written as the draft's 48px and the side padding kept.
- [ ] Pair and solve every other surface: `node scripts/computed-route/pairs.mjs --client eye-care-ward-end --surface <s>`,
  set its `walkerFull`, then Solve it. Surfaces whose states open a panel (Help's FAQ, the megas, size-guide, lens) are
  paired at rest only today: blocks inside a closed panel paint no words and are listed as left out.

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
