# Visual diff — sgs/nav-drawer — bfcache dismissal + trigger-anchor geometry basis + border-none fix + D1011 non-modal mechanism — 2026-09-10

verdict: PASS (with scope caveats stated below — read them, they are load-bearing)
first_paint_capture_passed: true
intent_capture_passed: true
source_sha: e4f98fbddf273af8

Retroactive report for commits `2bdcb73b7` and `32a98183e`. Neither change is visual in the
normal sense — one is a lifecycle handler, one is a numeric basis — so the evidence is measured
state, not pixels.

## Fix 3 — a drawer left open survived a back-navigation, scroll-locked

`store.js::lockScroll` sets `body{position:fixed}` and saves the scroll offset. Nothing reacted to
a bfcache restore, so a drawer left open on navigate-away came back OPEN with the body still
fixed: a page that will not scroll, usually with no visible drawer. To a client that reads as
"the website froze".

Verified absent before: a grep for `pageshow|popstate|history\.|hashchange|resize` in `store.js`
returned zero matches.

**Verified live, WITH a negative control:**

| Event | Drawer | `body` | Verdict |
|---|---|---|---|
| Baseline (drawer opened) | open | `fixed`, attr `0` | the bug state reproduced |
| `pageshow` **persisted: false** | still open | still `fixed` | **negative control PASSES** — handler correctly does nothing |
| `pageshow` **persisted: true** | closed | `static`, attr cleared, `overflow-y` released | full teardown |

⚠ **CAVEAT 1 — this is verified-by-handler, NOT verified end-to-end.** A real back-navigation on
this canary does NOT use bfcache. Proven, not assumed: a `window.__sgsBfcacheMarker` set before
navigating away was GONE after `goBack()`, which means a full reload. The first pass at this
verification read "drawer closed, body static, attr null" after a real Back and looked like a
clean PASS — it was vacuous, because a freshly loaded page always looks like that. The marker is
what caught it.

**Follow-on worth chasing separately:** something is opting this site out of bfcache (a cache
header or an unload listener are the usual causes). That is a real user-facing cost — back
navigation is a full reload for every visitor — and it is independent of this fix.

## Fix 4 — the trigger anchor's right inset was measured against the wrong box

`store.js::openDrawerFor` computed the panel's right inset from `window.innerWidth`, which
INCLUDES a classic scrollbar. The drawer is `position:fixed`, so its `right` offset resolves
against the initial containing block, which EXCLUDES it. Those normally agree on a scroll-locked
page — but `store.js::lockScroll` DELIBERATELY forces the root scrollbar track to stay (D340,
after a frame capture caught the anchor jumping 753->768 mid-animation), so the divergence is live
at exactly the moment the measurement runs.

**Measured live on the canary at 1440px:**

| | Value |
|---|---|
| `window.innerWidth` | 1440 |
| `document.documentElement.clientWidth` | 1425 |
| Divergence | **15px** |

So the old basis over-stated the inset by exactly 15px wherever a classic scrollbar exists
(desktop Windows/Linux Chrome/Firefox). Invisible on macOS and mobile, where overlay scrollbars
make the two equal — which is why it survived review. `documentElement.clientWidth` is the ICB
width on every platform, so the fix is cause-agnostic: correct whether or not a scrollbar exists,
and a no-op where the two agree.

⚠ **CAVEAT 2 — the corrected geometry is not visually confirmed on a live trigger-anchored
drawer.** The canary's drawer is `full-screen`, which does not consume
`--sgs-drawer-trigger-right` at all. What IS confirmed: the divergence the fix corrects is real
and is exactly 15px on this platform, and the only consumer
(`nav-drawer/render.php::$sgs_nd_geometry_for_anchor`) reads the property as a bare
`var(..., 16px)` inset, so name, units and semantics are unchanged and nothing breaks. A
trigger-anchored drawer should be put in front of Bean's eye when one exists (R-31-13).

## Fix 5 — nested-dialog focus containment

`store.js::trapTab` is bound with a BUBBLING keydown on the drawer, and `showModal()` promotes to
the top layer without changing DOM ancestry — so a `<dialog showModal>` opened inside the drawer
had its Tab bubble up and get wrapped back into the DRAWER's focusable list. New
`store.js::hasContainingNestedDialog` guards the head of `trapTab`, testing `:modal` because
modal-ness is internal browser state with no attribute to read.

Not exercised live — the canary has no `sgs/modal` inside the drawer. The guard is cause-agnostic
(defers to native containment when a nested dialog is open, strict no-op otherwise), which is why
it shipped without a reproduction. The canary fixture to prove it is named in the Wave A council
output and is ~10 minutes when someone wants it.

## Fix 6 (nav-drawer track, later same day) — border-style:none was a dead write

`render.php`'s `'none' === $border_style` branch built its CSS into `$scoped_css[]`, a variable
assigned exactly once and never read, echoed, or concatenated anywhere else in the file (grepped:
1 occurrence). It never reached `$css`, the accumulator that actually gets printed into the
block's `<style>` tag — an operator's explicit "no border" silently did nothing, contradicting the
G5 comment one line above it stating the override is deliberate.

