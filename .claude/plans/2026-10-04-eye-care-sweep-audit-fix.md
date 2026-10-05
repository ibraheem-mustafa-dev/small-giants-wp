---
title: Eye Care whole-site sweep, gap audit and framework fix sessions
project: small-giants-wp
created: 2026-10-04
status: active
governs: Spec 47 §5 stage 3 (.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md); the fix register .claude/plans/2026-10-02-eye-care-fix-register.md
---

# Eye Care: whole-site sweep, gap audit, framework fixes

**Goal:** know exactly what is left on every Eye Care surface, which of it is Bean's decided difference, a real
framework gap or a walker gap (each proven), then fix every real framework gap in one orchestrated pass before
per-surface walker work resumes.

**Why now (Bean, 2026-10-04):** per-surface work hides the site-wide picture. Contact took a whole session to go from
134 to 19 issues, and 13 of 17 surfaces have never been measured with today's walker, so nobody knows what is already
fixed, what the register still needs, or whether "missing setting" labels are true.

**Order:** Session 0 (repair everything the 2026-10-04 audit proved) → Session A (sweep) → Session B (audit what is
still open + divergence protection + writes Session C's plan) → Session C (repair the measuring route: every unbuilt Spec 47 item) → Session C2 (assess each
remaining finding against the fix register, then fix what Bean approves) →
Session D (back to walker work, ranked by the sweep). Each session ends with `/handoff`. Session 0 goes first so the
sweep measures a repaired framework and the route sees the settings the seeder and calibration were missing.

## Terms (for a cold reader)

- **Walker:** `scripts/parity/draft-live-walk.mjs`, measures draft and live pages at 375/768/1440 and lists every
  painted difference as a row.
- **Pairing:** `scripts/computed-route/pairs.mjs`, matches each live block (class `cr-ref-<surface>-<n>`) to its
  draft element and writes the full walker config `qa/parity/<surface>.full.mjs` (`walkerFull` in `surfaces.json`).
  A surface without it walks only a short hand-written list of pairs.
- **Solve:** `scripts/computed-route/solve.mjs`, walks, writes block settings, rebuilds, repeats, then labels each
  surviving row (`lib/solve-rows.mjs::classify`): Hardcode (the setting holds the draft value but paint still
  differs), Missing setting (the framework DB routes no setting to that property and element), Unresolved (with a
  reason), Derived box rows (positions and sizes, consequences, never written).
- **Ledger:** `sites/eye-care-ward-end/build/qa/divergences.json`, Bean's decided differences. A matching row is
  compared against the decided value instead of the draft and is never written.
- **Register:** `.claude/plans/2026-10-02-eye-care-fix-register.md`, Bean's reviewed fix list (merged from
  `Eye Care Fix Register- Bean Points.md`), the standard every surface is judged against.

## Where things stand (2026-10-04, fc36ea861)

| Surface | Paired with today's walker | Open distinct issues | Labelled gaps (Hardcode/Missing) | Ledger entries |
|---|---|---|---|---|
| About | yes (24 blocks) | 0 | 0 | 12 |
| Contact | yes (33 refs) | 19 (all box rows) | 0 | 19 |
| Contact form | yes (6) | 46 (last Solve restored) | 9 of 23 after that Solve | 0 |
| Lenses | yes (28 of 29) | 57 (last Solve restored; reached 33) | 9 of 33 | 0 |
| Help, Home, footer | refs stamped, hand config only | unknown | Help's 2026-10-03 report predates today's classifier | 0 |
| Header, mobile menu, 4 megas, size guide, lens, shop, product | no refs, hand config only | unknown | unknown | 0 |
| Bag, checkout, confirmation | hand config only, not in `surfaces.json` | unknown | unknown | 0 |

Known limits of the labels: Solve's "Missing setting" means only "no DB row routes this property to this element". It
is a lookup result, not a proven gap. Of Lenses' and the form's labels, several read like walker artefacts
(container `transform` and `opacity` rows, likely mid-entrance-animation; `display` on form inputs) or settings that
exist elsewhere (textarea `max-width`). Each was proved or disproved in B2; the answers are Appendix B.

Register: 187 surface items plus 21 route findings (CR1 to CR21); about 30 marked closed. Its Type column (tree,
framework repair, framework new, content, client) was set by investigation on 2026-10-03 and has not been reconciled
with walker rows since.

---

## Session 0: repair everything the audit proved

**Source:** `.claude/reports/2026-10-04-route-data-audit/README.md` (with rerun scripts) and the wiring-fingerprint
gate (`plans/archive/2026-10-04-wiring-fingerprint-gate.md`, built 2026-10-04). **Done when:** every group below is fixed with a
test that fails without it (or recorded with a proven reason it cannot be), the framework DB is reseeded from clean
HEAD, both test sites are deployed, every block is recalibrated, and a rerun of the four audit scripts and the
fingerprint gate shows the counts fall by the predicted amounts with no new gap. **Complete 2026-10-05** (status below).

| Group | Scope | Owner files | Who |
|---|---|---|---|
| S0-1 Seeder routing | The six blind spots (gap classes A helper suffix map, B sibling PHP, C1/C2 wrapper callees and `includes/` emitters incl. the cart's variable prefix, D1-D5 value helpers / variable maps / cross-block custom properties / forwarding / quoted strings and `transition`, G box tiers without boxFamilies) by deriving the helper maps and file sets from source instead of hand lists; the `_split_php_statements` brace bug; the 3 wrong routes (`testimonial::ratingSize`, `nav-bar-menu::collapsePoint`, `nav-drawer::modality`); the 46 stale override entries; `css_property` for the extension roster's `sgsHover*` visuals and child sizing | `plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py` (split by job if it grows), `attr-classification-overrides.json`, `extension-roster.json`, block.json `boxFamilies` | one Opus agent (one owner for the seeder file) |
| S0-2 Framework bugs | `accordion-item/render.php` scope hash includes the inherited accordion settings; `team-member/render.php` emits its root typography; container grid items to Spec 32 FR-32-12's 2026-10-04 scope (every direct cell, text colour the only inherited value, all six variables in the editor, `editor.css` not overriding, hover/gradient/text rules at both depths, `--sgs-gi-border` through `sgs_colour_value()`); `image-sequence` allowed ratios as a block.json enum | the named block files, `class-sgs-container-wrapper.php`, `container/edit.js`, `container/editor.css`, `container/style.css` | `wp-sgs-developer` (diagnose, main checks, implement) |
| S0-3 Calibration: dead classes | fixture preconditions read from `blocks.variant_attr` + `variant_slots`, block.json `example`, `allowedBlocks`, `providesContext` and render conditions (element present, layout grid/flex, variant or toggle on, partner setting, overlay image, rendered state); per-element reads instead of the 81-element cap; closed surfaces read through their `aria-controls` panel, opened; hover on the styled child; `::before`/`::after` paint read in calibration (the walker side is Track P); pseudo-elements and a focus trigger; marker equal to the rest value; stale caches recalibrated | `scripts/computed-route/calibrate.mjs`, `lib/calibrate.mjs`, `calibration-fixtures.json`, `calibration-targets.json`, `scripts/parity/lib/collect.mjs` | main thread (route code) with one Sonnet helper for fixtures |
| S0-4 Calibration: noMarker, smaller lists, silent drop | gradient, transform, media-object markers; keywords and enums from the DB row when block.json has none (extension settings); the length regex widened; colour decided by `role`; `tier_shape` `flat_sibling`; per-device non-length values from the attrMap `:count`; container-width tiers not flagged as oneWidth; per-device unit objects and numeric weights given the right marker shape; the drawer opened for its 25 hover targets; a `shrunk` trigger; the 641 settings `longhands()` drops (gradient, border-colour gradient, shadow colour, stroke, height, grid-template-rows) | same as S0-3 | main thread |
| S0-5 Paint gaps, grouped | The wiring gate's findings (`python plugins/sgs-blocks/scripts/check-wiring-fingerprint.py --json <file>`; on 2026-10-04 at 8d81a084f, 100% precision on every link the QC council labelled: 5,804 attributes, 4,512 paint (css 4,346, js 166); blocking: editor canvas L3 1,591 over 72 blocks, per-device preview L3-tier 99, no control L2 26, front-end channel L5 18, CSS consumer L6 10, grid-item C1 15, bug classes B1 1 / B2 4 / B3 11, parity L7 3, editor.css shadowing S1 2, L4 1; advisory: hover/state L3-state 640, dead token L6-token 21) grouped by missing link and pattern (editor canvas by fingerprint: prefix helper, block-own, shared wrapper; per-device preview; controls; consumers), each group fixed in bulk: a codemod where the change is mechanical across blocks, or one shared helper upgraded or created (e.g. `typographyPreviewStyle` is the editor half of `sgs_typography_css_rule` but only `nav-drawer` uses it; `contentBandPreview` is called in 4 of the wrapper's blocks). Hover previews in the editor follow the group's decision. Each group re-runs the gate and removes its fixed ids from the baseline (`--update-baseline` after the fix, reason in the commit); the B1-B3 and C1 findings close with S0-2 | `src/components/*`, block `edit.js` files, codemod scripts under `plugins/sgs-blocks/scripts/` | `wp-sgs-developer` agents, one group each, worktree isolation |
| S0-7 Found while building the gate | Dead context wiring: `sgs/gridItem*` (6 keys, container) plus `sgs/formId` (16 blocks list it in `usesContext`, none reads it), `sgs/tabsOrientation`, `sgs/tabsStyle`: read them or remove them. One shared "is this context key consumed" helper used by `check-dead-controls.js` (`liveContextKeys`/`isConsumed`), `check-editor-render-parity.js` (`buildConsumedContextKeys`) and the wiring gate (`uses_context`): today three different tests. Split `check-editor-render-parity.js` (over 5,000 lines) into one module per check. Small confirmed defects: no control for `nav-bar-menu::margin`, `nav-drawer-menu::margin`, `choice-flow::backColourBorderHover`, extension `sgsHoverTilt3D`; `wishlist-panel::columns` never reaches the editor canvas | the named files | `wp-sgs-developer` (blocks), main thread (gates) |
| S0-6 Serial tail | merge, read every diff, `npm run build`, `run-gates.py --tier full`, reseed from clean HEAD, deploy eye-care-test then sandybrown, recalibrate every block through the queue (`SGS_HEADED=1`), rerun the audit scripts and the gate, update the report's numbers | — | main thread |

**Parallel shape:** S0-1, S0-2 and S0-5 touch disjoint files and run at once (S0-5's groups in separate worktrees);
S0-3/S0-4 run in the main thread alongside; the tail is serial. Pause the host queue before any build or reseed.

### Session 0 status (2026-10-05)

Every code group is built, on `main` and pushed. Fast gates 139/139, full tier 6/6. The framework DB is reseeded from HEAD
(stage 1 and stage 9: 58 removed attributes pruned; F6 0 violations). Block code at `4726700c1` is deployed to
eye-care-test and, identical block build, `7f770ebb5` to sandybrown; checksums verified on both and both motion-qa
probes are green. The wiring gate's blocking gaps fell from 1,781 to 201 (`3fee871a2`; the one accepted entry is
`google-reviews::scrollbarStyle::L5`, an L5 tracer blind spot).

