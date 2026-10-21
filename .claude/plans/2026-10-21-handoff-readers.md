# Handoff readers: every stage reads the facts the handoff states

## Goal

Every stage of the computed route takes the facts a Claude Design handoff states from the handoff itself (the draft's template and logic first, `surfaces.json`, `animations.json`, `tokens/*.css`, assets, site-build's own records), with the render confirming, so the skeleton writer, Fill, the site build and the theme snapshot decide less by measuring or by an agent's guess. Every hand fix found on the way becomes a rule at the moment of fixing (the ratchet). Evidence: `.claude/reports/2026-10-21-handoff-data-register.md` (ranked summary, per-stage index, source decisions) and its gap analysis `.claude/gap-analysis/reports/2026-10-21-handoff-data-register.md`.

## Rules that govern every wave

- **Decision order** (Bean, 2026-10-21): the code's evidence on the exports first; then Bean's rulings (a ruling the evidence challenges goes back to Bean with a recommendation); then principles (R-47-4: code first, render confirms; FR-48-24: draft logic runs only in the sandboxed page); then the requirement's original reason, looked up in git.
- **The ratchet**: a hand fix at any stage is written as a rule at the moment of fixing and rerun on one surface (the header chain is about 5 minutes; a rule in the framework DB batches into one reseed per session). Each rule: a MUST FAIL test, a mutation check (C:\Users\Bean\AppData\Local\Temp\claude\scratch\mutate.mjs), Bean's one-line confirm, and the row that taught it recorded with the rule (`taughtBy`), so a rule a later client contradicts is easy to find and remove.
- **Hand-picked IDs are carried, never picked**: site-build records each upload, menu and page ID against the draft element it came from; the skeleton and Fill read that record.
- **Measure before, predict, gate**: each wave states its baseline, its predicted number and its commit gate (QC council method); one review per wave.
- Gates on every commit: in `scripts/computed-route` `node lint.mjs`, `node capabilities.mjs --gate`, the touched `node --test tests/<file>.test.mjs`; `python scripts/check-no-client-names.py --check`. Implementers on Sonnet in their own worktree (`npm ci` in `scripts/computed-route` first), merged after a diff read; the main session runs every reseed, build, Fill, Solve and deploy after `ListAgents` and a message to each busy peer.

## The shared fact record

One record per draft element, keyed `<importPath>/<n>#<copy>`, written at intake beside `intake.json` and read by every stage. It joins what already exists (the census's annotated-template rows, `lib/intake-construct-readers.mjs`, the re-derived inventory) with the handoff files: the element's tag and every attribute (ARIA, `required`, `tabindex` included), its static declarations and `style-*` rules, each hole with its logic path, its template parent and `sc-if`, `sc-for` (list and item names) and `dc-import` membership, its ref, hooks and events; the surfaces whose roots or states contain it (`surfaces.json` id, kind, parent, state names); the effects that target it or a descendant (`animations.json` ids); the token each literal equals by value; for an element no read width renders, the per-tier values its holes resolve to, read from the live logic instance in the sandboxed page. Built offline from saved artefacts except the last field. The design council decides whether it is a new module or an extension of the census output.

## Waves

### Wave 1: skeleton structure from the template and surfaces.json, and the small intake fixes

1. Element records carry every attribute the rules read: `lib/skeleton-inventory.mjs::readInventory`'s `ATTRS` gains `aria-current`, `aria-expanded`, `aria-pressed`, `required`, `tabindex`; `srcTag` maps `sc-raw-*` back to its real tag; each record carries its declared `display`, flex, `position`, `width`, `flex-shrink` and own-paint flags from its static declarations.
2. Surface parts: a `surfaces.json` record whose `parent` is the surface and whose root sits inside it (panel, menu, accordion, form step) marks its subtree; the skeleton reads parts instead of discarding them.
3. Mega-panel rows from the template: within a panel part, a row's flexible child holding a link loop, the fixed-width sibling with its own paint and no loop, and the panel's direct grid of boxed cards are told apart (the template's `flex:1;min-width:0` against `width:300px;flex-shrink:0`, own background, loops; `_menus` groups against feature and side blocks). Bean's approvals are the target: 68 `sgs/mega-group`, 76 and 102 `sgs/mega-aside`, 96 `sgs/container`. Each new rule goes to Bean for its one-line confirm.
4. Small fixes found by the register: the re-derived inventory reads a declared `animation` value's `infinite` and `loopingKeys` accepts `nearest_tpl_id` (Mama's two marquees); `lib/manifest-build.mjs::statesOf` keeps states by `state_keys`, not by the words "open" and "expanded" (Eye's five mega-menu states); `manifest.mjs` accepts several entry drafts (Mama's 11); `lib/handoff.mjs::checkHandoff` checks `surfaces.json` currency; `lib/skeleton-rerun.mjs::rerunSkeletons` passes states and thresholds as `skeleton.mjs::intakeContext` does.
- Baseline: `node scripts/computed-route/check-approved.mjs indus-foods --no-built` = 133 match, 24 mismatch (20 mega-panel, 2 drawer social links, 2 group rows); the header proposal = Bean's 5 blocks.
- Predicted: the mega-panel mismatches clear; the header proposal is unchanged; `check-approved.mjs indus-foods` still exits 0.
- For Bean (evidence challenges a ruling): the drawer's 116 and 117 are `tel:` and `mailto:` links with code-drawn glyphs in the template, approved as `sgs/social-icons`; the template states business-info links. Brought to Bean with a recommendation before any rule touches them.

### Wave 2: Fill holds the declared values

1. Spacing ownership from the code (Bean, 2026-10-21): the declared `gap`, `justify-content` and child margins decide who owns the space; the rendered gaps confirm within 0.5px and win on disagreement with a reported row. The header row's `justify-content:space-between; gap:20px` becomes a 20px gap with space-between, not the "conflict" with a measured 80.92px.
2. A height with a declared `aspect-ratio` is the block's maximum height (a `property_equivalents` row with a declared-ratio condition): the logo's `R.logoH` per tier (`clamp(54px,4.4vw,66px)`, `56px`, `min(…)`) reaches `sgs/responsive-logo`'s `maxHeight`, in the declared form where calibration proves the setting holds it, otherwise per tier. Reseed batched.
3. `display:flex` on `sgs/site-header-row` "cannot be held": the cause is proven from the block's calibration and `render.php` before any change.
4. Menu labels come from the logic's `_menus` ("Contact", not the page title "Contact Us"), and site-build records the upload and menu IDs per draft element, which the trees read (`logoId`, the menu `ref`).
- Baseline: the last header Fill (`sites/indus-foods/build/qa/fill/header/2026-10-21-0610/fill-report.md`): the logo has no height setting, the row's display "cannot be held", a gap conflict, 48 settings written; the live logo about 170px high.
- Predicted: the logo renders at the draft's height at 375, 768 and 1440 (within 1px); the row holds one line with the CTA unclipped at 1440; the menu reads "Contact"; no hand-set ID left in `decisions.json` for the header.

### Wave 3: states and behaviour from the handoff

1. The current nav item: the subtree under `sc-if item.current` (the 2px `#D8CA50` underline) and the `item.activeColor` hole give `itemColourCurrent` and the current indicator.
2. The CTA under `showHeaderCta` (`w >= 1260`): 1260 is no device tier, so the FR-48-50 breakpoint rule writes it to the block's own breakpoint setting or as a bounded, labelled `sgsCustomCss` rule; a threshold snaps to a tier only when its stated reason is a device class (Eye's 1060 is "the full nav no longer fits", so it is kept).
3. Sticky and the scroll shadow: S-03's scrolled state and J-01 (`scroll-position`, `scrollY > 8`, `box-shadow` to `0 10px 30px -18px rgba(20,40,60,.35)`) give `headerSticky`, `scrolledOffset` 8 and `shadowScrolled` (FR-48-80, sticky header part).
- Baseline: the current item's colour and underline missing; the CTA showing at 375; not sticky, no shadow.
- Predicted: each matches the draft in cropped pairs at 375, 768 and 1440, including the scrolled state.

