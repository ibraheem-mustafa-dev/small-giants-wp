# Draft-to-SGS-WP Pipeline (Recogniser v2)

**Status:** Architecture locked 2026-05-03. Hero extractor prototyped at `tools/recogniser-v2/extract.py`. Generalisation to other blocks is parking item P-9.
**Replaces:** the v1 recogniser at `tools/recogniser/` (8000 LOC, 12% attribute coverage on sgs/hero, hand-written fingerprints, no all-CSS harvest).
**Depends on:** SGS Button Architecture (spec 11) landing first — the pipeline emits `sgs/multi-button` + `sgs/button` markup for any CTA pattern detected in a mockup section.

---

## 1. Purpose

Convert a designer's HTML+CSS mockup into canonical WordPress block markup that produces a pixel-faithful clone of the design when rendered through the SGS theme. The pipeline must be:

- **Deterministic** — same mockup, same SGS DB state → same output every run.
- **Replicable** — runs identically across every client mockup. Not bespoke per project.
- **Schema-driven** — every block's attribute extraction derived from its own `block.json`, never hand-written. New blocks automatically get extractors.
- **Forward-only** — no reverse template, no round-trip "lossless" claim. WP itself owns serialisation; the pipeline owns extraction.
- **Lossless on CSS** — every CSS rule that targets a section's elements is harvested. Each declaration is classified into block-attribute / universal-handled / one-time-custom. Zero silent loss.

## 2. Architectural decisions captured this session

The pipeline replaces the v1 recogniser, which had three structural defects discovered during the 2026-05-03 hero-clone investigation:

