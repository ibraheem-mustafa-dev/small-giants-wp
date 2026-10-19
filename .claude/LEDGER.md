---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-10-19
---

# small-giants-wp: LEDGER (the one living status)

## Summary for Bean

- **Motion model (Spec 38A, Front M):** built and closed (2026-10-18): every FR-38A reads built except FR-38A-33's layers that FR-48-77's recognisers supply and FR-38A-57 (slant, a custom axis angle and a typing cursor, which you sequenced after the three test sites are cloned); the build plan is archived; all four sites on `1583a6301` (the canary's full live motion QA ran, every standing probe passing after the probe fixes in `55f340c56`). Gate 9 signed off by Bean (2026-10-18).
- **Clone coverage (Front M):** Phases 1 and 2 are done (2026-10-18). Every framework capability and everything a draft can hold is listed, each covered, excluded by you or a gap in its wave; review.md's Accept all marks a seen-but-unsupported row as a tracked gap in its wave (your ruling); Spec 48 §10 now runs in both directions with one FR per Phase 4 wave (FR-48-78 to FR-48-85). Your Indus intake re-run is done and committed (2026-10-18: 184 seen-but-unsupported rows, each bulk-accepted as a tracked gap; all 93 of your recorded decisions still reproduce). The coverage plan and the Indus build now run as one sequence (its Phase 4 "Order"). Step 4.0, the motion cloning writer, is done (2026-10-19): cloning writes each element's entrances, hovers and endless loops (marquee, float, SVG pulse) into its motion settings with the draft's own timings and your tokens, a three-rater council's findings are fixed, and on indus-test page 60 the result plays the draft's own timings at 375, 768 and 1440 (27 of 27 checks). Draft reading, the first wave Indus needs before Phase 3, is mostly built (2026-10-19): every construct kind but fonts has a reader; Fill now reads every CSS property the draft's code declares and keeps a confirm record per value (Spec 48 FR-48-8); you excluded the prototype's document plumbing; and an audit of the 86 properties the drafts use that Fill never read found most already produced by SGS some other way; your five-test re-check cut its candidate gaps to 12 real ones (`.claude/reports/2026-10-19-css-equivalence-audit.md`), each now an FR marked not built in its block's spec and designed in one build plan for a fresh session (`plans/2026-10-19-control-gaps-build.md`). A council's findings are fixed, among them a reverse entrance that was written with the wrong curve. Calibration now reads every property a block default, the theme or a setting under another name paints (2026-10-19); the test sites take it at their next recalibration, which waits on your go. Next: the 12 control gaps in one fresh session, and in parallel the rest of draft reading (recalibration, the setting-mapping residue, functions and units), then site and surfaces with media upload, then states, then Phase 3.
- **Cloning (Spec 48, Front H):** your Indus review (plan step 15) is done (2026-10-19, every row marked, three new standing rules), and so are the Indus steps that needed no coverage wave: Site Info applied on indus-test and shown by its header and footer (16), the snapshot built from your confirmed colour roles and live (17), and the default paint of every block the site will use measured against it (19). Mama's redesign has its first intake too (1,627 rows). Next for Indus: the inventory reader fixes (before step 20), then the steps that wait on coverage waves.
- **Eye Care (Front F):** built by hand and live on eye-care-test; it is the cloning system's answer key. Next: run Spec 48's intake on it and close the fix register's open rows.
- **Nav / header / footer (Front N):** Waves 1 to 3C are live; Gate 3C's last mile is deferred by you; Waves 4 and 5 have not started.
- **Need you:** the rulings under Parked, and the Spec 36 and Spec 38 choices under Front N.

## Blockers

- None.

## Fronts

### Front M: Motion model (Spec 38A) and clone coverage

**State:** Spec 38A is built; its build plan (`plans/archive/2026-10-12-spec38a-motion-build.md`) is complete and archived. Every FR-38A Status line reads built except FR-38A-33's layers that FR-48-77's recognisers supply and FR-38A-57 (see Open); FR-38A-41's parent perspective closed on computed evidence in Chromium, Firefox and WebKit (Bean, 2026-10-18), because the Playwright Windows WebKit build computes a parent `perspective` but does not draw it. All four sites run `1583a6301`; the full live motion QA passes on the canary (marquee on all three engines, real-touch tap, pause corner, brand-strip tile, ring and reveal in sync, post-grid stagger); `migrate_motion.py --check --target <site>` is clean on every site; the stored-content audit passes on all four. Deploys run no live motion probes unless asked (`--motion-qa-tier full` before any release that touches motion, shared effects or the theme tokens). The framework principles are cited as `FP-<n>` (`.claude/rules/framework-principles.md`; `scripts/check-rule-labels.py` is a fast gate).

**Open:** FR-38A-33's `hover.effects` and `effects` layers for effects a draft builds in its own script, written through `scripts/computed-route/lib/motion-effects.mjs::writeEffect` once FR-48-77 recognises them (behaviour recognisers wave); FR-38A-57 (slant, custom axis angle, typing cursor), after the three test sites are fully cloned (Bean, 2026-10-19).

**Clone coverage** (`plans/2026-10-12-clone-coverage-foundation.md`): Spec 38A is its Phase 0. Phase 1 is done (2026-10-18; Bean signed the exclusions and re-opened the WebKit CSS group and the obsolete elements that still render; DB sections refreshed after the S6 reseed). Step 1.6's bulk acceptance is settled (Bean, 2026-10-18): a usage-read run on the Indus and Mama's redesign drafts found false group rows and IDs no list held, fixed first, then Accept all marks a seen-but-unsupported row `gap:<wave>` (or `difference` when excluded). Phase 2 is done: Spec 48 §10 runs in both directions, §10.1 holds the recogniser framework (FR-48-77) and FR-48-78 to FR-48-85, one per Phase 4 wave. Gate: `node scripts/computed-route/capabilities.mjs --gate`; gap list by wave: `--gaps`. Indus intake re-run (Bean's PC, 2026-10-18, committed `71ae521` with `--rerun-skeletons`; `check-approved.mjs indus-foods` exit 0): 1,336 review rows, 184 of them seen-but-unsupported rows bulk-accepted as `gap:<wave>`; the two custom-element rows the skeleton path named by tag are one `html:custom-element` row since the 2026-10-19 re-run (Front H); the running page showed 8 capabilities the file read missed (inputs typed in code, an SVG filter built in code, `max()` in a set style), draft-reading wave work. Step 4.0 done (2026-10-19; `884d616b2` to `ae050bd7e`): Spec 48 FR-48-78 is built with its done-when proofs (gaps 0 in the wave and gate 0; `scripts/computed-route/tests/motion-planted-draft.test.mjs`; indus-test page 60 with `sites/indus-foods/build/qa/probe-motion-proof.mjs`, 27 of 27); a council's findings are fixed (`17a84b42b`); every rule's mutation turns its test red under a harness that checks its own green baseline. FR-48-47's sampled pose is built too (2026-10-19, `570da4222`: all 17 written Indus header and home-page entrances agree at 0, half and all of their run). Draft reading (Order item 2, FR-48-85) is in progress: construct readers (`4bd25b519`), Spec 48 FR-48-8 declared values with the FR-48-36 confirm record (`7837d3ee1`, plan `plans/2026-10-19-fr48-8-declared-values.md`), Bean's ruling on the document plumbing (`e13ad81a7`: 57 excluded), and the session council's fixes (`115c15dbc`). The control gaps are settled (2026-10-19: 12 real, Bean's five tests; build plan `plans/2026-10-19-control-gaps-build.md`, one fresh session, all 12 before any draft goes live). Calibration reads are built (`e250fbeb4`, council fix `2a4cdf2d9`: 28 properties in `scripts/computed-route/lib/calibrate-props.mjs::CAL_EXTRA_PROPS`; route suite 1,538 pass); no cache has them until each client test site is recalibrated (coordinated with the other sessions, Bean's go). Next: the rest of Order item 2 (the recalibration, then the resolver-mapping residue that discovery does not find, then the functions and units, at-rules and selectors; FR-48-8 plan step 5), then items 3 and 4, then Phase 3 and the rest. `intake-finalise.test.mjs` and `intake-missing.test.mjs` pass on Bean's PC (the latter after `npm ci` in `scripts/computed-route`).

### Front H: Cloning system (Spec 48) and the Claude Design handover

**State:** Spec 48 (`specs/48-CLONING-SYSTEM.md`) is being built for Indus from `plans/2026-10-11-spec48-indus-build.md`; steps 1 to 17 and 19 are done (16, 17 and 19 on 2026-10-19: Site Info applied to indus-test `b5777b113`; the snapshot follows your confirmed palette roles through `extract.py --intake` and is pushed, all 19 slugs read back at `:root` `add2aa791`; 44 blocks' default paint carries the pushed snapshot's paint key `c0f5b8e92`); steps 18, 20, 21 and 22 each name the coverage wave they need. Your decisions so far are in `sites/indus-foods/build/intake/approved-decisions.json`, and the ones that generalise are standing rules in `scripts/computed-route/data/skeleton-decisions.json` (`node scripts/computed-route/check-approved.mjs indus-foods` must exit 0). Its seen-but-unsupported rows (one per uncovered capability the draft uses) take `gap:<wave>` from Accept all. Step 15 is done (2026-10-19, `e6711c6e6`: every row marked, `--apply-review` exit 0, standing rules formControl, cardHeading and dotMarker). The catch-up intake re-run on top of it is committed (`8a7126ea8`: 1,263 rows, 1,174 marks carried and 73 changed, `check-approved.mjs indus-foods` exit 0; custom elements are now covered, so their row has gone). That full run also rewrote the confirmed `sites/indus-foods/build/page-map.json` with raw proposals; the review session restored it by re-applying your marks (`f68cee18d`, `check-approved` 93 of 93), and a run that must not overwrite a confirmed page map is an open item in Spec 48 FR-48-17. A re-run keeps marks written only in review.md (`scripts/computed-route/lib/intake-review-carry.mjs`); Accept-all ticks are not carried. A local mirror now runs the theme.json its test site runs (`scripts/local-wp/mirror_theme_json.py`, `cab0ca083`). Open, each in its doc: 125 inventory rows marked `theirs` expose eight reader bugs (FR-48-25, blocks step 20); intake's own Site Info dry run hands over contact keys only (FR-48-59); text-on-ground slugs no token names must be derived from usage (FR-33-2); 15 blocks' slot maps are behind the current build because their recalibration would drop motion settings (Indus plan step 19). Route open items: Spec 48 §5.4 Residual.

**Handover standard:** Spec 48A v1.0 (`handoff-check.mjs`); B0 is done (every Claude Design project exported, the artifact-based Claude Design tested). **B5 open:** edit the Eye Care draft to mirror the live site (task 2 of `prompts/Track 2 Eye Care review.md`).

**Resume from:** the coverage plan's Phase 4 "Order" item 2 (lane A) and, beside it, `prompts/Indus inventory reader fixes.md` (lane B, before Indus step 20); Indus step 18 waits on Order item 3.

### Front F: Eye Care Birmingham, built by hand (D1149)

**State:** every surface is built and live on eye-care-test (`https://darkcyan-grouse-898606.hostingersite.com`, credentials `.claude/secrets/eye-care-test.env`); the finished site is the cloning system's answer key.

**Next:** `prompts/Track 2 Eye Care review.md`: diagnose CR13, run Spec 48's intake on Eye Care, build its `approved-decisions.json` from your rulings, classify every mismatch as a matching-logic fix or a framework upgrade, and close the register's open rows.

**Open:**
- **CR13, spacing presets render as pixels (framework-wide):** a bare-number spacing value meant as a preset renders as px; cause known (`helpers-css-safety.php::sgs_css_length_value_preset_slugs` misses WordPress's origin-grouped list), the writers' intended meaning not yet established. Fix steps: backlog row CR13.
- **Register 46:** drop the trademark sentence from the Site Info copyright text.
- **Open rows:** read them live from the fix register; never cache a count.

Governing documents: fix register `plans/2026-10-02-eye-care-fix-register.md` (what gets fixed), `plans/2026-10-02-eye-care-plan.md` (decisions and surfaces), `plans/2026-10-05-eye-care-functionality-backlog.md` (features and controls). Measured state: `sites/eye-care-ward-end/build/qa/triage/*.json`.

### Front N: Nav / header / footer (Specs 36 and 37)

**State:** Waves 1 to 3C are built and live on sandybrown; Gate 3C items 1, 2, 3 and 5 pass; item 4's last mile is deferred by you. Wave 4 (reference clones) has not started; Wave 5 is header and footer cloning through Spec 48. Proof: `verify/merged-spec36-37-track.md`.

**Resume from:** `plans/2026-10-01-header-nav-thread-plan.md` §2.4 to close Gate 3C, or §4 to prepare Wave 4.

**Open (each Spec 36 or 38 Status line holds the detail):**
- **FR-36-16 (your choice):** the late-CSS A/B fails on the drawer because `nav-drawer/style.css` places the close control and first link; relax the test to the dialog box plus dismissal, or emit the drawer's whole layout in the scoped rules.
- **FR-38-31 (your eye):** the aurora and ink wave styles painted black in a local Chrome; check them on a real GPU.
- FR-36-17: the mega pages exceed the 100 KB CSS and 50 KB JS budget. FR-36-11: the active item under forced colours is not confirmed live. The homepage layout shift (0.82 at 375) is untraced.
- `sgs-client-notes` deploys through `plugins/sgs-blocks/scripts/deploy-client-notes-quick.py`, not `build-deploy.py`.

## Parked

- **CR12, parked by you:** the dark-mode toggle renders nothing because no client sets dark tokens; three design options sit on its register row.
- **CR23:** about 72 Eye Care differences no setting can reach (a 2026-10-07 snapshot); the Track 2 session recounts them and carries the rest as missing-feature rows.
- **WW-SH-04 (your ruling):** the Solve answer sheet labels a shop write wrong on "assumed" evidence (Spec 48 §5.4 Res 34).
- **Unwired scripts (your ruling):** nav-qa `u1-owed-probe.mjs` with `qa-u1-owed-fixture.php`, and the `motion-qa` probes whose target pages no doc registers (`plugins/sgs-blocks/scripts/audit-live-script-closure.py` lists them).
- **Product-card value ladder:** 24 editor-canvas controls wait for a bound-mode canvas preview (parked by you, fix register; baseline `plugins/sgs-blocks/scripts/wiring-fingerprint-baseline.json`).
- Forms and choice flows created by the cloning system, and their analytics: `plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md`.
- Snooza product configurator, planned and not started: `plans/2026-08-03-snooza-configurator-build-plan.md`.
- Gate 3C item 4's G8 gap (lamalama corner pin): `plans/2026-10-01-header-nav-thread-plan.md` §7.

## Live state

- **Branch:** `main`; many sessions share this tree. **What each site runs:** `ssh hd "cat ~/.sgs-deploy-marker-<target>.json"`; deploy targets are `TARGETS` in `plugins/sgs-blocks/scripts/deploy_common.py` (`sandybrown`, `indus-test`, `eye-care-test`, `mamas-test`).
- **sandybrown (canary, default target):** WordPress 7.1.3; homepage page **2742**, posts page **2741**; fresh-clone verification page **3448**; motion-QA fixtures 2103, 2109, 2113, 2603, 2740, 3037, 5223, 5226 and 5229 are never deleted.
- **Client test sites** (named explicitly to deploy, WordPress 7.1.3): eye-care-test, indus-test (no content pages built yet, brief `sites/indus-foods/CLAUDE.md`) and mamas-test (brief `sites/mamas-munches-redesign/CLAUDE.md`; its active footer is the old `sgs_footer` post 19, cleared at its reset). Each holds Spec 48's private calibration page (§3.2, `scripts/computed-route/calibration-targets.json`).

## Known failing tests

- `plugins/sgs-blocks/scripts/db-consistency/tests/test_f6_consistency.py::TestCheck5VariantReseed` (4 tests): the fixtures predate the `slot_value` column (2026-09-05) and one assert expects 2-tuples where the code returns 3-tuples. Small fix in the tests.
- `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json`: divergences D-72 to D-91 (except D-87) cite no register decision, and the README does not list the new `lib/motion-validate.mjs`, `lib/motion-refusals.mjs` and their tests.
