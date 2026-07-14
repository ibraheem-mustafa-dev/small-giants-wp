---
verdict: PASS
first_paint_capture_passed: true
blocks: [sgs/site-header, sgs/site-header-row, sgs/site-footer-row]
change: uid determinism — wp_unique_id() → md5(wp_json_encode($attributes)) for the block-private scoped-<style> uid
date: 2026-07-14
decision: D334 (pending)
site: sandybrown (Mama's Munches), plugin 0.1.8
---

# Visual-diff report — uid determinism (Task 1)

## What changed
Three blocks (`sgs/site-header` render.php:35, `sgs/site-header-row` :45, `sgs/site-footer-row` :47)
derived their per-instance scoped-`<style>` uid from `wp_unique_id('sgs-xx-')` — a WP-core
per-request incrementing counter. Replaced with the content-addressed
`'sgs-xx-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 )`, matching the shared
`SGS_Container_Wrapper`'s own uid derivation. No CSS rule, structure, or attribute changed —
only the string VALUE of the uid (which is both the element id and a CSS class).

## Root cause (proven live, pre-fix)
The footer-row uid SHIFTED across pages: `sgs-sfr-12/13` (home + shop), `sgs-sfr-6/7` (most
pages), `sgs-sfr-7/8` (configurator) — because `wp_unique_id`'s value = the block's ordinal
among all `wp_unique_id` calls in the request, which varies with page content rendered before
the footer. Same footer markup → different scoped-CSS selector per page → the D311 CSS
collector (dedup by content hash) could not dedup it → cross-page CSS cache fragmentation +
falsified FR-S9-6's "re-save = same uid" golden. (Header was coincidentally stable — it
renders before variable content — but the same fragility.)

## Live verification (post-fix, full cache clear: OPcache reset + LiteSpeed purge)

### uid determinism — IDENTICAL across 6 pages (was shifting)
| Page | header | header-rows | footer-rows |
|------|--------|-------------|-------------|
| / | sgs-sh-e96d2dd4 | shr-324652a4 / 5037d78a / cb1c8c5f | sfr-0cc29e7d / b62f3b38 |
| /shop/ | sgs-sh-e96d2dd4 | (same) | (same) |
| /sgs-box-object-test/ | sgs-sh-e96d2dd4 | (same) | (same) |
| /sgs-configurator-test-540/ | sgs-sh-e96d2dd4 | (same) | (same) |
| /cart/ | sgs-sh-e96d2dd4 | (same) | (same) |
| /my-account/ | sgs-sh-e96d2dd4 | (same) | (same) |

All uids now content-addressed md5 hashes, identical on every page; all distinct within a page
(3 header rows + 2 footer rows, no collision — `rowSlot` disambiguates).

### Scoped CSS still lands
- Header background `rgb(251, 243, 220)` renders via the `.{uid}.sgs-site-header` scoped rule
  (computed style, both breakpoints) — confirms the new-uid scoped CSS applies.
- uid applied as BOTH element `id` AND class (D303): `hdrRow.id === "sgs-shr-cb1c8c5f"` → true.
- The footer-row uid appears twice in page source (class on element + CSS rule).

### No overflow / no console regression
| Breakpoint | scrollWidth ≤ innerWidth | header/footer render | console |
|------------|--------------------------|----------------------|---------|
| 1440 | 1425 ≤ 1440 — OK | yes, bg correct | 1 error (pre-existing favicon.ico 404) |
| 375 | 360 ≤ 375 — OK | yes, bg correct | (same pre-existing) |

Screenshots: `uid-fix-mamas-1440-2026-07-14.png`, `uid-fix-mamas-375-2026-07-14.png` (viewport).

## Verdict: PASS
Zero visual regression (pure id-string swap; scoped CSS unchanged in effect). uid now
deterministic + content-addressed on every page; the CSS collector can dedup across pages;
FR-S9-6's re-save-same-uid golden holds by construction. qc-council-gated (structural pre-gate:
no collision, byte-stable, mirrors the proven wrapper pattern).
