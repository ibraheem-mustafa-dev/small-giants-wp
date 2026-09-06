# sgs/timeline — tall milestones, the reading-line marker, and the gated scroll-effect list

**doc_type:** design
**Status:** BUILT AND LIVE, 2026-08-30. All four steps shipped (`eb3ed2a04`, `24cc70a5a`,
`2b4d39278`, `2686575e4`, `9a3159b4d`). Evidence: `reports/visual-diff/timeline-2026-08-30.md`
Addenda 19-22. ⚠ Where this document and those addenda disagree, THE ADDENDA WIN — they record
what was measured, this records what was planned.
**Date:** 2026-08-30
**Council:** three cold raters (code-path tracer, client-experience, adversarial red-team), run
2026-08-30. Red-team returned NO-GO on the first pass. Every finding is dispositioned in §10;
the revisions are folded into the body below.

**Extends** `2026-08-30-timeline-layered-control-model-design.md` (shipped as D894–D897). Where the
two disagree, the corrections in §0 win.

---

## 0. Corrections to the prior design doc — apply these before building from it

Four factual errors in the signed doc, verified against the tree 2026-08-30.

1. **Its status header still reads `PROPOSED — not approved, no code written`** while D894–D897
   shipped it. Stale.
2. **It names the attribute inconsistently.** §2 says `scrollEffect`; §3, §4, §7 and §9 still say
   `visualisation` — 7 occurrences against 3. **The attribute is `scrollEffect`.**
3. **Problem C is wrong.** It states `fx-pin-scrub`, `fx-scrub` and `fx-horizontal-panel` are all
   "wired to nothing" for the timeline. **`scrub` IS wired** — `sgs/timeline` appears in
   `generated-fx-qualifying-blocks.json`'s `scrub` list, reachable today via the generic picker.
4. **`contentSide` already exists** (`block.json:153`). The handoff called it new and said it
   needed a DB reseed. It does not.

---

## 1. What is being designed, in plain English

1. **Tall milestones.** A client can make each milestone a full-height section with a large image
   beside the text. Bean: *"our timelines should be longer, and have each section taller and the
   media/image sit similar to hero split block."*
2. **The progress marker.** The dot currently sits near the bottom of the screen and the line fills
   before the reader has started. Both move to a comfortable reading position.
3. **The scroll-effect list.** Motion options, gated by the direction the client picked.

⚠ **§5.6 deferred "Pin and slide sideways" — Bean OVERRULED that and chose to change the root
element instead. It is BUILT and measured at 2,266px of travel (Addendum 22).** Moving the `<ol>`
inside a `<div>` root, rather than deleting it, kept one-list-N-items semantics intact, so the
accessibility cost §5.6 feared did not materialise. All four options ship.

---

## 2. Assumptions ledger

| # | Claim | Status | Evidence |
|---|---|---|---|
| P1 | Marker sits at 78–92% of viewport for the whole readable window | **PROVEN** | Measured live, 5 samples, canary 3079 #5. Addendum 18. |
| P2 | Fill is 84.6% complete when the block's top reaches the screen top | **PROVEN** | Same sweep. (Recorded as 73% before — one point, and flattering.) |
| P3 | Cause is `view()` + `entry 0% exit 100%` spanning `vh + h` = 1638px | **PROVEN** | `style.scss:368-385`; arithmetic matches the measured curve. |
| P4 | **Marker position is already a pure function of the fill value** | **PROVEN — council-verified airtight** | Three rules set `::after`'s `top` (`style.scss:138-142` vertical, `:184-188` horizontal, `:1036-1039` mobile) and **all three use the identical formula**. Zero `sticky` in the file. |
| P5 | Two fill drivers, mutually exclusive | **PROVEN, but the exclusivity is browser-keyed, not stylesheet-keyed** | `view.js:249-262` gates on `CSS.supports(…)`. **This detail is load-bearing — see §4.4.** |
| P6 | Firefox stable has no `animation-timeline`; JS is its primary path | **PROVEN** | Firefox 157 stable. |
| P7 | An entry is four FLAT grid children; grid is `1fr auto 1fr`, `align-items: start`, rows `auto` | **PROVEN** | `render.php:663-706`; `style.scss:481-486`. No fixed row height to fight `align-self: stretch`. |
| P8 | `chromeOffsetPx()` returns a live header height, explicit 0 when not pinned | **PROVEN** | `provider.js:159-192`. |
| P9 | `motion-utils.js` has zero imports; exactly two `chromeOffsetPx` callers | **PROVEN** | `fx-image-sequence.js:443`, `provider.js:257`. Both satisfied by a re-export. |
| P10 | A reading line at ~38% of usable viewport is right | **ASSUMED** | Research-backed, **not seen by Bean**. §4.6 ships an A/B. R-31-13. |
| P11 | `<ol>` may contain only `<li>`/`<script>`/`<template>` | **PROVEN** | HTML spec, and `render.php:715-720` states it in the block's own comment — which is why the progress connector is itself an `<li>`. **Basis for the §5.6 deferral.** |

