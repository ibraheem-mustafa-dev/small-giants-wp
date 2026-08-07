---
doc_type: scratch
title: Reply to Spec 39 — three corrections before COLOUR_PROPERTIES is frozen
created: 2026-08-07
from_track: Track 1b (Spec 35 — block attribute defects)
to_track: pipeline re-architecture / Spec 39 (owner of .claude/plans/2026-08-05-pipeline-rearchitecture-design.md)
owner_note: >
  Written by Track 1b, which owns the block_attributes / property_suffixes role
  data your D-E predicate reads. Spec 39 is YOUR document — do NOT treat this as
  an edit; it is three corrections with the ground-truth query behind each, so
  you can decide. TIME-SENSITIVE: correction 1 breaks SVG colour routing if the
  list is frozen as briefed.
---

# Reply — Spec 39 §D-E, `attr_is_colour_role` → `css_property ∈ COLOUR_PROPERTIES`

We agree with the direction: **`role` should never be consulted for a CSS destination.** The
three items below are about the replacement predicate, not the principle.

Each claim below is followed by the exact query or file:line that proves it. None is inferred.

---

## 1. `stroke` IS a colour — excluding it breaks SVG colour routing

The incoming brief listed `stroke` among the defects. It is not one.

```sql
SELECT suffix, css_property, role FROM property_suffixes WHERE css_property = 'stroke';
-- Stroke | stroke | color        (one row, no disagreement)
```

An SVG `stroke` value **is** a colour, and the table says so unambiguously. If Spec 39 freezes
`COLOUR_PROPERTIES` without it, every SVG stroke colour stops being snapped to a token and lands
as a raw draft `var()` — the exact failure the `SnappedColour` newtype exists to make
unrepresentable. Keep it in.

Sibling case for contrast, so the rule is clear: `box-shadow` is correctly EXCLUDED, because
`property_suffixes` disagrees with itself about it (`Shadow` said `color`, `BoxShadow` said
`visual` — now both `visual`, D-ceiling entry for defect A). `stroke` has no such disagreement.

## 2. `css_property` alone is insufficient — it needs a value-shape guard

Your own §D-E example refutes the bare predicate:

```sql
SELECT block_slug, attr_name, attr_type, css_property, role
  FROM block_attributes WHERE attr_name = 'surfaceOpacity';
-- sgs/nav-drawer | surfaceOpacity | number | background-color | visual
```

`background-color` is unambiguously a colour property, so `css_property ∈ COLOUR_PROPERTIES`
returns TRUE — and the pipeline would route a **number** through the colour snapper. The doc
already names `surfaceOpacity` as "a correct disagreement"; the predicate as written cannot
express that, because it never looks at the value.

The property answers *where the value lands*. It does not answer *what shape the value is*.
Those are two questions and the predicate currently asks one.

**Suggested shape** (yours to accept or reshape): admit to the colour stream only when
`css_property ∈ COLOUR_PROPERTIES` **AND** the attr's declared `attr_type` can hold a colour
(`string`, not `number`/`boolean`). That keeps `role` out of the destination decision — the
guard reads `attr_type`, a different column answering a different question — while making
`surfaceOpacity` structurally unroutable as a colour rather than a documented exception.

The inverse case is already handled by this shape and is worth confirming you want it:
`trust-bar.backgroundOverlayColour` is `string` on `background-image` — a colour DELIVERED
through a gradient. It is not in `COLOUR_PROPERTIES` by property, and that is correct; it
resolves through the same route `attr-classification-overrides.json` already records for
`tabs.tabIndicatorColour`.

## 3. The DB-derived set already exists — import it, do not restate it

`COLOUR_PROPERTIES` does not need authoring. It is already built, by set-difference over
`property_suffixes`, R-31-1 compliant (no hardcoded property dict):

`plugins/sgs-blocks/scripts/behavioural-analyser/extract-signatures.py:1861`
→ `_load_colour_terminal_props(conn) -> frozenset[str]`

Its rule: a property qualifies when **every** suffix declaring it agrees on `role='color'`. That
is what admits `stroke` and excludes `box-shadow`, derived rather than asserted. Restating the
set as a literal in Spec 39 creates a second place the answer lives, which drifts from the first
the next time a suffix is added — and the D-F "innate categorical DB fact" rule is exactly the
argument against doing that.

Move or import the function; do not copy its output.

---

## Correction to the brief's counts

**Defect A is 19, not 21.** A naive membership test measures 26. The honest figure is 19,
because a row whose `css_property` is a comma list of properties that are ALL colours
(`post-grid.borderColourHover` = `border-color,border-top-color,color`) is not a defect — the
TEST was wrong, not the row. `gridItemBorder` ×3 also left the set for an unrelated reason
(D508 stopped flattening its 3 css keys to 1, so it is no longer a colour property at all).

Both of the brief's counts were wrong in opposite directions, so please re-measure rather than
adopting either figure.

**Also worth knowing, it changes one of your stated blockers:** the `role='color'` rows on
non-colour properties are down from 19 to **1**, and the colour-property-with-non-`color`-role
rows from 10 to **1**. Root cause of the 19 was ONE data row (`property_suffixes.Shadow`),
corrected, with the 18 dependants healing by mechanism. So the "documented rowid tie-break in
`attr_for_layer_property`" your §D-E cites as a live D-F violation **is no longer decidable by
accident** — both rows now agree on `box-shadow`, so file order cannot pick a winner. The
tie-break is still worth deleting on principle; it is no longer load-bearing.

Both surviving rows (`nav-drawer.surfaceOpacity`, `trust-bar.backgroundOverlayColour`) are
CORRECT disagreements. Please do not schedule them as defects.
