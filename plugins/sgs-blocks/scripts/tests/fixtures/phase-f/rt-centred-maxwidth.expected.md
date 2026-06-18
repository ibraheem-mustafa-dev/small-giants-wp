# Expected render — rt-centred-maxwidth.draft.html

## HIGH gap this fixture red-teams

**MF-3 (council RISK 2, HIGH): section-root `max-width` mis-routed to L2 `contentWidth` instead of L1 OUTER `customWidth`.**

The current `_detect_content_layer` (convert.py) detects a `max-width + margin:auto` signature and routes it to `contentWidth` (L2 inner band). But here there IS no separate inner band — the section ROOT itself carries `max-width:1200px;margin:0 auto`. This is an L1 OUTER constraint (`widthMode:'custom'` + `customWidth:'1200px'`), not a nested content-width band.

Mis-routing this to `contentWidth` would constrain the inner content to 1200px while the OUTER section wrapper potentially expands to full width — the opposite of the intended layout.

## What the current converter does wrong

`_detect_content_layer` (convert.py) examines CSS declarations only (`max-width` present + `margin` contains `auto`). It does NOT check the structural position of the node — i.e. whether it is the section ROOT element or a direct-descendant inner element. A section root with `max-width+margin:auto` triggers the L2 detection and routes `max-width` to `contentWidth`. No `customWidth` / `widthMode` attrs are set. The section's outer width goes unconstrained.

This is the exact failure mode MF-3 (§3 step 1, §10 must-fix) names: **L2 detection must fire ONLY on a non-root, direct-descendant inner element.**

## Target correct behaviour (the oracle must enforce)

1. The layer detector MUST receive the node's **structural position** as input: `is_root` = True when the node is the outermost `<section>` / `<div>` of a section.
2. When `is_root=True` AND `max-width + margin:auto` are present → route to **L1 OUTER**: `widthMode='custom'`, `customWidth='1200px'`, `marginLeft='auto'`, `marginRight='auto'`. NOT to `contentWidth`.
3. When `is_root=False` AND `max-width + margin:auto` are present on a direct-descendant inner element → route to **L2**: `contentWidth='Npx'`.
4. Both paths must be mutually exclusive, enforced by a guard at the detector entry point (§3 step 1 build requirement).
5. The `display:grid; grid-template-columns; gap; align-items` on the ROOT are L3 grid attrs on the section itself (a flat grid section, no separate inner band). They route to `gridTemplateColumns`, `gap`, `verticalAlign` at L1/L3.

## Block emitted

`sgs/card-grid` (Method-2; `.sgs-team-member-grid` → closest block: `sgs/card-grid` or `sgs/feature-grid`; inner items are `sgs/team-member` InnerBlocks).

**This is a FLAT GRID section** (the root IS the grid container — no separate `__inner` band). This is the key structural difference from `sgs-card-grid.html` (which has a `__inner` wrapper) and is precisely why the MF-3 guard matters.

## Required attrs

| CSS source | Attr | Value | Tier | Status |
|-----------|------|-------|------|--------|
| `.sgs-team-member-grid { max-width: 1200px }` | `customWidth` | `1200px` | Desktop | **COVERED** — routes to L1 OUTER, NOT to L2 `contentWidth` |
| `.sgs-team-member-grid { margin: 0 auto }` | `widthMode` | `'custom'` | Desktop | **COVERED** — L1 OUTER widthMode flag |
| `.sgs-team-member-grid { display: grid; grid-template-columns: repeat(4, 1fr) }` | `gridTemplateColumns` | `repeat(4, 1fr)` | Desktop | **COVERED** |
| `.sgs-team-member-grid { gap: 32px }` | `gap` | `32px` | Desktop | **COVERED** |
| `.sgs-team-member-grid { padding: 64px 24px }` | `paddingTop` / `paddingBottom` | `64px` | Desktop | **COVERED** |
| `.sgs-team-member-grid { background: #f5f0eb }` | `style.color.background` | `#f5f0eb` | Desktop | **COVERED** |
| `.sgs-team-member-grid { align-items: start }` | `verticalAlign` | `start` | Desktop | **COVERED** |
| `@media ≤767px { grid-template-columns: repeat(2, 1fr) }` | `gridTemplateColumnsMobile` | `repeat(2, 1fr)` | Mobile | **COVERED** |
| `@media ≤767px { gap: 16px }` | `gapMobile` | `16px` | Mobile | **COVERED** |
| `@media ≤767px { padding: 40px 16px }` | `paddingTopMobile` / `paddingBottomMobile` | `40px` | Mobile | **COVERED** |

## CHEAT-FORBIDDEN

- Routing `max-width:1200px` to `contentWidth` when the node is the section root is a **CHEAT** (MF-3 violation). The gate must flag `L2 detected on root node` as a CHEAT cell.
- Omitting `widthMode='custom'` from the emitted attrs when `customWidth` is set is a **CHEAT** (the section would render as full-width despite having a width constraint).
- Emitting `style="max-width: 1200px"` as inline CSS is a **CHEAT** (R-22-6).

## Anti-coincidental-default verification

- `max-width:1200px` is deliberately NOT the default theme `contentSize` (780px) — a COVERED verdict here requires real routing, not default-match.
- `align-items:start` is deliberately NOT `center` (the sgs/container default `verticalAlign`) — real transfer, not default-match.
- `grid-template-columns:repeat(4,1fr)` is deliberately non-default — real transfer.
