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

> **SCOPE CAVEAT (2026-07-19, Task-2 grading F2).** Brand-strip proves the **element-first PANEL
> ARRANGEMENT** (Tile / Logo / Caption / Spacing sections in the Styles tab) — copy that. It does NOT yet
> prove the **cluster composition** the Task-2 lint enforces: it still uses `tileShadow` as a
> None/Small/Medium SELECT (edit.js:477, NOT `ShadowControl`) and a raw `TextControl` for the logo link
> (edit.js:583, NOT `SgsLinkControl`) — even though both shared components now EXIST (commit `87a0e4de`).
> So do NOT treat brand-strip's shadow/link handling as the bar; upgrade it (rollout step 2) so the
> exemplar genuinely embodies every cluster. Findings 1–3 below are now RESOLVED at the COMPONENT level.

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

1. **`DesignTokenPicker` `enableAlpha`** — RESOLVED (2026-07-19): the component now defaults
   `enableAlpha: true`. No per-block patch needed; brand-strip inherits it. (Was Wave 1 item 1.)
2. **`SgsLinkControl`** — RESOLVED at component level (2026-07-19): `src/components/SgsLinkControl.js`
   now exists (wraps core `LinkControl`, 122 lines). BUT brand-strip's logo link still uses the raw
   `TextControl type="url"` + separate new-tab `ToggleControl` (edit.js:583) — NOT yet migrated. Upgrade
   brand-strip (and use `SgsLinkControl` on sgs/media) — the wrapper is built.
3. **`ShadowControl`** — RESOLVED at component level (2026-07-19): `src/components/ShadowControl.js`
   now exists (full X/Y/blur/spread/colour+alpha builder, 179 lines). BUT brand-strip still uses
   `tileShadow` as a None/Small/Medium SELECT (edit.js:477) — NOT yet migrated. Upgrade brand-strip;
   use `ShadowControl` on sgs/media.
4. **The "Tile" Styles panel is dense (~9 controls) with no `ToolsPanel`.** Not wrong, just
   not using progressive disclosure — a real Spec 35 item-3 gap, deferred as non-trivial
   (needs isShownByDefault + resetAll decisions, a genuine UX call, not a mechanical fix).
5. **Bulk-logo add is one-at-a-time**, not the `MediaGalleryPicker` bulk driver named in Part I —
   acceptable for now (it IS an array-shaped repeater, which the DONE checklist item 10
   explicitly allows), but the Wave-2 upgrade path for sgs/media is the gallery picker, not
   this per-item button pattern.

None of these are brand-strip-specific bugs. **Findings 1–3 are now BUILT** (2026-07-19:
`enableAlpha`, `SgsLinkControl`, `ShadowControl`) — the remaining work is migrating brand-strip's
edit.js to USE them (rollout step 2). **Findings 4–5 remain open** (per-element `ToolsPanel`;
bulk-logo `MediaGalleryPicker`, Wave 2). Do not hand-roll a fix inside a single block.
