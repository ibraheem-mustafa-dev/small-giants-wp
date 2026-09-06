# C5 scoping — "bespoke panel duplicating a native supports panel"

**doc_type:** report
**Date:** 2026-09-04
**Source item:** reconciliation backlog item C5 (Spec 35 Part L, "no native-supports panel
duplicated" — flagged unverifiable)

## Outcome: (b-ii), with a named (b-i) fallback if Bean wants it

**Do not build a general detector for this rule.** Recommend dropping the general item from the
mechanical backlog. A narrow, well-specified sub-case exists (below) but is a migration-completion
task, not a lint-gate task, and its population is already fully enumerated by hand — a detector
would find nothing a human hasn't already found.

## What Part L already established (verified against code this session)

Spec 35 Part L (`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md:818-824`) already correctly says:
"no gate exists… `check-duplicate-controls.js`, `check-shared-panel-schema.js` and
`check-dead-controls.js` all target different bug classes."

Confirmed by reading `plugins/sgs-blocks/scripts/check-duplicate-controls.js` in full: its three
checks are (1) universal `sgsHover*` panel vs a block's private `*Hover` attrs, (2) two JSX controls
in one `edit.js` writing the same attribute, (3) a composite's own control duplicating a child
InnerBlocks control's typography/colour. None of the three compares an SGS bespoke panel against a
native WordPress `supports` panel. Part L's finding stands; **CO-15's separate claim elsewhere in
the same spec file ("Enforced by `check-duplicate-controls.js`") was stale and contradicted it — 
corrected in this session's edit to CO-15.**

## Why a general detector is not buildable without a false-positive blowup

Spec 35 Part G's D402 verdict table (`35-BLOCK-INSPECTOR-UX-STANDARD.md:563-571`) is the
authoritative per-property ruling on "native vs bespoke", and most rulings are **KEEP SGS**, not
duplicate-to-fix:

| Support | Verdict | Why bespoke wins |
|---|---|---|
| `shadow` | KEEP SGS | `ShadowControl` + `sgs_shadow_value()` exceeds the native preset picker |
| `dimensions.minHeight` | KEEP SGS | Per-breakpoint attr families beat native's single value |
| `position.sticky` | KEEP SGS | Collides with the D400 behaviour cascade |
| `lightbox` (gallery) | KEEP SGS | Bespoke has more features |
| `filter.duotone` | **ADOPT** | Nothing hand-rolled exists; free client value |
| `dimensions.aspectRatio` | **ADOPT** | Replaces 4 inconsistent per-block attrs |

A detector built on "does this block have a bespoke control that overlaps a native `supports`
family?" cannot distinguish a deliberate KEEP-SGS case from a real ADOPT-case without per-property
capability knowledge baked in — exactly the failure mode that killed
`scripts/scattered-element-controls.js` (deleted 2026-09-02 after ~600 false positives from a flat
DB-column match with no capability awareness; see `plugins/sgs-blocks/CLAUDE.md`, "DELETED, do not
rebuild it"). Building this detector risks reproducing that incident on a smaller but still real
scale.

## The one narrow, well-specified sub-case — and why it's still not worth a detector today

Part L itself already isolated the buildable slice: **only `aspectRatio` (5 blocks) and `duotone`
(2 blocks) are named ADOPT cases** (line 831-832: *"Reword this item to name only aspectRatio +
duotone"*). Verified live: `dimensions.aspectRatio` and `filter.duotone` are each declared in only
5 and 2 `block.json` files respectively (`post-grid`, `gallery`, `card-grid`, `image-sequence`,
`media` for aspectRatio-adjacent; `gallery`, `media` declare `filter`).

Even restricted to just these two properties, a dedicated gate is not the right next step, because:

1. **The candidate set is already fully enumerated by hand** in Part L's own text — a detector
   would not discover anything new; the work item is "migrate these 7 blocks", not "find more".
2. **It's a migration, not a regression risk today.** Nothing currently hand-rolls a competing
   aspect-ratio/duotone control that a detector needs to catch drifting back in — there's no
   evidence of churn here that would justify a standing gate.
3. **If Bean wants forward protection once the migration lands**, the buildable version is: flag
   any block declaring a custom attribute whose name matches `/aspectRatio|duotone/i` in
   `block.json` `attributes` while NOT declaring the matching native `supports.dimensions.aspectRatio`
   / `supports.filter.duotone` key. That is a two-line, self-tested, WARN-only check — cheap to add
   later, at the point the migration actually happens, rather than now against a rule with nothing
   to enforce yet.

## Recommendation to Bean

Drop the general C5 item from the mechanical backlog as "descoped — not actionable without
per-property capability data that already lives in Part G's verdict table, not a detector". If the
aspectRatio/duotone migration (Wave 3.5 / T3.5, referenced under Part G) is picked up later, add the
two-line narrow gate above as part of that work, not as a standalone task now.
