---
doc_type: strategic-plan
project: small-giants-wp
title: Neutral-Default Container Architecture — Strategic Plan
spec: .claude/plans/2026-05-31-container-neutral-default-architecture-design.md (Spec 23)
generated: 2026-05-31
baseline: Mama's Munches page 144 — mean pixel-diff 59.83% (featured-product 79%, social-proof 47%)
research: memory/research/2026-05-31-container-neutral-default-attributes.md (16 sources)
---

> **SUPERSEDED 2026-06-02 by `.claude/plans/2026-06-02-container-wrapper-standardisation.md` (D152)** — absorbed into the 5-workstream standardisation programme; contentWidth design corrected to inner-wrapper model (supersedes cap-each-child Option B from this plan). Retained for audit trail.

# Strategic Plan — Neutral-Default Container Architecture

## Goal (one sentence)

Make `sgs/container` express only the styling explicitly set (unset = no CSS), so the clone
pipeline can preserve mockup layout wrappers without over-painting — adopting the gold-standard
neutral-default model, with existing client pages migrated safely.

## Done looks like

featured-product + social-proof pixel-diff fall (deployed mockup CSS reproduces the grid/flex),
no section regresses > +1pp, mean < 59.83%; existing client containers render unchanged after
migration (Bean visual sign-off); each change shipped separately with a pre/post Stage-11 gate.

## Research pre-gate — RESOLVED

| Q | Answer | Effect on plan |
|---|--------|----------------|
| Dynamic-block deprecation needed? | Container save = `<InnerBlocks.Content />` + mature `deprecated.js` (v0/v1/v2, migrate, isEligible). Attrs live in block comment. | v3 deprecation follows existing pattern + WP-CLI backfill pins instances. Moderate, precedented. |
| Do 47 patterns / sites write maxWidth? | **0 patterns**; sites hits are Next.js artefacts + research JSON, not WP blocks. | **Big de-risk** — retiring maxWidth touches no patterns/committed instances; only live client containers. |
| +13pp = max-width clipping? | Verify by pixel-sample inside Phase B (not a planning blocker). | Phase B carries the empirical check. |
| core/group flow emits zero width CSS? | Yes (research) — neutral = "no class", not "a class that resets". | FR-23-2 neutral state emits no class + no max-width. |

## Work units + dependency graph

```
A (FR-23-1 guard gap+width) ──► B (FR-23-2 true neutral state + default)
                                    │
                        ┌───────────┼────────────┐
                        ▼                         ▼
   C (FR-23-3/4 retire maxWidth + WP-CLI migrate)   D (FR-23-6 walker preserves wrappers)
                        │                         │
                        └───────────┬─────────────┘
                                    ▼
                         E (FR-23-7 67-block emitter audit)
```

Critical path: **A → B → D → measure** (the walker fix needs the neutral container).
C (migration) gates on B, runs parallel to D. E is the closing sweep.

### A — Guard the two unconditional emitters (FR-23-1)
- **Files:** `plugins/sgs-blocks/src/blocks/container/render.php` (gap L146, width-class L260-263)
- **Does:** emit `gap` + `sgs-container--width-*` only when the value was explicitly set, matching the existing ~38 guarded emitters.
- **On critical path:** yes. **Test:** Stage-11 pre/post on page 144; a default container emits no gap/width style.
- **Effort:** Quick (5-15 min) ×2 ADHD = ~15 min.

### B — True neutral width state + make it default (FR-23-2)
- **Files:** `container/render.php`, `container/block.json` (widthMode enum + default), `container/edit.js` (inspector label), `container/style.css` (ensure no neutral class needed)
- **Does:** add a `none`/`inherit` width state that emits no class + no max-width; make it the default for new inserts AND pipeline emission; inspector default labelled "Inherit / none — no width limit", opt-in "Use content / wide width". Pixel-sample to confirm +13pp was max-width clipping.
- **On critical path:** yes. **Test:** 4-layer — neutral container renders full-bleed; "content"/"wide" still constrain; pixel-sample featured-product width; editor shows neutral default.
- **Effort:** Block (15-45 min) ×2 = ~30 min.

### C — Retire maxWidth → widthMode + migrate existing (FR-23-3, FR-23-4)
- **Files:** `container/block.json` (deprecate maxWidth), `container/deprecated.js` (v3 + migrate pinning existing to explicit wide), new `scripts/migrate-container-maxwidth.py` (WP-CLI batch backfill)
- **Does:** widthMode becomes single source of truth; deprecated.js v3 pins existing instances; WP-CLI backfill walks live container instances deterministically (R-22-14 — no fallback hacks).
- **On critical path:** no (safety/migration). **Test:** existing client container renders unchanged pre/post migrate; new insert is neutral.
- **Effort:** Block ×2 = ~30 min (de-risked by 0 pattern refs).

### D — Walker preserves layout-bearing wrappers (FR-23-6 = original Task 1 XS-3)
- **Files:** `plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert.py` (walk + walk_passthrough + parent-context threading)
- **Does:** detect layout-bearing wrappers (slug-None, has layout CSS, ≥2 element children) and emit them as **neutral** `sgs/container`; thread parent context so the trigger fires through `__inner` passthrough (real targets sit at depth-2 under the section); respects R-22-3 AST guard (no new slug literal — parent role from `block_composition`).
- **On critical path:** yes. **Test:** 4-layer — featured-product/social-proof improve, no section > +1pp; convert_v2 R-22-3 + smoke self-test pass; /qc-council on the converter change.
- **Effort:** Session (45-90) ×2 = ~60 min (the delicate one).

### E — Lateral audit: all 67 blocks for unconditional emitters (FR-23-7)
- **Files:** every `plugins/sgs-blocks/src/blocks/*/render.php`
- **Does:** grep for unconditional `$styles[]=` / class emitters; guard each (the walker-wide "unset = no CSS" contract).
- **On critical path:** no (closing sweep). **Test:** per-block — a default-attr block emits no styling default; spot pixel-diff.
- **Effort:** Block ×2 = ~30 min.

## Gates

| Gate | After | Pass criteria | Type |
|------|-------|---------------|------|
| G1 | A | default container emits no gap/width; page-144 mean not worse | auto |
| G2 | B | neutral default live; featured-product width un-clipped (pixel-sample); content/wide still work | review (Bean visual) |
| G3 | C | existing client container unchanged pre/post migrate (visual); new insert neutral | go/no-go (migration is irreversible-ish) |
| G4 | D | featured-product + social-proof improve, no section > +1pp; qc-council pass | review (Bean visual + script) |
| G5 | E | no unconditional emitters remain; no regression | auto |

## Risk + effort summary

- **Top risk:** D (walker) regressing again — mitigated by B making the container neutral first (removes the +13pp mechanism) + per-section gate + fast rollback (STOP #19).
- **Migration risk (C):** de-risked — 0 pattern refs; WP-CLI backfill + deprecation pin existing. Residual: live client pages relying on implicit wide → backfill makes wide explicit before the default flips.
- **Total effort:** ~2.5h raw across 5 gated steps; first action (A) < 15 min, zero deps.

## Per-phase handoff (to /phase-planner)

Each phase → `/phase-planner` with phase scope = [A/B/C/D/E], entry context = this plan + Spec 23 +
the named files. Phase D additionally reads the reverted diff `git show f173b351` + the emission-path
trace findings (featured-product/social-proof sit under `__inner`).

## Out of scope

Phase 2 hybrid migration (FR-22-6 broader rollout); Chrome DevTools Stage-8 perf layer (separate);
header/footer cloner; pixel-diff ≤1% bridge (Phase 2.5).
