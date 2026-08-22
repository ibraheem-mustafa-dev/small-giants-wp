---
doc_type: brief
project: small-giants-wp
spec_id: 39
status: AWAITING-BEAN
date: 2026-08-22
---

# Colour control bundles — one helper per mechanism

**Bean's ask, 2026-08-22:** *"can we use those 3 helpers to make 3 full helpers that group up the
full set of controls for each type that come with the extra gradient controls?"* plus a fourth:
*"an overlay helper … the same functionally to the bg popover but with the alpha channel removed,
the control row looks different … and a separate opacity control paired with it."*

## The problem, in one line

**The paint layer knows there are three gradient mechanisms. The control layer does not.**

- PHP is already partitioned: `sgs_background_paint_decl` (fill), `sgs_text_colour_decl`
  (`background-clip:text` + `color:transparent`), `sgs_border_gradient_css` (masked `::before`).
- JS is not: one generic row (`DesignTokenPicker` + states), one text-specific control, one overlay
  adapter.

The enforcement programme doc states the consequence exactly, and it is already quoted in the
scan-set addendum:

> *"A binary 'does a gradient path exist?' check is INSUFFICIENT: **a text row wired to the
> background mechanism would PASS while rendering nothing.**"*

So rule 31's **193 `row-missing-gradient` findings are a FLOOR with an unknown false-pass rate.**
It counts rows with no gradient path at all and cannot see a row wired to the wrong one.

## The bundles

THREE paint mechanisms (what the CSS does) but FIVE control bundles (what a client configures).
That distinction is the design: overlay is not a fourth CSS mechanism, it is the fill mechanism on
a scrim element plus properties only an overlay has.

| Bundle | Paint mechanism | Extras it owns | Reference to copy |
|---|---|---|---|
| Fill / background | `background-image` on the element's own box | gradient stops/angle | `sgs/container` background row |
| **Overlay** | same fill, on a scrim element | **opacity (per-tier), blend mode, alpha OFF** | the Background panel as it stands after D717/D738/D739 |
| Text | `background-clip:text` + `color:transparent` | gradient stops/angle + the `@supports` fallback rule | `sgs/heading` text row |
| Border | masked `::before` | gradient stops/angle + width | `sgs/heading` border-colour row |
| Shadow | **colour only** | none — `box-shadow` takes a colour, a gradient is not expressible | `ShadowControl` |

**Bean's exception is correct and structural:** shadows are the one colour row that can never carry
a gradient, because CSS has no gradient form for `box-shadow`.

### Overlay bundle — the specifics Bean named

- Alpha channel REMOVED. This is D717: `DesignTokenPicker` stores a palette SLUG only on exact
  string equality, so lowering alpha stores a raw hex and silently unlinks the client's brand
  token. Opacity is the sanctioned transparency mechanism precisely because it leaves the stored
  colour intact.
- The row PRESENTATION and HELP TEXT stay as they are today — Bean's explicit call.
- Opacity travels WITH the colour in the bundle, and carries the device axis (D739).

⛔ **Recommendation on "slider + boolean": ship the SLIDER ALONE, with `allowReset`.** A boolean
beside it means two attributes owning one piece of state, and they can disagree (boolean on, slider
unset). That is the two-owners defect this codebase keeps rediscovering, and it would re-add
attributes one day after D739 removed two per block. `allowReset` already expresses "unset =
inherit desktop"; if discoverability is the worry, strengthen the help sentence rather than adding
a second source of truth. **Bean to confirm.**

## A correction to the three-mechanism model, from D738

The programme doc lists `GradientOverlayControl` as its own mechanism BECAUSE it was single-state
by construction. **D738 removed that constraint** — it is now a thin adapter over the generic row
and renders Normal/Hover as tabs. So on the CONTROL side there are two shapes (generic-with-states,
and text); on the PAINT side there are three. **Key the bundles to the PAINT mechanism** — that is
what determines whether a row renders anything.

## Build order — detector FIRST, not last

This project's triad rule (D542) is that when an item touches more than ~3 blocks, the first
deliverable is the detector. It binds here for a specific reason: **without a mechanism-aware
detector we cannot prove the rollout worked**, because the current check passes a wrongly-wired row.

1. **Make rule 31's `row-missing-gradient` mechanism-aware.** For each row, derive the property it
   paints and assert the gradient path matches THAT mechanism. Expected population must be declared
   before the first live run (`_meta.zeroIsAClaim`), by a method independent of the rule's own code.
   The 193 will move; the direction is not predictable in advance and must be reconciled by
   ENUMERATION, not by subtracting totals.
2. **Build the five bundles**, each copied from its reference block above.
3. **Roll out per bundle**, re-running the detector between each.
4. **Ratchet down** rule 31's `openBacklog` after each wave so the gain cannot silently regress.

## Open questions for Bean

1. **Slider + boolean, or slider alone?** Recommendation above: slider alone.
2. **Does the shadow bundle exist as a fifth helper** (gradients structurally disabled), or stay
   the standalone `ShadowControl` it is now? A fifth helper buys uniformity; staying put avoids
   wrapping a control that has no gradient story to tell.
3. **Gradient parallax — design in now, or add after the bundles land?** It does not exist yet
   (verified: zero attributes across 83 blocks, zero code; the 2026-08-14 council recorded it as
   "a different one that does not exist yet … under investigation as its own item"). Its natural
   home is inside each gradient-capable bundle, which argues for designing the seam now even if the
   effect ships later.

## Explicitly NOT in scope

The 413 open rule-31 findings. This brief changes the SHAPE the standard enforces; paying down the
existing backlog is separate, ratcheted work.
