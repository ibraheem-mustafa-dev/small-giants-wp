# Media unification council — M5: five remaining surfaces

**Scope:** `sgs/info-box`, `sgs/responsive-logo`, `sgs/decorative-image`, `sgs/image-sequence`, `sgs/product-card`. READ-ONLY evidence gathering. Repo: `c:\Users\Bean\Projects\small-giants-wp`, plugin `plugins/sgs-blocks`.

**Expected population declared before counting:** for each block, the attribute set in `block.json`, cross-checked against `edit.js` control wiring and `render.php` consumption. Positive controls used throughout (e.g. `iconPosition` on info-box, `width`/`linkToHome` on responsive-logo) to confirm the grep methodology finds real wiring, not just misses it.

---

## 1. `sgs/info-box` — mediaType is NOT the same concept as everywhere else, and is DEAD

**File:line evidence:**
- `block.json` (`src/blocks/info-box/block.json`) declares `mediaType` (enum `icon|emoji|image`, default `icon`), `image` (object), `icon` (string, default `star-filled`), `iconPosition` (enum `top|left|right`).
- `edit.js:217-219` — a completely SEPARATE mapping table, `MEDIA_TYPE_TO_BLOCK`, keyed on `icon|emoji|image|video|svg`, that maps each to a CHILD InnerBlock: `icon`/`emoji` → `sgs/icon` (with its own `iconSource` attr), `image`/`video`/`svg` → `sgs/media` (with its own `mediaType` attr).
- `edit.js:224-240` — `getEffectiveMediaType()` reads `firstBlock.attributes?.mediaType` (the CHILD `sgs/media`'s attribute) or `firstBlock.attributes?.iconSource` (the CHILD `sgs/icon`'s attribute) to determine what's actually showing. It never reads the parent block's own `mediaType`.
- Grep for `attributes.mediaType`, `attributes['mediaType']`, `setAttributes( { mediaType` inside `edit.js`/`render.php`/`save.js`: **zero matches** other than the dead declaration and the unrelated child-attr references above.
- Grep for `attributes['image']`, `attributes['icon']` reads in `render.php`: **zero matches.**

