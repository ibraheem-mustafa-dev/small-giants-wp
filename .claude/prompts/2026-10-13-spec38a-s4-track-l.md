Invoke /autopilot before doing anything else.

TRACK: Spec 38A build, session S4 Track L (loops and remaining effects): M5.8, then M5.12, M5.16a, M5.16b, M5.16c, M6.3, then M5.13, M5.14, M5.15. One of four parallel S4 sessions (Tracks I, S, E, L).

CONTEXT Spec 38A (`.claude/specs/38A-SGS-MOTION-MODEL.md`) replaces SGS's scattered hover, entrance and effect systems with one motion model stored in one block attribute, `sgsMotion`. Build plan: `.claude/plans/2026-10-12-spec38a-motion-build.md`. Sessions S1 to S3b are done (landed units in `plugins/sgs-blocks/scripts/data/motion-units-landed.json`). Effect stylesheets resolve by the `assets/css/fx-<effect>.css` convention and webpack globs `src/shared/effects/fx-*.js` (M3.W), so a new effect needs only its own files; every effect has its `fx_effects` row (M3.1); the shared scroll driver `@sgs/scroll-driver` exists (M2.5); the migration core and mapper interface exist (M6.1). Track L builds scroll progress, the shared loop control, Tier G parameters, the hover mapper, and the looping-media, Lottie and marquee effects.

GATE CHECK FIRST: read `.claude/LEDGER.md` Front M. If it does not say Gate 4 passed, stop and tell Bean (plan pre-emptive decision 17).

READ FIRST
- Build plan: Session plan (S4 row); Risk-driven amendments and the Per unit bullets for M5.8, M5.12 to M5.16c, M6.3; plan decision 10 (mapper family = file suffix); Bean decision 2 = A (M6.3 gains the `icon` mapper family; the icon motion files join removal group G4).
- `.claude/reports/2026-10-12-spec38a-unit-map-m3-m6.md` units M5.8, M5.12 to M5.16c, M6.3; `.claude/reports/2026-10-12-motion-effects-audit.md`.
- Spec 38A §5.3, §10, §13, Appendix A, FR-38A-11, 22, 31, 32, 36, 37, 44, 50, 52 status lines; `.claude/rules/migration-scripts.md`.
- `.claude/rules/motion-qa.md` (canary fixture pages are never deleted or repurposed).

HOT FILES: this track owns none in waves 12 to 14. Send schema, seeder or classifier changes to Track E and preset, effect-meta or extension-roster changes to Track I by SendMessage. Schema and preset rows for these effects were written in M3.1; a missing row is a defect, not something this track adds.

CROSS-TRACK WAITS
- M5.8 starts at once; when it lands, SendMessage Track E its commit hash (Track E's M5.5 reads its counter output and M5.Z needs it).
- M5.12, M5.16a, M5.16b, M5.16c and M6.3 wait for Track E's M5.1 (Gate 4b). M5.16a and M5.16b also need Track I's M3.8 (custom curves reach Tier G tweens).
- M5.13, M5.14 and M5.15 wait for your M5.12; M5.14 also waits for your M5.16b. When M5.12, M5.13 and M5.15 land, SendMessage Track I (its M3.10 waits on them).

HOW TO RUN Subagent-driven units (/subagent-driven-development): one implementer per unit at the model the unit table names (M5.16c on Haiku), then an Opus review; at most three heavy subagents at once. The main thread does every git operation, build, reseed and deploy, reads every diff, reruns each unit's tests and planted faults, and fact-checks every subagent claim against the files. Subagents never commit.

GUARDRAILS
- Serial queue: before any reseed or deploy, ListAgents, message every active peer, and wait for replies (plan decision 7). Reseeds run from a throwaway worktree at `origin/main` (decision 8).
- `python plugins/sgs-blocks/scripts/run-gates.py --tier fast` exits 0 before every code push; gate output to a file, read in full.
- Merge (not rebase) `origin/main` into `main` before pushing; push promptly; explicit pathspecs with `git branch --show-current` in the same command; never stash; never link `node_modules` into a worktree.
- `build-deploy.py` exits 0 even on `[ABORTED]` or `[DEPLOYED-BUT-MOTION-REGRESSED]`: grep its log for `[DONE]` and `motion-qa] PASS`. A live probe added to PROBES runs inside build-deploy.py's worktree: no gitignored secrets, no `scripts/computed-route/node_modules`.
- Auto-moving content keeps the shared pause control as an option, off by default, with keyboard-focus pause always on (WCAG 2.2.2); a marquee or loop that cannot run shows all its content.
- No legacy fallback (R-31-14); no inline `style=""`; no new direct import of `generated-motion-defs.json`; never raise `TARBALL_MAX_MB`.
- MEMORY.md is at its cap: merge any lesson into an existing memory file.
- Update each FR's status line as its unit lands; `/qc-council` on the session's work, then `/handoff`.