---

## 3. Tall milestones — `milestoneSize`

### 3.1 The finding that makes this small

**The timeline is already a split layout.** Per P7 an entry is four flat grid children in a
three-column grid (measured `688.5px 16px 688.5px` at 1440px): media and date in one outer column,
content in the other, rail down the middle. That is a hero split with a rail through it.

So "make the media sit like the hero split block" needs **no new DOM, no nested grid, no second
layout engine**. Three changes:

| Today | Full-height |
|---|---|
| Row height content-driven (~180px) | Row has a minimum height |
| `milestoneMediaWidth` default `180px` — a thumbnail | Media fills its column |
| Media at top of cell (`align-items: start`) | Media `align-self: stretch`; content `align-self: center` |

Council-verified: rows are `auto` with `align-items: start`, so a per-item `align-self: stretch`
override is uncontested — nothing fights it.

### 3.2 The attribute

`milestoneSize`, enum `compact | full-height`, default `compact`. Label **"Milestone size"**,
options **"Compact"** / **"Full-height"**. In the **Layout** panel beside `contentLayout`.

Its own axis, not a `contentLayout` value — height and media treatment are orthogonal to how
entries line up. Folding them together would rebuild the conflation the `alignment` split
(`f8b5f6916`) spent a session removing.

### 3.3 Height: a minimum, chosen from a dropdown

`min-height`, never `height`. A fixed `100vh` clips a long milestone — silent content loss.

**`milestoneMinHeight` is a `SelectControl`, not a free-text length.** A tech-illiterate owner
typing `80v` gets a silently broken layout with no feedback, and "a setting that requires touching
code is not done".

⚠ **Match `sgs/hero`'s existing solution, and match it properly.** Hero solved this at
`hero/edit.js:1046-1071` with a `SelectControl`. Its labels are the **raw values** (`50vh`, `75vh`,
`520px`) with only `Auto (fit content)` given a plain-English name. The council proposed inventing
friendly names ("Comfortable", "Full screen") — **rejected**: that would diverge from hero and
create a *third* labelling convention on a project whose live front is control uniformity. The
defect being fixed is free-text entry, and a dropdown fixes it completely.

