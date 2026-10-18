---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-10-18
---

# small-giants-wp: LEDGER (the one living status)

## Summary for Bean

- **Motion model (Spec 38A, Front M):** built and closed (2026-10-18): every FR-38A reads built except FR-38A-33, the motion cloning writer (clone coverage step 4.0); the build plan is archived; all four sites on `1583a6301` (the canary's full live motion QA ran, every standing probe passing after the probe fixes in `55f340c56`). Need you: a look at the canary (Gate 9 sign-off).
- **Clone coverage (Front M):** Phases 1 and 2 are done (2026-10-18). Every framework capability and everything a draft can hold is listed, each covered, excluded by you or a gap in its wave; review.md's Accept all marks a seen-but-unsupported row as a tracked gap in its wave (your ruling); Spec 48 §10 now runs in both directions with one FR per Phase 4 wave (FR-48-78 to FR-48-85). Your Indus intake re-run is done and committed (2026-10-18: 184 seen-but-unsupported rows, each bulk-accepted as a tracked gap; all 93 of your recorded decisions still reproduce). The coverage plan and the Indus build now run as one sequence (its Phase 4 "Order"): next, in parallel, the motion cloning writer (step 4.0) and your Indus intake review; then the waves in the order Indus needs them, with Phase 3 (behaviour meanings in the framework DB) before the two waves that need it. Resume prompt: `prompts/Clone coverage continue.md`.
- **Cloning (Spec 48, Front H):** the Indus clone is at your intake review (plan step 15), which can resume now while the motion cloning writer is built; the later Indus steps each wait for the coverage wave they name.
- **Eye Care (Front F):** built by hand and live on eye-care-test; it is the cloning system's answer key. Next: run Spec 48's intake on it and close the fix register's open rows.
- **Nav / header / footer (Front N):** Waves 1 to 3C are live; Gate 3C's last mile is deferred by you; Waves 4 and 5 have not started.
- **Need you:** the rulings under Parked, and the Spec 36 and Spec 38 choices under Front N.

## Blockers

- None.

## Fronts

### Front M: Motion model (Spec 38A) and clone coverage

**State:** Spec 38A is built; its build plan (`plans/archive/2026-10-12-spec38a-motion-build.md`) is complete and archived. Every FR-38A Status line reads built except FR-38A-33 (motion cloning, clone coverage step 4.0); FR-38A-41's parent perspective closed on computed evidence in Chromium, Firefox and WebKit (Bean, 2026-10-18), because the Playwright Windows WebKit build computes a parent `perspective` but does not draw it. All four sites run `1583a6301`; the full live motion QA passes on the canary (marquee on all three engines, real-touch tap, pause corner, brand-strip tile, ring and reveal in sync, post-grid stagger); `migrate_motion.py --check --target <site>` is clean on every site; the stored-content audit passes on all four. Deploys run no live motion probes unless asked (`--motion-qa-tier full` before any release that touches motion, shared effects or the theme tokens). The framework principles are cited as `FP-<n>` (`.claude/rules/framework-principles.md`; `scripts/check-rule-labels.py` is a fast gate).

**Open:** Bean's look at the canary (Gate 9 sign-off): the brand strips and the new brand-strip title on `?p=5305`, the stacked effects and reveal on `?p=5272`, the post grid's card-by-card arrival on `?p=5442`, a real-phone tap-to-pause on `?p=5305`, and eye-care-test's drawer at 375 with the brand-strip hover on desktop. The marquee writer must convert a draft's loop time into px/s (clone coverage step 4.0).

**Clone coverage** (`plans/2026-10-12-clone-coverage-foundation.md`): Spec 38A is its Phase 0. Phase 1 is done (2026-10-18; Bean signed the exclusions and re-opened the WebKit CSS group and the obsolete elements that still render; DB sections refreshed after the S6 reseed). Step 1.6's bulk acceptance is settled (Bean, 2026-10-18): a usage-read run on the Indus and Mama's redesign drafts found false group rows and IDs no list held, fixed first, then Accept all marks a seen-but-unsupported row `gap:<wave>` (or `difference` when excluded). Phase 2 is done: Spec 48 §10 runs in both directions, §10.1 holds the recogniser framework (FR-48-77) and FR-48-78 to FR-48-85, one per Phase 4 wave. Gate: `node scripts/computed-route/capabilities.mjs --gate`; gap list by wave: `--gaps`. Indus intake re-run (Bean's PC, 2026-10-18, committed `71ae521` with `--rerun-skeletons`; `check-approved.mjs indus-foods` exit 0): 1,336 review rows, 184 of them seen-but-unsupported rows bulk-accepted as `gap:<wave>`; two custom-element rows the skeleton path named by tag are fixed in code for the next run; the running page showed 8 capabilities the file read missed (inputs typed in code, an SVG filter built in code, `max()` in a set style), draft-reading wave work. Next: the combined order in the coverage plan's Phase 4 "Order" (Bean, 2026-10-18), which runs this plan and the Indus build as one sequence, each wave naming the Indus step it unblocks: lane A builds step 4.0 (the motion cloning writer, FR-48-78) while lane B resumes Indus step 15; then draft reading, site and surfaces with media upload (Indus step 18), states (Indus step 20), Phase 3 with the behaviour and modes waves, the rest of content and shop, forms and data (Indus step 22), then Indus steps 21 and 23 to 25. Resume prompt: `prompts/Clone coverage continue.md`. Run `capabilities.mjs --check` on Bean's PC first: S7 reseeded the DB, and a moved block setting shows as an orphan the gate names. `intake-finalise.test.mjs` and `intake-missing.test.mjs` pass on Bean's PC (the latter after `npm ci` in `scripts/computed-route`).

### Front H: Cloning system (Spec 48) and the Claude Design handover

**State:** Spec 48 (`specs/48-CLONING-SYSTEM.md`) is being built for Indus from `plans/2026-10-11-spec48-indus-build.md`; steps 1 to 14b are done and step 15 (your intake review) can resume now, beside clone coverage step 4.0 (lane B of the coverage plan's Phase 4 "Order": motion transfers at Fill, not at the review); steps 18, 20, 21 and 22 each name the coverage wave they need. Your decisions so far are in `sites/indus-foods/build/intake/approved-decisions.json`, and the ones that generalise are standing rules in `scripts/computed-route/data/skeleton-decisions.json` (`node scripts/computed-route/check-approved.mjs indus-foods` must exit 0). The committed `intake.json` and `review.md` are the 18 October re-run with the standing rules applied (`71ae521`, Front M): 1,336 rows, 813 to read; its seen-but-unsupported rows (one per uncovered capability the draft uses) take `gap:<wave>` from Accept all. Route open items: Spec 48 §5.4 Residual.

**Handover standard:** Spec 48A v1.0 (`handoff-check.mjs`); B0 is done (every Claude Design project exported, the artifact-based Claude Design tested). **B5 open:** edit the Eye Care draft to mirror the live site (task 2 of `prompts/Track 2 Eye Care review.md`).

**Resume from:** `prompts/Clone coverage continue.md` (lane A, builds step 4.0) and, beside it, `prompts/Track 1 Indus review.md` (lane B: the review, then steps 16, 17 and 19).

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
- `scripts/computed-route/tests/lint.test.mjs` (3 tests): the DB now routes `sgs/icon.brandName` to CSS properties, and lint forbids styled skeleton attributes; `brandName` is identity, so it needs an allow-list entry in `lint.mjs`.
- `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json`: divergences D-72 to D-91 (except D-87) cite no register decision, and the README does not list the new `lib/motion-validate.mjs`, `lib/motion-refusals.mjs` and their tests.
