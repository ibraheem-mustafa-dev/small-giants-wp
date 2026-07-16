# Visual-diff report — core/columns + core/column → sgs/container (78 instances), 2026-07-16

verdict: PASS
first_paint_capture_passed: true

## What changed
The last migratable pairing. 22 `core/columns` + 56 `core/column` → `sgs/container`.
**Safe zone 84 → 6** — the only remaining core blocks are the 6 deliberately-deferred
`core/query`/`post-template` instances (Bean left #3 blank; migrating them breaks
archive category-filtering + search).

## Mapping (a grid, parent-first — verified vs the wrapper + live DOM)
- **Run order: `core/columns` BEFORE `core/column`** (the parent reads its
  still-core column CHILDREN's `width` attrs to synthesise the grid; if the
  children migrated first, their width would be gone).
- `core/columns` → `sgs/container {layout:"grid", gridTemplateColumns:<synthesised>,
  gridTemplateColumnsMobile:"1fr"}`. The grid tracks come from the children's
  widths (`"45%"` kept; a widthless column → `"1fr"`, matching core's flex:1 fill).
  `style.spacing.blockGap` → `gap`; row `verticalAlignment` → `verticalAlign`
  (the container's declared attr — NOT `alignItems`, which is undeclared; the gate
  caught that). `isStackedOnMobile:false` → drop the mobile override.
- `core/column` → `sgs/container` cell: `width` DROPPED-with-reason (the parent
  grid owns sizing); per-child `verticalAlignment` → **`sgsCustomCss`
  `&selector{align-self:…}`** (Bean-directed 2026-07-16 — the universal per-instance
  CSS escape hatch; sgs/container has no align-self attr). PAIRED emit.

## Live proof (grid computed style + overflow, caches cleared)
| pattern | desktop grid-template-columns | mobile (375) | overflow |
|---|---|---|---|
| about-image-left (45/55) | `554px 677px` (45/55 split) | `279px` (1 col, stacked) | none |
| services-alternating (50/50) | `616px 616px` | `279px` (stacked) | none |
| team-section (3-col) | `410px 410px 410px` | `279px` (stacked) | none |
| pricing-columns | (multi-col grid) | (stacked) | none |

Every columns row renders `display:grid` with the faithful track split on desktop
and stacks to one column on mobile — matching core's ≥782px-split / <782px-stack
behaviour (the container's <768px mobile tier applies `gridTemplateColumnsMobile:1fr`
which BEATS the base grid ratio — the fix after the first attempt stayed 2-col on
mobile). `check-dead-pattern-attrs.py` unchanged (6 known hands-off). 0 parse errors.

## Driver hardening shipped alongside
- `NATIVE_OK` + gate extended with the universal SGS extension attrs
  (`sgsCustomCss`, `sgsHideOn*`, `sgsAnim*`) — injected onto every block server-side
  (`extension-attributes.generated.php`), so emitting `sgsCustomCss` (the align-self
  hatch) is now gate-legal, matching what `check-dead-pattern-attrs.py` already allows.

## ⚠ Process note (caught + recovered)
The first batch aborted mid-run on the `alignItems` gate rejection, and running the
`core/column` pass afterwards corrupted the ordering (children migrated under
not-yet-migrated parents). Recovered by reverting the theme to the clean group-done
state (`163f9fa7`) and re-running only after a FULL dry-run showed zero rejections.
Lesson: a parent-first N→1 pairing must dry-run to zero-refusal BEFORE `--write`,
because a mid-batch abort leaves a half-written tree.
