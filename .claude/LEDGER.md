---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-10-12
---

# small-giants-wp: LEDGER (the one living status)

## Summary for Bean

- **Eye Care is built by hand first (D1149).** Every surface is built and live on eye-care-test; the finished site becomes the cloning pipeline's answer key. The fix register is the work list and every decision in it is taken.
- **The cloning route's "Solve" tool** (Spec 48 §3.3) measures the draft against the live site and writes block settings itself. The About page is at 100%. Current counts live in the triage files, never in this document.
- **Nav / header / footer** (Specs 36 and 37): Waves 1 to 3C are live on sandybrown; Waves 4 and 5 have not started. You deferred the last mile of Gate 3C.
- **The Claude Design handover is standardised and the cloning system is specified (Front H).** Drafts come from Claude Design's "Handoff to Claude Code" run by one pasted prompt, land unchanged in `sites/<client>/handoff/` and are checked by Spec 48A. Spec 48 (the cloning system, replacing Spec 47) is written: accuracy designed in from the start, Indus first then Mama's. Building it for Indus is under way (`plans/2026-10-11-spec48-indus-build.md`: stage 0, the framework halves and the intake command are done; intake step 14b, then Bean's intake review, are next); Eye Care's draft is edited to mirror the live site (B5). Indus and the Mama's redesign keep their fresh test sites (`indus-test`, `mamas-test`).
- **Specs** are tidied to current truth (24 live specs; the generated block reference is separate). Cloning is Spec 48 only (Spec 47 is archived inside it): Specs 31, 44, 45, 20 and 19 are gone, and the roster's "Not a live spec" table maps every old number to its home. The old cloning converter and its scripts, gates and database tables are deleted; git history holds them.
- **Clone coverage and the motion model (Front M).** Spec 48 was written draft-in only, so framework capabilities (behaviour settings, most fx effects, entrance stagger, search, SEO, consent, forms beyond the basics) had no clone path. `plans/2026-10-12-clone-coverage-foundation.md` fixes that with a generated capability inventory and a failing coverage test; its Phase 0, the motion redesign (Spec 38A), is being built from `plans/2026-10-12-spec38a-motion-build.md`. Session S1 landed all 10 of its units (the motion schema, field-type helpers, tokens, presets, the support on 74 blocks, the value controls, the editor baseline) and retired the old `animation_tokens` table after your approval.
- **Need you directly:** the drawer-burger click retest, the mega-motion eye check, and the Eye Care rulings listed under Parked.

## Blockers

- None.

## Fronts

### Front F: Eye Care Birmingham, built by hand (D1149)

**State:** every surface built and live on eye-care-test; both sites run WooCommerce 11.1.2. Draft `https://mintcream-lyrebird-224487.hostingersite.com/`; test site `https://darkcyan-grouse-898606.hostingersite.com` (credentials `.claude/secrets/eye-care-test.env`). Spec 47's computed route (`scripts/computed-route/`, `specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`) is built except stage 5 (a second designer's draft), which is replanned after the handover standard (Front H); route defects with owners are in its §5 Residual. Route-accuracy phases R1-R6 (scoring the route against a frozen answer sheet of 100 hand-labelled rows, a skeleton writer from the draft's own element IDs, exact ID pairing, a "does it paint?" check in the walker, try-before-write) are built and on `main` at `8b0a859a5`, scripts only, nothing deployed. Solve now tries every write in the open live page before the rebuild and never writes a rejected one: a home run on the local mirror rejected the doubled card paddings, took 3 walks instead of 13 and had 1 wrong setting of 18. Answer sheet: header pattern-2 false alarms 3/3 dropped by ID pairing (was 0/3); home wrong writes avoided 5/7 (was 0/7), home re-baselined on that run. Not done: re-pairing footer and header with the new identity checks exposed two defects, so the configs stay at HEAD (link-list identities point at the list's first link; the header loses its identity-added root pair to a word-based width refusal), and the trial misses margin writes that the rebuild shows moving boxes (shop WW-SH-01). `scripts/computed-route/tests/lint.test.mjs` fails 3 tests on the shared DB's `sgs/icon.brandName` css_property (5 at `0ce2f02a5`), not route-accuracy work.

