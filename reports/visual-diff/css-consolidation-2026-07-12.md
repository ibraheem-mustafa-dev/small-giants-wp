---
verdict: PASS
first_paint_capture_passed: true
change: P-STYLE-TAG-CONSOLIDATION Phase 1 — per-block <style> consolidation (Spec 32 §6.2 / FR-32-11)
surface: framework-wide render (includes/class-sgs-css-registry.php render_block chokepoint)
page: sandybrown page 8 (Mama's Munches homepage)
date: 2026-07-12
capture: reports/visual-diff/css-consolidation-phase1-2026-07-12.jpeg (full-page 1440)
---

# Visual-diff — CSS consolidation Phase 1 (inline footer collector)

Framework-wide render change (not a single block): a `render_block` chokepoint lifts every
`sgs/*` block's per-instance scoped `<style>` into ONE consolidated tag on the front end;
the editor keeps inline emission. No CSS generation changed — only the emit destination.

## Headline metric (live, page 8)
- **Body SGS `<style>` tags: ~83 → 1** (`#sgs-blocks-collected`, 27.7KB, 344 rules). The only
  other body `<style>` is WP-core `wp-interactivity-router-animations-inline-css` (out of scope).
- CSS is SMALLER than the 33KB baseline (27.7KB) because identical instances dedupe by content hash.
- Head tags unchanged (38 global/theme/WP-core — out of scope).

## No visual regression — live computed styles (1440)
| Element | Value | Correct? |
|---|---|---|
| hero H1 | 58px, rgb(58,46,38), Fraunces serif | ✓ draft values |
| `.sgs-button` (Shop Zookies) | bg rgb(230,138,149), colour rgb(58,46,38), pad 14px, radius 10px | ✓ |
| product-card | radius 16px, white bg | ✓ |
| container | maxWidth none, padTop 56px | ✓ |
| 4 bare eyebrow labels | padding 0, transparent, block | ✓ (D311 bare) |
| 2 gift capsules (Gift idea / Most thoughtful) | pad 4/10px, bg rgb(245,194,200), radius 6, inline-block | ✓ (D311 capsule) |
| trial tag (New? Start here) | width full (236px, block), bg rgb(245,208,80) | ✓ (D311 full-width mirror) |

**D303 residual precedence preserved** — the D311 per-instance label/tag CSS (which distinguishes
bare eyebrows from padded capsules) lands correctly, proving insertion-order (block rule then residual)
is intact in the consolidated buffer.

## Responsive tiers apply (375)
- hero H1 58px → **34px** at 375 — the `@media` tiers (formerly in per-block tags) apply from the
  consolidated tag. Body SGS `<style>` still = 1.

## Editor parity (the council's #1 risk) — LIVE-VERIFIED
- Block-renderer REST route `context=edit` (sgs/heading) render → `<style>` **kept inline**
  (`.sgs-hdg-…{color:…}`), consolidated tag did **NOT** leak in. Predicate
  `!is_admin() && !wp_is_serving_rest_request()` correct on both branches (frontend consolidates,
  editor inline).

## Console
- 0 errors, 0 warnings.

## Verdict
PASS. Phase 1 (inline footer consolidation) landed with zero visual regression + editor parity intact.

## FINAL ARCHITECTURE (shipped, supersedes the footer-inline of Phase 1)

The delivery was reshaped during build + live testing (canonical: Spec 32 §6.2):
- **Collector = one `render_block` chokepoint** (lifts `<style>` from rendered HTML) — not ~60 emit-site edits.
- **Delivery = one output buffer injecting into `<head>` every render** — self-consistent under caching. The earlier generate-then-serve external-file model was **reproduced FAILING live under the LiteSpeed page cache** (froze the cold inline response); the unified buffer removes the pointer/cold-warm/freeze entirely.
- **Two operator-selectable modes** (SGS → CSS Output settings page, `sgs_css_output_mode`, default `file`):
  - `file` (default): cached content-hashed external `<link>` in head, immutable `Cache-Control`, LiteSpeed/Autoptimize/WP Rocket/Perfmatters can defer it (settings page lists the exact setting per plugin).
  - `head`: inline `<style>` in head (the draft's own model), self-contained, no plugin dependency.

**LANDED (page 8, 2026-07-12):**
- `head` mode: `<style id="sgs-blocks-collected">` in head, 0 body tags, computed values correct.
- `file` mode UNDER LiteSpeed (installed to test): `<link id="sgs-blocks-collected-css">` in head, 0 body tags, stable across loads (no freeze), immutable cache header confirmed, cascade correct (link after block CSS), computed values correct.
- Editor parity: block-renderer REST keeps `<style>` inline (both modes).
- Settings page renders (SGS → CSS Output): mode choice + optimisation-plugin guidance. Screenshot: `css-output-settings-2026-07-12.jpeg`.
