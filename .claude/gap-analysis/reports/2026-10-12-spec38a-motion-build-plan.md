# Gap analysis: Spec 38A build plan (the SGS motion model)

Target: `C:\Users\Bean\Projects\small-giants-wp\.claude\plans\2026-10-12-spec38a-motion-build.md` (status: draft, 72 units, 22 waves). Target type: plan. Run: 2026-10-12, independent judge inside a subagent; the parent runs Step 7.6 (qc-inline) and Step 7.75 (qc-council), so `qc_pending: true`. Self-preference counter applied (the plan was written by Claude in the parent session): litmus tests applied literally, and every factual claim the grade rests on was re-checked with a command.

**Verdict: B (3.78 / 5). The strategic-plan hard gate (B, 3.5 or above) passes.** The plan is unusually rigorous: its file-level claims check out, its waves are consistent, and its risk amendments are specific. It has one real build hole (FR-38A-42 has no unit), three B-grade integration gaps, and five C-grade gaps. Every C+ fix is small: about an hour in total.

## 1. Context Loaded

| Source | Status | Key findings |
|--------|--------|-------------|
| Corrections file | Read | No correction for `plan`. One process correction (2026-03-20): gap-analysis gates written as instructions get skipped; use HARD-GATE tags. Applied: this grade gates the plan, per the parent's instruction. |
| Strategic objectives | Read | `revenue-sgs` (critical: SGS builds client sites), `autonomy-claude` (high), `quality-pipeline` (high), `adhd-accessibility` (high). The plan serves `revenue-sgs` (clone coverage, Indus steps 21 onwards) and `autonomy-claude` (cloner writes motion without hand work). |
| Evaluation history | Read | 22 entries; one previous `plan` evaluation (CR6 box longhand plan, 3.86, REVIEW). Too few plan rows to compute drift; no inflation flag. No three identical scores in a row. |
| Governing spec | Read by section | `.claude/specs/38A-SGS-MOTION-MODEL.md` v1.5: §3 hard constraints, §15 FRs 1 to 56, §16 phasing, §17 open items, FR-38A-42 and FR-38A-50 in full. |
| Unit maps | Spot-checked | `.claude/reports/2026-10-12-spec38a-unit-map-m1-m2.md` (22 units) and `-m3-m6.md` (48 units): every map unit carries ADAPT-OR-REBUILD and SURFACES lines. M3.12 and M6.6C (added by the plan) have no map entry. |
| Verify file | Read | `.claude/verify/spec38a-motion-build.md`: rows per phase M0 to M6. No row for FR-38A-42. |
| Clone coverage plan | Read Phase 0 to 4 and Indus sequencing | `.claude/plans/2026-10-12-clone-coverage-foundation.md`: Phase 4 motion recognisers wait for Phase 0; FR-38A-33 and "M7" are not named anywhere in it. |
| Project rules | Read | Project `CLAUDE.md`, `.claude/rules/framework-principles.md`, `~/.claude/rules/time-estimates.md`, `adhd-collaboration.md`, strategic-plan `SKILL.md` (gate block, PERT, readiness rules). |

Claims verified by command (all true): `src/shared/effects/stagger.js` absent and commit `01e4b5a5f` exists; `animation-entrance-timing.js::staggerOffset` still exists; the three nav stylesheets carry ladders (36, 27, 45 hits); `block_attributes` has 13,304 rows (`sgs-db.py sql "SELECT COUNT(*) FROM block_attributes"`); 145 `FROM block_attributes` lines without `source` (`git grep -n "FROM block_attributes" -- plugins scripts | grep -v source | wc -l`); nine `sites/*/theme-snapshot.json`; `build-deploy.py::TARGETS` has sandybrown, indus-test, eye-care-test, mamas-test; `scripts/perf/measure-frame-cost.mjs` exists; `sites/eye-care-ward-end/handoff/animations.json` exists; `prebuild` runs `run-motion-fx-generators.js` and `run-gates.py --tier fast`; `~/.agents/skills/delegate/scripts/route.py` and `~/.claude/rules/measurement-vs-eye.md` exist; Playwright has Chromium, Firefox and WebKit installed. One claim is off: M3.W's "nine referencing files" (`git grep -ln fx-shape-routes -- plugins/sgs-blocks` returns 12, of which only 4 name the stylesheet).

## 2. Criteria Scored

