> ARCHIVED 2026-07-28 — in-file status: BUILT + LIVE-VERIFIED 2026-07-26 (D391/D392).

---
doc_type: design-gate
topic: per-row-sticky
date: 2026-07-26
status: BUILT + LIVE-VERIFIED 2026-07-26 (D391 `5716f7b7` scroll-padding gate; D392 `494e5d50`
  collapse + guard). SA-1 discharged and the build it unblocked is COMPLETE — every done-when in
  §4 is met or explicitly struck with a reason. Historical from here: this doc is the REASONING,
  Spec 37 FR-37-40 is the canonical record of what shipped. Evidence:
  reports/visual-diff/scroll-padding-pinned-gate-2026-07-26.md +
  reports/visual-diff/row-collapse-when-pinned-2026-07-26.md
governs: Spec 37 §Behaviours — sticky stays HEADER-level (per-row sticky was considered and
  REJECTED, see D1); adds collapse-when-pinned; amends the F1 scroll-padding mechanism
inputs:
  - .claude/plans/2026-07-25-header-footer-per-row-identity-design-gate.md §2 must-fixes 1, 2, 8
  - workspace/memory/research/2026-07-26-bottom-bar-floating-ui-vs-footer.md (extended research, 4 researchers)
  - Bean decision 2026-07-26: "pinned to the screen" belongs to the floating layer
---

# Sticky mini-design

*(Filename says "per-row-sticky" for historical reasons. The approved outcome is that per-row
sticky is NOT built — sticky stays header-level. See D1.)*

## 0. Plain English

"Sticky" means a strip that **stays on screen while the visitor scrolls**. This document
decides how that works when a header has three separate rows, and it deliberately does NOT
give the footer the same power.

## 1. Scope — settled, not open

**Sticky applies to the HEADER only — and as a header-level state, not a per-row attribute.**
(The per-row form was considered and rejected on the short-parent trap — see D1.)

Footer rows get no sticky option. Bean's decision (2026-07-26): "pinned to the screen" is what
he meant by sticky, and today's research placed that squarely in the floating-UI layer. A strip
pinned to the bottom of the screen is a **Spec 18 Floating UI** element — it is driven by state
(basket contents, a sale window), it must coordinate with the cookie banner / chat widget /
back-to-top button already competing for that edge, and no page-builder in the market ships it
as a footer row.

Two different things share the name "sticky footer". Only one is in scope anywhere:
- **Push-to-bottom on short pages** (a layout concern — stops the footer floating mid-screen on
  a thin page). Not this document. Genuinely useful; worth its own small ticket.
- **Pinned to the viewport while scrolling** (an overlay concern). → Spec 18, not a footer row.

A sticky *header* row, by contrast, is a universal, well-supported pattern (every competitor
ships a sticky header) and is what this document specifies.

## 2. Decisions

### D1 — **SETTLED (Bean, 2026-07-26; research-verified). Sticky is HEADER-level; rows collapse**

*My original "mutually exclusive" proposal was rejected by Bean and is retained at the bottom of
this section for audit only. The approved shape is below.*

*(The next two paragraphs record Bean's proposal AS PROPOSED, before verification — they still
say "the sticky row". Research then showed a ROW cannot be the sticky element (short-parent
trap); the corrected, approved shape is under "RECOMMENDED SHAPE" below. Read both.)*

Bean rejected "mutually exclusive" and proposed the better shape: **the hide-on-scroll effect
applies only to the rows that are NOT sticky, and the sticky row simply becomes the pinned
header once those rows have slid away.** The top utility strip disappears; the logo/nav row
stays. That is the pattern real sites actually ship, and it makes the combination the FEATURE
rather than a forbidden state.

Critically, it also sidesteps the transform problem by construction: nothing transforms the
ancestor. Each non-sticky row transforms ITSELF (which is already how the shipped per-row
hide-on-scroll works), leaving the sticky row untransformed and free to pin.

#### VERIFIED 2026-07-26 (research) — the intent is right, the naive implementation fails

**Good news:** a transformed SIBLING is structurally irrelevant. Containing-block computation
only walks the ANCESTOR chain (MDN `position`; CSSWG issue w3c/csswg-drafts#3186 confirms the
transform-breaks-sticky bug is ancestor-only). Row 1 transforming itself cannot affect Row 2.

**Two traps kill the naive version:**

