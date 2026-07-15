# adaptive-nav — visual diff / live verification (2026-07-15)

verdict: PASS
first_paint_capture_passed: true

**First-paint (M1) — measured, not asserted.** Static: `animation-fill-mode:both` = 0,
non-zero `animation-delay` = 0, `animation:` shorthand = 0 in this block's CSS (it animates
with `transition`, not `animation`, so the M1 fill-mode class cannot arise). Live capture on
the frame after open (double-rAF): drawer `opacity 1` / `visibility visible` / `display flex`,
first link `opacity 1` and painted (`height > 0`), `animation: none` on both. No
content-invisible-at-first-paint defect.

Block: `sgs/adaptive-nav` (+ `sgs/site-footer` uid). Branch `feat/adaptive-nav-dialog-drawer`.
Target: sandybrown canary (Mama's Munches). Full cache clear before every measurement
(LiteSpeed purge + `rm -rf litespeed/cache/*` + OPcache reset + Hostinger CDN
`hosting_clearWebsiteCacheV1`). Live DOM via Playwright — not emit, not assertion output.

Covers Steps 1, 2 and 4 of `next-session-prompt.md`, folded together at Bean's direction
(2026-07-15): Step 2's shape freeze is a *prerequisite* for Step 4 (a new attr must ship in
its final shape or D328 silently resets it later), and Step 1 touches the same file.

## What Bean rejected, and why it was right

The pre-existing drawer was `background: var(--primary-dark)` + `color: var(--surface)`
hardcoded in `style.css`. On mamas-munches `primary-dark` is a **pink** (`#c56a7a`), so it
shipped cream-on-pink at **3.32:1 — a WCAG fail**. The D338 working tree fixed the contrast
by computing the foreground (→ black, 5.72:1) but kept the dark-pink panel. Bean rejected
that on sight (R-31-13, his eye is co-authoritative):

1. *"It's dark pink, why? Why not either use primary pink which would look much better with
   black text or use white for the text"*
2. *"the top strip where the logo sits needs to be cream so the logo doesn't overlap with
   background colour"*
3. *"I thought the default mobile drawer would open to it being full screen … this one has a
   small gap on the left"*

All three were correct. Measured evidence for each:

- **(1)** `primary` `#e68a95` + black = **8.43:1**, vs `primary-dark`'s 5.72:1. Better
  contrast *and* the look he wanted. **White text was ruled out with numbers** — 3.67:1 on
  the dark pink, 2.49:1 on the primary pink. Both fail. This is the one option in his
  message that cannot work, and he was told so.
- **(2)** Not a preference — the logo's dominant ink is `rgb(216,120,120)`, itself a pink,
  scoring **1.06:1 against the primary pink**. The logo was the same colour as its
  background and disappeared. On cream `surface` it reads. (Sampled from the real
  `mamas-munches-logo.webp` with PIL: 53.3% transparent, no baked-in box, ink histogram.)
- **(3)** `width: min(85%, 400px)` — the **85%**, not the 400px, was the bug. At 375 the
  panel was 318.75px, leaving exactly the 56px gap he saw.

## The fix — attrs, not a token swap

Swapping one hardcoded token for another repeats the R-31-1 violation one token to the left,
and the Spec-33 extractor **regenerates these palettes per client**, so the next client
re-rolls the dice. FR-S9-10 already specifies the right shape: *"elements inherit these
[theme tokens] as defaults; per-instance overrides remain available"*.

Per Bean's own distinction (2026-07-15): a hardcode is a value that **overrides a legitimate
alternative source** (inline / `!important` / a block default beating theme.json / a block
default beating a UA default). An overridable attr default that fights no other channel is a
**default**, not a hardcode.

New attrs on `sgs/adaptive-nav` (all flat — see Shape freeze below):

| attr | default | owns |
|---|---|---|
| `drawerBg` | `primary` | panel background; **foreground is COMPUTED, never authored** |
| `drawerHeadBg` | `surface` | logo strip; set == `drawerBg` to remove the strip |
| `drawerWidth` | `400px` | render wraps in `min(100%, …)` → full-bleed on any narrower screen |
| `showLogo` | `true` | drawer logo on/off |
| `logoMaxWidth` | `120px` | was a `120px` literal ×2 |
| `closeButtonSize` | `20px` | was a `20px` literal; button keeps its 44px tap target |

