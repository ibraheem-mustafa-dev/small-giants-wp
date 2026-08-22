---
doc_type: brief
project: small-giants-wp
governing_spec: 35-BLOCK-INSPECTOR-UX-STANDARD.md (Part O — colour controls)
status: EXECUTED (detector) + SUPERSEDED (unit of work) — see the OUTCOME block below
date: 2026-08-22
revision: 2 (rewritten after /qc-council — revision 1's premise was wrong)
---

# Colour control conformance — enforced recipes, not control bundles

## OUTCOME 2026-08-22 — read this before the brief below

**The detector half of this brief was BUILT and SHIPPED.** rule 31 is mechanism-aware, every
finding carries a `kind`, the ratchet moved 413 -> 378, and `survey.js` is the census. That is
this document's core proposal, delivered.

**The unit of work then changed again, on Bean's call, and this brief did not predict it.**
Bean ruled for **five variant HELPERS that blocks adopt** — fill/text/border as row helpers,
overlay/shadow as standalone controls — each installable with one attribute-name map. All five
are built. Live status + the exact steps left: `.claude/plans/phase-colour-conformance.md`.

### ⭐ THE COUNCIL WAS RIGHT, AND THAT IS WHY THE HELPERS LOOK THE WAY THEY DO

It is tempting to read Bean's helper ruling as vindicating revision 1's "control bundles" and
overturning the council. It does not, and the distinction is the useful part:

- The council's finding was that **there is no per-mechanism seam IN THE CONTROL LAYER** — one
  row shape serves fill, text and border, separated only by `gradientCapable`. That was
  verified against `sgs/heading` and it is **still true**. It was confirmed again by building
  the helpers: `textRow.js` and `borderRow.js` came out as near-clones of `fillRow.js`, exactly
  as the council's evidence predicted. Had I expected three genuinely different controls, that
  similarity would have looked like a mistake instead of a confirmation.
- The seam that DOES exist is in the **paint layer**, and the helpers cut along it:
  `sgs_fill_decls()` / `sgs_text_decls()` return per-state declarations, while
  `sgs_border_states_css()` returns finished CSS because `sgs_border_gradient_css()` takes both
  states in ONE call. Three mechanisms, three genuinely different PHP shapes.
- So the helpers are not "bundles per mechanism". They are **one repeated row shape extracted
  once**, paired to the correct emitter. Their value is deleting 3,951 lines of hand-assembled
  JSX across 64 blocks and making the recipe the DEFAULT — not separating mechanisms that were
  never separate client-side.

**The two halves are complementary, not competing:** the detector ENFORCES the recipe; the
helpers make the recipe what you get for free. This brief argued the first and Bean added the
second.

### What this brief got wrong, kept for the record

- It scoped the work as per-block migration. Bean stopped that twice — D542 (>3 blocks means
  build the detector, not the edit), then again because patching 64 bespoke implementations
  leaves 64 bespoke implementations.
- Its "Counts — measure, never cache" instruction was right and I still broke it: the first
  AUTOFIXABLE figure (161, 75%) was wrong because the census asked "does the block emit
  colour?" instead of "can that emission carry a GRADIENT?". True figure 29 of 208 (14%).


> **Revision 1 proposed "3-5 control bundles, one per paint mechanism." A QC council falsified that
> premise.** This is not a patch — the unit of work changed. Revision 1 survives in git, and the
> reason it was wrong is the most useful thing in this document.

## What the council killed, and why it matters

**There is no per-mechanism seam in the control layer to cut along.** Verified against
`src/blocks/heading/`:

| Row | edit.js shape | render.php helper |
|---|---|---|
| `text` (`edit.js:293`) | `states[]` + `gradientValue`/`onGradientChange`, **plus `gradientCapable: true` (`:295`)** | `sgs_text_colour_decl()` (`render.php:267`) |
| `background` (`edit.js:318`) | `states[]` + `gradientValue`/`onGradientChange` | `sgs_background_paint_decl()` (`render.php:337`) |
| `border` (`edit.js:344`) | `states[]` + `gradientValue`/`onGradientChange` | `sgs_border_gradient_css()` |

**One row shape serves all three mechanisms.** A single boolean (`gradientCapable`) separates text,
because text needs `background-clip:text`. Background and border are **indistinguishable
client-side** — the mechanism is chosen entirely by which PHP helper `render.php` calls.

So "a control bundle per mechanism" had nothing to cut along. That is why revision 1 could not say
what a bundle *was* in code — a component, a config field, or a copy-paste pattern. On this
architecture the honest answer is none of them.

⛔ Revision 1 also said **"copied from its reference block"**, which reads as duplicating JSX into
each qualifying block. That is the exact anti-pattern D717/D718 warn about: *a helper that owns the
value but not the condition makes two implementations look converged without converging them.*

## The real shape: an enforced RECIPE

The controls are already uniform. What is unenforced is the **pairing**:

> **row shape → paint helper → required sibling attributes**

A row is correct when its gradient path matches the helper that consumes it. Nothing checks that
today, which is exactly the gap the enforcement programme doc names:

> *"A binary 'does a gradient path exist?' check is INSUFFICIENT: **a text row wired to the
> background mechanism would PASS while rendering nothing.**"*
> — verbatim, `.claude/reports/2026-08-20-colour-golden-scan-set.md:539-541`

**The deliverable is therefore almost entirely the detector, not the controls.**

### The five members of the colour-control family

**Bean-ruled 2026-08-22:** *"Overlay is not a part of that panel but it's still a variation of the
colour control which makes it a sibling control, so all 5 should exist."*

That ruling is what makes the family coherent. Four members are `SgsColourPanel` ROWS; overlay is a
SIBLING CONTROL living outside the panel. They are peers in the family, not peers in the panel.

| Member | Lives as | Paint helper | Row/control shape | Required siblings |
|---|---|---|---|---|
| Fill / background | `SgsColourPanel` row | `sgs_background_paint_decl()` | `states[]` + per-state gradient | `{attr}Gradient` per state |
| Text | `SgsColourPanel` row | `sgs_text_colour_decl()` + `sgs_text_colour_gradient_fallback_rule()` | same + `gradientCapable: true` | `{attr}Gradient` per state |
| Border | `SgsColourPanel` row | `sgs_border_gradient_css()` | `states[]` + per-state gradient | `{attr}Gradient` per state |
| **Overlay** | **SIBLING control** (in `BackgroundPanel`) | `sgs_overlay_decls()` — fill applied to a scrim element | same `states[]` shape, alpha OFF, own row presentation + help text | `{attr}Gradient` per state, **plus** `backgroundOverlayOpacity{,Tablet,Mobile}` and `backgroundOverlayBlendMode` |
| Shadow | `SgsColourPanel` row | colour only | `states[]`, **no gradient path** | none |

**Shadow has NO gradient recipe.** `box-shadow` takes a colour; a gradient there is invalid CSS.

⛔ **Why "sibling, not row" is the load-bearing distinction.** A council rater raised it as a
blocker: overlay needs `opacity` and `blend mode`, and `SgsColourPanel`'s row contract has neither
(`SgsColourPanel.js:72-101`). Making it a row would mean growing a shared contract **64 mounting
blocks depend on** — a Rule 7 change needing a design gate. Bean's ruling dissolves that objection
rather than paying for it: overlay was never a row, so the contract does not change and no design
gate is needed. Its extras live on the sibling control, where they already are today.

✅ **And the sibling shape is ENFORCEABLE by the detector that already exists** — this was verified,
not assumed. Rule 31 resolves shared components through `reachedComponents()` over `src/components/`
(`rules/31-golden-colour-control.js:74,223`), independent of panel rows. Live proof: it flagged
`GradientOverlayControl.js:98` as a **SHARED colour row** carrying two findings, and both cleared
when that control was given a real normal+hover states pair (D738, `f09255b6`, ratchet 418 → 413).
A sibling control is therefore a first-class citizen of the standard, not an exception to it.

## Shadow: exempt BY MECHANISM, not per block (Bean-ruled 2026-08-22)

Revision 1 proposed a per-block `supports.sgs.colourExemptions` entry. **Bean challenged it and was
right.** All three exemptions live in the tree today:

| Block | Row | Reason is... |
|---|---|---|
| `button` | text | **block-specific** (no wrapper; the same element carries the background) |
| `site-header` | text | **block-specific** (its own background) |
| `post-grid` | shadow | **a universal CSS fact** — identical on every block with a shadow row |

The exemption contract's own rule: *"A reason string is REQUIRED and must not be boilerplate. An
exemption without a real reason is itself a finding."* Declaring the remaining shadow rows would
produce N copies of one sentence — boilerplate by construction, each copy then a finding. **The
mechanism defeats itself at scale.** It exists for "this block is special"; no shadow row is
special.

**Ruling: the detector learns that a shadow row's helper has no gradient form. Stated once.**
Consequence: `post-grid`'s existing shadow exemption should then be REMOVED — once the detector
knows, that declaration is a second owner of the same fact, and if the two ever disagree the
per-block one silently wins.

## The detector work — scoped honestly

**The mechanism is DECLARED, not inferred — read it from the DB** (Bean's steer, 2026-08-22).
`block_attributes.css_property` already records which CSS property each attribute paints, and it
maps cleanly onto the five members:

| `css_property` | Member | Attrs |
|---|---|---|
| `color`, `color-gradient` | text | 116 |
| `background-color`, `background-image`, `background-color-gradient` | fill | 114 |
| `border-color`, `border-color-gradient`, `outline-color` | border | 68 |
| `box-shadow-color` | shadow (no gradient) | 18 |
| `stroke` | SVG stroke | 13 |

MEASURED: populated for **320 of 439** colour attributes (73%). The residue is **119 attributes with
an empty `css_property`** — a seeding worklist with an enumerable size, not a resolver to engineer.

⛔ **An earlier revision of this section prescribed a cross-language regex scan of `render.php`
instead. It was wrong three ways, and all three are worth keeping** so nobody rebuilds it:
1. **It could not have worked.** The shared wrapper contains ZERO calls to
   `sgs_background_paint_decl` or `sgs_text_colour_decl` across its 3,243 lines, so every
   wrapper-routed block's fill and text rows were unresolvable by construction.
2. **It missed the dominant real pattern.** Most blocks with no recognisable helper call paint via
   a bare `sgs_colour_value()` hand-embedded in a CSS string — `team-member/render.php:544`,
   `label:138`, `separator:147`, `breadcrumbs:120-123`. That is real paint the vocabulary could not
   see.
3. **It was off-pattern.** R-31-1 requires DB-first, no hardcoded dicts. A hand-maintained regex
   vocabulary of helper names living inside a lint rule is precisely the lookup that rule bans —
   so the scan would have been a standards violation committed by the standards detector.

⭐ **The lesson worth carrying: when a resolver looks hard to build, check whether the answer is
already declared somewhere.** A council rater measured the scan and returned "not sound enough to
build on"; the fix was not a better scan, it was noticing the DB already knew.

It must fix BOTH directions — revision 1 described only the first:

- **False PASS** — a row wired to the wrong mechanism (the programme doc's case).
- **False FAIL** — a shadow row demanded to carry a gradient it cannot have.

## Counts — measure, never cache

⛔ **Do not quote a number from this document.** Revision 1 cached "193 `row-missing-gradient`"; it
measured **194** the same day. Every cached count in this project has drifted.

Run it and quote the result with today's date:

    node plugins/sgs-blocks/scripts/inspector-scan/run.js --check --json

Rule 31's aggregate is ratcheted in `rules.json` and is the only figure that self-corrects.

## Reference blocks — corrected

⛔ **Revision 1 named `sgs/heading`'s border-colour row as the border reference. It is
NON-CONFORMANT** — `sgs/heading`'s only two rule-31 findings ARE its border rows (`edit.js:343`,
`edit.js:477`), and the fix clearing both is declaring a `borderColourHover` sibling. Copying it
would have propagated the defect to every block adopting the recipe.

| Recipe | Reference | Status |
|---|---|---|
| Fill / background | `sgs/container` | **0 rule-31 findings** — clean |
| Text | `sgs/heading` text row (`edit.js:293-316`) | clean |
| Border | **none yet** — fix heading's border row FIRST, then it becomes the reference | 2 findings |
| Shadow | `ShadowControl.js` | colour-only by design |

## Open questions for Bean

1. ~~**Where do overlay opacity + blend mode live?**~~ ✅ **RULED 2026-08-22 — overlay is a SIBLING
   control, not an `SgsColourPanel` row.** Its extras stay on the sibling control, where they
   already are. `SgsColourPanel`'s row contract is UNCHANGED, so the 64-block Rule 7 design gate
   the council flagged does not apply. See the family table above.
2. **Slider alone, or slider + boolean, for overlay opacity?** Recommendation: **slider alone**.
   `allowReset` already expresses "unset = inherit desktop" (`BackgroundPanel.js:207`); a boolean
   beside it means two attributes owning one piece of state, and they can disagree.
3. **Fix heading's border row first?** It is the blocker for having any border reference at all.

## Explicitly NOT in scope

The existing rule-31 backlog. This brief changes the SHAPE the standard enforces; paying the
backlog down is separate, ratcheted work.

## Council record

Two raters, read-only, every finding cited to `file:line`. Verdicts: *"not safe to build from as
written"* and *"no — I could not build this on Monday without asking several architecture-level
questions first."*

Caught by the council, missed by the author:

- the missing per-mechanism seam (premise-breaking)
- "five bundles" asserted as settled while an open question asked whether the fifth should exist
- "copied from" ambiguous between a shared component and duplicated JSX
- rule 31's lack of `render.php` access
- `SgsColourPanel`'s missing opacity/blend-mode fields — raised as a blocker, then DISSOLVED by
  Bean's sibling-control ruling rather than paid for: overlay was never a row, so the shared
  contract does not change and no Rule 7 design gate applies
- the non-conformant border reference block
- **D-number errors the author introduced the same day**: the hover-tab work is **D738**, but
  **D735** (an unrelated gates commit) was stamped into BOTH `golden-controls.json` and
  `rules.json`. Both corrected. Mechanism-C retirement is **D736**, not D738.

Caught by the author's own structural pre-gates before rater dispatch: the stale 193, the
non-conformant border reference, the shadow false-fails, and the two-vs-three mechanism-count
conflict between the brief and `golden-controls.json`.
