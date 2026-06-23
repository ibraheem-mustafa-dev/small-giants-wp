---
doc_type: spec
project: small-giants-wp
thread: cloning-pipeline
title: "Grid/container-extraction rebuild — DB-driven universal CSS lift (Task 1 design)"
created: 2026-06-16
status: ARCHIVED/SUPERSEDED 2026-06-23 (doc audit) — this "Task 1 design" was the precursor to the clean modular rebuild; D229 (D-MODULAR) chose that rebuild and Spec 31 §12 ABSORBED this design (Spec 31 frontmatter declares `supersedes:` this file as an "under-specified earlier draft"). The one-sentence fix here IS Spec 31 §0's target. convert.py FROZEN; the rebuild owns this. ORIGINAL: DRAFT — pending /adversarial-council (Rule 7 shared-mechanism) + Bean design-gate.
amends: specs/22-UNIVERSAL-BLOCK-EQUIVALENT-EXTRACTION.md §FR-22-21
acceptance_baseline: reports/2026-06-14-clone-vs-draft-defect-register.md (families B/C/D/E/F/K)
---

# Grid/container-extraction rebuild — design spec

## Plain English (what this is, why it matters)

**What.** Every section of a cloned page renders through one shared engine — `sgs/container` and its PHP wrapper (`SGS_Container_Wrapper`), which hero / cta-section / trust-bar / all composites use. That engine can hold a large set of values (widths, padding, gaps, grid column ratios, image styling, backgrounds), each with three responsive tiers (mobile / tablet / desktop). When we clone a draft mockup, the converter (`convert.py`) is supposed to read the draft's CSS and fill in those values. **It currently fills only some of them, and routes a few wrong.** That is the whole of the "55% desktop fidelity" gap.

**Why it matters.** Until the converter faithfully transfers *every* value the engine can hold, clones drift from the draft (headings too big on mobile, content running full-bleed, images losing their rounding, grids collapsing to the wrong column count). This is the root lever for cloning fidelity and the precondition for folding the hero (Task 2).

**The fix in one sentence.** Make the converter route *any* draft CSS property to the correct container attribute and the correct responsive tier using a single DB-derived map, so completeness is a property of the data (the DB), not of how many `if` branches someone remembered to write.

## Ground truth established (read, not assumed)

| Fact | Evidence |
|------|----------|
| Render/wrapper side already emits ALL responsive tiers faithfully at 768/1024 | `class-sgs-container-wrapper.php` L920–1019 (width-mode tiers, bg-image tiers, grid-col/row tiers, band max-width/padding/bg tiers) |
| A DB property→attr map already exists (124 rows) | `property_suffixes` — `MaxWidth/MaxHeight/BorderRadius/LineHeight/FontSize/Gap/Columns/Padding/Margin` all present, with `value_kind` + `kind_override` |
| `order` has NO `property_suffixes` row | DB query 2026-06-16 — concrete seeding gap (Family E / B5) |
| A lift framework already exists | `_lift_wrapper_css_to_container_attrs` (L1078), `_lift_typography_to_block_attrs` (L1598) incl. a Mobile-tier rescue (L1764), 3-layer OUTER/CONTENT/PER-ITEM model (L2188+) |
| Breakpoint classification IS DB-driven for the general/typography lift | `db.breakpoint_suffix_rules()` → `min-width:768`→[Tablet,Desktop], `1024/1280`→[Desktop], `max-width:767/640`→[Mobile] |
| The GRID lift bypasses that vocabulary with hardcoded constants | `_GRID_DESKTOP_BP=1024` / `_GRID_TABLET_BP=768` (L5232) — a SECOND, parallel breakpoint system |
| The unitless line-height sentinel exists | `convert.py` L1696–1700 writes sentinel `"unitless"`; render.php is supposed to strip it (Family B = this strip not firing — BUILD must verify the render side) |

## The universal principle (Approach A — Bean-approved 2026-06-16)

> The converter derives a single routing table from the DB at run time: **CSS property → attribute suffix → concrete block attribute → responsive tier.** For any property present in the draft's resolved CSS for an element, it looks up the target attribute via the DB and writes it at the correct tier. New container capability becomes coverable the moment `/sgs-update` seeds its `property_suffixes` row + the block declares the attr — no code edit. (Binding: R-22-1 DB-first, R-22-9 universal.)

This reframes the 6 defect families into exactly two work-kinds:

| Family | Symptom | Work-kind under Approach A |
|--------|---------|----------------------------|
| **C** dropped mobile font tier | headings too big <768 | **map/vocabulary completeness** — ensure the draft's mobile @media classifies to `…Mobile` and the block declares it |
| **D** dropped max-width | content full-bleed | **map completeness** — `max-width` lift is currently opt-in (`allow_max_width`); make the routing apply it wherever the target attr exists |
| **E** dropped image styling | radius/max-height/order lost | **map completeness** — seed `order` row; route media box-CSS to `sgs/media` attrs |
| **B** `1.65unitless` | invalid line-height | **shared-emit bug** — verify + fix the render-side sentinel strip |
| **F** breakpoint inversion/mismatch | wrong tier / wrong cols | **single breakpoint vocabulary** — kill the parallel grid constants; route grid through `breakpoint_suffix_rules()`; fix min/max direction |
| **K** duplicate emit | competing CSS from 2 class sources | **shared-emit dedup** — one source of truth per property per tier |

