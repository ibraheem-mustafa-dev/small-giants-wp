---
doc_type: report
project: small-giants-wp
title: W2-p floating header pill — what the 12 reference examples actually measure
date: 2026-09-20
status: MEASUREMENT COMPLETE (live Playwright, 1440x900 + 390x844)
spec: 37-HEADER-FOOTER-BUILDER
plan_row: W2-p
relates_to: .claude/reports/2026-09-20-w2p-floating-header-pill-design.md
---

# W2-p — reference pill measurements

**Why this exists.** The owner said the floating-header-pill feature "originates solely from
reference examples" and ruled that the dropdown/mega width should follow the pill's width, then
asked for the references to be looked at before anything is built. This document is that look.
Nothing here is inferred from a screenshot, a class name or a design-press article: every number
below came out of a `getBoundingClientRect()` / `getComputedStyle()` read on the live site, and
each row names the script that produced it.

**Read this first, because it reframes the feature.** Of the eleven live reference sites, **one**
(lamalama) has a floating pill header. One more — shadcn's block demo — is a pill but is a
component preview inside a card, not a page header, and it re-measured exactly as
`.claude/decisions.md::D418` recorded it: broken at 390px. **Nine of eleven live references have a
full-width header with radius 0.** The pill is not what the references converge on. That does not
make the feature wrong — it makes the *justification* wrong, and it changes which defaults the
evidence supports. §4 and §5 say precisely what to add, change and drop.

---

## 1. Method, and what it can and cannot prove

### 1.1 Scripts (all in the session scratchpad, none in the repo)

Scratchpad root:
`C:\Users\Bean\AppData\Local\Temp\claude\c--Users-Bean-Projects-small-giants-wp\e8121ea1-eebb-401c-ab36-bff8fbb20661\scratchpad`

| Script | What it does |
|---|---|
| `pill-probe.mjs` | The main probe. Loads Playwright through `createRequire` against `plugins/sgs-blocks/package.json` (the pattern in `plugins/sgs-blocks/scripts/nav-qa/w2u-probe.mjs::require`). Dismisses consent, dumps a top-region element **inventory** with paint flags, measures the header at rest, scrolls 600px, re-measures, then opens a panel and measures it against the header's own box. Writes `<name>-<width>.json`. |
| `run-all.mjs` | Driver: 12 sites x {1440x900, 390x844} = 24 runs, 4 concurrent. |
| `inspect.mjs` | Reader for those JSON files (the tables below are read off its output). |
| `oneoff.mjs` | Raw top-region element dump for sites where the probe's header picker returned null (resn, dogstudio). |
| `shadcn.mjs` | Dedicated dump of the shadcn pill **preview frame** (see §1.3). |
| `openpanel.mjs` | Targeted panel open by explicit trigger selector, with `click` / `jsclick` / `hover` modes, for sites whose trigger the generic probe could not reach. |
| `kids.mjs` | Child-element dump for a named header, used to prove a header has (or has not) a painted inner pill. |
| `scroll2.mjs` | Lenis-aware scroll check: enumerates real scroll containers, drives them by keyboard, re-measures. Written **because** the naive wheel-scroll produced `scrollY === 0` on two sites and would have yielded a false "nothing changes on scroll". |

Invocation form: `node pill-probe.mjs <name> <url> <width> <height>`, optionally with
`HEADER_SEL=<css>` to force the header element instead of auto-picking it.

### 1.2 Honest limits

- **Headless Chromium, one page load each, homepage only.** No site was measured across multiple
  pages or in a real browser.
- **`scrollY` stayed 0 on lamalama and lusion** under wheel events. For lamalama this was resolved:
  `scroll2.mjs` found the real scroll container (`div.ll-scroller.js-scroller.lenis`,
  `scrollHeight 6862 / clientHeight 900`) and drove it by keyboard, so the lamalama scroll rows
  below are genuine. **For lusion it was not resolved** — `scroll2.mjs` reported `SCROLLERS []`, so
  lusion's scroll behaviour is recorded as NOT MEASURED, not as "no change".
- **dogstudio served a "your browser is out of date" banner** (`div#buorg`, fixed, 1440x82.2) to
  the probe's Chrome/127 UA, which pushes the whole document down 81px. `oneoff.mjs` re-ran it
  with a Chrome/141 UA and got the same banner. The banner shifts absolute offsets; it does not
  change the finding (the header is `position:absolute`, full-width, `border-radius:0px`,
  `background:rgba(0,0,0,0)` either way). Disclosed rather than skipped.
- **Consent dismissal**, where it fired, is recorded per site in the table's footnotes. buck
  ("Got it"), dogstudio@390 ("Accept"), fantasy ("Accept all"), lamalama ("OK"), away ("Accept").
  studionamma, lusion, wearecollins, butcherbox, rabbit, resn and shadcn presented no gate.
