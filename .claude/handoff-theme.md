# Session Handoff — 2026-06-05 (SGS THEME thread, session 16 — Spec 27 reconciled to v5 + D-wave (D176/D177/D179) + Spec 28 P1 value-ladder SHIPPED + /sgs-update + a 6-persona adversarial-council + verifier fact-check → a fact-checked must-fix backlog + doc-drift fixes)

> Theme/blocks thread. Cloning → `.claude/handoff.md`. Next → `.claude/next-session-prompt-theme.md`. **Decisions ALL committed this session: D176 + D177 (`535942f1`) + D179 Spec 28 P1 (`cd898a11`) — the session-15 "deferred D176/D177" Known Issue is RESOLVED.** Cloning thread co-active (took D178, `convert.py` lift fixes); commit by EXPLICIT PATH (`git commit -- <paths>` — a bare commit swept in co-active staged files once this session; lesson `git-commit-must-be-path-scoped-with-coactive-sessions`).

## Completed This Session (session 16)
1. **Spec 27 reconciled to v5 + Phase-2 plan marked COMPLETE** (`53532c0d`; doc-drift follow-ups this session). Verified every FR-27 "SHIPPED" marker vs real code/commits via a verification agent + fact-check; documented the COURSE-CHANGE (authoring R1/R2/R3 + PREFLIGHT pulled forward from "Phase R roadmap" into Cluster C); corrected the FALSE "mandatory image-sitemap" clause → DESCOPED; only R4/R5/F2 (Cluster D) remain unbuilt.
2. **D-wave recorded** (`535942f1` D176/D177 + state.md; `cd898a11` D179). D176 = R1 controller; D177 = Phase 2 COMPLETE (R2/R3/PREFLIGHT + QA-AUTHORING + R-22-13); D179 = Spec 28 P1 value-ladder shipped.
3. **Spec 28 P1 comparative value-ladder SHIPPED** (foundation `49d63ab8`, ship `e0dea916`, spec P1-row `b2d04c47`; product-card v1.13.0). SSR per-pack ladder on Bound `sgs/product-card`: per-unit price + Rule-of-100 saving + "Best value" badge; monotonicity guard (96-pack £0.62 suppressed vs 48-pack £0.51 → badge on the 48-pack); KJC-A anchor + KJC-B SSR-not-seeded (lean-seed held byte-identical 22408B); two pure helpers `sgs_saving_display`/`sgs_value_ladder`. Live-verified canary 540. Step-2 unit gate caught + fixed a 29%→28% float-floor bug; live QA caught + fixed a WCAG contrast fail (saving text 2.25:1 pink-on-cream → 15.71:1 near-black). Only Steps 5∥6 (CSS∥JS) parallelised; the render.php chain was a single sequential implementer.
4. **/sgs-update** ran clean: 5 new attrs registered, block-reference 191 blocks / 2744 attrs, uimax synced (191 SGS blocks), 0 orphans.
5. **6-persona adversarial-council + a verifier fact-check on the shipped Cluster C + Spec 28 P1 + docs.** Convergent headline (4 personas): the value-ladder shipped with NO authoring UI (savings silent by default; legal liability when a dev sets the anchor). Other must-fixes: PREFLIGHT publish-block invisible in the block editor; a live £0 Store-API bypass; two UK consumer-law items (fabricated reference price; "Best value" on a non-cheapest decoy pack). The fact-check REFUTED 2 council claims (unmanaged-stock cap; discount-label-as-code-bug). **Full FACT-CHECKED ~20-item backlog → parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE`.** Grades: Security B+/B, Doc-accuracy B+, Maintenance C+, Strategy C+, Operability D+, Legal D.
6. **Doc-drift fixes** (Spec-Lawyer-found, fact-checked): Spec 27 `spec_version` 4→5; `sgs/trust-bar` DRAFT→SHIPPED (`d6358f32`, both feature-map row + FR-24-10 body); Phase D/E "uncommitted"→`c68b8cb6`; the next-session-prompt FIRST JOB (D176/D177 already committed) + creds path (`.claude/secrets/`, NOT repo-root) corrected; the git-commit-path-scoped + council-is-a-hypothesis STOPs added.

## Current State
- **Branch:** `main` at/after `cd898a11` (theme commits this session: `53532c0d` spec-reconcile, `535942f1` D-wave, `49d63ab8`/`e0dea916`/`b2d04c47` Spec 28 P1, `cd898a11` D179, + this session's doc-drift/parking/handoff commit). All pushed, all path-scoped.
- **Tests:** `php -l` + WPCS clean on all touched files; Spec 28 P1 helper unit gate + live canary QA PASS.
- **Uncommitted (NOT mine):** the cloning thread's `convert.py`/`next-session-prompt.md` + the never-commit artefacts.

## Outcome vs Completion (Gate 3.5)
**OUTCOME ACHIEVED** — Spec 27 is accurate to real code (v5), the D-wave is recorded, Spec 28 P1 is shipped + live-verified (with a real float bug + a real WCAG fail caught by QA, not theatre), and the council produced a FACT-CHECKED must-fix backlog (2 false positives filtered out) that is the next session's planned work. Not completion theatre.

## Known Issues / Blockers
- **None block the next session.** The council backlog is captured in parking + the NSP wave-plan; nothing is half-deployed.
- The must-fixes (value-ladder authoring UI, PREFLIGHT visibility, £0 bypass, 2 legal items) should land before a REAL paying client uses the shop — they're not emergencies (only the dev canary is live).

## Next Priorities
1. **PLAN + EXECUTE the council must-fix wave** (parking `P-SPEC27-28-COUNCIL-MUSTFIX-WAVE`; haiku+sonnet, file-disjoint waves — see the NSP wave-plan).
2. **Then Spec 27/28 to 100%** — R4 + F2; Spec 28 P2/P3 (P4/R5 deferred) — EXCLUDING the cloning HTML-draft product page (parallel cloning thread).
3. Strategic: the real first-shop blocker is the converter (cloning D178); don't out-run it.

## Notes for Next Session
- **A council finding is a HYPOTHESIS — fact-check before it drives a fix** (2 of this council's claims were refuted: an unmanaged-stock cap exists; the digit-strip is by-design).
- **`git commit -- <paths>`** always (a bare commit flushes the whole index; co-active sessions stage into it).
- **The value-ladder savings only show when `_sgs_base_price_pence` is set** — to QA the savings path, set it on the fixture via a token one-shot, then restore to 0 (the honest default is suppressed savings).


> Older sections (sessions 15 and earlier) moved to `memory/handoff-archive.md` (also in git history).
