---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-11-12
---

# small-giants-wp: LEDGER (the one living status)

## Summary for Bean

- **Mama's (Front H):** the one client stream now. Indus (signed off 2026-11-08) and Eye Care (signed off 2026-11-12) are finished; Mama's is finished by hand from `plans/2026-11-02-clone-finishing-streams.md` section "Mama's (now)", the one Mama's plan (open list included).
- **Media system (Spec 49, Front P):** Stage B on its branch, every block adopted; removal, cloner and release next.
- **Nav / header / footer (Front N):** Waves 1 to 3C are live; Gate 3C's last mile is deferred by you; Waves 4 and 5 have not started.
- **Need you:** the rulings under Parked, the Spec 36 and Spec 38 choices under Front N.

## Blockers

- None.

## Fronts

### Front M: Motion model (Spec 38A) and clone coverage

Built and closed (2026-10-18; Bean signed Gate 9). Open: FR-38A-33's `hover.effects` and `effects` layers for effects a draft builds in its own script (they wait for FR-48-77's recognisers), and FR-38A-57 (slant, custom axis angle, typing cursor), which you sequenced after the three test sites are cloned. Deploys run no live motion probes unless asked: `--motion-qa-tier full` before any release that touches motion, shared effects or the theme tokens. Clone coverage gate: `node scripts/computed-route/capabilities.mjs --gate`; gap list by wave: `--gaps`.

### Front H: Cloning system (Spec 48) and the Claude Design handover

**State:** the route (`scripts/computed-route`, `scripts/parity`) and `sites/<client>/build` were rewound on 2026-11-02 to the 2026-10-28 version (`0ea1a6cb2`); the three sites are finished by hand from your issues lists. The automatic cloning tool resumes once Mama's is signed off; its open requirements are Spec 48 §16.1 (FR-48-95 to FR-48-107) and your standing rulings are §16.2 (FR-48-108 to FR-48-112). Spec 48 holds the route's status; `node scripts/computed-route/check-approved.mjs indus-foods` must exit 0.

**Resume from:** `plans/2026-11-02-clone-finishing-streams.md` (Mama's).

**Handover standard:** Spec 48A v1.0 (`handoff-check.mjs`). Open: edit the Eye Care draft to mirror the live site (Spec 48A FR-48A-11).

- **Mirror runs:** set a mirror's login after a refresh with `node scripts/local-wp/reset-login.mjs <mirror>`. Build the site on the mirror and copy it with `scripts/local-wp/push-to-remote.sh` (Hostinger's edge 403s editor bursts). A site build against a mirror nulls the page map's ids it did not adopt (`lib/site-build-map.mjs::rowsForSite`): restore `page-map.json` from git after one, and run template copies with `--templates-only`. Edit shared scripts (`scripts/wp-build-page.js` and the like) in a worktree, never the main checkout, while another track's run uses them.
- **Uncommitted on purpose:** `sites/*/build/qa/parity/template-order-confirmation.fill*.mjs` hold a test order's key.

### Front F: Eye Care Birmingham (finished)

Signed off by Bean (2026-11-12). eye-care-test (`https://darkcyan-grouse-898606.hostingersite.com`, credentials `.claude/secrets/eye-care-test.env`) holds rounds 1 to 15 (fix register `plans/archive/2026-10-02-eye-care-fix-register.md`; decided differences in `sites/eye-care-ward-end/build/qa/decided.md`). Ship with `plugins/sgs-blocks/scripts/ship.py --target eye-care-test`.

**Open:**
- **If checkout jumps again on a phone** (not reproduced; mitigation `5d38b580a`): Bean sends a screen recording and the phone model. **At launch:** switch eye-care-test's email to Eye Care's own mailbox (`dev-setup.md` §Site email).
- **Custom CSS until Spec 49:** the hero focal points (post 208) and the lens tag and outline (post 463).
- **Lint-js (R3-25):** about 6,500 errors, mostly formatting; needs a quiet window.

### Front P: Media system (Spec 49)

**State:** branch `feature/media-stage-b` (pushed; not merged): all 29 blocks adopted, repo content migrated, Spec 49 v0.9 written on the branch. While the branch exists, main commits touching those block folders are refused (`scripts/check-stage-b-freeze.py`). Finishing: old-code removal, motion hover routes, cloner switch-over; then gates, merge, release. Status and resume point: `plans/2026-11-10-spec49-stage-b.md` Progress.

**Motion findings:** Spec 38A (FR-38A-27, 34, 44, 45, §17); effects runs `reports/2026-11-09-media-controls/T10-effects-run.md`, `T12-effects-run-A.md`, `-B.md`.

**Open:** Eye Care's Custom CSS controls and Mama's media work wait for the release. Never build or seed from the branch without `SGS_FRAMEWORK_DB` set (it wrote the shared DB once on 2026-11-11; fixed).

### Front N: Nav / header / footer (Specs 36 and 37)

**State:** Waves 1 to 3C are built and live on sandybrown; Gate 3C items 1, 2, 3 and 5 pass; item 4's last mile is deferred by you (list: `verify/merged-spec36-37-track.md`, "Gate 3C last mile"). Waves 4 and 5 are Spec 37 FR-37-56 and FR-37-23; nothing is in progress. Resume point: item 5 of `plans/2026-10-30-clone-recognition-fixes.md`, "Parked: resume after the hand-built sites".

