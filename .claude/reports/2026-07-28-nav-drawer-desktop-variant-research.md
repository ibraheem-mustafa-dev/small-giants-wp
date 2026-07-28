---
doc_type: report
project: small-giants-wp
title: Desktop burger-menu drawer — measured research + variant taxonomy
date: 2026-07-28
status: RESEARCH COMPLETE (rounds 1–2 + Bean's correction). Build DEFERRED to a following session by Bean.
spec: 36-SGS-NAVIGATION-SYSTEM.md (FR-36-6 drawer, FR-36-8 collapse, FR-36-10 disclosure-vs-dialog)
---

# Desktop burger drawer — what top sites actually do

**Why this exists.** `sgs/nav-drawer` was designed mobile-first (full-screen
`<dialog showModal>`). Bean wants a burger at ANY breakpoint including desktop,
and observed that desktop burger panels on top sites do NOT look like a
full-screen sheet. This is the measured answer, so the build does not start
from impressions.

**Everything below was measured live at 1440×900 with Chrome DevTools on a real
open panel.** Nothing is inferred from CSS classes. Sites that could not be
opened are listed as UNCONFIRMED, not guessed.

> ## ⚠ KNOWN GAP — MOBILE WAS NEVER MEASURED (Bean-caught, 2026-07-28)
>
> **Every measurement in this report is 1440×900 ONLY.** Nobody checked whether the
> reference sites KEEP their distinctive panel on smaller screens or collapse to a
> full-screen sheet. That is not a detail — **it decides the shape of the `variant`
> attribute**, so it must be answered BEFORE anything is built:
>
> - If the panels **keep** their character on mobile → `variant` is a single value that
>   persists across every device; geometry is just responsive values inside it.
> - If they **collapse** to full-screen on mobile → `header-attached` and
>   `trigger-anchored` are **desktop PRESENTATIONS**, not device-spanning variants.
>   Then either `variant` itself must be per-device (`{desktop,tablet,mobile}`), or each
>   variant declares its own mobile fallback — and shipping a flat `variant` string
>   first would bake in the wrong shape.
>
> One promising possibility to test explicitly: lamalama's desktop header is a 438px
> centred pill and its panel derives that exact width. **If the header itself goes
> full-width at 375px, then `header-attached` already handles mobile correctly with no
> extra attribute at all** — the cleanest answer available, and it would be free.
>
> **SCOPE (Bean-corrected, twice): ALL EIGHT measured sites, not just the two compact
> ones.** Every variant traces to a real site, so every site needs the mobile pass —
> including the six full-screen ones. They are NOT "obviously the same on mobile"; that
> is an assumption, and mobile is the case our block already implements, so any
> variation among them is directly relevant. Look specifically for variation WITHIN the
> full-screen family that may deserve capturing rather than flattening: submenu model
> (accordion vs drill-down vs flat), animation direction/duration, whether the close
> affordance moves, whether the panel scrolls, whether imagery is dropped.
>
> **⚠ And note `side-panel` has NO reference site at all.** Three of the four proposed
> variants trace to measured sites; `side-panel` exists only because `edge: left/right`
> is half-built in our own code (`style.css:332-346`, hardcoded `width: min(88vw,
> 360px)`, self-labelled "Phase 2+; declared, not gate-tested"). Either find a real
> reference or tell Bean it is a variant with no evidence base.
>
> **This is Task 1 of the next session.** Append findings HERE rather than starting a
> new report.

## 1. Measured sites

| Site | Panel rect | Anchoring | Backdrop | Dismiss | Native `<dialog>`? |
|---|---|---|---|---|---|
| **lamalama.com** | **438×436 @ top:16, left:501, right:939** | **Attached to the header** — see §2 | blur+dim, opacity 1, **`pointer-events:none`** | outside-click, ESC | **No** — plain `<div>`, 0 `[inert]` |
| **lusion.co** | **310×264 @ top:108, right-inset 72px** | Hangs off the MENU button (top-right corner) | **None at all** | **Explicit close only** — background stays live and clickable | No — plain `<div>` |
| dogstudio.co | 1440×900 | Full-screen takeover | — | — | — |
| fantasy.co | 1440×900 | Full-screen takeover | — | — | — |
| buck.co | 1440×900 | Full-screen takeover | — | — | — |
| **resn.co.nz** | **1434×900** (via its own `#!/menu` SPA route) | **Full-screen takeover** | 3D scene shows through — not a solid backdrop | — | No · 0 `[inert]` · `overflow:visible` |
| studionamma.com | full viewport | Full-screen takeover | opaque light-grey replaces the page | — | — |
| wearecollins.com | full viewport | Full-screen takeover | opaque near-black replaces the page | — | — |

**FINAL TALLY: 2 compact / 6 full-screen — of 8 sites actually opened.**

⚠ **TWO of Bean's four named sites measured FULL-SCREEN, not compact.**
He grouped dogstudio, lamalama, resn and lusion together as the compact
family. Measured: **dogstudio = 1440×900 full-screen**, **resn = 1434×900
full-screen** (and resn's burger only exists behind its own `#!/menu` hash
route — the homepage is a persistent WebGL loader with no burger in the DOM
at all). Only **lamalama and lusion** are compact. Both full-screen ones are
still worth shipping as variants — a full-screen done well is a legitimate
look — they just are not the centred family.

**No desktop burger at all (full inline nav at 1440):** basement.studio,
activetheory.net, huncwot.com, hellomonday.com, instrument.com, koto.com,
antonandirene.com, ramotion.com, aino.agency, partizan.com, obys.agency,
clay.global, arc.net.

**UNCONFIRMED (could not open — dead domain or unopenable):**
korolev.apokrif.media, outstanding-person.com, paulvalentine.com,
studio375.com (cert error), sok.digital, underline.studio, argonaut.is,
pentagram.com (has a `fixed inset-0 w-full h-full` overlay in the DOM but it
would not open under synthetic clicks — deliberately NOT counted as a
full-screen example), makemepulse.com (burger navigated away instead).

## 2. Bean's correction — the key structural finding

My first taxonomy called lamalama's panel a "floating card". **Wrong, and
Bean caught it.** Measured:

```
header pill : 438 × 50  @ top:16, left:501, right:939
open panel  : 438 × 436 @ top:16, left:501, right:939
```

**Identical width and identical left/right edges.** The panel is not floating
anywhere near the header — it IS the header pill expanding downward. The
header becomes the menu.

**Why this matters for the build:** `header-attached` is a RELATIONSHIP, not a
geometry you configure with numbers. The panel derives its width from the
header, so one rule works whether a client's header is a 438px pill or a
1200px full-width bar — and it degrades correctly on mobile with no extra
work (full-width header → full-width panel). Do not implement it as a fixed
440px box.

Corollary: the lamalama LOOK depends on the header being a compact centred
pill. That is `sgs/site-header`'s job (it already declares `color` +
`__experimentalBorder` supports), not the drawer's.

