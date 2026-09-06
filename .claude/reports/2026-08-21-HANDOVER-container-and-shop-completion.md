# Handover — container repair + shop archive, and QC Gate 2 closed

```
doc_type: handover
created:  2026-08-21
from:     colour-golden track (container/shop session)
status:   container work COMPLETE · QC Gate 2 CLOSED · two decisions open
commits:  0843567d 669bc1e5 40411532 f5e184d5 38fa1324 1a127c06  (all on origin/main)
```

## 1. What was wrong, in one paragraph

Four separate-looking defects were **one bug wearing different clothes**: the content
band's CSS (`max-width` + `margin-inline:auto`) was being painted onto the container's
OUTER box. That capped backgrounds at content width (P2-1), collapsed a grid item from
its 340px track to 48px, stranded a centring margin, and — combined with a per-instance
24px padding default — compounded gutters to 72px across three nesting levels. They read
as unrelated because they surfaced in unrelated places.

## 2. Closed, each verified on the live canary

| Defect | Before | After | Commit |
|---|---|---|---|
| Product cards thin on mobile | card 165px @ left 72 | **261px @ left 24** | `865e6d8e` |
| Shop page destroyed at desktop — grid inside the filter box | products 260px, cards 73px, stacked | **940px, 300px, side by side** | `0843567d` |
| Container background capped (**P2-1**) | `max-width: 1280px` on the outer | **`max-width: none`** | `669bc1e5` |
| Footer column collapsed | 48px in a 340px track | **400px** | `669bc1e5` |
| Header icon cluster squeezed | 92px box, 44px content | **padding 0** | `1a8cd00a` |
| Filter box 24px below the cards | filters 422 / cards 398 | **both 398** | `38fa1324` |
| Results count + sort missing | absent | **"Showing all 5 results" + 6-option sort, both behaviourally verified** | `1a127c06` |

**Not a defect, closed as such:** `sgs-shop-filters` rendering `display:none` at mobile is
the CLOSED state of a `<dialog>` — the mobile drawer is the same node promoted to the top
layer. Verified by clicking it: opens 341x767 with all four filter groups, price slider,
12 flavour chips and the Apply/Clear footer.

## 3. QC Gate 2 — CLOSED, all three blocks

Bean's acceptance test was behavioural: *the client picks a colour in the editor and the
computed style changes on the frontend, at rest AND on hover.* Not "attrs declared".

| Block | Editor control | Attr round-trip | Frontend at rest | Frontend on hover |
|---|---|---|---|---|
| `sgs/brand-strip` | ✅ (previous session) | ✅ | ✅ | ✅ |
| `sgs/hero` | ✅ Colour panel, 30 swatches, picked "Accent Dark" | `primary` → **`accent-dark`** (a SLUG, not a hex — the token survives) | `rgb(230,138,149)` = primary ✅ | **real pointer hover** → `rgb(245,208,80)` = accent ✅ |
| `sgs/trust-bar` | ✅ Colour panel, picked "Cookie Brown" | `success` → **`cookie-brown`** | `rgb(46,125,79)` = success ✅ | **real pointer hover** → `rgb(139,111,78)` = cookie-brown ✅ |

Both blocks loaded `isValid: true` with **zero console errors**, and the hover rules are
correctly paired `:hover, :focus-visible`. Hero returned to its resting colour when
unhovered — a negative control, so the hover reading is not an artefact.

Test fixture: page **2588** (`/qc-gate-2-colour-test/`). Safe to delete; nothing depends
on it. No editor changes were saved — `post_content` was re-read from the DB and is
unchanged.

## 4. Two decisions waiting for Bean

### 4a. The sticky filter sidebar — three specialists say DON'T build it yet

`position: sticky` now applies correctly (the cascade fight is won) but **still does
nothing**, proven by a real 900px scroll: the panel moved -900px, exactly 1:1 with the
page. Two independent preconditions, and only one was ever fixed.

- **The panel has no travel room.** It is 1154px — the tallest item in its grid row, so
  the row height IS its height — and taller than the 818px viewport.
- ⛔ **The obvious fix is measured to be inert.** A reviewer shipped
  `max-height: calc(100vh - 48px); overflow-y: auto` into the live page: the panel capped
  to 852px and got an internal scrollbar, and the sidebar STILL moved 1:1, because 852px
  is still taller than the 829px product column. **Do not build this one.**
- The UX reviewer's verdict: at 5 products sticky is solving a problem that does not
  exist (a long list scrolling past a short panel). It earns its place at ~50 products
  and is unambiguous at 500.
- **The load-bearing fix is accordion-collapsing the filter groups**, which shortens the
  panel at every catalogue size. Sticky then follows for free.
- If sticky is wanted as a deliberate feature, the shape is: move `position:sticky` +
  `top` onto **`.sgs-shop-filters__scroll`** (a wrapper the JS already creates) and let
  the outer `<dialog>` render at full height. Re-verify specificity — that wrapper is a
  CLASS, and the guard it must beat is (0,7,0).