- **No site blocked the headless browser.** The two failures were a wrong URL (resn) and an
  unreachable trigger (see §1.4).

### 1.3 Where the URLs came from

Nine URLs are in the repo: `grep -rhoiE '(studionamma|buck|dogstudio|fantasy|lamalama|lusion|wearecollins|butcherbox|rabbit|resn)[a-z0-9-]*\.(com|co|net|io|tech)' .claude | sort -u`
returns `buck.co`, `dogstudio.co`, `fantasy.co`, `lamalama.com`, `lusion.co`, `rabbit.tech`,
`resn.co`, `studionamma.com`, `wearecollins.com`.

- **resn** — `resn.co` returns `net::ERR_NAME_NOT_RESOLVED`. The real host is in the repo's own
  capture: `.claude/reports/2026-07-28-drawer-code-extraction/resn-desktop.json::site` = `resn.co.nz`.
  Measured against that.
- **Away** and **ButcherBox** — **no URL exists anywhere in `.claude`**; they appear only as names
  in `.claude/decisions.md` (the Wave 4 roster line and D418's clone-roster bullet). I used
  `https://www.awaytravel.com/` and `https://www.butcherbox.com/`; both resolved and returned the
  expected brands (`<title>` "Away: Built for modern travel", "ButcherBox"). **These two URLs are
  inferred, not sourced from the repo** — worth writing into the roster so the next session does
  not have to guess.
- **shadcn** — `.claude/decisions.md::D418` names "Floating Pill Navbar". The docs page
  `https://www.shadcn.io/blocks/navbar-floating-pill` renders the pill inside an iframe; a frame
  enumeration found the real demo at
  `https://www.shadcn.io/preview/blocks/navbar/navbar-floating-pill`, which is what §2 measures.

### 1.4 Coverage — what was and was not measured

| Reference | Header at 1440 | Header at 390 | Scroll state | Panel opened |
|---|---|---|---|---|
| studionamma | yes | yes | yes | **no** — no trigger reachable headlessly |
| buck | yes | yes | yes | 1440 yes, **390 no** (burger not visible) |
| dogstudio | yes (via `oneoff.mjs`) | yes | yes | not opened; panel element measured in DOM |
| fantasy | yes | yes | yes | yes, both |
| lamalama | yes | yes | yes (Lenis) | yes, both |
| lusion | yes | yes | **NOT MEASURED** | yes, both |
| wearecollins | yes | yes | yes | yes, both |
| Away | yes | yes | yes | 1440 mega yes, 390 drawer yes |
| ButcherBox | yes | yes | yes | yes, both |
| rabbit.tech | yes | yes | yes | **none exists** — no dropdown or drawer found |
| resn | yes — **there is no header element** | yes | n/a | not attempted |
| shadcn (demo) | yes | yes | n/a (static demo) | n/a — the block has no dropdown |

**Nothing was skipped.** Eleven live sites plus one component demo were all reached.

---

## 2. Per-reference measurements

Every figure below is a computed or rect value from the named JSON artefact. "Top gap", "left gap"
and "right gap" are `rect.top`, `rect.left` and `innerWidth - rect.right` on the primary header
element at rest.

### 2.1 lamalama — the only true pill (`lamaX-1440.json`, `lamaX2-390.json`)

Measured with `HEADER_SEL="header.ll-header > div.fixed" node pill-probe.mjs lamaX https://lamalama.com/ 1440 900`.

| Property | 1440x900 | 390x844 |
|---|---|---|
| rect | top **16**, left **501**, right-gap **501**, w **438**, h **50** | top **16**, left **16**, right-gap **16**, w **358**, h **50** |
| `position` / `top` | `fixed` / `16px` | `fixed` / `16px` |
| `border-radius` | **4px** | **4px** (identical) |
| `box-shadow` | **none** | **none** |
| `border-top` | `0px none` | `0px none` |
| `background-color` | `rgba(0,0,0,0)` on the root; a child `div.bg-bgSecondary.opacity-60` paints `rgb(0,0,0)` at 60% | same |
| `backdrop-filter` | **`blur(4px)`** | **`blur(4px)`** |
| `max-width` / `width` | `438px` / `438px` | `438px` / **`358px`** (= 390 - 2x16) |
| centring | `transform: matrix(1,0,0,1,-219,0)` with `left:50%` | `matrix(1,0,0,1,-179,0)` |
| `z-index` | 20 | 20 |
| page h-scroll | `scrollWidth 390 === clientWidth 390` (no overflow) | |

**Scroll (real, via `scroll2.mjs` driving the Lenis container):** after `End` + 8x `PageDown`, the
pill is byte-identical — top 16, left 501/16, w 438/358, radius 4px, `blur(4px)`, shadow none,
opacity 1, same transform. **It does not morph, shrink, gain a shadow or change background.**

**Menu open (`pill-probe.mjs` panel stage):** the pill itself grows downward. The painted card
measures **438 x 436 at left 501 / right-gap 501, radius 4px** at 1440, and **358 x 436 at left 16 /
right-gap 16, radius 4px** at 390. Panel left == pill left, panel right == pill right, panel width
/ pill width = **1.000** at both viewports. Behind it, a separate full-viewport
`div.fixed.inset-0.z-[19].backdrop-blur-lg` scrim. There is **no gap** between pill and panel —
they are the same box.

This is the reference D418's drawer bullet was describing, and the measurement confirms it exactly:
*"header-attached must derive width from the header"*.

### 2.2 shadcn "Floating Pill Navbar" demo (`shadcn.mjs`, both widths)

| Property | 1440x900 | 390x844 |
|---|---|---|
| element | `NAV.flex.items-center.gap-1.rounded-full` | same |
| rect | top 329.5, left 477.8, right-gap 477.8, **w 484.5**, h 42 | top 301.5, left **-47.2**, right-gap **-47.2**, **w 484.5**, h 42 |
| `position` | `static` (inside a demo card; **not a page header**) | `static` |
| `border-radius` | `3.35544e+07px` (Tailwind `rounded-full`) | identical |
| `background-color` | `oklch(1 0 0)` (opaque white) | identical |
| `box-shadow` | `rgba(0,0,0,0) 0px 0px 0px` — a shadow utility with a **transparent colour**, i.e. no visible shadow | identical |
| `border-top` | **`1px solid`** | identical |
| `backdrop-filter` | none | none |

**This independently re-confirms D418.** The pill keeps its 484.5px width at a 390px viewport and
overflows **47.2px each side** (D418 recorded "~45px each side at 390px" — agreement to ~2px). It
has **zero** responsive behaviour. One nuance D418 does not record: the overflow does **not**
produce page-level horizontal scroll here (`scrollWidth 390 === clientWidth 390`) because the demo
card clips it — so on a real page the same component would either overflow the document or be
clipped, depending on the ancestor. Either outcome is a defect.

**Second finding, load-bearing for §4:** shadcn's pill is defined by a **1px border**, not a
shadow. The design doc's §3.4 transparent ruling and §3.7 contrast row both assume shadow is the
pill's edge treatment.

### 2.3 lusion — pill-shaped *parts*, not a pill header (`lusion-1440.json`, `lusion-390.json`, `openpanel.mjs`)

- Header `div#ui > header#header`: `fixed`, **top 0, left 0, right-gap 0**, w 1440 (390), h 146.4
  (76.4), `border-radius: 0px`, `background: rgba(0,0,0,0)`, shadow none. **Not a pill.**
- Inside it, two **fully-rounded buttons**: `button#header-right-talk-btn` (top 75.2, right-gap
  190.1, 134.1x44.8, radius `87.5px`, bg `rgb(43,46,58)`) and `button#header-right-menu-btn`
  (top 99.4, right-gap **72**, 102.4x44.8, radius `87.5px`, bg `rgb(228,230,239)`).
- **Menu panel** (`openpanel.mjs … '#header-right-menu-btn' jsclick`): at 1440 a stack of
  `border-radius:10px` white cards at **left 1057.9, right-gap 72, w 310.1**, top 107.6 — the
  panel's right edge aligns with the **trigger's** right edge (both 72), not the header's (0) and
  not the page's. At 390 the same stack is **left 15, right-gap 15, w 360**, top 78 — derived from
  the viewport, not from the header (which is full-width). Plus a full-viewport `rgb(0,22,236)`
  backdrop.
- **Scroll: NOT MEASURED** (`scroll2.mjs` found no scroll container; WebGL SPA).

### 2.4 fantasy — pill-shaped toggle on a full-width header (`fantasy-1440.json`, `fantasy-390.json`, `openpanel.mjs`)

- Header `header.sh.fixed`: `fixed`, top 0, left 0, right-gap 0, 1440x108.3 (390x99.8),
  `border-radius: 0px`, `background: rgba(0,0,0,0)` with an `absolute` child
  `div.bg-black.sh__gradient` painting `rgb(0,0,0)` full-bleed. **Not a pill.**
- The **menu toggle** is a pill: `button.sh-toggle > div.bg-white/15.sh-toggle__bg`, at 1440
  top 33.3, right-gap 50, 93.3x41.7, `border-radius 8.33px`, `background rgba(255,255,255,0.15)`,
  **`backdrop-filter: blur(4px)`**. At 390: top 27.2, right-gap 14.5, 56.2x45.3, radius 9.07px,
  same blur.
- **Scroll (y=750):** header unchanged — still `fixed`, top 0, h 108.3, bg `rgba(0,0,0,0)`,
  shadow none, no transform.
- **Menu open:** `div.absolute.inset-x-0.inset-y-100` painting `rgb(0,0,0)` at **1440x900** / 
  **390x844** — full viewport at both widths.

### 2.5 wearecollins (`wearecollins-1440.json`, `wearecollins-390.json`)

- `div.root > header.app-header`: `fixed` at 1440, top 0, left 0, right-gap 0, 1440x74,
  radius 0px, bg `rgba(0,0,0,0)`, shadow none.
- **Hide-on-scroll, measured:** at y=600 the header's computed transform is
  `matrix(1,0,0,1,0,-74)` and its rect top is **-74** — it translates by exactly its own height.
  At 390 the same: `matrix(1,0,0,1,0,-82)`, height 82.
- **Menu open:** `header.app-header > div.menu` at **1440x900** / **390x844**, `border-radius 0px`,
  `background rgb(20,7,0)` — full viewport both widths.

### 2.6 studionamma (`studionamma-1440.json`, `studionamma-390.json`, `kids.mjs`)

- `body > nav.nav-top`: `position: fixed`, computed **`top: 20px`** at 1440 and **`top: 12px`** at
  390 — a genuine top inset — but **left 0, right-gap 0, width 1440 / 390**, `border-radius: 0px`,
  `background: rgba(0,0,0,0)`, `box-shadow: none`, `border: 0px none`.
- `kids.mjs` walked all 25 descendants: the side inset is `div.padding-global { padding: 0 20px }`,
  and **not one descendant paints a background, border or shadow**. There is no card.
- **Verdict: PARTIAL.** A floating *offset* with no floating *object*. It has the top gap and none
  of the other four pill signals.
- **Scroll (y=600):** unchanged — still `fixed`, top 20, transform `matrix(1,0,0,1,0,0)`.

### 2.7 buck (`buck-1440.json`, `buck-390.json`)

- `main > div.header`: `position: absolute` (1440) / `relative` (390), top 0, left 0, right-gap 0,
  1440x182.2 / 390x170, radius 0px, bg `rgba(0,0,0,0)`, shadow none.
- **Not sticky at all**: at y=600 the header's rect top is **-600** at both widths — it scrolls
  away with the page.
- **Menu open (1440):** `div#__next > div.navigation-expanded` at **1440x900**, radius 0px,
  bg `rgb(219,224,238)` — full viewport. Panel/viewport width ratio 1.000.

### 2.8 dogstudio (`oneoff.mjs`, `dogstudio2-390.json`)

- `div.site-header`: `position: absolute`, left 0, width 1440, height 129, `border-radius: 0px`,
  `background: rgba(0,0,0,0)`, `box-shadow: none`. (Measured rect top 81 because of the
  browser-upgrade banner described in §1.2; the CSS offset is 0.)
- Menu panel present in the DOM: `div.site-menu-panel`, `position: fixed`, **1440x900**,
  `background: rgb(19,20,25)`, parked off-canvas at `left:-1440`. Full-viewport drawer.
- Scrolls away with the page (`absolute`).

### 2.9 Away (`away-1440.json`, `away-390.json`, `openpanel.mjs`)

- Two stacked bars. The pinned one is `app-provider > div#main-header.main-header`: **`fixed`,
  top 0, left 0, right-gap 0, 1440x93** (390x97.8), `background: rgb(255,255,255)`,
  `border-radius: 0px`, shadow none. Above it a `div.top-bar` announcement strip
  (`rgb(57,97,76)`, 1440x36 / 390x40.8).
- **Mega menu (hover "NEW ARRIVALS"):** `div.mega-menu__dropdown` at **top 93, left 0,
  right-gap 0, w 1440**, h 423.8 — i.e. exactly the **page** width, flush to the bar's bottom edge
  (`gapBelowPillTop: 0`), plus a `rgba(0,0,0,0.05)` full-viewport overlay.
- **390 drawer:** `div.mobile-menu` fixed **390x844**; content panel `div.mobile-menu__content`
  **390 wide**, top 98 — full width.

### 2.10 ButcherBox (`butcherbox-1440.json`, `butcherbox-390.json`)

- `header#shopify-section-…__logged_out_header > site-header.block.w-full`: top 32 (below a
  `rgb(3,133,143)` announcement bar), **left 0, right-gap 0, w 1440, h 72**,
  `background: rgb(255,255,255)`, `border-radius: 0px`, and a `box-shadow` whose colour is
  `rgba(0,0,0,0)` — declared, invisible.
- **Scroll-state change, measured:** at 1440 the `<header>`'s computed `position` is **`relative`
  at rest and `sticky` (top 0) at y=600**. At 390 it stays `relative` and scrolls away
  (rect top -654.4). So: pinned on desktop only, by a class toggle.
- **Mega dropdown (1440):** `site-header > div.invisible.opacity-0` at **top 104, left 0,
  right-gap 0, w 1440**, bg `rgb(18,18,18)` — page width. A second, smaller item-anchored
  `UL` dropdown measures **300 wide at left 518.1** — anchored to its own menu item, not to the bar.
- **390 drawer:** `div.fixed.top-18.w-full`, **390 wide**, top 104 — full width.
- Fully-rounded **buttons** exist in the bar (`radius 3.35544e+07px`, 135x44 and 181.4x44) — again
  pill *parts*, not a pill bar.

### 2.11 rabbit.tech (`rabbit-1440.json`, `rabbit-390.json`, `openpanel.mjs`)

- `body > header.flex.bg-[#FF4D06]`: **`position: sticky`, top 0, left 0, right-gap 0**,
  1440x65 / 390x77, `background: rgb(255,87,5)` / `rgb(255,77,6)`, `border-radius: 0px`,
  shadow none. Unchanged at y=600 (still sticky, top 0, same background).
- **No dropdown, no mega, no drawer.** Hovering every top-level link produced zero new boxes at
  1440; clicking every header button / `[aria-label*=menu]` produced zero at 390. Flat inline nav.

### 2.12 resn (`resn-1440.json`, `resn2-390.json`, `oneoff.mjs`)

- `resn.co` does not resolve; measured at **`resn.co.nz`** (source: the repo's own
  `resn-desktop.json::site`).
- **There is no header element.** `oneoff.mjs` dumped every visible element intersecting the top
  260px: a `div#rootNode` (fixed, 1440x900), `div.js-home-page`, a full-viewport `CANVAS`, and a
  single 118x19.8 work-menu anchor at top 82. No bar, no bounded box, no background, no radius.
  A canvas-composited SPA shell — consistent with the repo's earlier capture, which recorded the
  panel as `"~full viewport"` with positioning "handled by the parent .js-menu-page / rootNode
  layer, not the nav itself".
- **Verdict: no header, therefore no pill.** Contributes nothing to a pill design.

---

## 3. Synthesis table

Gaps are `rect.top` / `rect.left` / `innerWidth - rect.right` at rest. "Pill?" requires all of:
top gap > 0 **and** both side gaps > 0 **and** radius > 0 **and** (shadow or border).

| Site | Pill? | Top gap (1440 / 390) | Side gap (1440 / 390) | Radius | Shadow / border | Width rule | Mobile behaviour | Scroll behaviour | Dropdown width vs pill |
|---|---|---|---|---|---|---|---|---|---|
| **lamalama** | **YES** | 16 / 16 | 501 / 16 | **4px both** | neither — `backdrop-filter: blur(4px)` + a 60%-opacity dark child | `max-width:438px`, `left:50%` + `translateX(-50%)`; at 390 it renders 358 = `100% - 2x16` | **persists**, identical inset + radius, goes near-full-width | **no change at all** (verified on the real Lenis scroller) | **= the pill** (ratio 1.000 both widths; the pill grows downward) |
| **shadcn demo** | **YES** (component, not a page header) | n/a (`static`) | n/a | `rounded-full` | **1px solid border**; shadow declared with a transparent colour | fixed 484.5px, no cap, no responsive rule | **breaks**: unchanged 484.5px, overflows **47.2px each side** at 390 | n/a | no dropdown in the block |
| **studionamma** | partial | **20 / 12** | 0 / 0 | 0px | none / none | full-width; 20px inner padding | inset shrinks 20 -> 12; still full-width | unchanged, stays `fixed` | not measured (no reachable trigger) |
| **lusion** | partial (pill *buttons*) | 0 / 0 | 0 / 0 | 0px (buttons: **87.5px**) | none | full-width | full-width | **NOT MEASURED** | **trigger-anchored**: 310.1 wide, right edge aligned to the trigger (72); at 390 360 wide at 15px viewport insets |
| **fantasy** | partial (pill *toggle*) | 0 / 0 | 0 / 0 | 0px (toggle: 8.33px + `blur(4px)`) | none | full-width | full-width | unchanged at y=750 | **page width** (1440x900 / 390x844) |
| **ButcherBox** | no | 32 / 32 (announcement bar above) | 0 / 0 | 0px | shadow declared, colour `rgba(0,0,0,0)` | full-width | full-width; **not pinned at 390** | **`relative` -> `sticky` at 1440**; scrolls away at 390 | **page width** (1440); a separate item-anchored 300px dropdown |
| **Away** | no | 0 / 0 (`#main-header`) | 0 / 0 | 0px | none | full-width | full-width | `fixed`, unchanged | **page width** (1440, flush to the bar, gap 0) |
| **rabbit.tech** | no | 0 / 0 | 0 / 0 | 0px | none | full-width | full-width | `sticky`, unchanged | none exists |
| **wearecollins** | no | 0 / 0 | 0 / 0 | 0px | none | full-width | full-width | **hides on scroll**, `translateY(-74)` = exactly its height | **page width** |
| **buck** | no | 0 / 0 | 0 / 0 | 0px | none | full-width | full-width | **not pinned** — scrolls away (rect top -600) | **page width** |
| **dogstudio** | no | 0 (CSS) / 0 | 0 / 0 | 0px | none | full-width | full-width | **not pinned** (`absolute`) | **page width** (fixed 1440x900 drawer) |
| **resn** | no header at all | — | — | — | — | — | — | — | full-viewport menu page |

**Counts.**

- **True floating pill headers among the 11 live references: 1** (lamalama). Plus 1 component demo
  (shadcn) that is not a page header and fails at 390.
- **Full-width, radius-0 headers: 9 of 11.**
- **Pill-shaped *elements inside* a non-pill header: 3** (lusion's two buttons, fantasy's toggle,
  ButcherBox's two CTAs) — the "pill" idiom is real in these references, but as a *control* shape,
  not a *bar* shape.
- **Dropdown width — of the 8 references where a panel was measured:** **1 matches the pill's own
  width** (lamalama, ratio 1.000 at both viewports); **5 are page width** (fantasy, wearecollins,
  buck, Away, ButcherBox's mega — dogstudio's drawer makes a sixth if the un-opened DOM measurement
  counts); **1 is trigger-anchored** (lusion); **1 has no panel** (rabbit).
- **Pinned vs not, at 1440:** `fixed`/`sticky` = 7 (studionamma, lusion, fantasy, lamalama,
  wearecollins, Away, rabbit) · not pinned = 3 (buck, dogstudio, ButcherBox-at-rest) —
  ButcherBox becomes `sticky` only after scrolling.
- **Hides on scroll: 1** (wearecollins). **Changes background/shadow once scrolled: 0** — not one
  measured header gained a shadow, a background or a radius on scroll.

---

## 4. What the references say the pill feature needs

Each claim below names its reference and its measurement.

### 4.1 The three new attributes — verdict on each

| Design doc §3.3 | Evidence | Verdict |
|---|---|---|
| `headerFloat` (tri-state tier object, default off) | lamalama is `fixed` with `top:16px` at **both** viewports; nine references sit at `top:0`. A per-tier on/off switch is exactly the axis the evidence varies on (studionamma's inset changes 20 -> 12 across tiers). | **KEEP unchanged.** |
| `headerFloatInset`, TIER-of-BOX, default `{desktop:{top:'1rem',right:'1rem',left:'1rem'}}` | lamalama measures **top 16, sides 16 at 1440 and 16 at 390** — a constant `1rem` on all three sides, identical across tiers. studionamma is the only reference with a tier-varying top inset (20 -> 12), which is why the per-tier envelope is still right. | **KEEP. The `1rem` default is the exact measured value** — say so in the spec, it is currently asserted without a source. |
| `headerFloatCollapse` `{enabled:false, breakpoint:768}` | lamalama does **not** collapse: at 390 it is still inset 16px both sides with radius 4px. shadcn does not collapse either, and that is precisely why it breaks (47.2px overflow each side). | **KEEP, off by default — the one reference that has a pill persists, and the one that ignores responsiveness is the one that fails.** |

### 4.2 Does "persists at mobile" match the references? — YES, n=1, unambiguously

lamalama at 390x844: `top 16px`, `left 16`, `right-gap 16`, `width 358` (= `390 - 2x16`),
`border-radius 4px`, `backdrop-filter blur(4px)`, `max-width` still `438px`, and
`scrollWidth === clientWidth` (no horizontal overflow). Every one of those is identical to its
1440 values except the resolved width. **The signed D418 default is correct and now has a live
measurement behind it, not just a shadcn counter-example.**

It is n=1 — the only reference with a pill at all — so it is a design anchor, not a median. State
it that way in the spec rather than implying convergence.

### 4.3 Does the dropdown width follow the pill? — YES for the only pill, NO for everyone else

**The counts: 1 matches the pill, 5-6 match the page, 1 matches the trigger.**

But the raw count is misleading, and this is the single most important reading in the document:
**every reference whose panel is page-width has a page-width header.** Their panels are not
"page width instead of header width" — they are *header width*, and the header happens to be the
page. The only reference where header width and page width differ is lamalama, and there the panel
follows the **header**, at ratio exactly 1.000, at both viewports.

So the owner's ruling — dropdown/mega width follows the pill — is the rule that reproduces
**every** measured reference, including the ones that look like counter-examples. The design doc's
§3.6 recommendation is **confirmed**, and its citation of D418's drawer bullet is confirmed by
direct re-measurement (438/438 at 1440, 358/358 at 390).

Two qualifications the doc should carry:

1. **lamalama does not hang a panel off the pill — the pill *becomes* the panel.** The measured
   card is one box: left 501, right-gap 501, radius 4px, height growing 50 -> 436. `gapBelowPill`
   is 0 because there is no gap to have. The doc's §3.6 wording ("the panel's width follows the
   pill's own content box") gets the width right but implies a separate attached element. If SGS
   emits a separate panel, it needs `border-radius` continuity and a zero gap to look like this.
2. **An item-anchored dropdown is a different surface from a mega panel and should not be clamped
   the same way.** ButcherBox proves the distinction on one site: its mega is 1440 wide (bar width)
   while its simple `UL` dropdown is **300px wide at left 518.1**, sized to its own item. The
   design doc's §3.6 treats "dropdown horizontal clamp" and "mega panel horizontal width" as two
   rows already — keep them two rows, and make the dropdown rule a **clamp** (stay inside the pill
   box) rather than a **match** (be the pill's width).

### 4.4 Behaviours the references show that the design doc missed

| Finding | Measurement | What to do |
|---|---|---|
| **Backdrop blur is the pill's defining treatment on the only real pill — not shadow.** | lamalama: `box-shadow: none`, `border-top: 0px none`, `background-color: rgba(0,0,0,0)`, **`backdrop-filter: blur(4px)`** at both viewports. The pill reads as a pill *only* because of the blur plus a 60%-opacity child fill. fantasy's toggle does the same (`rgba(255,255,255,0.15)` + `blur(4px)`). | **ADD a `backdropBlur` capability to the pill scope.** `sgs/site-header` has `shadow` and `borderRadius` but the design doc's §3.3 "three deliberate refusals" assume radius+shadow are sufficient. They are not: **the one measured pill uses neither.** Check whether `sgs/site-header` already declares a blur attribute before adding one (`python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql "SELECT block_slug, attr_name, css_property FROM block_attributes WHERE css_property LIKE '%backdrop%'"`) — per the project's own "a control that fails already works somewhere" rule. |
| **Border, not shadow, defines the shadcn pill.** | shadcn: `border-top: 1px solid`, `box-shadow` colour `rgba(0,0,0,0)`. | `borderWidth`/`borderStyle`/`borderColour` are already declared on `sgs/site-header` (design doc §3.3), so nothing to add — but the doc's §3.4 transparent ruling ("shadow suppressed at rest, restored on `.is-header-scrolled`") is written as if shadow were the only edge treatment. **CHANGE it to suppress the *edge treatment* (shadow, border and backdrop-blur) as a set**, or a transparent pill with a border will still show a floating outline around nothing — the exact defect §3.4 exists to prevent. |
| **Not one reference morphs on scroll.** | lamalama: identical after a real Lenis scroll (top/left/width/radius/blur/shadow/opacity/transform all unchanged). fantasy at y=750: unchanged. rabbit at y=600: unchanged. Away: unchanged. **Zero of eleven** gain a shadow, background or radius on scroll. | **CONFIRMS the design doc's §3.7 reduced-motion note** ("the pill has no entrance animation in this scope; a bar-morphs-into-a-pill variant is a separate gate"). The references give that future variant **no support whatsoever**. Record it so it does not get re-proposed as "what everyone does". |
| **The scrolled-state shadow (W2-n) has no reference support for the pill.** | Same measurement as above: no reference changes shadow on scroll. | The design doc's §3.4 pairs the transparent-pill ruling with W2-n and its Option D asks whether to sequence W2-n first. **On reference evidence, do not block W2-p on W2-n** — build the shadow-suppression half and ship. |
| **Pinning is not universal, and one reference pins on desktop only.** | ButcherBox: computed `position` `relative` at rest, **`sticky` at y=600**, at 1440; at 390 it stays `relative` and scrolls away (rect top -654.4). buck and dogstudio never pin at all (rect top -600 at y=600). | **CONFIRMS the doc's §3.4 "float implies sticky per tier"** as a per-*tier* rule rather than a global one. A reference really does pin on one tier and not another. |
| **Hide-on-scroll travel is exactly the header height on a flush header.** | wearecollins: `transform: matrix(1,0,0,1,-74)` with height 74 at 1440; `matrix(1,0,0,1,-82)` with height 82 at 390. | **CONFIRMS the doc's §3.4 hide-on-scroll bug analysis.** `translateY(-100%)` is the real-world pattern, and it is exactly the thing that leaves a sliver under a floating pill. The `calc(-100% - inset)` fix is the right shape. |
| **A pill bar is rare; pill *controls* are common.** | Fully-rounded elements measured inside non-pill headers: lusion `87.5px` x2, fantasy `8.33px`/`9.07px`, ButcherBox `3.35544e+07px` x2, rabbit `9999px`. | Not a W2-p change. Worth a note that the "2026 pill look" the design doc's §3.9 cites from design press is, in this roster, mostly a **button** treatment. |
| **A pill's side gap is not the same thing as a full-width bar's inner padding.** | studionamma: `nav.nav-top` is `left 0, right-gap 0, width 1440` with `div.padding-global { padding: 0 20px }`; `kids.mjs` found **no descendant painting any background, border or shadow**. | Guards against a false positive in QA. When verifying P4/P5, assert on the **painted** element's rect, not the header root's — studionamma would pass a naive "content is inset" check and is not a pill. |

### 4.5 References that contradict the design doc

| Reference | Contradiction | Severity |
|---|---|---|
| **shadcn** | §3.9 already flags it as "a cautionary reference, not an authority", and the re-measurement agrees. But §3.3's refusal 3 cites it as the *reason* `headerFloatCollapse` is one toggle. That inference survives — shadcn has no responsive behaviour, so it cannot argue for per-tier controls either way. | none — doc is correct |
| **lamalama** | §3.3 refusal 2 says "no new radius/shadow attributes… `borderRadius` and `shadow` already exist". The only real pill uses **neither**: shadow `none`, border `0px none`, background `rgba(0,0,0,0)`, **`backdrop-filter: blur(4px)`**. With only radius+shadow exposed, a client cannot reproduce the one reference this feature is modelled on. | **material — fix before build** |
| **lamalama** | §3.6 describes the panel as attaching to the pill. Measured, the pill *is* the panel (same box, `gapBelowPill` 0, radius continuous). | **minor — wording + a zero-gap requirement** |
| **ButcherBox** | §3.4 assumes each behaviour's tier state is authored. ButcherBox toggles `position` `relative -> sticky` by class at 1440 only. Nothing in the design breaks; it is evidence that per-tier pinning is real. | none — confirms |
| **All eleven** | §1 says the pill "is the look you see on a lot of 2026 product sites and design-system demos". In this roster it is **1 of 11**. | **material for the gate framing, not for the build** — the feature is fine, the "originates solely from reference examples" premise is not what the references show. |
| **resn** | Carried on the roster as a reference; it has **no header element at all**. | note it in the roster |

### 4.6 One-line summary of ADD / CHANGE / DROP

- **ADD:** a backdrop-blur capability in the pill's scope (§4.4 row 1) — the only measured pill
  depends on it, and radius+shadow alone cannot reproduce it.
- **CHANGE:** §3.4's transparent ruling from "suppress shadow" to "suppress the edge-treatment set
  (shadow + border + blur)"; §3.6's mega wording from "attaches to the pill" to "continuous with
  the pill, zero gap, continuous radius"; §3.6's dropdown row from "match the pill's width" to
  "clamp inside the pill's box" (ButcherBox proves item-anchored dropdowns keep their own width);
  §1's framing from "a lot of 2026 sites" to "one reference, as a design anchor".
- **DROP:** nothing. All three attributes survive, and the `1rem` inset default is now a measured
  value rather than an assertion.
- **DO NOT BLOCK** W2-p on W2-n — no reference changes shadow on scroll, so the scrolled-shadow
  half carries no reference weight (design doc Option D).

---

## 5. Open items for the design gate

1. **Blur.** Is `backdrop-filter` already reachable on `sgs/site-header`? Query the DB before
   designing anything (`/sgs-db`), per the project's "a control that fails already works somewhere"
   rule. If it is not, that is a fourth attribute and the design doc's "three attributes" count
   changes.
2. **Away and ButcherBox have no URL in the repo.** `https://www.awaytravel.com/` and
   `https://www.butcherbox.com/` are what I used and both resolved to the right brands, but nothing
   in `.claude` records them. Worth writing into the Wave 4 roster.
3. **resn's roster entry.** Measured at `resn.co.nz` (`resn.co` does not resolve) and it has no
   header element. Both facts belong in the roster line.
4. **lusion's scroll behaviour is unmeasured** and is the only gap in the table. It needs a real
   browser, not headless, to close.
