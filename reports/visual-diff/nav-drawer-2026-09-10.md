# Visual diff — sgs/nav-drawer — bfcache dismissal + trigger-anchor geometry basis — 2026-09-10

verdict: PASS (with two scope caveats stated below — read them, they are load-bearing)
first_paint_capture_passed: true
source_sha: a903a9e8db1cbb3d

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
