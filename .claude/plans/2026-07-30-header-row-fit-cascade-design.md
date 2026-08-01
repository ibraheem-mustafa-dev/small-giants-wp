---
doc_type: design
project: small-giants-wp
date: 2026-07-30
status: |
  PARTIALLY BUILT 2026-08-01 (D455). Stage 1 SHIPPED as designed and verified live — 109-width
  sweep 1400→320px plus two negative controls, the second proving the two changes are NOT
  overlapping fixes (commit 18e504b9, reports/visual-diff/site-header-row-2026-08-01.md).
  Stage 2 (shrinkRole, 5 per-child roles) REPLACED, not built — Bean amended the design on
  2026-08-01 to uniform CSS shrink; flexbox already does proportional shrink natively.
  Stage 3 (fluid clamp scaling) BLOCKED, not merely deferred — sgs_container_gap_value()
  strips parentheses and commas, so a clamp() gap emits as invalid CSS and dies silently;
  only a static min() logo floor shipped. Parked at P-GAP-CONSOLIDATION-FOLLOWUPS item (5).
  Stage 4 (nav-menu "More" JS) NOT STARTED — correctly deferred per this design's own
  sequencing decision #3; parked at P-HEADER-ROW-STAGE4-MORE-MENU.
  Bean's live-eye sign-off (R-31-13) STILL OUTSTANDING.
  ⚠ Read the per-stage table above before assuming any stage shipped as written.
spec_refs: Spec 37 FR-37-35 / §3.6 · FR-S9-7 · D339b
supersedes_behaviour_of: FR-37-35's collapse-to-stack reflow (its container-query half is KEPT)
---

# Header row — the fit cascade

## The problem, in one paragraph

A header row stacks its contents into a vertical pile whenever the row is narrower
than 767px — logo on one line, burger on the next, cart on the next. It reads as
"the header wrapped because it ran out of space". It did not. **A rule tells it to
stack, and it fires even when everything fits comfortably.**

## Root cause — PROVEN, not inferred

`plugins/sgs-blocks/src/blocks/site-header-row/style.css`, final rule:

```css
.sgs-site-header-row { container-type: inline-size; }
@container (max-width: 767px) {
  .sgs-site-header-row > *,
  .sgs-site-header-row > .sgs-container__inner > * { flex-basis: 100%; }
}
```

The flex container is `.sgs-container__inner` (`display:flex`, `flex-wrap:wrap`);
the row above it is the query container. Below 767px of **row** width every child
is given the full width, and `flex-wrap:wrap` then puts each on its own line.

Measured live on the sandybrown canary (middle header row), forcing the header's
width and reading `getComputedStyle` + `getBoundingClientRect`:

| forced row width | child `flex-basis` | inner height | wrapped |
|---|---|---|---|
| 770px | `auto` | 68px | no |
| **766px** | **`100%`** | **229px** | **yes — 3 layers** |

A clean cliff edge at the 767px boundary. At 766px the children need **733px** and
have **766px available** — they fit with 33px to spare. **The stack is authored, not
a space failure.**

**Why it also hits desktop:** the query measures the ROW's own inline size, never the
viewport. Any header row under 767px — a constrained column, a capped-width header —
stacks on a 27-inch monitor. This is the owner's "also a problem on desktop".

**Correction to my own first hypothesis, recorded so it is not inherited.** I initially
reported two causes: this rule AND emergent `flex-wrap:wrap` overflow. Only the rule is
proven. Across a full width sweep the content always fitted, so emergent wrapping never
fired. `flex-wrap:wrap` is a latent capability, not an observed cause.

## What the research established

Full sweep of design systems, CSS baseline status and GitHub issue trackers.

