# core/group → sgs/container — BLOCKED on the align+contentWidth 3-layer mapping, 2026-07-16

verdict: BLOCKED (rolled back per STOP-19)
first_paint_capture_passed: false

**The gate working, not a failure.** The group transformer (`pairings/group_pairing.py`)
is built and its attr mapping is mostly right — but the FIRST live test found a
real layout regression, so it was reverted (STOP-19: roll back a sensitive
regression, don't iterate under context pressure). tagName (D344) is unaffected —
it shipped and is proven.

## The regression (proven live, faq-section group)
core/group `{align:"full", layout:{type:"constrained", contentSize:"800px"}, backgroundColor:"surface"}`:

| | core/group (before) | sgs/container (after) |
|---|---|---|
| outer element width | **1440 (full-bleed)** | **800** ❌ |
| surface background band | spans full width | capped at 800px ❌ |
| inner content width | 800 centred | 752 |

Rendered structure confirms the outer container DOES get `alignfull`
(`<div class="sgs-container … alignfull …">` + a `sgs-container__inner` child),
but it still measures 800px wide.

## Root cause (diagnosed, not yet fixed)
My mapping emitted BOTH `align:"full"` AND `contentWidth:"800px"`. On sgs/container,
`contentWidth` applies as a cap that beats `alignfull` on the OUTER element, so the
whole section shrinks to 800px — the full-bleed coloured band is lost. core/group
instead makes the OUTER full-bleed and constrains only the INNER content band to
800px (via the constrained-layout `> *` max-width, not a cap on the group).

So `layout:{type:constrained, contentSize:X}` on a **full/wide-aligned** group must
NOT map to `contentWidth:X` on the outer. The correct sgs/container mechanism for
"full-bleed section, X-wide centred content" needs to be pinned exactly against the
wrapper's 3-layer model (OUTER align / `__inner` contentWidth band / per-grid-item)
— `class-sgs-container-wrapper.php` `$sgs_resolve_content_width` + the `__inner`
emission. This is precisely the "not a simple transform, needs converter work" the
qc-council NO-GO'd.

## What IS correct in group_pairing.py (keep)
- PAIRED emit (children carried verbatim — verified: heading + accordion + 5 items
  all survived).
- tagName fidelity (no-tagName group → `tagName:"div"`, preserving the exact tag).
- flex decomposition (`layout:{type:flex,justifyContent,orientation}` →
  `layout:"flex"` + `justifyContent` (with `right`→`flex-end` translation) +
  `flexDirection`).
- style/colour/align passthrough (native supports).
- The driver's leaf-first re-parse handles the 53 nested groups.

## What the next session must resolve BEFORE running groups
1. The **constrained-on-aligned** case: how to emit "full-bleed outer + X-wide inner
   band" faithfully. Likely: `align:"full"` (or "wide") on the block + the
   contentWidth applied to the `__inner` only — verify which attr combo the wrapper
   renders that way, on a live probe, per shape.
2. The **plain constrained** case (no align): does `contentWidth:"normal"` alone
   reproduce a centred 1200px group? (untested — the first test was the aligned case.)
3. THEN core/columns + core/column (78) — the per-child flex-basis + responsive
   stacking, still unbuilt (the other half the council flagged).

## State
- Reverted: faq-section back to core/group + the (proven) accordion. Canary
  redeployed to the correct state.
- `group_pairing.py` committed UNAPPLIED with this report. Nothing runs it.
- Safe zone still 180 (groups/columns/column = 175 of it, all pending this).
