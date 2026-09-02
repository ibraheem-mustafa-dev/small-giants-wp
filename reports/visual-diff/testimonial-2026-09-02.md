# Visual diff — sgs/testimonial — 2026-09-02

verdict: PASS
intent_capture_passed: true
source_sha: 26f2ea1d0653d629

## What changed

Added three separate decorative toggles, one per image-bearing element, each gated to the
variant it belongs to (this is a 7-variant block): `avatarDecorative` (avatar-spotlight),
`orgLogoDecorative` (corporate-logo), `workMediaDecorative` (case-study-media, covers both
image and video work media). A single shared attribute was deliberately rejected — a
person's photo, a company logo, and a case-study image have different accessibility
defaults (avatar/logo usually informative, work media more plausibly decorative), so each
gets its own control and its own render.php gate. Controls sit near each element's existing
alt-text field; the earlier-session "Rating" ToolsPanel (a separate task) was not touched.

## Assertion

An unset instance renders byte-identical (all three default false). Each toggle only
affects its own element's alt/aria-hidden — the block's 7-variant gating means only one of
the three is ever relevant to a given instance anyway.

## Live capture — sandybrown canary, REST-created probe instance

Probe: one `sgs/testimonial` instance, `variant: avatar-spotlight`, `avatarDecorative:
true`.

| Measure | Result |
|---|---|
| Rendered avatar alt | authored text absent ✅ |
| `aria-hidden` present | ✅ |

## Risk

No markup change for existing content — all three attributes default false. Variant-picker
logic and the separately-built "Rating" ToolsPanel untouched (confirmed by scoped diff
review).