## 3. Proposed variant taxonomy — axis is WHAT IT ATTACHES TO

| Variant | Attaches to | Width behaviour | Reference |
|---|---|---|---|
| `full-screen` | Viewport | 100vw × 100dvh | current default · dogstudio, fantasy, buck |
| `header-attached` | The header | **Inherits the header's width**, expands downward | lamalama |
| `trigger-anchored` | The burger button | Own width, hangs off the button corner | lusion |
| `side-panel` | A viewport edge | Partial width, slides in | already half-built (`edge: left/right`) |

**Naming rule (binding): descriptive names, never studio names.** This ships
to a restaurant, a law firm and a charity; `variant: "dogstudio"` would be
meaningless to a client and would bake a third party's brand into the
product. Provenance goes in the block.json `_note`.

**Each variant must declare its A11Y CONTRACT, not just its CSS** — the two
compact examples are mechanically different systems, not one recipe with
different numbers:
- lusion: no backdrop, background interactive, explicit close only
- lamalama: backdrop present but click-through, light-dismiss

## 4. Accessibility — we would be IMPROVING on both originals

Neither compact example is a real modal:
- Neither uses a native `<dialog>`; both are plain divs
- **Zero `[inert]` elements** on either — no containment
- No focus trap detected on either
- lusion locks scroll while leaving the background clickable — an odd trap