**The headline finding: nothing in production makes an ARBITRARY row fit
automatically. Every shipping mechanism buys its guarantee by knowing something about
its children.** Bootstrap's navbar uses `flex-wrap:wrap` and carries a decade of open
wrap bugs (#18875, #11119, #9566, #25582). WordPress core's Navigation block hardcodes
its overlay breakpoint — Gutenberg #45274/#45040 are long-running complaints and a
plugin exists solely to change it. That is empirical confirmation of the owner's
prediction that per-breakpoint authoring does not scale.

**Priority+ overflow menus are the wrong shape at ROW level.** Every system shipping
them (Primer `UnderlineNav`, Adobe Spectrum `ActionGroup`, Material top app bar,
Atlassian) applies them to a **homogeneous, rankable peer list** — tabs, toolbar
actions — never to a mixed app bar. There is no defensible answer to "should the logo
or the cart go into More?".

**`min-width: 0` is non-optional.** Per spec a flex item's `min-width` resolves to
`min-content`, so items refuse to shrink below their longest word. This is the single
commonest cause of "my nowrap row overflows anyway". Already present in our CSS — keep it.

**Two accessibility constraints, to build in rather than discover:**
- Fluid sizing must keep a `rem` component (`clamp(1rem, .9rem + 1cqi, 1.5rem)`, never
  bare `cqi`/`vw`). Viewport/container units do not respond to browser zoom, so a
  unit-only clamp can stop text reaching 200% — a WCAG 1.4.4 AA failure.
- Floor every touch target at 44px explicitly, or the clamps shrink them below it.

**Baseline status checked:** size container queries + `cqi` are Baseline (~95%+) — safe.
`@container style()` became Baseline May 2026 — usable. **`::scroll-button()` is NOT
Baseline** (Chrome 135+/Safari 19+, Firefox flagged) — nothing may depend on it.

## Prior decisions this HONOURS (checked before designing)

Deliberately verified, because on 2026-07-30 a design was presented that silently
reversed the owner's own two-day-old D402.

- **D339b corollary — "prefer intrinsic over tiered"**, the owner's own ruling: he
  challenged a per-device object for `drawerWidth` and was right; one flat
  `min(100%, 400px)` covers 375px and 768px. **This design applies that same principle**
  to the header row.
- **FR-S9-7 — the row's own docblock calls it "the intrinsic never-overflow cluster".**
  The stacking rule was added later by FR-37-35 and contradicts the file's stated purpose.
- **FR-37-35's container-query half is KEPT.** Its requirement was that a row must be
  able to reflow on its OWN width rather than the viewport
  (STOP-CONTAINER-TIER-IS-NOT-VIEWPORT). That is correct and stays. Only its chosen
  reflow BEHAVIOUR — collapse every child to full width — is replaced.
- **Spec 37 §3.6 already lists `clamp()` for fluid type/space** as part of this
  requirement, recorded as "not shipped in the row CSS — noted as optional, not a fail".
  This design ships that unshipped half.

**So this reverses no decision.** It completes §3.6 and restores FR-S9-7's stated intent.

## The design — a four-stage fit cascade

The row is **locked**: `flex-wrap: nowrap`, so it cannot wrap at any width, ever. What
varies is HOW each child yields.

### Stage 1 — Lock + release (CSS, always on)
`flex-wrap: nowrap` on `.sgs-container__inner`; `min-width: 0` on every child (already
present); **delete the `flex-basis: 100%` container-query block**.

### Stage 2 — Shrink roles (CSS + one attribute)
One new per-child setting, `shrinkRole`, defaulted from block type and overridable in
the inspector (owner-approved):

| Role | Behaviour | Default for |
|---|---|---|
| `fixed` | `flex: 0 0 auto` — never shrinks | logo, cart, primary CTA |
| `truncate` | shrinks, then ellipsis | text, phone number, tagline |
| `collapse` | drops its label below a container threshold, keeps the icon **and its accessible name** | icon buttons, search |
| `fluid` | `flex: 1 1 auto` | spacers, generic containers |
| `overflow` | the child manages its own priority+ internally | `sgs/nav-menu` only |

### Stage 3 — Fluid scaling (CSS)
Gap, padding, logo height and icon size on `clamp(rem, rem + N cqi, rem)` curves keyed
to the row's own inline size, so the row squeezes smoothly before anything has to give
way. `rem` component mandatory (WCAG 1.4.4). Touch targets floored at 44px.

### Stage 4 — Nav self-management (JS, DEFERRED to a later session)
Items that no longer fit slide into a "More" menu **inside `sgs/nav-menu`** — the only
child that is a list of equals, and therefore the only place where "which item yields"
has a correct answer. Prefer the hidden-clone + IntersectionObserver variant over
measure-and-tally: cached widths break on webfont swap and zoom, which is where Spectrum
(#6078) and most DIY implementations have their bugs. Ship Primer's detail — the More
button's accessible name must change when the CURRENT page has overflowed into it.

**The burger drawer becomes the floor, not the primary mechanism**, so its exact
breakpoint stops being load-bearing.

## Owner decisions — SIGNED 2026-07-30

1. **Approach: the fit cascade.** (Alternatives offered and declined: a minimal
   delete-the-rule fix, which trades a stack for horizontal overflow — WCAG 1.4.10, and
   arguably worse; and a horizontal-scroll row, which the research flags as correct for
   tabs/chips but wrong for a header, since a cart you must scroll to find is a UX
   failure with no affordance on a desktop mouse.)
2. **Control: automatic default + operator override in the inspector.** Works with zero
   configuration; a client with an unusual header can still fix it without a developer,
   per the standing rule that a setting requiring code is not done.
3. **Sequencing: CSS stages 1-3 first, deploy, owner's eye on real headers, then decide
   whether stage 4 is still needed.** Avoids building a JS mechanism that may prove
   unnecessary once the row genuinely fits.

## Build order (next session)

1. Delete the `flex-basis:100%` block; set `nowrap`. **Re-measure the 766px cliff — it
   must be gone.** This alone fixes the reported defect.
2. Add `shrinkRole` (block.json attr + inspector control + type-derived default).
3. Fluid clamps for gap/padding/logo/icon, `rem` component mandatory, 44px floor.
4. Deploy, then verify on REAL headers at a width SWEEP, not 3 fixed tiers —
   the whole point is that no specific breakpoint is special.

## Verification — the gate this must pass

- **The cliff is gone:** sweep row width 1400 → 320px in small steps; row height must
  stay constant (no stack) and `document.scrollWidth` must never exceed `clientWidth`
  (no escape). A pass at three tiers proves nothing here — the defect lived BETWEEN
  the tiers.
- **Negative control:** re-inject the `flex-basis:100%` rule and confirm the sweep
  fails, so the check is proven load-bearing rather than assumed.
- **Zoom:** 200% browser zoom must still reach full text size (WCAG 1.4.4) — this is
  the specific failure mode of unit-only clamps.
- **Touch targets:** every interactive child ≥44px at every swept width.
- **Owner's eye (R-31-13):** a real header at 390px and 1440px. Numbers do not close this.