**Blockers:** none.

**Resume from:** `plans/2026-10-04-spec47-full-coverage.md` "Route-accuracy build": the R6 notes (trial hardening's two opens), "Found by re-pairing footer and header" and the QC council's open list under R6; or the next tier of `plans/2026-10-05-eye-care-functionality-backlog.md`.

**Bean-only for this front:** WW-SH-04's answer-sheet label (the plan's R6 notes: the trial keeps a write the sheet calls wrong on "assumed" evidence).

Governing documents (one job each):
- Fix register, the source of truth for what gets fixed: `plans/2026-10-02-eye-care-fix-register.md`.
- Decisions, surfaces and what is owed: `plans/2026-10-02-eye-care-plan.md`.
- Per-surface Solve work: `plans/2026-10-04-spec47-full-coverage.md`.
- Features, controls and QC finds: `plans/2026-10-05-eye-care-functionality-backlog.md`.
- Measured state: read the counts from `sites/eye-care-ward-end/build/qa/triage/*.json`, never a cached figure. Compare sweeps on a normalised path, and never compare a raw triage count with a hand-audited one.

Operating rules:
- After every sweep, run `scripts/computed-route/confirm-canvas.mjs --candidates` to re-measure each canvas citation.
- `solve.mjs` defaults to 3 WRITE rounds. `--rounds 0` still rebuilds every surface's page from its tree file (`solve.mjs::build` runs `wp-build-page.js`); it writes no solver setting.
- Run host tools with `SGS_HEADED=1`, one job at a time; `curl` one probe first because the host edge 403s bursts. Local mirrors on localhost:8081/8082/8083 need `curl -6` and carry no `cr-ref` for header, mega, shop, product, lens or size-guide.
- A plugin deploy does not apply a tree fix: rebuild the page with `wp-build-page.js`, one page at a time.
- Never remove `section.sgs-hero{max-width:none}` (D725); `sgs/hero`'s `maxWidth` is a real gap (backlog). The focus ring stays the client accent (D467).