| Criterion | Score (0-5) | Grade | Weight | Evidence (one sentence minimum) | Floor applied? |
|-----------|-------------|-------|--------|--------------------------------|----------------|
| Feasibility | 3.9 | B | 1.0 | Every load-bearing repo claim I checked is true and the wave order is buildable; two places would stall a cold executor: M1.7 is described only for DB option A although option B is recommended, and the old and new panels' overlap behaviour is undefined. | No |
| Completeness | 3.4 | C | 1.0 | FR-38A-42 (hover rotate and translate, rest rotate) is owned by no unit, closing rule or verify row, although the Goal promises every FR from 1 to 32 and 34 to 56; M3.12 and M6.6C lack map entries; R11's doc updates miss Specs 38, 48, 02-REFERENCE, 35A and `dev-setup.md`; no per-page weight check. | No |
| Risk identification | 4.1 | B | 1.0 | Eight ranked risks, each with an in-plan mitigation, plus per-unit amendments with evidence commands (post-type enumeration, consumer census, red-gate rule, generator mirroring, import-map externals); the gaps are the dual-model overlap window, the per-page budget and the cloning regression window between M6.6 and M7. | No |
| Dependency mapping | 4.2 | B | 1.0 | I re-derived every unit's Needs against its wave and found no unit placed before a need; hot-file owners, cross-track waits and the critical path are explicit; small file-list omissions (M1.9 must edit `EasingAtom.js`, M5.12 fills M3.3's hook, M1.7 under option B needs `dbschema/schema.sql` which M1.6 owns). | No |
| Effort estimation | 3.3 | C | 1.0 | Phase-level optimistic and realistic figures calibrated on Indus actuals, and Bean's own time is itemised; but the roughly 30 deploys and 13 reseeds (each about 5 minutes) are not counted, M6.6's per-group deploy targets are unstated, there is no pessimistic or PERT figure, and S6 (1.2 h) cannot hold six group reseeds and deploys plus M5.18 and M6.7. | No |

**Overall score:** 3.78 / **Grade:** B

Floor checks: every criterion was checked for a floor (no plan floors in the skill table; I also checked the strategic-plan "verification claim without a command" floor). None fired: the plan states a command beside each verification claim.

