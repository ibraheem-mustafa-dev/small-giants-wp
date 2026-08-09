---
doc_type: design
spec_id: 35
project: small-giants-wp
last_updated: 2026-08-10
status: DESIGN GATE — awaiting multi-rater review + Bean sign-off
---

# Global device toggle — design gate (Spec 35, Track 1b, Phase 1.1)

**What this is, plainly.** Today every responsive setting in the block editor carries its own little
Desktop/Tablet/Mobile icon strip — about 192 of them on screen, all driving one shared WordPress
setting. This builds ONE toggle at the top of the block sidebar to replace them. Phase 1.1 adds the
toggle; Phase 1.2 deletes the 192 copies.

⛔ **Every decision below is backed by a probe run on the canary (WP 7.0.2) on 2026-08-10, in BOTH
editors.** Where a probe overturned an inherited claim, the correction is recorded inline. Nothing
here is asserted from recall.

---

## Part 1 — What the probes measured

### P1. The device API (third independent confirmation)

| Surface | `getDeviceType()` | write | canvas Desktop → Tablet → Mobile |
|---|---|---|---|
| Post editor (fresh, viewport 1527) | `Desktop` ✓ | ✓ | 1247 → **781** → **479** |
| Site editor (viewport 1527) | `Desktop` ✓ | ✓ | 1247 → **781** → **479** |

**The tiers ARE visually distinct, in both editors, reproducibly.**

⚠ **Two withdrawn claims, recorded so neither is re-derived:**

1. **"Tablet and Mobile are visually identical (both 460px)."** WITHDRAWN. It came from an
   intermediate post-editor state and does **not** reproduce on a fresh editor at the same viewport.
2. **"That 460px was a resizable-canvas clamp."** ALSO WITHDRAWN — and this one matters more,
   because it was an *inferred cause presented as an explanation*. Measured directly: the
   `components-resizable-box__container editor-resizable-editor` reports `width: 100%`, not a stored
   clamp. **The cause of the transient 460px was never established and is not claimed.** Per
   `prove-the-cause-before-fix.md`, ruling out one suspect does not promote the next.

⛔ **Nothing in this design depends on either withdrawn claim.** D5 (the cue) rests solely on P2,
which is reproducible in both editors.

### P2. Core exposes NO persistent device indicator — in either editor

⚑ **Strengthened after review.** The first pass measured header *text* only, which a reviewer
correctly called a narrower measurement than the claim it supported. Re-measured against non-text
indicators: the **View button is byte-identical in Desktop and Tablet** — same `aria-label="View"`,
same `className`, one `<svg>` in both, no text node. `document.body` carries **no** device class in
either state. The claim now covers words, icons, classes and attributes.

Every header button enumerated. Post editor: Block Inserter · Undo · Redo · Document Overview ·
title · Save draft · **View** *(collapsed dropdown, `aria-expanded=false`)* · Preview · Settings ·
Publish · Options. Full header text: `"No title · Page Ctrl+K Save draft Publish"`. Site editor:
`"Homepage · Homepage Ctrl+K Save"`. **`headerHasDeviceWord: false` in both.**

⛔ **This refutes a reviewer claim** that WP 7.0 "carries a persistent 3-icon Desktop/Tablet/Mobile
control" in the header. It does not. The device switcher lives inside the collapsed *View* dropdown.
Had that claim been accepted, the cue would have been cut as redundant.

### P3. Portal-target lifecycle — the silent-vanish is REAL and reproducible

Measured with a positive control (the selector must first be proven able to match):

| Action | `.block-editor-block-inspector` | previous node still in document? |
|---|---|---|
| Block tab active *(positive control)* | **present** ✓ | — |
| Select block A → block B | present, **SAME node** | yes |
| **Switch sidebar to Page tab** | **absent** | **NO — detached** |
| Back to Block tab | present, **NEW node** | no |

Two consequences, both refining the reviewer guidance rather than adopting it:

1. **Selection change needs no handling at all** — the node is identical across blocks. A
   `clientId`-keyed re-render is unnecessary here *and* useless for the case that matters, because
   the Page-tab switch does not change the selected block.