Open owed items:
- **F3/E14** (every element the gate found has a control or a zero-specificity default): ceilings CLASS-2 0, CLASS-3 0, CANNOT-RESOLVE 0; only the advisory backlogs rule 03 and rule 31 remain (triage §6). Owner: the backlog.
- **Box alignment** (`check:box-alignment`): indus-test's next deploy must carry `b90def34b`, `50449c17e` and `afae93d66`; the front-end separator at a numeric 40% width is not yet read in LTR and RTL. Owner: the backlog.
- **CR6** (padding and margin print only the sides that are set) is done and live, front end and editor (`plans/archive/2026-10-07-cr6-box-longhand-migration.md`). The 31 held routing rows stay NULL on purpose.
- **Spec 47 local baseline** (2026-10-09, 3 rounds on all 17 surfaces against the local mirror `localhost:8081` via `solve.mjs --site local-eye-care`; report `.claude/reports/2026-10-09-session-d-local-baseline/REPORT.md`): about 57% of open rows were false positives (council audit). The walker no longer reads visually hidden text as painted (footer walk 746 open rows to 599, `.claude/reports/2026-10-09-skeleton-writer-test/evidence/footer-walk-{before,after}-hidden-text-fix.md`). The mirror was refreshed from eye-care-test after the header/footer changes (`scripts/local-wp/refresh-from-remote.sh`, home cards back to 291px). Open tool defects, in order, are in the plan.
- **Header, footer and drawer (2026-10-09, Bean's decisions, register N47 to N49, 39 to 43, N7, 46):** the wordmark is an image (media 1467) in the header, footer and drawer; the Shop list has no "Glasses — arriving soon" line; "Visit or call" is one `sgs/icon-list` fed by Site Info; the bottom strip is black with the "Website by Small Giants Studio" credit; the footer and drawer social icons use colour mode `brand-glyph` (logo only in the brand colour, brand border and ring on hover). The hosted draft and `sites/eye-care-ward-end/Ward End Eye Care - SGS Gap Handoff/Eye Care Birmingham.dc.html` follow live (Bean: live is the ideal; backups `index.html.bak-2026-10-09-*` on the draft host). Ledger: 90 entries; footer entries whose differences the draft no longer has were removed on Bean's decision.
- **Framework added 2026-10-09:** `sgs/icon-list` Site Info items; `sgs/icon` colour mode `brand-glyph`; draft-style icon controls (brand gradient ground, hold brand colours on hover, rest and hover shadows, hover move/turn/scale, separate timings, spring easing; proven against the Basket and Indus Foods v2 footer icons on the local sandybrown mirror, `plans/archive/2026-10-09-social-icon-draft-styles.md`). DB reseeded (`9bca19170`, all DB gates pass); sandybrown and eye-care-test run `db9d63ac8`; the draft-style proof also passes on canary page 5193. After any reseed run `plugins/sgs-blocks/scripts/dbschema/seed_reference_data.py`: a full `sgs-update-v2.py` leaves `sgs/hero.splitMediaType` reclassified.
- **Fill's Site Info row icons (2026-10-10, `95fe30524`):** Fill writes a social row's shared look once on the row's `childIcon*` settings (`lib/fill-row-lift.mjs`), proved on the real footer row (background, border colour, 250ms transition, 44px shape, 18px glyph; icons keep brand and link only). Since `676d1f15a` Fill treats a calibration fixture's styling preconditions as unstyled and writes the row's 1px border, border style and background switch; since `b2bb2e636` `sgs/icon`'s `shapeSize` calibration markers sit above the glyph (recalibrated on local-eye-care). Still open in the plan's R3 notes: recalibrating `sgs/social-icons` with the new size-box markers, and the 2026-10-09 footer skeleton's stale raw stamp selectors. The hosted draft now serves a newer single-file bundle (footer links 44px) than the local handoff folder.
- **Icon unification and spacing control** (`plans/archive/2026-10-08-icon-unification-and-spacing-control.md`): `sgs/icon` is the one icon block and `sgs/social-icons` its Site Info row; open points are in Spec 47 §7.
- **Register rows:** every row carries a Lane and a hash in the fix register; the wiring gate blocks new gaps only (baseline `plugins/sgs-blocks/scripts/wiring-fingerprint-baseline.json`).

**Bean-only tasks:** the register's Bean rulings (see Parked); the trademark sentence in the Site Info copyright text (register 46).

### Front H: Claude Design handover standard and the unified cloning spec

**State:** B4 done (2026-10-11). Spec 48, the cloning system (`specs/48-CLONING-SYSTEM.md`, 0.2.0), replaces Spec 47 (archived byte-identical; FR-47-n, R-47-n, walker items and §2-§7 kept), designed with Bean after a gap-analysis council and hardened by a final five-persona council (`.claude/reports/2026-10-11-spec48-gap-council/`). Accuracy is built in from stage 1: a value matrix gives every kind of value a read, write, check and gap rule, checked code to code with the render confirming; a gap reaches the framework list only through gates G0-G7. Spec 32 is slim (3.1.0: styling contract and snapshot format, new FR-32-14 to FR-32-20); Spec 27 gains FR-30-16/17. `scripts/check-spec-id-landing.py` proves every kept ID lands. Appendix B (the Indus critical path) is under way. Phase 2, the Spec 32 framework halves (steps 9 to 12), is done and live on `indus-test` at `3e1bdd9e9` and on sandybrown and eye-care-test (colours and gutter read unchanged there, 2026-10-12): five palette slugs and a container Section ground (FR-32-14), per-tier section padding and gutter tokens read by `theme/sgs-theme/assets/css/layout-tokens.css` (FR-32-15), and `sgsCustomCss` parsed and scoped per instance (FR-32-20), each verified live. Phase 1 (steps 1 to 8) is done: the route has its own pinned packages (`npm ci` in `scripts/computed-route`), a per-site default paint, accepted value forms (`clamp`, `vw`, `repeat`), the 1440 desktop tier, the `container.layout` resolver fixes, portable calibration fixtures, and a stage-0 run on the Indus mirror `local-indus` (port 8083) that has all 17 Indus blocks current and wrote `sites/indus-foods/build/intake/calibration-baseline.json` (`7e7a72c86`). `calibrate.mjs` now refuses a slot map that drops a setting the shared map reaches unless `--allow-loss` names it; its refusals on Indus exposed and fixed three framework defects (FR-48-3 Status). indus-test sends email through the studio mailbox, redirected to it (step 2). Phase 3 steps 13 and 14 (stage 1 intake) are done: `node scripts/computed-route/intake.mjs <client>` runs the export in a network-sealed sandbox under a deterministic clock and writes `intake.json`, Bean's `review.md` and the proposed `page-map.json`; an Indus rehearsal passes with no live request (about 97 minutes; 415 review rows need reading). Route suite 1135/1138 (the 3 known `lint.test.mjs` brandName failures). Spec 48A v0.1 with `handoff-check.mjs`; the Indus and Mama's exports in `sites/<client>/handoff/` pass it (repackaged 2026-10-11 by `handoff-repackage.mjs`; no design change since export).

**Blockers:** none for the route lane; step 15 (the intake run and Bean's review) needs step 14b (the re-derived animation and state inventory, FR-48-25 and FR-48-29). **Time-critical:** the standalone Claude Design site deletes its projects on 14 December 2026; export every project as a "Project archive" and test the artifact-based Claude Design once before then (plan B0; Spec 48A goes to 1.0 after it).

**Resume from:** `plans/2026-10-11-spec48-indus-build.md` Phase 3 step 14b then 15 (intake lane; the route lane has nothing pre-intake left: Appendix A steps 7 and 9 are done on `indus-test`, noindex on and site icon set), and, as a separate session, B5 (mirror the live Eye Care site into its draft).

**Bean-only tasks:** B0.

### Front M: Clone coverage foundation and the motion model (Spec 38A)

**State (2026-10-13):** Spec 38A build session S1 (waves 0 to 3) is complete and pushed: M3.0, M1.0, M1.1, M1.2, M1.3, M1.4, M1.5, M1.6 (both steps), M1.8a and M1.10 (build, fast gate 158/158 and inline-style audit green). In code: the motion schema, the JS and PHP field types, the tokens in `theme.json` and all nine snapshots, the motion gates and allow-list, `supports.sgs.motion` on 74 blocks, the value atoms with one master easing list. In the shared DB: `motion_presets` (96 rows) and `fx_effects.owned_properties` and `panels`; `animation_tokens` is retired (archive in `plugins/sgs-blocks/scripts/data/retired/`). Editor typing baseline: canary draft page 5196. Nothing deployed this session (the token retune and the support registration reach the canary at the next deploy). Landed units are listed in `plugins/sgs-blocks/scripts/data/motion-units-landed.json`.

**Blockers:** none for S2. Steps 21 onwards of the Indus build wait on the coverage plan's Phase 4 waves the Indus gap list names.

**Resume from:** `plans/2026-10-12-spec38a-motion-build.md`, session S2: waves 4 and 5 (M1.7 with the spec v1.6 bump, M1.8b, M1.9, M1.11 reseed and Gate 2), then waves 6 and 7.

### Front N: Nav / header / footer (Specs 36 and 37)

**State:** Waves 1 to 3C built and live on sandybrown; Gate 3C items 1, 2, 3 and 5 pass; item 4 (Indus and lamalama copies) has no new foundational gap and its last mile is deferred by Bean (2026-10-01). Wave 4 (reference clones) not started; Wave 5 is header and footer cloning as Spec 47 surfaces. Proof: `verify/merged-spec36-37-track.md`.

**Blockers:** Bean's hPanel action (allow-list the canary's "Checking your browser" page) blocks only Gate 3C's final walk (plan §2.4 step 5).

**Resume from:** `plans/2026-10-01-header-nav-thread-plan.md` §2.4 to close Gate 3C, or §4 to prepare Wave 4.

**Bean-only tasks:** the drawer-burger click retest (does the intermittent click-miss still occur now the duplicate-burger fix has shipped? If so, dispatch `/systematic-debugging`), and the mega-motion eye check (R-31-13), booked with the next live URL.

**Also open (Spec 36 Status lines hold the detail):** FR-36-16, the late-CSS A/B (`plugins/sgs-blocks/scripts/nav-qa/late-css-ab.mjs`) still fails on the canary header drawer because the close control and first link are placed by `nav-drawer/style.css`, not the block's scoped rules; Bean decides whether to relax the test to the dialog box plus dismissal or to emit the drawer's whole layout in the scoped rules. FR-36-17, the mega pages exceed the 100 KB CSS and 50 KB JS budget. FR-36-11 (the active-item state under forced colours) and FR-36-26c (`aria-current` across two pages and axe) are not yet re-measured live. The homepage layout shift (0.82 at 375) is untraced. FR-38-31, the aurora and ink wave styles painted black in a local Chrome (Bean's eye on a real GPU, Spec 38). `sgs/mega-group`'s focus ring uses the accent colour (found during the unified-email plan, not its work); `sgs-client-notes` still deploys through `plugins/sgs-blocks/scripts/deploy-client-notes-quick.py` instead of `build-deploy.py`.

## Parked

- **`plugins/sgs-blocks/scripts/dbschema/rebuild_compare.py` writes tracked repo files (found 2026-10-13, Bean to rule):** it takes no arguments (`--help` runs it) and its sandbox rebuild redirects only HOME, so `sgs-update-v2.py --rebuild` against the empty sandbox DB rewrote `scripts/behavioural-analyser/css-property-classifications.json` to zero entries and three `reports/phase4-*.txt` files, which turned the build's DB consistency gate red with about 4,000 rogue-seed rows; restored from HEAD the same night. Fix options: run the rebuild from a throwaway worktree, or point the classifier and report writers at the sandbox; until then, never run it in the shared tree.
- **Unwired scripts (Bean to rule):** `plugins/sgs-blocks/scripts/audit-live-script-closure.py` lists every script no live root reaches; rerun it before trusting any older list. Council-checked keepers stay (operator tools, fixtures a gate reads by folder, tools that specs, rules or plans name, `dbschema/retire_table.py`, `rebuild_compare.py`, `data/retired/*.json.gz`). Kept on purpose after a second look: `migrate-border-control.js` with `border-control-codemod/` (blocks still declare native `__experimentalBorder` and `survey-border-control-migration` counts them), `generative-background/flip-probe.mjs` (runnable ground truth that `harness-lib.mjs` serves), `probes/build-*` and `extend-page-3145-video-svg.py` with the page-id files (they build the pages the kept `probes/probe-*` read), and the nav-qa `u13`, `m03` and `u16` probes (they re-verify shipped Spec 37 requirements against cases in the kept `qa-item-markup-fixture.php`). Still open for Bean: nav-qa `u1-owed-probe.mjs` with `qa-u1-owed-fixture.php` (a finished owed-checks pair; README sections 10 to 12 share its restore step) and the other `motion-qa` probes whose target pages no doc registers.
- **CR12, PARKED pending Bean:** the deriver hard-refuses Eye Care on contrast; 3 design options sit on its register row (`plans/2026-10-02-eye-care-fix-register.md`).
- **PARKED (Bean):** 24 `product-card::valueLadder*::L3` rows need a bound-mode canvas mirror (triage §6).
- **Canvas cross-check rulings:** decisions D-52..D-71 are ledger entries; the 72 confirmed gaps are register CR23, "Bean's call" (`plans/2026-10-02-eye-care-fix-register.md`).
- Mama's Munches needs a site copy of the shop template for its Flavour and Size groups (`plans/2026-10-02-eye-care-plan.md`).
- Card-grid zoom amount control; `disabled` as a golden state; nav-drawer badge/disabled; `IconPicker` `id` (`plans/2026-10-05-eye-care-functionality-backlog.md`).
- google-reviews icons and `autoScroll` from the manifest route, and the Business Profile sync (`plans/2026-10-05-eye-care-functionality-backlog.md`).
- Form CPT cloning-pipeline gap and analytics: `plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md`.
- Snooza product configurator, planned and not started: `plans/2026-08-03-snooza-configurator-build-plan.md`.
- Gate 3C item 4's G8 foundational gap (lamalama), parked in `plans/2026-10-01-header-nav-thread-plan.md`.

## Live state

- **Branch:** `main`. Read the commit with `git rev-parse --short HEAD`; many sessions share this tree.
- **Deploy marker:** `.sgs-deploy-marker-<target>.json` in the server's SSH home (`plugins/sgs-blocks/scripts/build-deploy.py::marker_path`). Read the marker to see what each site runs.
- **sandybrown (canary, default target):** WP 7.1; homepage page **2742**, posts page **2741**; fresh-clone verification page **3448**; motion-QA fixtures 2103, 2109, 2113, 2603, 2740, 3037 are never deleted.
- **eye-care-test** (`darkcyan-grouse-898606`), **indus-test** (`lavender-dinosaur-183533`, brief `sites/indus-foods/CLAUDE.md`) and **mamas-test** (`lightsalmon-tarsier-683012`, brief `sites/mamas-munches-redesign/CLAUDE.md`): name them explicitly to deploy. indus-test and mamas-test are fresh WordPress 7.1.3 installs (reset 2026-10-10, media kept, backups in `~/backups/2026-10-10-reset/` on the server) running sgs-blocks and sgs-theme (indus-test at `3e1bdd9e9`; read each site's deploy marker); indus-test has no content pages built (it holds the private `cr-calibration` page 15 and the calibration menu 3, drawer 20, panel and media made by `scripts/computed-route/provision-calibration-refs.mjs`) and sends mail through the studio mailbox with every email redirected to it, and mamas-test holds the zip-export footer run's `sgs_footer` post 19 as its active footer (`sgs_active_footer_cpt_id`), to clear when it is reset for Front H's replanned clone. A first deploy to a fresh site reports `[migrate]` and `[verify]` errors until sgs-blocks and sgs-theme are activated and `wp sgs migrations run` is run over SSH.
- **D-ceiling:** `grep -oE '^## D[0-9]+' .claude/archive/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`.
- **Parity figures:** run the parity walker (`scripts/parity/draft-live-walk.mjs`, see `scripts/parity/GAP-CHECKLIST.md`) fresh; never quote a cached figure.

## Known failing tests

- `db-consistency/tests/test_f6_consistency.py::TestCheck5VariantReseed` (4 tests): they fail against the live schema (an `OperationalError` in `check_variant_reseed.py`); the converter removal did not touch that code.
- `test_wp_integration::test_native_hover_zoom_routes`: serves the card-grid zoom control (Parked).
- `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json` (D-72 to D-91 register citations): serves Front F; the fix is in `plans/2026-10-04-spec47-full-coverage.md` §Carried and open.
