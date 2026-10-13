Invoke /autopilot before doing anything else.

TRACK: Spec 38A build, session S4 Track E (effects): M5.1, M5.2, M5.3, M3.1c (X and Y angles in multi-keyframe entrances; build plan rotate bullet), then M5.4, M5.5 (with M5.3's commit), M5.6, M5.7, M5.9, M5.10, M5.11, then M5.Z. One of four parallel S4 sessions (Tracks I, S, E, L); this is the longest track (about 2.5 h) and other tracks wait on its M5.1.

CONTEXT Spec 38A (`.claude/specs/38A-SGS-MOTION-MODEL.md`) replaces SGS's scattered hover, entrance and effect systems with one motion model stored in one block attribute, `sgsMotion`. Build plan: `.claude/plans/2026-10-12-spec38a-motion-build.md`. Sessions S1 to S3b are done (landed units in `plugins/sgs-blocks/scripts/data/motion-units-landed.json`). Effect stylesheets resolve by the `assets/css/fx-<effect>.css` convention and webpack globs `src/shared/effects/fx-*.js` (M3.W), so a new effect needs only its own files; all 31 effects have `fx_effects` rows, and the modular Rotate (`transform` composed per axis from entrance, hover-state and Follow-pointer owners, self perspective) is in the schema, `motion.css` and the renderer (M3.1). Track E emits effect layers onto any part (`data-sgs-fx`) and folds each effect into the model.

GATE CHECK FIRST: read `.claude/LEDGER.md` Front M. If it does not say Gate 4 passed, stop and tell Bean (plan pre-emptive decision 17).

READ FIRST
- Build plan: Session plan (S4 row); Reconciliation R2 (stacked effects close in M5.Z); Risk-driven amendments and the Per unit bullets for M5.1 to M5.11 and M5.Z, including the M3.1 and M5.6 rotate bullet (M5.6 replaces `assets/js/tilt-3d.js` with a custom-property pointer writer and rewords FR-38A-50's style-attribute clause with Bean's agreement, or writes through a constructed stylesheet; parent perspective stays refused until a real-Safari check); Gates table, GATE 4b and GATE 6.
- `.claude/reports/2026-10-12-spec38a-unit-map-m3-m6.md` units M5.*; `.claude/reports/2026-10-12-motion-effects-audit.md`.
- Spec 38A §5.3, §5.4, §10, Appendix A, FR-38A-5, 22, 34 to 45, 47 to 50 status lines.
- `.claude/rules/motion-qa.md` (canary fixture pages are never deleted or repurposed; page 2113 is the morph fixture).
- The rotate council kit at `plugins/sgs-blocks/tests/fixtures/motion/rotate-council/` (`rotate.md` §7 holds the expected matrices).

M5.7 ACCEPTANCE CASE (Indus home batch 5 waits on it; Bean approved 2026-10-13): the parallax effect replaces `sgs/hero`'s `splitMediaParallax` (today a fixed `scroll(root)` keyframe of translateY −16px to 16px over the whole page, `hero/style.css::.sgs-hero__media--parallax`). Indus intake record J-14 (`[data-hero-img]`, `updateHeader`): with the page-scroll basis the speed ratio multiplies scrolled pixels, so ratio −0.06 gives `translate: 0 round(scrollY × −0.06)px` (the image drifts up), not a share of the 0-to-1 progress. The scroll driver therefore also exposes the scrolled distance for this basis (or the effect reads it); the optional clamp bounds it; reduced motion leaves the image at rest. The split media part is the effect's target part, so the hero's split media gets the shared Effects-panel parallax control, not a hero-only setting. Prove it on a canary fixture with a probe at 1440, 768 and 375 (measured translate at three scroll depths equals the ratio times scrollY, within 1px), with a negative control, then record the commit hash in `.claude/LEDGER.md` Front H (the Indus build, `plans/2026-10-11-spec48-indus-build.md` batch 5) and SendMessage it to any active Indus session.

HOT FILES THIS TRACK OWNS IN WAVES 12 TO 14: `schemas/motion.schema.json`, `scripts/seed-motion-fx-registry.py`, `scripts/behavioural-analyser/css-property-classifications.json`. Other tracks send their changes to you by SendMessage; you send yours for `scripts/data/motion-presets.json`, `generated-fx-effect-meta.json` and `extension-roster.json` to Track I. A seeder or schema edit is reseed-class: commit and push it with every regenerated artefact in one commit, tell peers, then reseed in the serial queue.

CROSS-TRACK WAITS
- When M5.1 passes Gate 4b, SendMessage Tracks I and L at once: Track I's M3.6 and Track L's M6.3, M5.12 and M5.16a/b/c wait on it.
- M5.5 commits with M5.3 and reads Track L's M5.8 counter output: wait for Track L's M5.8 commit hash.
- M5.Z waits for your own M5.4 to M5.11 and Track L's M5.8.

HOW TO RUN Subagent-driven units (/subagent-driven-development): one implementer per unit at the model the unit table names, then an Opus review; at most three heavy subagents at once. The main thread does every git operation, build, reseed and deploy, reads every diff, reruns each unit's tests and planted faults, and fact-checks every subagent claim against the files. Subagents never commit.

GUARDRAILS
- Serial queue: before any reseed or deploy, ListAgents, message every active peer, and wait for replies (plan decision 7). Reseeds run from a throwaway worktree at `origin/main` (decision 8).
- `python plugins/sgs-blocks/scripts/run-gates.py --tier fast` exits 0 before every code push; gate output to a file, read in full.
- Merge (not rebase) `origin/main` into `main` before pushing; push promptly; explicit pathspecs with `git branch --show-current` in the same command; never stash; never link `node_modules` into a worktree.
- `build-deploy.py` exits 0 even on `[ABORTED]` or `[DEPLOYED-BUT-MOTION-REGRESSED]`: grep its log for `[DONE]` and `motion-qa] PASS`. A live probe added to PROBES runs inside build-deploy.py's worktree: no gitignored secrets, no `scripts/computed-route/node_modules`.
- Budget: < 100 KB CSS and < 50 KB JS per page; no inline `style=""` except custom properties written by a runtime script where FR-38A-47 requires it; no new direct import of `generated-motion-defs.json`; never raise `TARBALL_MAX_MB`.
- MEMORY.md is at its cap: merge any lesson into an existing memory file.
- Update each FR's status line as its unit lands; `/qc-council` on the session's work, then `/handoff`.
