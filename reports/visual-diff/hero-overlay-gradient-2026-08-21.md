---
verdict: PASS
intent_capture_passed: true
date: 2026-08-21
block: sgs/hero
scope: overlay gradient was silently replaced by the flat overlay colour
---

# Hero overlay gradient — live verification

## The defect

`hero/render.php` passed `$overlay_gradient` to `sgs_overlay_decls()`. That variable has
**never existed** in the file — one reference, zero assignments, at any point in its history
(checked back through D718, which inherited it while renaming the sibling `$overlay_colour`).

    sgs_overlay_decls( ?string $colour, ?string $gradient, $opacity )

So the gradient argument was `null` on every render. **The client's gradient was not dropped to
nothing — it was replaced by the flat overlay colour.** That is why it survived: the overlay
still painted, just never as the gradient configured.

`overlayGradient` is a declared block.json attribute with a real editor control, so this was
fully reachable by a client.

**Likely cause — an asymmetric attribute pair.** The colour is `backgroundOverlayColour`; the
gradient is `overlayGradient`. Someone wrote `$overlay_gradient` expecting symmetry with
`$overlay_colour_raw`. Worth remembering when naming the next pair.

## The fix

`$overlay_gradient` → `$overlay_gradient_value` — the value already computed at line 113 from
`$attributes['overlayGradient']`, and already used at line 927 for the `has-background` class.
The gradient was detected for classing, then discarded for painting.

## Evidence 1 — mechanism, by execution (5/5)

The real `sgs_overlay_decls()` run both ways:

| # | Input | Output | Verdict |
|---|---|---|---|
| S1 | colour + gradient | `background-image:linear-gradient(...);opacity:0.5` | PASS |
| S2 | gradient = null (the bug) | `background-color:#3a2e26;opacity:0.5` | PASS — bug reproduced |
| S3 | nothing set (negative control) | `''` | PASS — harness can return empty |
| S4 | gradient only, no colour | `background-image:linear-gradient(...)` | PASS |
| S5 | S1 ≠ S2 | differ | PASS — the fix is not a no-op |

## Evidence 2 — live on the canary (2/2)

Probe page **2602** `/hero-overlay-gradient-qc-2026-08-21/`, two heroes, cache-busted:

    A (gradient set)   .sgs-hero-fd6922c1 .sgs-hero__overlay{background-image:linear-gradient(180deg,#ff0000 0%,#0000ff 100%);opacity:0.3}
    B (colour only)    .sgs-hero-19333249 .sgs-hero__overlay{background-color:#3a2e26;opacity:0.3}

**The negative control is what makes this conclusive.** Pre-fix, hero A would have emitted
`background-color:#3a2e26` — byte-identical to hero B. They now differ, and differ correctly.

⚠ The gradient rule lives in the LIFTED stylesheet (`uploads/sgs-css/…`), not the page HTML —
a page-HTML grep alone returns 0 and would read as a failure. Both surfaces were checked.

## Why no gate caught it

Nothing in the ~55-gate prebuild chain detects an undefined variable in a `render.php`. PHP
evaluates it to `null` with a notice, and notices are not surfaced. Logged in
`.claude/reports/2026-08-21-unenforced-prohibition-register.md` as a gate worth building.

**A static analyser did catch it** — intelephense flagged it the moment the file was opened for
an unrelated documentation sweep. That is an argument for wiring a PHP static-analysis pass into
the chain, not for reading harder.

## Cleanup

Probe page 2602 is a test rig and can be deleted.
