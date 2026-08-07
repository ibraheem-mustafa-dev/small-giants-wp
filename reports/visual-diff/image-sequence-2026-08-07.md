---
block: sgs/image-sequence
date: 2026-08-07
source_sha: 3b5d1c7df526cc42
change: art-direction tiers on the fail-open thumbnail (thumbnailTablet / thumbnailMobile)
surface: https://sandybrown-nightingale-600381.hostingersite.com/art-direction-tier-probe/ (page 2178)
method: live DOM capture on the deployed canary at FIRST PAINT - viewport set, then a fresh navigation per width (no resize-after-load), computed visibility
verdict: PASS
first_paint_capture_passed: true
---

# sgs/image-sequence — visual diff, 2026-08-07

## What changed

`thumbnailTablet` / `thumbnailMobile`, OBJECT-typed to match `thumbnail` itself (a flat
string on an object-typed attr is silently coerced to the default by WP, dropping the
whole value). Rendered as sibling `<img>`s with `sgs-image-sequence__thumbnail--{tier}`
modifiers, toggled from the block's scoped `<style>`.

Scope note: this tiers the FAIL-OPEN thumbnail only — the frame that a no-JS or
reduced-motion visitor actually sees. The canvas sequence already art-directs itself
through its own per-tier frame pipelines.

## A sequencing bug this change had, and how it was caught

The tier CSS was first appended to `$scoped_css` next to the `<img>` echo — which runs
AFTER the `printf()` that prints `$style_tag`. It compiled cleanly and emitted nothing.
The rules are assembled into `$style_tag` exactly once, so the append had to move above
that assembly. Caught by reading the emit order, before deploy.

## Measured — computed visibility, not markup presence

Width is `window.innerWidth` measured in the page, not the requested viewport size.

| measured innerWidth | nodes in DOM | visible | which tier |
|---|---|---|---|
| 1364 | 3 | 1 | `--desktop` |
| 818 | 3 | 1 | `--tablet` |
| 364 | 3 | 1 | `--mobile` |

Each tier resolved to a different image file (`currentSrc`).

## Limits of this capture

- This block is `inserter: false` (agency-only), so the client-facing argument for tiers
  is weaker here than on the other four. It is included for mechanism consistency: the
  cloning pipeline writes these attrs, and one convention on both ends is what makes a
  clone round-trip.
- The canvas scrub path was not exercised; this change does not touch it.