Verified against MDN, web.dev and [whatwg/html#7732](https://github.com/whatwg/html/issues/7732):
- **`showModal()` is fully spec-supported at ANY size or position.** web.dev:
  the backdrop covers everything while *"the dialog container is free to
  center itself over this backdrop and take whatever shape its contents
  require."* A 438×436 top-anchored `<dialog>` is in-spec.
- The one real platform gap: `<dialog>` does NOT lock background scroll
  natively (issue still open) — manual `overflow:hidden` is required either
  way. lamalama already does this by hand.
- No documented browser bugs for small/partial `showModal()` panels. Sizing is
  pure CSS, orthogonal to the modal mechanics.

**So keeping `<dialog showModal>` gives us `inert` + focus-trap for free where
both reference sites have neither.** Outstanding gap on our side:
`store('sgs/nav')` has no backdrop-click-to-close handler, which
`header-attached` and `side-panel` both want.

## 5. Architecture — ONE block with variants, not two blocks

Every production system checked uses one component with a breakpoint switch:
- **WordPress core Navigation**: `overlayMenu` attribute — `mobile` / `always` / `never` (core already ships an "always")
- **Bricks**: *"This new nestable element contains both your desktop & mobile menu"*
- **Webflow / GOV.UK / Elementor**: same single-component model
- **Lay Theme**: one "Page Overlay" primitive, 3×3 position grid incl. centre, **per-device sub-tabs** — closest to what we want

**The documented failure mode is NOT "one block vs two" — it is one block whose
two modes cannot diverge.** Gutenberg issue
[#39142](https://github.com/WordPress/gutenberg/issues/39142): *"any styles you
apply to the Navigation block will also apply when it is in 'mobile' mode"*.
Kadence users ask for two independent off-canvas areas for the same reason.

**Our position is better than theirs by construction:** the drawer holds its
OWN `sgs/nav-menu` instance with its own uid and inspector (verified live —
page nav `sgs-nav-menu-4b7c46c9` vs drawer nav `sgs-nav-menu-53a6fe97`), so
the two modes already diverge cleanly.

## 6. Code findings — the drawer is fixed-geometry, not mobile-only

- `nav-drawer/style.css:20-33` sets the full-screen box on the BASE rule with
  **no media query**; `render.php` emits zero `@media`. The mobile-only gate
  lives in `nav-menu`'s collapse query, in a different block.
- `edge` is a flat string enum (`full-screen|left|right|top`) — **no `centre`**,
  no responsive object shape, while `drawerGap`/`drawerPadding` ARE responsive
  objects. `ResponsiveControl` is already imported in that same edit.js but
  never applied to geometry.
- `render.php:176` — full-screen mode ignores `width` entirely.
- `style.css:332-346` hardcodes `width: min(88vw, 360px)` on the partial edges —
  a mobile constant baked into the mode meant to give you a panel.
- No `justify-content` on the drawer body (only `align-items` via
  `drawerAlign`), so content cannot be vertically centred — the single most
  visible missing control for the compact look.
- `edge` and `animateFrom` are independent: `edge:"left"` + `animateFrom:"right"`
  is legal and slides the panel out of the side it is anchored to.

**Blast radius is low, and there is a window:** all 16 `sgs/nav-drawer`
instances across 8 theme pattern files carry **zero attributes**, so a new
attribute with a back-compatible default breaks nothing. Spec 33 Part 2
(header/footer cloning) is NOT started, so the converter does not yet have to
emit this — fixing the attribute model now avoids a much harder detection
problem later.

## 7. LATERAL — `sgs/modal` already solves this, and duplicates the engine

`modal/style.css:107-126` ships the centred-card model already: `--small` 480px
/ `--medium` 640px / `--large` 800px, each with `max-width: calc(100vw - 2rem)`
so it degrades to near-full-screen on mobile automatically from ONE value.
And `modal/view.js:85` **hand-rolls its own `dialog.showModal()`** while
`nav-drawer/view.js` delegates entirely to `store('sgs/nav')`.

**Two `<dialog>` engines and two geometry vocabularies for the same primitive.**
FR-36-19's mini-cart (`displayMode: link|flyout|drawer`) and
`sgs/product-search` (`displayMode: inline|icon`) each invent a third and
fourth. A shared dialog-geometry primitive would give the cart flyout, the
search overlay, the modal and the nav drawer a centred-desktop-panel option
ONCE, with FR-36-10's disclosure-vs-dialog contract attached once.

⚠ The mega panel is the inverse case and validates the split: `sgs/mega-panel`
is a DISCLOSURE (non-modal, page stays live). A shared primitive must carry a
modal/non-modal flag or the two will conflict.

## 8. Known traps for the build

1. **⛔ STOP-DIALOG-DISPLAY-GATE (D338).** Any per-device geometry that sets
   `display` on the base `.wp-block-sgs-nav-drawer` rule beats the UA's
   `dialog:not([open]){display:none}` and renders the drawer permanently open,
   in-flow, on every page. A naive `@media` implementation is exactly how this
   gets triggered.
2. **`showModal()` + a partial-width panel makes the visible page `inert`** —
   visible but unclickable. Needs backdrop-click-to-close (not currently
   implemented in `store('sgs/nav')`) or it reads as broken on desktop.
3. **NN/g**: hiding desktop nav *"cuts discoverability almost in half"*. Ship
   the desktop burger with an informational editor Notice (FR-36-12: passive,
   never a gate).
4. **Preset-first UX is mandatory.** `edge` + `width` + `animateFrom` +
   `drawerAlign` is already four abstract controls with hidden
   interdependencies (a client cannot predict that `edge:"top"` +
   `width:"400px"` means HEIGHT 400px). One "Panel style" picker that sets the
   underlying attrs, raw values behind a Customise disclosure.

## 9. Open for next session

**Clustering is SETTLED: exactly TWO compact mechanisms, no third found** after
three rounds and ~30 candidate sites. Both are qualitatively distinct and each
was verified twice (no-backdrop + click-through + explicit-close, vs
backdrop-present + light-dismiss).

**But each cluster's GEOMETRY is n=1.** Round 3 found zero additional compact
panels despite working the Awwwards SOTD list, Land-book, Lay Theme's docs and
~15 direct domain guesses — every new site that opened was full-screen (6/6).

**Reference geometry — treat as design anchors, NOT statistical defaults:**
- Cluster A `trigger-anchored` (lusion.co, n=1): 310×264 nav-only (310×613 with
  its subscribe/labs extras), top ≈108px flush under a 146px header,
  right-inset 72px, radius 10px, no backdrop, scroll-locked, explicit close.
- Cluster B `header-attached` (lamalama.com, n=1): 438×436 = **exactly its
  header's 438×50 pill, same left/right edges**, top:16px, backdrop at
  opacity 1 but `pointer-events:none`, scroll-locked, light-dismiss.

**Decide at build time:** design flexibility AROUND these numbers rather than
hardcoding them (Cluster B especially — it must derive width from the header,
not from 438px). If a second data point for Cluster B is wanted, Lay Theme's
shipped "Desktop Burger Menu" feature (dim/blur backdrop + click-to-close,
per-device sub-tabs) is a documented product spec even though no live showcase
site was confirmed in hand.

**The honest headline for the build: full-screen is what most sites converge on
when a desktop burger appears at all (6 of 8).** The compact panels are a real
but minority pattern. Ship `full-screen` as the default; the compact variants
are the differentiator, not the norm.

## Sources

Measured live: lamalama.com, lusion.co, dogstudio.co, fantasy.co, buck.co.
Primary: [MDN `<dialog>`], [web.dev building-a-dialog-component],
[whatwg/html#7732](https://github.com/whatwg/html/issues/7732),
[W3C ARIA APG Disclosure Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-navigation/),
[Gutenberg #39142](https://github.com/WordPress/gutenberg/issues/39142),
NN/g desktop navigation discoverability, Bricks Academy menu-builder docs,
Lay Theme overlay docs, Kadence support forum.
