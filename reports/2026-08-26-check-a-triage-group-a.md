# CHECK A triage — Group A (7 blocks, 80 findings)

Source: `reports/2026-08-26-check-a-findings.json` → `editorCanvasDesync.netNew`, filtered to
`sgs/button`, `sgs/card-grid`, `sgs/container`, `sgs/cta-section`, `sgs/gallery`, `sgs/hero`,
`sgs/info-box`. Enumerated count: **80** (the brief's "81" prose figure disagrees with the JSON;
the JSON is authoritative per instructions — `sgs/card-grid` has zero net-new findings in scope).

Per-block counts: `sgs/container` 22, `sgs/cta-section` 33, `sgs/gallery` 8, `sgs/hero` 14,
`sgs/info-box` 2, `sgs/button` 1, `sgs/card-grid` 0.

## Verdict totals

| Verdict | Count |
|---|---|
| REAL | 68 |
| ARTEFACT | 12 |
| DETECTOR BUG | 0 |

No detector bugs found in this batch — every flagged attribute was independently confirmed absent
from the block's own editor-preview `style` object (or its shared control panel's live-preview
logic) by reading the actual `edit.js`, and confirmed present in the frontend `render.php`/shared
PHP wrapper by reading that too.

---

## Root-cause groups (ranked by findings cleared)

### RC-1 — Grid-item cascade-default attributes never propagate into the editor canvas (24 findings, container + cta-section)

`GridItemDefaultsPanel` (`plugins/sgs-blocks/src/blocks/container/components/GridItemDefaultsPanel.js`)
is a **shared** control panel, imported by both `sgs/container/edit.js` and `sgs/cta-section/edit.js`
(`edit.js:27` cta-section import list). It writes 15 attributes (`gridItemBackground*`,
`gridItemBorder*`, `gridItemShadow*`, `gridItemTextColour*`) that are meant as CASCADE DEFAULTS for
whatever grid-item children the client nests inside — confirmed by the panel's own file header
comment (lines 1–11) and by `includes/class-sgs-container-wrapper.php:766-835,3088-3208`, which emits
scoped child-selector CSS from these exact attribute names on the frontend. **Neither block's
`edit.js` ever reads these attributes to build a live style** — `grep` for each name in
`container/edit.js` and `cta-section/edit.js` returns only the panel's `value=`/`onChange=` write
sites, never a read into `style`/`blockProps`.

Findings: container 9 (`gridItemBackgroundGradient`, `gridItemBackgroundHover`,
`gridItemBackgroundHoverGradient`, `gridItemBorderGradient`, `gridItemBorderGradientHover`,
`gridItemShadowColour`, `gridItemTextColourGradient`, `gridItemTextColourHover`,
`gridItemTextColourHoverGradient`) + cta-section 15 (the above 9 plus `gridItemBackground`,
`gridItemBorder`, `gridItemBorderRadius`, `gridItemPadding`, `gridItemShadow`,
`gridItemTextColour`).

**Fix:** this is the one genuinely cross-block architectural fix, not a one-file patch — the child
grid-item block (whatever it actually is, e.g. `sgs/card`) needs to receive these as WP block
`context` from the parent and apply them in its own `edit.js`, mirroring how the frontend cascades
via child CSS selectors. Narrowest version: add `providesContext` for the 15 attrs to
`container`/`cta-section` `block.json`, and a single shared hook (e.g.
`useGridItemDefaultsStyle(context)`) that the eligible child block(s) call once.
**Clears 24.** ⚠ 12 of the 24 are the `*Hover`/`*HoverGradient` siblings — see RC-6 below; they need
a second, distinct piece (a scoped `:hover` CSS rule) on top of this fix before they fully close.

### RC-2 — bgSvg decorative-layer statics never previewed anywhere (15 findings, container + cta-section + hero)