| Group | State | Commits and result |
|---|---|---|
| S0-1 Seeder routing | done | `74771c855`: new modules `helper_maps`, `php_include_graph`, `php_preprocess`, `php_source_index`, `seeder_shapes`; unrouted core styling 628 to 368; agreement 1,405 of 1,418 unchanged; css_state and tier wrong 0; 3 intended `css_property` changes (testimonial `ratingSize` to height,width; `nav-bar-menu::collapsePoint` and `nav-drawer::modality` unrouted); 46 stale overrides removed; `sgs-update-v2.py` takes `--db` and `--classifications-out`; `db_lookup` honours `SGS_FRAMEWORK_DB`. `27ea22888`: a helper suffix painted only in a hover rule gets `css_state` hover. |
| S0-2 Framework bugs | done | `6f3601a32`: accordion-item scope hash includes context; team-member root typography (and `4726700c1`: typography by literal-prefix calls, because a loop hid the attributes from static gates); grid items to FR-32-12 as built (`includes/helpers-grid-item.php`, shadow lift); image-sequence aspect enum; `bgSvgMinHeight` consumer; shared `ShapeDividerPreview` and `utils/shape-dividers.js`. Spec 32 1.13 and the grid-item section of `.claude/rules/block-editor-controls.md`: `da8e38f84`. |
| S0-3 Calibration: dead classes | done in code | `c0d6c1d0d`: `calibrate.mjs` split into `lib/calibrate-props`, `-markers`, `-instances`, `-read` and `deploy-hash`; no 81-element cap; `::before`, `::after`, `::placeholder`, `::first-letter` layers (key `<path>::before`, as Track P's walker rows); `aria-controls` panels read as `@controls > <path>`; hover and focus on the styled BEM element with the closed panel opened; shrunk via ancestor class; scroll retry; preconditions from `blocks.variant_attr` and `variant_slots`, show/enable toggles, border partners, the overlay image (`calibration-targets.json` image per site) and layout-mode values; fixtures render elements 45 blocks lacked. Tests: `calibrate-classes` (17 of 18 red before), `calibrate-read` (headless Chromium; the old reader misses all 4 reads). `0b0630d6e`: `deploy-hash` normalises parameterised webpack modules; `SGS_CAL_CHUNK`. `5f783f373`: `lib/calibrate.mjs` imports `CAL_PREFIX`. |
| S0-4 Calibration: markers | done in code | `c0d6c1d0d`: markers for extension rows (DB type), gradients, keyword strings, media objects, transforms, wider lengths, non-length tiers, colour by role (`db.mjs` reads `role`), per-tier boxes, `flat_sibling` corners, two weights and per-device unit shape; `longhands()` maps colour and border gradients and shadow colour; container-query tiers are `containerTier`, not oneWidth. |
| S0-5 Paint gaps | done | `6f3601a32` (235 files): S0-5a to d canvas previews through shared utils (`container-wrapper-preview`, `section-preview`, `box-preview`, `wrapper-border-preview`, `radius-preview`, `border-preview::sgsBorderPreview`, `tierValueOf`, `tierLengthPreview`, `isCssGradient`). `c7e218b36`: `typographyPreviewStyle` mirrors every `sgs_typography_css_rule` declaration at the previewed tier. `4fabb61e7`: editor-render-parity CHECK A signal 6; 100 to 8 net-new, 8 buybox product-data rows accepted. `3fee871a2`: baseline 1,780 to 201. |
| S0-7 Found while building the gate | done | `ab840cae0`: dead context keys `sgs/formId` (16 blocks plus form), `sgs/tabsOrientation`, `sgs/tabsStyle` removed by codemod; `ListLayoutPanel` margin; choice-flow `backColourBorderHover`; choice-flow, choice-flow-question and wishlist-panel canvases. `317228625`: one context-key rule, `scripts/lib/context-keys.js`, used by dead-controls, editor-render-parity and the wiring gate. `762b0a103` and `b899a6f9a`: the wiring gate credits object-built `setAttributes`, name builders with leading arguments or a tier suffix and extension-imported controls, and gains advisory link L3-runtime. `4e8424f82`: `check-editor-render-parity.js` split into `scripts/editor-render-parity/`, byte-identical output. `f7d0f8452`: filter-search colours through `sgs_colour_value`; `check-custom-colour-survives` rule (c) raw-colour-declaration. |
| QC council standardisation wave (D1 to D10) | done | `6f3601a32`: radius tablet and mobile bug on 7 blocks, 17 tier copies, 45 gradient regex copies and 13 `boxShorthand` copies collapsed onto the shared helpers; `resolveColourToken` keeps named and oklch values; editor `<style>` CSS-injection guard; multi-button separators and content band; grid-item lift; gate `check-border-preview-twin.js`. Jest mocks: `4fa51e61d`, `7c714f86b` (every WP package the editor imports; `components/block-editor` mocks fabricate only names in `known-exports.json`, so a misspelt import fails). |
| Text indent, hero, team-member overlay | done | `6f3601a32`: paragraph containers use a sibling selector and 32 single-element `TextIndent` attributes are removed; the hero standard variant with tablet and mobile images paints through the shared Background panel path; team-member overlay bio typography. |
| Border defaults | done | `6f3601a32`: border style defaults to `solid` (13 attributes; multi-button `childBtnBorderStyle` keeps `''`). `1685d8d14`: border width 0 except exceptional types; border-named styles keep their border inside `:where()`; Google-branded google-reviews buttons are exceptional; gate `check-border-width-defaults.py`; editor marks use outline. |
| S0-6 Serial tail | done | Merge, build, full gates, reseed from HEAD, deploy of both sites; every block recalibrated on the local WSL mirrors (2026-10-05, 94 cache files; `2f28f14fd`, `659040b1e`, `585a2ffa0`, `115081bf4`); `/sgs-update` every stage at HEAD (0 drifted rows); audit counts in the audit report's section 7. |

**Incident (resolved).** An editor-route save on sandybrown, which runs the older schema, stripped newer attributes from
pages 2742, 3405 and 3448; all three were restored byte-identical from revisions. Lesson: memory
`editor-save-on-an-older-schema-strips-newer-attributes`. Interim guard: 6 oldshape baseline entries for
testimonial-slider `columns` and `gridTemplateColumns` on those pages (`46deb5ae1`, `7f770ebb5`, `04e0f31c6`);
`wp-update-block-attrs.js` now removes an attribute given as `null` in `--attrs`.

**Decisions (Bean, 2026-10-05).**
1. Grid items: Spec 32 FR-32-12 as built.
2. Text indent is paragraph-after-paragraph through a sibling selector; the single-element `TextIndent` attribute is removed.
3. Border style defaults to `solid`.
4. Border width defaults to 0 except exceptional types: outline and ghost buttons, inputs, selectable pills and swatches,
   dividers, border-drawn glyphs, transparent space reservers, forced-colours rules, border-named style variants (kept
   inside `:where()`) and Google-branded buttons. Spec 32 §Borders carries the rule; `check-border-width-defaults.py`
   enforces it.
5. Standardisation rule: always reuse the shared helper, injector, atom or extension (memory
   `match-helper-precedent-by-contract`); a second copy of a helper is a defect.

**Session 0 tail results (2026-10-05).** Hostinger's edge put a captcha on every automated login, so every block was
recalibrated on local WSL mirrors of both test sites (`scripts/local-wp/README.md`; proven equal to the hosted sites on
google-reviews, accordion and accordion-item). Summed over the 94 cache files, 2026-10-04 to 2026-10-05: settings
located 1,810 to 2,868, dead 711 to 605, noMarker 357 to 117, rejected 7 to 0; oneWidth 22 to 40 and untestedStates
28 to 55 rose with the ~1,060 settings reached for the first time. Detail: `.claude/reports/2026-10-04-route-data-audit/README.md` section 7.

### Parked from Session 0

Each item is named so nothing is lost; none blocks Session A.
- **P0-1 jest — DONE 2026-10-05 (`3f6cc9b74`):** `npx jest` → `Test Suites: 24 passed, 24 total`, `Tests: 294 passed,
  294 total`. Cause: the WordPress mocks lacked what the editor code renders (`BaseControl.VisualLabel` from the
  core-typography rebuild `bf2c903ba`, ref forwarding, `TabPanel`'s function child, `useRegistry`); fixed in the mocks.
  The same run cleared four other red suites (stale google-reviews barrel mock, wishlist labels, schema baseline
  refreshed for deliberate changes, tier fixture scripts now registered with jest), and fixed one source warning:
  `DesignTokenPicker.js` now names the `statesProvidedByParent` marker.
- **P0-2 PHPUnit — DONE 2026-10-05 (`34b92c5e5`, `a930251c1`):** `php vendor/bin/phpunit` → `Tests: 2055,
  Assertions: 5988, Skipped: 1` (green; the skip is the opt-in real-kses proof). One code bug fixed:
  `responsive-logo/render.php` printed an empty `data-animation=""` (built, NOT deployed: waits for Session C2's
  deploy). Every other failure was a stale test, each updated to the commit that changed the behaviour on purpose
  (cited in `34b92c5e5`); `StyleVariationManifestTest` is now `ThemeSnapshotManifestTest` on
  `sites/<client>/theme-snapshot.json`. The 18 PHPUnit doc-comment deprecations became attributes, and LeanSeedSize
  prints its size instead of raising a notice.
- **P0-3 Seeder remainder (368 unrouted):** 81 refused as ambiguous (shape-divider top and bottom element derivation
  drops `--top` and `--bottom`; wrapper fills against overlays), about 30 gradient siblings that need `attrMap`
  `css:color-gradient` or `css:border-color-gradient` in `block.json`, the rest with no evidence. The roster's
  `sgsHover*` and `sgsChildWidth` rows stay NULL (one-slot collisions).
- **P0-4 Wiring gate L5 tracer:** a value passing through a normalising variable and then a ternary
  (`google-reviews::scrollbarStyle`) is not traced.
- **P0-5 Structural borders with no control (34, class S):** give controls to card and panel borders (post-grid card,
  pricing plan, trustpilot card, wishlist row, product-search panel, choice-flow showcase panels); the rest stays design.
- **P0-6 Sandybrown rebuild:** rebuild pages 2742, 3405 and 3448 from their trees, then delete the 6 oldshape baseline
  entries.
- **P0-7 Gradient regex:** `utils/tokens.js` and `surface-tone.js` keep their own copy (circular import with
  background-preview).
- **P0-8 Live check:** the container may not load the svg-bg and shape-divider CSS on a page with a hero but no
  container.
- **P0-9 multi-button layout:** render passes `flex`; there is no layout control, by design.
- **P0-10 Calibration memory (Session C, before its serial tail's recalibration):** one `calibrate.mjs` run over 46
  blocks ran out of Node's default 4 GB heap after 43 minutes (on site-header); site-header itself needs
  `--max-old-space-size=8192` and `SGS_CAL_CHUNK=50`. Find what the run holds between blocks.
- **P0-11 Unclassified calibration outcomes — DONE 2026-10-05 (Session B):** the 605 dead, 40 oneWidth and 55
  untestedStates are split by cause in `.claude/reports/2026-10-05-session-b/calibration-outcomes.md` (data in
  `calibration-outcomes.json`, rerun with `classify-outcomes.py`, which imports `classify_dead.py::classify` unchanged
  after generating the `layer.json` it needs). Totals confirmed independently by the main thread against the 94 cache
  files: dead 605, oneWidth 40, untestedStates 55, top blocks cart 83, nav-bar-menu 58, product-card 51,
  nav-drawer-menu 39, hero 35, mega-panel 29.
  Dead by cause: FIXTURE_LACKS_ELEMENT 221, RESIDUAL 152, PORTAL_OR_CLOSED_SURFACE 94, READ_CAP_81 60,
  HOVER_POINTER_MISSES_CHILD 28, NEEDS_OVERLAY_COMPANION 12, NEEDS_BORDER_COMPANION 12,
  STATE_NOT_RENDERED_BY_FIXTURE 11, PSEUDO_ELEMENT 8, NEEDS_LAYOUT_MODE 7. The three `STALE_*` causes are empty
  (0, 0, 0) and every cache was measured on 2026-10-05, which confirms the rerun cleared the stale-measurement
  causes and leaves only structural ones.
  **No labelled cause needs block code**: FIXTURE_LACKS_ELEMENT, both NEEDS_*_COMPANION, NEEDS_LAYOUT_MODE and
  STATE_NOT_RENDERED_BY_FIXTURE are `calibration-fixtures.json` edits; PORTAL_OR_CLOSED_SURFACE, READ_CAP_81,
  HOVER_POINTER_MISSES_CHILD, PSEUDO_ELEMENT and both untestedStates causes are harness changes. Four fixes clear
  **203 of the 605** with no block code: open the cart surface (82), lift the 81-element read cap for nav-bar-menu
  (46), give product-card fixture content (47) and give mega-panel fixture content (28).
  Still unknown: the 152 RESIDUAL. The same file's newer `classify3` splits them into UNEXPLAINED 106,
  HOVER_POINTER_MISSES_ELEMENT 21, DB_STATE_MISSING_HOVER 11, NEEDS_BG_IMAGE 7, NEEDS_VARIANT_OR_TOGGLE 4,
  STATE_FOCUS_UNROUTED 2, NEEDS_LAYOUT_MODE 1, so any real framework gap is inside the 106 UNEXPLAINED.
  oneWidth (40) groups by which widths resolved (missing 768 only 21; multi-button 8, site-footer-row 7,
  site-header-row 7); the likely cause is that tiers follow container width, unproven. untestedStates (55) is
  51 hover elements hidden by an open panel (nav-drawer-menu 25, nav-bar-menu 11, nav-drawer 8, modal 4) and
  4 where site-header never took `is-header-scrolled`.
  Caveat recorded by the run: the labels are inferred from element presence and attribute names, not proved by a
  render, so they are strong leads rather than proofs.

## Track P: route prep, in a second session beside Session 0

**Closed 2026-10-05:** every unit built, checked and proven (status below). What it leaves open sits in the units it
serves: Session B's B1 and B4 rows, register S1 (the button timing), Spec 47 §5 stage 3 (walker items 2, 4, 5 and focus
and active states).

Code-only units from Sessions A and B that need neither Session 0's repairs nor the host, pulled forward so the sweep
can start the moment Session 0's tail ends. **File ownership (no overlap with Session 0):** Track P owns
`scripts/parity/**` (the walker, `collect.mjs` included: it also takes S0-3's walker-side `::before`/`::after` read),
`scripts/computed-route/solve.mjs`, `lib/solve-rows.mjs`, `lib/ledger.mjs`, `lint.mjs`, the new `sweep.mjs`, and
`sites/eye-care-ward-end/build/qa/independent-check.mjs`; Session 0 owns `calibrate.mjs`, `lib/calibrate.mjs`, the
calibration fixtures, the seeder and every block (`lib/calibrate.mjs` reads `collect.mjs`'s `DEFAULT_PROPS` and
`HOVER_PROPS`, so the walker's read properties are calibration's too). Units: A-1 (all five walker fixes plus the `::after` read), A1's
rounds-0 test, A3's `sweep.mjs` aggregator and tests (built against the existing solve reports), A5's
`independent-check.mjs::accepted` ledger fix, and B4 divergence protection. Done when each has its MUST FAIL test,
tests and lint pass, it is pushed, and the About measure-only proof of A-1 passes.

**Status (2026-10-05): every code unit built, pushed and proven.** A1 `4f70dda13`; A-1 part 1
(timings and `::before`/`::after` in `collect.mjs`, on main for Session 0's recalibration) `4f70dda13`, part 2 (DevTools
reads) `f7d9003f5`; A5 `fde61f00d`; B4 `5c20163c2`; A3 `65935f7d7`. Each unit's MUST FAIL test was shown red against the
old code. The route gate's command is unchanged (`node scripts/computed-route/lint.mjs --surfaces
sites/eye-care-ward-end/build/surfaces.json`): it checks the ledger against the register named in
`sites/eye-care-ward-end/build/qa/ledger.config.json` (`--register` overrides; a ledger with entries and no register fails). Proof: the About proof ran on 2026-10-05 against Session 0's local mirror (localhost:8081, About rebuilt from its tree, 0 invalid blocks) and the draft served from its source folder (identical to the hosted draft: 24 pairs, 1,393 values): 1 distinct open issue, real (below); the 12 About ledger decisions held; forced hover, pseudo layers, declared widths, row spacing and the settle change added no rows. It also found 8 false rows (the draft's CSS entrance timings against live's script-driven SGS entrances of the same durations), fixed in the walker (animation timings compare only where both sides use CSS keyframes). The open issue: S1's button hover timing does not reach any sgs/button (About's "Shop the range" transitions over 0.3s, S1 decided 0.25s): `button/render.php` always emits `.{uid}.sgs-button{transition:all {transitionDuration}ms}` and `block.json::attributes.transitionDuration` defaults to 300, so the block default beats `buttonPresets.default.hover-transition` (found with the new DevTools read: the per-instance rule wins). Framework repair for Session 0 or C: emit the per-instance transition only when the attribute is set (register S1).

**Checked (2026-10-05).** /code-review high on the range found four Track P defects, fixed in `92bd82de0` (forced hover
no longer repeats a rest difference as a hover row; ledger entries and accepts keep `::before`/`::after` rows apart;
a declared width never replaces a ledger-held width; the settle floor is 900ms again, proven by a local late-reveal
page that reads opacity 0 under 300ms). Then triage reads `includes/` helpers (`8b153abb3`), the flex alignment noise
row is gone (`8f032be03`), and /qc passed 15 scenarios on local pages and real data, fixing triage's missing-report
error on the way (`2035bb6ce`; report `~/.claude/pipeline-state/qc/qc-trackp-20261005-0128/stage-6-report.md`).
Measured in Session A: About's four-width walk took 35s on the host against 31s on 2026-10-04, so the DevTools node
lookups stay unbatched. The four review findings in Session 0's code are handled by Session 0 (deploy-hash `0b0630d6e`, calibration chunk probe, the tier helpers in its fix wave, jest mocks `7c714f86b`).

## Session A: whole-site sweep (measure, never write)

**Done (2026-10-05, status below). Done meant:** every surface has a walker report taken from one commit with live = HEAD; every register item carries
one sweep status; every claimed fix is confirmed live or reopened; register, Spec 47 plan Progress, Spec 47 §5 and
LEDGER Front F state the result. **Actual:** about 3 h 15, the A4 redo included.

| Unit | Does | Files | Depends on | Test |
|---|---|---|---|---|
| A-1 Read what DevTools reads | **Built and proven 2026-10-05 (Track P, `4f70dda13`, `f7d9003f5`, `9fa6bbbe3`; About on the local mirror: 1 real open issue, S1's button timing):** `parity/lib/devtools.mjs` (`settleAnimations`, `forcedHover`, `declaredValues`), timings and pseudo layers in `collect.mjs`, `textRun` rows; GAP-CHECKLIST §19. Before the sweep, so it measures truthfully (Bean, 2026-10-04: these gaps are data DevTools already shows). Each a general walker fix with a MUST FAIL test and a tool-log line: (1) settle on `document.getAnimations()` finishing instead of the fixed `state.settle ?? 900` wait in `draft-live-walk.mjs` (no row read mid-entrance); (2) every pair's hover read by forcing `:hover` through the Chrome DevTools Protocol (`CSS.forcePseudoState`), not only pairs flagged `hover` in a hand config; (3) declared values from the matched CSS rules (`CSS.getMatchedStylesForNode`) beside computed ones, so a width or max-width the draft declares (Contact's 168px address) is written instead of left as a used value; (4) a text-run pair also compares the spacing between its rows (their boxes' tops), giving the hours list its gap; (5) transition and animation timings compared (duration, delay, easing), which computed style already holds. Panels are handled in A2 by opening them before pairing | `scripts/parity/draft-live-walk.mjs`, `scripts/parity/lib/collect.mjs`, `scripts/parity/lib/chrome.mjs`, `scripts/parity/lib/compare.mjs`, `scripts/computed-route/tests/walker-refs.test.mjs` | none | each fix's MUST FAIL test; About still at 0 open on a measure-only run (no new rows from the fixes on a solved page) |
| A0 Live = HEAD | (after A-1 lands, so HEAD carries it) Queue runner in the scratchpad (serial, `SGS_HEADED=1`, STOP file). Deploy HEAD (includes 508217f03) to eye-care-test; check the theme snapshot matches `sites/eye-care-ward-end/theme-snapshot.json` (`push-theme-snapshot.py` if not); rebuild all 17 trees with `wp-build-page.js`. Before rebuilding, `git diff --ignore-cr-at-eol sites/eye-care-ward-end/build/*.tree.json` must be empty (`about.tree.json` differs in line endings only on 2026-10-04). Record the HEAD hash; tell peer sessions not to deploy to eye-care-test while the queue runs **When Hostinger's edge shows automated browsers a captcha** (it did after the 2026-10-05 calibration bursts), measure on the local WSL mirror instead (Track P's About proof, 2026-10-05): serve the draft from its source folder (`python -m http.server 8090` in `sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff`, page `Eye%20Care%20Birmingham.dc.html`), point a scratchpad config that imports the surface's `qa/parity/<s>.full.mjs` at it and at `http://localhost:8081/<path>` (with `divergences` as an absolute path), rebuild the tree there with `wp-build-page.js --env-file .claude/secrets/local-eye-care.env --env-key LOCALEYECARE`, walk the four widths with `--lean` and classify with `solve-rows.mjs::classify` and `solve-report.mjs::wholePage`. First prove the local draft equals the hosted one: About matched 24 pairs and 1,393 values against `qa/solve/about/2026-10-04T05-03-56/draft-cache-1440.json`. | queue runner (scratchpad) | none | deploy verifies by checksum; every rebuild reports 0 invalid blocks |
| A1 Measure-only mode | **Test built 2026-10-05 (`4f70dda13`):** `solve.mjs::solveLoop`, `tests/solve.test.mjs`. Proven by code reading (risk review, 2026-10-04): `solve.mjs --rounds 0` stamps refs (`addRefs`, `writeTree`), rebuilds the live page, walks once and classifies, and breaks before `writeRound`. It walks 4 widths (375/768/1440/1920), and shop and product rebuild a site-wide template. Add one test that rounds 0 never calls `writeRound`, then use it | `tests/` | none (first action, 5 min) | the new test, red when the break is removed |
| A2 Pair every surface | For each surface without `walkerFull`: measure-only run (stamps refs), then `pairs.mjs --surface <s>`, set `walkerFull`. Order: help, home, footer, header, then the rest. Hand configs are shared (`header.mjs` serves header, mobile-menu and the 4 megas; `help.mjs` serves help and size-guide), so a panel surface pairs with its walker state open on both sides (`pairs.mjs --state <name> --width <w> --recheck <widths>|none`, built 2026-10-05); a surface still pairing below half its blocks is recorded with its reason (PA-1, PA-2) | `surfaces.json`, hand configs in `qa/parity/`, generated `qa/parity/*.full.mjs`, `qa/pairs/*.json` | A0, A1 | each pairing report lists kept and left-out blocks with reasons; `lint.mjs --surfaces` passes |
| A3 Measure all | **Aggregator built 2026-10-05 (`65935f7d7`):** `sweep.mjs`, `lib/sweep.mjs`; on today's six reports 331 issues, each surface's total equal to its `wholePage` count. Measure-only run on all 17 surfaces, plus walker runs of bag, checkout, confirmation hand configs. A small summary command aggregates every report: per surface, distinct issues by class and Unresolved reason, ledger-accepted rows, and blocks left unmeasured. Rows from a shared config count once (deduplicated by ref and property). Output: `qa/sweep/<date>/sweep.json`, one row per open issue `{ surface, ref, block, property, widths, state, kind, class, reason, report }` | new `scripts/computed-route/sweep.mjs` (aggregator, reused in B), `tests/sweep.test.mjs` | A2 | test: totals equal the per-surface reports; two surfaces sharing a config count a shared row once |
| A4 Register ↔ sweep | **Tooling built 2026-10-05 (Track P):** `scripts/computed-route/register-sweep.mjs bundle --register <register> --sweep <sweep.json> --pairs sites/eye-care-ward-end/build/qa/pairs --out <dir>` writes the eight group bundles (201 items, 0 ungrouped on 2026-10-05), each agent gets the brief `sites/eye-care-ward-end/build/qa/sweep/2026-10-05/a4/agent-brief.md` with its bundle, and `merge … --verdicts <files> --out <copy>` rejects a set with a missing or doubled verdict, a still-open claim that does not cite one exact row and quote its values, a clean claim a row contradicts or no pairing measured, or a site-wide clean whose covered items are not all clean and measured; it writes the Sweep column to a copy for review. Every register item gets one sweep status (rules below). Parallel read-only Sonnet agents, one per register section group (Header + megas + drawers; Footer + floating WhatsApp; Home; Shop + product + lens pop-up; Lenses + About + Help + Contact; Checkout + confirmation + content; site-wide S1 to S12; route findings CR1 to CR21), each given `sweep.json` and its sections, returning `[{ id, status, evidence }]`. Main thread re-checks every **clean** claim against `sweep.json`, merges, and is the one writer of the register | register (new Sweep column; the existing Status column stays) | A3 | 100% of items carry a status; every clean item cites its report path and the paired ref covering it |
| A5 Live proof of fixes | **Ledger fix built 2026-10-05 (`fde61f00d`):** `lib/ledger.mjs::judgeIndependent`; the live re-checks ran 2026-10-05 (`sites/eye-care-ward-end/build/qa/sweep/2026-10-05/a5/README.md`). First fix `qa/independent-check.mjs::accepted`: it matches `e.ref`, but every ledger entry stores `node`, so it accepts nothing (proven 2026-10-04 by reading the code; MUST FAIL test with one ledgered row). Then claimed fixes (items marked built/closed, the S-items) and A4's "clean" items are re-checked live: `qa/framework-fix-check.mjs`, `qa/independent-check.mjs --surface about` and `--surface contact`, and one combined headed Playwright job for the not-walker-measurable items (hover animations, sticky header, drawers) | `qa/framework-fix-check.mjs` (add checks only where a claimed fix has none) | A3 (runs alongside A4) | each claimed fix: PASS with its command, or reopened in the register |
| A6 Write it down | Register statuses; Spec 47 plan Progress gets the sweep table in place of the per-surface list; Spec 47 §5 Residual (bump `spec_version`); LEDGER Front F; `/handoff` | docs | A4, A5 | handoff preflight 4/4 |

**A4 status rules (decided):**
- **still open:** a `sweep.json` row on the item's surface touches the element and property the item names.
- **clean on the walker:** a paired ref covers the item's element and no row touches it. A site-wide item (S1 to S12) is clean only when every surface in its Covers column is clean; one unmeasured surface makes it **partly measured**.
- **not walker-measurable:** the item is behaviour, entrance or load motion (the walker compares animation timings only where both sides use CSS keyframes; SGS entrances are script-driven), keyboard, focus, a11y, content or Site Info. Hover is walker-measurable: the walker forces `:hover` on every pair (`scripts/parity/lib/devtools.mjs::forcedHover`). The agent decides; the main thread checks 10% of them (at least 5), plus every item marked clean or closed earlier without a cited report path.
- **closed earlier:** the register already records it closed with evidence, and the sweep agrees. If the sweep disagrees, it is **still open** (a regression), flagged in the handoff.
- A5 takes every clean, closed earlier and partly measured item for a live check.

**Gate A (review-gate):** pass when every surface has a report from A0's recorded HEAD (a report from another HEAD fails) and every register item has a
status. Fail when a surface cannot be measured (host 403, pairing below half its blocks): record it with its reason
and continue; never block the session on one surface.

### Session A status (2026-10-05): done

All units ran on the hosted test site (no captcha; one host job at a time). Live = HEAD was proven by checksum before
measuring: every file of the deployed sgs-blocks build equals the local build of `4726700c1` once line endings and
webpack's module ids are set aside, and the deployed theme.json equals the snapshot's. Recorded HEAD for every report:
`1ea514ae8` (no block code after `4726700c1`).
- **A1:** the rounds-0 test (`tests/solve.test.mjs`) already existed; shown red with the break removed.
- **A2:** every surface paired. Two pairing fixes on the way: `pairs.mjs --state --width --recheck` pairs a panel with
  its walker state open (`e32edfbf6`; the megas went from nothing at rest to all their blocks), and pairing runs the
  hand config's `live.open` and lifts a landmark exclusion holding the surface (`ebf518e89`; lens). Coverage per
  surface: the Spec 47 plan's Progress table.
- **A3:** `qa/sweep/2026-10-05/sweep.json`: 2,373 distinct open issues over 17 surfaces, each surface's total equal to its
  report's `wholePage` count once the sweep counted unmapped-state rows (`62f1f0e04`; shop had lost 163). About's walk
  35s against 31s on 2026-10-04: the DevTools lookups stay unbatched.
- **A4:** the register's Sweep column: 77 still open, 63 not walker-measurable, 19 closed earlier, 15 partly measured,
  27 clean on the walker. A first Sonnet pass was rejected as shallow (it cited any row on a wrapper block and gave no
  values); `register-sweep.mjs merge` now refuses a still-open verdict that does not cite one exact row (report, ref,
  element path, property) and quote its values with a sentence tying the item to that element, a clean claim without
  that sentence, and hover given alone as unmeasurable (`79ad3953f`). Eight Opus agents redid it under that gate
  (verdicts and brief in `qa/sweep/2026-10-05/a4/`). Groups 4 and 5 were re-run once Help and the product page were mapped to the size-guide surface
  (`lib/register-sweep.mjs::SECTION_SURFACES`). Register items recorded closed or clean but open on the sweep:
  100, 101, 102, 104 and 131 (Lenses, About, Contact) and N15 (the See all reviews button black where the draft is
  blue); each is explained in Appendix B. N41 and 113 are closed: B4 ledgered S1's lift on Lenses and Help (D-34 to D-39). The main thread checked 6 still-open verdicts and every clean one against their rows, 7 of the
  not-walker-measurable items and every closed claim without a report.
- **A5:** `qa/sweep/2026-10-05/a5/README.md`: framework fixes 37/37 PASS; About independent 0 differences; Contact
  independent 106 rows against the walker's 27 (reconciled in Session B to a 6-row residual, Appendix B); the header sticks but CR2's scrolled-state class was not
  seen (still to prove); drawer links show no fade entrance (14 open; the rise was not sampled). S3's framework half
  holds (no hover fade: footer and contact phone PASS; the header phone is hidden at 375 and 768, so untested); its tree
  half (black hover colour) is open, and the sweep shows the footer business-info hover colour still differing.

### Parked from Session A

None blocks Session B.
- **PA-1 Drawer pairing:** `pairs.mjs` collects no words inside the open live phone drawer (`.sgs-nav-drawer[open]`;
  no landmark exclusion applies; cause unproven). mobile-menu is measured by header.mjs's drawer pairs only.
- **PA-2 Per-width draft finders:** shop's and product's kept finders hold other words at 375 and 768 (the draft
  rebuilds its layout per width), so 17 shop blocks are left out. A finder chosen per width would keep them.
- **PA-3 Hand-pair refs in the A4 validator:** `register-sweep.mjs merge` counts only auto-paired refs as measured;
  a hand pair's live trace names its block (`header-phone` is `cr-ref-header-11`), so N1 had to be recorded closed
  earlier rather than clean.
- **PA-4 Independent check reads off-screen text:** `independent-check.mjs` counts screen-reader-only text parked at
  -9999px as painted (9 Contact rows); the walker's collector skips it (`auto-collect.mjs::srOnly`).
- **PA-5 Confirmation needs a paid test order:** the only order on eye-care-test is cancelled (652), so its page lacks
  the tick and continue link; a paid test order makes the walk complete.

---

## Session B: audit the three-way split, protect decisions, plan the fixes

**Done 2026-10-05.** All five units and both appendices landed (`97ac6f95a`, `4e36e5775`, `124993395`, `427277644`,
`919c23be4`, `314add9c6`). Every one of the 2,373 open issues carries one class with proof (W 1,710, F 163, T 447,
U 28, D 17, deferred 8); the 78 unmeasurable register items carry a measure-gap tag; Bean's decisions can no longer
be overwritten (B4, N41 and 113 closed); Session C's plan is written
(since re-split into `plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md`
and `plans/2026-10-05-eye-care-session-c2-finding-assessment.md`). **Gate B is answered: yes,
route fixes first (Bean, 2026-10-05).**
Actual against the estimate: about 2 h, matching the realistic figure.

### The classes (written into Spec 47 §5 as the rule)

| Class | Means | Proof required |
|---|---|---|
| **D: decided divergence** | Bean chose a different result from the draft | a register decision ID; then a ledger entry citing it |
| **F: framework gap** | no setting on the block, its enclosing blocks or its extensions can produce the draft value; or a hardcode beats a setting | DB query of every attribute (including rows with `css_property` NULL) + the block's `render.php`/`style.css` by symbol + the extension roster; for a hardcode, the winning CSS rule |
| **W: walker or route gap** | the row is a measuring artefact, a consequence of another row, or a setting exists but the route cannot find, calibrate, pair or write it | the setting that exists (file::symbol) or the parent row it follows from |
| **T: tree or content** | fixable now in the page tree or Site Info | the value to write |

Rule: Solve's "Missing setting" starts as **W until proven F**. A walker gap is never closed by calling it missing
functionality.

**Measure-gap tag (Bean, 2026-10-05).** Every register item Session A left **not walker-measurable** or **partly
measured** (78 on the strict A4 pass: 63 and 15) also gets one tag saying why it is not measured, using Spec 47's role
split: `content-fixable` (the draft shows it and a block setting can hold it: words in a `content` setting, an element
shown by a `boolean-visibility` or variant setting, a link; Spec 47 §3.2/§3.3 presence, text and link, not built yet),
`handover` (content outside the tree: Site Info, product data, WooCommerce text, a page the draft never shows; name its
owner), `behaviour` (FR-47-7 flows: clicks, filters, add to bag, step changes), `FR-47-6` (a walker read not built:
focus and active states, script-driven entrance motion, link coverage), `pairing` (the element exists on a measured
surface but no pair reaches it) or `PA-1` to `PA-5`. A missing link or element that no block setting could produce is
the framework's (Missing setting), not content. The fix side comes from the register's Type column (framework repair,
framework new, tree, content). Output: one table in this plan's appendix, so Session C's framework list and Spec 47's
remaining work separate cleanly; the `content-fixable`, `pairing` and `FR-47-*` rows go to Spec 47 §5 Residual.

| Unit | Does | Files | Depends on | Test |
|---|---|---|---|---|
| B0 Route data audit | **Investigation done 2026-10-04:** `.claude/reports/2026-10-04-route-data-audit/README.md` (wiring fingerprints, seeder routing gaps, every calibration outcome classified, DB and block-file inventory; rerun scripts beside it). Its fixes were Session 0. **Rerun done 2026-10-05 at `b551d9eb5`:** the production wiring gate passes with no new gaps (201 baselined, 10.5s); 5,742 attributes split paint-css 4,288, js 166, not-paint 1,288 (the link split the report's §7 left unrecorded); blocking findings unchanged from Session 0 (L3 186, L5 12, L2 1, L3-tier 1, L6 1); advisory L3-state 624, L3-runtime 25, L6-token 20 against 19, the one new entry being `sgs/google-reviews::dataSource`'s `maps-link--place` modifier from the parallel attribution track (advisory, never blocking). Rerun the split with `python plugins/sgs-blocks/scripts/check-wiring-fingerprint.py --json <file>` (the dump is 2.8 MB and regenerable, so it is not committed). Not rerun, with the reason the report's §7 already records: the `seeder/` chain does not run as committed (`final.py` needs `why.py`'s output, `runcls.py` and `runpatched.py` open a database without `property_suffixes`, `cmp.py` needs the agent's `regen-classifications.json`), and the inventory needs no rerun because no DB table changed. Residual into B1: none blocking; the 368 unrouted core-styling rows and the 605 dead and 117 no-marker calibration settings are B1's source-pass input | the report; fix designs into Session C's catalogue | Session 0 | residual counts recorded beside the 2026-10-04 ones: done |
| B1 Triage script | **Script built 2026-10-05 (Track P):** `node scripts/computed-route/triage.mjs --client eye-care-ward-end --surface <s>` writes `qa/triage/<s>.json`: a candidate class per distinct issue, W, F, T or U (a box row nothing explains), with its evidence. Its checks: the resolver run read-only; fitting attributes (NULL css_property rows and discovered enums included); roster extensions; enclosing calibration `reaches`; consequence; transient; used value; and a string-level source pass: the block's own `render.php` and `style.css`, plus the PHP helpers `render.php` reaches two hops deep under `includes/` (`lib/triage-source.mjs`), cited as `file::symbol` (Lenses' container gap: `class-sgs-container-wrapper.php::SGS_Container_Wrapper` emits `'gap:' . sgs_container_gap_value( $gap )`). On 2026-10-04's reports: contact-form 23 issues (W 17, F 6), lenses 33 (W 25, F 3, U 5). For B2, check these: lenses container-25 gap is held at 0px but paints 16px (does the helper treat 0 as empty?); `layout-row` consequences compare no deltas; parent heights that sum several child deltas land in U. **Done 2026-10-05:** rerun on all 17 surfaces, and every surface's triage count equals its sweep `issues` (2,373 = 2,373; W 1,562, F 338, T 445, U 28). The rerun found the script read only the four Solve classes while the sweep counts a fifth, so 323 unmapped-state rows carried no class at all; `issuesOf` now reads them in the sweep's order (`97ac6f95a`, with a negative control). The calibration dead and no-marker audit is P0-11, done above. Built from B0's findings. For every Hardcode, Missing and Unresolved row of the sweep, checks mechanically: attributes on the block whose name or `css_property` fits (DB, NULL rows included); extension roster settings; enclosing blocks' calibrated `reaches`; whether the row's node has an open parent row with the same delta (consequence); transient properties (transform, opacity, transition mid-animation); used values. With `--rounds 0` Solve writes no gaps, so every row reads "not written": the script runs the resolver read-only (`lib/resolve.mjs`, no `setAttr`) to get each row's `no-setting`, `uncalibrated` or `breaks-layout` reason first. Then reads the block's own source for the rows still labelled missing or hardcode: does `render.php` read the attribute, and how does it emit it (class modifier, custom property, inline wrapper attribute); which rule in the block's `style.css` declares the property (the matched rule's stylesheet and selector from A-1's `CSS.getMatchedStylesForNode` names it on the live page). The same pass audits whatever calibration dead and no-marker settings and no-route styling attributes remain after Session 0 (B0's rerun counts), classing each as marker gap, missing DB route or render that never reads the attribute. Writes a candidate class and its evidence per row | new `scripts/computed-route/triage.mjs` + `lib/triage.mjs`, `tests/triage.test.mjs` | Session A | MUST FAIL tests: a known existing setting (textarea width via its extension) is never labelled F; a known consequence row is labelled W |
| B2 Prove each candidate | **Done 2026-10-05:** six parallel read-only **Opus** agents (not Sonnet: the proof gate needs source reading) grouped by mechanism, one shared brief (`.claude/reports/2026-10-05-session-b/b2/BRIEF.md`), 271 combos over 338 candidate-F rows. Result: F 163 rows, W 148, D 17, T 2, deferred 8. Gate: 130 of 130 F cite a DB row or query, 128 cite both that and a `file::symbol`, 0 cite neither, every one names a precedent. Main thread re-verified every F mechanism (~15 claims) and the W sub-mechanism split; one agent claim corrected (the heading `text-wrap` reach) | Appendix B of this plan | B1 | every F has the proof the class table requires: met |
| B3 Group and match helpers | Proven F gaps grouped by mechanism (for example layout alignment on blocks without it, inner-element typography, text max-width, hover effects) and matched to the shared helpers and declarations that already solve it elsewhere (`SgsLengthControl`, box control, typography helpers, `supports.sgs.boxFamilies`, extensions, the form's Field style group as the parent-styles-children precedent) | the catalogue `reports/2026-10-05-session-b/b3-catalogue.json`, now read by Session C2 (the groups are filing labels for review, never a unit of work) | B2 | each group names its precedent block and helper |
| B4 Divergence protection | **(1), (3), (4) built 2026-10-05 (`5c20163c2`, `fde61f00d`):** decided values are Solve's target (`judgeDivergence` sets `decided`, `draftValues` reads it); entries carry `register: [ids]` checked by `lint.mjs --register`; D-1 removed (Bean 2026-10-05: the subtext keeps its margin; the 375px name-field drop stays open under CR15/N45b). **(2) done 2026-10-05 (Session B).** S1's agreed lift is ledgered on Lenses and Help, closing register N41 and 113: D-34 and D-35 on `cr-ref-lenses-28` (`sgs/button` "Choose a frame"), D-36 and D-37 on `cr-ref-help-39` ("Contact me") and D-38 and D-39 on `cr-ref-help-40` ("Call"), each a `transform` entry targeting `matrix(1, 0, 0, 1, 0, -3)` and a `hover-effects` entry targeting `lifts`, over widths 768, 1440 and 1920, citing `["N41","S1"]` and `["113","S1"]`. Each ref was confirmed against the surface tree before writing, and the rows read draft `none` against live `matrix(1, 0, 0, 1, 0, -3)`: the draft does not lift, so without an entry Solve would write the draft's no-lift back over Bean's decision. `lint.mjs --register` passes, and a planted `NOT-A-REAL-ID` turns it red (negative control). The `solve.test.mjs` decision tests are green ("MUST FAIL TO OVERWRITE A DECISION", both cases). Audit for any other register decision that changes a measured value and lacks an entry: none. Eight register items read as decisions; S4 and 104 are already ledgered; S6 (page top spacing 48/90) and 93 with 18 (the red inline notice is the current wrong state, and item 18's toast removes it; its row is `cr-ref-product-4` `position`, draft `fixed` against live `static`) are fixes **towards** the draft, not divergences; N11 is behaviour; 160 and 162 are content decisions no walker read reaches; D7 needs no build: `sgs/google-reviews` already has an in-flow `badge` variant (only `floating-badge` is sticky), so it is a tree value — set `variant` to `badge` in the header tree. No lint enforces the register-to-ledger direction because the register carries no machine-readable marker for "this decision changes a measured value", so a check would be heuristic; Gate B asks Bean whether to add that marker. Proven 2026-10-04 by reading the code: Solve skips a row the ledger accepts, but when live drifts from a decided value `parity/lib/divergences.mjs::judgeDivergence` leaves the row open with `diff.draft` set to the text `"<value> (D-n)"`, while `solve.mjs::writeRound` takes its target from `solve-rows.mjs::draftValues` (the raw draft style). So the next Solve writes the draft over Bean's decision, and `guard.mjs` cannot measure that row (`"0px (D-1)"` fails its px parse). Build: (1) Solve's target for a ledgered row is the entry's decided value, parsed from the entry, not from the text; (2) every register decision that changes a measured value becomes a ledger entry citing its register ID; (3) `lint.mjs` fails an entry whose ID is not in the register; (4) the independent check (fixed in A5) fails when live differs from the decided value | `lib/solve-rows.mjs::draftValues`, `solve.mjs::writeRound`, `parity/lib/divergences.mjs`, `lint.mjs`, `divergences.json` | Session A's statuses | MUST FAIL tests: with a value entry whose live has drifted, `writeRound`'s target equals the decided value; a planted drift turns the independent check red |
| B5 Plan Session C | Write the orchestration (below) in detail from B3's catalogue | this plan | B3 | `/strategic-plan` gates |

**Why built in rather than an agent editing settings afterwards:** an after-the-fact edit is overwritten the next
time Solve runs on that surface, and nothing would notice. A ledger entry is read by the walker, Solve and the
independent check, so a decision holds on every run and a drift turns a check red.

**Gate B (go/no-go, Bean):** Bean gets a one-page plain-English summary: for each class, the count, 3 worked
examples (what it looks like on the site and why it is that class), and for the F gaps the fix groups with a per-group
effort and files touched, plus one recommendation. One question: approve fixing these groups? B4 touches only route
and ledger code under `scripts/` and the ledger file, never blocks or theme, and lands as its own revertable commit.
No-go: the F gaps stay in the register (Sweep column) and work goes straight to Session D.

---

## Session C: repair the measuring route, then Session C2: assess the findings

**The work runs in two sessions.** The plan is in two files:
`plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md` and
`plans/2026-10-05-eye-care-session-c2-finding-assessment.md`.

**Why the split.** The fix register (`plans/2026-10-02-eye-care-fix-register.md`) is the source of truth: it already
holds the decided issues and the agreed fixes. The 163 **F** rows are *findings to assess*, not a list of gaps to
build, and a walker row never creates a new fix. Many of those findings ignore how the framework works — a mega
menu, a modal and a choice flow are CPT canvases composed from blocks, and a setting can arrive from a parent by
block context — so "this block declares no setting" is not a defect by itself. Bean: the lens flow looks almost
perfect, yet it carries 35 F rows. **That is a route defect, so the route is repaired before the findings are
judged.** A mechanism group is a filing label for review and never a unit of work;
`SGS_Container_Wrapper` is never a blanket fix, and "the only hover-decoration control" was false
(`sgs/button::textDecorationHover`, `sgs/nav-drawer-menu` and the underline-slide utilities all exist; S2 and S12
already decide link behaviour).

**Session C: Spec 47 route and logic gaps only. No block controls, no shared CSS files.** Every "not built", "not
started", "open" and "known measuring gap" in Spec 47, plus the new canvas-awareness rule (**FR-47-8**, **R-47-12**),
plus the calibration-failure fixtures and the sandybrown oldshape blocker. The main thread writes no feature code:
nine lanes in three waves, each lane one worktree subagent with a fixed file list, a gate after each wave.
**Done when** a fresh measure-only sweep and triage have run on the repaired route and the new F count is recorded.
Nothing is deferred; the one item not built is Spec 47 stage 5, a second draft, which is blocked on a second draft
existing.

**Session C2: assess every finding, on the post-C sweep, never on the old 163.** Match each row to a register Ref,
fact-check it against canvas surfaces, parent-by-context settings, existing controls and decided register items,
then live-test it with Playwright at 375, 768, 1440 and 1920 with screenshots and computed values. Register items
still marked open that the findings do not cover get a live verdict too, and **each one the route missed is a new
Spec 47 gap, listed against the section that should have caught it.** Only then does Bean get one yes/no list, and
only approved items become framework fixes (the old W1 and W2, one owner per block, under gates W1, W2 and TAIL).

Google reviews attribution (2026-10-05): done and live on eye-care-test and sandybrown (deploys at `7f375f765`; detail in `.claude/plans/archive/2026-10-05-google-reviews-attribution.md`). The block's colours and sizes follow Google's UI (40px pills and arrows), an accepted difference from the theme's colours and the 44px target (Bean, 2026-10-05); do not flag them as gaps.

## Session D: back to walker work

Ranked by the sweep, not by a fixed surface order: walker gaps that hold the most open rows across surfaces first,
then each surface to 100% with Solve under the existing done line (Spec 47 plan Progress).

## Risks

| Risk | Effect | Mitigation |
|---|---|---|
| Host 403s or a captcha under a long serial run | Sweep stalls | `SGS_HEADED=1`, one job at a time, `waitOutHostCheck`; on a captcha, the local mirror method in A0; a surface that fails twice is recorded and skipped |
| Stale live pages (deploy or tree drift) | Sweep measures old code | A0 deploys HEAD and rebuilds every tree before any walk |
| Measure-only mode writes a setting | Trees drift | A1's test; `git diff --ignore-cr-at-eol sites/eye-care-ward-end/build/*.tree.json` after A3 shows only added `cr-ref-` classes |
| Shared hand configs | The same header row counted 6 times; panels pair nothing | A2's per-panel configs; A3 dedupes by ref and property |
| Register edited by other sessions | Lost edits | the main thread is the only writer; re-read the file and `git diff` it right before writing |
| Bean's points file staged by accident | Bean's private notes committed | check `git diff --cached --name-only` before each commit has no `Bean Points` path |
| Session C2 merges clash in shared helpers | One reseed hides which queue regressed | the four shared files land first in the main thread under Gate W1, then the per-block queues under Gate W2, then one tail and one sweep. Session C touches no block, theme or shared-helper file at all |
| A panel or per-width layout pairs few blocks | Under-counted issues | Panels pair with their walker state open (`pairs.mjs --state`); what stays unpaired is listed with its reason (PA-1 drawer, PA-2 per-width finders) |
| Triage over-labels W to keep F small | Real gaps ignored | B2 agents prove both directions; main thread re-checks every reclassification to W from Solve's Missing label |

## Gates

| Gate | After | Pass | Type |
|---|---|---|---|
| A | A0 to A6 | every surface measured from one HEAD; every register item has a status | review-gate |
| B | B1 to B5 | every open issue classed with proof; divergence MUST FAIL test red then green. **Answered 2026-10-05: yes, route fixes first**, and the remaining work re-split into Session C (route) and Session C2 (findings) | go/no-go (Bean) |
| C | Session C | every unbuilt Spec 47 item built or proved already built; a fresh measure-only sweep and triage run on the repaired route; the new F count recorded. Gates 1 to 3 in Session C's own plan | auto-gate |
| C2 | Session C2 | every finding matched, fact-checked with a citation and live-tested; Bean has answered yes or no per item; approved rows closed on a fresh sweep. Gates C2-1 to C2-3, then W1, W2 and TAIL, in Session C2's own plan. Fail: revert that queue's merge, re-sweep; never start Session D with new rows | go/no-go (Bean), then auto-gate |

---

## Appendix A: why the 78 unmeasured register items are not measured (B-tags, 2026-10-05)

The measure-gap tag for every register item the strict A4 pass left **not walker-measurable** (63) or **partly
measured** (15). Tagged by one read-only Opus agent under the rule above; the main thread verified the citations of
all 8 `content-fixable` rows (11 settings, each present with the stated `role`) and four headline claims. Source data:
`.claude/reports/2026-10-05-session-b/measure-gap-tags.json`.

Corrected on the main-thread check: the stagger settings that make register 14's "framework new" Type stale are
`sgs/nav-drawer::itemStagger`, `::itemStaggerAxis`, `::itemStaggerDistance`, `::itemStaggerDuration`, `::itemStaggerMax`,
`::itemStaggerOnClose` and `::itemStaggerReveal`, with `sgs/nav-bar-menu::submenuItemStagger*` for the submenu case;
there is no `sgs/nav-drawer-menu` block.

One measure-gap tag and a one-line reason for every register item the 2026-10-05 strict A4 pass left **not walker-measurable** (63) or **partly measured** (15). Tag vocabulary: `.claude/plans/2026-10-04-eye-care-sweep-audit-fix.md`, "Measure-gap tag (Bean, 2026-10-05)".

**How to read this.** The tag says *why the walker cannot see it*, never how big the fix is; `Register Type` says what the fix touches. In the JSON, `frameworkGap` is `true` only where **no block setting can hold the value** (Bean's decisive rule), so an item can be a framework repair with `frameworkGap: false` when the setting exists and framework code ignores it. Where a setting exists and the only blocker is Spec 47 section 3.2/3.3's unbuilt presence, text and link reads, the tag is `content-fixable`; where **no** setting exists and that same unbuilt read is the blocker, the tag is `FR-47-6` (a route read that is not built) and the reason says "no setting exists; framework gap", so Session C picks it up rather than content. Settings are cited `<block_slug>::<attr_name>` with their database `role`; every claim of absence names the search and its row count. Three `content-fixable` rows (S7, N27, N31) cite a setting whose role is `text-content` rather than `content`: the setting is real and holds the words, but Spec 47 section 3.2 scopes its text read to role `content` (84 rows) and would not reach role `text-content` (235 rows), which the main thread should resolve before that read is built.

## Count per tag

| Tag | Items |
|---|---|
| `content-fixable` | 8 |
| `handover` | 6 |
| `behaviour` | 15 |
| `FR-47-6` | 28 |
| `pairing` | 17 |
| `PA-1` | 1 |
| `PA-3` | 1 |
| `PA-5` | 1 |
| `owned-elsewhere` | 1 |
| **Total** | **78** |

`frameworkGap: true` (no block setting can hold it): **37 of 78**.

## `content-fixable` (8)

| ID | Status | Tag | Owner | Register Type | Why not measured (one line, with its citation) |
|---|---|---|---|---|---|
| S7 | not walker-measurable | `content-fixable` | n/a | tree | The words live in sgs/product-card::noReviewsText (role text-content) and the product-page panel is a tree node; unmeasured only because Spec 47 section 3.2/3.3's text and presence reads are not built. |
| 9 | not walker-measurable | `content-fixable` | n/a | tree | The duplicated accessible name is the tile's own title and image alternative inside sgs/brand-strip::logos (role content), so a setting holds it; an accessible name is not a computed style, so no walker row covers it. |
| N16b | not walker-measurable | `content-fixable` | n/a | tree | A query swap a setting holds: sgs/card-grid::items (role content) holds the hand-picked cards and ::productCollection with ::productSource and ::productLimit select a live best-sellers collection; which products a query returns is not a computed style. |
| N27 | not walker-measurable | `content-fixable` | n/a | tree | The words live in sgs/product-card::noReviewsText (role text-content), so a setting holds it; unmeasured only because Spec 47 section 3.2/3.3's text read is not built. |
| N30 | not walker-measurable | `content-fixable` | n/a | content + tree | The words are held by sgs/option-picker::optionItems (role content) for the size buttons and sgs/text::text (role text-content) for the note, so a setting holds it; the walker compares styles of paired text runs, never the characters. |
| N31 | not walker-measurable | `content-fixable` | n/a | tree | The panel is a tree node and the card half is sgs/product-card::noReviewsText (role text-content), so settings and the tree hold it; unmeasured only because the presence and text reads are not built. |
| N33B | not walker-measurable | `content-fixable` | n/a | tree | A presence setting holds it: sgs/buybox::gallerySavingBadge (role boolean-visibility) switches the photo's Save tag off; unmeasured only because Spec 47 section 3.2's presence read is not built. |
| 159 | not walker-measurable | `content-fixable` | n/a | content | Which photos appear is held by image settings: sgs/hero::splitMediaImageUrl and sgs/media::imageUrlMobile/imageUrlTablet (all role content) with sgs/media::imageUrl (image-object); the walker compares styles of paired elements, not which asset was chosen. |

## `handover` (6)

| ID | Status | Tag | Owner | Register Type | Why not measured (one line, with its citation) |
|---|---|---|---|---|---|
| 36 | not walker-measurable | `handover` | site-info | content | The address text lives outside the tree in Site Info: sgs/business-info has no address attribute and 0 rows with role content, its content family being copyrightPrefix, separators, textAfter and textBefore only. |
| 45 | not walker-measurable | `handover` | content-page | content | The missing /privacy and /terms pages live outside the page tree: the footer links are measured for style, and no block setting can create a page (searched block_attributes for a content or link-href row that holds a page, 0 rows), so whether a target exists is unmeasurable. |
| 95 | not walker-measurable | `handover` | product-data | content | The empty Style, Frame type, Material, Hinge and Nose pads values are product data outside the page tree, and no block setting holds them: sgs/buybox::stockInStockLabel and its other label rows are the only content rows near them, and none is a spec-row value. |
| 151 | not walker-measurable | `handover` | woocommerce-text | content | Shipping method titles and descriptions are WooCommerce settings outside the page tree, held by no block (searched block_attributes for a shipping-method content row, 0 rows); the delivery-ship and delivery-collect pairs record live's option controls as missing at the inferred selectors, never their wording. |
| 161 | not walker-measurable | `handover` | content-page | content + tree | The brand pages and their intros live outside the page tree and do not yet exist; sgs/brand-strip holds logos (role content) and brandLinkToShop (boolean-visibility) but 0 rows with role link-href, so per-brand link targets are a framework gap once the pages exist. |
| CR12 | not walker-measurable | `handover` | site-info | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | Content outside the tree: theme-toggle/render.php returns early without settings.custom.dark, which lives in sites/<client>/theme-snapshot.json and no client has, and sgs/theme-toggle's 54 attributes (::toggleStyle, ::iconOnly, the colour rows) hold no dark palette, so there is nothing to render or pair. |

## `behaviour` (15)

| ID | Status | Tag | Owner | Register Type | Why not measured (one line, with its citation) |
|---|---|---|---|---|---|
| S10 | not walker-measurable | `behaviour` | n/a | framework new + tree | No setting exists; framework gap: searched attr_name LIKE '%stretch%'/'%wholeCard%'/'%cardLink%'/'%rowLink%' across every block and the only hit is sgs/mega-panel::drawerCardLinkSize, a size enum; which area is clickable needs the FR-47-7 click flows the walker cannot drive. |
| N2A | not walker-measurable | `behaviour` | n/a | framework new + tree | No setting exists; framework gap: sgs/responsive-logo::linkToHome and core/site-logo::isLink (both role boolean-visibility) link the logo image only, the stretched-link search returns no whole-row setting, and link area is behaviour the walker does not read. |
| N4 | not walker-measurable | `behaviour` | n/a | tree + framework repair | Marquee behaviour: sgs/trust-bar::autoScroll (role marquee-toggle), ::autoScrollBelow (marquee-below), ::autoScrollDuration (marquee-duration) and ::autoScrollPauseOnHover (boolean-visibility) exist, but no pause-button setting does (0 rows), and drop-versus-scroll needs an overflow flow the walker cannot drive. |
| 18 | not walker-measurable | `behaviour` | n/a | framework new + tree | No setting exists; framework gap: searched every block for a toast attribute and sgs/cart for notice/added/announce rows, 0 rows each, and the toast appears only during the add-to-bag flow (FR-47-7), so it cannot pair. |
| N8 | not walker-measurable | `behaviour` | n/a | tree | A transient state inside the bag-drawer open flow: the walker samples settled states, so a 240ms wrap can never be a row; the fix is held by the wordmark heading's sgs/heading::textWrap (role typography, css_property text-wrap), so a setting exists. |
| N11 | not walker-measurable | `behaviour` | n/a | framework repair | Server and cart logic reached only through the add-to-bag flow (FR-47-7): nothing paints differently, so no row can exist; no setting exists either, searched sgs/cart for a cooldown or add-route attribute (0 rows), the 30-second cooldown being framework code. |
| N13 | not walker-measurable | `behaviour` | n/a | framework repair + tree | Scroll-driven watcher behaviour: sgs/whatsapp-cta::floatingHideNearInline (role boolean-visibility) is the existing opt-in, so a setting exists, but the footer walk runs with autoScroll off and the floating button is unpaired, so no row shows it stepping aside. |
| 59 | not walker-measurable | `behaviour` | n/a | framework new + tree | No setting exists; framework gap: sgs/product-card's 22 picker rows are style rows plus ::showPickers and ::pickerShowSelectedTick (role boolean-visibility) only, with no focusable-swatch or photo-swap row, and clicking a dot is an FR-47-7 flow the walker cannot drive. |
| 61 | not walker-measurable | `behaviour` | n/a | framework new + tree | No setting exists; framework gap: the same sgs/product-card picker search returns style rows plus ::showPickers and ::pickerShowSelectedTick (role boolean-visibility) only, and focus and click on a dot are FR-47-7 flows the walker cannot drive. |
| 64 | not walker-measurable | `behaviour` | n/a | framework repair | No setting exists; framework gap: searched attr_name LIKE '%sticky%'/'%pinned%'/'%drawerTop%'/'%filterDrawer%' across every block (5 rows, none a filter drawer: sgs/notice-banner::stickyPosition, sgs/site-header::headerSticky, sgs/buybox::stickyEnabled and ::stickyOffset, sgs/choice-flow::stickyFooter) and block_slug LIKE '%filter%' returns only sgs/filter-search, and the walker never scrolls inside the open drawer. |
| N25 | not walker-measurable | `behaviour` | n/a | framework repair | A JavaScript rebuild sequence: the shop walk has a panel-after-click state but none that clears a filter after choosing one, so the duplicate empty group shells never render in a measured state; no setting holds it either, searched sgs/filter-search and the sticky/filter-drawer families (0 rows), because it is framework JavaScript. |
| N26 | not walker-measurable | `behaviour` | n/a | framework new + tree | No setting exists; framework gap: the same stretched-link search returns only sgs/mega-panel::drawerCardLinkSize, and which area of the card opens the product is an FR-47-7 click flow. |
| N37 | not walker-measurable | `behaviour` | n/a | framework new + tree | Step-change behaviour and screen-reader output (FR-47-7): sgs/choice-flow::advanceMode (role select-from-enum) is the nearest holder but has no 'advance on pick, keep Continue' value and there is no announcement row, so the mode is a framework gap. |
| N38 | not walker-measurable | `behaviour` | n/a | framework new + tree | An action, not a style: sgs/choice-flow::skipLabel and ::skipPrompt (role text-content) exist but no setting says what skip does, so the add-to-bag behaviour is a framework gap and needs an FR-47-7 flow to observe at all. |
| CR2 | not walker-measurable | `behaviour` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | Scroll-triggered behaviour: the settings exist (sgs/site-header::headerSticky, role behaviour, alongside the scrolled colour rows) but site-header/render.php switches the is-header-scrolled script on only for transparent, shrink, hide, a scrolled shadow or section ink, so no walker state can show those two colours. |

## `FR-47-6` (28)

| ID | Status | Tag | Owner | Register Type | Why not measured (one line, with its citation) |
|---|---|---|---|---|---|
| S8 | not walker-measurable | `FR-47-6` | n/a | framework repair | No setting exists; framework gap: searched every block for a price-format attribute (priceFormat/decimal/pennies/trailingZero), 0 rows, so '.00' is printed by framework code and is unmeasured because the text read is not built. |
| S9 | not walker-measurable | `FR-47-6` | n/a | framework new + tree | No setting exists; framework gap: sgs/product-card::brandName (role text-content) and ::showBrandOverlay (boolean-visibility) hold only the typed name, sgs/cart carries brand typography and colour rows but no image row and sgs/buybox no brand row at all, and the logo-plus-link swap needs the unbuilt text, presence and link reads. |
| S12 | not walker-measurable | `FR-47-6` | n/a | framework repair | A focus-state read the walker does not take. Cause found and fixed (2026-10-05, `8aa7274ef`): `theme.json` `styles.elements.link[":focus"]` set a `textDecoration: underline` that beat each block's own setting, and is now on `:focus-visible`. Still not walker-measurable — the walker forces `:hover` only and never reads a focus state. |
| 3 | not walker-measurable | `FR-47-6` | n/a | framework repair + tree | Script-driven load motion: sgs/cart::countPopAnimation (role motion) switches the pop on and off but no row holds its duration, start size or a load trigger, so the on-load shape has no setting and the walker compares settled styles only. |
| N6 | not walker-measurable | `FR-47-6` | n/a | framework repair | A focus and active-state read. The same theme underline as S12, fixed with it (2026-10-05, `8aa7274ef`). Still not walker-measurable — the walker forces `:hover` only, so a Lenses card's clicked or focused state is never measured. |
| 14 | not walker-measurable | `FR-47-6` | n/a | framework new + tree | Script-driven entrance motion: sgs/nav-drawer-menu::submenuItemStagger with ::submenuItemStaggerDistance/Duration/Max/Scope and sgs/nav-drawer::itemStagger* already hold a per-group stagger, so a setting exists, but the walker reads the settled drawer-open state only. |
| 17 | not walker-measurable | `FR-47-6` | n/a | framework repair + tree | Script-driven motion: sgs/cart::countPopAnimation (role motion) is only the on/off switch and no row holds duration, start size or a load trigger, so the draft's shape has no setting and the walker compares settled styles. |
| 19 | not walker-measurable | `FR-47-6` | n/a | framework new + tree | Script-driven motion: sgs/cart::freeDeliveryTrackHeight, ::freeDeliveryTrackRadius and ::freeDeliveryFillColour exist but there is no fill-duration row across its 21 count and free-delivery rows, so the duration has no setting and the walker reads no animation timing. |
| N9 | not walker-measurable | `FR-47-6` | n/a | framework repair | No setting exists; framework gap: the price-format search returns 0 rows across every block, so the bag line's '.00' is framework-printed text and the unbuilt text read is what hides it. |
| N10 | not walker-measurable | `FR-47-6` | n/a | framework new + tree | No setting exists; framework gap: sgs/cart::itemBrandFontSize, ::itemBrandColour and the rest of the brand typography family exist but there is no brand image row, so the logo swap has no holder and the text read is not built. |
| 37 | not walker-measurable | `FR-47-6` | n/a | framework new + tree | No setting exists; framework gap: sgs/business-info has 0 rows with role link-href, so nothing can make the address a link, and link coverage is a walker read that is not built. |
| 51 | not walker-measurable | `FR-47-6` | n/a | framework repair + framework new | Load motion the walker does not compare: sgs/hero::bgKenBurns (role boolean-visibility, css_property NULL) is the only ken-burns row, with no duration, start size or once-on-load mode, so the draft's shape has no setting. |
| 58 | not walker-measurable | `FR-47-6` | n/a | tree | Script-driven entrance motion: sgs/multi-button::fx (role behaviour, fx:effect), ::fxDuration (motion, fx:duration), ::fxStart and ::fxStagger hold the fade-up, so a setting exists, but the walker reads no opacity or translate row for an entrance. |
| 65B | partly measured | `FR-47-6` | n/a | framework new + tree | A width the walker never visits: the sweep walks 375, 768, 1440 and 1920, so the 320px single-column fallback cannot be measured, and no setting exists either, the only narrow/minColumn hits being sgs/container::minColumnWidth and ::minColumnWidthUnit. |
| 73 | not walker-measurable | `FR-47-6` | n/a | framework new + tree | Script-driven entrance motion: sgs/buybox has 0 rows matching '%ntrance%' and its gallery rows are galleryColumnRatio, galleryColumnGap and the saving-badge family, so no entrance setting exists on the gallery photo, and the walker turns the draft's keyframe-against-none into no row. |
| N33A | not walker-measurable | `FR-47-6` | n/a | framework new + tree | No setting exists; framework gap: sgs/buybox has no brand attribute at all and sgs/product-card's brand family is ::brandName (role text-content) plus ::showBrandOverlay (role boolean-visibility) with no image row, and the logo's link to the brand page is link coverage, a walker read that is not built. |
| N34 | not walker-measurable | `FR-47-6` | n/a | framework repair | No setting exists; framework gap: the price-format search returns 0 rows across every block, so the product page's '.00' is framework-printed text hidden by the unbuilt text read. |
| 96 | not walker-measurable | `FR-47-6` | n/a | framework repair | A focus-state read the walker does not take: no lens row carries an outline reading, and no setting exists on the pop-up either, sgs/choice-flow returning 0 rows for '%focus%' while focus-ring colour exists only on sgs/form, sgs/filter-search and sgs/product-search. |
| CR1 | not walker-measurable | `FR-47-6` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | A route read that does not work rather than a painted difference: the per-device markers on sgs/site-header-row::gap and sgs/site-footer-row::gap, and their content-width settings, move at 375 and 1440 but not 768, so the settings exist and only the read fails; the bundle carries no surface or sweep row for it. |
| CR3 | not walker-measurable | `FR-47-6` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | A route read awaiting the recalibration queue: sgs/accordion::headerColour, ::headerBackground and ::headerFontWeight read dead in calibration and the bundle has no accordion surface or sweep row, though the settings themselves exist, so the defect is a hardcode plus a calibration gap. |
| CR4 | not walker-measurable | `FR-47-6` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | A route read for states the calibration page could not show: the dead sets on sgs/nav-bar-menu (77 settings), sgs/product-card (56), sgs/cart (50), sgs/mega-panel (30), sgs/nav-drawer (28) and sgs/icon-list (28), for example sgs/nav-drawer::itemStaggerOnClose are mostly collapsed menus, closed drawers and empty carts, so the settings exist and only the read is missing; no surface or sweep row in the bundle covers them. |
| CR5 | not walker-measurable | `FR-47-6` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | Blocks never calibrated, so there is no read to compare against: sgs/brand-strip's calibration page timed out and sgs/heading::fontSize in its shrunk state and sgs/nav-drawer's hover rows need a header or an open drawer; the settings exist, so this is a read gap, and no surface or sweep row sits in the bundle. |
| CR7 | not walker-measurable | `FR-47-6` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | A route key-shape read, recorded fixed: calibration and lib/resolve.mjs used top/right/bottom/left where helpers-box.php::sgs_border_radius_tiers reads topLeft and its siblings, so every box-shaped radius setting (for example sgs/card-grid::borderRadius, role visual, css_property border-radius) read dead; sgs/accordion-item is still dead and no surface or sweep row sits in the bundle. |
| CR9 | not walker-measurable | `FR-47-6` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | More route reads that skip one width: sgs/gallery::gap, sgs/mega-aside's aside gap, sgs/notice-banner::padding and ::margin and sgs/form-field-tiles' grid columns each reach two tiers of three, the same pattern as CR1 and still to prove with it; no surface or sweep row in the bundle. |
| CR10 | not walker-measurable | `FR-47-6` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | A walker read only partly built: aspect-ratio is now collected and compared, but the 7 blocks' recalibration and the planted-fault proof are open and sgs/media::aspectRatio still has no css_property in block_attributes, so no row exists in the bundle. |
| CR11 | not walker-measurable | `FR-47-6` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | A route read fixed but not yet re-run: a border style prints only with a width, so sgs/quote::borderStyle and sgs/info-box::borderStyle now map with a companion width marker while about 50 other blocks' borderStyle rows await the recalibration queue; no surface or sweep row sits in the bundle. |
| CR14 | not walker-measurable | `FR-47-6` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | A walker read only partly built: an icon's size is now a row on the svg's own path, which closed sgs/whatsapp-cta::iconSize on About and Contact, but a pair's other child media are still unmeasured, so no row asks for those settings and the bundle carries no surface for it. |
| CR17 | not walker-measurable | `FR-47-6` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | A calibration fixture gap: sgs/business-info::textBefore (role text-content) exists and the fixture now sets it, but the recalibration has not run, so .sgs-business-info__before is still not a calibrated element and Help's 12 colour rows on it go unwritten. |

## `pairing` (17)

| ID | Status | Tag | Owner | Register Type | Why not measured (one line, with its citation) |
|---|---|---|---|---|---|
| S3 | partly measured | `pairing` | n/a | framework repair + tree | The one open half is the Contact phone's taupe hover, which already matches the draft so no row can differ, and the contact-form surface carries no phone or email element for a pair to reach; the hover colour itself is held by sgs/business-info::textColourHover (role color, css_property color on element text). |
| D7 | not walker-measurable | `pairing` | n/a | tree | A decided addition with no draft counterpart, so no pair can exist on the measured header surface; the holder is sgs/trust-bar::items (role content), which takes the top-bar items. |
| 49 | partly measured | `pairing` | n/a | tree + framework new | No pair reaches it: the block is listed in pairs/footer.json as left out ('no painted words') and is not among the footer refs, although sgs/whatsapp-cta::labelFontWeight (css_property font-weight on element label) and ::iconSize (css_property width on element icon) exist; the collapsed-circle icon size has no row, so that half is a framework gap. |
| 65C | partly measured | `pairing` | n/a | framework repair | No pair takes a box or position reading that would show whether price and RRP share a line, although the RRP itself is paired and its line-through read; no setting exists for the wrap order either, the narrow/minColumn search returning only sgs/container::minColumnWidth. |
| 75, 82, 158 | partly measured | `pairing` | n/a | framework repair + tree | No pair reaches it: the gallery-thumb pair reports the live thumbnail missing so no row sits on it, and the colour-tile rows carry ground and border readings but no image reading; the switch itself is sgs/buybox::pickerVariationSwatch (role boolean-visibility), so this is a repair, not a missing control. |
| 81, N29 | partly measured | `pairing` | n/a | framework repair + framework new + tree | Measured but out of bundle: the close button's rows are attributed to cr-ref-footer-33 (the sgs/modal in the footer template part) and no size-guide ref in this bundle pairs it; sgs/modal's only content and presence rows are ::closeOnOverlay, ::openOnHashLoad, ::sgsHideOnDesktop/Tablet/Mobile and ::triggerText, so it has no close-button ground or shape setting, so that half is a framework gap. |
| 88 | partly measured | `pairing` | n/a | framework new + tree | No hand pair targets the stock line and the generated buybox pair records only the root's box, so its weight is never compared; sgs/buybox's only font-weight rows are ::addToCartFontWeight and ::priceFontWeight, so a stock-text weight setting does not exist. |
| 91 | not walker-measurable | `pairing` | n/a | framework repair | No pair reaches the Details panel, so the missing line cannot show as a row; the words are held by sgs/buybox::stockInStockLabel (role text-content) with ::showStockStatus (boolean-visibility), so the fix is making the framework print the setting it already has. |
| N28 | partly measured | `pairing` | n/a | framework repair + tree + client token | Measured but out of bundle: the pop-up's rows are attributed to cr-ref-footer-33 (the footer sgs/modal) where only the WhatsApp icon size differs, and no size-guide ref in this bundle sits on the pop-up's WhatsApp card text; the words are held by sgs/whatsapp-cta::cardTitle and ::cardSubline (role text-content). |
| N36A | partly measured | `pairing` | n/a | framework repair | The size-chosen pair reads only the size letter (pill-label) and nothing shows the grey sub-label was read, so its colour is compared neither way; sgs/buybox::pickerLabelColour exists but the sub-label has only sgs/buybox::pickerSubLabelMetaKey and sgs/option-picker::subLabelMetaKey (role technical), so no sub-label colour setting exists. |
| N36E, N36F | partly measured | `pairing` | n/a | framework repair + tree | Neither link has a pair or a row: the Sizing panel is never paired and the cr-ref-product-12 rows sit on the tab buttons and the Description panel, so the quiet-link styling is measured only on Help's size-guide link, outside this bundle; the link is held by sgs/buybox::pickerLabelLinkText (text-content), ::pickerLabelLinkUrl (content) and ::pickerLabelLinkAxis (link-href). |
| N36S | not walker-measurable | `pairing` | n/a | tree + content (+ D1) | The walk pairs only the Sizing tab button, never the panel's table, so nothing inside it is reached; the content is buildable from existing blocks (sgs/tab::label, sgs/text::text) plus product data for lens height, so no control is missing. |
| 150 | partly measured | `pairing` | n/a | tree | No pair targets the secure-payment line under the Pay now bar, only place-order and section-payment around it, so the note's absence is not measured; the words go in a per-site checkout part through sgs/text::text (role text-content), so no control is missing. |
| 152 | not walker-measurable | `pairing` | n/a | none | An editor and settings capability check: the coupon, order-note and terms elements sit on the measured checkout surface but no pair targets any of them, so nothing about them is read; the switches are a checkout block setting, a WooCommerce setting and an inner block of the shared part, none of them an sgs/* block_attributes row (0 rows for coupon/orderNote/terms). |
| 155 | partly measured | `pairing` | n/a | framework repair | No pair targets WooCommerce's collapsed top summary on phones, since summary-heading, summary-item and the totals pairs each find one element per side, so the second summary is never measured; hiding it is a repair in the shared checkout stylesheet with no setting involved (0 rows for a summary-visibility attribute). |
| CR6 | not walker-measurable | `pairing` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | A proven framework helper defect whose painted effect lands on the About surface, which this bundle does not carry, so no pair reaches it: includes/helpers-box.php::sgs_box_object_shorthand prints 0 for every unset side. |
| CR18 | not walker-measurable | `pairing` | n/a | n/a (the CR table's columns are Ref | Finding | Evidence | Status | Sweep, with no Type column) | The pairing gap itself: Solve saw only the elements a hand-written walker config named (About 16 of 24 blocks, Lenses 7 of 29, Help 15 of 41, Contact 21 of 33, Home 49 of 79), with the page container behind every page's top offset (sgs/container::padding) in none of them, and only About and Contact are re-paired, so the other surfaces' blocks are still unreached. |

## `PA-1` (1)

| ID | Status | Tag | Owner | Register Type | Why not measured (one line, with its citation) |
|---|---|---|---|---|---|
| N7 | partly measured | `PA-1` | n/a | framework new + tree | PA-1: pairs.mjs collects no words inside the open live phone drawer, so only the WhatsApp button pairs (onto its sgs-child-sizing wrapper) and the other two social buttons are unpaired; separately sgs/social-icons has no fill-the-row setting (0 rows for fill/fullWidth/stretch/layout), so that half is a framework gap. |

## `PA-3` (1)

| ID | Status | Tag | Owner | Register Type | Why not measured (one line, with its citation) |
|---|---|---|---|---|---|
| 103 | partly measured | `PA-3` | n/a | tree | PA-3: the item is measured by the hand pair choose-a-frame, whose rows show no font-weight difference, but register-sweep.mjs merge counts only auto-paired refs as measured, so the clean claim cannot be recorded; the weight is held by sgs/button::fontWeight (role typography, css_property font-weight). |

## `PA-5` (1)

| ID | Status | Tag | Owner | Register Type | Why not measured (one line, with its citation) |
|---|---|---|---|---|---|
| 157 | partly measured | `PA-5` | n/a | framework repair | PA-5: the confirmation walk ran against cancelled order 652, so order-details, order-meta and confirmation-message read missing on both sides and no pair reaches the address boxes or their grid; the one-column collapse is a shared confirmation-part stylesheet repair with no block setting (0 rows for an address-grid attribute), and a paid test order completes the walk. |

## `owned-elsewhere` (1)

| ID | Status | Tag | Owner | Register Type | Why not measured (one line, with its citation) |
|---|---|---|---|---|---|
| N24 | not walker-measurable | `owned-elsewhere` | functionality-backlog | framework repair | The Google logo in each review card is the google-reviews block's Places attribution. The google-reviews track has closed (2026-10-05) and the block is available again, so N24 now sits in `plans/2026-10-05-eye-care-functionality-backlog.md`; no DB work was done on it here. |

---

## Appendix B: the three-way split, proven (B1 and B2, 2026-10-05)

Every one of the sweep's **2,373** distinct open issues now sits in exactly one class. B1 (`triage.mjs`) gave each a
candidate class; six parallel read-only Opus agents grouped by mechanism proved or disproved all **338** candidate F
rows (271 distinct block/element/property combos). Verdicts: `.claude/reports/2026-10-05-session-b/b2/*-verdicts.json`,
the agents' brief `b2/BRIEF.md`, the mechanism grouping `group-f.mjs` and `f-groups.json`.

| Class | B1 candidate | After B2 | Means |
|---|---|---|---|
| **W** walker or route gap | 1,562 | **1,710** | a measuring artefact, a knock-on effect, or a setting exists the route cannot reach |
| **F** framework gap | 338 | **163** | nothing on the block, its parents or its extensions can produce the value, or a declaration beats a real setting |
| **T** tree or content | 445 | **447** | the resolver would write it today |
| **U** box row nothing explains | 28 | 28 | a position or size row with no open parent row to follow |
| **D** decided divergence | 0 | **17** | Bean chose a different result (S1's lift, the 44px touch target) |
| **deferred** | 0 | **8** | the closed google-reviews track's rows |

**Only 48% of the candidate framework gaps survived** (163 of 338 rows). 148 rows became W, 17 D, 2 T. That is the
"missing setting starts as W until proven F" rule doing its work: Solve's label is a lookup result, and in just over
half of these cases a setting did exist or the row was never a real difference.

**The proof gate held.** All 130 confirmed F combos cite a database query or row, 128 cite both that and a
`file::symbol`, none cite neither, and **every one names an existing precedent** - a block, setting and helper that
already solves the same property elsewhere. No confirmed gap needs a new control primitive. 120 are high confidence,
9 medium, 1 low.

**Main-thread re-checks.** Every F mechanism was re-verified against the database and the source, about 15 distinct
claims. Confirmed exactly: `social-icons/render.php`'s brand branch writes `--sgs-social-border` on
`.sgs-social-icons__item:nth-child(N)` while `iconBorderColour` writes the same property at the root (the 12-row
hardcode); `sgs/social-icons` has 0 box-shadow rows; the `alignItems`/`justifyContent`/`flexDirection`/`flexWrap`
cluster is complete on 10+ blocks (the precedent); `sgs/mega-group` declares no `boxFamilies` while `sgs/text` does;
`accordion-item/render.php` reads `$block->context['sgs/accordionHeaderPadding']` and emits
`--sgs-accordion-header-pad`; `core/list` holds 6 rows, all `native_wp` with `css_property` NULL;
`core-blocks-critical.css` declares `h1..h6, .wp-block-heading { text-wrap: balance }` with no `:where()`.

One agent claim was corrected: B2b held that no setting could ever beat that heading rule. `sgs/heading::textWrap`
does exist and its scoped rule would out-specify `h1`, so the claim holds only for the core heading the row sits on
(`core/query-title`) and for any *inherited* container value, since a direct declaration beats inheritance whatever
the specificity. Worth acting on anyway: the comment immediately above that rule records that a framework-wide
heading `letter-spacing: -0.01em` default was removed because it "tightened EVERY client's headings and made clones
drift from their reference sites". The same argument applies to `text-wrap: balance`, one line below it.

Also recorded, because it is latent rather than active: **309 `sgs/` rows carry a `derived_selector` of the shape
`.sgs-<block>__<attr_name>`**, using the attribute's own name as if it were a BEM element (`.sgs-accordion__padding`),
and a further 113 rows hold a selector containing a slash (`.sgs-core/avatar__size`), which is not valid CSS. Three
sampled names appear in no stylesheet. This cannot mis-resolve the route today: `lib/db.mjs::COLS` lists 15 columns
and `derived_selector` is not one of them, so the route never reads it. Nothing should be built on that column until
it is regenerated.

### What the W class is actually made of

| Sub-mechanism | Rows | Cheap to close? |
|---|---|---|
| Knock-on effect of another open row | 614 | closes with its parent, no work |
| Unmapped interaction state (FR-47-7 not started) | 323 | needs the flows mapped |
| **A setting exists but calibration recorded no element (`css_element` NULL)** | **181** | **yes: seed the column** |
| A used value, not a declared one | 170 | correct as measured, never written |
| A setting exists but the route still missed it | 135 | mixed |
| An element no calibration knows (unmapped-element) | 88 | pairing and calibration |
| Resolver ambiguous | 35 | tie-break rule |
| Mid-entrance-animation transient | 16 | walker guard |

### The route gaps worth more than any single block fix

Two independent agents converged on the same root cause, and it is verified in the database:

1. **Database rows with `css_property` NULL.** A real, working setting whose row carries no property can only be
   matched by name, and `triage.mjs::settingFits` fails. Counted 2026-10-05: `sgsChildSizing` 10 of 10 NULL,
   `sgsChildWidth` 10 of 10, `sgsHoverDuration`, `sgsHoverDurationMs`, `sgsHoverEasing` and `sgsHoverZoomDuration`
   9 of 9 each, `sgsAnimationDuration` and `sgsAnimationEasing` 64 of 73 each, plus `sgs/nav-drawer::panelSize` and
   `sgs/hero::transitionEasing`. `sgs/mega-group::sgsChildSizing` set to `fit` emits exactly the draft's
   `flex: 0 1 auto`, and the mega-panel default it loses to carries a comment saying a group's own Child sizing
   setting overrides it. This alone produced the batch's largest false F (9 rows) and underlies much of the 181 above.
2. **The resolver never reaches a parent's setting when it arrives by block context.**
   `sgs/accordion::headerPadding` and `::contentPadding` paint the item's header and content through
   `providesContext`, and `sgs/container` carries a 13-attribute typography group on its wrapper that inherits into
   every descendant declaring none. The resolver searches only the block the walker attributed the element to.
   B2a called this the highest-value route fix in its batch; B2b found 11 rows of it independently.

Two cheaper walker guards came out of the same pass: a **tag-mismatch guard** (4 combos compared a draft `<div>` to a
live `<img>`, or a `<span>` to an `<h1>`) and **dropping style rows from refs the pairing left unmatched**
(`pairs/*.json::left`), which would have removed 24 of B2b's 58 rows before triage ever saw them.

### Register items recorded closed or clean but open on the sweep

| Item | Row | Class | Why it reopened |
|---|---|---|---|
| 100 | `cr-ref-lenses-11` `margin-top` 10px against 0px | T | `sgs/text`; the resolver would write it. Lenses has had no full-coverage Solve run since the close |
| 101 | `cr-ref-lenses-24` `y-from-benefits-heading` 61 against 77 | W | a knock-on effect of the spacing above it; closes with 100 |
| 102 | `cr-ref-lenses-27` `font-size` 15.5px against 24px | T | `sgs/process-steps` step number; the resolver would write it |
| 104 | `cr-ref-about-10` `transition-duration` 0s against 0.3s | W | only the *lift* was closed and ledgered (D-2); the **timing** is a separate row. `sgs/button::transitionDuration` exists with `css_property transition-duration` but `css_element` NULL, so the resolver reports `no-setting` and cannot write it: a calibration gap, not a hardcode. 37 rows site-wide share it |
| 131 | `cr-ref-contact-12` hover `color` rgb(119,113,106) against rgb(20,20,20) | W | S3's black hover colour is in the live site but not in the trees; S3's framework half holds |
| N15 | `cr-ref-home-58` `painted-ground` blue against black | W | the "See all reviews" button, `sgs/google-reviews`: the parallel session's |

Item **148** (the checkout sections' CSS fade-up) is walker-measured, so a script-driven fix would stay red; it stays
a CSS-tier fix. **S3**'s tree half (the black hover colour) is confirmed open by 131.

### Contact: 106 independent rows against the walker's 27

Reconciled in full in `.claude/reports/2026-10-05-session-b/contact-independent-reconciliation.md`. The headline was
never like-for-like: the independent check reports one row per (ref, property, **width**), which deduplicates to
**39** distinct, of which 3 are the PA-4 off-screen screen-reader artefact and 3 are presence rows the unbuilt
presence read cannot see. That leaves **33 against 27 - a 6-row residual, not 79.** It is entirely padding: the
walker reports no padding property at all on Contact, while the independent check reports it on 7 refs. The largest
values (draft 119, 151 and 363 against live 0 and 28) are not plausible as authored padding, so the likely mechanism
is the draft's gutter padding read against a live layout that centres with `max-width` and automatic margins - but
that is a hypothesis resting on implausibility, not proof. One live read of `cr-ref-contact-20` at 768
(`padding-right`, `max-width`, `margin-inline`, with the winning rule's origin) settles it.
