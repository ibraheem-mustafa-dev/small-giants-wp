---
verdict: PASS
first_paint_capture_passed: true
block: sgs/before-after
date: 2026-07-31
spec: 38
wave: C
surface: frontend + block editor
canary: https://sandybrown-nightingale-600381.hostingersite.com/motion-canary-wave-c/ (page 2075)
harness: plugins/sgs-blocks/scripts/motion-qa/probe-wave-c.mjs + probe-wave-c-editor.mjs
---

# sgs/before-after (NET-NEW) — Spec 38 FR-38-13 (Wave C)

## First paint (no JS help required)

Two instances on one page. Instance 1 `912 × 360`, instance 2 `1200 × 360`, both
`opacity: 1` / `visibility: visible`. **4 `<img>` elements across the two blocks** — both the
before and the after image are always in the markup, so a visitor with JS blocked still gets a
real comparison. Zero page errors, zero failed requests.

## Per-render fatal class — the thing a single-instance page cannot test

A top-level `function` declared in a `render.php` fatals on the SECOND instance. This block's
image helper was written as a closure specifically to avoid that, and the previous session
recorded the case as **owed and unproven**. It is now proven: **two instances render on one
page with zero PHP fatals** (page HTML contains no `Fatal error`, HTTP 200, 169 KB).

## Named observable signal — measured

The divider position lives in `--sgs-before-after-position` on the block root.

| Layer | Arm | before | during | settled |
|---|---|---|---|---|
| GSAP drag on the image area | no-preference | 50 | **40** | 40 |
| GSAP drag on the image area | reduce | 50 | **40** | 40 |
| Native range input | no-preference | 40% | — | **17%** |
| Native range input | reduce | 40% | — | **17%** |

A full pointer trail was captured to confirm it TRACKS rather than jumps:
`50% → 78 → 75 → 71 → 68 → 64 → 61 → 57 → 54 → 50 → 47 → 44 → 40%` — twelve distinct
intermediate values following the pointer across the stage.

**Reduced motion is deliberately IDENTICAL here, and that is the pass condition, not a
missing control.** §10 classifies drag as SIMPLIFY: it is user-driven input, so it must keep
working under `reduce`. This block has no momentum to drop in the first place (a comparison
divider must stop exactly where released, so InertiaPlugin is deliberately unused), so
"unchanged under reduce" IS the contract. The discriminating control for the whole run lives
on `sgs/gallery` and `sgs/image-sequence`, where the two arms genuinely diverge — proving the
emulation was live during these readings rather than inert.

## A false alarm I recorded against myself

An earlier run reported instance 2's divider as "never moved" (50 → 50). It had moved through
twelve values and landed back on 50 by arithmetic coincidence: the drag started at 80% of a
1200px stage (960px) and travelled 360px, and 600/1200 is exactly 50%. Reading only the
endpoints made a working block look broken. The trail capture above exists because of that.

## Editor surface (D388) — a REAL defect found and fixed

The editor probe found `sgs/before-after` returning **HTTP 400** from
`/wp/v2/block-renderer/sgs/before-after`, so the block showed "Preview failed to load" for
every instance while the frontend rendered perfectly.

Cause: `<ServerSideRender>` serialises an unset attribute as an EMPTY STRING, and eight
attributes were declared as plain `integer`/`number` with a `null` default
(`beforeImageId`, `afterImageId`, `labelFontSize`, `labelFontSizeTablet`,
`labelFontSizeMobile`, `labelLineHeight`, `heightTablet`, `heightMobile`). The REST schema
rejects `""` for those types. Fixed to the house convention `[ <numeric>, "string" ]`
(`sgs/heading`, `sgs/text` already do this). `render.php` already coerces with `(int)` or a
null check, so no rendered output changes.

**No frontend check could ever have caught this** — that is precisely why D388 requires opening
the real editor.

Post-fix: 2 instances present, selectable, **13 inspector panels**, zero crash surfaces.

## What this report does NOT claim

- No human eye has judged the drag's feel (R-31-13 not yet given).
- Vertical orientation is unmeasured; only `orientation: horizontal` was exercised.
- Touch drag is unmeasured — the range input carries native touch by construction, but that is
  a reading of the markup, not a device measurement.

---

# UPDATE (later same day) — instance-1 width collapse, root-caused and fixed; separate GSAP-import fix

**Not committed, not deployed** — files edited: `plugins/sgs-blocks/src/blocks/before-after/style.css`,
`plugins/sgs-blocks/src/blocks/before-after/view.js`.

