---
doc_type: reference
title: Spec 35 exemplar note — sgs/brand-strip inspector (the bar for sgs/media)
status: ACTIVE
created: 2026-07-19
governs: what "good" looks like for the sgs/media pilot inspector rebuild
source: plugins/sgs-blocks/src/blocks/brand-strip/* (QC'd 2026-07-19)
sibling: .claude/plans/spec-35-inspector-DONE-checklist.md (the rubric this passes against)
---

# Why brand-strip is the reference

It is the only block on this branch already rebuilt against Spec 35. Read its files, don't
re-derive the pattern from the spec prose — copy these choices verbatim into `sgs/media`.

## Shared components it proves out (use the SAME ones on sgs/media)

- **`ServerSideRender`** (edit.js) instead of a hand-built JS preview. The canvas renders
  through `render.php` so it can never drift from the frontend — this is the single biggest
  reason brand-strip's editor looks right. Trade-off: view.js animation doesn't run in the
  static SSR preview (accepted, documented in-code).
- **`ResponsiveControl`** (columns) — wraps a render-prop child, reads/drives WP's native
  `core/editor` `getDeviceType()` so the switcher moves the REAL canvas, not a private toggle.
- **`ResponsiveBoxControl`** / **`ResponsiveBorderRadiusControl`** — base/tablet/mobile box
  values in one control, feeding the locked 768/1024 device tiers.
- **`StateToggleControl`** — ONE `ToggleGroupControl` (Normal/Hover) gates a whole colour
  block, with a persistent swatch legend so a hover colour is never invisible while editing
  Normal. This is the canonical hover-state pattern — do not build a second "Hover" panel.
- **`TypographyControls`** (prefix `"name"`) for the caption — never hand-roll a font-size
  RangeControl.
- **`DesignTokenPicker`** for every colour. **Known gap, do not copy blind:** it has no
  `enableAlpha` — see Findings below.
- **`MediaPicker`** — already wraps `MediaUploadCheck` correctly. Copy this wrapping pattern
  on sgs/media exactly (`<MediaUploadCheck><MediaUpload .../></MediaUploadCheck>`).

## Panel grouping (copy this shape)

- `<InspectorControls>` (default group = Settings tab): Logos (repeater) → Layout (columns +
  max-height) → Marquee (behaviour, progressively disclosed via plain `{ scrolling && <>…</> }`
  conditionals rather than `ToolsPanel` — acceptable at this control count, see Findings for
  where it stops being acceptable).
- `<InspectorControls group="styles">`: Tile → Logo image → Caption → Strip spacing
  (responsive). **Element-first**, not property-type-first — a client thinks "the tile" and
  "the caption", not "colour panel" and "spacing panel". Do this on sgs/media too (group by
  Image / Caption / Layout, not by CSS property).
- `anchor: true` in `supports` is enough to get the native Advanced tab (CSS class/anchor) —
  no bespoke code needed.
- `supports.sgs.hideExtensions: ["hover","blockLink","clickEffects","parallax","spacing"]` —
  brand-strip has its OWN hover system and its OWN responsive-spacing panel, so it hides the
  universal extensions that would otherwise duplicate them. On sgs/media, hide whichever
  universal panels the block's bespoke controls already cover.

## Render-side pattern worth copying verbatim

- **Zero inline style output.** Every WP-native support (`color`/`spacing`/`__experimentalBorder`)
  declares `__experimentalSkipSerialization: true`; render.php emits everything into ONE
  `.{uid}` scoped `<style>` tag via `wp_style_engine_get_styles()`. `--custom-property` VALUES
  (not property declarations) stay as a scoped `.{uid}{--var:…}` rule, never an inline
  `style="--var:…"` attribute.
- **Name custom properties to dodge WP's substring-selector trap**: `--sgs-tile-border-thickness`,
  not `--sgs-tile-border-width` — WP core's `[style*="border-width"]{border-style:solid}`
  selector fires on the SUBSTRING, not the CSS property, and paints a phantom border. Same
  British-spelling escape for `-colour` vs `-color`.
- **Accessible-name discipline on the logo tile**: when a caption is shown, the logo `<img>`
  `alt` is forced to `""` (decorative) and the caption `<span id>` is wired via
  `aria-labelledby` on the wrapping `<a>` — the name is announced once, not twice. Copy this
  exact caption/decorative-image pairing on any media block that can show both an image and a
  text label for the same thing.
- **`container-type: inline-size`** on the root for shrink-to-fit (T2) — container-query-driven
  column sizing, not a viewport breakpoint, so it degrades gracefully inside a narrow sidebar
  column.

## Findings (do NOT copy these — they are the gaps, not the bar)

1. **`DesignTokenPicker` has no `enableAlpha`.** Every colour control on brand-strip inherits
   this gap because it's a shared component. Fix belongs at the component (Wave 1 item 1,
   Spec 35 Part J), not per-block — do not patch it locally on sgs/media either; raise it as
   the Wave 1 blocker it is.
2. **No `LinkControl` anywhere in the plugin.** Brand-strip's logo link uses a raw
   `TextControl type="url"` + a separate `ToggleControl` for new-tab. Spec 35 Wave 1 item 2
   (`SgsLinkControl`) hasn't been built yet — sgs/media's own link field (if it has one) will
   have the same gap until that shared wrapper exists.
3. **`tileShadow` is a `None/Small/Medium` select** — the exact Part-F anti-pattern
   ("incomplete option sets"). The fix is the Wave 1 `ShadowControl` (Part I) — not built yet.
4. **The "Tile" Styles panel is dense (~9 controls) with no `ToolsPanel`.** Not wrong, just
   not using progressive disclosure — a real Spec 35 item-3 gap, deferred as non-trivial
   (needs isShownByDefault + resetAll decisions, a genuine UX call, not a mechanical fix).
5. **Bulk-logo add is one-at-a-time**, not the `MediaGalleryPicker` bulk driver named in Part I —
   acceptable for now (it IS an array-shaped repeater, which the DONE checklist item 10
   explicitly allows), but the Wave-2 upgrade path for sgs/media is the gallery picker, not
   this per-item button pattern.

None of these five are brand-strip-specific bugs — they are framework-level components not yet
built. Do not re-derive or hand-roll a fix for any of them inside a single block; they're
listed here so the sgs/media dispatch doesn't quietly inherit them without knowing why.
