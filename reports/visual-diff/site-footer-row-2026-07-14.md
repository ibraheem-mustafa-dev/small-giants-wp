---
block: sgs/site-footer-row
date: 2026-07-14
decision: D327
verdict: PASS
first_paint_capture_passed: true
site: sandybrown canary (Mama's Munches homepage footer)
change: "gap + grid columns → FR-S9-6 {desktop,tablet,mobile} object model via the SGS_Container_Wrapper opt-in object branch"
---

# Visual-diff / live-verify — sgs/site-footer-row (D327, FR-S9-6)

## What changed
`gap` → object `{desktop:"48px", mobile:"32px"}`; the columns/`gridTemplateColumns`
flat attrs → one `gridTemplateColumns` object `{desktop:"repeat(3, 1fr)", mobile:"1fr"}`
(preserves the D325 3→1 collapse). `render.php` passes `responsive_model=object`; the
shared `SGS_Container_Wrapper` emits the responsive grid + gap via `sgs_emit_responsive_css()`
(wrapper-owned, R-31-9 mirror). `edit.js` columns + gap controls → `ResponsiveOverride`
(columns exposed as a client-friendly number mapped to the grid template).

## Live verification (sandybrown homepage footer; caches cleared OPcache+LiteSpeed+CDN)

| Check | 1440px | 375px |
|-------|--------|-------|
| Columns row `display` | `grid` ✅ | `grid` ✅ |
| `grid-template-columns` | 3 cols (`394 394 394`) ✅ | **1 col** (`312px`) ✅ — collapse works |
| `gap` | `48px` ✅ | **`32px`** ✅ — mobile override |
| `.sgs-container__inner` renders | yes ✅ | yes ✅ |
| Reflow (`scrollWidth <= innerWidth`) | no overflow ✅ | no overflow ✅ |
| Console errors | none ✅ | none ✅ |

## Graceful migration
The wrapper's legacy columns/grid suppression is gated on `$object_grid` (object model
AND an object `gridTemplateColumns` actually present), so this block renders correctly
whether the stored instance carries the object default or still-flat D325 attrs — the
3→1 collapse + 48→32px gap hold either way. Un-migrated instances switch to the object
path on re-save (D270 re-clone).

## Verdict: PASS — footer row wired to the FR-S9-6 engine, live-verified per tier, no regression.
