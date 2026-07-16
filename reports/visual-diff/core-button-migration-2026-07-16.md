# Visual-diff report — core/button + core/buttons + core/latest-posts, 2026-07-16

verdict: PASS
first_paint_capture_passed: true

**PASS on the migration itself (attributes transfer faithfully, nothing lost).
⚠ But it VISIBLY RESTYLES every CTA — see "Bean's call" below. That delta is a
property of the two blocks' designs, not of this transform.**

## What changed
| pairing | swept | refused | files |
|---|---|---|---|
| core/button → sgs/button | 15 | 0 | 11 |
| core/buttons → sgs/multi-button | 13 | 0 | 11 |
| core/latest-posts → sgs/post-grid | 1 | 0 | 1 |

Safe-zone replaceable: **223 → 190**. Theme Version → 1.5.29.
The 2 previously-refused bound buttons (`contact-minimal.php`, binding `url` →
`sgs/site-info`) now migrate — `url`/`linkTarget`/`rel` keep their names on
sgs/button and resolve via this session's block-bindings filter.

## Mapping highlights (each verified against block.json + render.php)
- `<a href>`/inner text/`target`/`rel` → `url`/`label`/`linkTarget`/`rel` (core
  sources these from the anchor HTML, not from JSON attrs).
- `backgroundColor`/`textColor` (preset slugs) → `colourBackground`/`colourText`
  **+ `inheritStyle:"custom"`** so the `.sgs-button--{preset}` BEM modifier
  doesn't fight the explicit colour.
- `className:"is-style-outline"` → `inheritStyle:"outline"`. It is a core BLOCK
  STYLE, not a passthrough class — passing it through would have silently lost
  the outline.
- `width:100` (number, %) → `widthType:"custom"` + `customWidth:100` +
  `customWidthUnit:"%"` (render.php:55-57 accepts `%`).
- `style.typography.*` → typed attrs, split via `split_length` — sgs/button's
  `fontSize`/`lineHeight`/`letterSpacing` are STRICT `number` attrs (unlike
  sgs/heading's, which now accept a preset string), so raw CSS lengths must be
  split, never passed through.
- core/buttons `layout.justifyContent` left/right → `flex-start`/`flex-end`
  (vocabulary differs; core's values are not in the SGS enum and would be
  coerced to the default).

## ⚠ BEAN'S CALL — migrating VISIBLY RESTYLES every button
Live, content-keyed (rule 4a), `/tc-cta-banner-before/` (1483) vs
`/tc-cta-banner-after/` (1484), caches cleared:

| property | core/button | sgs/button |
|---|---|---|
| background / text colour | accent / text | **identical** ✅ |
| border-radius | 8px | **identical** ✅ |
| font-size | 18px | **15px** |
| font-weight | 700 | **600** |
| padding | 16px / 36px | **14px / 24px** |
| rendered box | 230×61 | **183×50** |
| element | `<a>` (no href) | `<button type="button">` |

**Cause (proven, and NOT the D343 class):** theme.json
`styles.elements.button` (fontSize `medium`=18px, padding 16/36) generates CSS
for WP's **core** button classes (`.wp-element-button`/`.wp-block-button__link`).
It never matches `.sgs-button`, which carries its own constants in
`button/style.css:24-27` (`font-size:15px; padding:14px 24px`). So neither
overrides the other — the framework simply has TWO button designs, and swapping
the block swaps the design. Colours match because those came from the attrs.

The `<a>` → `<button>` change is correct and arguably better: the core markup has
NO `href` (a pattern placeholder), and an `<a>` without href is not keyboard
focusable, whereas `<button>` is. sgs/button renders `<button>` only when `url`
is empty (render.php:29 → `href="#"` otherwise).

**Recommendation:** point `sgs/button` at the theme's button tokens so the
framework has ONE button design driven by theme.json, and migration becomes
visually lossless. That is a shared-block change (Rule 7 design-gate) and is NOT
done here.
**Alternative:** accept it — an SGS button should look like an SGS button.

Screenshots for the eye (this directory):
`button-restyle-BEFORE-core-2026-07-16-*.png` vs
`button-restyle-AFTER-sgs-2026-07-16-*.png`.

## Driver fixes shipped alongside
- `load_target_schema()` now derives the attrs WP INJECTS from a block's
  `supports` (backgroundColor/textColor/gradient/style/fontSize/fontFamily/align)
  instead of reading only block.json's static `attributes`. sgs/multi-button's
  render.php legitimately reads `$attributes['backgroundColor']` (auto-registered
  from `supports.color`) while block.json never lists it — the old gate would have
  rejected a CORRECT emit and aborted the whole run. Derived from supports, not
  blanket-allowed, so emitting a colour attr at a block WITHOUT colour support is
  still caught.

## Gap candidates found (each = capability to ADD, never a silent drop)
- **`sgs/button` `fontFamily` is DEAD** — declared in block.json (a client-facing
  control) but never read by render.php. Real bug, out of scope here.
- `<a title>` on core/button — no sgs/button equivalent (`ariaLabel` is a
  different semantic). Dropped with reason.
- core/button top-level preset `fontSize` (string) — sgs/button's `fontSize` is a
  strict number → refused rather than coerced. Would benefit from the same
  `["number","string"]` union sgs/heading/sgs/text got this session.
- `style.color.gradient` on core/button — no gradient support.

## core/latest-posts → sgs/post-grid (1 instance, parts/sidebar.html)
Mapped: `postsToShow→postsPerPage`, `displayPostDate→showDate`,
`displayFeaturedImage→showImage`, `featuredImageSizeSlug→imageSize`,
`order`/`orderBy` 1:1.
- `addLinkToFeaturedImage:true` — dropped-with-reason: post-grid's card ALWAYS
  links the image (`class-post-grid-rest.php::render_card()`), so `true` already
  matches; `false` would be refused (no toggle exists).
- ⚠ `cardStyle:"flat"` is a VISUAL APPROXIMATION of core's zero-chrome rendering
  (`"minimal"` was rejected — it force-hides the image, contradicting
  `displayFeaturedImage:true`). Flagged for the eye.
- ⚠ `parts/sidebar.html` is referenced by NO template (grepped) — the swap is
  correct but currently inert on the live site.

Gates: `check-dead-pattern-attrs.py` unchanged at the 6 known hands-off findings.
No horizontal overflow at 375/768/1440.
