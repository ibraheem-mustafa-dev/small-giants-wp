# Visual diff — sgs/responsive-logo — 2026-09-14

verdict: PASS
intent_capture_passed: true
source_sha: abc09022f761605e

## What changed

Decision 1 (SGS nav-drawer/logo colour work): `sgs/responsive-logo` had no background-colour
attribute at all — only border attrs. Added `backgroundColour`/`backgroundColourGradient`/
`backgroundColourHover`/`backgroundColourHoverGradient` on the block's wrapper element,
mirroring `sgs/brand-strip`'s root background pair exactly (`sgs_background_paint_decl()`
gradient-wins-flat, `sgs_hover_state_rules()` on `:focus-within`, `SgsColourPanel`-driven
editor control). Also declared `supports.color` (all false + `__experimentalSkipSerialization`,
matching brand-strip) and wired `SgsBorderControl`'s `contrastAgainst` prop via
`wire-border-contrast.js --fix --apply`.

## Why before/after doesn't apply

A new isolated capability with an empty-string default — an unset block renders byte-identical
to before this change. The only meaningful question is "does the new control actually paint the
background when set?", which before/after diffing against the (unchanged) default state cannot
answer.

## Assertions (stated before measuring)

1. Setting `backgroundColour` on an `sgs/responsive-logo` instance nested inside `sgs/nav-drawer`
   emits a scoped `background-color` rule and paints the rendered `<div class="sgs-responsive-logo">`.
2. A second, standalone `sgs/responsive-logo` instance elsewhere on the same page (the site
   header's own logo, no `backgroundColour` set) is unaffected — still transparent, correct
   width, no console errors.

## Live result — canary, computed styles

Live source discovered mid-verification: the canary's rendered header does NOT come from the
`wp_template_part` post (id 2671) — it comes from `Sgs_Header_Rules`/`Sgs_Active_Layout`
resolving the framework's own registered pattern `sgs/framework-header-default`
(`theme/sgs-theme/patterns/framework-header-default.php`), which contains both a standalone
header logo and a drawer-nested logo. Verified via a `render_block_data` backtrace trap
(temporary mu-plugin, removed after) that the DB template-part edit I made first never reached
render — confirming the true live source before drawing any conclusion (per
`prove-the-cause-before-fix`), rather than reporting a false negative against the wrong file.

Tested by temporarily adding `"backgroundColour":"#ff00aa"` to the drawer instance
(`theme/sgs-theme/patterns/framework-header-default.php:44`) directly on the canary, purging
OPcache + LiteSpeed + the lifted `sgs-css` file, then reverting byte-for-byte afterwards
(confirmed via `diff` against the committed local file — exit 0, no residual change).

| Measure | Result |
|---|---|
| Drawer logo (`.sgs-rl-7433a809`) `getComputedStyle().backgroundColor` | **`rgb(255, 0, 170)`** ✅ (= `#ff00aa`) |
| Drawer logo `getComputedStyle().backgroundImage` | `none` (no gradient set) ✅ |
| Drawer logo `--logo-width` custom property | `140px` ✅ — unrelated existing capability unaffected |
| Lifted CSS file (`uploads/sgs-css/sgs-*.css`) | contains `.sgs-rl-7433a809.wp-block-sgs-responsive-logo{background-color:#ff00aa;}` scoped rule ✅ |
| Standalone header logo (`.sgs-rl-d52a1783`, no `backgroundColour` set) `backgroundColor` | `rgba(0, 0, 0, 0)` — unaffected ✅ |
| Standalone header logo `--logo-width` | `180px` — unaffected ✅ |
| Browser console errors on load | 0 ✅ |

## Risk

No markup change to the default (unset) case — the new attrs default to `""`, and
`sgs_background_paint_decl()` returns `''` for an empty colour+gradient pair, so `$scoped_css`
gains no new rule and the rendered `<div>` is byte-identical to before this change. The only new
output is a single `background-color` (or `background-image` for a gradient) declaration in the
block's existing scoped `<style>`, emitted only when an operator sets a value.

## Gates

`npm run build` (96 gates) — 0 failures after fixing `audit-block-uniformity`
(`supports_color_missing`, resolved by declaring `supports.color` all-false +
`__experimentalSkipSerialization`, mirroring brand-strip) and `wire-border-contrast`
(resolved via the codemod's own `--fix --apply`). WPCS 0 errors (5 pre-existing alignment
warnings auto-fixed via `phpcbf`).
