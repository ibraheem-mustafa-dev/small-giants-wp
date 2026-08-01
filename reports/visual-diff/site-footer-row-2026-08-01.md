---
doc_type: visual-diff
block: sgs/site-footer-row
date: 2026-08-01
verdict: PASS
first_paint_capture_passed: true
decision: D455
site: sandybrown-nightingale-600381.hostingersite.com
---

# sgs/site-footer-row — visual diff, D455 (column count becomes a content-aware ceiling)

## The cause, measured before changing anything

All three live footer rows render `display:grid`. Their column count was driven
only by `@media (max-width:1023px)` and `@media (max-width:767px)` — no
`@container` variant exists for `grid-template-columns` on any of them. Measured
to the single pixel on the live canary:

| slot | ≥1024px | 1023–768px | ≤767px |
|---|---|---|---|
| top | 2 tracks | 3 tracks | 1 track |
| columns | 4 tracks | 3 tracks | 1 track |
| bottom | 3 tracks | 3 tracks | 1 track |

Two clean single-pixel cliffs — the fingerprint of a fixed rule. At the mobile
cliff the content needed only **496px of the 767px available (31% spare)**,
measured as intrinsic `max-content` width per child, not stretched `scrollWidth`
(a grid-stretched child reports the track width and proves nothing). A `@media`
rule cannot read content size, so that collapse was **structurally incapable of
ever being organic**.

**Correction recorded:** the `@container … flex-basis:100%` rule in this block's
`style.css` was initially assumed to be the same defect as the header's. It is
not. It *matches* (computed `flex-basis: 100%` on children below 767px) but is
visually **inert**, because a grid item ignores `flex-basis`. It was deleted
anyway — see "latent half" below.

## What changed

`supports.sgs.intrinsicColumns` (block.json) opts this block into a bounded
auto-fit track list, so the operator's count is a **ceiling** that degrades with
available width rather than a fixed number that only changes at a breakpoint.
Opt-in per block type, read from the block registry by
`sgs_block_wants_intrinsic_columns()` — never a hardcoded block-name list
(R-31-1), and deliberately not universal, because flipping every grid container
at once would change the rendered column count of card grids, feature grids and
every cloned layout on every site, none of which has been measured.

Served CSS on the canary after deploy (fetched from the lifted stylesheet):

```css
/* desktop, N=4 */
.sgs-container-a3312605>.sgs-container__inner{display:grid;
  grid-template-columns:repeat(auto-fit,minmax(min(100%,max(
    var(--sgs-col-basis,16rem),calc((100% - (3 * 48px)) / 4))),1fr));align-items:top}
/* tablet, N=3 */
@media(max-width:1023px){…calc((100% - (2 * 48px)) / 3)…}
/* mobile, N=1 */
@media(max-width:767px){…grid-template-columns:repeat(1,1fr)}
```

**The gap term resolved to the real 48px, not 0.** This is the one thing that had
to be got right: under the object responsive model the wrapper deliberately
blanks its flat `$gap` local (`class-sgs-container-wrapper.php` ~line 160)
because `sgs_emit_responsive_css()` owns that property. A calc built from that
local would have silently used `0`, and an under-counted gap lets exactly one
extra column squeeze in — the documented failure mode of this pattern. Hence
`sgs_container_tier_gap()`, which resolves the tier gap under either model.

## Result — live sweep, 1400 → 320px

| width | top | columns | bottom |
|---|---|---|---|
| 1024 | 2 | 3 | 3 |
| 1023 | 3 | 3 | 3 |
| 900 | 3 | 3 | 3 |
| **860** | **2** | **2** | **2** |
| 800 | 2 | 2 | 2 |
| 768 | 2 | 2 | 2 |
| **767** | **1** | **1** | **1** |

**The tablet band is fixed — this was the reported complaint.** Between 768 and
1023 the footer now shows 3 or 2 columns depending on whether they fit, with a
genuine content-driven transition at **860px**. Previously nothing whatsoever
changed across that entire band; it sat at a forced count until falling off the
767px cliff. The `columns` row also now transitions 4→3 at **1160px** — content,
not a breakpoint.

**Horizontal overflow: 0 of 109 swept widths.**

## Remaining hard switch at 767px — deliberate, and Bean's call

The ≤767px snap to a single column is still a cliff. It is not a bug in the
mechanism: `columnsMobile` is authored as `1`, and a ceiling of 1 can only ever
be 1 track. `sgs_intrinsic_columns_track()` short-circuits `count === 1` to
`repeat(1,1fr)` on purpose — dividing the row by 1 would pin the track to the
full width and defeat the `min(100%)` guard.

This matches the stated intent ("footer rows are supposed to stack on mobile").
If the phone range should also be organic, the fix is authoring, not code: raise
`columnsMobile` (or leave it unset to inherit tablet) and let the basis decide.
**Flagged for Bean rather than decided.**

## First-paint capture

Measured at `domcontentloaded`, before `networkidle`, then re-measured settled,
to catch a flash of a different column count.

| viewport | tracks at first paint (top/columns/bottom) | settled | shift |
|---|---|---|---|
| 390px | 1 / 1 / 1 | 1 / 1 / 1 | none |
| 768px | 2 / 2 / 2 | 2 / 2 / 2 | none |
| 1440px | 2 / 4 / 3 | 2 / 4 / 3 | none |

`first_paint_capture_passed: true` — the intrinsic track list is resolved by the
browser at first paint, as expected for pure CSS with no JS involved.

## Latent half closed

The inert `@container … flex-basis:100%` rule was deleted and replaced with
`flex: 1 1 min(100%, var(--sgs-col-basis, 16rem))`. Flex properties do not apply
to grid items, so this is inert-by-construction on the three grid rows today —
the same property the old rule depended on, used the other way round. It closes
the latent failure: the moment an operator switched a row to Cluster, the old
rule would have hard-stacked it at 767px with room to spare, exactly as the
header did.

Accepted trade-off, from the research: with `flex-grow` a lone item on a wrapped
last row stretches to fill it, and there is no CSS-native fix (grid's `auto-fit`
has no equivalent problem — which is why the columns row stays on grid).

## Editor surface

Inspector label changed `Columns` → **`Maximum columns`**, and its help text now
reads "The MOST columns to show at this device — fewer are used automatically
when there is not enough room". A control that kept promising an exact count
would now be lying to the client.

## Not verified

- **Browser text zoom at 200% (WCAG 1.4.4).** Not measured; no honest instrument
  available (`deviceScaleFactor` was empirically confirmed to be a
  rendering-resolution knob with no layout effect, and root-font-size scaling
  does not reach SGS typography because theme.json declares those sizes in `px`).
  The basis is `rem` precisely so zoom works, but that is reasoning, not
  measurement.
- **Realistic footer content.** The live canary footer currently carries sparse
  placeholder content (one row reads "T1TOP B"; two columns measured 0px natural
  width). The mechanism finding is unaffected — a `@media` cliff is
  content-independent by construction — but the exact transition widths (860px,
  1160px) will move with real copy. Re-measure once real footer content lands.
- **Safari/WebKit.** WebKit bug #256047 reports `auto-fit` tracks collapsing
  under `inline-size` containment, which is exactly this combination
  (`container-type: inline-size` is set on these rows). **Not yet tested in
  WebKit** — the sweep above ran in Chromium. This is the highest-priority
  outstanding check on this change.
- **Bean's eye (R-31-13).**
