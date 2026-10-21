# Handoff readers: every stage reads the facts the handoff states

## Goal

Every stage of the computed route takes the facts a Claude Design handoff states from the handoff itself (the draft's template and logic first, `surfaces.json`, `animations.json`, `tokens/*.css`, assets, site-build's own records), with the render confirming, so the skeleton writer, Fill, the site build and the theme snapshot decide less by measuring or by an agent's guess, on every client, not only Indus. Every hand fix found on the way becomes a rule at the moment of fixing (the ratchet). Evidence: `.claude/reports/2026-10-21-handoff-data-register.md` and its gap analysis `.claude/gap-analysis/reports/2026-10-21-handoff-data-register.md`. Measure of the goal, before and after: finaliser picks per surface, review rows per surface, hand-set IDs in each client's `decisions.json`.

## Rules that govern every wave

- **Decision order** (Bean, 2026-10-21): the code's evidence on the exports first; then Bean's rulings (a ruling the evidence challenges goes back to Bean with a recommendation); then principles (R-47-4: code first, render confirms; FR-48-24: draft logic runs only in the sandboxed page, a static evaluation over the syntax tree is allowed); then the requirement's original reason, looked up in git.
- **Universal signals only** (FP-9). A rule keys on what the runtime or our schema guarantees (READING-DC-FILES §7: `sc-if`, `sc-for`, `dc-import`, `data-dc-tpl`, `style-*`, declared CSS, ARIA, `surfaces.json` kind, parent and `state_keys`), never on an author's names (`R.logoH`, `showHeaderCta`, `item.current`, `_menus`, a pixel width such as `300px`). An author-defined key goes to Bean as a client-scoped exception in `data/skeleton-decisions.json`. A lint refuses literal pixel values and logic-key names in rule conditions in `lib/skeleton-rules.mjs`.
- **The cross-client guard.** Before wave 1, the current skeleton proposals and Fill decisions for every surface of all three clients are frozen (`rerunSkeletons` for Indus and Mama's; Eye Care's header and footer after step 0.2). Every rule commit diffs them: a changed row on a client that did not teach the rule blocks the commit until Bean confirms it. Negative fixtures prove where a rule must not fire: Mama's S-10 review slider, S-09 gifts carousel, trust-bar marquee and account navigation; Eye Care's S-21.
- **The ratchet.** A hand fix at any stage is written as a rule at the moment of fixing and rerun on one surface (the header chain is about 5 minutes). Each rule carries an id, `taughtBy` (client, key, export hash), its scope (surface kind and parent, the runtime signal), `clients` (where it has been checked), a MUST FAIL fixture under `tests/fixtures/<rule-id>/` and a mutation check. Bean's one-line confirms are batched once per wave. A gate fails when two rules propose different blocks for one element. The mutation script moves into `scripts/computed-route/tools/mutate.mjs` (from the temp scratch folder) so the evidence survives the session.
- **Hand-picked IDs are carried, never picked**: the trees read site-build's records (`sites/<client>/build/media-map.json`, the menu name `lib/site-build-plan.mjs` already resolves).
- **Measure before, predict, gate**: each wave states its baseline, its predicted number and its commit gate (QC council method); one combined review at the end.
- **Spec edits land in the commit of the wave that builds them** (docs state current truth), each with its Status line; one final pass for Spec 48 §3.4 and 48A §3.
- Gates on every commit: in `scripts/computed-route` `node lint.mjs`, `node capabilities.mjs --gate`, the touched tests (named per wave below); `python scripts/check-no-client-names.py --check`. The main session runs every reseed, build, Fill, Solve and deploy after `ListAgents` and a message to each busy peer, and holds the framework DB while subagent lanes run tests against it read-only. Subagents: at most three implementers this session (lanes A and B, one for the step 0 batch) and one combined review.

## Element identity and freshness