1. **Hand-written fingerprints** — sgs/hero declares 48 attributes in `block.json`; the v1 fingerprint extracted 6 (12% coverage). Critical attributes (e.g. `splitImage` — the hero's right-side photograph) were silently skipped because the fingerprint author forgot them. Whole class of bugs.
2. **Selective CSS extraction** — v1 only pulled CSS rules whose properties it knew how to map. Rules with no immediate map were dropped without trace. Result: design intent quietly lost.
3. **Bidirectional fingerprint claims** — v1 design proposed a "reverse template" for round-trip verification. Three independent reviews (Gemini Pro Vision, Sonnet design-reviewer, Cerebras qwen) converged on this being a tautology — the round-trip tests forward and reverse extractor agreement, not WP correctness. v2 abandons reverse templates entirely.

The v2 architecture below addresses each defect.

## 3. Pipeline shape

```
┌──────────────────┐
│ Mockup HTML+CSS  │  Designer's hand-coded mockup (e.g. mamas-munches/mockups/homepage/index.html)
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ 1. Boundary detector     │  Find candidate block boundaries — top-level <section>, <header>, <footer>,
│ tools/recogniser-v2/     │  significant <main> children. Class names tied to block-role hints.
│   boundary_detector.py   │  Output: list of { selector, element, semantic_role_hint }
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 2. Block-type matcher    │  For each boundary, propose target block type via:
│   block_matcher.py       │   (a) class-name → block-name lookup (kebab-case roles)
│                          │   (b) DOM-structure shape (eyebrow + h1 + p + buttons → sgs/hero)
│                          │   (c) confidence threshold; below threshold → human review queue
│                          │  Output: { boundary_id, block_name, confidence, alternatives }
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 3. Schema scaffold       │  For target block, load block.json. For each declared attribute,
│   schema_scaffold.py     │  create an extractor entry (heuristic body or TODO marker).
│                          │  CRITICAL RULE: never silently skip an attribute. Every declared
│                          │  attribute MUST have a slot in the extractor output, even if empty.
│                          │  Output: extractor scaffold matched to block.json's attribute set.
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 4. Heuristic extractors  │  For each scaffold slot, run heuristic extraction against the
│   heuristics/            │  boundary's DOM:
│     text.py              │    - text content from h1/h2/h3/p/span by selector
│     link.py              │    - href + label from <a> elements
│     image.py             │    - src/alt/width/height from <img>, resolve via media_map
│     icon.py              │    - SVG/Lucide icon name from inline SVG or class hints
│   (per-attribute-type)   │  Heuristic strategies are deterministic and per-block-attribute-type.
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 5. All-CSS harvester     │  Walk the boundary's DOM, find every CSS rule that targets any
│   css_harvester.py       │  element in it (BS4 native selector engine; recursive @media block
│                          │  parsing). Output: dict of { selector_with_media_prefix: { prop: val } }
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 6. CSS classifier        │  For each declaration in each harvested rule, classify:
│   css_classifier.py      │   (a) Maps to block attribute (e.g. background-color → backgroundColor)
│                          │       — fill the scaffold slot, mark consumed.
│                          │   (b) Universal-handled (e.g. * { box-sizing: border-box }, h1 typography)
│                          │       — drop, framework or theme.json variation owns it.
│                          │   (c) One-time-custom (genuinely section-specific, no block attribute fit)
│                          │       — emit as scoped CSS in a sibling wp:html style block.
│                          │  Coverage gate: 0% silent loss. Every declaration ends up in (a), (b), or (c).
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 7. Composition emitter   │  For composite blocks (hero, cta-section, product-card, feature-grid):
│   composition.py         │   - render the parent block markup
│                          │   - emit InnerBlocks slot with sgs/multi-button containing sgs/button
│                          │     instances for each detected CTA pattern
│                          │   (Depends on spec 11 — SGS Button Architecture — landing first.)
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 8. WP serialiser         │  Output canonical block markup:
│   serialiser.py          │   - Dynamic blocks (~87% of SGS blocks): emit <!-- wp:sgs/foo {...} /-->
│                          │     directly; canonical by definition because save() returns null.
│                          │   - Static blocks: minified-JSON attrs + canonical class order; if
│                          │     edge cases arise, hand off to wp.blocks.serialize() via Node sidecar.
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ 9. Coverage report       │  Per section:
│                          │   - Block attributes extracted: N of M (X%)
│                          │   - CSS rules harvested: N
│                          │   - CSS rules absorbed via attrs: N
│                          │   - CSS rules emitted as scoped custom: N
│                          │   - Attributes flagged TODO (heuristic returned nothing): list
│                          │  TODO attributes block downstream "ready to deploy" status until
│                          │  resolved (manually filled or extractor heuristic improved).
└──────────────────────────┘
```

## 4. Hard rules (from this session's mistakes.md)

- **Auto-derived from block.json, never hand-written.** Every fingerprint scaffold is generated from the target block's `block.json`. Adding a new attribute to a block automatically grows the extractor's coverage on the next run. Hand-writing the extractor is the bug that gave us 12% coverage on hero.
- **Pull all CSS every time.** No selective extraction. Selective means quietly losing design intent. Harvest everything that matches any element in the section, then classify after. Every declaration MUST end up in one of three buckets — block attribute / universal / one-time custom.
- **Forward-only, no reverse template.** WordPress owns canonical serialisation. The pipeline doesn't try to round-trip; it produces block markup that WP renders correctly, and visual equivalence is verified at the end via screenshot diff (not via reverse-rendering).
- **Composition over CTA-rendering.** Composite blocks accept InnerBlocks slots containing sgs/multi-button + sgs/button. The pipeline NEVER emits per-block CTA attributes (`ctaPrimaryText`, etc.) — those are deprecated. CTAs are sgs/button instances inside the composition slot.
- **Coverage gate enforced.** A section is not "complete" until every block-attribute slot is either filled, defaulted, or explicitly marked "not present in mockup". TODO attributes block deployment.

## 5. v1 outputs and migration

The v1 recogniser produced these files for Mama's:

- `reports/mamas-munches-page-content.html` — 102KB block markup
- `reports/recogniser-decisions-2026-05-01.json` — full decisions
- `reports/style-extract-mamas-munches.json` — 90.9% colour mapping

These were committed to `main`. They are **superseded** by v2 output but kept for archive/comparison purposes. The page-content.html in particular has the deprecated CTA attributes that the spec-11 refactor will migrate to InnerBlocks composition.

The v1 tooling at `tools/recogniser/` stays in repo as reference but is **not used going forward**. New extractor work happens in `tools/recogniser-v2/`.

## 6. v2 status

| Component | Status | Notes |
|-----------|--------|-------|
| 1. Boundary detector | Prototyped | `tools/recogniser-v2/extract.py` for hero only. Generalise per parking P-9. |
| 2. Block-type matcher | Not started | Class-name → role lookup table needed. |
| 3. Schema scaffold generator | Not started | Auto-derive from block.json. |
| 4. Heuristic extractors | Hero only | text/link/image working; icon/colour-from-CSS working for hero. |
| 5. All-CSS harvester | Working | BS4 native selectors + recursive @media parsing. Tested on hero (29 rules harvested). |
| 6. CSS classifier | Manual on hero | Classified 27 rules into 11 block-attr / 16 universal / 0 one-time during 2026-05-03 session. Need automation. |
| 7. Composition emitter | Blocked | Depends on spec 11 (SGS Button Architecture) shipping. |
| 8. WP serialiser | Working for dynamic blocks | Static-block edge cases deferred. |
| 9. Coverage report | Prototype | extract.py outputs basic counts. Needs TODO-attribute surfacing for the gate logic. |

## 7. Test mockup status

The Mama's Munches homepage mockup at `sites/mamas-munches/mockups/homepage/index.html` is the v2 test vehicle. It has:

- 9 top-level sections (header, hero, trust-bar, featured-product, brand-story, ingredients, gift-section, social-proof, footer)
- 86 unique class names, 138 class= attributes
- BEM-ish kebab-case naming consistent across sections (mockup naming convention is itself a class-name → block-role lookup)
- Mobile-first CSS with 768px and 1280px breakpoints

Hero section already exercised. Eight remaining sections to be processed once spec 11 lands and the v2 generalisation work begins.

## 8. Mockup naming conventions (input contract)

The pipeline assumes mockups follow a specific naming convention that allows class-name → block-role lookup. Bean owns the mockup style guide — when generating new mockups via Claude.ai or in-session, the naming convention is:

| Pattern | Maps to |
|---------|---------|
| `<section class="hero">` or `class="hero-*"` | `sgs/hero` |
| `class="trust-bar"` | `sgs/trust-bar` or `sgs/trust-badges` |
| `class="featured-product"` | `sgs/featured-product` (composite — contains `sgs/product-card` instances) |
| `class="brand-story"` | `sgs/info-box` or `sgs/cta-section` (depending on layout) |
| `class="ingredients"` | `sgs/feature-grid` (4-up icon cards) |
| `class="gift-section"` | `sgs/feature-grid` (2-up product cards) |
| `class="social-proof"` | `sgs/testimonial` (×N) or `sgs/testimonial-slider` |
| `class="site-header"` | universal `header.html` template part |
| `class="site-footer"` | universal `footer.html` template part |

For class names that don't match a known role (a future client mockup might use `class="hospital-banner"`), the matcher falls back to DOM-shape heuristics + LLM-assisted classification, with confirmed mappings written back to the lookup table for next-run determinism.

## 9. Implementation phasing

| Phase | Component | Trigger to start | Estimate |
|-------|-----------|-----------------|----------|
| V2.0 | Hero-only working extractor (DONE 2026-05-03) | — | — |
| V2.1 | Generalise to all 9 mamas sections; write boundary detector + matcher tables | After spec 11 ships (composition emitter needs sgs/multi-button) | 4–6h |
| V2.2 | Schema scaffold auto-generator from block.json | Parallel with V2.1 | 2h |
| V2.3 | CSS classifier with rule-based bucketing + coverage gate | Parallel with V2.1 | 2–3h |
| V2.4 | LLM fallback for unknown class names | After V2.1–V2.3 working | 2h |
| V2.5 | Run full pipeline on Mama's mockup → produce 9-section deploy | Final | 1h |

Total estimate beyond V2.0: ~12–15h. Don't run before button architecture ships.

## 10. Out of scope for v2

- **Reverse rendering / round-trip verification** — abandoned (see decisions in mistakes.md, 2026-05-01 lesson on auto-clone insufficiency).
- **Visual equivalence as a hard gate** — handled at the end by Playwright + gemini-vision-audit, not part of the pipeline itself.
- **Multi-page mockup support** — v2 processes one page at a time. A multi-page mockup walker is a future v3 if needed.
- **Mockups not following the BEM-ish naming convention** — falls back to LLM classification, expected to be slower and require more human review. Encourage mockup standardisation upstream rather than fighting it in the pipeline.
- **Custom CSS that genuinely needs to ship** — emitted as scoped wp:html style block. Acceptable but should be rare; if the same custom CSS shows up across 3+ sections, it's a candidate to promote to a block attribute or universal framework rule.
