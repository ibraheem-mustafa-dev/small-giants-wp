---
verdict: PASS
intent_capture_passed: true
source_sha: NOT-COMPUTABLE-SEE-BELOW
commits: d7740818, 914c2ad4
decisions: D735, D736, D737
date: 2026-08-22
---

# D735–D737 — colour panel completion, live evidence

## ⚠ `source_sha` is deliberately not a hash

`visual-report-sha.py` hashes STAGED block bytes; this was written after the commits, so no valid
value exists. **Evidence record, not a gate token** — it cannot wave through a future commit.

## Why before/after doesn't apply

Hover, responsive tiers and blend mode did not exist before. The questions are whether the
controls are reachable, whether the palette token survives storage, and whether the paint lands.

## Assertions, stated before measuring

1. All seven new attributes register in the editor, blend mode with its 12-value enum.
2. The Background panel exposes: overlay colour, overlay colour (hover), opacity, blend mode.
3. Picking a palette swatch on the HOVER row stores a **slug**, not a hex — i.e. D717's `linked`
   survived the D4 adapter rewrite.
4. Base overlay colour and opacity are unregressed by that rewrite.
5. The frontend emits a real `:hover` rule resolving the token.
6. `mix-blend-mode` paints.
7. An UNSET tier emits nothing (inherits by cascade — no hand-rolled fallback).

## Live results — canary page 2596, cache-busted, after deploy

| # | Assertion | Measured | |
|---|---|---|---|
| 1 | Attributes registered | all 7 present; blend enum length 12 | PASS |
| 2 | Controls reachable | "Overlay colour", "Overlay colour (hover)", opacity range, 12-option blend select | PASS |
| 3 | Hover stores a slug | `accent-dark` | PASS |
| 4 | No regression | base `primary`, opacity `45`, `isValid: true` | PASS |
| 5 | Hover rule paints | `.sgs-container-243a72dc .sgs-container__overlay:hover, …:focus-visible { background-color: var(--wp--preset--color--accent-dark) }` | PASS |
| 6 | Blend paints | computed `mix-blend-mode: multiply` | PASS |
| 7 | Unset tier silent | zero `@media` rules for the overlay | PASS |

Row 3 is load-bearing: it proves behaviourally — not by reading code — that the adapter rewrite
kept the property whose absence silently unlinks a client's brand colour on every pick.

Row 5 also shows the hover pairs `:hover` with `:focus-visible`, so the state is keyboard
reachable rather than pointer-only.

## A false alarm worth recording

My first probe reported the overlay colour controls MISSING. They were not — the probe keyed on
`.sgs-gradient-overlay-control__toggle`, and the D4 adapter replaced that dropdown markup with the
shared picker's row shape. **A dead selector looks exactly like a missing control.** Re-probed by
reading the panel's actual buttons; all four present. A console error in the same run was also
mine — a null selector in my own script, not an editor crash.

## Not covered

Only `sgs/container` was exercised directly; the other seven blocks share the same panel mount and
the same `sgs_overlay_decls()` paint path but were not individually captured — shared-mechanism
argument, not per-block measurement. Tier rendering was verified only in its unset state.
