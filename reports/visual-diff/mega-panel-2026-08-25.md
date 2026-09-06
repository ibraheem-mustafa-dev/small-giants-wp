---
block: sgs/mega-panel
date: 2026-08-25
verdict: PASS
intent_capture_passed: true
intent_capture_run: true
source_sha: 6b5e8c180272f596
capture_method: headless Chromium (playwright, plugin-local) against an isolated repro of the exact before/after selector pair — the canary deploy was BLOCKED by another track's oldshape-audit debt (see "Why not the canary" below)
deployed_build: none — pre-deploy intent capture
change: D793 child-lift de-specification — `.wp-block-sgs-mega-panel .sgs-mega-aside[data-spotlight] > *` wrapped in `:where()`, (0,3,0) -> (0,0,0)
---

## The assertion under test

De-specifying the spotlight child-lift from (0,3,0) to (0,0,0) is **behaviour-identical
on this block today**, and the aside's content still paints ABOVE the `::before`
spotlight glow.

This is an intent capture, not a before/after diff: there is no visual *change* being
claimed. The claim is that there is **no visual change at all**, and that is what was
measured.

## Why this change is not a live defect (and is still worth making)

`.sgs-mega-aside[data-spotlight]`'s only decorative layer is a **`::before` pseudo-element**
(`style.css:203`). `> *` cannot match a pseudo-element, so the trap this rule belongs to
(a child-lift clobbering a decorative layer's own `position`) **cannot currently fire here.**

It was still the **highest-specificity child-lift in the tree** at (0,3,0) — higher than the
two that *were* live defects. The first real decorative child element added inside this aside
would have been trapped harder here than anywhere else. De-specified pre-emptively rather
than added to the gate's exemption list, because growing that list is the exact failure D784
removed.

## Measurement

Isolated repro carrying both selector variants over identical markup (an aside with a
`::before` radial-gradient glow and one child), measured in headless Chromium:

| | `position` | `z-index` | topmost element at the child's centre pixel |
|---|---|---|---|
| OLD `(0,3,0)` | `relative` | `1` | `kid` |
| NEW `(0,0,0)` `:where()` | `relative` | `1` | `kid` |

- **old === new on every measured property** — the de-specification changes nothing here.
- **`document.elementFromPoint()` at the child's centre returns the CHILD, not the glow** —
  i.e. content genuinely paints above the spotlight, which is the block comment's stated
  intent (`style.css:196-199`: *"Aside content gets `position:relative;z-index:1` so it paints
  ABOVE the absolutely-positioned glow layer"*).

`elementFromPoint` was used deliberately rather than reading `z-index` alone: it asks the
browser what is actually painted on top, instead of reasoning about stacking from declared
values. That distinction is this session's own method note, and it is what caught the real
defect in the sibling files.

## Anti-vacuity — the control that makes this non-trivial

A "nothing changed" result is exactly the shape a broken probe produces, so the same harness
was first pointed at the sibling change (`fx-cursor-field` + `fx-surface-treatment`) where a
change **was** expected, and it reproduced the failure:

| case | `position` on `.sgs-webgl-surface` |
|---|---|
| A — pre-fix, lift at (0,1,0) declared last | **`relative`** ← the lift CLOBBERED it |
| B — pre-fix + the old hand-scoped workaround (0,2,0) | `absolute` |
| C — post-fix, bare class vs `:where()` lift, lift still last | `absolute` |

Case A reproduces, in a browser, precisely the failure `fx-surface-treatment.css`'s own
comment described in prose. So the harness demonstrably CAN detect a stacking change; the
`old === new` result above is therefore a real negative, not a silent no-op.

⚠ The first version of that harness was **vacuous** and is recorded here rather than hidden:
it declared the surface rule *second*, so the surface won on source order and case A wrongly
read `absolute`. Ordering was corrected to put the lift last — the true hazard ordering, two
unrelated stylesheets where whichever loads last wins a tie.

## Why not the canary

`build-deploy.py --target sandybrown --blocks-only --payload …` was run and **aborted at
`step_oldshape_audit()`**, correctly, on three NEW HIGH findings on page 2742:
`imageBorderWidth`, `imageObjectPosition`, `splitImageMobileObjectPosition` on `sgs/hero`.

Those are **not this change** — they are residue of another track's hero `image*` →
`splitMedia*` rename (`40ba47640`), and this changeset touches four CSS files and no
`block.json`. Migrating another track's stored content was declined: page 2742 is flagged
editor-hazardous in the LEDGER, and a cross-track content write is not this change's business.

`--allow-dirty` and `SGS_VISUAL_GATE_SKIP` were both available and both declined. The gate is
protecting real stored content and it is right to.
