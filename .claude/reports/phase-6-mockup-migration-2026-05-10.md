---
doc_type: report
phase: 6
session_date: 2026-05-10
status: complete
files_renamed: 2
class_attr_rewrites: 138
css_js_rewrites: 145
visual_diff_breakpoints: 3
visual_diff_max_pct: 0.000
---

# Phase 6 — Mama's Mockup Migration to SGS-BEM — 2026-05-10

## Scope

Re-label every class name in `sites/mamas-munches/mockups/homepage/index.html` (and the annotated companion `annotated-index.html`) to conform to Spec 13 SGS-prefixed BEM. Pure relabel. No structural change. The deterministic `/sgs-clone` pipeline run is Phase 8 territory.

## Convention (confirmed 2026-05-10)

Bean's ruling: classes operate at PATTERN level (not block level), except composite blocks like `sgs/hero`. Inner blocks use their own block slug. Pattern slug uses short form (e.g. `sgs-header`, not `sgs-header-mamas-munches`) — variant context is provided by the mockup's file path (`sites/mamas-munches/...`).

## Deliverables

| Step | Deliverable | Location | Status |
|------|-------------|----------|--------|
| 1 | Rename map + script | `.claude/scratch/mama-mockup-rename.py` (gitignored) | done — idempotent |
| 2 | HTML class attributes renamed | `sites/mamas-munches/mockups/homepage/index.html` + `annotated-index.html` | done — 138 attribute rewrites per file |
| 3 | CSS / inline JS selectors renamed | same files (inline CSS lives in the HTML) | done — 145 line changes per file |
| 4 | TRUTH-SPEC.md | `sites/mamas-munches/mockups/homepage/TRUTH-SPEC.md` | **created** (file did not exist pre-Phase-6; created from scratch per intent of plan Step 4) |
| 5 | Visual diff <2% at all breakpoints | `.claude/scratch/phase-6-{pre,post}-{375,768,1440}.png` | done — 0.000% at every breakpoint |
| 6 | Hero parity test sanity | n/a | deferred — test file `plugins/sgs-blocks/scripts/recogniser/tests/test_slot_filler.py` does not exist yet (Phase 8 readiness gap; not a Phase 6 blocker) |
| extra | Pattern audit (3 existing Mama patterns) | this report | done — no Phase 6 sync needed |

## Visual diff results

| Breakpoint | Dimensions | Total pixels | Diff pixels | % diff | Verdict |
|------------|------------|--------------|-------------|--------|---------|
| 375px (mobile) | 360 × 7892 | 2,841,120 | 0 | 0.000% | PASS (<2%) |
| 768px (tablet) | 753 × 4753 | 3,579,009 | 0 | 0.000% | PASS (<2%) |
| 1440px (desktop) | 1425 × 4544 | 6,475,200 | 0 | 0.000% | PASS (<2%) |

Tested via Playwright at each breakpoint against the pre-migration mockup at `sites/mamas-munches/mockups/homepage-archive-2026-05-10/`. Pixel diff computed with PIL + numpy. **Zero rendering changes** introduced by the rename — exactly the expected result when class-name aliasing keeps HTML and CSS in lockstep.

## Validation checks

| Check | Result |
|---|---|
| Spec 13 §7.1 regex `^sgs-[a-z][a-z0-9-]*(__[a-z][a-z0-9-]*)?(--[a-z][a-z0-9-]*)?$` | 85/85 structural classes pass (1 state class `active` exempt) |
| Coverage — old kebab-semantic class names remaining anywhere | 0 in HTML class attrs, 0 in CSS selectors, 0 in inline JS |
| Orphan selectors — CSS rules pointing at deleted classes, or HTML classes with no matching CSS | 0 orphans (rename done in lockstep so pairing is preserved) |
| Annotated mockup parity — `annotated-index.html` matches `index.html` class set | yes — both renamed identically |

## Existing pattern audit

Bean's instruction: "make sure existing patterns are correct". Audited the 3 existing Mama patterns:

| Pattern | Block invocations | Stale class refs | Status |
|---|---|---|---|
| `header-mamas-munches.php` | core/group, core/html, core/navigation, core/site-logo, sgs/mobile-nav, sgs/mobile-nav-toggle | 0 | Clean. No drift from rename (patterns use WP-emitted class names, not custom classes). |
| `footer-mamas-munches.php` | core/column, core/columns, core/group, core/heading, core/paragraph, core/site-logo | 0 | Clean. |
| `ingredients-section.php` | core/group, core/heading, core/paragraph, sgs/feature-grid, sgs/info-box, sgs/notice-banner | 1 (`.sgs-feature-grid` — legitimate, emitted by the sgs/feature-grid block itself) | Clean. |

Phase 6 rename did not require touching the patterns. They were already Spec-13-compliant where they emit SGS classes (only sgs/feature-grid was relevant, and its self-emitted class name is correct by construction). Structural drift between mockup and patterns (e.g. mockup has a cart element the header pattern doesn't model) is **Phase 8 territory** — the actual mockup→WP conversion + live deploy.

## Gap candidates flagged for Phase 8

Per the renamed mockup's TRUTH-SPEC, the following sections do not yet have matching patterns and will need creating before live deploy:

1. `featured-product` pattern (1 instance)
2. `products` pattern (4× `sgs/product-card` grid)
3. `gift-section` pattern (3× cards: 1 trial + 2 gifts)
4. `social-proof` pattern (`sgs/testimonial-slider` + a trustpilot bar)

A `sgs/section-heading` block may also be needed to formalise the cross-cutting `.sgs-section-heading__label/__intro/__sub` utility classes if the recogniser needs a dedicated block for them (Phase 7 / 8 decision).

## What's next

Phase 7 — orchestrator rewire (stages 1-2-9 hardcoded shortcuts in `/sgs-clone`). With Mama's mockup now Spec-13-conforming, the `/sgs-clone` pipeline can run on it without `--legacy` once the orchestrator stages are properly wired.

Phase 8 — pipeline validation across all 9 mockup sections + creating the 4 missing patterns + critical fixes + live deploy + eyes-on review.
