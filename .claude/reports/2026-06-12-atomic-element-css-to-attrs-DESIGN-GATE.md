---
doc_type: reference
project: small-giants-wp
thread: cloning-pipeline
title: "DESIGN GATE — lift atomic-element CSS onto block attributes (kill the draft-class scoped-CSS mirroring)"
created: 2026-06-12
status: PRE-BUILD design gate (Rule 7). NOT approved to build. Awaiting council + Bean sign-off.
---

# Design gate — atomic-element CSS → block attributes

## Architectural primitive (plain English — R-22-10)

When the converter recognises an atomic element (a text/heading/label/price/quote leaf) and decides
WHICH block it becomes, it must transfer that element's **own CSS onto the block's own attributes**
(driven by the block's attrs, Rule 1) — NOT preserve it as a scoped stylesheet keyed on the draft's
BEM class. The element renders from its settings, class-independently, and is editable by clients.

## Root cause being fixed (evidence-confirmed 2026-06-12)

A sub-heading's `margin-bottom: 32px` (and font / colour / text-align) is **not dropped** — the
converter preserves it as scoped variation CSS keyed on the draft class `.sgs-section-heading__sub`,
then carries that class onto the emitted block so the CSS matches. **But when the draft wrapper is
dissolved during folding, the child's class is NOT carried** → the scoped CSS matches nothing →
orphaned (live proof: `.sgs-section-heading__sub` exists in a loaded stylesheet but on ZERO rendered
elements; computed margin-bottom = 0). The atomic-leaf emit (`_route_text_leaf` → `_atomic_attrs_for`,
`convert.py:4556/2782`) extracts **content only** (`{text: …}`); CSS goes via
`collect_css_for_classes → variation_buf` (scoped, class-keyed). The CSS→attrs lift machinery
(`_lift_wrapper_css_to_attrs`, `property_suffixes` DB) exists but is used ONLY for wrappers/composites,
never atomic leaves.

**Shared cause:** this orphaning is the same mechanism behind P1 (margin), P2 (Fraunces font), P6
(text-align), and colour misses on dissolved-wrapper text elements — fixing it closes the cluster.

## Lift destinations (grounded 2026-06-12 — heterogeneous per block)

| Block | box | typography | colour | gaps |
|---|---|---|---|---|
| sgs/text | marginTop/Bottom/… (+Tablet/Mobile) | fontSize/Weight/lineHeight | textColour | **NO fontFamily attr** (price→Fraunces has no home) |
| sgs/heading | margin* + padding* | fontFamily/Size/Weight/lineHeight | textColour | — |
| sgs/label | padding* | fontFamily/Size/Weight | textColour | (no margin attr) |
| sgs/quote | bodyMarginBottom*, attributionMarginTop* | bodyFontFamily/Size/Weight/**Style(italic)** | bodyColour/attributionColour | prefixed attrs |

The existing `property_suffixes` DB machinery already resolves property→attr **per block** (handles the
heterogeneous names). Missing attrs (e.g. sgs/text fontFamily) = flag-not-drop gap candidates to ADD.

## Candidate fix-shape (HYPOTHESIS, R-22-7 — for the council)

1. In the atomic-leaf emit path, AFTER content extraction, **lift the element's own box + typography +
   colour CSS onto the block's attrs** via the existing DB-driven property→attr resolver (reuse
   `_lift_wrapper_css_to_attrs` / a sibling; do NOT hand-roll a new mapping dict — R-22-1).
2. **Stop emitting the draft BEM class** on atomic blocks (Rule 1) and stop routing their CSS to the
   class-keyed scoped stylesheet.
3. **Flag-not-drop** any property with no matching attr (e.g. sgs/text fontFamily) → gap candidate to
   add the attr; never silently lose it.
4. Responsive tiers (Tablet/Mobile) lift to the `{attr}Tablet`/`{attr}Mobile` family (the machinery
   already appends bp suffixes).

## Known risks the council MUST stress-test

- **R1 — Do NOT regress the ~13 currently-VERIFIED rows.** Section/top-level elements KEEP their class,
  so their scoped CSS currently WORKS (gift/hero verified). If the fix removes scoped-CSS / class
  emission wholesale, it could break what passes today. The fix must cover atomic leaves WITHOUT
  killing the section-level path that works — or replace both safely. Pin the scope precisely.
- **R2 — Double-application.** If an element's CSS lifts to attrs AND its scoped CSS still loads, both
  paint (e.g. double margin). Removing the scoped CSS for lifted elements must be exact.
- **R3 — Wrapper/atomic double-lift.** An element must not have its CSS lifted once as a wrapper child
  and again as an atomic leaf.
- **R4 — Missing-attr gaps (sgs/text fontFamily).** Flag-not-drop is correct, but until the attr is
  added the font is still wrong → does P2 actually close, or only partially? Decide: add the gap attrs
  in THIS build or defer.
- **R5 — Rule 1 vs current passing CSS.** Some currently-correct styling may rely on emitted draft
  classes. Enumerate what breaks when class emission stops.
- **R6 — Existing content / deprecated.** Atomic blocks are dynamic (render.php) → additive attrs are
  back-compat-safe, but confirm. Version-bump for CDN.
- **R7 — Properties with no attr on ANY suitable block (decorative/rare).** Where do they go if scoped
  CSS is retired? Keep a scoped-CSS fallback for genuinely unmapped props, or accept the loss with a
  trace?

## Acceptance

featured/ingredients/gift/social sub-element margin-bottom + font + text-align + colour land on the
block's attributes and render correctly on live page 8 (per-side/per-tier getComputedStyle on the
rendered native element, NOT the draft class); the ~13 verified rows stay verified; existing content
unbroken; no draft BEM element class on emitted atomic blocks (Rule 1).
