Invoke /autopilot before doing anything else.

Context: Eye Care (client slug eye-care-ward-end) is being rebuilt from a Claude Design draft onto the SGS
WordPress block framework. A measuring route (Spec 47, "the computed route") measures the draft against the live
site and writes block settings to close the difference. A whole-site sweep measured all 17 surfaces and found
2,373 painted differences; an audit classed every one with proof (W 1,710 walker or route gaps, F 163 candidate
framework gaps, T 447 writable on the next run, U 28, D 17 decided, 8 the parallel Google reviews track's).

Bean approved this work on 5 October and set its order: the route first, the findings afterwards. The fix register
(`.claude/plans/2026-10-02-eye-care-fix-register.md`) is the source of truth: the 163 F rows are findings to
assess, not a list of gaps to build, and many of them ignore how the framework works, because a mega menu, modal or
choice flow is a CPT canvas composed from blocks and a setting can arrive from a parent by block context. That is a
route defect, so THIS SESSION REPAIRS THE ROUTE AND TOUCHES NO BLOCK CODE. Judging the findings is Session C2, a
separate session, on this session's output.

**Two other tracks may be live on this repo at the same time. Neither is yours.**
- **The register-proven repairs track** (`.claude/plans/2026-10-05-eye-care-register-proven-repairs.md`) builds the
  register items whose cause is already proven in code, in `plugins/` and `theme/` only. **Zero file overlap with
  you**, but it shares the test site and the framework database, so tasks 1 and 6 below coordinate with it.
- **The Google reviews track** is closed and live on both test sites. Leave its block and its rows alone.

Read first, in this order:
- `.claude/plans/2026-10-05-eye-care-session-c-spec47-route-fixes.md` in full. It is the session's plan: scope, the
  nine lanes L1 to L9 in three waves, Gates 1 to 3, the new FR-47-8 canvas rule, the risks, and the two answers
  owed by Bean.
- `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` sections 1 (binding rules, note the new R-47-12), 3.1 to 3.8,
  5 Residual and 6 Open questions.
- `scripts/computed-route/README.md`, which lists every route file and export. R-47-1 requires it to stay complete.

Tasks, in order. The plan carries each one's detail; this is the order and the shape.

1. **Wave 0, main thread, serial** (~30 min). C0.1 confirm live = HEAD by checksum, because the Google reviews
   track was mid-deploy to eye-care-test at the last handoff, so the recorded block code `4726700c1` may be stale;
   **also ask the repairs track whether it has deployed anything**, because C3.6's count is only meaningful if the
   block code is known and stable. C0.2 clear the sandybrown deploy blocker (155 old-shape `sgs/cta-section` blocks
   on the Spec 47 calibration page, post 4750; migrate with `scripts/wp-migrate-oldshape-blocks.js` or empty the
   page, and never `--skip-oldshape-audit`) — **the repairs track needs sandybrown too, so check whether it has
   already cleared this before doing it again**. C0.3 write the 15 divergence-ledger entries, each with its own
   `scope` (`D-17` to `D-24` are all scoped `contact`, so a copy left at `contact` matches nothing on the footer or
   header). C0.4 record the four baselines: route test count, ambiguous-row count, F count, and
   `calibration.discovered` per block. C0.4 is not optional: two Wave 1 changes widen the candidate set, and a rise
   in the ambiguous count is a gate failure that cannot be detected without it.

2. **Ask Bean the two questions the plan names** (2 min, inline, at the same time as task 1 so nothing waits).
   Which surfaces are canvases, needed before L1.4 in Wave 1 (proposed, and all four confirmed as post types in the
   source: `sgs_mega_menu`, `sgs_modal`, `sgs_drawer`, `sgs_choice_flow`; `sgs_header` and `sgs_footer` are
   deliberately excluded because on a cloned client the route writes their trees itself); and whether the text read
   covers `role text-content` (235 settings) as well as `role content` (84), needed before L7.3 in Wave 2
   (recommendation: both). If the roster answer has not arrived when Wave 1 dispatches, build against the proposed
   one: the flag is data in `surfaces.json`, so changing it later is one manifest field and no code.

3. **Wave 1, six lanes in parallel** (~45 min wall clock; L1 at 40 min sets it). One subagent per lane,
   `isolation: "worktree"`, a fixed file list, phase 1 read-only diagnosis and a written approach, a main-thread
   check, then phase 2 with a MUST-FAIL test shown red before the fix. L1 resolver and triage (opus, serial inside
   the lane, because every other part of the route reads it); L2 walker core, L3 flows, L4 pairing, L5 fixtures and
   harness, L6 sweep (sonnet each). Agents never build, deploy, reseed, commit, run gates or touch a host, and
   never edit `README.md`, `lint.mjs`, `surfaces.json`, `divergences.json`, the framework database or its seeding
   channels: each returns its README entries as text and the main thread merges them once per wave.
   **L2's file list is `scripts/parity/lib/` for `collect.mjs`, `devtools.mjs`, `compare.mjs`, `compare-state.mjs`,
   `auto-collect.mjs`, `focus.mjs`, `state-passes.mjs`, `links.mjs` and `entrances.mjs`** — only `benchmark.mjs`,
   `draft-live-walk.mjs` and `GAP-CHECKLIST.md` sit at the top level. A lane stops and reports if it needs a file
   outside its list, so the list has to be right.
   **L3's flows need a live bag, filter and lens pop-up, which agents may not drive**: that lane writes the flow
   scripts and unit-tests their state mapping, and the main thread runs them against eye-care-test in Wave 3.

4. **Gate 1, main thread** (~30 min). Merge one lane at a time and read every diff. `node --test
   "scripts/computed-route/tests/*.test.mjs"` and `node scripts/computed-route/lint.mjs --surfaces
   sites/eye-care-ward-end/build/surfaces.json` green after each merge; README merged; the ambiguous count not
   risen; `calibration.discovered` unchanged; `lib/db.mjs::enumSettings` still selecting 633 rows. A lane that
   fails its gate does not block the others: its items stay open in the plan with the lane named.
   **This is a clean stop.** The session may end here and resume at Wave 2 from the plan alone.

5. **Wave 2, three lanes** (~30 min), after L1 has merged. L7 calibration reads (opus), L8 Solve writes and L9
   Fill (sonnet). L8 starts once L7's output shape is agreed in phase 1, so the two overlap. L9 covers all seven
   parts of Spec 47 §3.4, not just the tree and the words; its own done-condition is a built surface with its
   committed tree withheld as the answer key, because Eye Care has no unbuilt surface. Then Gate 2: as Gate 1,
   plus re-run triage on all 17 surfaces and require each surface's triage count to equal its sweep count, with
   every delta against 2,373 explained row for row in the commit.

6. **Wave 3, main thread, serial, one host job at a time** (~70 min). C3.1 declare R1's 32 routable rows in
   `plugins/sgs-blocks/scripts/attr-classification-overrides.json` and nowhere else; C3.2 one reseed from clean
   HEAD after messaging peer sessions; C3.3 `python plugins/sgs-blocks/scripts/db-consistency/run.py --check`;
   C3.4 recalibrate every block whose code OR routing columns changed, on the WSL mirrors; C3.5 a paid test order
   on eye-care-test so the confirmation surface paints; C3.6 one measure-only sweep of all 17 surfaces with the
   same command and flags as the 2026-10-05 baseline; C3.7 re-triage; C3.8 record the new F count, what moved per
   lane, the triage output path and the row-by-row list of what is still open. **C3.8 is Session C2's input and is
   the point of the session.** Then Gate 3. Use `/sgs-wp-engine`, and `/sgs-update` for the one reseed.
   **Before C3.6, confirm with the repairs track that it has not deployed to eye-care-test**, and record the block
   code the sweep ran at beside the result: the whole value of this count is that it is attributable to the route
   and nothing else.
   **The repairs track may ask you to absorb its reseed and its eye-care-test deploy into C3.2 and C3.4**, since
   you run exactly one of each. Accept: that is cheaper and safer than a second host job racing yours.

7. **At handoff, update Session C2's prompt file** (`.claude/prompts/session-c2-finding-assessment.md`) from what
   actually happened: the real F count, which lanes reclassified what, whether the canvas rule shrank the
   mega-menu and lens-pop-up rows as expected, which lanes failed their gate and so left items open, and whether
   the repairs track has deployed. Then `git rm` this prompt file: prompt files are single-use. `/handoff` does
   the rest.

Guardrails:
- **No block code.** Gate 3 fails if `git diff --name-only` shows any `block.json`, `render.php`, block `style.css`,
  theme CSS or shared helper. Those belong to Session C2, after Bean approves each item, or to the parallel
  repairs track, which already owns a dozen of them.
- **Declare routing in `plugins/sgs-blocks/scripts/attr-classification-overrides.json` only.** The derived file
  `behavioural-analyser/css-property-classifications.json` says in its own `_doc` that it is "a REGENERATED file,
  not hand-edited", and the overrides file is applied after it and wins on any field conflict. An edit to the
  derived file is wiped by the next `extract-signatures.py` run, as surely as a bare `UPDATE` is wiped by the next
  reseed; both fail `db-consistency/check_css_property_reseed.py` invariant B.
- **Never route `css_property` onto a row whose `enum_values` is non-NULL.** 633 rows work through calibration
  discovery precisely because that column is empty, and L1.3 exists to keep them working.
- **Never infer `css_element` from an attribute's name.** Derive it from the BEM element the block's `render.php`
  or `style.css` actually declares the property on, cited `file::selector`. A wrong `css_element` is worse than
  NULL: it sends calibration's marker to the wrong element, so Solve writes a real value onto the wrong element.
- **Never add a `divergences.json` entry to close a row.** The ledger is Solve's write target, so a wrongly added
  entry freezes a wrong value permanently and turns no check red. C0.3's 15 touch-target and S1 entries are the
  one declared exception, and they close D rows, not F rows.
- **The reseed runs in the main thread only, once, from clean HEAD, after messaging peer sessions.** A reseed
  mid-run breaks another session's deploy and rebuilds the database your own L1 and L7 lanes read. Lane agents
  never reseed, run gates or commit.
- **Commit gates:** `node --test "scripts/computed-route/tests/*.test.mjs"`, `node
  scripts/computed-route/lint.mjs --surfaces sites/eye-care-ward-end/build/surfaces.json`, `python
  scripts/check-no-client-names.py --check`. Every new export and test listed in `scripts/computed-route/README.md`.
  Note that the route tests return 236 of 237 while any deploy or reseed runs on this machine: that is
  `lib/tree.mjs::assertQuiet` (R-47-11) working, not a regression. Re-run when the host is quiet and expect 237.
- **Never stage** `.claude/reports/serverside-render-disabled-audit.*`,
  `plugins/sgs-blocks/scripts/consistency/*.json`, `plugins/sgs-blocks/scripts/dbschema/seed-history.json`,
  `plugins/sgs-blocks/.phpunit.cache/*`, `reports/phase4-*.txt`,
  `.claude/reports/2026-10-04-route-data-audit/fingerprint/*.json`, or any path containing `Bean Points`. Commit
  straight to `main` with an explicit pathspec, checking `git branch --show-current` in the same command; never
  `git add -A`, never a glob, never a stash.
- **Host tools:** `SGS_HEADED=1`, one job at a time. If Hostinger shows a captcha, use the WSL mirrors
  (`scripts/local-wp/README.md`).