**Fix:** `$css .= $root_sel . '{border-style:none;border-width:0;}';` — the identical accumulator
pattern the sibling border-width/border-colour branches already use two lines above.

**Verification:** cause-proven by direct grep (not inferred) — genuine dead write, fixed to mirror
already-working sibling code exactly. Not separately live-captured with an instance (no drawer on
the canary currently has `borderStyle:none` set); the fix is a one-line mechanical correction to a
demonstrated dead assignment, covered by `php -l`, WPCS, and the full gate tier below.

## Fix 7 (nav-drawer track, later same day) — D1011 non-modal drawer: 5-item mechanism build

Ordered per the accessibility dependency (item 2 before item 1, so the Level-A fix lands before
the feature that makes its failure mode reachable):

1. **`trapTab`/`freezeBackground` contradiction (item 2).** `store.js::trapTab` was bound
   unconditionally outside the modal/non-modal `if`/`else`, wrapping Tab strictly within
   `getFocusable(drawer)` on BOTH paths. `freezeBackground`'s own docblock states its design
   intent as emergent containment — inert everything except the live header row, so native Tab
   order alone cycles {header, drawer} with **no hand-rolled trap needed**. The unconditional trap
   defeated that the moment the non-modal branch went live: Tab from inside the drawer could never
   reach the still-visible, still-clickable header/burger (WCAG 2.1.1, Level A). Fixed by scoping
   `trapTab`'s binding to the modal (`showModal()`) branch only.
2. **`modality` attribute (item 1).** Added to `block.json` (`modal` default / `non-modal`) +
   an editor `ToggleGroupControl`, plumbed as `data-sgs-nav-modality` on the dialog and read in
   `store.js::openDrawerFor` to select the branch — replacing the old capability sniff
   (`typeof drawer.showModal === 'function'`), which was permanently true (D1012: every
   `HTMLDialogElement` defines both `showModal` and `show`) and could never actually select the
   non-modal path.
3. **z-index scale (item 3).** `.wp-block-sgs-nav-drawer { z-index: 90 }` — deliberately below
   the header's `z-index:100` (`site-header/style.css`) so the header/burger stays visually and
   hit-testably on top on the non-modal path. Irrelevant to the modal path (native `showModal()`
   promotes to the top layer, which ignores z-index entirely).
4. **ESC `stopPropagation()` (item 4).** The non-modal ESC handler is a document-level listener
   with no containment check beyond `drawer.open`. Added `stopPropagation()` as a precaution
   against `mega-disclosure.js`'s own element-scoped `data-wp-on--keydown` ESC handling, verified
   by reading (not guessing) that mega's handlers are element-scoped, not document-level, so this
   is precautionary rather than fixing an active double-fire.
5. **Scrim for partial-width anchors (item 5).** `store.js::resolveScrim` looked for
   `[data-sgs-nav-scrim="{drawerRef}"]` with nothing anywhere rendering it (grepped: zero
   emitters). Added `.sgs-nav-drawer__scrim` in `render.php`, gated to render ONLY when at least
   one responsive tier of `anchor` resolves to a partial-width value (header/trigger/centred) —
   the default full-screen anchor still renders none, matching the pre-existing 8/8
   reference-site survey documented in this file.

**Live result — canary, default (untouched) drawer:**

| Measure | Value |
|---|---|
| `data-sgs-nav-modality` | `"modal"` (new attribute, default preserves existing behaviour) |
| `getComputedStyle(dialog).zIndex` | `"90"` |
| Drawer open → close via × button | opens/closes correctly, `body` position returns to `static` (scroll-lock releases) |
| Scrim element present on the default (full-screen) drawer | absent, as intended — `$sgs_nd_needs_scrim` is false when `anchor` is unset |

⚠ **CAVEAT 3 — the non-modal branch itself (Tab reaching a live header, the scrim's
click-outside-to-close, the z-index ordering against a real header) is NOT live-exercised in
this report.** The canary's only drawer instance uses the default `modality:"modal"` and default
`anchor:{}` (full-screen, no scrim). What IS confirmed live: the new attribute is emitted
correctly, its default is non-breaking (identical z-index/scrim-absence/close behaviour to before
this change), and the mechanism composes as designed by direct code reading (grep-confirmed
`trapTab` now binds only inside the `showModal()` branch; `mega-disclosure.js`'s ESC handlers
confirmed element-scoped). Putting an instance with `modality:"non-modal"` + a partial-width
`anchor` in front of Bean's eye, and Tab-testing it live, is the natural next verification step
before this mechanism is considered fully proven end-to-end (R-31-13) — flagged, not silently
skipped.

**Risk:** every new attribute/behaviour defaults to the pre-existing modal path byte-identically
(default `modality:"modal"`, default `anchor:{}` → no scrim, z-index harmless under the modal top
layer). No regression path for an existing drawer that never sets `modality` or a partial-width
`anchor`.
