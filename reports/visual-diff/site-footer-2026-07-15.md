# site-footer — visual diff / live verification (2026-07-15)

verdict: PASS
first_paint_capture_passed: true

**Scope: `render.php` uid ONLY** (Step 1 of the next-session-prompt). This report does NOT
cover the uncommitted `site-footer/edit.js` TEMPLATE work from D338 (object-shape
`gridTemplateColumns`/`gap`, core→sgs block swap, bottom-row border/padding) — that is a
separate change needing its own fresh-insert editor verification and its own report. It is
deliberately left unstaged.

Target: sandybrown canary (Mama's Munches). Full cache clear before measuring (LiteSpeed
purge + `rm -rf litespeed/cache/*` + OPcache reset + Hostinger CDN `hosting_clearWebsiteCacheV1`).
Live DOM via Playwright.

## Change

`$uid = wp_unique_id( 'sgs-sf-' )` → `'sgs-sf-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 )`,
mirroring `SGS_Container_Wrapper`'s own derivation and the `sgs/site-header-row` /
`sgs/site-footer-row` siblings. `wp_unique_id()` is a **per-request counter**, so the same
footer emitted a different uid on every page → its scoped `<style>` could never be deduped
across pages by the CSS collector.

**Checked before copying the sibling line** (the sibling pattern is not universally safe —
see the adaptive-nav report): this block's uid feeds CSS scoping + the `<style id>` + the
wrapper's DOM id and **nothing else — no `aria-controls` plumbing depends on it**, and a page
carries one footer. So the deterministic hash carries no ARIA-collision risk here. That is
NOT true of `sgs/adaptive-nav`, which is why it took a different (md5 + block-context) fix.

## Live measurements

| check | result |
|---|---|
| footer renders | yes, height **813px**, visible |
| uid | `sgs-sf-990372de` — deterministic 8-hex hash |
| uid is old per-request counter (`sgs-sf-1`) | **no** |
| **uid STABLE across two separate page loads** | **yes** — `sgs-sf-990372de` both times (this is the whole benefit; measured, not assumed) |
| wrapper DOM id | `sgs-sf-990372de` (matches the class — D303 id+class pattern intact) |
| scoped CSS still applies | yes — footer background computes `rgb(58,46,38)`, the client's `footer-bg` token |
| `contentinfo` landmark | present (from the FSE template part, unchanged) |

`<style id="{uid}-style">` is **not** in the DOM — expected, not a defect: `sgs_css_output_mode`
is `file` (D311), so every `sgs/*` block's scoped `<style>` is lifted out and served as an
external stylesheet. The CSS demonstrably still applies (background token resolves), which is
the check that matters.

## First-paint (M1)

Static: `animation-fill-mode:both` = 0, non-zero `animation-delay` = 0, `animation:` shorthand
= 0 in `site-footer/style.css` — the M1 fill-mode-invisibility class cannot arise. The footer
is static content with no entry animation; it is painted at full opacity on first paint.
Pre-commit CSS pattern audit: clean.

## Risk note

A content-addressed uid means two `sgs/site-footer` blocks with **byte-identical attributes**
on one page would share a uid and therefore a DOM id. Accepted: a page has one footer, the
value is CSS-scoping rather than ARIA, and the sibling rows have shipped this exact pattern
since D324/D325. If a second footer instance ever becomes real, mix `anchor` into the hash as
`sgs/adaptive-nav` now does.
