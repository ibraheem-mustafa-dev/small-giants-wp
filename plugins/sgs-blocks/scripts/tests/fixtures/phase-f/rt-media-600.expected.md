# Expected render — rt-media-600.draft.html

## HIGH gap this fixture red-teams

**M3-S2: non-device-tier breakpoints are silently dropped.**

The current converter recognises only the SGS device-tier breakpoints (767px/768px → Mobile, 1023px/1024px → Tablet). A `@media (max-width:600px)` rule is not matched by `_GRID_TABLET_BP` / `_GRID_DESKTOP_BP` → the entire rule block is skipped without writing to `declare_input` or `attribute_gap_candidates`.

## What the current converter does wrong

The converter's breakpoint-matching code (convert.py `_GRID_TABLET_BP`, `_GRID_DESKTOP_BP`, `_BP_SUFFIX_MAP`) contains only numeric literals for the SGS device tiers. Any other threshold (600, 640, 481, 781 — WP core's columns stack point) falls into the `else: continue` path and the rule is silently discarded. The declarations `grid-template-columns:1fr; gap:16px; padding:40px 16px` at 600px are UNACCOUNTED.

## Target correct behaviour (the oracle must enforce — F-ii, D228-locked)

D228 and the `device-tier-vs-visual-breakpoints-are-distinct` memory rule lock this decision:

1. **Device-tier `@media` values** (≤767px → Mobile, ≤1023px → Tablet, or their equivalents) → map to `…Mobile` / `…Tablet` tier attrs via `db.breakpoint_suffix_rules()`.
2. **Arbitrary visual breakpoints** (`@media (max-width:600px)` here) → MUST be **preserved faithfully**, not snapped to 768. Implement as an F-ii passthrough: emit as a raw uid-scoped rule into D3 / passthrough CSS (with the section UID as the class scope), or log to `attribute_gap_candidates` with `proposed_action='visual-breakpoint: threshold=600px'`. NEVER snap, NEVER drop.
3. The `@media (max-width:767px) { grid-template-columns: repeat(2, 1fr) }` rule IS a device-tier value (Mobile) → MUST map to `gridTemplateColumnsMobile`.

## Classification of breakpoints in this fixture

| Rule | Threshold | Classification | Correct action |
|------|-----------|---------------|----------------|
| `@media (max-width:600px)` | 600px | **Visual breakpoint** — not a device tier | F-ii passthrough / D3 gap-candidate |
| `@media (max-width:767px)` | 767px | **Device-tier Mobile** | Map to `…Mobile` attrs |

## Block emitted

`sgs/feature-grid` (Method-2 composite; `.sgs-feature-grid` → `sgs/feature-grid`).

## Required attrs

| CSS source | Attr | Value | Tier | Status |
|-----------|------|-------|------|--------|
| `.__inner { grid-template-columns: repeat(3, 1fr) }` | `gridTemplateColumns` | `repeat(3, 1fr)` | Desktop | **COVERED** |
| `.__inner { grid-template-columns: repeat(2, 1fr) }` (@media ≤767px) | `gridTemplateColumnsMobile` | `repeat(2, 1fr)` | Mobile | **COVERED** |
| `.__inner { gap: 28px }` | `gap` | `28px` | Desktop | **COVERED** |
| `.__inner { max-width: 1100px; margin: 0 auto }` | `contentWidth` | `1100px` | Desktop | **COVERED** |
| `.sgs-feature-grid { padding: 56px 24px }` | `paddingTop` / `paddingBottom` | `56px` | Desktop | **COVERED** |
| `.sgs-feature-grid { background: #fafaf8 }` | `style.color.background` | `#fafaf8` | Desktop | **COVERED** |
| `@media (max-width:600px) { .__inner { grid-template-columns: 1fr; gap: 16px } }` | — | — | — | **GAP / F-ii passthrough** — must NOT be silently dropped; must appear in `attribute_gap_candidates` or D3 passthrough with threshold preserved |
| `@media (max-width:600px) { .sgs-feature-grid { padding: 40px 16px } }` | — | — | — | **GAP / F-ii passthrough** — same as above |

## CHEAT-FORBIDDEN

- Snapping the 600px breakpoint to 768px (Mobile tier) and writing the declarations as `…Mobile` attrs is a **CHEAT** — this conflates a visual breakpoint with a device tier (D228 violation). A gate must flag `threshold=600 routed as Mobile` as a CHEAT cell.
- Silently dropping the 600px rules entirely (no `declare_input` entry, no `attribute_gap_candidates` row) is a **hard FAIL** of the ledger (§12.2.1 UNACCOUNTED).
