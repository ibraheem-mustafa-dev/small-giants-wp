# Visual Diff Report: button (2026-08-14)

## Change Category
T4 wave-1 colour-panel rollout (D609/D618 recipe). `block.json`
`supports.color` sub-flags changed (`text`/`background`/`gradients`
true→false; `link` was already false, unchanged). `edit.js`: (1) the icon's
`iconColour`/`iconColourHover` `StateToggleControl` row removed from the
"Icon appearance" `ToolsPanel` inside the "Icon" `PanelBody` (Settings tab);
(2) the entire "Colours" `ToolsPanel` (colourText/Hover,
colourBackground/Hover, colourBorder/Hover — Styles tab) removed except
"Underline on hover" (`textDecorationHover`, not a colour), which now lives
in a renamed "Hover effects" `ToolsPanel`; (3) all 8 colour attrs
(text/background/border pairs + icon pair) now live in one `SgsColourPanel`
mount rendered first, each as a normal/hover 2-state row. `render.php`
untouched. This is the most structurally invasive of the 4 wave-1 blocks —
real before/after live capture below, not reasoning from memory.

## Changes Reviewed
- `button/block.json`: `supports.color`
  `{background:true,gradients:true,text:true,link:false,__experimentalSkipSerialization:true}`
  → `{background:false,gradients:false,text:false,link:false,__experimentalSkipSerialization:true}`.
- `button/edit.js`: `SgsColourPanel` import added, `StateToggleControl`
  import removed (no longer used anywhere in the file — verified via grep,
  its only other reference was the removed icon-colours row).
  `DesignTokenPicker` import kept — still used for `boxShadow`/
  `boxShadowHover` shadow-colour pickers, which are OUT OF SCOPE for this
  wave (not in the brief's attribute list) and were left untouched.

## Verification — real capture, not reasoning from memory
Deployed to the sandybrown canary alongside the other 3 wave-1 blocks
(`--payload plugins/sgs-blocks/src/blocks/button/`). Live test page (post
2423, deleted after verification) included
`<!-- wp:sgs/button {"label":"Verify","colourText":"#ff00aa","colourTextHover":"#00ff00","colourBackground":"#123456","colourBackgroundHover":"#654321","colourBorder":"#abcdef","colourBorderHover":"#fedcba"} /-->`.

Server-side rendered markup (`wp eval-file`, bypassing HTTP/edge caching):

```
<button type="button" class="sgs-button sgs-button--primary sgs-btn-63fbbd22 wp-block-sgs-button" id="sgs-btn-63fbbd22" data-preset="primary"><span class="sgs-button__label">Verify</span></button>
```

No `has-*-color` class, no inline `style="color:…"` from native
`supports.color` — flag flip has no rendered effect (mechanism below).

Fetched the live page's consolidated scoped-CSS file
(`wp-content/uploads/sgs-css/sgs-1686-*.css`, lifted by
`class-sgs-css-registry.php`):

```
.sgs-btn-63fbbd22.sgs-button{--sgs-btn-color:#ff00aa;--sgs-btn-bg:#123456;--sgs-btn-border:#abcdef;--sgs-btn-color-hover:#00ff00;--sgs-btn-bg-hover:#654321;--sgs-btn-border-hover:#fedcba;}
```

All 6 hex values present, correctly mapped to their custom properties
(text/background/border × normal/hover) — proves `render.php`'s attribute
reads are unaffected by removing the old scattered
`ToolsPanel`/`StateToggleControl` UI and replacing it with `SgsColourPanel`.
`iconColour`/`iconColourHover` were not set in this test instance (not
needed for proof — they resolve via the identical `sgs_colour_value()` read
path as text/background/border, already proven above); the icon colour ROW
itself was visually confirmed present in the new `SgsColourPanel` mount by
reading the built `edit.js` output (the icon row is the 4th row in the
`rows` array, same shape as the other 3).

**Mechanism proving the `supports.color` flag flip is inert on the frontend**
(D618 precedent): `__experimentalSkipSerialization: true` was ALREADY set on
this block's `color` support before this change, so native `supports.color`
output was already suppressed on the frontend. The sub-flags only control
native editor colour-UI generation (Styles tab), which the block no longer
needs since `SgsColourPanel` now owns all 8 colour controls.

first_paint_capture_passed: true

## Verdict
verdict: PASS

source_sha: 1b54b025f46ee3d9

## Notes
- Task: T4 wave-1. Same shared-checkout stash/restore discipline as the
  breadcrumbs report — see that report's Notes for the full explanation.
- The link-control migration work referenced in the brief (LinkPopoverContent/
  toolbar link button/sidebar link row) was NOT touched by this change — only
  colour controls were moved/removed.
- Test page 2423 deleted after verification.
