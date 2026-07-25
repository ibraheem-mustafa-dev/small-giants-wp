# Next Session — Header/Footer Per-Row Identity (build)

**Invoke `/autopilot` before doing anything else.** It establishes live skill routing + ADHD
support for the whole session.

## MANDATORY READING GATE (read in full before any edit)
1. `.claude/plans/2026-07-25-header-footer-per-row-identity-design-gate.md` — the approved design +
   the 9 council must-fixes (load-bearing; do NOT re-open the block-private question — it was
   considered + rejected via a 6-persona adversarial council).
2. `.claude/plans/2026-07-25-header-footer-per-row-identity-PHASE-PLAN.md` — the executable plan.
3. `.claude/specs/37-HEADER-FOOTER-BUILDER.md` §Behaviours — the current header-level behaviour
   mechanism you're extending to per-row.

## Where we are (2026-07-25)
- **Decision locked (Bean, Option 1):** header/footer KEEP the shared layout engine
  (`SGS_Container_Wrapper`). Per-row identity is built as a thin layer ON TOP. Block-private
  removal was **rejected** (false premise — it doesn't fix the attr-shape issue; mega-panel is the
  wrong category; the per-row features are already live with the wrapper; drift risk). 6/6 council.
- **This session already shipped + live-verified** (all on `main`, live on the canary): FR-37-34
  (row promoted palette), FR-37-28 (header layout presets + the depth fix — presets re-align the
  middle row), FR-37-30 (`wp sgs header|footer` CLI, hyphenated), FR-37-31 (verified done). Spec 35
  D4 flagged as the priority blocker for Group B tri-state (FR-37-14).
- **Design + phase plan written + committed to `main`.** Not yet built.

## Next actions (ranked — smallest first)
1. **[~30 min, do FIRST] Run the operator-simplicity test (deal-winner B1).** Can a non-coder set
   up a header in a few minutes without opening Advanced? Run against TODAY's header (it shows 7
   controls vs the ≤3 target). Record pass/fail. A fail = trim the Simple surface before adding
   per-row controls. This is the council's top steer.
2. **Phase 1** (ships to canary first): per-row transparent + hide-on-scroll on
   `site-header-row`/`site-footer-row`, keyed on the row uid class (plan steps P1-S1..S3 + QA gate).
3. **Phase 2:** per-row shrink + shrink-hides-chosen-element (stable id + DB-role guardrail) + footer parity.
4. **Sticky mini-design (BLOCKING for per-row sticky):** resolve the transform↔sticky conflict +
   multi-sticky offset chain + anchor scroll-padding, get Bean sign-off, THEN build.
5. Deal-winners B2 (scrolled-preview button) + B3 (preset library) — independent, high-ROI.

## Git / deploy (READ — shared tree is busy)
- Several concurrent sessions are active (9 worktrees; `main` moving fast). **Always
  `git branch --show-current` in the SAME command as any commit**, and **commit to `main` via an
  ISOLATED worktree** (`git worktree add <tmp> main`) if the primary tree is on another branch —
  never `git checkout main` on the shared tree.
- Deploy: `build-deploy.py --target sandybrown --blocks-only` from an isolated worktree; the plugin
  is shared, so `git merge origin/main` first and verify with a per-feature marker + md5, never the
  generic HTTP-200 leg.
- No inline style (Spec 32); device tiers 768/1024; DB-first (no hardcoded dicts); no version
  bumps/deprecations; transition transform/opacity only.

## Skills / tools
| Work | Route to |
|---|---|
| FIRST — live skill routing + ADHD support | `/autopilot` |
| The build | `wp-sgs-developer` agent + `/sgs-wp-engine` |
| Multi-rater check before deploy on the behaviour surface | `/qc-council` |
| Live-page DOM verify | chrome-devtools MCP (or Playwright) |
| DB role lookup (guardrail) | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` |
| Session close | `/handoff` |

## Open threads (not blockers)
- Leftover temp worktree `C:/tmp/sgs-doc-main` (Windows file-lock on removal) — `git worktree prune` it.
- FR-37-16 (attr-shape flat→object) — decoupled, optional, low priority. Not part of this work.
- Fold this next-session-prompt into `LEDGER.md` once the concurrent-session churn settles.
