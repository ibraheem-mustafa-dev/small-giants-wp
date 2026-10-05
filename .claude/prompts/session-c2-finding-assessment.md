Invoke /autopilot before doing anything else.

> **Session C updates this file at its handoff** with the real F count, which lanes reclassified what, whether the
> canvas rule shrank the mega-menu and lens-pop-up rows as expected, which lanes left items open, and whether the
> repairs track has deployed. If this note is still here, Session C has not handed over yet: read its C3.8 output
> before trusting the numbers below.

Context: Eye Care (client slug eye-care-ward-end) is being rebuilt from a Claude Design draft onto the SGS
WordPress block framework. Bean's fix register (`.claude/plans/2026-10-02-eye-care-fix-register.md`) is the source
of truth for what gets fixed: it holds the decided issues and the agreed fixes. A measuring route (Spec 47) walks
the draft against the live site and reports differences; those reports are FINDINGS, and a finding never creates a
new fix. Where a finding matches a register item the register's fix stands. Where it matches nothing it is accepted
unless a live test shows it visibly wrong.

Session C repaired the route first, because many findings ignored how the framework works: a mega menu, modal or
choice flow is a CPT canvas composed from blocks, and a setting can arrive from a parent by block context, so "this
block declares no setting" is not a defect by itself. THIS SESSION JUDGES THE FINDINGS, on the post-Session-C
sweep, never on the old count of 163.

Read first:
- `.claude/plans/2026-10-05-eye-care-session-c2-finding-assessment.md` in full. It is the session's plan: the four
  steps, the starting matching tables A, B and C, the verdict categories, the gates (C2-1, C2-2, C2-3, then W1, W2
  and TAIL), the candidates to settle live, the three spacing rows with their two proven causes, and the one
  defect that is not a finding.
- Session C's **C3.8** output at the end of `.claude/plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md`:
  the new framework-gap count, what each lane reclassified, the triage output path and the row-by-row list of what
  is still open. **That list is this session's input.** If it is missing, Session C did not finish: stop and say so.
- `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` sections 3.8 (canvas awareness), 5 Residual and 6.
- `.claude/plans/2026-10-05-eye-care-register-proven-repairs.md`, the parallel track's list of what it already
  built. Those register items are done: judge every remaining finding against the repaired code, never against
  the code as it was when Session C measured.

Tasks, in order. Nothing is built until task 5.

0. **Re-measure before matching** (~25 min, inline, one host job). Session C's count was taken on unrepaired block
   code on purpose, so that count stayed attributable to the route. The parallel repairs track closes
   register-decided rows on `sgs/button` (hover timing), `sgs/business-info` (day-label weight),
   `sgs/site-footer-row` (full width under a width cap), the nav drawer (body height), the cart proxy (cooldown)
   and the colour tiles (top padding). **Confirm that track has deployed, then take a fresh measure-only sweep and
   triage**, with the same command and flags as Session C's baseline. Without this you will re-judge rows that are
   already fixed. If the track has not deployed yet, either wait for it or record plainly which rows your verdicts
   may be stale on.

1. **MATCH** (~25 min, inline). Match every still-open row to a register Ref where one fits. Start from the plan's
   tables A (32 rows already in the register), B (42 rows that are a detail of a register item) and C (89 rows not
   in the register at all), correct them against the fresh sweep, and show what changed row by row with a reason.
   Expect table C to shrink a lot: Session C's canvas rule targeted the mega-menu 22 and much of the lens-pop-up
   35, and its walker guards should have retired the two WooCommerce width rows. A row Session C reclassified to
   `canvas-settable` carries a cited block and attribute; task 2 tests that citation rather than taking it.
   Done when every row carries a Ref or an explicit "not in the register".

2. **FACT-CHECK** (~40 min delegated, ~25 min main-thread re-check). Parallel read-only **Opus** agents grouped by
   mechanism, one shared brief (`.claude/reports/2026-10-05-session-b/b2/BRIEF.md` is the template), under the
   merge gate `lib/register-sweep.mjs::checkStatuses`. One verdict per row: real / not a gap (already settable) /
   wrong block / measuring artefact / decided. **Every verdict cites an exact database row with its values, or a
   `file::symbol`, and quotes it**; one with neither is rejected and re-run. Check canvas surfaces, parent settings
   by block context, the existing controls and utilities the plan lists, the decided register items, and the four
   known edit-target shifts where the fix edits a different block from the one the row is filed under. The main
   thread re-checks **every** `real` verdict and a sample of the others. Use `/sgs-wp-engine` and `/sgs-db`.

