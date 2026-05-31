# Session Handoff — 2026-05-31 (converter renders content + side-by-side layout; FR-22-4.1 spec'd; methodology baked in)

## Completed This Session
1. **XS-3 reconciled + merged (D114).** Branch was a superset of main's XS-3, not a rival. Clean head-to-head: main 58.39% vs branch 58.98%.
2. **Root cause of empty sections (D115).** Pixel-diff showed false wins; live DOM (textLen=0) proved EMPTY. Cause = walker never ran FR-22-2 content-routing for leaves.
3. **G1 — leaf content-routing + a latent `attr_type` fallback-bug fix.** All 7 content sections now render (featured-product 0→510, social-proof →621, trust-bar →98). 4 regression tests.
4. **G2 — FR-23-6 depth-2 grid-wrapper preservation (council-designed, trace-confirmed).** featured-product + gift cards SIDE-BY-SIDE; duplicate nesting fixed (header/trust-bar/brand = 1 container); brand −11.1; mean −0.66pp. Live-DOM + screenshot verified.
5. **FR-22-4.1 — canonical universal wrapper/container rule written (D118)** + propagated to all docs (Spec 22, 00, flow, stages, truth-spec, decisions, parking). The full rule the depth-2 gate approximates: direct descendants FOLD (grid→grid-item CSS), block-match→block, non-direct wrapper→own container, never dropped.
6. **Root-cause methodology baked into CLAUDE.md + architecture (D26/D27) + mistakes.** No assumptions/guessing/trusting-pixel-diff; analyse all logs first; verify dependencies; named tool list.
7. **Spec 24 (query-driven cards) + sgs_product CPT + 2-product seed.** Built.
8. **Squash-merged feat/fr22-6-content-render → main + deleted the branch.** All session work consolidated on main.

## Current State
- **Branch:** `main` at `1761eb35` (squash-merge). Branch deleted.
- **Tests:** converter suite 16/16 pass. No full build run this session.
- **Build:** n/a (converter is local Python; plugin build deployed earlier for measurement).
- **Uncommitted:** only the stray untracked `.claude/sgs-framework.db` (never commit).
- **Live:** canary page 144 renders content + side-by-side layout; NOT yet pixel-acceptance (60–83%).

## Known Issues / Blockers
- **Not pixel-acceptance yet** (P-FR226-FIDELITY-AND-MERGE): images dry-run (no product images), `sgs/info-box` hybrid (gift content sparse), exact styling.
- **FR-22-4.1 full walker implementation pending** — the depth-2 gate is the working interim; the full fold/container/per-item-CSS rule is the next implementation task.
- **blub.db dashboard DOWN** (EPERM on start) — this session's lessons captured to workspace + CC-memory file layers + mistakes stubs; blub.db sync pending dashboard recovery.

## Next Priorities (in order)
1. **Implement FR-22-4.1 fully** (Spec 22 §FR-22-4.1) — replace the depth-2 gate + walk_passthrough-drop + _absorb_transparent_wrappers patchwork with the one coherent fold/container/block + per-item-CSS mechanism. Sensitive walker rewrite — use the root-cause methodology + /qc-council + /verify-loop + per-section live-DOM measurement.
2. **Image sideload** (real WP media IDs, not Stage 4i dry-run) — likely the biggest remaining pixel-diff lever.
3. **Migrate `sgs/info-box`** FR-22-6 hybrid (gift content) — same pattern as product-card.
4. Reach pixel-acceptance → visual-diff reports → (branch already merged; future fidelity work commits to main or a fresh branch).
5. Deploy + seed the sgs_product CPT (P-PRODUCT-CPT-DEPLOY-SEED).

## Files Modified
| File | What changed |
|------|-------------|
| `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` | G1 leaf-lift + fallback fix + G2 depth-2 grid-wrapper preservation |
| `plugins/sgs-blocks/src/blocks/{product-card,testimonial,testimonial-slider}/*` | FR-22-6 InnerBlocks migration |
| `plugins/sgs-blocks/scripts/seed-composition-roles.py` | NEW — idempotent block_composition role corrections |
| `.claude/specs/22-...md` | NEW §FR-22-4.1 canonical container rule |
| `CLAUDE.md`, `.claude/architecture.md`, `.claude/mistakes.md` | Root-cause methodology baked in (D118/D26/D27) |
| `.claude/decisions.md`, `.claude/parking.md` | D117/D118; P-XS-3 + P-UNIFY resolved; P-FR226 added |

## Notes for Next Session
- **Verify LIVE DOM, never pixel-diff alone** — it mis-scores empty (false win) AND reflowed-correct (false loss) sections. Playwright `textLen` + element layout is the gate.
- FR-22-4.1 is the canonical container rule (D118); the depth-2 gate is the documented interim — implement the full rule, don't re-derive it.
- The root-cause methodology is now in CLAUDE.md — it is the mandatory working method.
- blub.db is down; restart the OpenClaw dashboard, then re-POST this session's lessons (workspace file at `~/.openclaw/workspace/memory/learning/2026-05-31-root-cause-methodology-and-false-pixel-diff.md`).

## Next Session Prompt
See `.claude/next-session-prompt.md` — updated this session; structural defences (STOP catalogue, ritual, tiered reading) preserved per D101/Gate 6.5; read-docs+git-history-first + methodology added.