Options (hero's list, trimmed to values that make sense for a milestone):
`Auto (fit content)` = `''` · `50vh` · `75vh` · `80vh` (default) · `100vh` · `520px` · `600px`

`Auto` is a real escape hatch: a client with one very long milestone can opt out of the minimum
entirely.

⛔ **`min-height` must NOT apply at ≤767px.** At mobile an entry is a single 328px column (measured);
an 80vh minimum gives four screens of whitespace. Scope to `min-width: 768px`. **Write the media
query first** — D894 was caused by exactly this, a `(0,5,0)` rule losing to a `(0,6,0)` rule that
carried no media query.

### 3.4 Media treatment

Scoped to `milestoneSize: full-height` **and** `min-width: 768px`:

- media-slot `align-self: stretch`, `object-fit: cover`
- content `align-self: center`
- `milestoneMediaWidth` ignored in full-height; media fills its column

**Named as out of scope rather than silently dropped:**

- **`mediaParallax` / `mediaKenBurns`.** D597 records `sgs/hero` and `sgs/container` each declaring
  a *different* animation under the same global `@keyframes sgs-ken-burns`, silently overwriting
  each other across every block sharing the wrapper. Inheriting that during a layout change makes a
  real regression unfalsifiable. Ship the layout; add motion against a stable baseline.
- **Per-image crop control.** With `object-fit: cover`, a portrait and a landscape photo in
  different milestones crop differently and the client cannot correct it. Accepted for v1.
- **Per-entry decorative flag.** ⚠ Alt text itself is **not** a gap — `render.php:110-113` shows it
  is handled WordPress-natively on the attachment. But `milestoneMediaDecorative` is a **block-wide**
  toggle, so a client cannot mark one milestone's team photo meaningful and another's background
  texture decorative. Negligible at 180px thumbnails; material when every image is full-height.
  **Flagged for the build phase as a small follow-on, not v1.**
- **Connector visual weight.** Four milestones at 80vh is a ~3,200px block. The 2px rail and its dot
  may read as thin against tall image-heavy rows. Watch it in the §4.6 A/B; no change planned.

### 3.5 `entryGap`

Ships with `milestoneSize` — they interact, and a tall milestone wants different spacing. Single
length (prior doc's Q4). Today hardcoded at `style.scss:488`.

### 3.6 Panel placement (council finding)

The Layout panel already carries 5 rows; adding three more crosses the ~6-row "wall" the block's own
comment (`edit.js:806-809`) names. Therefore:

- **Layout panel** gains `milestoneSize` only (→ 6 rows). It is a genuine layout choice.
- **"Milestone media" panel** (currently 2 rows) gains `milestoneMinHeight` + `entryGap`, and is
  renamed **"Milestone size & media"** (→ 4 rows).
- **"Scroll reveal"** (3 rows) gains `scrollEffect` (→ 4 rows).

**Panel count stays at 8** — the prior sign-off's ceiling holds, and no panel crosses the wall.

### 3.7 Help text — the desktop/mobile coupling

`full-height` silently reverts to compact below 768px. A client building on a laptop will never
learn this; the canvas does not render at 375px. Permanent help text on `milestoneSize`:

> "On phones this always shows as the compact size — full-height only applies from tablet width up,
> so there's room for it."

Plus the content-weight note: four milestones with a real image and a paragraph look superb; eight
sparse ones are a long scroll through whitespace. Help text, not a hard limit.

---

## 4. The progress marker

### 4.1 `position: sticky` is the WRONG fix — council-confirmed

The approved plan said the marker should be held at the reading line with `position: sticky` **and**
the fill recomputed. **Only the second half should be built.**

Per P4 — which the code-path tracer verified as the one airtight claim in this document — the marker
head is `::after` at `top: calc(var(--sgs-timeline-fill-progress) * 100%)` in **all three** rules
that ever position it. Its position has always been a pure function of the fill. The two have never
been able to drift. The marker is low for exactly one reason: **the fill mapping is wrong.**

```
fill     = clamp01( (readingLine − blockTop) / blockHeight )
marker y = blockTop + fill × blockHeight
         = blockTop + (readingLine − blockTop)
         = readingLine                                        ∎  (unclamped region)
```

**Why sticky would make it worse, not merely redundant.** The dot *is* the fill head — the same
`--sgs-timeline-fill-progress` drives both the mask that cuts the fill (`style.scss:117`) and the
dot's `top`. Sticky would decouple them, parking the dot at the reading line while the fill head sat
somewhere else: a dot floating in the middle of an unfilled line, detached from the thing it marks.
That is a worse design, and it would also be a second mechanism doing a job the first already does —
two overlapping fixes are unfalsifiable, so neither could ever be safely removed.

### 4.2 The clamp — analysed, because the red-team was right that it wasn't

The proof above holds only between the clamps. The red-team argued the clamped regions might
dominate and look "frozen/broken". Working it through on real geometry:

**Tall block (4 × 80vh ≈ 3,200px, 900px viewport, readingLine 342px), total transit 4,100px:**

| Region | Scroll span | % of transit | What the reader sees |
|---|---|---|---|
| fill clamped 0 | 558px | 14% | Empty line, dot at its start, riding the block's top edge |
| **unclamped — dot exactly at reading line** | **3,200px** | **78%** | The designed behaviour |
| fill clamped 1 | 342px | 8% | Full line, dot at its end |

**Compact block (738px — today's measured canary), total transit 1,638px:** 34% / 45% / 21%.

**Verdict: the clamped states are correct, not broken.** At fill 0 the line is empty and the dot
sits at its start; at fill 1 the line is full and the dot sits at its end. That is what a progress
indicator *should* show, and in both states the dot still moves down the screen with the page — it
is fixed relative to the *rail*, never frozen relative to the *viewport*. The red-team's concern
was reasonable and its demand to analyse the clamp was right; its conclusion that sticky may be
needed is not, and §4.1 explains why sticky would actively hurt.

⚠ **But its scenario 6 stands and is the single most likely quiet failure:** the tall regime is the
one this design exists to enable, and Addendum 18's evidence was taken on a **738px** block. **The
§4.6 A/B must be run on a tall block, not the existing compact canary.** Committed to in §9.

### 4.3 The reading line, with the sticky header

```
readingLine = chromeOffsetPx() + 0.38 × (viewportHeight − chromeOffsetPx())
```

38% of the **usable** viewport, below whatever chrome is actually pinned — not 38% of the raw window
offset downward. On a 900px viewport with a 93px header: 400px. With no header: 342px.

`chromeOffsetPx()` (P8) is the right source and must not be re-implemented: it reads the live
`--sgs-header-height` from a ResizeObserver, returns an explicit **0** when the header is not
actually pinned (gating on computed position, so a sticky-and-transparent header — which computes
`absolute` — correctly contributes nothing), and measures the admin bar as a separate live term.
D330 deleted a duplicate publisher; do not create a third.

⚠ **Tolerate the pre-JS window.** `utilities.css:22` sets `--sgs-header-height: 80px`
unconditionally, so a page with no sticky header reads 80px until `header-behaviours/view.js`
writes 0. Recompute on change; do not read once at init.

### 4.4 One driver — and the companion edit that makes it safe

**⛔ THE COUNCIL'S MOST VALUABLE FINDING. Deleting the CSS branch ALONE takes the fill dead on
Chrome and Safari.**

`view.js:249-262` gates itself on **browser capability**, not on whether the stylesheet branch
exists:

```js
if ( window.CSS?.supports?.( 'animation-timeline', 'view()' ) ) {
    return;
}
```

Delete `style.scss:368-384` and leave that line alone, and on every Chrome/Safari build there is
**no CSS animation (deleted) and no JS driver (self-gated off)** — nothing writes
`--sgs-timeline-fill-progress` at all. The fill and the marker simply stop, on the majority of
browsers, while Firefox looks perfect. Every existing gate passes.

**Both edits ship in the same commit, or neither ships:**

1. delete the `@supports (animation-timeline: view())` block in `style.scss`
2. remove the `CSS.supports` early-return in `view.js` so the rAF driver runs everywhere
   (the reduced-motion check stays)

**Why single-driver at all:**

- The correct mapping consumes `chromeOffsetPx()`, a **JS-measured** value. Expressing it in
  `animation-range` means threading a custom property into a range offset where `%` resolves against
  the range length, not the element — unproven, for a branch only some browsers take.
- Per P6 the JS driver is already primary for all of Firefox. Keeping both means deriving the
  reading line identically in two languages or shipping two different timelines — the double-driver
  class that made the carousel paint nothing (D896).
- The rAF loop already runs for the sparkler and `is-lit` marking, and `rafThrottle` is shared
  page-wide, so N timelines do not mean N loops (council-verified). This **removes** a code path.
- Precedent: STOP-DECOR-IN-FALLBACK records this same split already biting the sparkler, which
  existed only on Firefox because its spawner lived in the JS-only branch.

**Cost, stated plainly:** Chrome and Safari lose off-main-thread compositing of the fill. For a 2px
rail mask this is negligible, and it buys one behaviour everywhere.

**Pre-existing gap this promotes, named rather than left silent:** `view.js` has no `pageshow` /
`visibilitychange` listener, so on a bfcache restore the last-written value stands until the next
scroll event. Today that affects Firefox only; after this change it affects everyone. Not a blocker;
add a `pageshow` re-measure in the same commit.

⛔ **Do not measure the result with `getComputedStyle` on `--sgs-timeline-fill-progress` during a
continuous scroll** — a scroll-driven registered property paints smoothly but reads back as a
staircase, and once fired three milestones at once. Addendum 18's clean readings were taken at
*settled* positions and are not a counter-example. Assert from geometry.

### 4.5 Where `chromeOffsetPx()` lives

**Bean's call: the marker stays vanilla — a plain timeline ships zero GSAP.** It needs a header
height, not an animation engine.

`chromeOffsetPx()` sits in `gsap/provider.js`, which imports GSAP at module scope (`:25`). Move the
body to `shared/effects/motion-utils.js` (P9 — zero imports) and re-export from `provider.js`, so
both callers are untouched. Council-verified: the function is pure `document` / `getComputedStyle`,
no GSAP dependency.

### 4.6 Bean's eye decides the number (R-31-13)

P10 is assumed, not seen. **Deploy the current behaviour and the reading-line behaviour side by side
on a canary probe page — built with TALL milestones (§4.2) — and let Bean pick.** He rejected
`date-over-media` on sight after a controller closed it as correct-by-design on a mechanism proof. A
mechanism proof is not an aesthetic verdict.

---

## 5. `scrollEffect`

### 5.1 The list — three options, with the fourth deferred on evidence

**Bean asked for four, gated on direction.** Three are buildable. The fourth is not, on this block,
without breaking its list semantics — §5.6. Rather than ship it broken or drop it silently:

| Value | Client label | Tier | Module | Status |
|---|---|---|---|---|
| `basic` (default) | "Standard" | V | existing fade-in reveal | ✅ |
| `scrub` | **"Move with the scroll"** | G | `fx-scrub` | ✅ |
| `pinned-journey` | "Pin and reveal" | G | `fx-pin-scrub` | ✅ |
| ~~`pinned-horizontal`~~ | ~~"Pin and slide sideways"~~ | G | `fx-horizontal-panel` | ⛔ **DEFERRED — §5.6** |

`scrub` is in the list because it is **already reachable today** via the generic picker (§0
correction 3). Dropping it would remove a working capability and offer nothing back.

⚠ **Label changed on council review: "Follow the scroll" → "Move with the scroll".** "Follow the
scroll" is indistinguishable from the default — "Standard" already reveals on scroll. Needs its own
help text, since the other labels carry their meaning and this one does not:

> "Motion tracks your scroll position directly — scroll back up and it reverses. The standard
> option fades each milestone in once."

### 5.2 One surface, not two

Adding a curated picker while the generic "Scroll & effects" picker still offers `scrub` gives the
timeline two controls that both set scroll motion, settable at once — the D896 shape.

**Declare `providesNatively: [ "scrub", "pin-scrub", "horizontal-panel" ]`** in the timeline's
`supports.sgs.fx`. Council-verified real: `generate-fx-qualifying-blocks.py:914-924` reads it
straight from `block.json` and filters those slugs out of `offered`. DB-independent — no reseed for
this part.

⚠ **The generator is NOT wired into any gate** (no `package.json`, no `scripts/gates.json` entry).
It must be **run by hand and the regenerated JSON committed** in the same commit. Easy to skip
silently; named in §8 step 4 for that reason.

⚠ Note for a future reader: `sgs/gallery`'s `providesNatively` comment says *"sgs/timeline
deliberately does NOT carry this"* — that is about `draggable`, a different capability, not a
contradiction of this decision.

### 5.3 The gating table

`orientation` is the hard gate — a sideways effect on a vertical timeline is meaningless:

| `orientation` | Offered |
|---|---|
| `vertical` | Standard · Move with the scroll · Pin and reveal |
| `horizontal` | Standard · Move with the scroll |

Hidden, not disabled, per the signed matrix.

⚠ **With `pinned-horizontal` deferred, `horizontal` orientation gets no pinned option at all.** That
is a real consequence of §5.6 and is the reason the deferral is Bean's call, not mine.

### 5.4 Suppression at ≤767px — real work on both remaining GSAP options

| Module | Self-gates? |
|---|---|
| `fx-pin-scrub` | **No** — `grep -c min-width` → 0 |
| `fx-scrub` | **No** — `grep -c min-width` → 0 |
| *(`fx-horizontal-panel` self-gates at `:124`, but is deferred)* | — |

The handoff asserted pin-scrub self-gated. It does not. Both need `data-sgs-fx-disable-mobile`,
honoured centrally by `isDisabledAtThisTier()` (`provider.js:438-452`). Below 768px each falls back
to whatever `mobileLayout` says.

SC 2.5.7 exempts native `overflow` scrolling but **not** content that suppresses it and implements
its own — which is what a pinned scroll-jack does.

### 5.5 The two-driver obligation

`pinned-journey` owns entry opacity and transform, so `revealTrigger` / `revealStagger` must be
**disabled with helper text, never silently ignored** (signed wording).

⛔ **Disabling the reveal driver obliges you to disable the hidden state it was the only thing
capable of lifting.** `.is-js` stays on the root, so `style.scss:398` still matches and entries stay
at `opacity: 0`. This is D896 exactly. `fx-pin-scrub`'s own `fromTo` presets also leave participants
at `opacity: 0` pre-scroll — `fx-pin-scrub.js:437-469` exists to work around precisely that for
keyboard focus.

### 5.6 ⛔ Why "Pin and slide sideways" is deferred

**Independently confirmed by two council raters and by direct reading of the block's own code.**

- `fx-horizontal-panel.js:69` resolves its track with `el.querySelector(':scope > [data-sgs-fx-track]')`
  — a **single direct child** that must contain all the panels. It hard-bails to the CSS fallback
  when absent (`:76-79`).
- The timeline root is a literal `<ol>` (`render.php:548`, `:732`).
- `<ol>` may contain only `<li>`, `<script>`, `<template>` (P11) — and **the block's own comment at
  `render.php:715-720` already states this rule**, which is why the progress connector is itself
  emitted as an `<li>`.

All three ways to satisfy the module are broken:

| Shape | Why it fails |
|---|---|
| `<div data-sgs-fx-track>` wrapping the `<li>`s | Invalid as a direct child of `<ol>`; the browser reparents or ignores it, silently breaking the `:scope >` match |
| An `<li>` wrapping the other `<li>`s | `<li>` inside `<li>` with no list ancestor is an invalid content model; AT typically announces "list, 1 item", destroying the structure the team deliberately preserved when it dropped `role=region`. Also shifts `:nth-child` and inverts the alternation (`render.php:718-720`) |
| A nested `<ol>` inside a wrapper `<li>` | Valid, but announces "list, 1 item" then "list, N items" — a real, user-facing screen-reader regression versus today's flat "list, N items" |

There is no clean shape without changing the root element away from `<ol>`, which would cost the
block its native list semantics — a change well outside this design's scope and needing its own
a11y sign-off.

**⚠ SUPERSEDED — Bean chose option (iii), change the root element, and it was built.** The analysis
above is correct about the `<ol>` ROOT; what it missed is that moving the `<ol>` INSIDE a `<div>`
root is a fourth shape none of the three rows considered, and it preserves list semantics exactly
(measured: one list, N items, on every timeline). Two further findings only surfaced on build:
the intermediate track `<div>` this design implied had to be REMOVED (`getTravelDistance()` needs
the marked element's own children to BE the panels), and horizontal orientation had the same
root-as-flex-container coupling as the carousel and broke until re-pointed. Addendum 22.

### 5.7 Help text

Permanent, naming the current `mobileLayout` value:

> "On phones this always shows as *[Stacked | Swipeable cards]* instead — the pinning effect needs a
> full screen to work."

Permanent, not dismissible: the canvas does not render at 375px, so the inspector is the only
channel. Plus, on the `scrollEffect` control itself (council finding — a client reads the dropdown's
own help before scrolling further):

> "All options stay available whatever you choose for phones — see below for what phones will show."

---

## 6. Accessibility

- **G225** — the mobile carousel's `min(85%, 320px)` cap is unchanged and remains the sufficient
  technique. A horizontal carousel **passes** G225; an earlier session wrongly told Bean it failed
  1.4.10.
- **SC 2.5.7** — no GSAP preset runs ≤767px (§5.4).
- **SC 2.1.1** — `fx-pin-scrub`'s `focusin` hold (`:437-469`) keeps pinned content keyboard-reachable.
- **Native list semantics preserved** — the direct reason `pinned-horizontal` is deferred (§5.6).
- **Reduced motion** — every new rule matched at the same specificity as the rule it overrides.
  D894 was exactly this failure. **A losing rule is indistinguishable from an absent one.**
- **`min-height` never crops** (§3.3).

---

## 7. Decisions for Bean

**Q1 — `mobileLayout` gating. RESOLVED as (b), help text only.** Bean asked for gating on "the
desktop or the mobile direction". `orientation` is settled (§5.3). `mobileLayout` cannot gate on
whether an effect runs, since none run on mobile. The client rater's argument decides it:
`mobileLayout` lives in the **Layout** panel while `scrollEffect` lives in **Scroll reveal** — two
sections a client may open on different days. An option vanishing because of a setting in a
different panel, with nothing on screen explaining why, produces a support question, not an
intuition. §5.7's help text closes the loop instead. (a) can be added later; it cannot be undone.

**Q2 — "Pin and slide sideways" (§5.6). NEEDS BEAN'S DECISION.** Three honest options:

- **(i) Defer it (recommended).** Ship three effects now. The sideways effect returns if and when
  the root element question is taken on its own merits, with its own a11y sign-off.
- **(ii) Accept the nested-`<ol>` shape.** Buildable, but screen-reader users hear "list, 1 item"
  then "list, N items" on every timeline that uses it. Needs an explicit a11y sign-off from Bean.
- **(iii) Change the root element away from `<ol>`.** Costs every timeline its native list
  semantics, for one optional effect. Not recommended.

---

## 8. Build order

Each step is its own commit with its own visual-diff report. **Phases never ship as single
commits** (R-31-5).

1. **`chromeOffsetPx()` → `motion-utils.js`**, re-export from `provider.js`. Standalone, unblocks 2.
2. **The fill mapping + reading line.** ⛔ **The `style.scss` deletion and the `view.js` gate removal
   are ONE commit** (§4.4) — either alone is a live outage on most browsers. Add the `pageshow`
   re-measure. Deploy the §4.6 A/B on a **tall** probe page. Nothing else in this commit; it is the
   change Bean judges by eye.
3. **`milestoneSize` + `milestoneMinHeight` + `entryGap`.** Desktop-scoped, **media query written
   first**. Panel moves per §3.6.
4. **`scrollEffect`** — attribute, gating, mobile suppression, help text, `providesNatively`, plus
   **running `generate-fx-qualifying-blocks.py` by hand and committing the regenerated JSON** (§5.2).

### ⛔ The cross-track step the first draft omitted

Steps 3 and 4 add **four new attributes** (`milestoneSize`, `milestoneMinHeight`, `entryGap`,
`scrollEffect`). Addendum 16 records what happened the last time this block added attributes:
`check-element-manifest-conformance` failed with `orphan_unclassified` / `orphan_role_map_stale`,
which **cannot be baselined** and clears only via `/sgs-update` reseeding `block_attributes`,
followed by regenerating `attr-role-map.json`.

That reseed is a **shared-DB, cross-track action that reds every other track's build until it
lands**. It must be announced, not discovered mid-build. Commit the regenerated `attr-role-map.json`
**separately** — it derives from the whole DB, not from this block.

Each new attribute also needs a `supports.sgs.elements` manifest entry, or it lands as an orphan.

---

## 9. Verification

Per step, before its commit:

- **Deploy first.** A test against undeployed code measures stale output. `build-deploy.py` prints
  `ABORTED` and still exits 0 — read the output, never the exit code.
- **Positive control on every check.** "Correctly 0 when suppressed" proves nothing alone.
- **Settle every scroll against Lenis** — poll `scrollY` until three consecutive 50ms reads match.
- **Open a screenshot at 1440 / 768 / 375.** A blank carousel passed 73 gates and every numeric
  check; a zero-area element measures perfectly.

**Step 2 specifically:**
- Assert the marker's viewport y **equals the computed reading line**, from geometry, at several
  scroll positions — never from the custom property (§4.4).
- ⛔ **Run it on a TALL block (~3,200px), not only the compact canary.** This is the red-team's
  named quiet-failure path: on a short block the clamp is a small fraction of the scroll and
  everything looks fine, which is exactly how this ships green and wrong for the layout the design
  exists to enable (§4.2).
- **Positive control for the header offset:** with a sticky header the reading line must sit lower
  by the header height; with no sticky header it must drop back. Both measured, not reasoned.
- **Negative control for the driver:** confirm the fill still advances **in Chrome** after the CSS
  branch is deleted. This is the §4.4 outage, and only a non-Firefox browser can catch it.

**Step 4 specifically:** assert `data-sgs-fx` reaches the front end, the module loads (registry
sniffs at `render_block` priority 99), **no GSAP effect INITIALISES at 375px**, and the three slugs
no longer appear in the generic picker for `sgs/timeline`.

⚠ **CORRECTED 2026-08-30 after measuring — this section originally required "no GSAP loads at
375px", which is not achievable and was not true.** The modules ARE enqueued on mobile and simply
do nothing: the registry sniffs `data-sgs-fx` out of rendered markup server-side at `render_block`
priority 99, where the viewport is unknowable, while `data-sgs-fx-disable-mobile` is a client-side
gate inside `bootEffect()`. Suppression is BEHAVIOURAL, not byte-level. This is framework-wide for
every block using that flag, not specific to the timeline — the assertion simply promised a
stronger guarantee than the framework provides. Assert no transforms, no pin-spacers and no GSAP
objects instead; that is what was verified.

**Every commit:** a visual-diff report at repo-root `reports/visual-diff/timeline-<TODAY>.md`, one
per touched block directory, with `source_sha` from
`python plugins/sgs-blocks/scripts/visual-report-sha.py timeline` **after staging**. It is a content
hash of the staged bytes, **not** a git commit hash — that mistake has been made and rejected twice.

---

## 10. Council disposition

Three cold raters. Red-team returned **NO-GO** on the first pass; both its blockers are now resolved.

| # | Rater | Finding | Disposition |
|---|---|---|---|
| 1 | tracer | P4 / sticky-redundant is airtight — all three positioning rules identical, zero `sticky` | **ACCEPTED**, strengthens §4.1 |
| 2 | tracer | **Deleting the CSS branch alone kills the fill on Chrome/Safari** — `view.js` gates on browser capability | **ACCEPTED — the most valuable finding.** §4.4 now makes both edits one commit; §9 adds a Chrome negative control |
| 3 | tracer | Entry structure and `align-self: stretch` viable; no fixed row height | **ACCEPTED**, confirms §3.1 |
| 4 | tracer | `providesNatively` is real, but its generator is unwired and must be run by hand | **ACCEPTED** → §5.2, §8 step 4 |
| 5 | tracer / red-team | **`<ol>` cannot hold a track wrapper; all three shapes invalid or an a11y regression** | **ACCEPTED — blocker.** `pinned-horizontal` deferred, §5.6, Bean's call at §7 Q2 |
| 6 | red-team | The clamp was never analysed | **ACCEPTED** → §4.2 now analyses it with real geometry |
| 6b | red-team | …therefore sticky may be needed after all | **REJECTED.** The dot *is* the fill head; sticky would detach it from the fill and float it in an empty line. The clamped states are correct behaviour, not a freeze — §4.1, §4.2 |
| 7 | red-team | Evidence was gathered on a 738px block; the tall regime is unmeasured | **ACCEPTED** → §4.6 and §9 both now require a tall probe page |
| 8 | red-team | bfcache gap goes live everywhere once JS is the only driver | **ACCEPTED** → §4.4, `pageshow` re-measure |
| 9 | red-team | `/sgs-update` reseed + role-map regen omitted; cross-track | **ACCEPTED** → §8's own section |
| 10 | client | Layout panel would cross the ~6-row wall | **ACCEPTED** → §3.6 redistributes; panel count still 8 |
| 11 | client | `milestoneMinHeight` as free text is unusable for this audience | **ACCEPTED** → §3.3 `SelectControl` |
| 11b | client | …with invented friendly labels | **REJECTED.** Hero's own control uses raw-value labels; inventing names would create a third convention against the live uniformity front |
| 12 | client | "Follow the scroll" is indistinguishable from the default | **ACCEPTED** → "Move with the scroll" + help text, §5.1 |
| 13 | client | Q1 → (b), plus help text on the control itself | **ACCEPTED** → §7 Q1 resolved, §5.7 |
| 14 | client | `milestoneSize`'s mobile behaviour undocumented for clients | **ACCEPTED** → §3.7 |
| 15 | client | Per-entry alt text missing | **REJECTED as stated** — alt is handled natively on the attachment (`render.php:110-113`). **Sharper version accepted:** `milestoneMediaDecorative` is block-wide, §3.4 |
| 16 | client | Crop control; connector weight against tall rows | **ACCEPTED as named scope**, §3.4 |
