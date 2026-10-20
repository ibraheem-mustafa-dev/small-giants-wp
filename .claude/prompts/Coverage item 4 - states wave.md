Invoke /autopilot before doing anything else.

CONTEXT (plain English)

SGS clones Claude Design drafts into WordPress through the "computed route" (scripts/computed-route/, Spec 48). The clone coverage plan (.claude/plans/2026-10-12-clone-coverage-foundation.md) makes coverage a machine check. Every framework capability, and everything a draft can hold, is either covered (with recognise, write and check references), excluded by Bean, or a gap in a named wave. This session takes Order item 4, the states wave (Spec 48 FR-48-81): hover, focus, focus-visible, active, checked, open and popover-open, the draft's style-* rules, and ARIA states (aria-expanded, aria-pressed, aria-current, aria-checked, aria-hidden), plus the drawer, modal and mega-menu surfaces they open. Together with the done motion writer (step 4.0), it unblocks Indus step 20, the header slice. The Indus draft has 10 states-wave rows and Mama's redesign 10 (Indus plan, "What the drafts still need").

GATE ON THE RUNNING ROUTE SESSION (check first)

A route session may still be running ".claude/prompts/After control gaps - route calibration and gradient seeder.md". It edits calibration and resolver files (scripts/computed-route/lib/calibrate-markers.mjs, lib/calibrate-props.mjs, lib/resolve.mjs, a new resolver module) and runs the full Indus recalibration. A states change to what calibration reads would change the cache's readKey and make that recalibration stale. So:
- If that prompt file still exists, or ListAgents shows the session busy: do tasks 1 and 2 only (survey and plan, no code edits in scripts/computed-route/lib/). Message it to say you are planning the states wave and will not edit route lib files until its handoff.
- Once its handoff has landed (the prompt file is deleted and the FR-48-8 plan's step 5 is updated), build.

READ FIRST
- C:\Users\Bean\Projects\small-giants-wp\.claude\plans\2026-10-12-clone-coverage-foundation.md: "Order (with the Indus build)", Phase 4 and "Sequencing with Indus"
- C:\Users\Bean\Projects\small-giants-wp\.claude\plans\2026-10-19-fr48-8-declared-values.md: how Fill reads declared values and keeps a confirm record (the states reader should extend it, not duplicate it)
- C:\Users\Bean\Projects\small-giants-wp\.claude\specs\48-CLONING-SYSTEM.md: grep to "### FR-48-81 ", "### FR-48-13 ", "### FR-48-46 " and "### FR-48-34 " (the requirements that already own part of the wave). Never read the file whole.
- The wave's gap entries: node scripts/computed-route/capabilities.mjs --gaps, the "states" section (71 entries today, among them the motion presets moved from step 4.0, such as nav-panel-item and state-burger-morph, and block-setting:motion:motion)
- The states rows in sites/indus-foods/build/intake/review.md (Missing features, gap:states)

SKILLS (invoke at the point of use)
- /autopilot first.
- /strategic-plan for the wave plan (this feature touches 3+ files, so write .claude/plans/2026-10-20-states-wave.md before building).
- /sgs-wp-engine when reading how SGS blocks hold state settings (css_state rows in block_attributes, the shared colour and shadow controls' hover state).
- /sgs-db for every framework DB question. Open it read-only; check a column exists before claiming a gap (FP-8).
- /wp-interactivity-api when a state is set by a block's view script (aria-expanded on a drawer toggle, a popover).
- /migration-method before the 4th file gets the same change.
- /qc-council at the close (three Sonnet raters: reader completeness, writer correctness, the planted-draft proof), then /handoff.

TOOLS

| Tool | Use for |
|---|---|
| python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "..." | which settings carry css_state and for which blocks |
| node scripts/computed-route/capabilities.mjs --gaps / --gate | the wave's gap list, and the closing gate |
| Playwright MCP, or the route's Chrome via scripts/parity/lib/devtools.mjs | forcing pseudo-states (CSS.forcePseudoState) on the draft and the live page |
| Context7 MCP | Chrome DevTools Protocol CSS domain docs (forcePseudoState, getMatchedStylesForNode) before relying on a call's shape |
| ListAgents and SendMessage | the serial queue |

TASKS, IN ORDER
1. Survey (~15 min, read-only). For each states-wave capability, record:
   - what the route already reads (intake's forced states, FR-48-34's defect pass, the inventory's surfaces)
   - what it writes (css_state='hover' settings are already calibrated and Fill-writable for colour and shadow)
   - what it checks (FR-48-46's state map)

   Most entries may already be covered end to end and only need their references recorded in data/clone-coverage.json. Split the list into covered-with-evidence, needs a reader, needs a writer and needs a check. Group by mechanism, not by label.
2. Plan (~15 min). Write .claude/plans/2026-10-20-states-wave.md with the survey table, the build steps, the files each step writes and FR-48-81's done-when as the closing proof. Point the coverage plan's Order item 4 at it. Present the plan to Bean as a short menu (each option with its benefit, drawback and your recommendation) only where a real choice exists. Otherwise proceed.
3. Build (after the gate above clears), reader by reader:
   - Every new rule gets a MUST FAIL test and a mutation check (C:\Users\Bean\AppData\Local\Temp\claude\scratch\mutate.mjs <route dir> <mutations.json> <test file>; write the JSON with the Write tool).
   - Record each covered entry's recognise, write and check references in data/clone-coverage.json.
   - If calibration's read list changes, say so in the plan: every site's cache becomes due, and the recalibration goes through the serial queue.
4. Proof (FR-48-81's done-when):
   - capabilities.mjs --gaps lists no states-wave entry, and --gate exits 0
   - a planted draft (as tests/motion-planted-draft.test.mjs and tests/css-planted-draft.test.mjs do) raises no seen-but-unsupported row, and raises it again with the writer removed
   - its live page pairs with the draft at 375, 768 and 1440 for that capability
5. Update docs: tick Order item 4 and set FR-48-81's Status. Update the Indus plan's step 20 needs line and its "What the drafts still need" states row (re-judged against the coverage map; no full intake run). Update LEDGER Front M.
6. Close: /qc-council, then /handoff. Delete this prompt file in the handoff commit.

GUARDRAILS
- Serial queue: deploys, DB reseeds, npm run build, local-indus refreshes, calibration runs and live-site writes run one at a time across sessions. Before each, ListAgents then SendMessage to every peer; after it lands, say so.
- Only sgs-update-v2.py writes the framework DB, reseeded from a clean HEAD worktree. Every other script opens it read-only (FP-1). No hand-written block or property lists in code.
- In scripts/computed-route, node lint.mjs, node capabilities.mjs --gate and node --test tests/*.test.mjs all pass. fill-entrance is timing-sensitive under load, so re-run it alone before calling it a failure. Also run python scripts/check-no-client-names.py --check. Regenerate the gaps report only with node scripts/computed-route/capabilities.mjs --gaps > .claude/reports/2026-10-17-clone-coverage-gaps.md.
- Files: JavaScript files stay under 400 lines (fill-resolve.mjs is at the limit, so new code goes in a new module).
- Shared worktree: use explicit pathspecs only, never stash, and commit straight to main. If a shared doc holds another session's uncommitted edit, stage only your lines, then check git show HEAD -- <file>.
