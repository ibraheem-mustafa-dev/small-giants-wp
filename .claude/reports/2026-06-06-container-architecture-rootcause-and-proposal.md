---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "Container/wrapper architecture — evidence-first root cause + proposed universal solution (pre-adversarial-council)"
created: 2026-06-06
status: PROPOSAL — gated behind /adversarial-council + Bean approval before any code (Bean-directed 2026-06-06)
evidence: 3 parallel read-only agents (converter map / DB consumption / docs intent) + orchestrator render.php read + live-DOM (R-22-11) on page 8
---

# Container/wrapper architecture — root cause + proposed universal solution

**Scope of the failures being diagnosed:** R1 (trust-bar still 1-column; redundant inner container), R6 (multi-button double-wrapped → button colour-box), R5 (trust-bar icons = default star), R8b (trust-bar circle missing), R4/R8c (trial card 2px-dashed border clobbered to 1px-solid). Bean's directive: stop per-block patching; find why the *documented universal* architecture isn't wired and build it properly.

## THE UNIFYING ROOT CAUSE (evidence-backed)

**The universal container architecture is fully DESIGNED in the docs and the DB tables are built — but the converter never IMPLEMENTED the universal consumption. It runs on partial, per-tier patches.** This is the "diagnosis-without-delivery / documented-but-deferred" pattern.

Four concrete, evidenced gaps:

### Gap 1 — FR-22-4.1's universal anti-duplicate-nesting rule is NOT implemented
- **Docs mandate (Stream C):** §FR-22-4.1 — a transparent (slug-None) wrapper FOLDS into its parent container; "a direct-descendant transparent shell emitted as a second nested container (duplicate nesting)" is a **named FAIL test**. §FR-22-21.1/D166 element-route: a composite IS a container; you never nest a separate `sgs/container` inside it.
- **Code reality (Stream A):** the fold (`_process_container_children` → `_fold_layout_into_attrs`) fires ONLY under slug-None container parents AND only when there's exactly **one** element child. A **resolved composite** (trust-bar, hero) walks its children via a plain `for child: walk()` loop with **no fold**. So `.sgs-trust-bar__inner` (slug-None wrapper) → emitted as its own nested `sgs/container` inside trust-bar. Duplicate nesting — exactly the documented FAIL.
- **Rendered proof (R-22-11, page 8):** `.sgs-trust-bar` is `display:grid` 4-col, but has **one** real child (the nested `div.sgs-container--grid.sgs-cols-4`) → it occupies cell 1; cells 2-4 empty; all 4 badges sit within the left 468px. circleCount=0.

