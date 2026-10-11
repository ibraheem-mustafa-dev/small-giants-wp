Invoke /autopilot before doing anything else.

TRACK: Spec 48 Indus build, intake lane (session C). Appendix B steps 13 (intake 4a) then 14 (intake 4b).

CONTEXT
`.claude/plans/2026-10-11-spec48-indus-build.md` turns Spec 48 Appendix B (the Indus critical path) into phases run in
three lanes. You own the intake lane, the longest one and the critical path. Session A runs the route lane in the same
folder (`scripts/computed-route/`: calibration, cache, resolver files) and session B the framework lane (`theme/`,
`plugins/`). Start only once Appendix B step 3 (the route's own pinned `package.json`) is on `origin/main`: check
`git log --oneline -5 -- scripts/computed-route/package.json`.

READ FIRST
- `.claude/plans/2026-10-11-spec48-indus-build.md`: "Orchestration" and Phase 3.
- `.claude/specs/48-CLONING-SYSTEM.md`: §1, §8 (FR-48-17), §9 (all intake FRs), §3.4 (skeleton inventory and proposal),
  Appendix C (record formats). Grep to each section; the file is about 2,400 lines.
- `.claude/specs/48A-CLAUDE-DESIGN-HANDOFF-FOLDER.md` and `sites/indus-foods/handoff/README.md`.
- `.claude/reports/2026-10-11-spec48-gap-council/DESIGN.md`.

TASKS
1. Step 13, intake 4a (Opus subagents, main-thread QC): the sandbox with the record-and-replay cache (FR-48-23), the
   determinism harness in both modes (FR-48-28), the manifest re-check, the census with its static and runtime passes,
   `construct-registry.json` and its five controls (FR-48-24), and the Appendix C schemas for the reading record, the
   registry and the baseline. Split 13 into sub-tasks whose written files do not overlap before running any in parallel.
2. Step 14, intake 4b (Opus): the three routing adapters (FR-48-26), the width basis (FR-48-27), the page map
   (FR-48-30), `lib/tokens.mjs` and the palette proposal (FR-48-31), the Site Info proposal (FR-48-32), flags, draft
   defects and missing features (FR-48-33, FR-48-34), the skeleton inventory and proposal (§3.4), `review.md` and
   `intake.mjs --apply-review` (FR-48-17), the intake and page-map schemas.
Close each piece on its FR's done-when with its must-fail case. Commit and push after each piece with an explicit
pathspec, `git branch --show-current` in the same command. Mark progress in the plan's Phase 3. Step 15 (the intake
run and Bean's review) waits for session A's step 8.

FENCES
- Write new files (`intake.mjs`, `lib/intake-*.mjs`, `lib/tokens.mjs`, `data/*.schema.json`, their tests). Do not edit
  `package.json` or `package-lock.json` (send any new dependency to session A by `SendMessage`), the calibration files
  (`calibrate.mjs`, `lib/calibrate*.mjs`, `lib/cache.mjs`), `lib/resolve.mjs` or `lint.mjs`. Edit only your own rows of
  `scripts/computed-route/README.md`.
- Serial queue: deploys, DB reseeds, `local-indus` mirror refreshes and calibration runs run one at a time across all
  sessions; `ListAgents` then `SendMessage` peers before each. Intake reads the export locally, so you should need none.

GUARDRAILS
- `python scripts/check-spec-id-landing.py` and its `--self-test` stay green; `node --test
  "scripts/computed-route/tests/*.test.mjs"`: only the 3 known `lint.test.mjs` brandName failures.
- Never edit any file in `sites/indus-foods/handoff/` (FR-48A-1: the export stays unchanged).
- Close with /handoff.