2. **`document.body.contains(node)` is a sufficient staleness detector** — the orphaned node was
   measured returning `false`. This is verified, not assumed.

### P4. ⛔ REVERSED — a store-only trigger is INCOMPLETE. A MutationObserver IS required.

An earlier version of this document concluded "no MutationObserver required" from ONE measured
transition (the Page/Block tab switch). **That was the withdrawn-P1 mistake repeated: n=1
generalised to "the only destroying event."** A hostile reviewer predicted it; three more measured
states proved it.

| State | inspector node | `getActiveComplementaryArea` changed? |
|---|---|---|
| Page/Block tab switch | detached → new | yes (`edit-post/block` ↔ `edit-post/document`) |
| Sidebar closed / reopened | detached → new | yes (→ `null`) |
| List View opened / closed | **survives** | no (no action needed) |
| **Distraction-free ON** | **DETACHED** | ⛔ **NO — stayed `edit-post/block`** |
| **Distraction-free OFF** | **NEW node** | ⛔ **NO** |

**Distraction-free destroys and recreates the node while the store value never changes.** A
`useSelect`-only trigger orphans the portal there and never recovers. Enumerating events is
whack-a-mole — three extra states found one leak, so the unmeasured remainder (site-editor Styles
panel, template-part navigation, admin-width collapse, multi-block selection — the last skipped for
want of a second block) is likely to hold more.

**Stable observation root, measured across every state above:**

| Candidate | distraction-free ON | distraction-free OFF | sidebar closed/reopened |
|---|---|---|---|
| `.interface-interface-skeleton__sidebar` | **ABSENT** | **REPLACED** | same |
| **`.interface-interface-skeleton`** | **same node** | **same node** | **same node** |

⭐ **Observe `.interface-interface-skeleton` (`childList` + `subtree`).** Cost is far lower than it
looks: the canvas is a **separate iframe document** (P5), so its mutations never reach an observer on
the outer skeleton — typing in the canvas does not fire it. Only sidebar/header chrome does.
Coalesce with `requestAnimationFrame` and act only when the cached node's identity or presence
actually changed.

### P5. The inspector is in the OUTER document

`inspectorInOuterDoc: true` · `inspectorInsideIframe: false`, both editors. `wp.plugins.registerPlugin`
confirmed available in the site editor.

---

## Part 2 — The decisions

### D1. Host — `registerPlugin` + `createPortal` *(Bean-decided)*

Renders exactly once per editor; WordPress rejects a duplicate registration by name.
⚑ **Still carry a `window.__sgsResponsiveDeviceToggleRegistered` guard** matching its four siblings
(`animation.js:109`, `parallax.js`, `responsive-visibility.js`, `conditional-visibility.js`).
`registerPlugin` warns-and-no-ops rather than throwing, and "imported from exactly one place" is an
invariant this repo has already broken once (D148).

### D2. Portal re-acquisition — MutationObserver + liveness check + bounded rAF retry

⚑ **Revised after P4's reversal.** Three mechanisms, each earning its place from a measurement:

```js
// 1. COMPLETENESS: observe the one ancestor that survives every measured state (P4).
//    Event-enumeration was proven incomplete — distraction-free leaks past the store.
observer = new MutationObserver( coalesced ) on '.interface-interface-skeleton'
           { childList: true, subtree: true }

// 2. CORRECTNESS: never trust a cached node (P3 measured the detach).
if ( ! node || ! document.body.contains( node ) ) → re-acquire

// 3. TIMING: the node arrives on a LATER React commit than the event that
//    destroyed it, so a single synchronous query can run one tick early.
//    Bounded rAF retry (max ~5), self-terminating. NOT a second observer.
```

⛔ **`createPortal( children, null )` throws** — the component must `return target ? createPortal(…) : null`.
⛔ No `useEffect(…, [])` one-shot capture — that is the exact shape that orphans.
⛔ Do not match on the VALUE `'edit-post/block'`; it is not guaranteed stable across surfaces.

### D3. Control semantics — `ToggleGroupControl`, NOT a reused `DeviceTabs`