**Verdict: `mediaType`, `image`, and top-level `icon` are DEAD attributes on `sgs/info-box`.** They are legacy from before the FR-22-6 migration (documented in the block's own file header) that moved all card content — including media — to native InnerBlocks children (`sgs/icon`, `sgs/heading`, `sgs/text`, `sgs/multi-button`). `iconPosition` is the one attribute in this family that IS real (drives a BEM modifier class and has a `SelectControl` at `edit.js:627-629`).

**What this means for the vocabulary question:** info-box's OWN `mediaType` enum (`icon|emoji|image`) is not a parallel/competing vocabulary to unify — it is inert. The REAL media selection on this block happens one level down, inside the `sgs/icon` and `sgs/media` children, each already using ITS OWN vocabulary (`sgs/icon.iconSource`: `lucide|emoji`; `sgs/media.mediaType`: `image|video|svg`). Info-box itself contributes nothing to a unified media model except a POSITION control (`iconPosition`) for whichever child occupies the media slot.

**Context verdict: N/A — not a media surface at all.** `sgs/info-box` does not render media; it hosts a child block that does. The three-context model (root/element/backdrop) doesn't apply to info-box directly — it applies to whichever child (`sgs/icon` or `sgs/media`) is dropped into its media slot, and that child would take the `element` context (media inside a composite) if `sgs/icon`/`sgs/media` are themselves unified. Recommend: strike info-box's dead `mediaType`/`image`/`icon` attributes from any future audit population — they are not part of the media surface at all, just plugin cruft, and should probably be deleted outright (separate from this council's scope) rather than "unified".

---

## 2. `sgs/responsive-logo` — genuinely `<picture><source media>`, confirmed; a fourth shape or a variant of `element`?

**File:line evidence — render.php** (`src/blocks/responsive-logo/render.php`):
- Standard mode (no SVG animation), lines ~300-345: three near-identical `<picture>` blocks (mobile-switch / tablet-switch / custom-switch), each literally `<picture><source media="(max-width:...)" srcset="..."><source media="(max-width:...)" srcset="..."><img ...></picture>`.
- SVG-animation mode, lines ~262-286: inline `<svg>` for desktop wrapped in a `<span data-sgs-fx="draw">`, PLUS a separate fallback `<picture><source media><source media><img></picture>` for tablet/mobile (hidden by CSS at desktop width).

This is confirmed correct and is structurally unlike every other media surface in the framework, all of which (per the other agents' surveys) use a single `<img>`/`<video>` with tier siblings toggled by `display:none` in scoped `@media` rules, or CSS `background-image` swaps — never `<picture><source media>`. Responsive-logo is the ONLY block using the browser-native `<picture>` responsive-image mechanism.

**Attribute inventory (all controlled — verified in `edit.js`):**

| Attribute | Control | Panel | Gated on |
|---|---|---|---|
| `logoId`/`logoUrl` (desktop) | `MediaUpload` | "Logo" panel | always |
| `logoIdTablet`/`logoUrlTablet` | `MediaUpload` | "Logo" panel | always (optional slot) |
| `logoIdMobile`/`logoUrlMobile` | `MediaUpload` | "Logo" panel | always (optional slot) |
| `logoSwitchMode` | `SelectControl` | "Logo" panel | always |
| `logoSwitchCustomPx` | `RangeControl` | "Logo" panel | `logoSwitchMode === 'custom'` |
| `svgAnimationSource` | `MediaUpload` | "Animation" panel | always |
| `animationStyle` | `SelectControl` | "Animation" panel | always |
| `width` | `RangeControl` | "Size / link / alt" panel | always |
| `linkToHome` | `ToggleControl` | same panel | always |
| `alt` | `TextControl` | same panel | always |
| `maxWidth`/`maxWidthUnit`, `maxHeight`/`maxHeightUnit` | tier-object controls | "Max box" panel | always |
| `paddingTablet`/`paddingMobile`/`marginTablet`/`marginMobile` (+ native `style.spacing`) | box controls | "Spacing" panel | always |
| `align` | native WP support | — | — |

**No uncontrolled attributes found.** No dynamic-key evasion issue here — this block has no per-tier typography/colour attrs that would need template-literal key checks; its tiers are the three logo slots plus max-box tiers, all handled by named object controls, not string-concatenated keys.

**Is media art-directed or flat?** Genuinely per-tier (desktop/tablet/mobile), consistent with Bean's per-tier-with-inherit standard — confirmed by `render.php`'s fallback chain (`$effective_tablet_url = $tablet_url ? $tablet_url : $desktop_url`, same for mobile) — an empty tier inherits the desktop image, not "nothing."

**Panel structure vs C14 (group by element):** Panels are "Logo" (media source, all three tiers, one element = the logo image), "Animation" (SVG + trigger — arguably a different element/behaviour, defensible as its own panel), "Size/link/alt" (root-element sizing + accessibility), "Max box", "Spacing". This mostly respects one-element-per-panel; "Size/link/alt" bundles three different concerns (root width, link behaviour, alt text) into one panel, which is a mild violation of "one element per panel" if judged strictly, but all three concern the SAME rendered node (the image/link), not different elements.

**Context verdict: does NOT cleanly fit `root`/`element`/`backdrop`.**
- It is visually a "root, standalone foreground" media surface (comparable to `sgs/media`), so on that axis it is `root`.
- But its RENDERING SHAPE (`<picture><source media>`, three independently-sourced tier images, `linkToHome` wrapping, home-link semantics, `svgAnimationSource` for a wholly separate inline-SVG rendering path) is unlike `sgs/media`'s single-element-plus-tier-siblings pattern used everywhere else in the framework.
- **Recommendation: this is not evidence for a FOURTH context** (context is about WHERE media sits relative to page content — foreground/inside-composite/behind-content — and responsive-logo is unambiguously `root`-like on that axis). It IS evidence that "context" and "rendering mechanism" are two separate axes that the unification effort needs to keep distinct: a unified media element could still special-case the `<picture>` mechanism for the specific case of "logo with distinct per-tier ASSETS + native browser-level swap," without inventing a fourth CONTEXT. Forcing responsive-logo onto the same DOM shape as `sgs/media` root context would mean giving up the native `<picture>` mechanism (and its zero-JS behaviour) for no measurable benefit — flag this as a case where "unified DOM shape" and "unified context taxonomy" are not the same claim, and only the latter survives contact with this block.

---

## 3. `sgs/decorative-image` — confirmed naked mode, and a proven concrete failure mode for descendant-selector helpers

**Confirmed: the block root IS the `<img>` in the default (untreated) case.**
`render.php` (image branch, near the end of the file): `sgs_responsive_image( $image_id, $image_url, '', 'large', $img_attrs )` is echoed directly — no wrapping `<div>`/`<span>`. `$img_attrs['class']` carries `sgs-decorative-image <uid>` directly on the `<img>` tag. Tier siblings (`imageIdTablet`/`imageIdMobile`) are rendered as SIBLING `<img>` elements at the same level, each independently carrying the uid class, toggled by COMPOUND selectors (`.{uid}.sgs-decorative-image--tablet`) because there is no wrapping ancestor to descend from — confirmed by the block's own extensive inline comments (render.php, "NAKED MODE" section) and independently by grep: `$root_sel = '.' . $uid . '.sgs-decorative-image';` is a compound class selector, never a descendant combinator.

**This is a documented, ALREADY-HIT concrete failure case for a shared helper using descendant selectors — the exact concern the prompt asked about.** `render.php`'s "SURFACE-TREATMENT WRAPPER GATE (2026-08-28)" section documents:
- `fx-surface-treatment.js`'s `initTreatment()` does `el.querySelector('img')` and returns a silent no-op when it finds nothing.
- In naked mode, `el` (the element the fx system attaches to) **IS** the `<img>` itself — `querySelector` only searches DESCENDANTS, so it can never match its own element, and the treatment silently does nothing (no error anywhere).
- A second failure: `webgl/renderer.js` tries to APPEND a `<canvas>` INSIDE that element for its WebGL surface — but an `<img>` is a void element and cannot hold children at all.
- **The fix that shipped:** a conditional wrapper. When `fx === 'surface-treatment'`, the code switches to a DIFFERENT rendering path that wraps the treated media in a `<span>` (mirroring the pre-existing video-branch pattern) and moves the class/uid/data-* attributes onto the wrapper, leaving the inner `<img>` "naked" of the uid/class it would otherwise carry. Untreated instances keep the original zero-wrapper shape unconditionally, specifically because three other mechanisms ($root_sel compound selectors, `data-hide-tablet`/`data-hide-mobile` CSS bindings, and `view.js`'s `.sgs-decorative-image[data-parallax]` selector) all assume "class + data-* live on one single element" and would double-fire or mis-scope if both wrapper and inner image carried them simultaneously.

**Implication for a unified media element:** naked mode is not merely "a design curiosity" — it has ALREADY forced this block to grow a second, conditional rendering shape (wrapped vs unwrapped) to accommodate ONE shared JS module that assumes a wrapper exists. A unified media element that wants ANY shared JS/CSS mechanism using `el.querySelector(...)` or a descendant combinator MUST NOT allow naked mode as a general case — or every such mechanism will need this same two-shape fork. This is strong evidence the unified model should mandate a wrapper element universally, even for single-semantic-element cases, UNLESS the council is willing to accept per-mechanism naked-mode forks indefinitely (this block already required one, unprompted, at a real cost of dual code paths + a documented "known limitation" that treatment sampling breaks under naked-mode art-direction tiers, per the same file's final comment block).

**imageAlt is functionally always emptied at render.** `render.php:45` reads `$attributes['imageAlt']`, but the final `$img_attrs['alt']` is hardcoded to `''` for all image output (this is a decorative/`aria-hidden="true"`/`role="presentation"` block by design — legitimate a11y behaviour, not a bug). `imageAlt` only survives into `$decor_media['alt']` when synthesising a `decorMedia` object from legacy `imageUrl` for the video-detection branch; it does not reach visible alt text anywhere. Not flagged as a defect — decorative images correctly get empty alt — but worth noting for anyone assuming `imageAlt` behaves like `sgs/media`'s alt.

**Context verdict: `backdrop`.** This is the clearest fit of all five blocks. It is explicitly `aria-hidden="true"`/`role="presentation"`, absolutely positioned, z-index-controlled, floats freely BEHIND OR OVER content with no player chrome, no caption, no link — exactly the `backdrop` definition given in the brief ("behind content — no player chrome, no caption/link"). The one wrinkle: `zIndex` defaults to `1` and is client-controllable, so it's not ALWAYS strictly behind content (a client could push it above), but functionally and by design intent it is a decorative layer, not a content-carrying root image nor an in-composite element. No fourth context needed here.

---

## 4. `sgs/image-sequence` — confirmed 6-value spaced aspect-ratio whitelist; agency-only, out of client-facing unification scope by design

**Confirmed hardcode:** `render.php:60` — `$allowed_ratios = array( '16 / 9', '21 / 9', '4 / 3', '1 / 1', '3 / 4', '9 / 16' );` (spaced format, matching CSS `aspect-ratio` shorthand syntax with literal spaces around the slash). `edit.js:37` sources its `SelectControl` options from a SHARED constant `MEDIA_SIZING_RATIO_OPTIONS` (not block-private), so the UI list at least comes from a common source — but `render.php`'s own server-side validation allow-list is duplicated locally as a literal array, not read from the same shared source. This is the ONLY block in the five surveyed that hardcodes an aspect-ratio allow-list with this exact spaced-string format; worth checking whether `MEDIA_SIZING_RATIO_OPTIONS` and this PHP array can silently drift (a value addable in JS without being added server-side, or vice versa) — not verified further, flagged as a risk, not confirmed as a live bug.

**thumbnailAlt has a real control** — `edit.js:337-339`, a `TextControl` bound directly (not a dynamic key), confirmed not a false negative.

**Per-tier confirmed:** `thumbnail`/`thumbnailTablet`/`thumbnailMobile`, object-typed (matching `thumbnail`'s own object type specifically so a flat string isn't silently coerced away — the block's own comment states this explicitly). This is the fail-open `<img>` shown pre-JS/under reduced motion; the actual scrubbed canvas frames are a WHOLLY separate per-tier pipeline (`desktopFramesUrl`/`tabletFramesUrl`/`mobileFramesUrl` + counts/pad/ext), self-art-directing and not part of the "thumbnail" media-control question.

**Context verdict: does not cleanly map to any of the three contexts, and the mismatch is BY DESIGN, not a gap to fix.** The block's `block.json` description states it is "AGENCY-ONLY — hidden from the block inserter" (`inserter: false`) and requires a Python/ffmpeg CLI step no client can run. Its "media" (the canvas frame sequence) is not really a single asset at all — it's an animation rig with a fail-open `<img>` fallback. Forcing this into `root`/`element`/`backdrop` would be a category error: the thumbnail's role is "reduced-motion/no-JS substitute for a canvas animation," which is closer to `root` (standalone foreground reveal, per the block's own description "Apple-style product reveal") but its purpose is fundamentally different from every other media surface — it's not there to DISPLAY an image, it's there to hold the layout stable and be visually replaced once JS runs. **Recommendation: exclude image-sequence's thumbnail from the unified media element's attribute/control contract entirely** (agency-only tooling, already explicitly out of client reach) rather than forcing a fit; if the council wants ONE thing from it, it's a precedent that "reduced-motion/no-JS fallback image" is a legitimate accessory role a media element might need to expose as an option — but that's a feature note, not a context-taxonomy finding.

---

## 5. `sgs/product-card` — media truly IS an `element` inside a composite, same context class as hero split-media; but its storage shape is a bare URL string, not id/url pair

**Confirmed: `image` is a plain string (not an id/url pair).** `block.json:240-243`:
```json
"image": { "type": "string", "default": "" },
"imageAlt": { "type": "string", "default": "", "role": "content" }
```
No `imageId` exists on this block at all — unlike `sgs/media`, `sgs/decorative-image`, and `sgs/responsive-logo`, all of which store an attachment ID that wins over a URL fallback. Product-card's typed mode has no media-library attachment tracking; it is authored as a raw image URL only (presumably still selected via `MediaUpload` in the editor, which returns `.url`, but nothing is retained to re-resolve via `wp_get_attachment_url()` later).

**Dual-mode complicates "is this an element" further** — `render.php:653-655`:
```php
$sgs_img_override     = sgs_product_card_override_active( $attributes, 'image', $attributes['image'] ?? '' );
$sgs_resolved_img     = $sgs_img_override ? (string) $attributes['image'] : (string) $data['image_url'];
$sgs_resolved_img_alt = $sgs_img_override ? (string) ( $attributes['imageAlt'] ?? '' ) : (string) $data['image_alt'];
```
In `sourceMode='wc-product'`/`'sgs-cpt'` (bound/live mode), the card's image comes from LIVE product data (`$data['image_url']`) by default, and the block's own `image`/`imageAlt` attrs act as an OPERATOR OVERRIDE on top of that live value (only take effect if `sgs_product_card_override_active()` says the operator explicitly set them). In `sourceMode='typed'`, there is no live data source, so `image`/`imageAlt` are the sole and direct source. This is a THIRD data-sourcing shape beyond "attachment ID" and "flat URL": **override-over-live-data**, comparable to nothing else in the five blocks surveyed here (the closest parallel elsewhere in the framework, per the other agents' scope, is likely the WooCommerce-bound trust-bar/product surfaces mentioned in CLAUDE.md, out of this agent's lane).

**No art-direction tiers** — single image only (no `imageTablet`/`imageMobile`), unlike decorative-image/responsive-logo/media. `imageHeight` is a single string override (e.g. `"180px"`) for the image BOX height via a CSS custom property (`--sgs-product-card-image-height`), not a tier object — flat, not per-device.

**Element context confirmed by DOM position:** per `block.json`'s `elements.image._note`: "Full-bleed direct child of the card root, OUTSIDE the padded body — never wrapped in card padding." This is genuinely comparable to hero's split-media column (an element inside a larger composite that owns its own layout decisions, not a standalone root and not a backdrop) — image controls (`supports.sgs.imageControls: true`, `imageControlsExplicit: true`) are declared and gated per the universal image-controls extension.

**Context verdict: `element`.** Clean fit — media as a structural piece of a composite, matching the brief's own example ("`element`... e.g. split media, product-card"). The one caveat worth flagging to the council: unlike hero's split-media (which the M2 agent presumably found uses id/url + per-tier art direction, consistent with `sgs/media`'s vocabulary), product-card's `element`-context media uses a THIRD storage shape (flat URL string, no ID, override-over-live-data in bound mode). If the unified model standardises `element`-context media on hero's id/url-pair-with-tiers shape, product-card's typed mode would need either a migration (adding `imageId`, losing nothing since it has no tiers to preserve) or an explicit documented exception for the bound-mode override mechanism, which has no analogue elsewhere and may not be foldable into a generic "media element" attribute contract without a bespoke escape hatch for "attribute overrides live data when explicitly set."

---

## Does the three-context model survive contact with all five surfaces?

**Mostly yes, with one important refinement and one explicit exclusion:**

1. **`sgs/decorative-image` → `backdrop`.** Clean, confident fit.
2. **`sgs/product-card`'s image → `element`.** Clean fit, but flags a third media-storage shape (flat URL + live-data-override) that the unified attribute contract will need to accommodate or explicitly except.
3. **`sgs/responsive-logo` → `root`-like on the "where does it sit" axis, but its rendering MECHANISM (`<picture><source media>`, three independently-fetched image resources, native-browser responsive swap) is structurally unlike the shared-DOM-shape pattern used everywhere else.** This is NOT evidence for a fourth CONTEXT (context ≠ mechanism) — it's evidence that "one DOM shape per context" and "one context taxonomy" are two separate design commitments, and only the second should be treated as settled. Recommend the council explicitly decide whether responsive-logo's `<picture>` mechanism is (a) folded into the `root` context as a permitted alternate rendering shape for a "distinct-per-tier-assets, zero-JS" case, or (b) left as a documented, deliberate exception outside the unified element (it already has unique concerns — SVG draw-animation, home-link wrapping — that don't obviously belong in a generic media element regardless of context).
4. **`sgs/info-box` is not a media surface at all** — its `mediaType` vocabulary is dead code from a pre-InnerBlocks-migration era. Recommend excluding it from the unified media element's scope entirely; if anything, its ONLY real contribution (`iconPosition`) belongs to whatever generic "media-in-a-content-card" positioning contract emerges from unifying `sgs/icon` and `sgs/media` as info-box's children (out of this agent's lane, but worth flagging to whichever agent covers `sgs/icon`/`sgs/media`).
5. **`sgs/image-sequence` is agency-only tooling with no client-facing controls and a fundamentally different purpose (reduced-motion fallback for a canvas rig, not a displayed image).** Recommend explicit exclusion from the unified element's attribute contract, not a forced fit.

**Net: the three-context model holds for the blocks that are genuinely "media."** The two blocks that don't cleanly map (info-box, image-sequence) don't map because they aren't real media surfaces in the sense the model is trying to unify — one is dead code, the other is agency-only animation tooling. No fourth context is needed; what IS needed is an explicit scoping decision to exclude those two from the attribute-unification effort, and a decision on how (or whether) to accommodate responsive-logo's native `<picture>` mechanism and product-card's override-over-live-data shape within whatever attribute contract the council settles on for `root` and `element` respectively.