C-grade impact litmus, per criterion at 2.5 or above: feasibility (fixing gaps 2 and 3 removes two mid-build stalls on the critical path); completeness (fixing gap 1 changes whether Mama's tilted cards can be built and cloned at all); risk (gap 2's fix changes what Bean sees at Gate 5); dependencies (minor; the file-list fixes stop a same-file edit by two units); effort (gap 8's fix changes how many sessions S5 and S6 need).

## 3. Persona Evaluation

| Persona | Priority criteria | Weighted score | Grade | Categorical failure? |
|---------|-------------------|----------------|-------|---------------------|
| Bean (non-coder owner with ADHD, approves decisions and visual gates) | effort estimation 1.5x, completeness 1.3x, risk 1.3x | 3.74 | B | No: decisions are written in plain English with options, benefits, drawbacks and a recommendation; Bean's total time is listed. |
| Cold executing session or subagent on the shared worktree | dependency mapping 1.5x, completeness 1.3x | 3.80 | B | No: every unit has owned files, a model and hard needs; the categorical failure (two units editing one file in one wave) does not occur in the table. |
| Framework maintainer and the next client build (Indus steps 21 onwards) | risk 1.5x, feasibility 1.3x | 3.81 | B | No: removal is gated by a consumer census and per-group revert. |

**Divergences (>1.0 delta):** None.

## 4. Full Gap Register

| # | Gap | Grade | Value of filling it |
|---|-----|-------|-------------------|
| 1 | **FR-38A-42 has no unit.** The spec requires rest rotate, hover rotate and hover translate x and y, proven on Mama's tilted cards and the polaroid frame. No unit in the plan, either map, pre-emptive decision 4 or the verify file owns or closes it. Evidence: a per-FR count over the plan's FR references returns 0 for 42 and 1 or more for every other FR; `grep -n "FR-38A-42" .claude/reports/2026-10-12-spec38a-unit-map-m*.md` returns nothing. Plan section: Work units, pre-emptive decision 4. | A | A draft-proven hover effect gets built and tested instead of being found missing at Gate 9 after the old code is deleted. Fix: add FR-38A-42 to M3.4 (controls), to M2.2's rotate channel (`--sgs-rot-rest` is already in the §10 formula) and to M3.9's live fixture; name M3.9 as its closing unit; add a verify row. 5 min. |
| 2 | **Old and new motion panels overlap with no rule.** From wave 12 the three new panels appear on every compatible block, while the old Animation, Hover and Effects panels stay until M6.6-G0 (wave 19). Only nav, cart and accordion blocks unmount their old panels early (pre-emptive 11). M2.1 "refuses `sgsAnimation` and `sgsMotion` together" but does not say which wins or what the editor shows. Plan sections: amendment M2.1, pre-emptive 11, Gate 5. | B | Bean's Gate 5 test ("sets a hover lift ... without help") runs against one Hover panel instead of two, and stored values never silently stop rendering. Fix: one amendment: `sgsMotion` wins when both are set and the old values are ignored until the sweep; from M3.3, a block declaring `supports.sgs.motion` hides the old motion panels; Gate 5 runs after that lands. 10 min. |
| 3 | **M1.7 is written for the option Bean is advised to reject.** Decision 3 recommends option B (two small tables and a view), but M1.7's row, the map unit and amendment M1.7 describe option A (rows in `block_attributes`, `_prune_orphans_on_conn` "gains the new source"). Under B, nothing says where the table and view definitions live (`dbschema/schema.sql` is owned by M1.6), who reads the view (coverage test, calibration, `wp-blocks.py`, M3.3's Target row) or how FR-38A-3's done-when and the verify row change. Plan sections: decision 3, M1.7 row and amendment. | B | The weakest critical-path link (the plan's own words) gets a buildable brief whichever way Bean decides. Fix: add "M1.7 under option B": files (seeder, `schema.sql` handed over from M1.6 for wave 4), the view definition, the consumer list, the new FR-38A-3 done-when for spec v1.6 and the verify-row edit. 10 min. |
| 4 | **Two plan-added units have no evidence entry.** M3.12 (the editor-canvas emitter, Opus, which M3.4, M3.5 and M3.7 depend on) and M6.6C exist only as table rows. They have no adapt-or-rebuild decision, no SURFACES line and no four-layer test. Bean's binding requirement 1 asks for these on every replaced helper, and editor-side scoped emitters already exist to adapt or reject (`editor.BlockListBlock` filters in `src/blocks/extensions/custom-css.js` and `child-sizing.js`, found with `git grep -lE "editor\.BlockListBlock" -- src/blocks/extensions`). | B | The canvas preview is built on the house pattern, or rebuilt for a stated reason, instead of becoming a third way of emitting editor CSS. Fix: add both units to the M3 to M6 map in the house format. 10 min. |
| 5 | **The cloning writer (FR-38A-33, M7) has no owner, and the regression window is not stated.** The plan's header says M7 "rides plan Phases 2 and 4" of the coverage plan, but that plan never names FR-38A-33 or M7. Once M6.6 deletes `sgsAnimation*` and the `sgs-fx` rows, the cloner's current motion writes (`scripts/computed-route/lib/entrance.mjs`, resolver rows) have nothing to write to until M7 lands. Under decision 3B, the resolver also needs to read the new view. | C | The whole "why it matters" (the cloner can write what it measures) has a named home, and no clone is run in the gap expecting motion. Fix: add a checkbox to coverage plan Phase 4 ("FR-38A-33: cloning writes all three panels; needs Spec 38A M6.7 and the decision-3 view") and one sentence to this plan's Scope about the window. 5 min. |
| 6 | **The doc updates miss most of the docs that cite deleted code.** R11 updates only Specs 36, 37 and 02. These also cite things the build deletes: Spec 38 (`extensions/fx.js`, `animation_tokens`, `helpers-motion-easing`), Spec 48 (`animation-observer.js`, `sgsAnimation`, `animation_tokens`, `extensions/animation.js`), `02-SGS-BLOCKS-REFERENCE.md` and 35A, `common-wp-styling-errors.md`, and `dev-setup.md` (the DB column reference, which names `animation_tokens`; that table is retired in wave 2). M6.6C's census greps `plugins/`, `scripts/`, `theme/` and `sites/*/build`, but not `.claude/`. | C | Every session reading the specs or `dev-setup.md` during and after the build sees the real system ("docs state current truth only"). Fix: widen M6.6C's census to `.claude/specs`, `.claude/rules`, `dev-setup.md` and `architecture.md`; widen R11 to its output; have M1.6 update `dev-setup.md` when it retires the table. 5 min. |
| 7 | **No check against the per-page weight budget.** The spec's hard-constraints table (§3) repeats the project rule of under 50 KB of JS and 100 KB of CSS per page. The plan proves conditional loading (a page with no motion loads nothing) but never measures the heaviest motion page. `check-motion-bundle-budget.py` checks only GSAP module sizes, and the `fx-*.css` files total about 101 KB. | C | A non-negotiable is proven on the worst case before client delivery, not found later by a performance audit. Fix: add a network-weight assertion (CSS and JS bytes per page) to M5.Z's stacked-effects fixture and to Gate 9 on an Eye Care page. 5 min. |
| 8 | **Session estimates leave out deploy and reseed time.** By the plan's own text there are about 30 deploys (M2.9 to four targets, M3.W, M4.5, M4.6, M5.16a and b, M5.W to four targets, M6.6's six groups "on four sites", M5.18, M6.7) and about 13 reseeds, at about 5 minutes each (memory: serialise-deploys). Only serial-queue waits are said to be excluded. M6.6's deploy targets per group are unstated. There is no pessimistic or PERT figure, which the strategic-plan skill requires. | C | S5 and S6 are sized to fit a session, so the removal phase does not straddle a session boundary. Fix: count deploys and reseeds per session, add the fixed cost (deploys to different targets run in parallel), state M6.6's targets per group, and add a pessimistic column. 5 min. |
| 9 | **The four parallel S4 sessions have no prompts.** Wave 12 starts four tracks at once with cross-track wait rules, but nothing says S3's handoff writes four paste-ready track prompts to `.claude/prompts/` (memory: deferred session work goes in a prompt file). | C | Bean starts four sessions by pasting four prompts, and each track carries its own wait rules and its Gate 4 check. Fix: one line in the Session plan: S3's handoff writes `.claude/prompts/spec38a-s4-track-{I,S,E,L}.md`. 2 min. |
| 10 | No safe pause points are named. The plan names the fragile wave boundaries (5, 11, 19) but not where a client interruption can safely stop the build. The "nothing red lands on main" rule already keeps every commit buildable. | D | Less re-entry thinking after a pause. Fix: one line naming Gates 3, 6 and 8 as safe stops. 2 min. |
| 11 | FRs that span several units (9, 10, 11, 12, 46, 50) have no named closing unit in pre-emptive decision 4. Gate 9 would catch an unflipped status line. | D | Status lines flip once, in a known unit. Fix: add them to decision 4. 2 min. |
| 12 | Owned-file lists are incomplete in two places: R7 puts the master easing list in the easing atom, but M1.9's Edits omit `src/components/motion/EasingAtom.js`; pre-emptive 16 has M5.12 fill M3.3's `onAdd` hook, but M5.12's Edits omit that file. No same-wave clash results today. | D | Ownership checks stay exact. Fix: add both paths. 2 min. |
| 13 | M3.W's evidence command `git grep -ln fx-shape-routes -- plugins/sgs-blocks` returns 12 files, including `fx-shape-routes.php` and `.json`, which must not be renamed. Only 4 files reference the stylesheet (`git grep -ln "fx-shape-routes\.css\|fx-shape-routes'"`). | D | A literal-minded subagent does not edit the PHP and JSON route files. Fix: correct the command and the count. 1 min. |
| 14 | The verify file's editor-typing row compares only against the M3.0 baseline, while amendment M3.0 makes the A/B run on one HEAD the primary check. | D | The verify row matches the plan. Fix: change the row to the A/B command. 1 min. |
| 15 | Decision 1 option B (move a stored core-block entrance onto the nearest SGS container) has no mapper family in pre-emptive 10. There are probably zero cases, because core blocks are banned and migrated. | D | No silent drop if a case exists. Fix: M6.1's survey counts core-block entrances; if any exist on eye-care-test, M6.2 gains a re-home step. 2 min. |
| 16 | Pre-emptive 7 proceeds with a reseed or deploy after 5 minutes without a reply, but the serialise-deploys memory says peers answer "at their next tool round, minutes later". | D | Fewer aborted 5-minute deploys. Fix: wait for a reply or 10 minutes, and check `git worktree list \| grep sgs-deploy-wt` before proceeding. 1 min. |
| 17 | The gate rows omit the strategic-plan template's "effort so far" and "effort remaining" fields. This is formatting only. | F | None that changes an outcome. |

