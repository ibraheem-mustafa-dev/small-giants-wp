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

## Progress (2026-10-05)

Per-surface work below pauses for `plans/archive/2026-10-04-eye-care-sweep-audit-fix.md` (whole-site sweep, gap audit,
framework fixes); it resumes in that plan's Session D, ranked by the sweep.

## Session D: what it owns

- **Ranking rule.** Walker gaps holding the most open rows across surfaces go first, then each surface to 100% with
  Solve under the existing done line (below, per surface). **Bean, 2026-10-07: Solve writes first, surface by surface**,
  fixing a walker gap when it blocks the surface in hand. Why: the largest walker class, `used-value` width (132 rows on 15
  surfaces), is mostly double counting (82 have an open box `w` row on the same node already triaged a consequence), so
  relabelling it closes nothing, while Solve's writable rows (`T resolver-writes`, 435) close their ~750 knock-ons with them.
  Walker gap 2 (transition timings, 51 rows) is fixed (`0070c8d4a`); its rows fall on each surface's next walk.
- **Register items owed as tree values:**
  - 131 / S3: before Contact's next Solve run, ledger `textColourHover` `text` on cr-ref-contact-9 against the draft's taupe
    (none exists; Solve would otherwise write the taupe back). The visible hover cue waits for S2's underline sweep.
  - The mobile drawer's links (mobile-menu surface): the draft fades and rises each link in when the drawer opens, live
    shows them at once; 14 rows open (2026-10-05 sweep), but the walker does not sample the rise, so they cannot be judged.
    Taken with the mobile-menu surface's Solve pass: first make the walker sample an entrance inside the `drawer-open` state.
- **Coverage still owed:**
  - Register rows 150, 152 and 155 need `surfaces.json` entries for checkout, bag and confirmation: each has a
    walker config but no tree and no target yet.
  - The footer's size-guide modal: the `modal-open` state, its scoped pair and the `surfaces.json` state map, all
    three together.
  - Product's 2 lost pairs.