No new fact-record module. The skeleton inventory (`lib/skeleton-inventory.mjs::readInventory`) and the census stay the records, extended field by field as each wave reads a field, and each wave names the old read it retires with a grep that must return zero.
- **Two key levels**, built by one shared function (`lib/fact-key.mjs`, migrating `lib/skeleton-rerun.mjs::loopingKeys`, `lib/fill-skeleton.mjs::tplKey` and `check-approved.mjs` in step 0): a template key `<dc file>/<tpl>`, offline from the annotated template; an instance key `<chain>/<tpl>#<copy>`, only from the per-state inventories under `build/intake/inventories/`, with the state that rendered it. A test fails any key built from a template literal elsewhere in `lib/`.
- **Fingerprints**: every inventory record, origin entry, client decision and Bean approval carries tag, parent tag chain, a text hash and its source line; `lib/identity.mjs::fingerprintAgrees` compares all four (today it compares the tag only). Intake re-aligns the previous run's records to the new export by fingerprint and refuses to carry a mark, decision or approval whose fingerprint disagrees, listing it in `review.md`.
- **Freshness**: intake writes into each inventory and into `intake.json` the sha256 of every draft, the runtime, `surfaces.json`, `animations.json` and `tokens/*.css`, and the commit that built it; every reader calls one `assertCurrent( record, handoffRoot )` and refuses on a mismatch, never falling back. `lib/handoff.mjs::checkHandoff` checks `surfaces.json` currency as it checks `animations.json` (if `surfaces.schema.json` carries no draft hashes, the check compares `runtime_sha256` and the schema gains `drafts`, versioned).

## Step 0 (before the waves, about 30 min)

1. The identity and freshness mechanics above, with `mutate.mjs` moved into the repo.
2. Eye Care's origin maps re-keyed to the current export by fingerprint (the header map starts at `Root/14`, the export's header root is 13); Eye Care's built header and footer trees become frozen rows for the cross-client guard. The adapter that turns them into `check-approved.mjs` rows is cut first if time runs short.
3. The cross-client freeze and its diff tool.
4. To Bean now, in parallel: the three decisions under "For Bean".
- Gate: the key test, the fingerprint MUST FAIL (a renumbered fixture export re-aligns; a changed element refuses), the freshness MUST FAIL (a stale `surfaces.json` hash refuses), all three clients frozen.

## Lanes

- **Main session:** waves 2 and 3 on the Indus header, each item through the 5-minute chain, so the header is signed mid-session.
- **Lane A (Sonnet, worktree):** wave 1, gated offline by `check-approved.mjs` and the cross-client diff; no reseed (its rules live in `data/skeleton-decisions.json`).
- **Lane B (Sonnet, worktree):** wave 4.
- One reseed for the session, carrying the `property_equivalents` row and any `block.json` change, run before the first header Fill rerun of wave 2; `seed_reference_data.py` reseeds from the whole file (rows the file drops are deleted).

## Wave 1: skeleton structure from the template and surfaces.json (lane A)