**Excluded (not gaps in the target):** the `search.py` default engine (searxng via bing) returned dictionary results for every query, so I used `--engine brave` (a tooling issue). A peer session has uncommitted deletions across `small-giants-wp/.claude/gap-analysis/` (seen in `git status`); this is not in the plan, but the parent should know before committing this run's project-local report.

## 5. Recommendations (ALL, with impact rating)

| # | Recommendation | Fixes gap # | Impact | Effort |
|---|---------------|-------------|--------|--------|
| 1 | Assign FR-38A-42 to M2.2 (channel), M3.4 (controls) and M3.9 (live fixture, closing unit); add it to pre-emptive 4 and to the verify file | 1 | HIGH | LOW (5 min) |
| 2 | Add the overlap rule: `sgsMotion` wins; old motion panels hide on blocks declaring the support from M3.3; Gate 5 runs after it | 2 | HIGH | LOW (10 min) |
| 3 | Write "M1.7 under option B": files, view definition, `schema.sql` handover, consumer list, FR-38A-3 v1.6 done-when, verify row | 3 | HIGH | LOW (10 min) |
| 4 | Add M3.12 and M6.6C to the M3 to M6 map with adapt-or-rebuild (precedent: `custom-css.js`, `child-sizing.js`), SURFACES and a four-layer test | 4 | MED | LOW (10 min) |
| 5 | Name FR-38A-33 in coverage plan Phase 4 with its needs; state the cloning window between M6.6 and M7 in Scope | 5 | MED | LOW (5 min) |
| 6 | Widen M6.6C's census and R11 to `.claude/` docs; have M1.6 update `dev-setup.md` | 6 | MED | LOW (5 min) |
| 7 | Add a per-page CSS and JS weight assertion to M5.Z and Gate 9 | 7 | MED | LOW (5 min) |
| 8 | Add deploy and reseed fixed cost per session, M6.6 targets per group, and a pessimistic column | 8 | MED | LOW (5 min) |
| 9 | S3's handoff writes four track prompts to `.claude/prompts/` | 9 | MED | LOW (2 min) |
| 10 | Name Gates 3, 6 and 8 as safe pause points | 10 | LOW | LOW (2 min) |
| 11 | Name closing units for FRs 9, 10, 11, 12, 46, 50 | 11 | LOW | LOW (2 min) |
| 12 | Add `EasingAtom.js` to M1.9 and M3.3's hook file to M5.12 | 12 | LOW | LOW (2 min) |
| 13 | Correct M3.W's grep command and count | 13 | LOW | LOW (1 min) |
| 14 | Align the verify file's typing row with the A/B rule | 14 | LOW | LOW (1 min) |
| 15 | Survey-count core-block entrances; add a re-home step only if any exist | 15 | LOW | LOW (2 min) |
| 16 | Lengthen the serial-queue no-reply wait and check deploy worktrees first | 16 | LOW | LOW (1 min) |
| 17 | Optional: add the effort fields to the gate rows | 17 | LOW | LOW (2 min) |