### Gap 2 — the DB's container signals exist but are NOT consumed for nesting
- **Data exists (Stream B):** `block_composition` has 29 rows `wraps_block='sgs/container'`, kind-classified (4 section / 14 layout / 11 content). `sgs/multi-button` = `wraps_block='sgs/container', container_kind='layout', has_inner_blocks=1` (a container-equivalent). `sgs/trust-bar` = section.
- **Consumption (Stream B):** `container_kind` is read **only** as a WHERE filter inside `_is_section_kind_mirror_block` (the value `'section'`); `'layout'`/`'content'` are **exists-but-unused**. `wraps_block` is read **only** at the A2 CSS-lift site (`convert.py:2700`) — never for a wrap/nest decision. `composition_role` read only for `'leaf'`. `accepts_allowed_blocks` = **never read**. `blocks.tier`/`is_class_section_block()` = **defined but never called**.
- So the "this block IS a container-equivalent → don't redundantly nest it" decision has **zero** DB consumption. (Bean: "we have full db tables for it" — correct, and they're unused for this.)

### Gap 3 — sourceMode is forced to 'bound' for every composite with children; there is NO typed-emit path
- **Code (Stream A):** `sourceMode='bound'` is set at **one** site (`convert.py:2819`) for any block that declares `sourceMode` AND has non-empty children. The converter never sets/uses typed.
- **Block reality (render.php):** trust-bar's white circle (`.sgs-trust-bar__circle`) + native icons are emitted **only** in the typed loop (render.php:220). Bound mode just `echo`es `$content` → no circles, attr-less `sgs/icon` (default star). The grid sits on the OUTER wrapper either way → in bound mode that grid has one child = the 1-column bug.
- This is why **typed mode works and bound is broken** (Bean tested). Bean's decision: **retire bound mode** for these composites.

### Gap 4 — the CSS collector inverts the cascade (first-wins base merge)
- **Code (Stream A):** `_collect_css_decls_for_element._merge_into` is **first-wins** for base (non-media) rules (`if p not in target`). CSS is last-wins for equal specificity. So `.sgs-product-card{border:1px solid}` (earlier in source) beats `.sgs-gift-section__card--trial{border:2px dashed accent}` (later) → the trial card emits `1px solid` (proven in the emit). (`@media` rules are already last-wins — an inconsistency.)
- R4 didn't *cause* this; enabling the border lift *surfaced* it. Not hardcoded — wrong precedence.

## Why every prior fix was per-block (answering Bean's question)
The walker's universal `block_composition` consumption was explicitly **DEFERRED in code** (docs: "walker consumption DEFERRED per D109"). In its place, each session added a narrow gate: FR-22-19 routed hero's interior via `has_scalar_media_attrs` (hero-shaped); my change added a top-level `_is_section_kind_mirror_block` exemption (section-tier). Neither implements the universal FR-22-4.1 fold or the container-equivalent collapse — so multi-button (layout-kind) and the trust-bar inner (slug-None under a resolved composite) still slip through. The patchwork is the symptom; the deferred universal rule is the cause.

## PROPOSED UNIVERSAL SOLUTION (DB-driven, R-22-3/9 compliant — for council + Bean review)

Implement the documented universal rules; delete the per-tier patches. Four pillars:

**Pillar 1 — Native (typed) composite emission; retire bound mode.** When the converter resolves a composite that has a native typed content structure (e.g. trust-bar `items[]`), extract the draft content into that structure and emit the composite NATIVELY (no InnerBlocks, no nested container). The block renders its own grid + circle + icons. DB-driven mapping (which BEM child → which typed field) so it's universal, not per-block. Fixes R1 (nesting) + R5 (icons) + R8b (circle) for trust-bar together. Retires bound for these.
- *Council probe:* how to keep the typed-content mapping DB-driven + simple (reuse `supports.sgs.variants`/a typed schema?); fallback for composites with no clean typed structure.

**Pillar 2 — Universal container-equivalent fold.** Implement FR-22-4.1 universally: when a child resolves to a container-equivalent (`wraps_block='sgs/container'` or literal `sgs/container`) and nesting it is redundant (parent already a container / child is a pure structural wrapper), COLLAPSE the layer — fold its layout/CSS onto the parent or hoist its children. Fires at EVERY depth (not just top-level/single-child). Enrichment of the existing fold path, not a 4th walker branch (R-22-3 per D109). Consumes `wraps_block`+`container_kind` (closing Gap 2). Fixes R6 (multi-button) + any residual redundant nesting.
- *Council probe:* does collapsing ever lose needed structure? overlap with Pillar 1 on trust-bar; how to decide "redundant" precisely.

**Pillar 3 — Multi-library + emoji icon-identity extractor.** Fingerprint the draft icon: raw inline `<svg>` path → match against ALL merged icon libraries in `sgs/icon` (not lucide-only); emoji glyph → emoji library → `emojiChar`+`iconSource:'emoji'`. Feeds Pillar 1's `items[].icon` + fixes standalone `sgs/icon` (R5). DB/library-driven.
- *Council probe:* SVG-fingerprint reliability; fallback when no match (don't silently default to star).

**Pillar 4 — CSS cascade-order fix.** Change base-rule merge to last-wins/specificity-aware so a modifier rule overrides its base. Faithfully transfers each element's effective border (trial → 2px dashed; base → 1px solid). Fixes R4/R8c.
- *Council probe:* does anything rely on the current first-wins base behaviour? (aligns base with the already-last-wins @media path).

**Plus:** `autoScroll` default → `true` in trust-bar block.json (Bean: scroll the USPs when columns don't fit, esp. vertical/mobile).

## Symptom → pillar map
| Symptom | Pillar |
|---|---|
| R1 trust-bar 1-col / redundant inner container | P1 (typed) primarily; P2 backstops the general case |
| R5 trust-bar icons = star; R8b circle missing | P1 (typed render) + P3 (icon identity) |
| R6 multi-button double-wrap / button colour-box | P2 (collapse the redundant container layer) |
| R4/R8c trial 2px-dashed clobbered to 1px-solid | P4 (cascade order) |
| auto-scroll off | block.json default flip |

## Compliance
R-22-1 (DB-driven — no slug literals; consumes existing block_composition columns). R-22-3 (enrichment of existing fold/exception, no 4th walker branch — per D109). R-22-9 (one universal mechanism per pillar, no per-block hyperfocus). R-22-11 (live-DOM verified). R-22-14 (render.php discriminates on explicit mode, never empty($content)).

## Open scope question for Bean
Bean said "keep it simple." All four pillars are evidenced as needed, but they are not equal size: P4 (cascade) + auto-scroll are small + isolated; P2 (universal fold) is the core architectural fix; P1 (typed emit) + P3 (icon extractor) are the largest (new extraction capability). The council should advise whether to land them as one coherent change or a sequenced set with gates between.