1. Records carry what the rules read: `ATTRS` gains `aria-current`, `aria-expanded`, `aria-pressed`, `required`, `tabindex`; a `realTag` field maps `sc-raw-*` to the real tag (today `srcTag` is the raw name and only `tagOk` strips the prefix); each record carries its declared `display`, flex and grid track sizing, `position`, `width`, `flex-shrink`, `aspect-ratio` and own paint (background, background-image, border, box-shadow) from its static declarations. Changing the saved inventories needs a re-intake per client (a render session each); Indus and Mama's are re-intaken once, at the start of the lane.
2. Surface parts: `surfaces.json` records whose `parent` is the surface and whose root sits inside it are read as `surfaceParts` (renamed from `parts`, which `lib/skeleton-propose.mjs` uses for hidden children).
3. Disclosure panels in a header: scoped to a surface whose `parent` is the `header` surface and whose opener is a nav link (`kind` plus `parent` plus `opened_by` or `aria-expanded`), never to kind `panel` (on Mama's that is the review slider and gifts carousel). The panel's direct layout children, flex or grid, are classified by track sizing: a fractional or `minmax(0,…)` track holding a run of sibling links (a loop, or two or more static links with one style) is a group; a fixed or ratio-sized box with its own paint and no link run is an aside or feature; repeated boxed items are a card grid. Bean's approvals are the Indus target (68 `sgs/mega-group`, 76 and 102 `sgs/mega-aside`, 96 `sgs/container`); Eye Care's grid mega menu (lines 612 to 690 of its draft) is the second check.
4. `lib/skeleton-rerun.mjs::rerunSkeletons` passes states, thresholds, `calKeys` and `calSettings` as `skeleton.mjs::intakeContext` does; `loopingKeys` accepts `nearest_tpl_id` only with a translate transform and an infinite iteration, and the re-derived inventory reads a declared `animation` value's `infinite` (Mama's two marquees).
5. `lib/manifest-build.mjs::statesOf`: a state of an openable surface is kept when any of its `state_keys` is a real state key with a truthy value; derived and instance keys (`R.*`, `item.*`, `_`-prefixed) are filtered; pointer words are still matched first. `manifest.mjs` accepts several entry drafts, choosing each surface's draft by its record's `dc`, and `matchRecord` matches a page whose route is a file (`Home.dc.html` to `page_key` `Home`).
- Baseline: `check-approved.mjs indus-foods --no-built` 133 match, 24 mismatch (20 mega-panel, 2 drawer social links, 2 group rows); the header proposal is Bean's 5 blocks; Mama's trust-bar marquee count 0; Eye's mega menu kept states 1 ("resting"); Mama's `build/surfaces.json` not generated.
- Predicted: 153 match, 4 mismatch (2 drawer pending Bean's decision, 2 group rows named); the header proposal byte-identical (`git diff --exit-code` on `sites/indus-foods/build/skeleton/header.proposal.json` after a rerun); no change on Mama's or Eye Care's frozen rows except their two marquees and Eye's five mega-menu states; Mama's `build/surfaces.json` generated with its 11 pages matched.
- Tests touched: `tests/skeleton-rules.test.mjs`, `skeleton-rerun*`, the manifest tests, `handoff-check.test.mjs`.
- Retires: the word match in `statesOf`; the tag-only `fingerprintAgrees`.

## Wave 2: Fill holds the declared values (main session)

1. Spacing ownership from the code (Bean, 2026-10-21) in `lib/fill-spacing.mjs` (its one caller is `lib/fill-resolve.mjs` `planSpacing`; the "conflict" text is `fill-resolve.mjs`'s one-setting-two-gaps check, unchanged): the declared `gap`, `justify-content` and child margins decide who owns the space. Under `justify-content: space-*` the declared gap is a minimum and the render confirms `rendered >= declared`; otherwise the rendered gaps confirm within 0.5px and win on disagreement with a reported row. First step: the diff of every parent's old and new gap over every saved Fill read on all three clients.
2. A logo's height: a height bound by a hole on an `img`, `svg` or logo element with an intrinsic ratio (a declared `aspect-ratio`, `width:auto` on an image of known natural size, width and height attributes, or the viewBox) is the block's maximum height. `lib/fill-equivalents.mjs` gains the `intrinsic-ratio` condition as code and refuses an unknown condition (today an unknown string applies unconditionally); a `property-equivalents.json` row `height` to `max-height`; `sgs/responsive-logo`'s `maxHeight` is a tier object, so the values are written per tier (Indus 1440: the `clamp()` evaluated at 1440; 768: 56px; 375: the `min()` evaluated at 375), the `clamp()` form left until a calibration proves the setting holds it.
3. `display` on a flex or grid layout element routes to the block's `layout` setting (flex is its default, so nothing is written) instead of the `sgsHideOn*` toggles, which are the only settings tied to `display` today (`lib/resolve.mjs` refuses any non-string value as "cannot be held"); otherwise a named gap, not a shape error. The blocks with `sgsHideOn*` are listed and Eye Care's and Mama's frozen Fill rows diffed before the commit.
4. Menu labels: the nav link's own text in the template (static or its resolved hole) becomes the menu item's label in `lib/site-build-menus.mjs` (today `labelOf` is the page title and an empty item title shows the post title, "Contact Us"); a changed label shows as an `item-update` in every client's site-build plan, listed for Bean before any push.
5. Trees read `media-map.json` and the menu name for `logoId` and `ref`; the header's hand-set entries leave `sites/indus-foods/build/skeleton/decisions.json`.
- Baseline: the header Fill report `sites/indus-foods/build/qa/fill/header/2026-10-21-0610/fill-report.md` (logo "no setting for height" and "not-plain", row `display` "cannot be held", the gap conflict, 48 settings written); the live logo's rendered height at 1440 measured now in the cropped pair.
- Predicted: the logo's rendered height equals the draft's at 375, 768 and 1440 within 0.5px; the row on one line with the CTA unclipped at 1440; the menu reads "Contact"; 0 hand-set IDs in the header's decisions; no change on Mama's or Eye Care's frozen Fill rows beyond the listed `sgsHideOn*` blocks.
- Tests touched: `tests/fill-spacing.test.mjs`, `fill-equivalents.test.mjs`, `fill-resolve.test.mjs`, `fill-skeleton.test.mjs`, `fill-site-rows.test.mjs`, the site-build menu tests.

## Wave 3: states and behaviour from the handoff (main session)

1. The current nav item: force a route or `current` state from `surfaces.json` `state_keys`, and diff each nav link's resolved declarations between "this link's route" and another route; `aria-current`, where present, names the meaning. That gives `itemColourCurrent` and the current indicator (Indus: the 2px `#D8CA50` underline; Mama's `aria-current`; Eye's `ulHelp` underline colour).
2. Width-gated content: any `sc-if` whose condition the syntax tree evaluates to a width comparison (`w >= 1260`, `bp === 'd'`) becomes the block's visibility at that threshold: the block's own breakpoint setting if it has one, otherwise a bounded, labelled `sgsCustomCss` rule (FR-48-50's channel, built here with its `breakpoint-snap` ledger rule in `lib/ledger.mjs` and `lint.mjs`). The snap policy is Bean's decision (below).
3. Sticky and scroll states: a declared `position:sticky` (including the `dc-import` host style the census restores) sets `headerSticky`; a scroll listener that writes a state key is matched to the header state carrying that key (Indus `scrollY > 8`, Eye `scrollY > 40` setting `scrolled`), and the diff of resolved declarations between the two states gives the scrolled settings (`shadowScrolled`, padding, logo size), with `scrolledOffset` the threshold; `animations.json` (Indus J-01) cross-checks. `sgs/site-header` is recalibrated first (`headerSticky` and `scrolledOffset` have no cache entry).
- Baseline: in cropped pairs at 375, 768 and 1440 (resting), 1440 scrolled (`scrollY` 9 on Indus) and 1440 with a mega menu open: the current item's colour and underline missing, the CTA showing at 375, not sticky, no shadow.
- Predicted: `liveStateCheck` and the walker show 0 open rows for these items at those widths and states, and Bean signs the pairs (FP-13). FR-48-80's sticky part and FR-48-81's header clause get their Status lines.

## Wave 4: the theme snapshot's token stage (lane B)

Intake writes the resolved tokens (`lib/tokens.mjs::readTokens`, `::resolveTokens`, already built) to `build/intake/tokens.json`; the extractor reads that file (FR-33-1) instead of the README (FR-33-15). Scope: body size and line height, radii, the shadow presets the tokens name, and the palette from the tokens with the roles Bean already confirmed (FR-33-2: alias names are not roles). First, prove why Indus's snapshot holds 16px/1.6: `theme-extractor/typography.py` falls back to exactly `"16px"` and `"1.6"` when its measurement is empty; rerun `extract.py` on cached facts, print the base trace, and add a refusal when the fallback fires. The gap scale, gutters and section padding wait for a reader (FR-48-41; `normalise.mjs::snapLength` has no caller).
- Baseline: Indus snapshot body 16px/1.6, radii and shadows the framework's.
- Predicted: Indus snapshot body 19px/1.55, the card radius 22px, every emitted token `_source: declared`, unused tokens in the gap log; Indus only, pushed with `push-theme-snapshot.py` after Bean sees its diff (rollback: the previous snapshot file in `theme-snapshot-backups/`).

## For Bean (sent at step 0, each with a recommendation)

1. The Indus drawer's 116 and 117 are `tel:` and `mailto:` links with code-drawn glyphs; Bean approved `sgs/social-icons`; the code states business-info links.
2. The 5% breakpoint snap (Bean's FR-32-13 ruling): the evidence (Eye Care's 1060, "the full nav no longer fits") challenges it.
3. A rule taught on Indus that the cross-client diff shows changing a Mama's or Eye Care row: confirm or scope.

## Cut line

If time runs short, cut in this order: step 0.2's `check-approved.mjs` adapter; wave 4's shadow presets; wave 1 item 5's Mama's manifest generation. The header items are never cut. After the header is signed: commit, update Status and write a resume note.

## Status

- [x] Analysis: the register (`7a83c4600`, `51eee8e7b`, `f71ee51a5`, `aa2432fdb`) and its gap analysis.
- [x] Design council (five personas, 2026-10-21): every must-fix applied above.
- [ ] Step 0.
- [ ] Waves 1 to 4.
