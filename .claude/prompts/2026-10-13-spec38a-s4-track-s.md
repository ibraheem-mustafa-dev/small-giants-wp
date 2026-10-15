Invoke /autopilot before doing anything else.

TRACK: Spec 38A build, session S4 Track S (stagger and nav motion): M4.1, M4.4, then M4.3, M6.2, M6.4, then M4.2, M4.5, then M4.6, then M5.17. One of four parallel S4 sessions (Tracks I, S, E, L).

CONTEXT Spec 38A (`.claude/specs/38A-SGS-MOTION-MODEL.md`) replaces SGS's scattered hover, entrance and effect systems with one motion model stored in one block attribute, `sgsMotion`. Build plan: `.claude/plans/2026-10-12-spec38a-motion-build.md`. Sessions S1 to S3b are done (landed units in `plugins/sgs-blocks/scripts/data/motion-units-landed.json`). The JS stagger function exists (`src/components/motion/stagger-delays.js`, M1.8b); the old runtime stagger is frozen as `tests/fixtures/motion/legacy-stagger-offset.json` (M2.4); the migration core `wp sgs motion-migrate` and its mapper interface exist (M6.1, `includes/motion/migrate/`). Track S builds the server-side stagger, the `open` and `state` triggers, two migration mappers, and moves the nav drawer, submenus and mega panels onto the Entrance model.

GATE CHECK FIRST: read `.claude/LEDGER.md` Front M. If it does not say Gate 4 passed, stop and tell Bean (plan pre-emptive decision 17).

READ FIRST
- Build plan: Session plan (S4 row); Reconciliation R3 (one stagger function; M4.1 builds the PHP mirror and parity test, not `compute-delays.js`); Risk-driven amendments and the Per unit bullets for M4.1 to M4.6, M6.2, M6.4, M5.17; plan decision 10 (mapper family = file suffix); Gates table, GATE 5b; Risk register row 1 (post types).
- `.claude/reports/2026-10-12-spec38a-unit-map-m3-m6.md` units M4.*, M6.2, M6.4, M5.17; `.claude/reports/2026-09-24-u5-motion-design.md`.
- Spec 38A §8, §13, FR-38A-24 to 26, 31, 32, 51, 53 status lines; `.claude/rules/migration-scripts.md`; the migration-method skill.
- `.claude/rules/motion-qa.md` (canary fixture pages are never deleted or repurposed).

HOT FILES: this track owns none in waves 12 to 14. Send schema, preset, seeder or classifier changes to their owner by SendMessage: `schemas/motion.schema.json`, `scripts/seed-motion-fx-registry.py` and `css-property-classifications.json` to Track E; `scripts/data/motion-presets.json`, `generated-fx-effect-meta.json` and `extension-roster.json` to Track I.

CROSS-TRACK WAITS
- M4.5 (nav drawer, reseed and deploy) waits for Track I's M3.5 (Entrance panel): start M4.5 when Track I messages the M3.5 commit hash.
- M5.17 waits for your own M4.4 and M4.6.

FORM STATES (Bean approved 2026-10-15): build M4.4's `open` and `state` triggers and the form states (`invalid`, `step-changed`, `success` on `sgs/form` and `step-changed` on `sgs/choice-flow`) per the build plan's M4.4 and M5.17 bullet, matching the framework's existing state pattern, with the acceptance on a page linking a saved `sgs_form` post and a saved `sgs_choice_flow` post (Specs 42 and 43); M5.17 also builds the cart pop, burger morph and accordion turn.

HOW TO RUN Subagent-driven units (/subagent-driven-development): one implementer per unit at the model the unit table names, then an Opus review; at most three heavy subagents at once. The main thread does every git operation, build, reseed and deploy, reads every diff, reruns each unit's tests and planted faults, and fact-checks every subagent claim against the files. Subagents never commit. M4.5 deploys to sandybrown; M4.6 deploys indus-test (named explicitly). Gate 5b needs a Bean glance at the drawer on indus-test.

GUARDRAILS
- Serial queue: before any reseed or deploy, ListAgents, message every active peer, and wait for replies (plan decision 7). Reseeds run from a throwaway worktree at `origin/main` (decision 8).
- `python plugins/sgs-blocks/scripts/run-gates.py --tier fast` exits 0 before every code push; gate output to a file, read in full.
- Merge (not rebase) `origin/main` into `main` before pushing; push promptly; explicit pathspecs with `git branch --show-current` in the same command; never stash; never link `node_modules` into a worktree.
- `build-deploy.py` exits 0 even on `[ABORTED]` or `[DEPLOYED-BUT-MOTION-REGRESSED]`: grep its log for `[DONE]` and `motion-qa] PASS`.
- No legacy fallback in a migrated render.php (R-31-14); no inline `style=""`; no new direct import of `generated-motion-defs.json`; never raise `TARBALL_MAX_MB`.
- MEMORY.md is at its cap: merge any lesson into an existing memory file.
- Update each FR's status line as its unit lands; `/qc-council` on the session's work, then `/handoff`.
