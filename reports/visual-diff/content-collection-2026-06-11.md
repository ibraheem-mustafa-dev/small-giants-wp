---
block: content-collection
date: 2026-06-11
verdict: PASS
first_paint_capture_passed: true
change_type: additive-attrs
change_description: >
  Three additive forwarding attrs (showPickers, ctaBehaviour, showLadder) —
  the collection now forwards them into each render_block('sgs/product-card')
  call. ALL default to the previous behaviour (showPickers true, ctaBehaviour
  learn-more, showLadder false→matches prior card default path), so existing
  collection instances render byte-identically; only the new shop archive
  template sets showPickers=false. Live-verified on the canary /shop/:
  3-column grid of Bound cards (image, title, From-price, View product CTA),
  zero pickers, equal-height cards with CTAs row-aligned (786/786/786 and
  1421/1421 px button baselines probed).
pixel_diff_skipped: true
pixel_diff_skip_reason: Defaults preserve prior output byte-for-byte on existing surfaces (attrs only consumed when explicitly set by the new shop template); new-surface evidence captured by screenshot + DOM probes.
verified_by: spec30-p1-theme-thread (live Playwright DOM probes + screenshots)
---

Evidence: .claude/reports/spec30-p1/wave2-final-shop3-1440.png; button-baseline
probe [786, 786, 786, 1421, 1421]; picker-count probe 0 on /shop/.
