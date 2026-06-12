---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline
generated: 2026-06-12
primary_goal: "Build the universalisation programme A/B/C (cloning thread), design-gated 2026-06-12. SEQUENCE LOCKED: (C) trust-bar gap via the universal helper [bounded] → (B) has_inner_blocks auto-derive REDESIGNED [save-marker AND render-consumes-$content, sgs/* only, keep a ~3-row override] → (A) the name-free align LAYER-ROUTER [Bean chose the proper universal fix over the rename; needs its OWN design-gate + adversarial-council before code]. Full register + redesigned specs: .claude/plans/2026-06-12-universal-align-router-programme.md. ALSO still open from P5: IN-C (folds into A), IN-F notice-banner content (universal-lift), and run /sgs-update to register ratingSize/nameFontWeight into the DB reproducibly (stopgap-inserted 2026-06-12). Acceptance = each row VERIFIED on live page 8 + golden conformance green."
---

# Next session — universalisation programme (C → B → A-layer-router)

> Invoke `/autopilot` first. Read this prompt + **`.claude/plans/2026-06-12-universal-align-router-programme.md`** (THE programme + the adversarial-council must-fix register — trust it) + `.claude/plans/2026-06-09-clone-fix-sign-off-ledger.md` (the acceptance surface) before acting.

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every converter/block action)

