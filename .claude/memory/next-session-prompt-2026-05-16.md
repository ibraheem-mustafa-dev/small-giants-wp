---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-16-spec-16-phase-8-section-by-section
recommended_model: opus
generated: 2026-05-16
---

You are a senior SGS Framework architect continuing Spec 16 Phase 8 work. Last session (2026-05-16) shipped 4 commits to `main` (a2d58a3d → 752f4aed → d859da4c → 7a2a777d → 9a32a164) that closed P-PHASE8-1/2/3/11/12/13/17 + the universal BEM-child array lifter. **The diagnostic surface is now trustworthy** — read it before any spot-fix.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-16-spec-16-phase-8-section-by-section"`

## READ FIRST (mandatory, in this order — binding rules)

1. `.claude/handoff.md` — what shipped 2026-05-16 + open scope
2. `.claude/state.md` — current phase + blockers
3. `pipeline-state/<latest-run>/leftover-buckets.json` — **THE diagnostic surface; READ BEFORE any conjecture about converter gaps**. Latest at session close was `pipeline-state/mamas-munches-homepage-2026-05-15-215823/`.
4. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` — Spec 16 architecture
5. `.claude/parking.md` — open items (P-PHASE8-14, P-PHASE8-15, P-PHASE9-1/2/3 + new ones below)
6. The 3 captured binding rules in `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md`:
   - Read leftover-buckets BEFORE conjecturing (blub.db row 254)
   - Multi-rater /qc panel BEFORE every commit (blub.db row 255)
   - Per-section cropped pixel diff, not full-page (blub.db row 256)

## State at session close (2026-05-16)

**All cv2-eligible blocks are now dynamic.** Heritage-strip block retired (replaced by `theme/sgs-theme/patterns/brand.php`). 10 of 10 cv2-emittable blocks have `render.php` — no more "self-closing block comment renders empty" bug. The 7 conversions (certification-bar, counter, divider, heading, notice-banner, process-steps, tab) shipped via parallel agent dispatch.

**Universal BEM-child array lifter shipped.** `convert.py:_lift_bem_child_array()` finds most-repeated `sgs-<parent>__<element>` group inside a parent block-root, lifts each as a typed array item, resolves schema field names via slot_synonyms + block.json item shape. Zero hardcoded class names. Trust-bar items array now lifts 4 entries (was 0). Hidden / aria-hidden item-level descendants correctly skipped.

**Leftover buckets dashboard (Mama's homepage, session-close run):**
```
total: 461
severity_totals: {info: 2, low: 4, medium: 455, high: 0}
chrome_skipped:        2  [header, footer]
cv2_handled:           4  [featured-product, gift-section, social-proof, heritage-strip]
unrecognised_section:  0
structural_mismatch:   0
extraction_failed:   455 (185 stage_3 + 270 cv2_emitted_dynamic)
```

0 high-severity blockers. 4 cv2-handled sections need top-level block authoring OR the recogniser cleanup (P-PHASE8-NEW-1 below) for heritage-strip's brand-pattern slug mismatch.

**Live state on sandybrown:**
- Post 65 (cv2 output) + Post 66 (mockup baseline) deployed
- Plugin + theme deployed via tar method, OPcache reset
- All 7 newly-dynamic blocks verified rendering via curl class grep
- Per-section pixel diff NOT re-run after Phase B (context budget — defer to next session)

## Priority order for Phase 8 continuation (Bean's directive: UNIVERSAL solutions only)

1. **Recogniser stale-block cleanup** (P-PHASE8-NEW-1, ~30 min). `confidence-matrix.py:83` + `per-section-convention-voter.py:115+263` still reference `sgs/heritage-strip` as a block (now retired). Fix: remove the stale block-name references, ensure pattern matcher picks up `brand.php` for `sgs-brand` AND `sgs-heritage-strip` class signatures (multi-name pattern lookup, OR slot-synonym for the section_id).
2. **Per-section pixel diff verification** (post-deploy). Re-run `scripts/pixel-diff.py --selector .sgs-X --viewport <vp>` for each section at 375/768/1440. Expectations vs prior:
   - trust-bar: 99.7% → likely ~50-70% (items now lift but value/suffix/icon-class mismatch persists; schema/render mismatch is the next gate)
   - heritage-strip: 99% → N/A (now replaced by brand.php pattern, no longer routes as a block)
   - Others mostly unchanged (the converter changes don't directly affect their per-section diffs)
3. **Schema/render mismatch decision** (Bean parked this — discuss FIRST next session). Trust-bar's schema item shape `{value, suffix, label, animated, icon}` is stat-counter biased; Mama's mockup wants `{icon-svg, text}` for trust badges. Two paths:
   - A) Extend trust-bar schema with a `variant` enum (stat-counter vs trust-badge) + render branches
   - B) Adapt Mama's mockup to stat-counter shape (rewrite badges as numbered claims)
   - C) Split into two blocks: `sgs/trust-bar` (stat counters) + `sgs/trust-badges` (icon strip)
   This is the social-proof testimonial-slider mockup-vs-block question replayed for trust-bar. Decide cleanly before iterating.
4. **Hero per-section diff** (1440 = 71%, 768 = 100%, 375 = 80%). 100% at 768 implies selector mismatch — check hero className rendering at tablet viewport. Likely a missing responsive media-query path in hero's render.php (P-PHASE8-2 deferred sweep).
5. **Per-block extension hook sweep** (P-PHASE9-1, deferred). The 7 newly-converted render.php files don't yet wire animation / responsive-visibility / image-controls extensions. Existing dynamic blocks deferred this too. Cohesive sweep across all dynamic blocks.

## Tooling reference

| Skill | When |
|---|---|
| `/autopilot` | session start |
| `/systematic-debugging` | any "why doesn't this work" — read leftover-buckets in Phase 1 |
| `/brainstorming` | the schema/render decision (Priority 3) |
| `/qc` | multi-rater panel BEFORE every commit (Sonnet + Haiku + Gemini Flash + Cerebras) |
| `/qc-inline` | lightweight self-check during implementation |
| `/dispatching-parallel-agents` | when 3+ blocks need parallel work |
| `/handoff` | session close — regenerate handoff + state + next-session-prompt |

| Script | Purpose |
|---|---|
| `scripts/pixel-diff.py --selector .sgs-X` | Per-section cropped diff |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --converter-v2 --no-scaffold-new-blocks` | Pipeline entry |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/X` | Inspect block schema |

## Credentials

`.claude/secrets/credentials.yml` (gitignored). Loader: `yaml.safe_load(open('.claude/secrets/credentials.yml'))['sandybrown']`.

Sandybrown URLs:
- SGS converter output: post 65 — `/2026/05/15/spec16-p7-converter-v2-output-2026-05-15/`
- Mockup baseline: post 66 — `/2026/05/15/spec16-p7-mockup-baseline-2026-05-15/`

## Guardrails (re-state)

- READ `pipeline-state/<run>/leftover-buckets.json` BEFORE ANY converter conjecture (binding rule #1).
- Multi-rater /qc panel BEFORE every commit touching converter / pipeline / block logic (binding rule #2).
- Per-section cropped pixel diff via `--selector .sgs-{section}` (binding rule #3).
- UNIVERSAL solutions only — never section-specific class names hardcoded.
- NEVER use `return ob_get_clean()` or `return sprintf()` in a block's render.php — WP's file-render wrapper discards return values. Use `printf` or interleaved `<?php ?>`.
- NEVER set `"source": "html"` on attrs of dynamic blocks (CLAUDE.md gotcha #3).
- Default time estimates LOW (see `~/.claude/rules/time-estimates.md`).
