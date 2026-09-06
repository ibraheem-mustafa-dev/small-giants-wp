# Visual diff — sgs/responsive-logo — 2026-09-02

verdict: PASS
intent_capture_passed: true
source_sha: d2329a22c5596f9a

## What changed

Added `logoDecorative` (boolean, default `false`), block-level (covers all device-tier
logo images — the same photo at different sizes, one editorial choice). `edit.js` adds a
`ToggleControl` next to the existing alt-text control, with cautionary help text: a site
logo is usually a homepage link and needs an accessible name, so the toggle should only be
used for a genuinely decorative variant. Investigated whether this block strips the
homepage link's accessible name when decorative is on — it does not: this block's own
`render.php` sets the `<a rel="home">` wrapper's `aria-label` independently of the `<img
alt>` (FR-36-22 design — image alt describes WHAT, link aria-label describes WHERE), so
marking the logo image decorative here does not silence the link's own accessible name.

## Assertion

An unset instance renders byte-identical (`logoDecorative` defaults false). Toggling it
blanks the `<img>` alt + adds `aria-hidden`, across whichever device-tier image is actually
rendered, without touching the link-wrapping or device-tier-switcher logic.

## Live capture — sandybrown canary, REST-created probe instance

Probe: one `sgs/responsive-logo` instance, `logoDecorative: true`.

| Measure | Result |
|---|---|
| Rendered `<img>` alt | authored text absent ✅ |
| `aria-hidden` present | ✅ |

## Risk

No markup change for existing content — `logoDecorative` defaults false. Homepage link and
device-tier switcher logic untouched.