**Header behaviour change (2026-11-09, `89b3531b5` to `91d955343`):** the header's shrink no longer restyles the page; `plugins/sgs-blocks/src/header-behaviours/live-header-height.js`. Live on sandybrown, mamas-test, indus-test, eye-care-test.

**Open (each Spec 36, 37 or 38 Status line holds the detail):**
- **FR-36-16 (your choice):** the late-CSS A/B fails on the drawer because `nav-drawer/style.css` places the close control and first link; relax the test to the dialog box plus dismissal, or emit the drawer's whole layout in the scoped rules.
- **FR-38-31 (your eye):** the aurora and ink wave styles painted black in a local Chrome; check them on a real GPU.
- FR-36-17: the mega pages exceed the 100 KB CSS and 50 KB JS budget. FR-36-11: the active item under forced colours is not confirmed live. The homepage layout shift (0.82 at 375) is untraced.
- `sgs-client-notes` deploys through `plugins/sgs-blocks/scripts/deploy-client-notes-quick.py`, not `build-deploy.py`.

## Parked

- **CR12, parked by you:** the dark-mode toggle renders nothing because no client sets dark tokens; three design options sit on its register row.
- **CR23:** about 72 Eye Care differences no setting can reach (a 2026-10-07 snapshot), carried as missing-feature rows.
- **WW-SH-04 (your ruling):** the Solve answer sheet labels a shop write wrong on "assumed" evidence (Spec 48 §5.4 Res 34).
- **Unwired scripts (your ruling):** nav-qa `u1-owed-probe.mjs` with `qa-u1-owed-fixture.php`, and the `motion-qa` probes whose target pages no doc registers (`plugins/sgs-blocks/scripts/audit-live-script-closure.py` lists them).
- **Product-card value ladder:** 24 editor-canvas controls wait for a bound-mode canvas preview (parked by you; baseline `plugins/sgs-blocks/scripts/wiring-fingerprint-baseline.json`).
- Optional editor-check speed-ups (`plans/patches/`): `plans/archive/2026-11-11-deploy-speed.md`.
- **Parked plans, each with its resume point:** Snooza Chair configurator build (`plans/2026-08-03-snooza-configurator-build-plan.md`); form and choice-flow pipeline and analytics (`plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md`); the automatic cloning tool, resumed after Mama's, with the handoff readers, the spec audit register's fix pass and the header and nav Waves 4 and 5 folded in (`plans/2026-10-30-clone-recognition-fixes.md`, "Parked: resume after the hand-built sites").

## Live state

- **Branch:** `main`; many sessions share this tree. **What each site runs:** `ssh hd "cat ~/.sgs-deploy-marker-<target>.json"`; deploy targets are `TARGETS` in `plugins/sgs-blocks/scripts/deploy_common.py` (`sandybrown`, `indus-test`, `eye-care-test`, `eye-care-clone-test`, `mamas-test`); indus-test runs `f579fdb33`, sandybrown `f5d0e9810`, mamas-test `e2c227b79`, eye-care-test `97028e38e` (2026-11-11), eye-care-clone-test `c7b9372ff` (markers read 2026-11-09).
- **sandybrown (canary, default target):** WordPress 7.1.3; homepage page **2742**, posts page **2741**; motion-QA fixtures 2103, 2109, 2113, 2603, 2740, 3037, 5223, 5226 and 5229 are never deleted. Draft 5498 carries four baselined stored-shape findings (`plugins/sgs-blocks/scripts/oldshape-audit-baseline.json`); delete them when it is trashed or re-saved. Deploy scp runs about 250 KB/s (a plain scp, 6 MB/s); six sandybrown resets 2026-11-10, the sixth with gates cached and the machine idle, not gate overlap; retry at the Spec 49 Stage B release (Bean).
- **Client test sites** (named explicitly to deploy, WordPress 7.1.3): eye-care-test, indus-test (the Indus clone, brief `sites/indus-foods/CLAUDE.md`) and mamas-test (brief `sites/mamas-munches-redesign/CLAUDE.md`; its active header and footer are `sgs_header` 178 and `sgs_footer` 176). Each holds Spec 48's private calibration page (§3.2, `scripts/computed-route/calibration-targets.json`).

## Known failing tests

- Jest suites `configurator-schema-compat` and `cursor-field-reveal-open` fail on main.
- Reloading with the page scrolled shifts content on shop (46px at 1440) and product (about 20px), measured by the Eye Care session (`E:/sgs-tmp/ec-check/reload-recheck.cjs`); it is on that session's round 13 list.
- `icon-brand`/`icon-custom` roles: Bean's call, only if Spec 48 cloning must place them (`plans/archive/2026-11-05-icon-source-detector.md`).
- `plugins/sgs-blocks/scripts/db-consistency/tests/test_f6_consistency.py::TestCheck5VariantReseed` (4 tests): the fixtures predate the `slot_value` column (2026-09-05) and one assert expects 2-tuples where the code returns 3-tuples. Small fix in the tests.
- `tests/php/DecorativeImageLayerTest.php` and `ProductCardImagePriorityTest` (plugin `sgs-blocks`): red on `main`, green on `feature/media-stage-b`; they turn green on `main` at the Spec 49 Stage B merge (Front P).
- A fresh worktree needs its own `npm ci` in `scripts/computed-route` and `plugins/sgs-blocks` and a copy of `cache/`, or route tests fail for that reason alone (`dev-setup.md`).
- `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json`: divergences D-72 to D-91 (except D-87) cite no register decision, and the README does not list the new `lib/motion-validate.mjs`, `lib/motion-refusals.mjs` and their tests.