1. **Short-parent trap (fatal).** A sticky element only pins while its containing block is in
   view, and stops at that block's bottom edge. A row sticky inside a ~250px `<header>` unpins
   the moment scroll passes 250px — the nav would vanish instead of staying pinned. This is the
   classic "sticky doesn't work" complaint.
2. **Transition-gap trap (cosmetic but real).** `transform` never removes an element from flow
   (MDN: *"Whatever space the element takes up before you transform it, it will still take up
   after"*). So while Row 1 slides away it still occupies its height, and for exactly that scroll
   distance a gap shows above Row 2. Documented as a recurring production bug in Shopify and
   GeneratePress support threads with this exact symptom.

**What production themes actually do:** Astra and the Shopify Dawn family both use a JS scroll
listener toggling a class + `position: fixed` with a placeholder, precisely to avoid these two
traps. Nobody ships this as bare `position: sticky` on a sub-row.

#### RECOMMENDED SHAPE (replaces per-row sticky as an attribute)

Bean's own phrasing — *"it just starts the sticky header once the scroll effect occurs"* —
already describes the shape that works, and it is simpler than a per-row sticky attribute:

- **Sticky stays a HEADER-level state.** It is already shipped (`body.sgs-header-behaviour-sticky`
  → `position: sticky` on `header.sgs-site-header`) and it works precisely because the header's
  containing block is `<body>`, which is tall. No short-parent trap.
- **Rows carry "collapse when pinned" instead of "be sticky".** A row marked to disappear
  COLLAPSES out of flow (height → 0) rather than translating. The header then genuinely shrinks
  to just the retained rows, with **no gap**, because the collapsed row no longer occupies space.
- The header's existing ResizeObserver sees the height change and re-publishes it, which feeds
  D3's scroll-padding automatically. Everything composes.

**Trade-off to accept:** collapsing height is a layout animation, not a GPU-composited one. On a
single header strip that is the same cost the shipped shrink effect already pays (it transitions
`padding-block`), so it is consistent with the motion-perf rule — which bans `filter` and
`box-shadow`, not layout properties on small elements.

**Sub-decision — SETTLED (Bean, 2026-07-26): option (a).** The shipped per-row hide-on-scroll
SWITCHES to collapse whenever the header is pinned, and stays `translateY` when it is not. One
behaviour that adapts, rather than two options the client has to choose between.

**Binding constraint on the build:** the non-pinned case must render EXACTLY as it does today.
`translateY(-100%)` on a `.sgs-row-behaviour` row with no sticky header is live-verified and
must be byte-identical after this change — that is the regression test, not an aspiration.

**Two conditions to enforce regardless** (silent-failure guards, worth a build-time check):
- no ancestor of the header may have `overflow` other than `visible`, or `transform` /
  `perspective` / `filter` — any of these silently kills sticky;
- a single row still cannot be both "retained when pinned" and "hidden on scroll".

#### ⛔ Original D1 analysis — REJECTED, retained for audit only. Do not build from this.

`position: sticky` is broken by a `transform` on ANY ancestor — a transformed element becomes
the containing block, so the sticky element pins to it rather than the viewport. Hide-on-scroll
is implemented as `transform: translateY(-100%)`. Two collision paths exist:

- **Row-level:** a row with its own hide-on-scroll transforms itself → its own sticky dies.
- **Header-level:** the shipped D376 header-level hide-on-scroll transforms
  `header.sgs-site-header` → **every** sticky row inside it dies, even rows that have
  hide-on-scroll switched off.

The second path is the dangerous one: the row looks correctly configured and silently fails
because of a setting on a different block.

**Options**
- **A — mutually exclusive, enforced.** A row cannot have both; and a header with header-level
  hide-on-scroll cannot have sticky rows. Enforced in the editor (the second control greys out
  with an explanation) and a warning `Notice` naming the conflicting setting.
- **B — lift the sticky row out of the transformed ancestor.** Technically possible (move the
  sticky row to a sibling of the transformed header) but restructures the DOM the whole
  header/footer builder depends on.
- **C — defer per-row sticky entirely.**

**Recommendation: A.** Zero risk, and it converts a silent CSS failure into a visible editor
rule. B is a large structural change for a combination nobody has asked for. Revisit B only if a
client genuinely needs both on one header.

### D2 — ⛔ **DO NOT BUILD FOR THIS WORK. Premise removed by D1; retained as banked research only**

**Read this before anything below it.** D2 answers "how do multiple sticky ROWS chain so they pin
beneath one another". Under the approved D1 model **there is exactly ONE sticky element — the
header** — so there are no rows to chain and this mechanism has no consumer. Building it would be
dead machinery.

It is retained, unedited, because the research is genuinely valuable for **Spec 18 Floating UI**,
which DOES need bottom-edge stacking (a cookie banner, a chat widget, back-to-top and a CTA bar
all competing for the same edge, with no cross-vendor convention). Treat everything below as a
reference for that future work, **not** as an instruction for the header sticky build.

If you believe you need an offset chain for the header, re-read D1 first — you have probably
reintroduced per-row `position: sticky`, which fails on the short-parent trap.

#### Banked research (for Spec 18, not for this build)

There is **no pure-CSS way** to chain dynamic-height sticky elements in 2026. Anchor positioning
is built for popovers anchored to one element, `calc-size()` is Chrome-only and solves a different
problem, and CSS has no `:stuck` selector. Hardcoded `top` values desync the instant a logo is
swapped or text wraps. So: CSS custom properties, written by JS, consumed by CSS.

**Implementation shape (for Spec 18 when it needs bottom-edge stacking — NOT for this build):**
- Each row publishes its OWN height to one custom property; each sticky row reads
  `top: calc(var(--row1-h) + var(--row2-h))` — composable, and each row only needs to know its
  predecessors.
- **Observe `borderBoxSize`, not `contentRect`** — `contentRect` excludes padding/border, which
  is exactly the space the next row must clear.
- **Write to `:root`, never to the observed element.** Writing to the observed element from
  inside its own callback is the documented cause of "ResizeObserver loop completed with
  undelivered notifications". Defer the write to `requestAnimationFrame` with a pending flag.
- **Gate `position: sticky` behind the operator's toggle** (an attribute/class), so a non-sticky
  row stays in normal flow and contributes nothing to the chain.
- A row that shrinks WHILE pinned re-drives its own variable automatically — the shrink effect
  and the offset chain compose with no extra plumbing. (This was the interaction I expected to
  be hardest; it falls out for free.)

**z-index:** descending top-to-bottom (row 1 highest). During the transient overlap of a fast
scroll or subpixel rounding, the row meant to sit visually on top must win the paint order.
Box-shadows go on each row's LOWER edge; a top-edge shadow renders underneath the row above and
is invisible. No formally published named scale exists — a local descending scale scoped to the
header is the norm.

**Defend against:** subpixel gaps (round UP, and give rows a solid background so a 1px gap shows
colour, not page content); a row reporting height 0 mid-transition (`display:none` collapses the
chain — write the last known value or use `visibility:hidden`); and web-font swap changing text
wrap after first paint (observe the OUTER row container, not an inner element).

Original analysis retained below.

#### Original D2 analysis — offset chain, no manual pixels

If two rows are sticky, the second must pin BELOW the first, not on top of it.

**Recommendation:** each sticky row's `top` = the summed live height of the sticky rows above it,
published as CSS custom properties by the existing ResizeObserver (the same mechanism that
already publishes `--sgs-header-height`). Never a manual pixel offset — a hand-typed number is
wrong the moment the logo changes size or text wraps.

Plus a **named z-index scale** so the rows stack predictably against the drawer, the admin bar,
and anything in the floating layer. Values stay in the WP admin-bar-safe range (< 99999), which
the existing behaviour CSS already respects.

### D3 — Fix the scroll-padding mechanism (gate it on whether the header is ACTUALLY pinned)

**This is a live bug, not a new requirement.** Verified 2026-07-26 in source:

- `assets/css/header-behaviours.css` applies `:root { scroll-padding-top: var(--sgs-header-height, 0px) }`
  **unconditionally**.
- `src/header-behaviours/view.js` publishes `--sgs-header-height` **unconditionally**
  ("F1 — always publish header height").
- Nothing gates either on `sgs-header-behaviour-sticky`.

So **today**, on a page whose header is not pinned, an in-page anchor link lands the full header
height too far down (252px on the canary) — reserving space for a header that scrolls away.
And once collapse-when-pinned ships (D1) it goes wrong in the other direction too: the pinned
header is SHORTER than its resting height, because the collapsed rows no longer occupy space —
so reserving the resting height over-reserves by exactly the collapsed rows' height. The value
must track the header's LIVE height while pinned, which the existing ResizeObserver already sees.

**RESEARCHED 2026-07-26 — mechanism confirmed correct, and one of my own claims corrected.**

- **`scroll-padding-top` on `:root` IS the right mechanism** (Baseline since April 2021). Keep
  the CSS line exactly as it is — it is cause-agnostic. **The fix belongs entirely in the JS that
  decides the value.**
- **Correction to my earlier note:** I suggested scroll-padding might only fix anchor jumps while
  leaving keyboard Tab focus obscured. That is wrong. **W3C technique C43 ("Using CSS
  scroll-padding to un-obscure content") is a listed SUFFICIENT technique for 2.4.11 and 2.4.12**,
  and its own worked example is a Tab-focused form field behind a fixed banner. It covers keyboard
  focus, provided the value is right at the moment focus lands.
- **The precise bug shape:** `var(--sgs-header-height, 0px)` — that fallback fires only when the
  property is UNDEFINED. It does nothing when the property is defined but should be zero. So the
  observer must **explicitly publish `0px`**, and must be gated on *"is anything actually pinned"*,
  not on *"does the header have a height"*.
- **`scroll-margin-top` is the wrong tool here** — it would have to be annotated onto every anchor
  target individually and cannot express "whatever is currently pinned".

**The blast radius is wider than anchor links.** A stale non-zero value also skews: fragment
navigation on page load, browser find-in-page, every `element.scrollIntoView()` call anywhere in
the codebase, keyboard focus scrolling, and scroll-snap (scroll-padding is defined in the Scroll
Snap module). It does NOT affect ordinary scrollbar dragging. So today's unconditional 252px is
dead space injected into all of those, not just anchor clicks.

**Also verify at build time** (both silently break the fix): that `html` really is the scrolling
element (a `body{overflow}` reset moves it, and a `:root`-only rule then does nothing), and that
no nested scroll container sits between the target and the viewport.

**Known interaction with a shipped feature:** `scroll-behavior: smooth` plus a row shrinking
mid-scroll can land the jump stale, because the target position is computed at scroll start.
Shrink now ships, so this combination is reachable — recompute, or use `auto` for anchor jumps
if it proves visible.

### D4 — How many rows may be sticky? — **SETTLED (Bean, 2026-07-26): advisory warning only**

Bean's decision: the warning is **purely advisory**, never a gate. A fully sticky header is
legitimate in some contexts — **especially when paired with the shrink effect**, where the whole
header pins and compacts rather than eating a fixed slab of screen. It is simply not the common
case, so the warning exists to make the operator think, not to stop them.

Wording must therefore be neutral ("this uses more of the screen on mobile"), NOT corrective
("you should not do this").

Original analysis retained below.

Authorities are consistent that persistent chrome should not stack: NN/g warns the "overall
chrome may add up wasting too much space"; Apple and Material both treat bottom/top chrome as a
single navigation slot. But no authority gives a number, and any threshold we set is our design
rule, not a citation — so it should be advice, not a gate.

**Recommendation:** allow any number; show a warning `Notice` when a second row is made sticky,
naming the cost (screen space on mobile). Consistent with how the other row warnings behave, and
with the project's rule that operator-facing a11y/UX feedback is informational, never a blocker.

## 3. Explicitly out of scope

- **Footer row sticky** — see §1. Goes to Spec 18.
- **Extending Spec 18 for bottom CTA/cart/sale bars** — a separate decision with its own design
  gate. The research recommends it; nothing is committed.
- **The shared bottom stacking container** — belongs to that Spec 18 work, not here. (Noted:
  it should be built BEFORE a second bottom-anchored element exists, since back-to-top is
  already shipped.)
- **Push-to-bottom-on-short-pages** — separate small ticket.

## 4. Done-when (binary)

> **REWRITTEN 2026-07-26 after the handoff QC gate.** The original criteria below were written
> against the SUPERSEDED per-row-sticky model and survived the D1/D2 revisions unchanged — they
> still said "a header ROW set sticky" and "two sticky rows chain", i.e. they made the D2 offset
> chain an acceptance criterion at the same time D1 removed the thing it would chain. A builder
> treating this section as the spec would have built exactly what is now forbidden. Corrected.

> **ALL MET 2026-07-26.** Evidence per line below. Two criteria were struck rather than met —
> both with a recorded reason, neither silently dropped.

- [x] With the header set sticky, it stays pinned while the page scrolls, at each device tier
      where it is enabled — live-verified at 375 / 768 / 1440 on the canary, not from the emit.
      → computed `position: sticky` at desktop 1382 / tablet 978 / mobile 405.
- [x] **Only ONE element is ever `position: sticky`** (the header). No row emits `position: sticky`.
      → no row rule sets `position` at all; the collapse path uses `block-size`, and the row's
      computed `transform` stays `none` while pinned. The offset chain was never built.
- [x] With the header pinned, a row marked to disappear renders at height 0 and the header's total
      height drops by exactly that row's height — **no gap** (the `transform` failure mode).
      → measured UNROUNDED: `(header drop) − (row removed)` = **0.00** at all three tiers
      (93.17→67.59 / 92.34→67.63 / 251.52→229.01). Cross-checked: the rows' summed height equals
      the header's own.
- [x] With the header NOT pinned, that same row renders byte-identical to today's shipped
      `translateY(-100%)` behaviour at all three tiers. This is the regression test.
      → `matrix(1, 0, 0, 1, 0, -24.7159)` = `translateY(-100%)` of the row's own height, row at
      full height, **no inline height ever written** on that path.
- [x] With NOTHING pinned, `scroll-padding-top` computes to `0px` and an anchor link lands flush.
      → `0px` at every tier; anchor landed at viewport top **0**. Negative control included
      (hand-setting the property moves it to 93px, so the pass is the gate acting).
- [x] With the header pinned, an anchor link lands directly below the pinned height — not below
      the full unpinned header height. → landed at **93** against a 93px pinned header.
- [x] A keyboard-focused element is never entirely hidden behind the pinned header (WCAG 2.4.11;
      W3C technique C43 is the sufficient technique, F110 the failure to avoid).
      → focused link measured 433–477 against a pinned header bottom of 92: neither entirely nor
      partially obscured, in both pinned and unpinned states.
- [~] ~~The multi-sticky warning is advisory only — it never blocks saving or publishing.~~
      **STRUCK — the warning was NOT built, deliberately (D392).** It was specified against the
      per-row sticky model D1 rejected; under a single header-level sticky element there is no
      "second sticky row" to warn about, so building it would mean inventing a condition that
      cannot occur. The same reasoning strikes D1's "a row cannot be both retained-when-pinned
      and hidden-on-scroll" guard. **What WAS built instead** is the other guard D1 asked for:
      a sticky-breaking-ancestor detector (`overflow` other than `visible`, or
      `transform`/`perspective`/`filter`), advisory `console.warn` only, verified live on the
      shipped script with a negative control.

**Carried out of this design, unresolved:**
- `prefers-reduced-motion` was NOT live-verified — the harness cannot emulate the media query.
  Correct by construction (the clear-out delay reads the COMPUTED transition duration, which is
  0 under reduced motion), but that is reasoning, not measurement.
- A collapsed row's contents remain focusable at height 0. This is **parity** with the shipped
  `translateY` path, not a new defect — so it is a decision about the existing behaviour.
- The theme carries a second copy of the D3 defect: `theme/sgs-theme/assets/css/utilities.css:21`
  declares its own `:root { --sgs-header-height: 80px }`, so the plugin rule's `0px` fallback can
  never fire and a JS-disabled page reserves 80px unconditionally. Its `body.admin-bar html`
  selector (`:29`) can never match either. Parked, not fixed.

## 5. Effort

Small. Three pieces, in build order:

1. **D3 scroll-padding fix** — a bug fix to shipped behaviour, and worth shipping on its own
   (it is a live WCAG defect independent of sticky). ~20 min.
2. **D1 collapse-when-pinned** — the ONLY genuinely new mechanism in this work: switch a row
   from `translateY` to height-collapse while the header is pinned, gated on the sticky body
   class, with the non-pinned path byte-identical to today. ~40 min.
3. **D4 advisory warning + D1's silent-failure guards** — editor-side, reusing the Notice
   pattern already built. ~20 min.

**D2 contributes NOTHING to this estimate — it is not built** (its premise was removed by D1;
see its DO-NOT-BUILD banner). If your estimate grows because you are costing an offset chain,
you have mis-scoped the work.

Estimate ~1 build+deploy cycle, in line with P1 and P2.
