# Visual diff — sgs/container — 2026-08-25

verdict: PASS
intent_capture_passed: true
first_paint_capture_passed: true
source_sha: a07f847c7e8c6251

⚠ This file previously described a DIFFERENT change on the same day — the `layout`
enum on `container/block.json` (commit `04f487c39`), which stated "No PHP, JS or CSS
touched". That change is unrelated to this one and its record is retained below.
This section covers the CSS change; `source_sha` above binds to the STAGED bytes of
`src/blocks/container/style.css`.

## Change under test

The six child-lift rules lose their `:not()` exclusion chains and drop to zero
specificity via `:where()` — 47 exclusions across 7 selectors deleted.

    - .sgs-container > *:not(.a):not(.b)…:not(.i) { position: relative; z-index: 1 }
    + :where(.sgs-container) > *                  { position: relative; z-index: 1 }

## Why

The list was self-defeating. Each `:not(.x)` ADDS a class's specificity, so the base
rule sat at **(0,10,0)** while a layer's own rule sits at **(0,1,0)**. Every member
added made the NEXT unlisted layer more certain to lose — which is why SIX features
hit it independently. At (0,0,0) any element declaring its own `position` wins
automatically, with no registration anywhere.

## Measurement — live A/B on the deployed canary, 4 pages

The fix was applied IN-PAGE by rewriting each rule's `selectorText` through the CSSOM,
then computed `position`/`z-index` were re-read for every `.sgs-container > *`.

| page | container children | rules rewritten | CHANGED |
|---|---|---|---|
| `/` (home) | 45 | 6 | 0 |
| `/shop/` | 41 | 6 | 0 |
| `?p=2744` (particle canary) | 22 | 6 | **1** |
| `/blog/` | 37 | 6 | 0 |
| **total** | **145** | — | **1** |

The single change is the intended one:

    sgs-particles__canvas    relative / z1   ->   absolute / z1

**Zero regressions across 145 elements on four pages.**

## Both halves of the evidence are non-vacuous

- **The census can detect change.** Negative control: a planted
  `.sgs-container > *{position:static !important}` changed **22 of 22** children.
- **The treatment lands.** An earlier run of this same A/B reported `rewritten=6,
  changed=0` — a FALSE clean. The replacement was emitting `:where(.sgs-container) > `
  with a dangling combinator (the live selector is `> :not(…)`, with the `*` normalised
  away), which is invalid CSS and was silently rejected. Assignments are now verified to
  stick before being counted. Recorded because "0 changed" looked identical in both runs.

## Root cause, proven not inferred

Enumerating every rule that sets `position` on the canvas returned exactly two:
`.sgs-container > :not(…)` → `relative`, and `.sgs-particles__canvas` → `absolute`.
Computed was `relative`, so the child-lift rule was the winner. Asked the browser;
did not reason about specificity.

## Inverse case checked

`grep "position:\s*static"` across all block stylesheets: **zero hits**. No element
relies on being forcibly lifted, so de-specifying cannot silently sink anything.

## Regression gate added

`scripts/check-container-child-lift.py` (tier `fast`, registered in `gates.json`) fails
the build if a `:not()` chain reappears on these rules, or if the rules vanish entirely
(so the gate cannot go blind). `--self-test` proves both failure modes catch, plus a
clean-tree control.

## POST-DEPLOY CONFIRMATION — 2026-08-25, deployed and re-measured

The simulation above predicted exactly one change. The real deploy produced exactly
that change and nothing else.

Deployed via `build-deploy.py --target sandybrown --blocks-only` on a CLEAN tree
(183s, oldshape audit + ownership + 3 live motion-QA probes all green).

Census re-run against the live site and diffed against the pre-change baseline:

| | |
|---|---|
| elements matched across before/after | 141 |
| **CHANGED** | **1** |
| the change | `sgs-particles__canvas`  `relative/z1` -> `absolute/z1` |

Element churn (4 `trust-bar__badge` gone, 1 `container__inner` new) is another
track's homepage work landing in the same window — attributed, not mine.

Geometry proof that the layer now overlays instead of sitting in flow:

| property | before | after |
|---|---|---|
| `position` | `relative` | `absolute`, `inset: 0` |
| canvas height | 1443px (INFLATING its section) | 630px — exactly the parent |
| paints | n/a | 2417 lit pixels during a pointer sweep |
| `pointer-events` | n/a | `none` |
| canvases on page | n/a | 1 (the no-fx sibling still has none) |
| console errors | n/a | 0 |

**Full `fast` gate suite: 64/64 PASS**, including the new
`check-container-child-lift`. The one pre-existing failure (`no-inline`, a
`sgs/trust-bar` inline style on the live homepage) also cleared on this deploy —
predicted, because the static source gate was already clean and the live site was
running stale deployed code.

---
---

# Visual diff — sgs/container — 2026-08-25

verdict: PASS
intent_capture_passed: true

Retires the scoped bypass used on commit `04f487c39`
(`SGS_VISUAL_GATE_SKIP=container`). The bypass was taken because the after-capture
requires a deploy and the deploy requires a committed tree.

## Change under test

`src/blocks/container/block.json` — the `layout` attribute gains an enum:

    "layout": { "type": "string", "enum": ["", "flex", "stack", "grid"], "default": "flex" }

No render path changed. No PHP, JS or CSS touched.

## Assertion

No existing container renders differently, because no stored or authored value
falls outside the new enum — so WordPress coerces nothing.

## Evidence gathered BEFORE the edit (the safe-narrowing test)

| Source | Values found |
|---|---|
| Stored canary `post_content` | 652 absent · 28 `flex` · 9 `grid` · 9 `stack` · **0 out-of-enum** |
| Theme templates + patterns | 18 `flex` · 21 `grid` · **0 invalid** |

`""` is included deliberately: it is the content-band/flow mode and gates the
`contentWidth` default path (`class-sgs-container-wrapper.php:3379`). Omitting it
would have coerced every flow-mode container to `flex`.

## Measured, live canary, post-deploy, 1440px

| Surface | Result |
|---|---|
| `/shop/` | h1 "Shop"; breadcrumb → h1 → search still `sameLeft` and strictly stacked; cards 5×313.3px; no horizontal overflow |
| `/blog/` | h1 "Blogs", 9 articles |
| `/` | homepage renders, 116KB |
| payload-verify | 83/83 deployed `block.json` checksums match the payload |

No layout, width or stacking change on any surface. Consistent with the
prediction, because nothing was coercible.

## What this does NOT claim

The enum is **silent, not loud**. An invalid value now coerces to `flex` (a row)
rather than emitting no `display` at all (block flow). That is more predictable
and removes the meaningless `sgs-container--<invalid>` class, but it is not an
error. Spec 36:820 prefers PHP validation precisely because an enum masks the bad
value; that trade-off was made knowingly for the zero-risk win, and a PHP warn can
be layered on later without undoing this.

⚠ Supersedes D774's blanket "do not add an enum to `layout`". D774 conflated a
shared PHP allowlist inside the wrapper (which WOULD break gallery, post-grid and
testimonial-slider) with a per-block enum on `sgs/container` (which cannot —
WordPress validates against each block type's own schema). Five of the nineteen
blocks sharing the attribute name already carry their own differing enums.
