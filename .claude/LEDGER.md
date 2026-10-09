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
- **Specs** are tidied to current truth (24 live specs; the generated block reference is separate). Cloning is Spec 47 only: Specs 31, 44, 45, 20 and 19 are gone, and the roster's "Not a live spec" table maps every old number to its home. The old converter code is still in the repo and waits for its removal plan.
- **Need you directly:** the drawer-burger click retest, the mega-motion eye check, and the Eye Care rulings listed under Parked.

## Blockers

- None.

## Fronts

### Front F: Eye Care Birmingham, built by hand (D1149)

**State:** every surface built and live on eye-care-test; both sites run WooCommerce 11.1.2. Draft `https://mintcream-lyrebird-224487.hostingersite.com/`; test site `https://darkcyan-grouse-898606.hostingersite.com` (credentials `.claude/secrets/eye-care-test.env`). Spec 47's computed route (`scripts/computed-route/`, `specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md`) is built except stage 5 (a second draft); route defects with owners are in its §5 Residual.
**Blockers:** none.
**Resume from:** Session D in `plans/2026-10-04-spec47-full-coverage.md`, or the next tier of `plans/2026-10-05-eye-care-functionality-backlog.md`.

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
- **Spec 47 sweep** (`sites/eye-care-ward-end/build/qa/sweep/2026-10-08/sweep.json`): every surface measured with `--rounds 0`, none stale; Hardcode is only the footer social-icon borders (P2-r). The three-round Solve baseline is owed (`plans/2026-10-04-spec47-full-coverage.md`, Session D).
- **Link underline helper** (P2-n): batches 1 to 3 (`sgs/text`, `heading`, `business-info`, `icon-list`, `label`, `collapsible-text`, `quote`, `testimonial`, `timeline`, `product-card`) are live on eye-care-test at `fccae232f` (final deploy clean). No Eye Care page sets the setting on batch 2 or 3 blocks, so their CSS is proven by PHPUnit, not a live read. Open: `sgs/testimonial`'s block-wide link colour row has no underline setting (blocks full coverage of text blocks with links), the `css_element` naming rule for the new override rows (the cloning pipeline reads it), and the footer divergence entries. Owner: `plans/2026-10-08-link-underline-helper.md`.
- **Icon unification and spacing control** (P2-r): the footer's social-icon borders go with it. Owner: `plans/2026-10-08-icon-unification-and-spacing-control.md`.
- **Register rows:** every row carries a Lane and a hash in the fix register; the wiring gate blocks new gaps only (baseline `plugins/sgs-blocks/scripts/wiring-fingerprint-baseline.json`).

**Bean-only tasks:** the register's Bean rulings (see Parked).

### Front N: Nav / header / footer (Specs 36 and 37)

**State:** Waves 1 to 3C built and live on sandybrown; Gate 3C items 1, 2, 3 and 5 pass; item 4 (Indus and lamalama copies) has no new foundational gap and its last mile is deferred by Bean (2026-10-01). Wave 4 (reference clones) not started; Wave 5 is header and footer cloning as Spec 47 surfaces. Proof: `verify/merged-spec36-37-track.md`.
**Blockers:** Bean's hPanel action (allow-list the canary's "Checking your browser" page) blocks only Gate 3C's final walk (plan §2.4 step 5).
**Resume from:** `plans/2026-10-01-header-nav-thread-plan.md` §2.4 to close Gate 3C, or §4 to prepare Wave 4.
**Bean-only tasks:** the drawer-burger click retest (does the intermittent click-miss still occur now the duplicate-burger fix has shipped? If so, dispatch `/systematic-debugging`), and the mega-motion eye check (R-31-13), booked with the next live URL.
**Also open:** `sgs/mega-group`'s focus ring uses the accent colour (found during the unified-email plan, not its work); `sgs-client-notes` still deploys through `plugins/sgs-blocks/scripts/deploy-client-notes-quick.py` instead of `build-deploy.py`.

### Front S: Spec set and old converter removal

**State:** the spec tidy is committed and pushed. Specs 41, 28, 30, 26 and 33 are merged into Specs 36, 27 and 32 (FR ids unchanged); `.claude/rules/framework-principles.md` holds the nine binding rules R-31-n; `lint-spec-drift.py` has 0 gating findings and the preflight passes.
**Blockers:** none.
**Resume from:** `plans/2026-10-09-spec-tidy-followups.md` (decisions only Bean can take, then small fixes) and `plans/2026-10-09-retire-old-converter-code.md` (remove the old converter, a separate session).

## Parked

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

- `test_preflight_chain::test_precommit_gate_drift_pass` (drift-validator path missing) and `test_validate_stage_artifact::test_stage_9_coverage_gap_levels`: belong to the old converter and go with it (`plans/2026-10-09-retire-old-converter-code.md`).
- `test_wp_integration::test_native_hover_zoom_routes`: serves the card-grid zoom control (Parked).
- `node scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json` (README exports, D-72 to D-91 register citations): serves Front F; the fix is in `plans/2026-10-04-spec47-full-coverage.md` §Carried and open.
