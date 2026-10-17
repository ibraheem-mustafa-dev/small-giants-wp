---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-10-17
---

# small-giants-wp: LEDGER (the one living status)

## Summary for Bean

- **Motion model (Spec 38A, Front M):** S1 to S5 are done; S6 is part done (removal groups G1 to G5 are on `main`; no deploy of them is recorded yet); their deploys, G0 and Gate 8 are next, then S7 (literals sweep, final acceptance).
- **Clone coverage (Front M):** Phase 1 steps 1.1 to 1.4 (capability inventory, coverage map, gate test) are built on branch `claude/clone-coverage-plan-review-2bbei4`; step 1.5 needs one command on your PC (the framework DB lives there), then the gap list triage and your exclusion sign-off.
- **Cloning (Spec 48, Front H):** the Indus clone is paused at your intake review (plan step 15) until Spec 38A is finished, so the draft's motion transfers to the clone too.
- **Eye Care (Front F):** built by hand and live on eye-care-test; it is the cloning system's answer key. Next: run Spec 48's intake on it and close the fix register's open rows.
- **Nav / header / footer (Front N):** Waves 1 to 3C are live; Gate 3C's last mile is deferred by you; Waves 4 and 5 have not started.
- **Need you:** the rulings under Parked, and the Spec 36 and Spec 38 choices under Front N.

## Blockers

- None.

## Fronts

### Front M: Motion model (Spec 38A) and clone coverage

**State:** `plans/2026-10-12-spec38a-motion-build.md` S1 to S5 are done (Gate 7 passed, the M6.5 sweep left zero old-motion blocks on every target except the canary's active header 3777 and drawer 3778). Each S4 track's open items are in its plan bullet. The M6.6C removal census is built (`reports/2026-10-17-motion-removal-census.md`).

**S6 (part done):** M6.6C and M6.6-G1 to G5 are on `main` (`254fb47` to `37498db`, shared files `0046d33`, reseed `07422e7`). The G1 to G5 canary deploy was refused by the stored-content audit for 19 leftover old values on 13 posts; `strip-retired-motion-attrs.py` (`01238b3`) stripped them on sandybrown (second dry run 0). **Next:** re-run the canary deploy, deploy to the three opt-in targets, then G0 (merges last) and Gate 8. **Then S7:** M5.18 (includes Track I item 4, the Fade Bold travel) and M6.7.

**Clone coverage** (`plans/2026-10-12-clone-coverage-foundation.md`): Spec 38A is its Phase 0. Phase 1 steps 1.1 to 1.4 are built on branch `claude/clone-coverage-plan-review-2bbei4` (`node scripts/computed-route/capabilities.mjs --gate`); next is step 1.5, the first run against the framework DB on Bean's PC, then triage and Bean's exclusion sign-off.

### Front H: Cloning system (Spec 48) and the Claude Design handover

**State:** Spec 48 (`specs/48-CLONING-SYSTEM.md`) is being built for Indus from `plans/2026-10-11-spec48-indus-build.md`; steps 1 to 14b are done and step 15 (your intake review) is paused until Spec 38A is finished. Your decisions so far are in `sites/indus-foods/build/intake/approved-decisions.json`, and the ones that generalise are standing rules in `scripts/computed-route/data/skeleton-decisions.json` (`node scripts/computed-route/check-approved.mjs indus-foods` must exit 0). The committed `intake.json` and `review.md` are the 12 October run; re-run intake (`intake.mjs indus-foods --record`, then `--rerun-skeletons`) before the review resumes. Route open items: Spec 48 §5.4 Residual.

**Handover standard:** Spec 48A v1.0 (`handoff-check.mjs`); B0 is done (every Claude Design project exported, the artifact-based Claude Design tested). **B5 open:** edit the Eye Care draft to mirror the live site (task 2 of `prompts/Track 2 Eye Care review.md`).

**Resume from:** `prompts/Track 1 Indus review.md` once S7 closes.

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
