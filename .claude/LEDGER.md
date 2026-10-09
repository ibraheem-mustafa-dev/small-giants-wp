---
doc_type: ledger
project: small-giants-wp
last_updated: 2026-10-09
---

# small-giants-wp: LEDGER (the one living status)

## Summary for Bean

- **Eye Care is built by hand first (D1149).** Every surface is built and live on eye-care-test; the finished site becomes the cloning pipeline's answer key. The fix register is the work list and every decision in it is taken.
- **Spec 47's "Solve" tool** measures the draft against the live site and writes block settings itself. The About page is at 100%. Current counts live in the triage files, never in this document.
- **Nav / header / footer** (Specs 36 and 37): Waves 1 to 3C are live on sandybrown; Waves 4 and 5 have not started. You deferred the last mile of Gate 3C.
- **Indus Foods** has its own test site (`indus-test`) because the active header, footer and theme-snapshot pointers are single global settings per site.
- **Specs** are tidied to current truth (24 live specs; the generated block reference is separate). Cloning is Spec 47 only: Specs 31, 44, 45, 20 and 19 are gone, and the roster's "Not a live spec" table maps every old number to its home. The old cloning converter and its scripts, gates and database tables are deleted; git history holds them.
- **Need you directly:** the drawer-burger click retest, the mega-motion eye check, and the Eye Care rulings listed under Parked.

## Blockers

- None.

## Fronts

### Front F: Eye Care Birmingham, built by hand (D1149)

**State:** every surface built and live on eye-care-test; both sites run WooCommerce 11.1.2. Draft `https://mintcream-lyrebird-224487.hostingersite.com/`; test site `https://darkcyan-grouse-898606.hostingersite.com` (credentials `.claude/secrets/eye-care-test.env`). Spec 47's computed route (`scripts/computed-route/`, `specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`) is built except stage 5 (a second draft); route defects with owners are in its §5 Residual.
**Blockers:** none.
**Resume from:** `plans/2026-10-04-spec47-full-coverage.md` "Session D, 2026-10-09" (open tool defects in order), or the next tier of `plans/2026-10-05-eye-care-functionality-backlog.md`.

Governing documents (one job each):
- Fix register, the source of truth for what gets fixed: `plans/2026-10-02-eye-care-fix-register.md`.
- Decisions, surfaces and what is owed: `plans/2026-10-02-eye-care-plan.md`.
- Per-surface Solve work: `plans/2026-10-04-spec47-full-coverage.md`.
- Features, controls and QC finds: `plans/2026-10-05-eye-care-functionality-backlog.md`.
- Measured state: read the counts from `sites/eye-care-ward-end/build/qa/triage/*.json`, never a cached figure. Compare sweeps on a normalised path, and never compare a raw triage count with a hand-audited one.

Operating rules:
- After every sweep, run `scripts/computed-route/confirm-canvas.mjs --candidates` to re-measure each canvas citation.
- `solve.mjs` defaults to 3 WRITE rounds. `--rounds 0` still rebuilds every surface's page from its tree file (`solve.mjs::build` runs `wp-build-page.js`); it writes no solver setting.
- Run host tools with `SGS_HEADED=1`, one job at a time; `curl` one probe first because the host edge 403s bursts. Local mirrors on localhost:8081/8082 need `curl -6` and carry no `cr-ref` for header, mega, shop, product, lens or size-guide.
- A plugin deploy does not apply a tree fix: rebuild the page with `wp-build-page.js`, one page at a time.
- Never remove `section.sgs-hero{max-width:none}` (D725); `sgs/hero`'s `maxWidth` is a real gap (backlog). The focus ring stays the client accent (D467).

