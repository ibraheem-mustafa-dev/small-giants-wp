# Visual-diff — sgs/container WS-4 helper refactor (C2 byte-identical gate) — 2026-06-03

**Block:** sgs/container · **Change:** wrapper-assembly extracted into shared `SGS_Container_Wrapper::render()`; `sgs/container/render.php` refactored 723→37 lines to delegate to it. Sanitisers `sgs_sanitize_grid_template()` + `sgs_container_gap_value()` moved to `includes/render-helpers.php`.
**Gate:** C2 — the refactor MUST be byte-identical (canary uses sgs/container; any drift shifts pixels).

## Result — PASS (byte-identical, full-page)

Method: curl the canary page (`/rc-fix-verification-mamas-munches/`) BEFORE the refactor (committed A3/A4 container) and AFTER (helper-delegating container), deploy + OPcache reset between. `diff` of the two full HTML responses.

| Metric | Before | After | Verdict |
|---|---|---|---|
| Page bytes | 173,974 | 173,974 | identical |
| `wp-block-sgs-container` instances | 21 | 21 | identical |
| `sgs-container__inner` instances | 4 | 4 | identical |
| `diff before after` | — | **0 lines** | **byte-identical** |

The shared helper reproduces the container wrapper exactly (classes, inline styles, bg/overlay/svg/shape-divider layers, responsive `<style id=uid>`, `__inner` guard, final element). C2 satisfied — composites may now safely adopt the helper. WPCS clean; `php -l` clean on helper + render-helpers + render.php.