## 1. Width collapse — the measured symptom (as escalated by the standards review)

Instance 1 rendered far narrower than instance 2 at every width from 767px up to 1440px —
wider than the originally-flagged 767–900px band:

| Viewport | Instance 1 (BEFORE fix) | Instance 2 (BEFORE fix) |
|---|---|---|
| 375px | 312px (full column) | 312px (full column) |
| 767px | 224px | 704px |
| 768px | 225px | 705px |
| 900px | 357px | 837px |
| 1024px | 961px | 961px (coincidentally equal) |
| 1440px | 897px | 1200px |

No stylesheet rule anywhere set a numeric width or margin on either instance — the earlier
review's "found no match" was correct and was treated as a lead, not a conclusion.

## Root cause — PROVEN

**`.wp-block-sgs-before-after` sets `overflow: hidden`, which establishes a new block
formatting context (BFC). A BFC-root box that lands vertically alongside an uncleared CSS
float is shrunk by the browser to fit the space remaining beside the float, instead of
flowing full width below it (CSS 2.1 §9.5).**

Two `alignleft` (`float: left`) `sgs-responsive-logo` demo blocks sit earlier on this canary
page, 240px wide each (480px combined). Instance 1 is the block whose top edge happens to
land within their vertical span; instance 2, pushed further down by instance 1's own 360px
height, clears them.

**Evidence that proves the mechanism** (live DOM, Chrome DevTools MCP, 768px, URL-verified in
the same call as every reading):

| Reading | Value |
|---|---|
| Floats' combined rect | `left: 24, right: 504, bottom: 254.515625` |
| Instance 1 rect | `left: 504, width: 225, top: 254.234375` |
| Instance 1 left edge | `504` — exactly the floats' combined right edge |
| Instance 1 top edge | within 0.3px of the floats' bottom edge |
| Instance 1 width | `225 = 729 (content-area right) − 504` — exact |
| Instance 2 top edge | `638.234375` — well below the floats |

**The two named traps, ruled out with evidence:**

1. *Clean cliff at a round breakpoint = rule fingerprint.* An exhaustive CSSOM scan
   (recursing `@media`/`@layer`/`@supports`/`@container`, matching every rule against both
   live elements via `Element.matches()`) found **zero** rules setting `width`/`margin` on
   either instance. The apparent "band" was never a media query — it's where accumulated text
   reflow above the floats crosses their vertical extent. Proof it isn't a breakpoint: the
   divergence was still present at 1440px (897 vs 1200), outside the originally-flagged band.
2. *A CSS rule that looks right but doesn't win.* N/A — there was no candidate rule to
   trust falsely. Instead, a full computed-style diff (~300 properties) between the two
   instances showed only `width`/`inline-size`/`margin-left` (and derived
   `transform-origin`/`perspective-origin`) differed; `float`, `display`, `position` were
   identical — consistent with pure BFC-vs-float geometry, not a differing rule.

## The fix

`style.css`: added `clear: both;` to `.wp-block-sgs-before-after` (alongside the existing
`overflow: hidden`, untouched). Every instance now always flows below a preceding float
instead of beside it. Universal (applies to every instance/orientation/variant), not
`min-width: 0` (the documented backstop-not-fix anti-pattern for this codebase).

## Verified — non-destructive live injection (NOT a deploy)

`<style>.wp-block-sgs-before-after{clear:both;}</style>` injected into the live canary via
Chrome DevTools MCP (no server file touched), full sweep re-run, URL-verified per reading:

| Viewport | Instance 1 (AFTER) | Instance 2 (AFTER) | Match? |
|---|---|---|---|
| 375px | 312px | 312px | ✅ unchanged |
| 767px | 704px | 704px | ✅ was 224 vs 704 |
| 768px | 705px | 705px | ✅ was 225 vs 705 |
| 900px | 837px | 837px | ✅ was 357 vs 837 |
| 1024px | 961px | 961px | ✅ unaffected (already equal) |
| 1440px | 1200px | 1200px | ✅ was 897 vs 1200 |

The unmodified page (re-checked without the injected style) reproduced the original broken
numbers exactly — negative control confirming the check would have caught the original
defect.

