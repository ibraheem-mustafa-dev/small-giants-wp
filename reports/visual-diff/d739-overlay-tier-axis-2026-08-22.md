---
verdict: PASS
intent_capture_passed: true
source_sha: NOT-COMPUTABLE-SEE-BELOW
commit: f93de87f
decision: D739
date: 2026-08-22
---

# D739 — the overlay's tier axis moves off colour and onto opacity

## ⚠ `source_sha` is deliberately not a hash

`visual-report-sha.py` hashes the STAGED bytes of a block's `src/`. This report was written after
`f93de87f` was committed, so nothing is staged and no valid value exists. The commit went in under
the scoped, logged bypass. **This is an evidence record, not a gate token** — it cannot wave through
a future commit to these blocks.

## Assertions, stated before measuring

1. A palette colour on the overlay stores the SLUG, not a hex, and resolves to the token's value.
2. Desktop opacity paints the authored value.
3. A MOBILE opacity override paints at a mobile viewport — the capability that did not exist before.
4. The COLOUR is identical at both tiers (colour is no longer per-tier).
5. The tier-colour attributes are gone from the editor schema.

## Live results — canary page 2596, cache-busted, after deploy

Authored: `backgroundOverlayColour: primary`, `backgroundOverlayOpacity: 60`,
`backgroundOverlayOpacityMobile: 15`.

| # | Assertion | Measured | |
|---|---|---|---|
| 1 | Slug stored + resolved | stored `"primary"`; computed `rgb(230, 138, 149)` = `#e68a95` | PASS |
| 2 | Desktop opacity | `0.6` at 1440 | PASS |
| 3 | Mobile override paints | `0.15` at a 355px viewport | PASS |
| 4 | Colour identical across tiers | `rgb(230, 138, 149)` at BOTH widths | PASS |
| 5 | Tier-colour attrs gone | `'backgroundOverlayColourTablet' in attributes` -> `false` | PASS |

Rows 3 and 4 together are the whole point: the scrim gets heavier or lighter per device while the
brand colour stays one value in one place. Before this change the reverse was true — colour could
vary per device and weight could not.

## Three defects this change hit on the way, all caught by gates, all mine

Recorded here because they are the reason to trust the result, not a footnote:

1. `inspector-scan` rule 29 — a labelled `RangeControl` inside a labelled `ResponsiveControl`
   painted the visible label twice. Fixed with `hideLabelFromVision` (keeps the accessible name).
2. `audit-block-file-consistency` — 4 `undeclared_render_ref` on `sgs/hero`: I updated the shared
   wrapper and forgot that hero paints its OWN overlay. D718's lesson recurring within a day.
3. `check-render-undefined-vars` (built the same morning, from the unenforced-prohibition register)
   — a line-range edit whose end marker matched the TABLET block's brace left the MOBILE block
   referencing deleted variables. It would have evaluated to null with an unsurfaced notice: the
   client's setting silently doing nothing.

## Not covered

Only `sgs/container` was exercised live. The other seven blocks share the wrapper code path but
were not individually captured — an argument from shared mechanism, not a per-block measurement.
`sgs/hero` paints its own overlay through a SECOND copy of this logic and was verified only
statically (`php -l`, the undefined-vars gate, and the consistency audit), NOT live. That copy is
named as owed work in D739.