`bgSvgContent`/`bgSvgPosition`/`bgSvgOpacity`/`bgSvgMinHeight`/`bgSvgTextShadow` are written by the
shared `BackgroundPanel.js` (lines 481-547) and rendered on the frontend by ONE shared PHP class,
`includes/class-sgs-container-wrapper.php:956-974`. None of the three `edit.js` files (container,
cta-section, hero) build any preview for them — confirmed by grepping `bgSvg` in each file's own
`edit.js`/`render.php`; matches exist only in the shared `BackgroundPanel.js` control and in the
shared PHP renderer, never in a per-block editor style object.

Findings: container 5, cta-section 5, hero 5 (`bgSvgContent`, `bgSvgMinHeight`, `bgSvgOpacity`,
`bgSvgPosition`, `bgSvgTextShadow` — the two motion attrs `bgSvgAnimation`/`bgSvgAnimationSpeed` are
ARTEFACT, see below).

**Fix:** one new shared JS helper (e.g. `resolveBgSvgPreviewStyle()`, mirroring the PHP class it
copies from) called from all three `edit.js` files — since the PHP source of truth is already a
single shared class, this is a genuinely small, single-mechanism fix. **Clears 15.**

### RC-3 — Grid/flex layout statics never applied to the editor canvas (8 findings, cta-section + gallery)

`alignContent`, `alignItems`, `justifyItems`, `gridAutoRows` set the actual CSS grid/flexbox
arrangement of the block's own children. `container/edit.js` already resolves and applies the
sibling attrs `layout`/`gridTemplateColumns`/`flexDirection`/`flexWrap`/`justifyContent` into its
`style` object (not flagged — correctly recognised), but cta-section and gallery, which both import
the shared `LayoutPanel` (cta-section `edit.js:27`, gallery `edit.js:28`) that writes these 4 attrs,
never carry them into their own `blockProps.style`.

Findings: cta-section 4 (`alignContent`, `alignItems`, `gridAutoRows`, `justifyItems`) + gallery 4
(same four).

**Fix:** copy container/edit.js's existing resolution pattern for the sibling grid attrs into both
blocks' style objects. **Clears 8.**

### RC-4 — Container's own wrapper border never mirrored in its own canvas (6 findings, container only)

`borderColour`/`borderColourGradient`/`borderColourHover`/`borderColourHoverGradient` +
`borderStyle`/`borderWidth` are destructured in `container/edit.js:300-305`, and mounted right there
in a `SgsColourPanel` "Wrapper border colour" row (`edit.js:638-672`) plus a `ResponsiveBoxControl`
for width (`edit.js:843-855`) — but `edit.js`'s own `style` object (lines 338-372) never reads any of
them; `grep -n "borderColour\|borderWidth\|borderStyle" edit.js` returns only the destructure and the
control bindings. The frontend paints all six via
`includes/class-sgs-container-wrapper.php:255-262` → `sgs_border_states_css()`. This is NOT a
shared-panel gap like RC-1/2/3 — it's the same block's own `edit.js` failing to apply what it just
destructured, unlike its sibling `shadow`/`gap`/`backgroundColour` handling two lines above.

**Fix:** add a `border`/`borderColor`/`borderWidth`/`borderStyle` block to container/edit.js's
existing `style` object, mirroring the `boxShadow` line right above it. **Clears 6.**

### RC-5 — Static background-paint properties missing from composite blocks' preview (5 findings, cta-section + hero)

`backgroundAttachment`, `backgroundRepeat` (both flagged on hero and cta-section) and
`backgroundOverlayBlendMode` (cta-section only) are the exact CSS custom properties
`container/edit.js:349-351` already resolves (`--sgs-ed-bg-repeat`, `--sgs-ed-bg-attachment`) for its
OWN background-image preview — proving the mechanism exists and works. cta-section's and hero's
`wrapperStyle` builders (cta-section `edit.js:115-128`, hero `edit.js:304-320`) are hand-rolled and
never picked up this part of container's pattern.

**Fix:** copy the 4-line custom-property block from container/edit.js into cta-section's and hero's
`wrapperStyle` builders (blend-mode needs one extra line for cta-section). **Clears 5.**

### RC-6 — Gallery's responsive-tier spacing/width objects have zero editor preview (4 findings, gallery only) — ⚠ PER-TIER RESPONSIVE OBJECT CLASS

