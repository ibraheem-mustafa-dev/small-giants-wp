---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-11-19
---

# small-giants-wp: LEDGER (the one living status)

## Summary for Bean

- **Web engine (Front E):** the engine has its own repository, `C:\Users\Bean\Projects\small-giants-engine` (private on GitHub). You rejected its first plan on 2026-11-12. The design that replaces it is written there as a register of solutions, six specs and a build plan: existing open-source pieces for almost everything (Payload CMS, the Puck editor, shadcn/ui, Astro, Stripe), a back office on the VPS and each client's site as plain files on the business hosting. You are reviewing it piece by piece (piece 1 is settled; pieces 2 to 10 remain), in sessions that run in the engine's own folder; nothing is built until that review ends and you say go.
- **WordPress framework: frozen on 2026-11-12 (your decision), except the cloning pipeline, which you unfroze on 2026-11-15.** Outside the pipeline: security updates and client fixes only, no new framework features, specs or checks. Indus (signed off 2026-11-08) and Eye Care (signed off 2026-11-12) launch on WordPress when their clients are ready. A new client is built on WordPress until the engine passes its platform gate (the engine's Spec 01 section 13).
- **Mama's (Front H): WordPress is the goal again (your ruling, 2026-11-15); the engine is a side project.** The work is your issue register of 2026-11-17 (`sites/mamas-munches-redesign/build/qa/issue-register.md`, 127 items, every section worked and shipped) and its round two (`issue-register-round-2.md` beside it, 87 items; IDs carry on across the two; you ruled no round three, so round two finishes only at completion). A helper diagnoses each page and makes the simple fixes, I check its work, you decide the fixes that need code or a choice, and you close each item on mamas-test. Plan: `plans/2026-11-16-mamas-fix-and-surface-cloning.md`. Target: the MIC event on 2026-11-28.
- **Need you (Mama's):** the shop is live, fast on a phone (Google PageSpeed 2026-11-19 afternoon, median of 5: Home 95, Shop 82; Front S) and product photos are safe to replace. The phone lag fix, the wallet basket fix and the note box are live on all four live-ready sites (release `928803b8b`). A code review of that release raised ten findings, the first of which blocks your wallet test: they are fixed first, then you tap Apple Pay or Google Pay once more in a test-mode window with something else already in your basket. Send Zainab's seven questions (list in the plan, item 6); Lactation Cookies, the flavour list and the allergy note are already live.
- **Media system (Spec 49, Front P):** released 2026-11-12 on all four test sites.
- **Need you:** the rest of the engine's design review, in the engine's own folder; its LEDGER lists what is open. The rulings under Parked and Front N wait until a client fix needs one.

## Blockers

- None.

## Fronts

The WordPress fronts M, F, P and N are frozen as of 2026-11-12: their open items are worked only when a client fix or a security update needs them. Front H (the cloning pipeline) is live again from 2026-11-15, and framework work it needs to clone a surface is in scope.

### Front E: Web engine

**State:** the first plan was rejected by Bean on 2026-11-12; the design that replaces it is written and is being reviewed with him piece by piece (piece 1 settled on 2026-11-13). It lives in the engine's repository, `C:\Users\Bean\Projects\small-giants-engine` (private GitHub repository `ibraheem-mustafa-dev/small-giants-engine`): Specs 01 to 06 and a build plan under its `.claude` folder, kept consistent by its own checks, with its own LEDGER at `C:\Users\Bean\Projects\small-giants-engine\.claude\LEDGER.md`. The back office is assembled from existing pieces (Payload CMS, the Puck visual editor, shadcn/ui, Cloudflare) in one Next.js app on the VPS; each client's site is plain files built by Astro on the business hosting, with its own ordinary Stripe account; nothing is built. The first plan as filed here is kept in `plans/archive/2026-11-12-web-engine-architecture.md`. Research: `C:\Users\Bean\.claude\memory\research\2026-11-12-engine-adopt-first-stack.md` (the design's evidence) and `C:\Users\Bean\.claude\memory\research\2026-11-12-web-engine-replace-wordpress.md` (the first round). The concept it answers is `.claude/Proposal.md`.

**Resume from:** the engine's LEDGER, in a session started in the engine's own folder. Nothing in this repository changes for it: the draft reader (`scripts/computed-route/lib/read-logic.mjs` and its helpers), the parity walker, the page checks and the three handoff folders under `sites/` were copied from commit `a2ef66b37` (the engine's `PROVENANCE.md` lists each file), and anything else it needs is read from here, never edited.

**Rules that reach this repository:** a new client is built here until the engine passes its platform gate; the three WordPress sites get one capped update-and-test session a month; a signed-off site moves to the engine only if a change it needs costs more here than a move.

### Front M: Motion model (Spec 38A) and clone coverage

Built and closed (2026-10-18; Bean signed Gate 9). Open: FR-38A-33's `hover.effects` and `effects` layers for effects a draft builds in its own script (they wait for FR-48-77's recognisers), and FR-38A-57 (slant, custom axis angle, typing cursor), which you sequenced after the three test sites are cloned. Deploys run no live motion probes unless asked: `--motion-qa-tier full` before any release that touches motion, shared effects or the theme tokens. Clone coverage gate: `node scripts/computed-route/capabilities.mjs --gate`; gap list by wave: `--gaps`.

### Front H: Cloning system (Spec 48) and the Claude Design handover

**State:** the route (`scripts/computed-route`, `scripts/parity`) and `sites/<client>/build` were rewound on 2026-11-02 to the 2026-10-28 version (`0ea1a6cb2`); Indus and Eye Care were finished by hand from your issues lists and signed off; the route never runs on them again. The pipeline resumed on 2026-11-15 (your ruling): its goal is to clone every class of surface (regular pages, CPTs such as header, footer, drawer, form and modal, and template pages such as the shop's), with Mama's as the proof. Its unbuilt requirements are in Spec 48 §16.1 (FR-48-95 to FR-48-107) with your standing rulings in §16.2 (FR-48-108 to FR-48-112). Spec 48 holds the route's status; `node scripts/computed-route/check-approved.mjs indus-foods` must exit 0.

**Your rulings of 2026-11-15 for cloning:** where no setting matches a draft value the route writes Custom CSS and lists each use in the run's report; a clone sticks to the draft, so the 24px tap-target minimum is withdrawn; Mama's only accepted differences are everything subscriptions alone need (deferred and not shown), the send-to-hospital item (already out of the draft) and the account banner with mamas-test's wording.

**Mama's:** LIVE on `https://mamasmunches.com` since 2026-11-18, every live-ready site runs release `928803b8b` (2026-11-19); state, what is live, the review of that release (ten findings, none fixed yet: the first open task) and the ordered next steps are in `plans/2026-11-16-mamas-fix-and-surface-cloning.md` ("Where it stands and what is next"). The live shop's files and database are in the server folder `domains/lightsalmon-tarsier-683012.hostingersite.com/public_html`: never delete that hosting entry. Deploy target `mamas-test`, kind `live`: never push a mirror onto it, back up with `scripts/local-wp/backup-remote-db.sh` before any content edit, and check basket, checkout and account before and after any deploy.

**Template rework (your ruling of 2026-11-18):** planned, reviewed by two councils and settled with you the same day. It is two streams. This repo's plan `plans/2026-11-18-template-rework.md` covers the shop surfaces and a before-and-after check that protects live sites (nine tasks). Task 1, the check, is built and on `main` (`scripts/render-check/`, commits `d93c34eb8`, `11263b7c4`, `4863f79af`; `python scripts/render-check/render-check.py --self-test` passes all five cases). Task 2 (what `main` holds for Indus and Eye Care) has its groundwork done and is next; Task 5 step (a) is written but untested, saved as the patch `.claude/backups/2026-11-19/task5a.patch` (uncommitted, applies to `main`), to be tested with `scripts/render-scope/render-scope.py` and, if its reach warrants it, the check; Task 3 and the rest are open (the plan's first action and Task 2 Status say where to resume). The general cloning work (route fixes, the token extractor, buttons, the Claude Design instructions) is the second stream, briefed by `prompts/2026-11-18-route-regular-pages.md` and carried out by `plans/2026-11-19-general-cloning-work.md` ("Where it stands" holds its state): every route, extractor and Claude Design instructions commit of this stream is on `main` (last one `43e8ae869`, nothing deployed anywhere): safe scratch-copy runs and a lock-out that stops any test reaching a site, the residual Custom CSS writer, the class (b) route fixes, header, footer and drawer rounds one and two, the extractor's button and served-draft measurement, the hero and accordion batch (additive settings, off or unset by default) and `scripts/render-scope/render-scope.py`. On a clean scratch copy Mama's Contact, Help and Home are within about 3% of the draft's page height and Help has every draft text leaf, but Indus Home and Eye Care Home from the handoff alone are not presentable: the two helpers' homepage fixes were stopped by a machine restart and sit unlanded in `E:\sgs-tmp\wt-general-s` and `wt-general-t`. Open: the one-command foundation and surface (Task 3), renderers taking a button preset under the draft's own name (Task 5) and the proof (Task 8). You will not start designing the two new sites until you have seen that evidence. Evidence and the council's verdict: `reports/2026-11-18-template-rework/` (`council-report.md` first). Two standing warnings: do not deploy `main` to indus-test or eye-care-test before the plan's Task 2 (a comparison found four unwanted changes waiting for them, `reports/2026-11-18-template-rework/checks.md`), and run `scripts/render-scope/render-scope.py` before a plugin or theme change that could alter what a page renders: the slow render check (`scripts/render-check/`) runs only when the change's risk and reach warrant it (your ruling, 2026-11-19), because every Mama's fix deploys `main` whole.

**Handover standard:** Spec 48A v1.4 (`handoff-check.mjs`); the files you upload to a Claude Design project are `claude-design-handoff/CLAUDE.md`, `WHAT-WE-BUILD.md` and `handoff-schema/` (a ready copy is in `E:\sgs-tmp\general-cloning\upload\`). Open: edit the Eye Care draft to mirror the live site (Spec 48A FR-48A-11).

- **Mirror runs:** set a mirror's login after a refresh with `node scripts/local-wp/reset-login.mjs <mirror>`. Build the site on the mirror and copy it with `scripts/local-wp/push-to-remote.sh` (Hostinger's edge 403s editor bursts). A site build against a mirror nulls the page map's ids it did not adopt (`lib/site-build-map.mjs::rowsForSite`): restore `page-map.json` from git after one, and run template copies with `--templates-only`. Edit shared scripts (`scripts/wp-build-page.js` and the like) in a worktree, never the main checkout, while another track's run uses them.
- **Uncommitted on purpose:** `sites/*/build/qa/parity/template-order-confirmation.fill*.mjs` hold a test order's key.

### Front F: Eye Care Birmingham (finished)

Signed off by Bean (2026-11-12). eye-care-test (`https://darkcyan-grouse-898606.hostingersite.com`, credentials `.claude/secrets/eye-care-test.env`) holds rounds 1 to 15 (fix register `plans/archive/2026-10-02-eye-care-fix-register.md`; decided differences in `sites/eye-care-ward-end/build/qa/decided.md`). Ship with `plugins/sgs-blocks/scripts/ship.py --target eye-care-test`.

**Open:**
- **If checkout jumps again on a phone** (not reproduced; mitigation `5d38b580a`): Bean sends a screen recording and the phone model. **At launch:** switch eye-care-test's email to Eye Care's own mailbox (`dev-setup.md` §Site email).
- **Custom CSS that the media controls can now replace:** the hero focal points (post 208) and the lens tag and outline (post 463).
- **Lint-js (R3-25):** about 6,500 errors, mostly formatting; needs a quiet window.

### Front P: Media system (Spec 49)

**State:** released 2026-11-12. Spec 49 v1.0: Stages A and B are on `main` (merge `c5f3b36cd`, last fix `419b4cb6a`); saved content is migrated on sandybrown, mamas-test, indus-test, eye-care-test and the four local mirrors (server backups in `~/sgs-media-backups/<target>/`, restore with `plugins/sgs-blocks/scripts/migrate-media-system/cli.py restore --remote <target> --backup <file>`); all four sites run the release. The plan is archived: `plans/archive/2026-11-10-spec49-stage-b.md`.

**Open:** Stage C (native parallax driver, uploaded mask shapes) is not scheduled (Spec 49 §14.1). Eye Care's Custom CSS (hero focal points on post 208, lens tag and outline on post 463) can now move to the media controls.

### Front N: Nav / header / footer (Specs 36 and 37)

**State:** Waves 1 to 3C are built and live on sandybrown; Gate 3C items 1, 2, 3 and 5 pass; item 4's last mile is deferred by you (list: `verify/merged-spec36-37-track.md`, "Gate 3C last mile"). Waves 4 and 5 are Spec 37 FR-37-56 and FR-37-23; nothing is in progress. Resume point: item 5 of `plans/2026-10-30-clone-recognition-fixes.md`, "Parked: resume after the hand-built sites".

**Header behaviour change (2026-11-09, `89b3531b5` to `91d955343`):** the header's shrink no longer restyles the page; `plugins/sgs-blocks/src/header-behaviours/live-header-height.js`. Live on sandybrown, mamas-test, indus-test, eye-care-test.

**Open (each Spec 36, 37 or 38 Status line holds the detail):**
- **FR-36-16 (your choice):** the late-CSS A/B fails on the drawer because `nav-drawer/style.css` places the close control and first link; relax the test to the dialog box plus dismissal, or emit the drawer's whole layout in the scoped rules.
- **FR-38-31 (your eye):** the aurora and ink wave styles painted black in a local Chrome; check them on a real GPU.
- FR-36-17: the mega pages exceed the 100 KB CSS and 50 KB JS budget. FR-36-11: the active item under forced colours is not confirmed live. The homepage layout shift (0.82 at 375) is untraced.
- `sgs-client-notes` deploys through `plugins/sgs-blocks/scripts/deploy-client-notes-quick.py`, not `build-deploy.py`.

### Front S: Site speed (CSS delivery, Spec 32 FR-32-32)

**State:** no page waits on one stylesheet request per block type any more. Shared stylesheets print as order-preserving runs, inside the page (`inline`, the framework default) or as one cached file per run (`bundle`), set per site on SGS → CSS Output (`sgs_css_shared_delivery`); page-specific CSS prints inside the page; every font preset carries its size-matched fallback. Live on sandybrown, mamas-test, indus-test and eye-care-test (`45aef2042`); the code-review fixes are on `main` and not yet deployed. Saved modes: `bundle` on mamas-test (Bean's ruling after measuring both on the live shop: Home 95, Shop 82 against `inline`'s 90 and 86), `inline` everywhere else. Canary: Home 92 to 98, Shop 90 to 95.

**Resume from:** `plans/2026-11-19-css-delivery.md` "Open" (Shop image loading, footer JavaScript, page cache; Mama's moves to `inline`, so `bundle` hardening is parked), then Stage C, shrinking per-instance CSS at source: `plans/2026-11-19-stage-c-per-instance-css.md`.

## Parked

- **Custom CSS and logins without administrator rights (your rulings, 2026-11-17):** a page saved by a Shop manager loses every Custom CSS rule on it; you ruled that a save must never remove Custom CSS it may not change, and that the control is for anyone who may edit the page. Spec 32 FR-32-30, not built. Until it is, give a client an Administrator or Editor login, never Shop manager, on a site that carries Custom CSS (Mama's does).
- **CR12, parked by you:** the dark-mode toggle renders nothing because no client sets dark tokens; three design options sit on its register row.
- **CR23:** about 72 Eye Care differences no setting can reach (a 2026-10-07 snapshot), carried as missing-feature rows.
- **WW-SH-04 (your ruling):** the Solve answer sheet labels a shop write wrong on "assumed" evidence (Spec 48 §5.4 Res 34).
- **Unwired scripts (your ruling):** nav-qa `u1-owed-probe.mjs` with `qa-u1-owed-fixture.php`, and the `motion-qa` probes whose target pages no doc registers (`plugins/sgs-blocks/scripts/audit-live-script-closure.py` lists them).
- **Product-card value ladder:** 24 editor-canvas controls wait for a bound-mode canvas preview (parked by you; baseline `plugins/sgs-blocks/scripts/wiring-fingerprint-baseline.json`).
- Optional editor-check speed-ups (`plans/patches/`): `plans/archive/2026-11-11-deploy-speed.md`.
- **Parked plans, frozen with the framework on 2026-11-12:** Snooza Chair configurator build (`plans/2026-08-03-snooza-configurator-build-plan.md`); form and choice-flow pipeline and analytics (`plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md`); the three sites' finishing plan, which now holds Mama's open list as a record (`plans/2026-11-02-clone-finishing-streams.md`). The automatic cloning tool's plan (`plans/2026-10-30-clone-recognition-fixes.md`) is no longer parked: the pipeline resumed on 2026-11-15 (Front H).

## Live state

- **Branch:** `main`; many sessions share this tree. **What each site runs:** `ssh hd "cat ~/.sgs-deploy-marker-<target>.json"`; deploy targets are `TARGETS` in `plugins/sgs-blocks/scripts/deploy_common.py` (`sandybrown`, `indus-test`, `eye-care-test`, `eye-care-clone-test`, `mamas-test`); sandybrown, mamas-test, indus-test and eye-care-test run `45aef2042` (deployed 2026-11-19 14:32 to 14:35), eye-care-clone-test `c7b9372ff` (marker read 2026-11-19).
- **sandybrown (canary, default target):** WordPress 7.1.3; homepage page **2742**, posts page **2741**; motion-QA fixtures 2103, 2109, 2113, 2603, 2740, 3037, 5223, 5226 and 5229 are never deleted. Draft 5498 carries four baselined stored-shape findings (`plugins/sgs-blocks/scripts/oldshape-audit-baseline.json`); delete them when it is trashed or re-saved. Deploy scp runs about 250 KB/s (a plain scp, 6 MB/s); six sandybrown resets 2026-11-10, the sixth with gates cached and the machine idle, not gate overlap; the 2026-11-12 release deployed it in one run.
- **Client test sites** (named explicitly to deploy, WordPress 7.1.3): eye-care-test, indus-test (the Indus clone, brief `sites/indus-foods/CLAUDE.md`) and mamas-test (brief `sites/mamas-munches-redesign/CLAUDE.md`; its active header and footer are `sgs_header` 178 and `sgs_footer` 176). Each holds Spec 48's private calibration page (§3.2, `scripts/computed-route/calibration-targets.json`).

## Known failing tests

- Jest suites `configurator-schema-compat` and `cursor-field-reveal-open` fail on main.
- Reloading with the page scrolled shifts content on shop (46px at 1440) and product (about 20px), measured by the Eye Care session (`E:/sgs-tmp/ec-check/reload-recheck.cjs`); it is on that session's round 13 list.
- `icon-brand`/`icon-custom` roles: Bean's call, only if Spec 48 cloning must place them (`plans/archive/2026-11-05-icon-source-detector.md`).
- `plugins/sgs-blocks/scripts/db-consistency/tests/test_f6_consistency.py::TestCheck5VariantReseed` (4 tests): the fixtures predate the `slot_value` column (2026-09-05) and one assert expects 2-tuples where the code returns 3-tuples. Small fix in the tests.
- A fresh worktree needs its own `npm ci` in `scripts/computed-route` and `plugins/sgs-blocks` and a copy of `cache/`, or route tests fail for that reason alone (`dev-setup.md`).
- `node scripts/computed-route/check-approved.mjs indus-foods` exits 1 and about 78 route tests fail on `main`: Indus's and Eye Care's recorded intake is stale against their handoff folders (a token file edited on 2026-11-09, Eye Care's draft on 2026-10-28). The reruns are in progress (`plans/2026-11-19-general-cloning-work.md`, helper `intake-rerun`).
- `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json`: divergences D-72 to D-91 (except D-87) cite no register decision, and the README does not list the new `lib/motion-validate.mjs`, `lib/motion-refusals.mjs` and their tests.