Open owed items:
- **F3/E14** (every element the gate found has a control or a zero-specificity default): ceilings CLASS-2 0, CLASS-3 0, CANNOT-RESOLVE 0; only the advisory backlogs rule 03 and rule 31 remain (triage §6). Owner: the backlog.
- **Box alignment** (`check:box-alignment`): indus-test's next deploy must carry `b90def34b`, `50449c17e` and `afae93d66`; the front-end separator at a numeric 40% width is not yet read in LTR and RTL. Owner: the backlog.
- **CR6** (padding and margin print only the sides that are set) is done and live, front end and editor (`plans/archive/2026-10-07-cr6-box-longhand-migration.md`). The 31 held routing rows stay NULL on purpose.
- **Spec 47 local baseline** (2026-10-09, 3 rounds on all 17 surfaces against the local mirror `localhost:8081` via `solve.mjs --site local-eye-care`; report `.claude/reports/2026-10-09-session-d-local-baseline/REPORT.md`): sweep `sites/eye-care-ward-end/build/qa/sweep/2026-10-09/sweep.json` 1,613 open, none stale; about 57% of open rows are false positives (council audit). Trees restored to HEAD (the baseline's writes reached only the mirror; home and shop writes proven bad). Open tool defects, in order, are in the plan.
- **Framework gaps closed 2026-10-09:** `sgs/mega-panel` `groupPadding` / `groupTransitionDuration` and the WooCommerce chips `sgsChipGap` extension, reseeded (`76835cca7`); live on sandybrown, the local mirror and eye-care-test (both run `75aeb5394`). After any reseed run `plugins/sgs-blocks/scripts/dbschema/seed_reference_data.py`: a full `sgs-update-v2.py` leaves `sgs/hero.splitMediaType` reclassified.
- **Icon unification and spacing control** (`plans/2026-10-08-icon-unification-and-spacing-control.md`): `sgs/icon` is the one icon block (Site Info links with an own-link fallback, 8 shapes, labels on any side) and `sgs/social-icons` its Site Info row (Eye Care footer rebuilt, P2-r closed); the Spacing control is rebuilt, names each untouched side's real default (per device and per setting) and offers core's Vertical/Horizontal paired mode (on tabs and google-reviews padding). The QC council is closed (11 fixed, 2 rejected with measurements). All phases are done and read live: sandybrown and eye-care-test run `75aeb5394` (footer and drawer social rows read at 375/768/1440; an icon bound to Site Info now shows the Site Info link first and its own link as the fallback, and the clone route builds the row, Spec 47 FR-47-9). Open (all in the plan's Deferred section): recalibrate `sgs/icon` for Fill (Spec 47 follow-up), the first real dry run of `provision-site-info-from-draft.py` (the next clone), and the lint's brand-host gap (Spec 47 §7).
- **Register rows:** every row carries a Lane and a hash in the fix register; the wiring gate blocks new gaps only (baseline `plugins/sgs-blocks/scripts/wiring-fingerprint-baseline.json`).

**Bean-only tasks:** the register's Bean rulings (see Parked).

### Front N: Nav / header / footer (Specs 36 and 37)

**State:** Waves 1 to 3C built and live on sandybrown; Gate 3C items 1, 2, 3 and 5 pass; item 4 (Indus and lamalama copies) has no new foundational gap and its last mile is deferred by Bean (2026-10-01). Wave 4 (reference clones) not started; Wave 5 is header and footer cloning as Spec 47 surfaces. Proof: `verify/merged-spec36-37-track.md`.
**Blockers:** Bean's hPanel action (allow-list the canary's "Checking your browser" page) blocks only Gate 3C's final walk (plan §2.4 step 5).
**Resume from:** `plans/2026-10-01-header-nav-thread-plan.md` §2.4 to close Gate 3C, or §4 to prepare Wave 4.
**Bean-only tasks:** the drawer-burger click retest (does the intermittent click-miss still occur now the duplicate-burger fix has shipped? If so, dispatch `/systematic-debugging`), and the mega-motion eye check (R-31-13), booked with the next live URL.
**Also open (Spec 36 Status lines hold the detail):** FR-36-16, the late-CSS A/B (`plugins/sgs-blocks/scripts/nav-qa/late-css-ab.mjs`) still fails on the canary header drawer because the close control and first link are placed by `nav-drawer/style.css`, not the block's scoped rules; Bean decides whether to relax the test to the dialog box plus dismissal or to emit the drawer's whole layout in the scoped rules. FR-36-17, the mega pages exceed the 100 KB CSS and 50 KB JS budget. FR-36-11 (the active-item state under forced colours) and FR-36-26c (`aria-current` across two pages and axe) are not yet re-measured live. The homepage layout shift (0.82 at 375) is untraced. FR-38-31, the aurora and ink wave styles painted black in a local Chrome (Bean's eye on a real GPU, Spec 38). `sgs/mega-group`'s focus ring uses the accent colour (found during the unified-email plan, not its work); `sgs-client-notes` still deploys through `plugins/sgs-blocks/scripts/deploy-client-notes-quick.py` instead of `build-deploy.py`.

## Parked

- **Unwired scripts (Bean to rule):** `plugins/sgs-blocks/scripts/audit-live-script-closure.py` lists every script no live root reaches; rerun it before trusting any older list. Council-checked keepers stay (operator tools, fixtures a gate reads by folder, tools that specs, rules or plans name, `dbschema/retire_table.py`, `rebuild_compare.py`, `data/retired/*.json.gz`). Kept on purpose after a second look: `migrate-border-control.js` with `border-control-codemod/` (blocks still declare native `__experimentalBorder` and `survey-border-control-migration` counts them), `generative-background/flip-probe.mjs` (runnable ground truth that `harness-lib.mjs` serves), `probes/build-*` and `extend-page-3145-video-svg.py` with the page-id files (they build the pages the kept `probes/probe-*` read), and the nav-qa `u13`, `m03` and `u16` probes (they re-verify shipped Spec 37 requirements against cases in the kept `qa-item-markup-fixture.php`). Still open for Bean: nav-qa `u1-owed-probe.mjs` with `qa-u1-owed-fixture.php` (a finished owed-checks pair; README sections 10 to 12 share its restore step) and the other `motion-qa` probes whose target pages no doc registers. Table `library_runtime_signals` has no reader; retire it with `dbschema/retire_table.py` at the next reseed.
- **Pending reseed (finishes the `sgs/cta-section` removal and the `emit_shape` rebuild; any session, message peers first):** the live framework DB still holds 93 `sgs-fx` attribute rows for `sgs/cta-section`, four attributes since removed from `block.json` (`form-field-consent.placeholder`, `form-field-tiles.placeholder`, `team-member.sgsBlockLink` and `sgsBlockLinkTarget`), and `emit_shape` values from the first classifier. The next `sgs-update` prunes them (stage 9 now also removes a retired block's sgs-ext and sgs-fx rows) and reseeds `emit_shape` / `emit_shape_proof` through `plugins/sgs-blocks/scripts/lib/emit_shape.py`. Expect no `unresolved` content attribute afterwards; one that appears is a leftover control to repair (shapes and proofs: `.claude/dev-setup.md`, the `emit_shape` entry). `plugins/sgs-blocks/scripts/consistency/roster.json`, `attr-role-map.json` and `behavioural-analyser/css-property-classifications.json` regenerate from that reseed, and so does the untracked `.claude/specs/02-SGS-BLOCKS-REFERENCE.md` (`python plugins/sgs-blocks/scripts/generate-block-reference.py`), which still has a `sgs/cta-section` section.
- **CR12, PARKED pending Bean:** the deriver hard-refuses Eye Care on contrast; 3 design options sit on its register row (`plans/2026-10-02-eye-care-fix-register.md`).
- **PARKED (Bean):** 24 `product-card::valueLadder*::L3` rows need a bound-mode canvas mirror (triage §6).
- **Canvas cross-check rulings:** decisions D-52..D-71 are ledger entries; the 72 confirmed gaps are register CR23, "Bean's call" (`plans/2026-10-02-eye-care-fix-register.md`).
- Mama's Munches needs a site copy of the shop template for its Flavour and Size groups (`plans/2026-10-02-eye-care-plan.md`).
- Card-grid zoom amount control; `disabled` as a golden state; nav-drawer badge/disabled; `IconPicker` `id` (`plans/2026-10-05-eye-care-functionality-backlog.md`).
- google-reviews icons and `autoScroll` from the manifest route, and the Business Profile sync (`plans/2026-10-05-eye-care-functionality-backlog.md`).
- Nothing creates a client's empty pages and templates before `surfaces.json` names them (`specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` §7).
- Form CPT cloning-pipeline gap and analytics: `plans/2026-09-26-form-choiceflow-pipeline-and-analytics.md`.
- Snooza product configurator, planned and not started: `plans/2026-08-03-snooza-configurator-build-plan.md`.
- Gate 3C item 4's G8 foundational gap (lamalama), parked in `plans/2026-10-01-header-nav-thread-plan.md`.

## Live state

- **Branch:** `main`. Read the commit with `git rev-parse --short HEAD`; many sessions share this tree.
- **Deploy marker:** `.sgs-deploy-marker-<target>.json` in the server's SSH home (`plugins/sgs-blocks/scripts/build-deploy.py::marker_path`). Read the marker to see what each site runs.
- **sandybrown (canary, default target):** WP 7.1; homepage page **2742**, posts page **2741**; fresh-clone verification page **3448**; motion-QA fixtures 2103, 2109, 2113, 2603, 2740, 3037 are never deleted.
- **eye-care-test** (`darkcyan-grouse-898606`) and **indus-test** (`lavender-dinosaur-183533.hostingersite.com`, brief in `sites/indus-foods/CLAUDE.md`): each has its own test site; name them explicitly to deploy.
- **D-ceiling:** `grep -oE '^## D[0-9]+' .claude/archive/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1`.
- **Parity figures:** run the parity walker (`scripts/parity/draft-live-walk.mjs`, see `scripts/parity/GAP-CHECKLIST.md`) fresh; never quote a cached figure.

## Known failing tests

- `db-consistency/tests/test_f6_consistency.py::TestCheck5VariantReseed` (4 tests): they fail against the live schema (an `OperationalError` in `check_variant_reseed.py`); the converter removal did not touch that code.
- `test_wp_integration::test_native_hover_zoom_routes`: serves the card-grid zoom control (Parked).
- `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json` (D-72 to D-91 register citations): serves Front F; the fix is in `plans/2026-10-04-spec47-full-coverage.md` §Carried and open.