`margin`, `padding`, `maxWidth`, `contentWidth` are genuinely `{desktop, tablet, mobile}` objects —
confirmed by the FR-37-16 comment at `gallery/edit.js:385-402`: "ONE panel owning padding, margin,
max-width and content-width **across all three tiers, each on the `{desktop,tablet,mobile}` shape**".
They're written by a separate shared `ResponsiveBoxControls` component (`edit.js:31`, mounted
`edit.js:404`) which — unlike container's `WidthPanel` pairing with `resolveResponsiveTier`/
`previewTier` — has no live-style counterpart at all in gallery's `blockProps` (`edit.js:301-304`,
which only carries gallery-specific `--sgs-columns-*`/`--sgs-gap`/hover custom properties).

**Fix:** resolve the active tier with the same `previewTier`/`resolveResponsiveTier` pattern
container/edit.js already uses (lines 319-324, 340), and apply to `blockProps.style`. **Clears 4.**
⚠ Because this is a per-tier object, a partial fix that only resolves the `desktop` key would still
show as a false PASS while leaving the Tablet/Mobile device-toggle previews blank — verify all three
tiers before closing.

### RC-7 — Hero's block-private border-colour GRADIENT siblings never previewed, while the base colour is (2 findings, hero only)

Hero already fixed `backgroundColour` (see the dated code comment at `hero/edit.js:295-303`,
explicitly proving this class of bug and its fix pattern) and resolves it via
`resolveBackgroundPaintPreviewStyle()`. `borderColourGradient` (confirmed rendered by
`hero/render.php:189`, `sgs_css_gradient_value()`) and `splitMediaBorderColourGradient` (confirmed by
`render.php:234`) are the GRADIENT siblings of two border-colour pairs, and neither is resolved into
`wrapperStyle` anywhere in `edit.js`.

**Fix:** extend the existing gradient-preview helper to also cover these two, matching what
`sgs_border_gradient_css()` produces server-side. **Clears 2.** (Same fix shape as RC-9 below — one
shared helper could serve both hero and info-box.)

### RC-8 — cta-section's background video shows nothing at all, not even container's own placeholder (1 finding, cta-section only)

`container/edit.js:326,353-356` documents the DELIBERATE design decision — full video isn't
previewed inline ("too complex for editor") but a teal placeholder colour IS shown so the client
knows *something* is configured. cta-section's `bgVideo` (block.json-declared, rendered via the same
shared `SGS_Container_Wrapper`) has no equivalent — the canvas looks identical to "no video set".

**Fix:** copy container's 4-line `hasBgVideo` placeholder block into cta-section. **Clears 1.**

### RC-9 — info-box's block-private border-colour GRADIENT sibling never previewed (1 finding, info-box only)

