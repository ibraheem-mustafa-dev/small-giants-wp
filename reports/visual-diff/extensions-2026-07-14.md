---
report: device-visibility extension — breakpoints aligned to canonical 767/1023 + leading-<style> bug fix
date: 2026-07-14
session: D331 (FR-S9-8 — per-device content adaptation)
target: https://sandybrown-nightingale-600381.hostingersite.com/
blocks_changed: [extensions]
verdict: PASS
first_paint_capture_passed: true
---

# device-visibility extension (FR-S9-8)

The universal per-tier show/hide extension (`includes/device-visibility.php`,
`src/blocks/extensions/responsive-visibility.js`, `DeviceVisibilityPanel.js`) was
aligned to the canonical `SGS_Breakpoints` source and hardened.

## Changes

- **Breakpoints routed through the one canonical source (R-31-1).** Removed the
  hardcoded 599/600/1023/1024 media queries from `extensions.css`; the three
  `sgs-hide-*` rules are now GENERATED from `SGS_Breakpoints::MOBILE_MAX` (767) /
  `TABLET_MAX` (1023) and injected as inline CSS on the extensions handles.
  Editor help text updated (`responsive-visibility.js` + `DeviceVisibilityPanel.js`):
  "Below 768px" / "768px to 1023px" / "1024px and above".
- **Universal leading-`<style>` bug fixed.** The `render_block` filter's
  `next_tag()` grabbed the first tag — for any no-inline block (which prepends a
  scoped `<style>`) that was the `<style>`, which the D311 CSS collector then
  lifts to `<head>`, so the hide class silently vanished. The filter now skips
  leading `<style>`/`<script>` and targets the first visible wrapper.

## Live verification (sandybrown)

| Check | Evidence | Verdict |
|---|---|---|
| Generated CSS loaded | `@media (max-width:767px){.sgs-hide-mobile{display:none}}` + `@media (min-width:768px) and (max-width:1023px){.sgs-hide-tablet…}` + `@media (min-width:1024px){.sgs-hide-desktop…}` present | PASS |
| Canonical bounds (not 600) | mobile ≤767, tablet 768–1023 — aligned to `SGS_Breakpoints` | PASS |
| Hide class lands on wrapper | header business-info wrappers now carry `sgs-hide-mobile`/`sgs-hide-tablet`/`sgs-hide-desktop` (3/3/1 live) and hide/show at the correct tiers — was silently broken by the leading-`<style>` bug before the fix | PASS |
| Server probe (root cause) | HTTP probe confirmed the direct filter call added the class in isolation but the real render didn't, because the block emits a leading `<style>` first — proven, not inferred | PASS |
| No console errors | 0 | PASS |

first_paint_capture_passed: true — visibility applies on first paint at every
tier (the hide/show is CSS-driven, no JS flash).
