Invoke /autopilot before doing anything else.

GOAL
Delete the old cloning pipeline code (the "converter") from the repo. Bean ruled on 2026-10-09 that Spec 47's computed route
(scripts/computed-route/) replaced it, so it is deleted, not archived (git history keeps it). Nothing in it is edited to
chase spec renames. This prompt file is single-use: delete it (git rm) when the work is done.

CONTEXT
SGS is a WordPress block framework (repo c:\Users\Bean\Projects\small-giants-wp). The old converter is about 8 MB and over
360 tracked files under plugins/sgs-blocks/scripts/. It is NOT a one-command delete: live tooling still touches it, and a
broken gate blocks every other session's commits. Cut each wire in the same commit as the delete it frees.

Scope and the live wire to cut first (verify each; "no caller" is a question, not a verdict, per
plugins/sgs-blocks/scripts/audit-script-reachability.py):
- converter/ (198 files): package.json check:preset-absence-no-slug-literal; coverage-matrix/db_queries.py imports
  converter.services.has_inner; db-consistency/check_role_resolution_guess.py and resolver_bridge.py import
  converter.db.db_lookup and converter.resolvers; behavioural-analyser/assign-canonical.py mentions db_lookup;
  check-converter-destination-shape.py; gates.json entries.
- recogniser/ (40 files): sgs-update-v2.py seeds block_render_repeaters through render_repeater_seeder.py; only the
  converter reads those tables.
- orchestrator/ (81 files) and sgs-clone-orchestrator.py: orchestrator/upload_and_patch.py calls sync-business-info.py;
  push-theme-snapshot.py is the live replacement. Confirm nothing else calls upload_and_patch.py.
- oracle/ (20 files): oracle/provision_fixture_canaries.py; check no live gate runs it.
- cheat-gate/ and excluded-gate/ (24 files): package.json check:cheats and check:excluded; check gates.json and run-gates.py.
- parity/computed-parity.js and parity/fixtures/: only the old orchestrator's Stage 11.6 calls it; scripts/check-no-client-names.py
  whitelists its path.
- seed-render-composition.py, seed-render-singletons.py, test_render_singleton_seeder.py: sgs-update-v2.py Stage 1 runs them;
  the block_render_* tables are read only by the converter.
KEEP (live): scripts/computed-route/ (repo root), plugins/sgs-blocks/scripts/parity/draft-live-walk.mjs, parity/lib/,
parity/GAP-CHECKLIST.md, theme-extractor/, push-theme-snapshot.py, derive-dark-palette.py, sync-business-info.py, business_info/.

Bean's decisions (2026-10-09): the block_render_* tables, their seeders and DB schema go with the removal. The old motion
recognition (CSS-shape guessing of sgsAnimation presets) is dropped; Spec 47 section 3.6 already logs "detect a JS motion
library or WebGL canvas in a draft and report it" as not built.

READ FIRST
- .claude/rules/framework-principles.md (R-31-n rules, still binding)
- plugins/sgs-blocks/scripts/audit-script-reachability.py --help
- .claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md section 3.6 (what the route still owes)

TASKS, IN ORDER
1. Prove no live reader for each directory: git grep its names from gates.json, run-gates.py, package.json,
   build-deploy.py, sgs-update-v2.py, .claude/hooks/, ~/.claude/skills/*, hooks and PHP. Write the proof per directory in the
   commit messages. Delegate the read-only greps to a Sonnet subagent (/delegate). Done when every row lists its wires or
   "none". About 15 min.
2. Per directory, one commit: cut its wires (package.json scripts, gates.json entries, the sgs-update-v2.py stage,
   db-consistency checks, tests, pytest.ini entries), delete the directory, run `cd plugins/sgs-blocks && npm run gate:full`
   (from PowerShell; the nvm shim is broken in Git Bash), run the reachability audit before and after; green before each push.
   Order: oracle, cheat-gate and excluded-gate, orchestrator + sgs-clone-orchestrator.py + computed-parity, recogniser,
   converter last. Dispatch one Sonnet implementer per directory, sequentially (gates.json and package.json collide in
   parallel); the main thread reads every diff. About 15 min each.
3. Seeders and DB: remove the three seeders and the block_render_* tables and schema, then reseed the framework DB from a CLEAN
   HEAD (never a dirty tree; another session may hold the reseed, so message it with ListAgents/SendMessage first) and diff the
   role map and table list against the previous seed. About 20 min.
4. Retire the `sgs-clone` skill (~/.claude/skills/sgs-clone, 390+ lines driving sgs-clone-orchestrator.py, orchestrator/, converter/ and
   computed-parity.js; its pinned spec Spec 31 is gone) in the SAME commit that deletes those scripts, so no session invokes a skill whose
   scripts are gone; show Bean the diff first (his rule for ~/.claude/). Replace it with a thin skill or a sgs-wp-engine section that
   drives Spec 47's computed route (scripts/computed-route/README.md: Solve, Fill, walker). Its /ui-ux-pro-max draft-authoring contract
   stays valid. Also drop converter/ and sgs-clone-orchestrator.py from sgs-wp-engine SKILL.md (~line 89) and CLAUDE.md (~line 107).
5. Tidy: remove the converter lines from .claude/LEDGER.md (Summary, Front S, the two old-converter entries under Known failing
   tests) and .claude/architecture.md (remaining "converter" mentions); regenerate .claude/catalogues/ with
   python plugins/sgs-blocks/scripts/generate-tooling-catalogue.py; git rm this prompt file.

GUARDRAILS
Never --no-verify or --allow-dirty. Never git add -A or a glob; never stash. Commit to main with explicit paths and
`git branch --show-current` in the same command. Other sessions share this worktree and have uncommitted edits (Eye Care trees,
icon blocks): git diff each file before staging. Verify at the end: gate:full green;
python .claude/hooks/handoff-preflight.py --check 5 of 5; node scripts/computed-route/lint.mjs --surfaces
sites/eye-care-ward-end/build/surfaces.json unchanged; then /handoff.