Same shape as RC-7. `info-box/edit.js:113-119` (`buildPreviewStyle()`) previews the NATIVE
`style.border.color` (WP's `__experimentalBorder` support), but the sibling gradient attr
`borderColourGradient` (written at `edit.js:526-528` via `DesignTokenPicker`, rendered at
`render.php:86,414-416` via `sgs_border_gradient_css()`) is never read into the preview. **Clears 1.**

### RC-10 — info-box has two competing text-align mechanisms; only one shows on canvas (1 finding, info-box only)

`block.json:33` declares `supports.typography.textAlign: true`, so WP's NATIVE alignment toolbar
writes `style.typography.textAlign` and WP auto-applies it to the canvas via `useBlockProps()` — this
one is NOT flagged and works correctly. But `info-box/edit.js:642-660` ALSO mounts a custom "Text
align" `SelectControl` in the Layout panel, writing to a separate LEGACY top-level `textAlign`
attribute. `render.php:345-349` treats `style.typography.textAlign` as authoritative and
`attributes.textAlign` as fallback-only — so a client who uses the visible, labelled "Text align"
control in the Layout panel (rather than the native toolbar) sees **no canvas change at all**, even
though the value is saved and CAN take effect on the frontend if the native value is unset.

**Fix:** either point the custom control at `style.typography.textAlign` and drop the redundant flat
attr, or apply the flat attr as a fallback in the editor preview exactly as `render.php` does.
**Clears 1.**

---

## ARTEFACT — motion attrs on a static canvas (12 findings)

`bgAnimationDuration`, `bgKenBurns`, `bgParallax`, `bgSvgAnimation`, `bgSvgAnimationSpeed` — pure
motion/timing controls. Per the brief's own worked example (`bgParallax` on a static canvas), a
static editor canvas arguably should not run parallax/Ken-Burns/pulse-float-wave animations. No fix
recommended; these are candidates to REMOVE from the CHECK A ruleset entirely (or move to an explicit
"motion, no canvas preview expected" exemption list) rather than leave sitting as unactioned
advisory noise every run.

- container: `bgSvgAnimation`, `bgSvgAnimationSpeed` (2)
- cta-section: `bgAnimationDuration`, `bgKenBurns`, `bgParallax`, `bgSvgAnimation`,
  `bgSvgAnimationSpeed` (5)
- hero: `bgAnimationDuration`, `bgKenBurns`, `bgParallax`, `bgSvgAnimation`, `bgSvgAnimationSpeed` (5)

Note: container's own `bgKenBurns`/`bgAnimationDuration`/`bgParallax` are NOT in this net-new set —
container/edit.js already resolves them into CSS custom properties + a `sgs-container--parallax`
class (`edit.js:357-358,535,543`), so those three are correctly absent from the findings for
container specifically (a positive control for the detector: it does recognise this pattern when
present).

---

## Cross-cutting note — hover-state siblings need a DIFFERENT fix shape (15 findings, spans RC-1/RC-4 + button)

15 of the 68 REAL findings are `*Hover`/`*HoverGradient` siblings of a base attribute counted in
RC-1 or RC-4 above, plus one standalone case on `sgs/button`:

- `sgs/button` `textDecorationHover` (1, standalone) — base `textDecoration` IS previewed
  (`edit.js:293`), but the hover sibling isn't. Confirmed on the frontend: `render.php:415-422` emits
  a genuine scoped rule, `.{uid}.sgs-button:hover{text-decoration:underline}` — a real per-instance
  `:hover` CSS rule, not an inline style (inline `style=""` cannot express `:hover` at all).
- Within RC-4 (container's own border): `borderColourHover`, `borderColourHoverGradient` (2).
- Within RC-1 (grid-item cascade): `gridItemBackgroundHover`, `gridItemBackgroundHoverGradient`,
  `gridItemBorderGradientHover`, `gridItemTextColourHover`, `gridItemTextColourHoverGradient` ×
  container(5) + cta-section(5, plus `gridItemBackgroundHover`/`gridItemBackgroundHoverGradient`/
  `gridItemBorderGradientHover`/`gridItemTextColourHover`/`gridItemTextColourHoverGradient` again) —
  the 12 hover-family items already inside RC-1's count of 24.

**Why this is distinct:** no block in this framework's editor injects any per-instance scoped
`:hover` `<style>` rule today — confirmed by grepping `editor.css` for every block in scope (no
`:hover` selector found anywhere). Since the editor canvas is a live iframe, a scoped `:hover` rule
WOULD actually preview on real mouse-hover if it existed — this is achievable, just not built. Fixing
the base attribute (RC-1/RC-4's fix) does not close these 15 on its own; each needs a follow-up
mechanism (an injected `<style>` block keyed to the block's `clientId`/`useInstanceId`, mirroring how
`render.php` already emits `.{uid}:hover{...}` on the frontend). Recommend treating this as its own
follow-up fix, applied once, shared across all affected blocks — not 15 individual patches.

---

## Method note

Every classification above is backed by an actual `edit.js`/`render.php`/shared-class read, not
inference from the reason string (which is identical boilerplate for all 80 findings and carries no
diagnostic value on its own). Where a finding was confirmed REAL, the frontend evidence (the
`render.php` or shared-PHP-class line that proves the attribute genuinely paints on the published
page) is cited alongside the missing editor-side reference.