1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes/DOM.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no shallow-test workaround. Only the live WC configurator `sourceMode='wc-product'/'sgs-cpt'` is legitimate. *(This programme exists because Bean called the trust-bar typed wrapper-CSS hand-read a "cheat" — C removes it.)*
3. **UNIVERSAL, no carve-outs** — a fix applies to every qualifying block/case; no per-block/per-tier exception. Over-broad universality is ALSO a break. *(The whole point of A = the layer-router: remove the hardcoded attr-name fork, don't just rename it.)*
4. **NO SKIPPING** — every draft class's content + CSS transfers, OR is reported skipped-with-reason, per class.
5. **VERIFY ON THE REAL HOMEPAGE** — Playwright/chrome-devtools live DOM + computed-style on page 8 vs the draft's real values. *(Emit-green ≠ rendered — a lift can be correct in the emit and paint NOTHING; verify the full render chain. `feedback_converter_attr_must_match_the_attr_render_reads`.)*
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **DESIGN-GATE sensitive/high-blast-radius changes** (shared wrapper, walker, converter, most-used block) via `/adversarial-council` or `/qc-council` + Bean approval BEFORE building. *(A — the layer-router — gets its OWN council before code.)*

## State recap (plain English, 2026-06-12 close)

**P5/P7/P8 cluster DONE + shipped (commit `9275328c`, ledger close `535c3bd9`).** 10 rows live-verified (TB-A/B, FP-N/O/I, BR-C, SP-D.1, SP-E, IN-D + SP-F). 21 conformance goldens re-baselined.

**This session designed + council-gated the A/B/C universalisation programme** (Bean's follow-on: make those fixes properly universal). The adversarial council returned **NO-GO as originally specified** — the original plan (rename across 8 blocks + flip the shared wrapper default + retire all overrides) would silently break live client pages 3 ways, one re-creating the D212 testimonial-empty bug. **Restaged + must-fixes are in the programme plan.** Bean chose the **proper name-free layer-router** for A (not the band-aid rename).

## The build — execute in this order (all detail in the programme plan)

### C — trust-bar gap via the universal helper [START HERE — bounded]
Replace the hand-read at `convert.py:3304-3314` with `_merge_grid_attrs_into_container(_inner_classes, css_rules, trust_result)` (keep the hand-read as a backstop). **MUST:** assert the emitted gap CSS is byte-identical (`16px 12px`) — only `gridTemplateColumns*` may be added to the 2 trust-bar goldens; confirm trust-bar render.php doesn't read a stranded `verticalAlign`. iconCircleBackground STAYS typed (genuinely trust-bar-specific). Re-clone → live-verify TB-A/B unchanged (gap + white circle). /qc-council before commit.

### B — has_inner_blocks auto-derive [REDESIGNED per council must-fix #1]
New `_populate_has_inner_blocks()` in `sgs-update-v2.py` Stage 1 (sibling of `_populate_allowed_blocks` ~726). **Rule = save-marker AND render-consumes-`$content`, `sgs/*` ONLY (never core/*). KEEP a ~3-row `HAS_INNER_BLOCKS_OVERRIDES`** for genuine serialisation≠routing cases (NOT "retire all"). Dry-run printing per-row would-change; the team-member 0→1 flip is a real correction (verify its render consumes children, not a double-render). Insert the 5 missing block_composition rows. Add the `check-composition-sync.js` prebuild gate.

### A — the name-free align LAYER-ROUTER [OWN design-gate + council FIRST]
Do NOT start code. First design the router: resolve align/gap/per-item-bg by **CSS-property → block-attr via `attr_for_layer_property(slug, layer, css-property)`**, zero attr-name literals. Remove the fork at `convert.py:4075-4082`. Route gap + iconCircleBackground through the GRID layer. THEN reconcile the 8 blocks' attr names with: render-side `verticalAlign ?? alignItems ?? default` fallback + per-block deprecated.js pinning existing instances + a WP-CLI batch re-save + per-block live verify. Run `/adversarial-council` on the router design before building.

## Methodology guardrails (do not skip)
- **Emit-green ≠ rendered** — verify the full render chain on the LIVE DOM (attr TYPE → WP supports → render.php → safecss). Grep render.php + the wrapper for the attr BEFORE lifting onto it.
- **Deploy before measure** — `build-deploy.py --skip-build --allow-dirty` (canary) + OPcache reset; re-clone via `sgs-clone-orchestrator.py … --converter-v2 --mode draft`; upload via `upload_and_patch.py <run-dir> --target-id 8 --target page --client mamas-munches`. `npm run build` via PowerShell (broken node wrapper in Bash).
- **Per-row live probes are the acceptance** (R-22-11); aggregate parity differ is RETIRED (BEM-blind-spot).
- **/qc-council BEFORE every converter/SGS-block commit** (blub.db 255). **/adversarial-council before A** (Rule 7).
- **Conformance Gate A** will block the commit if goldens drift — re-baseline with a cited reason (REGEN=1).
- **The visual-diff gate** blocks a commit touching a block's style.css without a passing `reports/visual-diff/<block>-<date>.md` (verdict: PASS + first_paint_capture_passed: true).
- **Commit by explicit path** (`git commit -- <paths>`; the path-scoped hook enforces it). **Merge to main via temp-worktree cherry-pick** (the primary worktree is often held by the theme thread on its branch — NEVER switch it). `git worktree add --detach <tmp> origin/main` → cherry-pick → push HEAD:main.
- **Subagents implement; Opus orchestrates** (plan/delegate/QC/live-test/commit) — Bean directive.

## Skills / tools / agents
| Skill | When |
|-------|------|
| `/adversarial-council` | BEFORE building A (the layer-router) — Rule 7 |
| `/qc-council` | before every converter/SGS-block commit (C, B) |
| `/sgs-clone` · `/sgs-update` · `/wp-blocks` · `/sgs-db` | re-clone / DB sync / schema + attr TYPES ground truth |
| `/systematic-debugging` | root-cause any "fix didn't render" (emit≠render) |
| `/dispatching-parallel-agents` · `/subagent-driven-development` | parallel build across disjoint files |
| chrome-devtools MCP (Playwright fallback) | live page-8 DOM probes (creds `.claude/secrets/sandybrown.env`) |

## Guardrails
Cloning thread owns the converter + homepage pipeline; WC build = theme thread. Build C → B → A in order; A is its own council-gated session. Per-row live probes, never the aggregate. Verify the full render chain. The programme plan is the acceptance surface — lead every report with the must-fix register + the ledger delta.
