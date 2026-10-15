Invoke /autopilot before doing anything else.

TRACK: Spec 38A build, session S4 Track I (inspector): M3.2, M3.3, M3.8, M3.12, then M3.4, M3.5, M3.6, then M3.7, M3.9, then M3.10, M3.11. One of four parallel S4 sessions (Tracks I, S, E, L).

CONTEXT Spec 38A (`.claude/specs/38A-SGS-MOTION-MODEL.md`) replaces SGS's scattered hover, entrance and effect systems with one motion model stored in one block attribute, `sgsMotion`. Build plan: `.claude/plans/2026-10-12-spec38a-motion-build.md`. Sessions S1 to S3b are done (landed units in `plugins/sgs-blocks/scripts/data/motion-units-landed.json`). Motion plays on live pages; effect stylesheets resolve by the `assets/css/fx-<effect>.css` convention (M3.W); every effect has its `fx_effects` row and the rotate schema rows exist (M3.1); the migration core `wp sgs motion-migrate` exists (M6.1). Track I builds the three inspector panels (Hover, Entrance and reveal, Effects) and the editor-canvas preview, so a client sets motion without code.

GATE CHECK FIRST: read `.claude/LEDGER.md` Front M. If it does not say Gate 4 passed, stop and tell Bean (plan pre-emptive decision 17).

READ FIRST
- Build plan: Session plan (S4 row); Reconciliations R1 (panels built once in M3); Risk-driven amendments, Plan-wide rules (one owner per hot file per wave) and the Per unit bullets for M3.2 to M3.12 (M3.12's bullet carries the edit-markup classes from the M2.1b review and the editor-iframe enqueue of effect stylesheets deferred from M3.W); Gates table, GATE 5.
- `.claude/reports/2026-10-12-spec38a-unit-map-m3-m6.md` units M3.*.
- Spec 38A §5, §11, FR-38A-4, 7 to 13, 28 to 30, 46 status lines; `.claude/rules/block-editor-controls.md`; Spec 35.
- `.claude/rules/motion-qa.md` (canary fixture pages 2103, 2109, 2113, 2603, 2740, 3037, 5223, 5226, 5229 are never deleted or repurposed).

HOT FILES THIS TRACK OWNS IN WAVES 12 TO 14: `scripts/data/motion-presets.json`, `src/blocks/extensions/generated-fx-effect-meta.json`, `src/blocks/extensions/extension-roster.json`. Other tracks send their changes to you by SendMessage; you send yours for `schemas/motion.schema.json`, `scripts/seed-motion-fx-registry.py` and `scripts/behavioural-analyser/css-property-classifications.json` to Track E. A missing schema or preset row for an effect is a defect sent back to M3.1's owner (this track, since S3b has closed).

CROSS-TRACK WAITS
- Track S's M4.5 (nav drawer) waits for your M3.5: SendMessage Track S the commit hash when M3.5 lands.
- Your M3.6 (Effects panel) reads the effect layers M5.1 emits (Track E); start M3.6 after Track E reports Gate 4b passed.
- M3.10 waits for Track L's M5.12, M5.13 and M5.15.

M3.4 TIMING (Bean decided 2026-10-13): one duration, delay and easing per state change drives every property that changes in it, movement and paint alike; there is no separate colour-and-shadow timing row. M3.4 adds the named reader that puts the colour, background, border and box-shadow owners into the state's one `transition` list (build plan, M3.4 bullet). FOCUS (Bean approved 2026-10-15): build the form-field Focus state exactly as the build plan's M3.4 bullet states (form fields only, named Focus after the form block's existing Focus ring controls, one timing, on the CPT-saved form); keyboard focus on every other block already plays its hover state.

HOW TO RUN Subagent-driven units (/subagent-driven-development): one implementer per unit at the model the unit table names, then an Opus review; at most three heavy subagents at once. The main thread does every git operation, build, reseed and deploy, reads every diff, reruns each unit's tests and planted faults, and fact-checks every subagent claim against the files. Subagents never commit. Gate 5 needs Bean (about 10 minutes in the editor): ask once M3.7 and M3.9 are done.

GUARDRAILS
- Serial queue: before any reseed or deploy, ListAgents, message every active peer, and wait for replies (plan decision 7). Reseeds run from a throwaway worktree at `origin/main` (decision 8).
- `python plugins/sgs-blocks/scripts/run-gates.py --tier fast` exits 0 before every code push; gate output to a file, read in full.
- Merge (not rebase) `origin/main` into `main` before pushing; push promptly; explicit pathspecs with `git branch --show-current` in the same command; never stash; never link `node_modules` into a worktree.
- `build-deploy.py` exits 0 even on `[ABORTED]` or `[DEPLOYED-BUT-MOTION-REGRESSED]`: grep its log for `[DONE]` and `motion-qa] PASS`.
- No new direct import of `generated-motion-defs.json`; never raise `TARBALL_MAX_MB`; no inline `style=""` (`audit-inline-styling.js --check`).
- MEMORY.md is at its cap: merge any lesson into an existing memory file.
- Update each FR's status line as its unit lands; `/qc-council` on the session's work, then `/handoff`.
