---
doc_type: report
project: small-giants-wp
created: 2026-08-20
from: shop-archive + container-remediation session (Phase 1 Wave 2)
to: colour-golden / colour-standardisation track
status: OPEN — awaiting QC by the receiving track
---

# Handover 3 — Shop Wave 2 colour work, for your QC

## Why you are getting this

Bean's instruction, verbatim in intent: *the other session is standardising the colour
setup including the overlay/background colour work — commit it all, then ask that session
to QC it and make sure it's consistent with its standards.*

Phase 1 Wave 2 of `.claude/plans/phase-shop-container-remediation.md` added **root
background + text colour with hover** to three blocks. It was built from
`sgs/testimonial-slider` as the template. **You own the colour standard; this session
does not.** Everything below is offered for your ruling, not defended.

⚠ This session did **not** author your commits `20332725` (rule 31 shared-owner scan) or
`1905257e` (container background control) — you committed those yourself, concurrently,
while this handover was being written. They are listed here only where they interact.

## What landed (commit `fe078c2f`, plus `709bf066`)

| Block | Change |
|---|---|
| `sgs/hero` | Added `supports.color` (all sub-flags false + skipSerialization). Retargeted the root `css:background-color` from `native:color.background` → `backgroundColour`, added `css:color` → `textColour`, extended `states.hover.attrMap`. Added 6 attrs (2 hover attrs already existed). |
| `sgs/trust-bar` | Same retarget. `supports.color.text` flipped `true` → `false`. **Removed two dead native readers** (`textColor`/`backgroundColor`) that could no longer be populated. Added 7 attrs. |
| `sgs/brand-strip` | **Had no root element in its manifest at all** — one was added (`order: 1`, `isWrapper`), every other element renumbered. Added 8 attrs. |
| `sgs/testimonial-slider` | **Untouched — it was already correct.** It is the template the others were built from. |

All values route through `sgs_colour_value()` (D684). No inline `style` declarations
(Spec 32). Each block's `edit.js` mounts two `SgsColourPanel` rows, two states each,
gradient-capable — background via in-row per-state gradient, text via `gradientCapable`.

## The three things this session wants your ruling on

### 1. ⛔ Nothing here has been verified live. QC Gate 2 is OPEN.

No deploy happened. The four visual-diff gate skips in `reports/visual-diff/manual-skips.log`
(21:49:58–21:50:01) are an **honest audit trail, not a waiver** — prebuild was red at commit
time on rule 31's ratchet, so no compiled assets existed to photograph. Nothing was
fabricated as a PASS.

**The acceptance test is Bean's, and it is behavioural, not structural:** *the client picks
a colour in the editor and the computed style changes on the frontend* — on each block, at
rest and on hover. "Attrs declared" is not a pass. Gradients have **never** been observed
working on these blocks; if a gradient toggle does nothing, that is a finding, not a pass.

### 2. `sgs/hero` — two "text colour" controls, and a prior decision this reverses

Two separate issues, both yours to settle:

**(a) The duplicate control.** `check-duplicate-controls` flags hero's new root `textColour`
because hero also mounts an `sgs/text` child that owns its own colour control. Baselined in
`709bf066` on the same footing as the **identical, already-accepted** finding for
`sgs/accordion-item`. The reason recorded there argues the two are not literally the same
control — root sets an *inherited cascade default* for every descendant; the child overrides
one instance — but concedes the UX objection is real: the inspector shows two things that
read as "text colour". **Please rule on the pattern once, across every parent that mounts
`sgs/text`, rather than per block.** There are at least two such blocks already.

**(b) D6 (2026-08-11) is now partly reversed.** D6 removed hero's native `supports.color`
background *specifically because* it competed with the overlay mechanism, concluding the
overlay was "the ONLY background-colour concept" for that block. Wave 2 reintroduces a
second background-colour concept (plain attrs, not native supports) to repair the broken
mapping. The new background paints *behind* the overlay and background image, so it is
visible only where those do not cover. Bean's steer is that your track is standardising
overlay/background together — **so this is squarely your call, and D6 may need amending
or superseding either way.**

### 3. Arithmetic to reconcile in your own rule-31 reason (`20332725`)

Your `advisoryReason` states **"+10 net new"** (6 shared-row-below-minimum-states + 4
shared-row-missing-gradient) but moves `openBacklog` **409 → 420**, which is **+11**.
One finding is unaccounted for. Flagged rather than silently absorbed — your own reason
already models the "right total for the wrong reasons" failure explicitly, so this is
raised in that spirit.

For the record: this session initially mis-attributed that ratchet. Three subagents each
blamed the others' blocks; the true cause was your engine change (`reachedComponents()` over
`resolveComponentFiles()`) landing while their measurements were running, with your
reconciling `rules.json` edit still unstaged. **The measuring instrument changed underneath
the measurement.** No agent's "not me" was worth anything, including this session's.

## Also worth knowing

- **`product-filter-clear-button` was NOT fixed** and is deliberately still self-closing.
  The plan called it one of seven "leaf" blocks needing a `<div>` wrap; it is not a leaf —
  its `save()` is `InnerBlocks.Content`. Fixing it properly means authoring real nested
  button content. ⚠ Note for whoever picks it up: WooCommerce's own default template uses
  `core/buttons` > `core/button`, and **core blocks are banned in theme files** — the
  prebuild gate `check-no-core-blocks.py` would fail the build. The real fix is an SGS
  button equivalent, so this needs a design decision, not a mechanical edit.
- **The plan's figures were wrong three times** and the corrected, enumerated values are:
  6 filter leaves not 7 · 10 stray comments not 4 · 47 dead teal fallbacks (45 × `#0f7e80`,
  2 × `#0b6668`). The plan doc has been corrected.
- `sgs/brand-strip`'s item-prefixed hover attrs (`itemBackgroundColourHover` etc.) from the
  previous session did their job — the plain names were free, no collisions.

## What this session is NOT asking you to do

Not asking you to build anything. Wave 2 is code-complete and the build is green
(`exit 0`). The asks are: **QC it against your standard, rule on items 1–3, and fold
whatever you change into your own track's commits.**