`DeviceTabs.js:68,77,80` renders `role="tablist"`/`role="tab"`/`aria-selected` with **no
`aria-controls` and no tabpanel** (verified). For a per-setting strip that is a tolerated stretch;
for a global mode switch it is a **WCAG 4.1.2** defect — the role promises content-switching and
instead changes what every *other* control means. axe-core reads it clean, because the markup is
internally valid.

`ToggleGroupControl` is the canonical SGS control for segmented choice (**Spec 35 Part H**), and
`nav-menu/edit.js:587-625` already uses it for exactly this shape (`isBlock`,
`__nextHasNoMarginBottom`, no `__next40pxDefaultSize`).

⚑ **Resolved after review — text-only `ToggleGroupControlOption`, no icons.** The two requirements
"use the canonical control" and "don't rely on tooltips" are in tension:
`__experimentalToggleGroupControlOptionIcon` (used at `fx.js:41,652` with a
`|| ToggleGroupControlOption` fallback) renders **icon-only with the label as a tooltip** — exactly
what this decision rejects. There is no built-in icon-plus-visible-label option. Take plain text.

⛔ **`value` must be capitalised `Desktop`/`Tablet`/`Mobile`** — the casing `setDeviceType()` expects
(confirmed by P1's own output). The nearest in-repo precedent, `nav-menu/edit.js:613`, uses lowercase
`value="tablet"` for its **own attribute**; copying that casing here silently breaks the API call.

⚑ **Acknowledged inconsistency:** `DeviceTabs` is imported in **three** files today
(`ResponsiveControl`, `ResponsiveOverride`, `ResponsiveTriStateControl`) and stays in all three
through 1.1, dropping to two after 1.2 and to zero-relevance after 1.3. So 1.1 ships one radiogroup
alongside three tablists doing a similar job with different semantics. That is accepted: the global
control is the one whose role genuinely misdescribes its behaviour, and 1.2/1.3 close the gap within
this same session. An earlier draft said "two remaining callers", which was wrong on the day.

### D4. Persistence — NONE. Every fresh editor load starts on Desktop. *(Bean-decided 2026-08-10)*

⚑ **An earlier draft specified `sessionStorage` AND "Desktop is always the fresh-load default".
Both reviewers independently caught that these are incompatible** — `sessionStorage` survives a
reload by definition, and is scoped to the browser tab, not the post, so it would also leak the tier
across pages in the site editor's SPA navigation. That is the same confused-client bug the draft
rejected persist-forever for, on a shorter timescale.

**Resolved: no persistence layer at all.** The tier lives only in `core/editor` for the lifetime of
the page, which already survives clicking between blocks (the behaviour Bean's brief asked for).
Every fresh load — reload, different page, next day — starts on `Desktop`.

⛔ **This is a deliberate deviation from GenerateBlocks**, whose `localStorage` persistence Bean's
original brief named. Bean chose it explicitly, on the reasoning that it makes the "editing in Tablet
unaware" failure *structurally impossible to arrive at* — a client can only be in Tablet if they
chose it in that sitting. **Do not "restore" localStorage as a missing feature.**

### D5. The cue — SHIPS (P2)

⚑ **Mount point, resolved concretely after review.** "Independently of the inspector" was a
requirement, not a mechanism — two implementers would have built two different things, and one of
them would have reached for a Slot that dies with the sidebar, reintroducing the P3/P4 bug. There is
no core Slot that survives both a closed sidebar and the Page tab. The mechanism is a **second,
unconditional `createPortal( <DeviceCue/>, document.body )`** from the same `registerPlugin` render,
never gated on the inspector node. It needs `position: fixed` (its parent gives it no layout) and its
own stacking context above the admin bar. The `aria-live` region (D6) is a sibling inside that same
always-mounted portal, driven by the same `useSelect( getDeviceType )` so it cannot desync.

Justification is **P2 alone**: no persistent device word exists anywhere in either editor's header —
the state lives only inside a collapsed *View* dropdown. The canvas does resize distinctly per tier
(P1), which tells a client *something* changed; it never tells them **what**, and it is gone the
moment they scroll a full-bleed section or look away. A client returning to the tab after a
distraction has no on-screen text telling them they are not editing desktop.
⛔ This justification deliberately does **not** rest on the withdrawn "tiers look identical" claim.
Rendered **only when tier ≠ Desktop**, mounted **independently of the inspector** so it
survives a closed sidebar and the Page tab, and sourced from the same `useSelect` so it cannot
desync from the toggle.

> **"You're editing the tablet view — changes here won't show on desktop."**
> **"You're editing the mobile view — changes here won't show on desktop or tablet."**

Amber/warning tone, ≥4.5:1 text contrast (WCAG 1.4.3). ⛔ Not red — red is reserved for
destructive/error states and would dilute its meaning elsewhere in the editor.

### D6. Screen readers — `aria-live="polite"`

Visually-hidden region announcing *"Now editing the tablet view."* on each change. **WCAG 4.1.3
Status Messages** — the state changes with no focus move, so without this a screen-reader user learns
only that a button became pressed, not that every other control now means something different.
⛔ Not `assertive`.

### D7. Stylesheet hook — `admin_enqueue_scripts`, gated on `is_block_editor()`

⚑ **Both options in the approved plan were wrong.** The inspector is outer-document (P5), so the CSS
must land there — but `enqueue_block_editor_assets` styles are copied into the canvas iframe by WP's
compatibility shim, which is exactly the warning this repo fixed on 2026-07-31
(`class-sgs-blocks.php:255-280`). `admin_enqueue_scripts` reaches the same outer document and is
never shimmed. **JS stays on `enqueue_block_editor_assets`** where `sgs-block-extensions` already
rides (`class-sgs-blocks.php:246-252`); only the CSS moves. ⛔ Do not extend
`enqueue_editor_extension_styles()` — `device-visibility.php:124` guards on that handle.

### D8. Two positive controls, because one proves the wrong thing

A deliberately-red CSS rule proves only that the **stylesheet** loaded — a rule can paint on an
always-present wrapper while the portal silently failed to attach. Pair it with a `data-*` marker
written inside the component's own render, asserted via Playwright.

⚑ **Named now, not invented at verification time:** the red rule targets
`.sgs-device-toggle { outline: 3px solid red }`; the mount marker is
`data-sgs-device-toggle="mounted"` written on the toggle's own root element. ⛔ A **`data-*` attribute,
never a class** — `DeviceTabs.js:67`'s default `sgs-device-tabs` class never renders because every
caller overrides `className`, and a class-keyed assertion would repeat that exact trap.

### D9. ⚑ PHP specifics (added after review)

The guard is **`get_current_screen()->is_block_editor()`** — a `WP_Screen` **method**. There is no
global `is_block_editor()` function; an implementer searching for one finds nothing. Keep the
`function_exists( 'get_current_screen' )` + null check, matching the repo's own pattern at
`class-product-preflight.php:619-622`. Register the `add_action` beside the existing enqueue hooks
(`class-sgs-blocks.php:24-36`) and place the method after `enqueue_editor_extension_styles()`.

### D10. ⚑ Guard placement (added after review)

`window.__sgsResponsiveDeviceToggleRegistered` wraps the **entire `registerPlugin(...)` call**,
matching `animation.js:109-110`'s pattern exactly — not the hook internals.

---

## Part 3 — Scope boundary

**In:** the toggle, its stylesheet, its enqueue, the cue, the live region.
**Out:** deleting the 192 per-control strips (that is 1.2, behind Gate 1); `DeviceTabs` itself;
the 768/1024 device-tier lock (CO-11) versus WP's canvas widths — **noted, not resolved**: WP's tiers
are 781/479 (site editor) while SGS's CSS breakpoints are 768/1024. They are close but not equal, and
reconciling them is not this change.

## Part 4 — How this is proven at Gate 1

1. `npm run build` exit 0 — ⚑ **necessary, not sufficient**: `lint:js` is not in `prebuild`, so an
   undefined identifier passes every gate.
2. `grep` the new enqueue method name inside an `add_action(...)` — not merely that it exists.
3. `wp-plugins` present in `build/extensions/index.asset.php` (absent today; expected to be added
   automatically by the dependency-extraction plugin — a hypothesis until read).
4. Live, **both** editors: renders once; drives the canvas; survives a Page-tab round trip; keyboard
   operable; zero console errors; cue appears/disappears at the right tiers.
5. Screenshot pair for Bean (R-31-13).