## Design pillars

### Pillar 1 — One DB-driven property→attr→tier routing map
- Invert `property_suffixes` to a `css_property → [attr_suffix]` index at load (cached), joined against the *target block's* declared attributes (`block_attributes`) so a property only lifts when the block can hold it.
- `value_kind` / `kind_override` on the row drives parsing (number_px / number_unitless / string / colour).
- **Completeness audit (build deliverable):** enumerate every CSS property appearing in the Mama's draft's resolved CSS; for each, assert a `property_suffixes` row exists AND the matched block declares the attr. Each miss is a seeding gap to fill via the canonical path (block.json `supports.sgs` OR a dated `migrations/*.py` row), NOT a code branch. Known first gap: `order`.

### Pillar 2 — One breakpoint vocabulary, shared by every lift path
- All three lift paths (typography, wrapper-CSS, grid) consume `db.breakpoint_suffix_rules()`. **Delete the parallel `_GRID_*_BP` constants** and route the grid lift through the same vocabulary.
- The SGS **device-tier attribute system** (Mobile/Tablet/Desktop attrs → wrapper @media 768/1024) is the canonical device standard.
- **DESIGN TENSION for the council (do not pre-decide):** D228 locked that *device-tier* breakpoints (768/1024) and *arbitrary visual* breakpoints (a single draft rule at 600/640/781) are DISTINCT and must not be conflated. Family F shows the converter REMAPPING the draft's own breakpoint (e.g. 640) onto a device tier (599/768) — which is exactly the conflation D228 forbids. Two candidate resolutions:
  - **(F-i)** Treat draft breakpoints near a device tier as that tier (snap 640→Mobile/767). Risk: violates faithful-transfer when 640 was a deliberate visual choice.
  - **(F-ii)** Faithfully preserve any draft @media whose threshold is NOT a device-tier value as a raw uid-scoped rule (passthrough), and only map device-tier thresholds (768/1024/767/1023) to the tier attrs. Risk: more machinery; needs a raw-@media passthrough path.
  - The council must pick, grounded in whether the Mama's draft's grid breakpoints are device-tier or visual.

### Pillar 3 — Shared-emit correctness (the bug families)
- **B (unitless):** trace the `"unitless"` sentinel from converter emit → serialised attr → render.php; confirm where the literal survives into output and fix the strip. Live-verify a real line-height renders unit-free.
- **K (dedup):** when two draft class sources both contribute the same property to one element, the cascade resolver (`_collect_css_decls_for_element` already sorts by specificity+source-order, L730) must yield ONE winning value per property per tier — no doubled `display:grid` / competing templates (HE11) and no duplicate margin emits (B7).
- **F-direction:** min-width vs max-width must map to the correct tier direction (no inversion — B1).

### Pillar 4 — Explicitly OUT OF SCOPE for this rebuild
- **DEC-1…DEC-5** (block-match choices: notice-banner-vs-plain-text, info-box-vs-div, button-vs-link, slider-vs-static-grid, multi-button-wrapping). These are Stage-2 recognition / Bean's-eye decisions, not container-CSS-lift. → Task 3 / separate.
- **HF-1…HF-7** (header/footer template-part + Site Info data). Theme layer, chrome-skipped by design. → separate.

## Acceptance (measurable, live)
A draft container/composite's full capability set — width, padding, gap, grid ratio + responsive tiers, max-width, image radius/max-height/order, align, background — round-trips to the live clone on **canary page 8**, verified by Playwright computed-style at **375 / 768 / 1440**, matching the draft (`index.html`). Each register row B/C/D/E/F/K flips from defect→match under a live computed-style probe (R-22-11). Parity full-fidelity (currently 61.82% mobile / 59.09% tablet / 55.45% desktop) rises measurably, desktop most.

## Build shape (after the gate — not now)
DB-driven map + vocabulary unification first (Pillars 1–2), then the shared-emit bugs (Pillar 3), each as a path-scoped commit with: BOTH conformance suites green (Gate A `scripts/tests/test_converter_conformance.py` + `converter_v2/tests/`) + a fresh `/sgs-update` reseed proving any DB change reproduces + a live page-8 computed-style probe + a `reports/visual-diff/<block>-2026-06-16.md` PASS. Subagents implement (no commit/deploy authority); Opus orchestrates + commits.

## Open questions the council must resolve
1. **F-i vs F-ii** (breakpoint snapping vs faithful passthrough) — the central architectural call.
2. Does the inverted `property_suffixes` index need a tie-breaker when one css_property maps to multiple suffixes (e.g. `border-radius` → both `BorderRadius` and `Radius`; `max-width` → `MaxWidth`/`ContentSize`/`WideSize`)? Proposed: target-block's declared attr disambiguates; if still ambiguous, the layer (OUTER vs CONTENT-band) selects.
3. Is `allow_max_width` opt-in still needed, or does the DB-driven map subsume it (max-width lifts wherever the matched attr exists)?
4. Is there an existing raw-@media passthrough path, or must F-ii build one?