3. **LIVE TEST** (~45 min for 3a, ~30 min for 3b, one host job at a time). Playwright at 375, 768, 1440 and 1920,
   with a screenshot and computed values including the winning rule's origin as the evidence for every claim.
   (3a) Every row matching no register Ref: is it visibly wrong, and can an existing setting in the tree fix it? A
   row that is not visibly wrong is accepted and closed with that evidence; a row an existing setting fixes is
   Session D's tree work. (3b) Every register item still marked "still open" or "partly measured" that the
   findings do not cover: is it resolved live, or open and the route failed to see it? **Each one the route missed
   is a new Spec 47 gap, listed against the spec section that should have caught it**, using the plan's mapping
   table, and it goes into Spec 47 section 5 Residual rather than this session's fix list.
   **One extra read, one minute:** the class list on `.sgs-container__inner`'s parent. The three spacing rows are
   already diagnosed from the source as two separate causes — core's
   `.is-layout-constrained > :where(:not(.alignfull)) { margin: auto !important }` beating the band's side margins
   (and `sgs/hero` already solves that by leaving the selector's match set, which `hero/render.php` records), and
   an inline WP-native base margin beating a class rule on the footer (which the same block's tablet and mobile
   tiers already solve with `!important`). The only thing the source cannot answer is whether that parent actually
   carries `is-layout-constrained`, since `sgs/container` declares `supports.layout: null` and so never adds it
   itself. If it does not, cause 1 is wrong and the fix changes. **No reading of another client is needed.**

4. **ONE LIST FOR BEAN** (~15 min). Only after tasks 1 to 3. One line per item: what it is in plain English, its
   register Ref or none, the verdict with its citation, whether it is visibly wrong live, the proposed fix, the
   effort. **Yes or no per item. Nothing is built before the answer** (Gate C2-3). Include the one-line
   `text-wrap: balance` item the plan names, and `sgs/social-icons`'s `iconBorderColour` with no border width or
   style, which is a defect rather than a finding.

5. **THE APPROVED FIXES ONLY.** W1, the four shared files, main thread, one at a time, each with a cross-client
   before-and-after on sandybrown's motion-QA fixture pages (2103, 2109, 2113, 2603, 2740, 3037) under Gate W1.
   Then W2, one `wp-sgs-developer` agent per queue, `isolation: "worktree"`, phase 1 read-only diagnosis against
   the plan's seven-point deliverable contract, main-thread check, phase 2. **Rebuild the queues from the approved
   list**, partition by the block each fix EDITS rather than the block the row is filed under, and run `node
   .claude/reports/2026-10-05-session-b/check-queue-collisions.mjs` before dispatch and after any agent changes its
   chosen fix shape. Then the serial tail and Gate TAIL. Use `/wp-sgs-deploy` for the deploy ceremony.

6. **At handoff**, `git rm` this prompt file: prompt files are single-use. `/handoff` does the rest.

Guardrails:
- **The register's fix always stands.** A finding never creates a new fix, and no verdict rests on a group label:
  the old G1 to G8 groups are filing labels for review only. `SGS_Container_Wrapper` is never a blanket fix (only
  5 of G2's 25 rows ever named it; 14 are a changed default or a one-line opt-in).
- **Never add a `divergences.json` entry to close a row.** The ledger is Solve's write target, so a wrongly added
  entry freezes a wrong value permanently and turns no check red.
- **Never route `css_property` onto a row whose `enum_values` is non-NULL.** 633 rows work through calibration
  discovery precisely because that column is empty.
- **Pair every new control family with its `style.css` or `render.php` reader in the same commit**, or the control
  exists, paints nothing, and `check-dead-controls.js` goes red. Test the empty `{}` tier default per family: an
  empty mobile tier inherits the nearest wider tier, so one desktop write silently changes 375px. Confirm
  `calibrate.mjs` plans a hover instance for any new hover attribute, or it stays uncalibrated and closes nothing.
- **No deprecations** (`.claude/rules/block-authoring.md`). Changed defaults are fine and chosen on merit: the
  framework is pre-production with no content to protect. Record the choice in the commit.
- **One reseed, main thread, from clean HEAD, after messaging peer sessions.** Queue agents never reseed, run gates
  or commit. Never `--skip-oldshape-audit`, `--allow-dirty` or `--skip-verify`; the oldshape audit fails on the
  deploy target's own stored content, so eye-care-test can pass while sandybrown fails. Run both.
- **Commit gates:** `python plugins/sgs-blocks/scripts/run-gates.py --tier full`, `node
  plugins/sgs-blocks/scripts/audit-inline-styling.js --check` exits 0 (Spec 32), `python
  scripts/check-no-client-names.py --check`, plus the four block-conformance checks Gate W2 names.
- **Never stage** `.claude/reports/serverside-render-disabled-audit.*`,
  `plugins/sgs-blocks/scripts/consistency/*.json`, `plugins/sgs-blocks/scripts/dbschema/seed-history.json`,
  `plugins/sgs-blocks/.phpunit.cache/*`, `reports/phase4-*.txt`,
  `.claude/reports/2026-10-04-route-data-audit/fingerprint/*.json`, or any path containing `Bean Points`. Commit
  straight to `main` with an explicit pathspec, checking `git branch --show-current` in the same command; never
  `git add -A`, never a glob, never a stash.
- **Host tools:** `SGS_HEADED=1`, one job at a time. If Hostinger shows a captcha, use the WSL mirrors
  (`scripts/local-wp/README.md`).
- **The Google reviews block** belongs to a parallel track, now closed and live on both test sites. Its colours and
  sizes follow Google's UI (40px pills and arrows), an accepted difference from the theme and the 44px target
  (Bean, 2026-10-05): never flag them as gaps.