- **Carried from Session C (found open by the 2026-10-07 completion check; each needs a decision or a proof):**
  - [x] The calibration rows with `css_state` NULL (`DB_STATE_MISSING_HOVER`, `STATE_FOCUS_UNROUTED`), judged 2026-10-07
    against the framework DB (`block_attributes` rows with a CSS property, no state, and Hover/Focus/Active/Current in the
    name: 29). 14 are right as they are (`bgHoverZoomDuration`/`Easing`: a transition is declared on the resting element).
    6 are focus rings (filter-search, product-search, 4 on form): the route has no `focus` state (the DB holds hover,
    current, open, scrolled, shrunk) because the walker measures no focus state, so they stay NULL until it does. 5 are
    hover-only settings with no resting twin (business-info attribution x2, responsive-logo `opacityHover`, post-grid
    `textColourHoverGradient`, google-reviews `buttonHoverLift`), deliberately undeclared
    (`plugins/sgs-blocks/scripts/check-hover-state-classification.py`, FR-35-5's state-without-base baseline). 4 could be
    declared `current` in their block.json (account `menuActive*` x3, language-switch `currentColour`); no open Eye Care row
    needs them. No open Eye Care triage row is blocked by any of the 29: the business-info hover rows on contact and footer
    are `ambiguous` (`textColourHover` and `labelColourHover` both paint the label inside the link), a different gap.
  - Dead calibration rows, re-classified 2026-10-07 on today's caches (`.claude/reports/2026-10-07-dead-calibration-rerun/SUMMARY.md`,
    the 2026-10-04 pipeline re-run unchanged, with its `classify3` split): 546 dead; FIXTURE_LACKS_ELEMENT 210, **UNEXPLAINED 106**,
    PORTAL_OR_CLOSED_SURFACE 55, READ_CAP_81 53, HOVER_POINTER_MISSES_ELEMENT 38, the rest under 14 each. Still open: the 106,
    to be diagnosed per mechanism, largest groups first (by property: background-image 19, grid-template-columns 10, text-indent
    9; by block: nav-bar-menu 10, nav-drawer-menu 9, hero 7, cta-section 6), plus the `oneWidth` probe list (23 today).
    The nav groups wait for the nav-bar-menu recalibration another session was running on 2026-10-08 (it rewrites their caches).
    **hero and cta-section diagnosed 2026-10-08 (13 rows, code and cache reading, not yet proven by a render):**
    - Block code, 4 rows. `hero/style.css::section.sgs-hero{max-width:none}` out-ranks the wrapper's scoped `max-width`
      (`maxWidth`). `cta-section/style.css::.sgs-cta-section` reads the button-preset `hover-transition` token before
      `--sgs-transition-duration`, and Eye Care's snapshot sets that token to 0.25s, so `transitionDuration` never wins.
      `cta-section/render.php` nulls `backgroundImage` for the wrapper, so its tier images (`backgroundImageTablet/Mobile`)
      have no `::before` layer to paint on.
    - Calibration preconditions and markers, 8 rows (`lib/calibrate-instances.mjs::preconditionsFor`,
      `lib/calibrate-markers.mjs::markersFor`). hero's tier images need a base `backgroundImage`. `textIndent` (hero and cta)
      paints only between two adjacent text blocks, which no fixture has. hero's `bgSvgOpacity` needs `bgSvgContent` and an
      integer marker (`absint` turns 0.37 into 0). `bgZoomStart` needs `bgKenBurnsMode: zoom-out-once` and a marker in
      100-150. `gridTemplateColumns` needs `variant: split` and a track-list marker. cta's `backgroundImage` is the legacy
      twin of `backgroundMedia`, which the fixture always sets.
    - Unresolved, 1 row: cta `textColour`; the next step is rendering one instance with a hex colour and reading its `color`.
  - `mega-group`'s discovery data is empty (`cache/mega-group.json::discovered.sgsChildSizing` is `{}`), though
    Spec 47 L1.3 resolves child sizing through discovery. **It costs rows:** 9 `flex-grow` rows on the mega surfaces are
    triaged F `no-setting` only because of it. Ruled out 2026-10-07: the render (a server `do_blocks` of mega-group with
    `sgsChildSizing:{desktop:fill}` emits the `sgs-child-sizing` scope classes), the editor registration
    (`extensions/child-sizing.js` adds the attributes to every block opting in), the comparison
    (`lib/calibrate.mjs::discoverEffects` found flex-grow and flex-basis on container, text and seven others) and a panel
    rule overriding the flex (none). **Cause found 2026-10-07:** the recalibration on
    local-eye-care measured a nav-bar-menu root because another session's sgs/nav-bar-menu calibration ran on the same
    mirror at the same time; both build onto the site's one calibration page with the same `cr-ref-cal-<n>` classes
    (overlap confirmed by that session). Guard built (`5bebb2b6d`): `lib/calibration-lock.mjs`, a per-site lock that makes
    a second calibration refuse to start. The contaminated cache was replaced by the 2026-10-05 one. **Next:** once the local-eye-care
    calibration lock is free (another session's nav-bar-menu re-measure held it on 2026-10-08, about 50 minutes a run), re-run
    `calibrate.mjs --site local-eye-care --blocks sgs/mega-group --recalibrate` alone and confirm `discovered.sgsChildSizing`
    records `flex-grow` on the root; the 2026-10-05 run may itself have been crossed (its discovery is empty), which the
    clean run will show.

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
- [ ] **Contact to 100% (Session D of `plans/archive/2026-10-04-eye-care-sweep-audit-fix.md`): 67 distinct issues open on the 2026-10-07 sweep (19 on 2026-10-04, before the walker's DevTools reads), 0 labelled gaps** (last Solve
  `qa/solve/contact/2026-10-04T11-15-35/`: 0 new rows, 0 wrong writes). Ledger D-16 (map, register 132 and 141), D-17 to D-30, D-32 and
  D-33 (the phone link's 44px tap area), D-31 (WhatsApp lift, S1). **Solve 2026-10-08 (`qa/solve/contact/2026-10-08T02-29-56/`,
  3 write rounds): distinct issues 66 to 60, 0 new, 17 writes, 1 wrong (6%: cr-ref-contact-22's mobile bottom margin,
  reverted, proven by undoing it alone).** Kept: the labels' hover colour stays their resting `text-label` (-15, -18, -19;
  live turned them black on hover, the draft does not), the bordered cards' hover border `primary` (-27, -30), and the
  footnote's typography (-25). Removed by hand: hover border colours on four borderless nodes (-9, -15, -18, -19), which
  paint nothing, ledgered D-88 to D-91 (the D-65 ruling); D-87 holds the phone link's hover colour (register 131). Solve
  had written -25's font as the literal stack `Outfit, sans-serif`; it now snaps a font stack to the theme preset whose
  first family matches (`normalise.mjs::snapFontFamily`), and the 20 literal stacks across six Eye Care trees are now
  preset slugs (paint unchanged; live picks them up on each surface's next rebuild: Contact is rebuilt, footer, header,
  home, mega-brands and mega-sunglasses are not). Labelled by Solve: 13 gaps to prove. `independent-check.mjs --surface
  contact`: 123 differences, mostly the form card's box (cr-ref-contact-24, 27 to 32: found on live only, or 432px of
  extra top inset). The right edge of Contact's text ends 17px short of the draft's at 1280 and wider (the N39 probe),
  likely the address width below. Open, all box rows:
  1. The hours list (cr-ref-contact-16, 18, 19): rows 5 to 6px further apart than the draft. The walker now measures
     it (`f7d9003f5`: a text run's rows give a `row-gap` row from the space between line boxes, and Solve reads the
     draft's); left: a Solve run on Contact to write the hours row gap setting. Session B's triage (2026-10-05)
     found the row gap is a confirmed framework gap: `sgs/business-info` has no gap control for the hours row, so it
     is in a Session C2 finding (the old group label G1) (`hoursRowGap`, css_element `hours-row`).
  2. The address (cr-ref-contact-13, 15, 17): the draft's address text is 168px wide at every width and wraps to two
     lines at 375; live fills its column. The walker now reads the draft's declared width from its matched rules
     (`f7d9003f5`, `devtools.mjs::declaredValues`) and Solve writes a declared width; left: a Solve run on Contact. Session B's triage
     (2026-10-05) answered the open question: **no width row remains open** on cr-ref-contact-13, 15 or 17, so the
     declared-width write holds and no business-info width control is needed. What is left on those refs is box rows
     (`w`, `h`, `y-after-*`) that close with the spacing above them.
  3. Consequences that close with 1 and 2: page and column heights (cr-ref-contact-0, 1, 20) and rows compared across
     the two columns at 1440 (cr-ref-contact-14, 15, 27, 29).
  Then the done line: fresh rebuild of the committed tree, 0 unexplained and 0 labelled gaps, 0 new rows, wrong writes at
  most 10%, `independent-check.mjs --surface contact` 0 differences beyond the ledger, planted-fault control.
- [ ] **Contact form (Session D; surface `contact-form`, post 285): 87 distinct issues open on the 2026-10-07 sweep.** Paired 6 of 6 with every field
  measured at its control (`liveControl`). The last Solve (`qa/solve/contact-form/2026-10-04T11-24-38/`) closed 27 but
  regressed 4 rows with 7 wrong writes, so the tree was restored from git and rebuilt; two of its causes are now fixed
  (the per-round `conflict` rule, tag matching). Still open before it can run clean: the draft's select is not the
  inputs' 52px height, so `fieldMinHeight` (input and select) moved the textarea 6px; decide the select's own height
  (a `fieldSelectMinHeight`, or the select measured against the inputs) at the framework, then re-run Solve.
- [x] **Lenses at 100% (Session D, 2026-10-08; from 67 distinct issues; done line met, last paragraph below): paired 28 of 29 blocks (cr-ref-lenses-28 left out: its draft element holds another block's words),
  `walkerFull` set.** First Solve (`qa/solve/lenses/2026-10-04T11-32-37/`): 57 to 33 distinct issues, but 3 rows
  regressed (a `gap: 0` write on cr-ref-lenses-22 shrank its parent cr-ref-lenses-21 at 375; the process-steps padding
  and step gap writes moved the next item 16px at 1440) and only one write round ran; the tree was restored from git
  and rebuilt. Also seen: cr-ref-lenses-25's gap setting holds 0 yet its inner band paints a 16px column gap (Hardcode
  class). **Diagnosed 2026-10-07: none of the three is a defect; each is an artefact of that run's single write round.**
  The draft's two columns (gen-lenses-22, -25) are block flow whose children carry the spacing as margins (read on the
  draft at 375 and 1440: h2 `margin-bottom:16px`, the list 0, the "Choose a frame" button `margin-top:28px`); live's
  stacks add a 16px gap on top of the heading's 16px margin (32px under each heading, register 101). So `gap: 0` is the
  right write; the h@375 "regression" that reverted it was marked unconfirmed (the run ended before the next walk), and
  the Hardcode row compared the new tree value with a page measured before the rebuild (the live rule is on the inner
  band, `.sgs-container-<uid>>.sgs-container__inner{gap}`, so 0 paints 0). Register 100 (price margins, gen-lenses-11/15/19)
  and 102 (step numbers on cr-ref-lenses-27) are open as `T resolver-writes` on the 2026-10-07 measure-only sweep.
  **Solve run 2026-10-07 (`qa/solve/lenses/2026-10-07T20-06-48/`, eye-care-test at `430545e06`): distinct issues 67 to
  25, 42 closed, 0 new; 17 writes** (the price lines' 10px/6px margins, register 100; the step numbers at 15.5px weight 500
  line-height 1.5, the steps' 15px gap and zero padding, register 102; both columns' stack gap 0, the draft's spacing
  being its children's margins; the lens-card ground). The guard reverted the page container's padding (S6) on an
  unconfirmed `h@375 780→684` reading of the page container's own height (the sum of everything in it, a weak signal for
  one padding write) and then cycled one suspect per round through round 9; round 10's rebuild failed ("editor did not
  load", the host's bot challenge after nine builds). The page container then took S6's decided value by hand, the same
  as About and Contact (48/90px desktop and tablet, 28/60px mobile). Then, each measured on a rebuild of the committed tree
  (`qa/solve/lenses/2026-10-07T21-*`): 26 issues; 20 once walker gap 2 (`compare.mjs::timingIrrelevant`, transition timings on
  an element that changes in no state) and the steps' titles (`titleLineHeight` 1.5, `numberGap` 16px, the walker never
  pairs the titles) went live (`0070c8d4a`); 16 once the button took the draft's 28px top margin back (the 2026-10-03 run
  had zeroed it while the stack gap still sat on top); 9 once the hand config's live finders followed the cards' and
  steps' current markup and read the grid and steps column on their container section, the walker stopped reading a
  `display:none` pseudo layer, and straight and curly quotes compared as one character (`5bebb2b6d`). The 9 paint nothing
  and are ledgered D-72 to D-81 (the draft's scroll reveal never fires below 1440; the steps' flex-grow, gap shorthand and
  `align-items`). **Done line, checked by /qc 2026-10-08** (`~/.claude/pipeline-state/qc/2026-10-08-2b-session/stage-6-report.md`): a rebuild
  of the committed tree measures **0 unexplained, 0 labelled gaps, 0 new rows** (`qa/solve/lenses/2026-10-07T23-*`, after
  D-82 to D-85 ledgered the draft reveal at 768); the planted-fault control passes (22px top padding caught at 1440 and 1920
  only, then cleared on restore). **The last two criteria, closed 2026-10-08:** (1) `independent-check.mjs --surface lenses`
  0 differences (from 7). Three were a block with no gap against a flex gap of `0px 0px`, which paint alike
  (`independent-check.mjs::gapKey`, test `independent-check.test.mjs` "Lenses gap", `c7edf9a19`). The other four were not
  side padding: draft and live both start main's text at x 20 (375) and x 52 (768 up) at 375/768/1280/1366/1920, so
  register N39's sides hold. They were the step titles' line ends: live's titles are `h3`s and took the theme's
  `h1…h6 { text-wrap: balance }` (`core-blocks-critical.css`), the draft's are spans; `titleTextWrap: wrap` on
  cr-ref-lenses-27 matches the draft's line ends within 1px (`298c8d2f8`). The walker never pairs the titles, so only the
  independent check could see it. (2) Wrong writes: the 3-round run on the rebuilt tree (`qa/solve/lenses/2026-10-08T02-08-01/`)
  wrote nothing (0 of 0 wrong; 0 closed, 0 new). On the 2026-10-07 write run, 2 of its 3 wrong writes are the guard's
  unconfirmed `h@375` verdict on the page container's own height, excluded from the ratio because a container's height is
  the sum of everything inside it and cannot judge one padding write (the padding then took S6's decided value by hand);
  that leaves 1 of 15 (7%). The run's one open row, cr-ref-lenses-26 `y-from-benefits-list` at 375 (draft 255, live 281),
  is the draft's reveal caught part-way (the steps column revealed, the benefits list not); with every reveal fired both
  sides measure 281, so it is ledgered D-86 under the D-72 ruling.
- [x] **Every surface paired and measured (Session A sweep, 2026-10-05, from `1ea514ae8`).** Every surface has
  `walkerFull`; panel surfaces pair with their walker state open on both sides (`pairs.mjs --state --width --recheck`)
  and a surface inside the header or footer landmark pairs its own words (`lib/pairs.mjs::liftExclusions`). One
  measure-only Solve run per surface (`--rounds 0`, no writes), aggregated by `sweep.mjs` into
  `sites/eye-care-ward-end/build/qa/sweep/2026-10-05/sweep.json` (`run-manifest.tsv` names each report). "Unmapped
  state" issues come from walker states Solve does not map to a setting state (shop's filters, sort and brand states).
  The register's Sweep column gives each register item its status. Re-paired 2026-10-07 with a state open or a
  desktop re-check: the four mega panels (`3fda5b734`), shop (`fb7dcecaa`, 4 -> 21 of 48) and product with its tab
  and accordion panels open (`7a15720cf`, 37 -> 104 blocks seen, 14 -> 74 kept).

| Surface | Blocks measured (paired + hand) | Open issues | Unresolved | Derived | Unmapped state |
|---|---|---|---|---|---|
| footer | 31 of 34 | 201 | 138 | 63 | 0 |
| about | 24 of 24 | 1 | 1 | 0 | 0 |
| lenses | 28 of 29 | 58 | 32 | 26 | 0 |
| help | 25 of 41 | 167 | 121 | 46 | 0 |
| contact | 31 of 32 | 27 | 10 | 17 | 0 |
| home | 65 of 79 | 349 | 273 | 43 | 33 |
| header | 6 of 13 | 94 | 77 | 17 | 0 |
| mobile-menu | 0 of 16 (drawer-open open) | 48 | 42 | 6 | 0 |
| mega-sunglasses | 31 of 31 (mega-shop open) | 182 | 151 | 31 | 0 |
| mega-brands | 48 of 48 (mega-brands open) | 277 | 235 | 42 | 0 |
| mega-lenses | 21 of 21 (mega-lenses open) | 135 | 113 | 22 | 0 |
| mega-help | 22 of 22 (mega-help open) | 59 | 50 | 9 | 0 |
| size-guide | 21 of 32 (size-guide open) | 80 | 39 | 41 | 0 |
| lens | 1 of 3 shown at step 1 | 88 | 64 | 6 | 18 |
| shop | 10 of 45 | 216 | 44 | 9 | 163 |
| product | 16 of 37 | 333 | 180 | 44 | 109 |
| contact-form | 6 of 6 | 58 | 48 | 10 | 0 |
| **Site** (a row two surfaces share counts once) | | **2,373** | 1,618 | 432 | 323 |

**The per-surface totals above are the 2026-10-05 pre-Session-C figures. Current truth, from Session C's Wave 3 sweep (2026-10-06, all 17 surfaces, block code `7f375f765`):** site total **1,841** per surface (1,836 site-deduped, five ref-less `contact`/`contact-form` presence rows collapsing because both declare the same walker), split unresolved 1,396, derived 395, **unmapped-state 0** (was 323) and content 45. Triage classes: **W 1,242 / F 192 / T 378 / U 29**. Read the live per-surface numbers from `qa/triage/*.json`, never from this table.

  Pairing left out, with reasons in `qa/pairs/<surface>.json`: mobile-menu now pairs (FIXED 2026-10-06,
  `7255be68d`: its state opener matched the Menu button by rendered text `^$`, and the label is hidden at 375
  but reads "Menu" from 768, so the click silently missed and `clickText`'s `optional` swallowed it — both sides
  behaved alike, so it was never a site regression; all 17 surfaces now carry `handScope`); shop's and product's draft
  finders hold other words at 375 and 768, so the pairing merges a finder chosen per width
  (`lib/pairs.mjs::mergeWidthFinders`, `d605bb5ba`; shop now keeps 21 pairs); Help's FAQ items are 319px on the
  draft against 996px live; lens shows 3 of its 24 blocks at step 1 (lens.mjs's hand pairs walk the later steps). Bag,
  checkout and confirmation are walked by their hand configs (`qa/sweep/2026-10-05/walks/`; confirmation against the
  paid order 652, walked in full at `2b4516195`).
- [x] **Recalibration of every block with today's calibration changes:** done 2026-10-05 for all 94 cache files on the
  local WSL mirrors (Session 0 of `plans/archive/2026-10-04-eye-care-sweep-audit-fix.md`; counts in
  `.claude/reports/2026-10-04-route-data-audit/README.md` section 7). sgs/modal calibrates (22 settings).

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
| 2026-10-05 | Rows read mid-entrance after a fixed wait | `parity/lib/devtools.mjs::settleAnimations` waits until no finite animation is left (`document.getAnimations()`), from a 900ms floor to a 6s cap | Every walk |
| 2026-10-05 | Hover read only on pairs a hand config flags | `devtools.mjs::forcedHover` forces `:hover` (DevTools protocol) on every other pair and its ancestors, read after its transitions finish | Every ref-traced walk |
| 2026-10-05 | A width the draft declares (168px, 50%) seen only as used pixels, never written | `devtools.mjs::declaredValues` reads the matched rules' declared sizes; `solve.mjs::writeRound` writes a width only as a declared plain length or percentage | Any draft sizing a box by a declared width |
| 2026-10-05 | A list's spacing between rows never compared on a text run | `paint.mjs::textRun` groups its text into rows; `compare.mjs::comparePair` emits `row-gap` from the space between line boxes; Solve reads the draft's | Any draft list measured as a text run |
| 2026-10-05 | Flex alignment keywords that lay out the same reported as rows (`normal` against `flex-start`, `normal` against `stretch`) | `compare.mjs::equivalent` treats them as equal where both sides lay out with flex (grid keeps comparing) | Any draft or live flex container left at `normal` |
| 2026-10-05 | A draft's CSS entrance timings compared with a script-driven entrance of the same durations (8 false rows on About) | `compare.mjs::timingIrrelevant` compares animation timings only where both sides animate with CSS keyframes; the keyframes motion row reports the technique | Any page whose live entrances run from script (SGS entrances) |
