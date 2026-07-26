---
doc_type: design-gate
topic: per-row-sticky
date: 2026-07-26
status: DRAFT — awaiting Bean sign-off (Side Track A / SA-1, blocking for any per-row sticky)
governs: Spec 37 §Behaviours — adds per-row sticky; amends the F1 scroll-padding mechanism
inputs:
  - .claude/plans/2026-07-25-header-footer-per-row-identity-design-gate.md §2 must-fixes 1, 2, 8
  - workspace/memory/research/2026-07-26-bottom-bar-floating-ui-vs-footer.md (extended research, 4 researchers)
  - Bean decision 2026-07-26: "pinned to the screen" belongs to the floating layer
---

# Per-row sticky — mini-design

## 0. Plain English

"Sticky" means a strip that **stays on screen while the visitor scrolls**. This document
decides how that works when a header has three separate rows, and it deliberately does NOT
give the footer the same power.

## 1. Scope — settled, not open

**Per-row sticky applies to HEADER rows only.**

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

### D1 — Sticky and hide-on-scroll cannot both be on (RECOMMENDED: mutually exclusive)

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

### D2 — Multiple sticky rows chain automatically (RECOMMENDED: offset chain, no manual pixels)

If two rows are sticky, the second must pin BELOW the first, not on top of it.

**Recommendation:** each sticky row's `top` = the summed live height of the sticky rows above it,
published as CSS custom properties by the existing ResizeObserver (the same mechanism that
already publishes `--sgs-header-height`). Never a manual pixel offset — a hand-typed number is
wrong the moment the logo changes size or text wraps.

Plus a **named z-index scale** so the rows stack predictably against the drawer, the admin bar,
and anything in the floating layer. Values stay in the WP admin-bar-safe range (< 99999), which
the existing behaviour CSS already respects.

### D3 — Fix the scroll-padding mechanism (RECOMMENDED: gate it AND scope it to pinned rows)

**This is a live bug, not a new requirement.** Verified 2026-07-26 in source:

- `assets/css/header-behaviours.css` applies `:root { scroll-padding-top: var(--sgs-header-height, 0px) }`
  **unconditionally**.
- `src/header-behaviours/view.js` publishes `--sgs-header-height` **unconditionally**
  ("F1 — always publish header height").
- Nothing gates either on `sgs-header-behaviour-sticky`.

So **today**, on a page whose header is not pinned, an in-page anchor link lands the full header
height too far down (252px on the canary) — reserving space for a header that scrolls away.
Per-row sticky makes it wrong in the other direction too: if only the middle row pins, reserving
the WHOLE header's height over-reserves by the height of the rows that scrolled away.

**Recommendation:** publish a second variable — the summed height of the rows that are ACTUALLY
pinned at the current device tier (0 when nothing is pinned) — and drive `scroll-padding-top`
from that instead. The existing `--sgs-header-height` stays as-is for any other consumer.

This is also the WCAG 2.4.11 mitigation. The criterion ("a focused component must not be
entirely hidden by author content") names sticky headers and footers as the typical culprits,
and the prescribed fix is exactly this scroll-padding. Getting it right is an accessibility
requirement, not a nicety.

### D4 — How many rows may be sticky? (RECOMMENDED: no hard cap, warn past one)

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

- [ ] A header row set sticky stays pinned while the page scrolls, at each device tier where it
      is enabled, live-verified at 375 / 768 / 1440.
- [ ] Two sticky rows chain: the lower pins beneath the upper, with no overlap, at every tier —
      verified by measuring the second row's `top` equals the first row's rendered height.
- [ ] Turning on hide-on-scroll for a row that is sticky (or for a header containing sticky rows)
      is prevented in the editor and explained, with no silent CSS failure.
- [ ] With NO sticky row, `scroll-padding-top` computes to 0 and an anchor link lands flush.
      (Fails today — this is the regression test for D3.)
- [ ] With one sticky row, an anchor link lands directly below that row — not below the whole
      header.
- [ ] A keyboard-focused element is never entirely hidden behind a pinned row (WCAG 2.4.11,
      technique F110).

## 5. Effort

Small. D3 is the only part that touches shipped behaviour and it is a bug fix. D1 and D4 are
editor-side warnings reusing the pattern already built this session. D2 is the only genuinely
new mechanism, and it extends the existing height publisher rather than introducing one.
Estimate ~1 build+deploy cycle, in line with P1 and P2.
