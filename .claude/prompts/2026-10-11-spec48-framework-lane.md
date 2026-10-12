Invoke /autopilot before doing anything else.

TRACK: Spec 48 Indus build, framework lane (session B). Appendix B steps 9, 10, 11, then 12.

CONTEXT
`.claude/plans/2026-10-11-spec48-indus-build.md` turns Spec 48 Appendix B (the Indus critical path) into phases run in
three lanes. You own the framework lane: the Spec 32 framework halves Indus needs. Session A runs the route and mirror
lanes (`scripts/computed-route/`, `scripts/local-wp/`) at the same time; session C runs intake. Your files are under
`theme/` and `plugins/`; theirs are not.

READ FIRST
- `.claude/plans/2026-10-11-spec48-indus-build.md`: "Orchestration" (lanes, serial queue, model and QC table) and Phase 2.
- `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md`: FR-32-14, FR-32-15, FR-32-20 and §14.2 (grep; do not read whole).
- Spec 48 Appendix B "The framework refresh loop".

TASKS (in sequence; grep each step's target files before starting it, and run two side by side only if the grep proves
their written files disjoint)
1. Step 9, FR-32-14 palette slugs (Sonnet subagent, main-thread QC). A migration across every snapshot: invoke the
   migration-method skill first (detector, dry run per client, fix, check, self-test with a negative control).
   Every snapshot is migrated, `sites/mamas-munches/theme-snapshot.json` included (Bean, 2026-10-11: the five slugs
   take the colours that site already shows, so nothing changes visually); confirm with `ListAgents` that no other
   session is editing that file before writing it.
2. Step 10, FR-32-15 per-tier section padding and gutter tokens (Opus). Same snapshot rule as step 9.
3. Step 11, FR-32-20 `sgsCustomCss` hardening (Opus; security-relevant: parse and scope, never string-replace).
4. Step 12, the framework refresh loop once for 9 to 11 (Sonnet), through the serial queue below.
Close each step on its FR's done-when, including every negative control. Commit and push after each step with an
explicit pathspec, `git branch --show-current` in the same command. Mark the step done in the plan's Phase 2.

FENCES
- Do not edit anything under `scripts/computed-route/` or `scripts/local-wp/`.
- Serial queue: deploys, DB reseeds, `local-indus` mirror refreshes and calibration runs run one at a time across all
  sessions. Before each: `ListAgents`, then `SendMessage` to every active peer naming the operation; after it lands,
  say so. Step 12 is all four of those.

GUARDRAILS
- `python scripts/check-spec-id-landing.py` and its `--self-test` stay green; `node --test
  "scripts/computed-route/tests/*.test.mjs"`: only the 3 known `lint.test.mjs` brandName failures.
- Run `npm ci` in `scripts/computed-route` (from PowerShell) before the route tests or step 12's recalibration.
- Deploy only with `build-deploy.py --target indus-test`; never `--allow-dirty` or `--skip-verify`.
- Close with /handoff.