Bulk-fix path: recommendations 1 to 9 (every C+ gap) in one pass of about 57 minutes; adding 10 to 16 brings it to about 68 minutes. Under Hard Rule 5, the B and C gaps belong in the plan itself. I was told not to edit the plan, so the parent or Bean applies them.

## 6. Research Findings

| Search query | Source | Finding |
|-------------|--------|---------|
| strangler fig pattern pitfalls removing legacy code | brave (notna.tech, theordinarycompany.io, Shopify Engineering) | The common failure is "declaring victory too early": legacy code is removed before the new path handles every edge case, and mature teams soak a slice before deleting. Applied: the plan's per-group census, revert-on-red and pre-production content ruling make a short soak acceptable, but the overlap window still needs a defined winner (gap 2). |
| expand contract parallel change database schema migration view | brave (Prisma Data Guide, Tim Wellhausen's Expand and Contract paper, the Parallel Change Substack) | Expand, migrate, then contract, with compatibility views so consumers move one at a time. Applied: this supports decision 3 option B (a view over small tables), and implies the view's consumers must be listed up front (gap 3). |
| large software rewrite plan failure modes estimates parallel teams shared codebase | brave (Augment Code's AI code migration guide, vadimkravcenko.com, Hacker News) | Parallel agentic migrations scale by splitting into bounded units that share validation gates; projects fail on unbounded integration and on estimates that drop fixed costs. Applied: the plan's units and shared gates match the good pattern; the uncounted deploy cost is gap 8. |
| page weight budget CI check CSS JS per page Lighthouse budget.json | brave (Unlighthouse, Front-End Checklist, size-limit) | The standard is a per-page resource-size assertion in CI (budget.json or size-limit), not only a per-module check. Applied: gap 7. |
| Internal: past plan evaluations (`~/.claude/gap-analysis/reports/2026-10-07-cr6-box-longhand-migration-plan.md`) | filesystem | Last plan grade 3.86 (B, REVIEW). Its gaps were a shared helper's return-type change for every caller, and a missing closing doc sync. The doc-sync pattern recurs here as gap 6. |
| Internal: project memory index (`MEMORY.md`) and the serialise-deploys, SSR preview limit and module-state memories | filesystem | The plan already covers per-bundle module state (import-map externals), reseeding from HEAD, enum coercion and the shared-worktree commit traps. The SSR GET-URL limit is already fixed framework-wide (`src/components/ServerSideRender.js` POSTs, gate `audit-ssr-http-method.js`), so it is not a gap. The serialise memory informs gaps 8 and 16. |
| Internal: library neighbour (`~/.agents/skills/strategic-plan/SKILL.md`) | filesystem | It requires PERT (optimistic, realistic, pessimistic), a gate block with effort so far and remaining, and a command beside every verification claim. The plan meets the last; it lacks pessimistic figures (gap 8) and the gate effort fields (gap 17). |

## 7. S-Grade Opportunity Hunting

### 7A. Current S-Grade Screen

| Category | Criterion | Hit? | Evidence |
|----------|-----------|------|----------|
| Functional | USP | No | A rigorous plan, but plan rigour is not a unique approach. |
| Functional | Innovative | No | The build it plans is innovative (per-element motion that the cloner can write); the plan itself is standard practice done well. |
| Functional | Cross-system | No | Scoped to SGS motion. |
| Impact | Competitive moat | No | The moat belongs to the built system, not the plan. |
| Impact | Revenue/time | No | It enables revenue work indirectly (Indus steps 21 onwards). |
| Impact | Marketing showpiece | No | Internal document. |

**Current verdict:** Not a candidate.

### 7B. S-Grade Opportunities (from research)

| Opportunity | S-grade criteria hit | Showpiece? | Effort | Description |
|-------------|---------------------|------------|--------|-------------|
| FR-to-unit coverage check for every plan | cross-system, revenue/time | LOW | about 20 min | A small script reads a spec's FR list and a plan's unit table and fails when any FR has no owning and closing unit. It would have caught gap 1 in seconds, and could become a strategic-plan Phase 5 gate for every future plan. |
| Deploy-aware session sizing | revenue/time | LOW | about 15 min | Counts the deploys and reseeds each session's units declare and adds their fixed cost automatically, so session plans stop dropping known time (gap 8). |
| Safe-pause map on every multi-session plan | revenue/time | LOW | about 5 min per plan | Marks which gates leave the framework shippable, so client work can interrupt a long build without stranding it. |

Searched 4 external and 3 internal sources. No S-grade opportunity for the plan itself: it is an internal execution document. The first opportunity is the most valuable because it generalises.

## 8. Human Summary

```
Target: Spec 38A build plan (.claude/plans/2026-10-12-spec38a-motion-build.md)
Grade: B (3.78/5); passes the strategic-plan hard gate (B, 3.5 or above)
Strongest: dependency mapping (4.2)
Weakest: effort estimation (3.3)
Gaps found: 17 (F:1 D:7 C:5 B:3 A:1)
S-grade: Not awarded
Research: Done (4 external via brave, 3 internal)
Persona divergence: None
```

## Evaluation JSON

```json
{
  "target": "Spec 38A build plan (small-giants-wp/.claude/plans/2026-10-12-spec38a-motion-build.md)",
  "target_type": "plan",
  "timestamp": "2026-10-12T22:30:00+01:00",
  "overall_grade": "B",
  "overall_score": 3.78,
  "qc_pending": true,
  "scope": "project:sgs-wp",
  "criteria": [
    {"name": "feasibility", "score": 3.9, "grade": "B", "weight": 1.0, "evidence": "Every repo claim checked is true (13,304 rows, 145 unfiltered consumers, stagger.js gone, staggerOffset present, nine snapshots, four TARGETS, three Playwright engines); M1.7 is described only for DB option A while B is recommended; the old/new panel overlap is undefined.", "rationale": "Would ship to a paying client after two small amendments; not gold-standard while a critical-path unit lacks a brief for the recommended option.", "floor_applied": false, "floor_check": {"evaluated": true, "floor_condition": null, "fired": false, "reason_if_fired": null}, "calibration_applied": {"evaluated": true, "fired": true, "justification": "Fixing gaps 2 and 3 removes two mid-build stalls on the critical path (M1.7 and Gate 5)."}},
    {"name": "completeness", "score": 3.4, "grade": "C", "weight": 1.0, "evidence": "FR-38A-42 is owned by no unit, closing rule or verify row; M3.12 and M6.6C lack map entries; R11 misses Specs 38, 48, 02-REFERENCE, 35A and dev-setup.md; no per-page weight check.", "rationale": "Does the job but leaves visible work: one spec requirement would be discovered unbuilt at Gate 9.", "floor_applied": false, "floor_check": {"evaluated": true, "floor_condition": null, "fired": false, "reason_if_fired": null}, "calibration_applied": {"evaluated": true, "fired": true, "justification": "Fixing gap 1 changes whether the draft-proven tilted-card hover can be built and cloned at all."}},
    {"name": "risk_identification", "score": 4.1, "grade": "B", "weight": 1.0, "evidence": "Eight ranked H-impact risks each with an applied mitigation and per-unit amendments carrying evidence commands; missing: dual-model overlap, per-page budget, cloning regression window.", "rationale": "Strong; minor gaps only.", "floor_applied": false, "floor_check": {"evaluated": true, "floor_condition": null, "fired": false, "reason_if_fired": null}, "calibration_applied": {"evaluated": true, "fired": true, "justification": "The overlap rule changes what Bean sees and signs off at Gate 5."}},
    {"name": "dependency_mapping", "score": 4.2, "grade": "B", "weight": 1.0, "evidence": "Re-derived every Needs against its wave: none placed early; hot-file owners, cross-track waits and the critical path are explicit; three owned-file omissions (EasingAtom.js in M1.9, M3.3 hook in M5.12, schema.sql for M1.7 under B).", "rationale": "Ready to execute; the omissions cause no same-wave clash today.", "floor_applied": false, "floor_check": {"evaluated": true, "floor_condition": null, "fired": false, "reason_if_fired": null}, "calibration_applied": {"evaluated": true, "fired": false, "justification": "Residual gaps are D-grade file-list omissions."}},
    {"name": "effort_estimation", "score": 3.3, "grade": "C", "weight": 1.0, "evidence": "Phase-level O/R calibrated on Indus actuals and Bean's time itemised; about 30 deploys and 13 reseeds at about 5 min each are uncounted; M6.6 per-group targets unstated; no pessimistic or PERT figure.", "rationale": "Usable, but S5 and S6 are under-sized by the known fixed cost.", "floor_applied": false, "floor_check": {"evaluated": true, "floor_condition": null, "fired": false, "reason_if_fired": null}, "calibration_applied": {"evaluated": true, "fired": true, "justification": "Counting fixed deploy and reseed time changes how many sessions the removal phase needs."}}
  ],
  "personas": {
    "generated": true,
    "profiles": ["Bean (non-coder owner, ADHD)", "Cold executing session or subagent", "Framework maintainer and next client build"],
    "scores": {
      "Bean (non-coder owner, ADHD)": {"overall": 3.74, "grade": "B"},
      "Cold executing session or subagent": {"overall": 3.80, "grade": "B"},
      "Framework maintainer and next client build": {"overall": 3.81, "grade": "B"}
    },
    "divergences": []
  },
  "categorical_failures": [],
  "identical_score_warning": {"fired": false, "count": 0, "score": null, "comment": "One prior plan evaluation; no run of identical scores."},
  "system_effect_lens": {
    "end_result": {"verdict": "pass", "reasoning": "Drives a traced outcome: per-element stored motion the cloner can write, unblocking clone coverage Phase 4 and Indus steps 21 onwards."},
    "cross_context_reach": {"verdict": "pass", "reasoning": "Plan, maps, verify file and LEDGER line are plain repo files any cold session reads; unit rows are self-contained."},
    "durable_persistence": {"verdict": "pass", "reasoning": "Decisions are written into the spec and the plan; gates record to LEDGER Front M and the verify file."},
    "automation_vs_remember": {"verdict": "pass", "reasoning": "Maintenance is scripts and gates (run-motion-gates.py, allow-list with delete_in_unit, census --check), not remember-to rules."},
    "adhd_overwhelm": {"verdict": "pass", "reasoning": "Bean's load is batched: one 10-minute decision sitting, four visual sittings, one final review; the only add is four parallel session launches, which gap 9 makes paste-ready."},
    "values_alignment": {"verdict": "pass", "reasoning": "'Why it matters' and a first action are present; no % impact (two of three signals)."},
    "veto_triggered": false,
    "grade_cap_applied": null,
    "lens_6_status": "draft-unconfirmed",
    "draft_unconfirmed": true,
    "rubric_response": null,
    "rubric_parse_error": null
  },
  "opportunities": [
    {"name": "FR-to-unit coverage check", "description": "A script that fails any plan whose unit table leaves a spec FR without an owning and closing unit; could become a strategic-plan Phase 5 gate.", "connects_to": ["strategic-plan skill", "lint-spec-drift.py", "every SGS spec build plan"], "non_obvious": true, "research_finding": "Parallel agentic migrations depend on shared validation gates (Augment Code guide); a requirement-to-unit trace is the missing gate here.", "s_grade_criteria_hit": ["cross_system", "revenue_time"], "showpiece_potential": "low"},
    {"name": "Deploy-aware session sizing", "description": "Session estimates add the fixed cost of each declared deploy and reseed automatically.", "connects_to": ["strategic-plan effort agent", "build-deploy.py"], "non_obvious": true, "research_finding": "Estimates that drop fixed integration costs are a top rewrite failure mode.", "s_grade_criteria_hit": ["revenue_time"], "showpiece_potential": "low"},
    {"name": "Safe-pause map", "description": "Mark the gates where the framework is shippable, so client work can interrupt a long build safely.", "connects_to": ["LEDGER.md", "autopilot re-entry"], "non_obvious": false, "research_finding": "Strangler-fig guidance stresses keeping both systems running safely between slices.", "s_grade_criteria_hit": ["revenue_time"], "showpiece_potential": "low"}
  ],
  "s_grade": {"screened": true, "candidate": false, "categories": {"functional": {"usp": false, "innovative": false, "cross_system": false}, "impact": {"competitive_moat": false, "revenue_time": false, "marketing_showpiece": false}}, "research_dispatched": false, "confirmed": {"confirmed": false, "confirmer": null, "timestamp": null, "evidence": null}, "skip_reason": "Internal execution plan; no S criterion hit."},
  "recommendations": [
    {"fix": "completeness: assign FR-38A-42 to M2.2, M3.4 and M3.9 (closing), add to pre-emptive 4 and the verify file", "opportunity_grade": "A", "fix_time_minutes": 5, "expected_uplift": "+0.4 completeness", "priority": 1},
    {"fix": "feasibility/risk: overlap rule (sgsMotion wins; old panels hide on support-declaring blocks from M3.3; Gate 5 after it)", "opportunity_grade": "B", "fix_time_minutes": 10, "expected_uplift": "+0.2 feasibility, +0.2 risk", "priority": 2},
    {"fix": "feasibility: M1.7 brief under decision 3 option B (files, view, schema.sql handover, consumers, FR-38A-3 v1.6, verify row)", "opportunity_grade": "B", "fix_time_minutes": 10, "expected_uplift": "+0.2 feasibility", "priority": 3},
    {"fix": "completeness: map entries for M3.12 and M6.6C with adapt-or-rebuild, SURFACES and a four-layer test", "opportunity_grade": "B", "fix_time_minutes": 10, "expected_uplift": "+0.2 completeness; meets Bean binding requirement 1", "priority": 4},
    {"fix": "completeness: name FR-38A-33 in coverage plan Phase 4; state the M6.6-to-M7 cloning window", "opportunity_grade": "C", "fix_time_minutes": 5, "expected_uplift": "+0.1 completeness", "priority": 5},
    {"fix": "completeness: widen M6.6C census and R11 to .claude docs; M1.6 updates dev-setup.md", "opportunity_grade": "C", "fix_time_minutes": 5, "expected_uplift": "+0.1 completeness", "priority": 6},
    {"fix": "risk: per-page CSS/JS weight assertion in M5.Z and Gate 9", "opportunity_grade": "C", "fix_time_minutes": 5, "expected_uplift": "+0.1 risk", "priority": 7},
    {"fix": "effort: add deploy/reseed fixed cost per session, M6.6 targets, pessimistic column", "opportunity_grade": "C", "fix_time_minutes": 5, "expected_uplift": "+0.4 effort", "priority": 8},
    {"fix": "effort/ADHD: S3 handoff writes four S4 track prompts to .claude/prompts/", "opportunity_grade": "C", "fix_time_minutes": 2, "expected_uplift": "+0.1 effort", "priority": 9},
    {"fix": "risk: name Gates 3, 6, 8 as safe pause points", "opportunity_grade": "D", "fix_time_minutes": 2, "expected_uplift": "minor", "priority": 10},
    {"fix": "dependency: closing units for FRs 9, 10, 11, 12, 46, 50", "opportunity_grade": "D", "fix_time_minutes": 2, "expected_uplift": "minor", "priority": 11},
    {"fix": "dependency: add EasingAtom.js to M1.9 and the M3.3 hook file to M5.12", "opportunity_grade": "D", "fix_time_minutes": 2, "expected_uplift": "minor", "priority": 12},
    {"fix": "feasibility: correct M3.W grep command and file count", "opportunity_grade": "D", "fix_time_minutes": 1, "expected_uplift": "minor", "priority": 13},
    {"fix": "completeness: align verify typing row with the A/B rule", "opportunity_grade": "D", "fix_time_minutes": 1, "expected_uplift": "minor", "priority": 14},
    {"fix": "completeness: survey-count core-block entrances; re-home step only if any", "opportunity_grade": "D", "fix_time_minutes": 2, "expected_uplift": "minor", "priority": 15},
    {"fix": "risk: longer serial-queue no-reply wait plus deploy-worktree check", "opportunity_grade": "D", "fix_time_minutes": 1, "expected_uplift": "minor", "priority": 16},
    {"fix": "format: gate effort-so-far/remaining fields", "opportunity_grade": "F", "fix_time_minutes": 2, "expected_uplift": "none", "priority": 17}
  ],
  "bulk_fix_path": {"available": true, "total_estimated_minutes": 57, "covers": "all C+ recommendations (1 to 9) in priority order; 68 min with the D items", "default_offered": true},
  "topics": ["fr-coverage-trace", "effort-estimation", "legacy-overlap-window", "db-shape-decision", "doc-consumer-census", "page-weight-budget", "spec38a-motion-build"],
  "research_performed": {
    "external_queries": ["strangler fig pattern pitfalls removing legacy code", "expand contract parallel change database schema migration consumers view instead of wide table", "large software rewrite plan failure modes estimates integration hell parallel teams shared codebase", "page weight budget CI check CSS JS per page Lighthouse budget.json"],
    "external_findings": ["Removing legacy before every edge case is handled is the top strangler-fig failure; define the overlap.", "Expand-contract with compatibility views supports option B and requires listing view consumers up front.", "Bounded units plus shared gates scale migrations; dropped fixed costs break estimates.", "Per-page resource budgets are asserted in CI, not only per module."],
    "internal_searches": ["past evaluations: ~/.claude/gap-analysis/reports/2026-10-07-cr6-box-longhand-migration-plan.md", "workspace memory: small-giants-wp MEMORY.md, serialise-deploys, editor-preview-get-url-limit, module-state-is-per-bundle", "library neighbour: ~/.agents/skills/strategic-plan/SKILL.md"],
    "internal_findings": ["Missing closing doc sync recurs (CR6 gap 2, here gap 6).", "Most memory traps are already mitigated; the SSR URL limit is fixed framework-wide; serialise-deploys informs gaps 8 and 16.", "Strategic-plan requires PERT and gate effort fields; the plan lacks the pessimistic figure."],
    "local_search_query": "FR-38A-[0-9]+ per-FR count over the plan; FR-38A-42 in maps; staggerOffset; stagger.js; fx-shape-routes; FROM block_attributes; TARGETS; theme-snapshot.json; editor.BlockListBlock; sgsAnimation in scripts/computed-route; spec citations of deleted files in .claude/",
    "local_search_findings": "All load-bearing claims verified true except M3.W's file count; FR-38A-42 unowned; M3.12 and M6.6C absent from the maps; cloner writes sgsAnimationStart today; seven docs cite code or tables the build deletes.",
    "local_search_empty": false,
    "baseline_established": "A strong build plan for a large replace-and-remove migration traces every requirement to an owning and closing unit, defines the overlap behaviour between old and new paths, lists every consumer of what it deletes (code and docs), asserts the non-negotiable budgets on the worst case, and counts every known fixed cost in its session sizing."
  },
  "drift_warning": null,
  "inflation_note": "Self-preference counter applied; only one prior plan grade, so no drift baseline.",
  "research_skipped": false,
  "research_skip_reason": null,
  "personas_skipped": false,
  "personas_skip_reason": null,
  "qc_review": {"ran": false, "reviewers": [], "findings_count": 0, "findings": [], "certainty": {"score": null, "verdict": "pending", "dominant_answer": null, "dissenting_count": null, "dissenting_reviewer": null}, "bean_response": "pending", "decided_at": null, "amendments_applied": []}
}
```