**Ruled out by live audit, so nobody re-investigates:** no ancestor up to `<html>` has
`overflow` other than visible, a transform, a filter, `contain`, or a fixed height. And
**Lenis is not the culprit** — it eases the real document scroll with no wrapper and no
transform (`smooth-scroll.js:10-27`; it was chosen over GSAP ScrollSmoother for exactly
that reason).

### 4b. Replacing the injected band with core's cap-the-children model

WordPress core caps content width by targeting the CHILDREN
(`$selector > :where(:not(.alignfull)…)`) and **injects no element**. SGS injects a real
`.sgs-container__inner`, and that div is what caused every defect in §1.

A 3-specialist design council said **adopt-with-changes, scoped narrowly** — a blanket
replacement would delete three shipping capabilities that structurally need a real node:

| Capability | Why a selector cannot replace it |
|---|---|
| `@container` queries | An element cannot size-query itself; the grid needs a descendant |
| `data-sgs-fx-track` | GSAP translates one atomic node; N centred siblings is not that |
| grid-on-inner | It is the current deliberate fix for the background-capping defect |

**Before any of this is attempted, in this order:**
1. Widen `scripts/inspector-scan/rules/23-content-width-needs-inner-band.js` — its regex
   needs a dot-class after `>`, so core's `:where(…)` pattern would make it report
   "no band" for every correctly-migrated block. It goes **silently wrong, not red**.
2. Amend Spec 31 §2.3 — L2 is defined as a physical node; it needs a two-branch rule.
3. Prototype on ONE `container_kind='content'` block behind a flag. Do **not** touch the
   `$grid_on_inner` / `@container` branches in the same commit.

Good news: the converter has **zero** `.sgs-container__inner` references in its emit path
— only draft-side recognition. The cloning pipeline is not disturbed.

## 5. Framework traps found, named, NOT fixed

1. **Seven guards in `container/style.css`** (lines 63, 128, 144, 145, 238, 244, 250) use
   chained `:not()` and reach specificity **(0,5,0)–(0,8,0)**. They override ANY
   block-level `position` on a container's child. The council's preferred fix is a
   **cascade layer** around all seven, so unlayered author rules win uniformly — better
   than renegotiating specificity rule by rule, which fixes 1-of-7.
2. **A container that is not page content must say `contentWidth:"full"`.** Three
   authorings needed it today (`sgs-header-icons`, `sgs-shop-layout`, `sgs-shop-toolbar`).
   A future small flex cluster with no banded ancestor will hit the same trap. The catch
   for it is a live-DOM sweep flagging any rendered `.sgs-container.has-global-padding`
   whose width is small relative to the resolved content-size cap.

## 6. Method notes that earned their keep

- **Three of my own claims were disproved by measurement**: guard specificity (0,3,0 →
  actually 0,7,0 across seven rules); `align-self: start` "needed" (already set at
  `woocommerce.css:455`); and my first sticky fix, which shipped and changed nothing
  because it fought the wrong rule.
- **All three traced to the same root: truncated or filtered probes.** I sliced
  `selectorText` to 70–80 chars and computed specificity from a fragment; I filtered
  hover rules by a uid the real selector did not use. Already in memory as "a truncated
  search manufactures a false absence" — it also manufactures false specificity and false
  absence of a rule. **Never compute from a truncated selector; never filter a CSSOM scan
  by a key you have not confirmed the rule uses.**
- **Positive controls did the real work.** `display:contents` on the band proved the
  shop-grid cause (260→940px); forcing `margin-inline:0` proved the footer collapse;
  a real pointer hover proved the colour gate. Every figure derived by RUNNING something
  was right.
- **Sticky needed two independent preconditions** and each test only ever judged one.
  A single negative result told us nothing about which had failed.

## 7. Still open on the colour-golden track (unchanged by this session)

1. Gradient mechanism-awareness — `row-missing-gradient` (193) checks that *a* gradient
   path exists, not that it is mechanism-correct.
2. Defect-level matching, rule 31 ↔ colour-coverage (`attrName` is the join key, both
   sides discard it).
3. ~~`textColour` parent/child ruling~~ — ✅ **SETTLED 2026-08-21, see D713.** A
   section-class block parents any non-section block without a forced parent, so a
   parent-level `textColour` is the inheritable cascade default and the child's control
   overrides one instance — keep both. Applied to all eight baseline entries. Parent list
   enumerated from `block_composition`: cta-section, hero, modal, site-footer, site-header,
   trust-bar (+ container, which was ABSENT from the roster — see D713's trap note).
4. D6 reversal — hero background vs overlay. Not decided.
5. Rule-31 arithmetic: `+10` claimed, `409 → 420` is `+11`. One finding unaccounted for.
6. Theme-snapshot slug-valued palette entries (2 in `sites/mamas-munches/`).
7. `css:box-shadow-color` canonical shape.
