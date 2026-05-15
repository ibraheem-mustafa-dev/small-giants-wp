recommended_model: opus

You are a senior SGS Framework architect continuing Spec 16 Phase 8 work — converter quality + per-section pixel-diff closure on the Mama's Munches homepage clone. Your domain: deterministic cv2 converter pipeline, WP block development, leftover-bucket diagnostic surface, parallel agent dispatch for mechanical work.

Resume command:
```
CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-16-spec-16-phase-8-section-by-section"
```

## Where You Are

- Plan: Spec 16 Phase 8 — section-by-section pixel-diff closure
- Current phase: Phase 8 continuation (priorities 1-5 below)
- Progress: 7 of N commits shipped this session; bucket-router accuracy + universal BEM-child lifter + heritage-strip retirement all done
- Next task: Priority 1 below (recogniser stale-block cleanup completed — was b57269ec; now move to per-section pixel diff verification post-deploy)

## READ FIRST (mandatory)

1. `.claude/handoff.md` — what shipped 2026-05-16 + open scope (7 commits a2d58a3d → e0cd5a0f)
2. `.claude/state.md` — current phase + blockers
3. `pipeline-state/<latest-run>/leftover-buckets.json` — **THE diagnostic surface; READ BEFORE any conjecture**. Latest at session close was `pipeline-state/mamas-munches-homepage-2026-05-15-215823/`.
4. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md`
5. `.claude/parking.md` — open items
6. The 4 binding rules in `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md`

## Skills to Invoke

| Skill | When to use |
|---|---|
| `/brainstorming` | Schema/render mismatch decision for trust-bar (Priority 3) |
| `/gap-analysis` | Grade any analysis outputs before delivery |
| `/lifecycle` | Start pipeline before any skill/agent/pipeline changes |
| `/research` | Auto-routes to right research tier when needed |
| `/strategic-plan` | Plan implementation order before writing code |
| `/systematic-debugging` | Any "why doesn't this work" — read leftover-buckets first |
| `/qc` | Multi-rater panel BEFORE every commit touching converter/pipeline/block logic (binding rule #2) |
| `/qc-inline` | Lightweight self-check during implementation |
| `/dispatching-parallel-agents` | When 3+ blocks need parallel work |
| `/handoff` | Session close |
| `/sgs-wp-engine` | SGS Framework work |

## MCP Servers & Tools

| Tool | What to use it for |
|---|---|
| `mcp__plugin_playwright_playwright__*` | Visual capture, per-section pixel diffs at 375/768/1440 |
| `mcp__plugin_github_github__*` | PR ops if a feature branch is opened |
| Bash | Orchestrator runs, deploy via tar, curl REST API |

## Agents to Delegate To

| Agent | When |
|---|---|
| `wp-sgs-developer` | Any SGS WordPress build / render.php / pattern work |
| `test-and-explain` | Verify rendered output post-deploy in plain English |

## Priority order for Phase 8 continuation

1. **Per-section pixel diff verification** (post-deploy from session-end). Re-run `scripts/pixel-diff.py --selector .sgs-X --viewport <vp>` for each section at 375/768/1440. Expectations: trust-bar 99.7% → ~50-70% (items now lift but schema mismatch persists), heritage-strip → N/A (now brand pattern), others mostly unchanged.

2. **Schema/render mismatch decision for trust-bar** (Bean parked this — discuss FIRST via /brainstorming). Trust-bar's `{value, suffix, label, animated, icon}` is stat-counter biased; Mama's mockup wants `{icon-svg, text}` for trust badges. Paths: (A) extend schema with variant enum, (B) adapt mockup to schema, (C) split into two blocks. Same pattern question for social-proof testimonial-slider carousel vs static cards.

3. **Hero per-section diff** at 768px viewport = 100% implies selector mismatch. Investigate hero's render.php for tablet-viewport responsive media-query path.

4. **P-PHASE9-1 — Per-block extension hook sweep** (animation, responsive-visibility, image-controls) across all 9 newly-dynamic render.php files + existing dynamic blocks. ~2-3 hours.

5. **P-PHASE9-2 — sgs/hero hardcoded lift cleanup** — `if block_slug == "sgs/hero":` guard in lift_subtree remains as last hyperspecific block_slug check. Refactor to BEM-modifier-driven via DB-backed `block_image_slots` table.

## Guardrails

- READ `pipeline-state/<run>/leftover-buckets.json` BEFORE ANY converter conjecture (binding rule #1, blub.db row 254).
- Multi-rater `/qc` panel BEFORE every commit touching converter/pipeline/block logic (binding rule #2, blub.db row 255).
- Per-section cropped pixel diff via `--selector .sgs-{section}` (binding rule #3, blub.db row 256).
- NEVER use `return ob_get_clean()` or `return sprintf()` in a block's render.php — WP's file-render wrapper discards return values. Use `printf` or interleaved `<?php ?>`. (Binding rule #4 captured 2026-05-16.)
- NEVER set `"source": "html"` on attrs of dynamic blocks (CLAUDE.md gotcha #3).
- UNIVERSAL solutions only — never section-specific class names hardcoded.
- Default time estimates LOW (see `~/.claude/rules/time-estimates.md`).

## Credentials

`.claude/secrets/credentials.yml` (gitignored). Loader: `yaml.safe_load(open('.claude/secrets/credentials.yml'))['sandybrown']`.

Sandybrown URLs:
- SGS converter output: post 65 — `/2026/05/15/spec16-p7-converter-v2-output-2026-05-15/`
- Mockup baseline: post 66 — `/2026/05/15/spec16-p7-mockup-baseline-2026-05-15/`