### Wave 4: the theme snapshot's token stage (FR-33-1)

The extractor reads `tokens/*.css` (FR-33-1, not built): body size and line height (Indus 19px/1.55 against the snapshot's 16px/1.6; why FR-33-3's rendered paragraph gave 16px is proven first), radii, the four shadow roles, the gap scale, gutters and section padding per tier, the alias names as palette roles (FR-33-2), and the palette from the tokens, not the README (FR-33-15). Pushed with `push-theme-snapshot.py` after Bean sees the diff of each client's snapshot.

### Wave 5: Eye Care as a second answer sheet

Re-key Eye Care's `build/header.origin.json` and `footer.origin.json` to the current export by aligning fingerprints (tag sequence; the header map starts at `Root/14`, the export's header root is 13), run the skeleton writer on Eye Care's header and footer, and diff it against the built trees. The diff goes to Bean as ratchet rule candidates, each with the row that teaches it; agreed rules join Indus's in `check-approved.mjs`.

## Spec edits (after the design council, before the build)

Written as current truth, with no dated or superseded notes:
- Spec 48A §3: the readers table becomes the register by data kind (file, data kind, how it is read, readers per stage, built or not); §4 gains the export inconsistencies.
- Spec 48 FR-48-7: "Handoff readers" for every stage: the shared fact record, the take-over rule (against Bean's approved decisions and Eye Care's built trees), the ratchet rule; §3.4's two-lane text rewritten to match.
- Spec 48 §3.4 step 3 (spacing from the code, render confirms); FR-48-6 rule 1 (a marquee from the declared `animation` value); FR-48-33 (placeholders from the draft's own placeholder text); FR-48-29 (reads `data-props` the way the runtime's parser does); FR-48-24 (static evaluation over the syntax tree is allowed; draft code never runs in Node); FR-48-50 (a threshold snaps only when its reason is a device class); FR-48-74 (the desktop value from the logic's desktop argument, 1440 confirms); FR-48-37, -41, -44, -47, -55, -84 per the better-fit list.

## Status

- [x] Analysis: the register (`7a83c4600`, `51eee8e7b`, `f71ee51a5`, `aa2432fdb`) and its gap analysis.
- [ ] Design council (/adversarial-council), its must-fix items applied.
- [ ] Spec edits.
- [ ] Waves 1 to 5.