Screenshot at 768px (before/after, Chrome DevTools MCP, this session — not committed):
narrow right-flush instance 1 confirmed visually before the fix; both instances full-width
and visually identical after. Label order (`After` over the orange/after image, `Before`
over the blue/before image) confirmed unchanged in both screenshots — the earlier
2026-07-31 label-order fix (`order: 0`/`order: 1` on `__label--after`/`__label--before`) is
**not regressed**; `clear: both` touches only the block's outer box, not the labels'
`justify-content`/`order`.

## Caveats

- Verified via non-destructive style injection, not a real deploy (session constraint:
  DO NOT DEPLOY). The real fix is in `style.css` and was built locally
  (`npm run build` exit 0, all prebuild/postbuild gates green) but the live canary still
  serves the pre-fix compiled CSS until deployed.
- Vertical orientation not separately tested on this canary (no vertical instance present);
  the fix is orientation-agnostic (`clear` isn't gated on `data-orientation`).
- Whether other SGS blocks that also set `overflow: hidden` on their root share this same
  bug class was not investigated — out of scope (task scoped to `before-after/` only), flagged
  as a candidate universal check for a future session.

---

## 2. Separate fix (coordinator-assigned) — `before-after/view.js` GSAP Draggable import

Independent of the width bug. `testimonial-slider/view.js` already had this exact bug fixed;
`before-after/view.js` needed the identical treatment.

**Mechanism (verified against source, not re-derived):** `webpack.config.js`'s
`externalsType: 'module'` makes webpack's `ExternalModule.build()` always build an
externalised ESM module synchronously, regardless of static-vs-dynamic call site
(`buildInfo.javascriptModule`-keyed, not call-site-keyed). The gated
`import( 'gsap/Draggable' )` inside `bootDraggableLayer()` was collapsed into a **static
top-level import** in the compiled file — confirmed before editing:

```
head -c 300 build/blocks/before-after/view.js   (BEFORE)
import*as e from"@sgs/gsap-draggable";import*as t from"@sgs/motion-provider";...
```

**Fix applied** (mirrors `testimonial-slider/view.js` lines 352–401 verbatim in shape;
module ID confirmed against `class-sgs-motion-registry.php`'s `GSAP_PLUGIN_MODULE_IDS`:
`'Draggable' => '@sgs/gsap-draggable'`):

```js
const [ { Draggable }, { tierG } ] = await Promise.all( [
	import( /* webpackIgnore: true */ '@sgs/gsap-draggable' ),
	import( /* webpackIgnore: true */ '@sgs/motion-provider' ),
] );
```

**Falsifiable gate — measured after `npm run build` (exit 0):**

- File head no longer contains a static top-level import of either specifier (confirmed —
  head now shows `bootBeforeAfter()`'s querySelectorAll/range-layer code).
- `grep -o 'import("@sgs/gsap-draggable"'` / `'import("@sgs/motion-provider"'` both match —
  present only as deferred calls inside `bootDraggableLayer()`.
- `check-motion-bundle-budget.py` gate: **PASSED** — `vendor-modules/gsap-draggable.js`
  13,034 bytes, baseline 13,034, delta +0.0%; every other module in budget.
- `grep -c "TweenMax\|gsap.core"` on the compiled file: `0`. Compiled `view.js`: 1,423 bytes.

**Frontend-still-works:** not independently drag-tested live (DO NOT DEPLOY constraint; the
live canary still serves the pre-fix bundle). What was verified instead: `@sgs/gsap-draggable`
and `@sgs/motion-provider` are both registered in `SGS_Motion_Registry` against real built
files (confirmed built, within budget above), via the same frontend-registration path every
other shipped Tier G block already depends on; the fix is byte-for-byte the same shape as
`testimonial-slider`'s already-shipped, already-live-verified fix for the identical bug. A
real deploy + live drag test is the remaining verification step, out of scope for this
session.

**Consequence for `maybe_enqueue_editor_map_shim()` — reporting only, no edit made**
(`class-sgs-motion-registry.php` is on this session's do-not-edit list): the shim's own
docblock states its sole justification is that `sgs/before-after` and
`sgs/testimonial-slider` each carry a static top-level import needing an admin-only
import-map entry. `grep -rn` across `src/` for a bare (non-`webpackIgnore`) `import()` of
`@sgs/gsap-draggable`, `@sgs/motion-provider`, or `@sgs/gsap-inertia` now returns **zero
matches** — both blocks use `webpackIgnore` exclusively. With no static top-level import left
anywhere that needs it, `maybe_enqueue_editor_map_shim()` and its
`admin_enqueue_scripts` registration are now fully redundant — safe to remove in one place,
with this report as the recorded reason.