`drawerWidth` is deliberately **flat, not a tier object** (Bean challenged the object shape
and was right): `min(100%, 400px)` expresses the whole responsive intent in one value, with
no `@media`, no tiers and no device switcher — which is what FR-S9-7 mandates and what
FR-S9-6 itself calls *"the intrinsic layout … so most clients never need to touch it"*.

Also fixed: the close button's hover was a hardcoded `rgba(255,255,255,.25)` white — which
is invisible the moment the strip is light (it is now cream by default). Now
`color-mix(in srgb, currentColor 22%, transparent)`, so it tracks the computed foreground on
any palette, with an `@supports` fallback.

## Universality (R-31-9 / STOP-VERIFY-EVERY-CLIENT)

A colour fix verified on one client is not verified. `drawerBg: primary` + the computed
foreground, across **all 8 committed client palettes**:

| client | primary | computed fg | ratio |
|---|---|---|---|
| mamas-munches | `#e68a95` | black | **8.43** |
| indus-foods | `#0A7EA8` | white | **4.60** ← tightest |
| helping-doctors | `#2d6e5e` | white | 5.99 |
| sgs-healthcare | `#1A5F6B` | white | 7.26 |
| sgs-mosque | `#1A3D2B` | white | 12.03 |
| sgs-professional | `#1E2D5E` | white | 13.19 |
| sgs-construction | `#1C1C1C` | white | 17.04 |
| eye-care-ward-end | `#0D1B2A` | white | 17.39 |

**8/8 pass.** `drawerHeadBg: surface` → 18.96–21.0 on all 8. Indus at 4.60 passes but is the
one to watch if that palette is ever regenerated — the resolver holds the floor, but there is
little headroom.

## Live measurements (sandybrown, 375px)

| check | result |
|---|---|
| full-bleed drawer | left **0**, right **375**, width 375 — **gap 0** (was 56px) |
| drawer panel | `rgb(230,138,149)` = `#e68a95`, fg `#000` → **8.43:1** |
| logo strip | `rgb(251,243,220)` = `#fbf3dc`, fg `#000` → **18.96:1** |
| every drawer link | **8.43:1** (worst case) |
| `logoMaxWidth` landed | `120px` computed |
| `closeButtonSize` landed | `20px` computed |
| close button tap target | **44×44** — icon size does not shrink the target |
| axe-core (open drawer, wcag2a/2aa/22aa) | **0 violations** |
| horizontal overflow | none (`scrollWidth 375 <= innerWidth 375`) |

Screenshots: `assets/mamas-drawer-black-text-375-2026-07-15.png` (before — logo dissolving
into pink) → `assets/mamas-drawer-AFTER-375-2026-07-15.png` (after).

## Step 1 — uid (deviation from the prompt, deliberate)

The prompt called this a "2-line zero-dep fix: copy the sibling line". **It is not.**
`adaptive-nav`'s uid drives ARIA plumbing (`{uid}-drawer`, `{uid}-panel-N`,
`{uid}-more-panel` in `aria-controls`), so a bare `md5($attributes)` gives two
identically-configured navs on one page the **same DOM ids** — silently breaking the second
drawer. The sibling rows have no ARIA and no such hazard.

Shipped instead: `sgs/accordion`'s proven **md5 + block-context** pattern, mixing `anchor`
into the hash as the per-instance escape hatch. Gets the CSS-dedup benefit without the
collision. `sgs/site-footer` took the plain sibling hash — checked first: its uid feeds CSS
scoping + `<style id>` + the wrapper id only, no `aria-controls`, and a page has one footer.

