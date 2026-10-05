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
still open + divergence protection + writes Session C's plan) → Session C (framework gaps the sweep still shows) →
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
exist elsewhere (textarea `max-width`). Session B proves each one.

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
- **P0-1 `block-edit.test.js`:** 8 render failures (`TypographyControlsFields` renders an undefined element), pre-existing.
- **P0-2 PHPUnit:** 26 failures and 3 errors, pre-existing at HEAD `983429193`: AdminMenu, ConfiguratorCompat,
  ContainerWrapper goldens, HeaderBehaviours, PricingEngine, PricingTable ribbon, RenderOutput, ResponsiveLogo (5),
  ReviewsEmptyRender, StyleVariationManifest (12), Timeline imageControls, LeanSeedSize.
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
- **P0-11 Unclassified calibration outcomes (Session B, with B2's classification):** the 605 dead, 40 oneWidth and 55 untestedStates of 2026-10-05 are not
  split by cause (`calibration/classify_dead.py` defines classifiers only). The largest: cart 83, nav-bar-menu 58 (a
  menu paints only inside a real site header, which the calibration page lacks), product-card 51, nav-drawer-menu 39.

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
Not yet measured: the new walk's time on the real host (four widths of About took 20s on the local mirror); A3's
first host runs compare it with the 2026-10-04 About walk, and batch the DevTools node lookups if it is over twice as
long. The four review findings in Session 0's code are handled by Session 0 (deploy-hash `0b0630d6e`, calibration chunk probe, the tier helpers in its fix wave, jest mocks `7c714f86b`).

## Session A: whole-site sweep (measure, never write)

**Done when:** every surface has a walker report taken from one commit with live = HEAD; every register item carries
one sweep status; every claimed fix is confirmed live or reopened; register, Spec 47 plan Progress, Spec 47 §5 and
LEDGER Front F state the result. **Estimate:** realistic ~3 h, about 2 h of it unattended host time; ~1 h 40 only with no host 403s and no panel config overrunning.

| Unit | Does | Files | Depends on | Test |
|---|---|---|---|---|
| A-1 Read what DevTools reads | **Built and proven 2026-10-05 (Track P, `4f70dda13`, `f7d9003f5`, `9fa6bbbe3`; About on the local mirror: 1 real open issue, S1's button timing):** `parity/lib/devtools.mjs` (`settleAnimations`, `forcedHover`, `declaredValues`), timings and pseudo layers in `collect.mjs`, `textRun` rows; GAP-CHECKLIST §19. Before the sweep, so it measures truthfully (Bean, 2026-10-04: these gaps are data DevTools already shows). Each a general walker fix with a MUST FAIL test and a tool-log line: (1) settle on `document.getAnimations()` finishing instead of the fixed `state.settle ?? 900` wait in `draft-live-walk.mjs` (no row read mid-entrance); (2) every pair's hover read by forcing `:hover` through the Chrome DevTools Protocol (`CSS.forcePseudoState`), not only pairs flagged `hover` in a hand config; (3) declared values from the matched CSS rules (`CSS.getMatchedStylesForNode`) beside computed ones, so a width or max-width the draft declares (Contact's 168px address) is written instead of left as a used value; (4) a text-run pair also compares the spacing between its rows (their boxes' tops), giving the hours list its gap; (5) transition and animation timings compared (duration, delay, easing), which computed style already holds. Panels are handled in A2 by opening them before pairing | `scripts/parity/draft-live-walk.mjs`, `scripts/parity/lib/collect.mjs`, `scripts/parity/lib/chrome.mjs`, `scripts/parity/lib/compare.mjs`, `scripts/computed-route/tests/walker-refs.test.mjs` | none | each fix's MUST FAIL test; About still at 0 open on a measure-only run (no new rows from the fixes on a solved page) |
| A0 Live = HEAD | (after A-1 lands, so HEAD carries it) Queue runner in the scratchpad (serial, `SGS_HEADED=1`, STOP file). Deploy HEAD (includes 508217f03) to eye-care-test; check the theme snapshot matches `sites/eye-care-ward-end/theme-snapshot.json` (`push-theme-snapshot.py` if not); rebuild all 17 trees with `wp-build-page.js`. Before rebuilding, `git diff --ignore-cr-at-eol sites/eye-care-ward-end/build/*.tree.json` must be empty (`about.tree.json` differs in line endings only on 2026-10-04). Record the HEAD hash; tell peer sessions not to deploy to eye-care-test while the queue runs **When Hostinger's edge shows automated browsers a captcha** (it did after the 2026-10-05 calibration bursts), measure on the local WSL mirror instead (Track P's About proof, 2026-10-05): serve the draft from its source folder (`python -m http.server 8090` in `sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff`, page `Eye%20Care%20Birmingham.dc.html`), point a scratchpad config that imports the surface's `qa/parity/<s>.full.mjs` at it and at `http://localhost:8081/<path>` (with `divergences` as an absolute path), rebuild the tree there with `wp-build-page.js --env-file .claude/secrets/local-eye-care.env --env-key LOCALEYECARE`, walk the four widths with `--lean` and classify with `solve-rows.mjs::classify` and `solve-report.mjs::wholePage`. First prove the local draft equals the hosted one: About matched 24 pairs and 1,393 values against `qa/solve/about/2026-10-04T05-03-56/draft-cache-1440.json`. | queue runner (scratchpad) | none | deploy verifies by checksum; every rebuild reports 0 invalid blocks |
| A1 Measure-only mode | **Test built 2026-10-05 (`4f70dda13`):** `solve.mjs::solveLoop`, `tests/solve.test.mjs`. Proven by code reading (risk review, 2026-10-04): `solve.mjs --rounds 0` stamps refs (`addRefs`, `writeTree`), rebuilds the live page, walks once and classifies, and breaks before `writeRound`. It walks 4 widths (375/768/1440/1920), and shop and product rebuild a site-wide template. Add one test that rounds 0 never calls `writeRound`, then use it | `tests/` | none (first action, 5 min) | the new test, red when the break is removed |
| A2 Pair every surface | For each surface without `walkerFull`: measure-only run (stamps refs), then `pairs.mjs --surface <s>`, set `walkerFull`. Order: help, home, footer, header, then the rest. Hand configs are shared (`header.mjs` serves header, mobile-menu and the 4 megas; `help.mjs` serves help and size-guide), and `pairs.mjs` reads the live page at rest, so mobile-menu, the megas, size-guide and lens pair almost nothing. Decided default: give each panel surface its own hand config whose navigation opens the panel before pairing (same pattern as the existing states); if that takes more than 15 min for a surface, record it as unmeasured with its reason and move on | `surfaces.json`, hand configs in `qa/parity/`, generated `qa/parity/*.full.mjs`, `qa/pairs/*.json` | A0, A1 | each pairing report lists kept and left-out blocks with reasons; `lint.mjs --surfaces` passes |
| A3 Measure all | **Aggregator built 2026-10-05 (`65935f7d7`):** `sweep.mjs`, `lib/sweep.mjs`; on today's six reports 331 issues, each surface's total equal to its `wholePage` count. Measure-only run on all 17 surfaces, plus walker runs of bag, checkout, confirmation hand configs. A small summary command aggregates every report: per surface, distinct issues by class and Unresolved reason, ledger-accepted rows, and blocks left unmeasured. Rows from a shared config count once (deduplicated by ref and property). Output: `qa/sweep/<date>/sweep.json`, one row per open issue `{ surface, ref, block, property, widths, state, kind, class, reason, report }` | new `scripts/computed-route/sweep.mjs` (aggregator, reused in B), `tests/sweep.test.mjs` | A2 | test: totals equal the per-surface reports; two surfaces sharing a config count a shared row once |
| A4 Register ↔ sweep | **Tooling built 2026-10-05 (Track P):** `scripts/computed-route/register-sweep.mjs bundle --register <register> --sweep <sweep.json> --pairs sites/eye-care-ward-end/build/qa/pairs --out <dir>` writes the eight group bundles (201 items, 0 ungrouped on 2026-10-05), each agent gets `.claude/plans/a4-agent-prompt.md` with its bundle, and `merge … --verdicts <files> --out <copy>` rejects a set with a missing or doubled verdict, a clean claim a row contradicts or no pairing measured, or a site-wide clean whose covered items are not all clean and measured; it writes the Sweep column to a copy for review. Delete the prompt file when A4 ends. Every register item gets one sweep status (rules below). Parallel read-only Sonnet agents, one per register section group (Header + megas + drawers; Footer + floating WhatsApp; Home; Shop + product + lens pop-up; Lenses + About + Help + Contact; Checkout + confirmation + content; site-wide S1 to S12; route findings CR1 to CR21), each given `sweep.json` and its sections, returning `[{ id, status, evidence }]`. Main thread re-checks every **clean** claim against `sweep.json`, merges, and is the one writer of the register | register (new Sweep column; the existing Status column stays) | A3 | 100% of items carry a status; every clean item cites its report path and the paired ref covering it |
| A5 Live proof of fixes | **Ledger fix built 2026-10-05 (`fde61f00d`):** `lib/ledger.mjs::judgeIndependent`; the live re-checks remain. First fix `qa/independent-check.mjs::accepted`: it matches `e.ref`, but every ledger entry stores `node`, so it accepts nothing (proven 2026-10-04 by reading the code; MUST FAIL test with one ledgered row). Then claimed fixes (items marked built/closed, the S-items) and A4's "clean" items are re-checked live: `qa/framework-fix-check.mjs`, `qa/independent-check.mjs --surface about` and `--surface contact`, and one combined headed Playwright job for the not-walker-measurable items (hover animations, sticky header, drawers) | `qa/framework-fix-check.mjs` (add checks only where a claimed fix has none) | A3 (runs alongside A4) | each claimed fix: PASS with its command, or reopened in the register |
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
- **A4:** the register's Sweep column (`3ee5274ff`): 84 still open, 62 not walker-measurable, 31 closed earlier, 15 partly
  measured, 9 clean on the walker. The main thread re-judged the hover and motion items (the agents applied the old
  rule), checked 7 of the 62 not-walker-measurable items and every closed claim without a report.
- **A5:** `qa/sweep/2026-10-05/a5/README.md`: framework fixes 37/37 PASS; About independent 0 differences; Contact
  independent 106 rows against the walker's 27 (Session B input); sticky header holds; the drawer stagger (14) is
  absent. S3 is fixed in the header but the footer's business-info hover colour still differs.

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

**Done when:** the route's use of the block source and DB is audited (B0); every open distinct issue from Session A sits in exactly one class below with its proof; every real
framework gap is grouped by mechanism and matched to a shared helper; Bean's decided differences can no longer be
overwritten by Solve; Session C's plan is written. **Estimate:** ~1 h 10 (realistic ~2 h).

### The classes (written into Spec 47 §5 as the rule)

| Class | Means | Proof required |
|---|---|---|
| **D: decided divergence** | Bean chose a different result from the draft | a register decision ID; then a ledger entry citing it |
| **F: framework gap** | no setting on the block, its enclosing blocks or its extensions can produce the draft value; or a hardcode beats a setting | DB query of every attribute (including rows with `css_property` NULL) + the block's `render.php`/`style.css` by symbol + the extension roster; for a hardcode, the winning CSS rule |
| **W: walker or route gap** | the row is a measuring artefact, a consequence of another row, or a setting exists but the route cannot find, calibrate, pair or write it | the setting that exists (file::symbol) or the parent row it follows from |
| **T: tree or content** | fixable now in the page tree or Site Info | the value to write |

Rule: Solve's "Missing setting" starts as **W until proven F**. A walker gap is never closed by calling it missing
functionality.

| Unit | Does | Files | Depends on | Test |
|---|---|---|---|---|
| B0 Route data audit | **Investigation done 2026-10-04:** `.claude/reports/2026-10-04-route-data-audit/README.md` (wiring fingerprints, seeder routing gaps, every calibration outcome classified, DB and block-file inventory; rerun scripts beside it). Its fixes are Session 0. Left for B0: rerun the audit scripts after Session 0 and carry any residual into B1 | the report; fix designs into Session C's catalogue | Session 0 | residual counts recorded beside the 2026-10-04 ones |
| B1 Triage script | **Script built 2026-10-05 (Track P):** `node scripts/computed-route/triage.mjs --client eye-care-ward-end --surface <s>` writes `qa/triage/<s>.json`: a candidate class per distinct issue, W, F, T or U (a box row nothing explains), with its evidence. Its checks: the resolver run read-only; fitting attributes (NULL css_property rows and discovered enums included); roster extensions; enclosing calibration `reaches`; consequence; transient; used value; and a string-level source pass: the block's own `render.php` and `style.css`, plus the PHP helpers `render.php` reaches two hops deep under `includes/` (`lib/triage-source.mjs`), cited as `file::symbol` (Lenses' container gap: `class-sgs-container-wrapper.php::SGS_Container_Wrapper` emits `'gap:' . sgs_container_gap_value( $gap )`). On 2026-10-04's reports: contact-form 23 issues (W 17, F 6), lenses 33 (W 25, F 3, U 5). For B2, check these: lenses container-25 gap is held at 0px but paints 16px (does the helper treat 0 as empty?); `layout-row` consequences compare no deltas; parent heights that sum several child deltas land in U. Left for B1: rerun on the sweep after Session A, and the audit of calibration dead and no-marker settings after Session 0. Built from B0's findings. For every Hardcode, Missing and Unresolved row of the sweep, checks mechanically: attributes on the block whose name or `css_property` fits (DB, NULL rows included); extension roster settings; enclosing blocks' calibrated `reaches`; whether the row's node has an open parent row with the same delta (consequence); transient properties (transform, opacity, transition mid-animation); used values. With `--rounds 0` Solve writes no gaps, so every row reads "not written": the script runs the resolver read-only (`lib/resolve.mjs`, no `setAttr`) to get each row's `no-setting`, `uncalibrated` or `breaks-layout` reason first. Then reads the block's own source for the rows still labelled missing or hardcode: does `render.php` read the attribute, and how does it emit it (class modifier, custom property, inline wrapper attribute); which rule in the block's `style.css` declares the property (the matched rule's stylesheet and selector from A-1's `CSS.getMatchedStylesForNode` names it on the live page). The same pass audits whatever calibration dead and no-marker settings and no-route styling attributes remain after Session 0 (B0's rerun counts), classing each as marker gap, missing DB route or render that never reads the attribute. Writes a candidate class and its evidence per row | new `scripts/computed-route/triage.mjs` + `lib/triage.mjs`, `tests/triage.test.mjs` | Session A | MUST FAIL tests: a known existing setting (textarea width via its extension) is never labelled F; a known consequence row is labelled W |
| B2 Prove each candidate | Parallel read-only Sonnet agents grouped by mechanism (not by surface), each proving or disproving its batch with file::symbol and DB queries. Main thread re-checks every F verdict and a sample of W | evidence table in this plan's appendix | B1 | every F has the proof the class table requires |
| B3 Group and match helpers | Proven F gaps grouped by mechanism (for example layout alignment on blocks without it, inner-element typography, text max-width, hover effects) and matched to the shared helpers and declarations that already solve it elsewhere (`SgsLengthControl`, box control, typography helpers, `supports.sgs.boxFamilies`, extensions, the form's Field style group as the parent-styles-children precedent) | fix catalogue section in Session C's plan | B2 | each group names its precedent block and helper |
| B4 Divergence protection | **(1), (3), (4) built 2026-10-05 (`5c20163c2`, `fde61f00d`):** decided values are Solve's target (`judgeDivergence` sets `decided`, `draftValues` reads it); entries carry `register: [ids]` checked by `lint.mjs --register`; D-1 removed (Bean 2026-10-05: the subtext keeps its margin; the 375px name-field drop stays open under CR15/N45b). (2) remains for Session B. Proven 2026-10-04 by reading the code: Solve skips a row the ledger accepts, but when live drifts from a decided value `parity/lib/divergences.mjs::judgeDivergence` leaves the row open with `diff.draft` set to the text `"<value> (D-n)"`, while `solve.mjs::writeRound` takes its target from `solve-rows.mjs::draftValues` (the raw draft style). So the next Solve writes the draft over Bean's decision, and `guard.mjs` cannot measure that row (`"0px (D-1)"` fails its px parse). Build: (1) Solve's target for a ledgered row is the entry's decided value, parsed from the entry, not from the text; (2) every register decision that changes a measured value becomes a ledger entry citing its register ID; (3) `lint.mjs` fails an entry whose ID is not in the register; (4) the independent check (fixed in A5) fails when live differs from the decided value | `lib/solve-rows.mjs::draftValues`, `solve.mjs::writeRound`, `parity/lib/divergences.mjs`, `lint.mjs`, `divergences.json` | Session A's statuses | MUST FAIL tests: with a value entry whose live has drifted, `writeRound`'s target equals the decided value; a planted drift turns the independent check red |
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

## Session C: framework fixes (outline; B5 writes the detail)

**Done when:** every catalogued F gap has a working control (editor and front end), a reseed, a deploy, and a
recalibration of the blocks it touched; a fresh measure-only sweep shows those rows closed and 0 new rows anywhere.

Shape:
1. **One group per agent, in parallel.** Each `wp-sgs-developer` agent takes one mechanism group, phase 1 read-only
   diagnosis, main-thread check, phase 2 implementation in an isolated worktree (`isolation: "worktree"`), no build,
   commit or deploy.
2. **Scripts for repeated edits.** A group touching more than 3 files with the same change gets a detector first
   (`.claude/THE-MIGRATION-METHOD.md`), then a codemod.
3. **Shared helpers first.** A group whose fix belongs in a shared control or helper lands that helper once, then the
   per-block wiring.
4. **One serial tail in the main thread:** merge each worktree, read every diff, one `npm run build`, `run-gates.py
   --tier full`, one reseed from clean HEAD, one deploy to eye-care-test then sandybrown, recalibrate the touched
   blocks through the queue, one measure-only sweep.

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
| Session C merges clash in shared helpers | One reseed hides which group regressed | helpers merge and build first, sweep, then the per-block wiring, sweep again |
| Pairing a panel surface at rest misses blocks | Under-counted issues | Listed as left out with reason; counted in the summary as unmeasured |
| Triage over-labels W to keep F small | Real gaps ignored | B2 agents prove both directions; main thread re-checks every reclassification to W from Solve's Missing label |

## Gates

| Gate | After | Pass | Type |
|---|---|---|---|
| A | A0 to A6 | every surface measured from one HEAD; every register item has a status | review-gate |
| B | B1 to B5 | every open issue classed with proof; divergence MUST FAIL test red then green | go/no-go (Bean) |
| C | Session C | catalogue rows closed on a fresh sweep; 0 new rows. Fail: revert that group's merge, re-sweep; never start Session D with new rows | auto-gate |