Also note **the wider claim would have been wrong**: 8+ blocks use `wp_unique_id()`, and at
least two document why it is *correct* for them (`mega-menu:78` — "process-safe and persists
across nested `do_blocks()` calls"). This was not a blanket sweep.

The prompt's third item — "add the missing `var()` fallback at `style.css:202`" — **dissolved**:
that line was the hardcoded `background-color` and no longer exists.

## Step 2 — attribute shape FROZEN (Spec 17 §S9 Guardrails)

Added to §S9 Guardrails: *"No flat→object attr shape change on the 5 §S9 blocks. A new tiered
capability is a NEW SIBLING ATTR, never a reshape."* Rationale recorded in-spec: WP silently
coerces a mis-shaped stored value to the block.json default at render (D328), and D293/D270
ban deprecations, so there is no migration path — a reshape **silently resets every value an
operator or the pipeline ever configured**. Goals 1/4 are hand-configuration, so the shape
had to be final before that work, not after.

**Also corrected a live spec self-contradiction.** FR-S9-6's `Depends on:` read *"None
(foundational; FR-S9-2/3/4 consume this model)"* while FR-S9-3's BUILT note has said since
D325 that it is *"NOT this block's dependency-in-fact"*. Measured: **87 of 95 attrs (91%)
across the 5 §S9 blocks ship FLAT**. The false side was the load-bearing one — a session
reading it would retrofit the object shape onto shipped blocks, which is exactly what D328
makes unsafe. Corrected with a do-not-restore note.

## Gate findings worth keeping

- **`check-dead-controls.js` has a blind spot I tripped and proved.** It strips comments from
  `render.php` with a naive matcher before scanning. A PHP **string literal** containing the
  two characters `/*` (mine was the regex `'/[^A-Za-z0-9.,%()\/*+\s-]/'`) reads as a
  block-comment opener that never closes → **the rest of the file is swallowed**, and every
  attr below that line reports as dead. It flagged `collapseTier` + `collapseCustomPx`, ~50
  lines down, as unrendered. Proven by removing `*` and `/` from the charset and nothing
  else: gate went green. Sibling of STOP-GATE-BLIND-TO-DELETION — the gate fails *open* in
  the confusing direction (false positive), but the same swallow would hide a real finding.
- **`check-hardcoded-render-defaults.js` (F3) behaved exactly as designed** and earned its
  keep: declaring `drawerWidth` woke its width-matching for the whole block and it
  immediately surfaced 3 real §S9 drawer-chrome hardcodes (`logoMaxWidth` ×2,
  `closeButtonSize`) that had been invisible while no attr existed to attribute them to.
  This is the "enabling a capability wakes latent hardcodes" pattern (D-lesson, 2026-07-05).
  They were fixed, not baselined.

Full build green: dead-controls 0 net-new · F3 0 net-new · control-UX 0 · F5/F6 0 ·
cheat-gate 0 new · `audit-inline-styling` **0 inline styling violations across 77 blocks**
(Spec 32) · box-family 0 · oracle suite **180 passed, 1 skipped**.

## OPEN — not fixed, cause not proven

**Bean's drawer-animation bug.** Reported: *"the animation … finishes with its right edge on
the left side or middle of the screen depending on if on mobile or tablet. And then after a
few seconds it moves to the right place."*

**Mechanism PROVEN, delivery cause NOT proven — so no fix shipped** (`prove-the-cause-before-fix`).

A/B on the live page at 768: with the block's stylesheet **disabled**, the drawer lands
left 214 / **right edge 554** — mid-screen — and snaps to right 768 the instant the CSS is
restored. That is exactly the reported symptom, and it explains why mobile and tablet differ
(the panel is a different width at each). So: **the drawer's position depends on
late-arriving external CSS.**

What is NOT established is *why* the CSS would be late for Bean:
- **Could not reproduce** on a warm, fully-cache-cleared page at 375 or 768 — position was
  stable from +150ms through +5000ms, no jump.
- LiteSpeed **refuted as the cause**: `optm-css_async 0`, `optm-css_comb 0`, `optm-ucss 0`,
  `optm-js_defer 0` — nothing is deferring CSS. "Not LiteSpeed" does **not** promote the next
  suspect.
- `sgs_css_output_mode` is `file` (D311) — block CSS is an external `<link>`. Render-blocking
  in principle, so it *should* be present before the toggle is clickable.
- Plausible but unproven: a cold-cache race (this session changed the CSS `?ver` by
  deploying, forcing a re-download), or Bean was looking at the pre-deploy build.

**Needed from Bean:** was it a fresh/hard-reloaded page; every open or only the first after a
reload; which browser/device; DevTools device emulation or a real phone. That distinguishes a
cache race from something structural.

**Cause-agnostic mitigation available if wanted** (helps whichever hypothesis is right): make
the drawer's positioning not depend on the block's external stylesheet — either by inlining
the drawer's critical positioning, or by not letting `inset:0` hard-left a right-side drawer
when the `--right` modifier is absent. Not shipped, because it is the same file and Bean's
answer may point at a better fix.

## Addendum (same day, D340) — logo OFF by default, research-backed

Bean rejected the shipped strip on sight (content-width box + squeezed 120px logo — a real
defect: the head sits INSIDE the drawer's padding) and asked whether the drawer needs a logo
at all. Extended research-check (4 agents; persisted to
`workspace/memory/research/2026-07-15-drawer-logo-offcanvas.md`, blub POST pending — dashboard
down): **0 of 6 major builders ship a drawer logo by default** (Spectra/Kadence/Elementor/
Blocksy/Bricks/Astra, vendor-doc cited); no authority requires one (M3 demoted the drawer
header; ARIA APG/WCAG — a logo plays no role in dialog labelling; logos are contrast-EXEMPT
per SC 1.4.3/1.4.11); the evidenced orientation anchor is a visible TEXT title, not a logo.

Shipped: `showLogo` default `true`→`false`; the `drawerHeadBg` strip renders ONLY when the
logo is opted in; inspector controls for logo width + strip colour nested under the toggle;
close button pinned `margin-inline-start:auto` (with the logo off it had collapsed to
top-LEFT — caught on the live screenshot, off-convention for a right-side drawer).
Auto-derive strip-from-header-row mechanism PARKED (Optimiser design: publish
`--sgs-header-bg/fg` like `--sgs-header-height`; ~1h; polish not compliance).

Live re-verify (sandybrown 375, full cache clear): logo absent, head row transparent
(panel colour flows through), close button present 44×44 at top-RIGHT (right 351/375),
dialog still named "Navigation menu" via aria-label, full-bleed left 0 / right 375,
**axe-core 0 violations**. Screenshot: `assets/mamas-drawer-logo-off-375-2026-07-15.png`.

## Addendum 2 (same day, D340) — the "bounce" CAUSE-PROVEN and FIXED

Bean's refined report cracked it: *"does the animation have a bounce effect… goes past the
end position and bounces back?"* **No bounce exists in the animation** — the transition curve
`cubic-bezier(0.16,1,0.3,1)` is monotonic (output can never pass the end value). The bounce
is a LAYOUT jump: `lockScroll()` sets `body{position:fixed}`, the document scrollbar vanishes
mid-slide, the viewport widens by the scrollbar width (~15px classic desktop), and the
right-anchored drawer's anchor steps right — the panel overshoots into the page by exactly
that width, then steps back. Frame capture had already recorded the anchor moving **753→768**
mid-animation; mobile emulation never showed it because overlay scrollbars have zero width
(why every earlier repro attempt failed — Bean was on a real desktop browser).

**Fix:** `lockScroll()` now pins the root scrollbar track (`documentElement.style.overflowY =
'scroll'`, gated on `innerWidth − clientWidth > 0` so overlay-scrollbar platforms no-op);
`unlockScroll()` restores it.

**Verified live (sandybrown, 768px, scrollbar gap 15px present):** 20-frame rAF sweep — the
anchor is CONSTANT (right edge 753 every frame), max travel past the final position **0.5px**
(sub-pixel rounding; was a 15px step). Close: drawer shuts, `overflowY` restored to
`visible`, body `static`, scroll position intact.

**Comprehensive-fix sweep:** instances found: 2. Fixed: adaptive-nav (this commit,
live-verified). Documented: `sgs/modal` (`body.sgs-modal-scroll-locked{position:fixed}`,
`modal/style.css:207` — same class of bug, LATENT: the block is not deployed on any page, so
a fix cannot be live-verified today; exact fix shape parked as `P-MODAL-SCROLLBAR-GUTTER`).

**Still open from Bean's ORIGINAL report:** the much larger travel on his pre-deploy version
was this bounce STACKED ON the late-CSS race (drawer position/width depending on the block's
external stylesheet — mechanism proven by A/B, delivery trigger still unproven). The
structural fix folds into the approved header-visible drawer redesign, which stops depending
on top-layer/late-CSS geometry entirely.

## Not covered by this report

`sgs/cart`, `sgs/heading`, `sgs/business-info` + `product-card` were verified live in the same
session (cart trolley present with WC active; heading hierarchy restored h1 58 / h2 36 / h3 19,
previously flat 36; all `displayType` variants render distinctly; attribution backlink live) —
those belong to their own STOP-67 reports.

Remaining §S9 drawer-chrome roster, not built here: `drawerMaxWidth`, `closeButtonStyle`,
`showDividers`, `dividerColour`, `accentColour`, `variant` (overlay/bottom-sheet — structural,
needs view.js + its own a11y pass).
