# Drawer code-extraction cross-site diff — 2026-07-28

Source data: `*-desktop.json` / `*-mobile.json` in this directory, one file per site×viewport, extracted from live `getComputedStyle()` reads on genuinely-opened panels (Chrome headless via `superpowers-chrome`).

**Tally: 15/15 target cells captured, 0 skipped.**
lamalama (desktop+mobile), lusion (desktop+mobile), dogstudio (desktop+mobile), fantasy (desktop+mobile), buck (desktop+mobile), resn (desktop only, per brief), studionamma (desktop+mobile), wearecollins (desktop+mobile).

Two real-attempt honesty note: resn required 2 failed loads of the direct `#!/menu` hash URL (loader stalled on a static illustration both times, ~15s wait each) before a fresh navigate to the plain homepage + clicking the real `.js-shell__button--menu` trigger worked — recorded in `resn-desktop.json` notes. studionamma required identifying the correct `.link_first` element by TEXT ("MENU"), not by class, because multiple elements share that class — the first DOM match (logo) triggers an unrelated portfolio-preview animation, not the drawer.

---

## 1. Property-by-property comparison (desktop)

### Panel geometry

| Property | lamalama | lusion | dogstudio | fantasy | buck | resn | studionamma | wearecollins |
|---|---|---|---|---|---|---|---|---|
| position | fixed | absolute | fixed | fixed | fixed | static (canvas app) | fixed | fixed |
| inset shape | top:16 + centred, capped 438px card | top:107.6/right:67.6, 310px card | 0/0/0/0 full | -100/0/-100/0 (overshoot) full | 0/0/0/0 full | n/a (composited) | 0/0/0/0 full | 0/0/-639/0 (overshoot) full |
| width | 438px max, else 100vw-32px | 310px | 100vw | 100vw | 100vw | ~100vw | 100vw | 100vw |
| height | 436px (content-sized) | 613px (content-sized) | 100vh | 100vh+200px | 100vh | 100vh | 100vh | 100vh |
| background-color | transparent (blur only) | transparent (per-card fill) | transparent | **opaque black** | **opaque brand-brown/green** | transparent | **opaque off-white** | **opaque near-black brown** |
| backdrop-filter | blur(4px) | none | none | none | none | none | none | none |
| border-radius | 4px | 0 (per-card) | 0 | 0 | 0 | n/a | 0 | 0 |
| z-index | 20 | auto | 995 | 9 | 1300 | auto | 3 | 1 |

### Backdrop / scrim

| | lamalama | lusion | dogstudio | fantasy | buck | resn | studionamma | wearecollins |
|---|---|---|---|---|---|---|---|---|
| dedicated scrim element | No | No | No | No (opaque panel) | No (opaque) | No | No (opaque) | No (opaque) |
| mechanism | panel's own blur | none — page stays interactive | page darkens via hero visuals, not CSS | opaque fill | opaque fill | WebGL shader glitch on bg art | opaque fill | opaque fill |

**Finding: NONE of the 8 sites use a separate `<div class="backdrop">` scrim.** 5/8 achieve full occlusion via an opaque panel fill; lamalama uses `backdrop-blur` only on a small floating card; lusion and resn leave the background fully visible/interactive.

### Menu-list layout

| | lamalama | lusion | dogstudio | fantasy | buck | resn | studionamma | wearecollins |
|---|---|---|---|---|---|---|---|---|
| display | block (row-per-item) | flex column | block (li stack) | list-item (centred stack) | flex row (visually wraps to column) | flex (horizontal, 3-up) | **grid, 2 cols (640px 640px)** | flex column |
| columns observed | 1 | 1 | 1 | 1 (+ separate tertiary row) | 1 | 3 (horizontal) | **2** | 1 (+ separate right rail) |
| link count | 5 | 4 | 5 | 3 (+3 tertiary) | 6 | 3 | 7 (4+3 split) | 3 (+3 tertiary +3 promo) |
| alignment | left | left | left | **centred** | right-of-centre | **centred** | left | left |

### Link typography

| | lamalama | lusion | dogstudio | fantasy | buck | resn | studionamma | wearecollins |
|---|---|---|---|---|---|---|---|---|
| font-family | SuisseBPIntl | Aeonik | Heebo | sans (system) | Mabry | Fort-Extralight (canvas) | Mixtape/custom | **Portrait Text (serif)** |
| font-size | 16px | 16px | 45px | **70px** | 47.3px | 58.5px | **160px** | 72px |
| font-weight | 400 | 400 | **200** | 400 | **100** | 400 | ~400 | 400 |
| text-transform | none | **uppercase** | none | none | **uppercase** | none | none (source caps) | none |
| letter-spacing | normal | normal | -0.9px | -2.1px | normal | (n/a canvas) | normal | -1.44px |
| colour | cream/off-white | black on white | light lavender-blue | white on black | black on brown | white on dark | near-black on off-white | white on dark brown |

**Finding: font-size ranges 16px→160px (10x spread) — this is the single most design-defining variable across the set, and cannot be a fixed framework default.**

### Secondary blocks (kind inventory, desktop)

| Kind | lamalama | lusion | dogstudio | fantasy | buck | resn | studionamma | wearecollins |
|---|---|---|---|---|---|---|---|---|
| newsletter-form | – | ✓ | – | – | – | – | – | ✓ |
| contact/CTA | ✓ (2 buttons) | ✓ (collapsed) | – | ✓ (inline sentence) | – | – | ✓ (header CTA) | ✓ (pill button) |
| promo-card (content/case-study) | – | ✓ (LABS) | – | ✓ (LIV GOLF) | – | – | – | ✓ (3 story cards) |
| social-links | – | – | ✓ | – | ✓ | – | ✓ | ✓ |
| footer-text | – | – | ✓ (tagline) | – | ✓ (copyright) | – | – | – |
| tertiary link row | – | – | – | ✓ | – | – | – | ✓ |
| decorative/other | ✓ (icon glyphs) | – | ✓ (showreel link) | – | – | ✓ (Discover label) | – | – |

**Finding: secondary-block richness varies from 0 dedicated kinds (buck, resn — pure nav + footer utility) to 4+ kinds (wearecollins, lusion, fantasy) — this determines whether a variant needs a child-block roster at all.**

### Close control

| | lamalama | lusion | dogstudio | fantasy | buck | resn | studionamma | wearecollins |
|---|---|---|---|---|---|---|---|---|
| kind | text-swap (— glyph) | text-swap (MENU→CLOSE) | separate-X | separate-X | separate-X | burger-morph (same button) | **text-swap (word MENU→CLOSE)** | separate-X |

**Finding: 3 of 8 use text-swap (no icon at all), 4 use separate-X, 1 uses burger-morph. Roughly even split — this needs to be an explicit attribute, not a fixed default.**

### Motion / mechanics

| | lamalama | lusion | dogstudio | fantasy | buck | resn | studionamma | wearecollins |
|---|---|---|---|---|---|---|---|---|
| body overflow while open | hidden | hidden | not confirmed | **visible (not locked)** | **auto scroll (not locked)** | not confirmed | not confirmed | hidden |
| overshoot inset (anim tell) | no | no | no | yes (-100px) | no | n/a | no | yes (-639px) |

**Finding: scroll-lock is NOT universal — fantasy.co and buck.co leave body scrollable with the drawer open (verify live before assuming scroll-lock is a safe default).**

---

## 2. Variance inventory

**Must be a per-variant attribute (varies meaningfully across sites):**
- Panel shape/position (floating capped card / anchored dropdown-stack / true full-viewport) — 3 fundamentally different geometries, not a spectrum of one.
- Panel fill (transparent+blur / transparent+per-card bg / fully opaque) — determines whether a backdrop-blur control is even relevant.
- Menu-list column count (1 / 2 / 3-horizontal) and alignment (left / centre / right-of-centre).
- Link font-size (16px–160px), font-weight (100–400), text-transform (none/uppercase), letter-spacing.
- Close-control kind (text-swap / separate-X / burger-morph).
- Secondary-block roster (0 to 4+ distinct kinds; which kinds).
- z-index base (varies 1–1300 — implementation detail, not a design signal, but attribute-worthy so drawer always wins stacking context).

**Effectively constant / can be fixed CSS (no attribute needed):**
- Absence of a dedicated scrim `<div>` — 8/8 skip it; occlusion is always achieved by the panel itself (blur, opacity, or per-card fill). A "backdrop opacity" attribute would be speculative — build the panel's own fill/blur controls instead, no separate scrim layer needed.
- `border-radius` on the panel itself is 0 in 6/8 cases (only lamalama's floating-card variant rounds its own outer edge) — round the CARD variant only, not a universal default.
- `backdrop-filter` is unused everywhere except lamalama — do not make blur the default; make it a variant-specific opt-in.

**Changes between desktop and mobile WITHIN a site (must be per-device editable, not just fluid/responsive CSS):**
- lamalama: type identical, only width changes (card literally the same design, just narrower) — low mobile complexity.
- lusion: which secondary card is VISIBLE swaps (newsletter ↔ contact-CTA) — a content-priority swap per device, not pure reflow.
- dogstudio: index-number column (01-05) is desktop-only; footer social row switches text-row → icon-badges; type steps 45→40px.
- fantasy: bottom-left CTA sentence is DROPPED ENTIRELY at mobile (not reflowed, not found in DOM); type scales fluidly ~66% (70→46.5px, consistent with clamp/vw).
- buck.co: menu alignment flips right-of-centre → left; footer row flips inline → stacked; a search icon appears ONLY at mobile; type steps sharply 47→24px (discrete breakpoint, not fluid). Also observed a background-colour change (brown→green) suspected to be palette-rotation unrelated to viewport — flagged, not confirmed as a device rule.
- studionamma: the 2-column grid MERGES to 1 column at mobile, AND the persistent header CTA ("LET'S TALK") is absorbed into the list as an actual nav item — a content-role migration, not CSS reflow. Type steps 160→64px (>2x, not fluid).
- wearecollins: tertiary link row (Team/Careers/Press) is DROPPED ENTIRELY at mobile; right-side promo rail becomes inline full-width cards; alignment flips left→centre; type steps 72→48px.

**This means "responsive font scaling" alone is insufficient as a framework mechanism** — at least 3 of 7 measured mobile cases (fantasy, buck, studionamma, wearecollins — actually 4/7) show CONTENT presence/role changes between devices, not just fluid resizing. The block needs a genuine per-device content-visibility/role attribute for at least one secondary block, not just responsive typography tokens.

---

## 3. Structural differences no single CSS property captures

1. **Floating capped card vs full-viewport panel** (lamalama vs the other 7) — an entirely different container archetype: max-width, margin-on-all-sides, own border-radius, own blur, vs edge-to-edge fixed inset. This is a variant-level structural choice, not a parameter on the same structure.
2. **Anchored dropdown-of-independent-cards** (lusion) — the "panel" is not one continuous surface; it's 3-4 separately-backgrounded stacked cards (menu-list card / newsletter card / CTA card / labs card), each with its own fill/radius. A single "panel background" attribute cannot represent this; needs a repeatable child-card structure.
3. **Split left/right zone with a dedicated promo rail** (wearecollins) — nav + CTA + newsletter + social all in a left column, a completely separate right-column "story card" rail. This is a 2-region layout, not a variant of a single list.
4. **Canvas/WebGL-rendered menu** (resn) — the entire surface is a shader-driven render, not DOM+CSS. Text isn't real DOM text; hover effects are shader warps. Not clonable via standard block attributes at all — would need an explicit "advanced/WebGL" escape-hatch variant, or accept a lower-fidelity DOM approximation.
5. **Numbered-index decorative column** (dogstudio's 01-05, desktop-only) — a structural element with no equivalent elsewhere; needs its own optional sub-component (index-number prefix), not a CSS trick.
6. **2-column primary/secondary nav split that merges on breakpoint** (studionamma) — the grid-column-count itself is a responsive variable that also changes which items are grouped conceptually (CTA folds into the list) — bigger than a `grid-template-columns` breakpoint swap.
7. **Palette-rotation background colour** (buck.co) — background may not be a fixed brand token at all but a rotating set; if true, the variant needs a colour ARRAY, not a single default.

---

## 4. Draft variant capability list (attribute:default pairs; content excluded)

### Variant: `floating-card` (lamalama)
- `panelPosition`: `top-centre-floating`
- `panelMaxWidth`: `438px`
- `panelMargin`: `16px` (all sides)
- `panelBorderRadius`: `4px`
- `panelBackdropBlur`: `4px`
- `panelBackgroundOpacity`: `0` (transparent, blur-only)
- `listColumns`: `1`
- `listAlign`: `left`
- `linkFontSize`: `16px` / `linkFontWeight`: `400` / `linkTextTransform`: `none`
- `closeControlKind`: `text-swap`
- Child-block roster: menu-list, outlined-link-cta (pitchdeck), 2-up button row

### Variant: `anchored-dropdown-stack` (lusion)
- `panelPosition`: `top-right-anchored`
- `panelWidth`: `310px`
- `panelBackgroundOpacity`: `0` (outer transparent; per-card opaque)
- `listColumns`: `1`
- `linkFontSize`: `16px` / `linkTextTransform`: `uppercase`
- `closeControlKind`: `text-swap`
- Child-block roster: menu-list-card, newsletter-card (device-conditional visibility), cta-card (inverse device-conditional visibility), promo-card (labs)

### Variant: `full-viewport-editorial` (dogstudio)
- `panelPosition`: `full-viewport`
- `panelBackgroundOpacity`: `0` (relies on hero dimming)
- `listColumns`: `1` / `listAlign`: `left`
- `linkFontSize`: `45px` (desktop) / `40px` (mobile) / `linkFontWeight`: `200`
- `showIndexNumbers`: `true` (desktop) / `false` (mobile)
- `closeControlKind`: `separate-x`
- Child-block roster: showreel-link, tagline-text, social-links (text-row desktop / icon-row mobile)

### Variant: `full-viewport-centred-statement` (fantasy)
- `panelPosition`: `full-viewport`
- `panelBackgroundOpacity`: `1` (opaque black)
- `listColumns`: `1` / `listAlign`: `centre`
- `linkFontSize`: `70px` (desktop) / fluid clamp to ~46.5px (mobile) / `linkFontWeight`: `400`
- `tertiaryLinkRow`: `true`
- `ctaSentenceVisibleAtMobile`: `false`
- `closeControlKind`: `separate-x`
- Child-block roster: tertiary-link-row, inline-cta-sentence (desktop-only), promo-card

### Variant: `full-viewport-solid-brand` (buck)
- `panelPosition`: `full-viewport`
- `panelBackgroundOpacity`: `1` (solid brand colour — array of rotating values, not single default)
- `listColumns`: `1` / `listAlign`: `right-of-centre` (desktop) / `left` (mobile)
- `linkFontSize`: `47px` (desktop, discrete step to `24px` mobile) / `linkFontWeight`: `100` / `linkTextTransform`: `uppercase`
- `showSearchIcon`: `false` (desktop) / `true` (mobile)
- `closeControlKind`: `separate-x`
- Child-block roster: footer-copyright + social-links (inline row desktop / stacked mobile)

### Variant: `webgl-canvas-menu` (resn) — desktop-only, advanced/escape-hatch
- `panelPosition`: `full-viewport` (composited, not CSS-positioned)
- `listColumns`: `3-horizontal-centred`
- `linkFontSize`: `58.5px` / `linkFontWeight`: `400`, rendered via canvas text-effect, not DOM text
- `closeControlKind`: `burger-morph`
- Not realistically cloneable as a standard variant — flag as reference-only / out-of-scope for a standard attribute set unless a WebGL-effect module is separately planned.

### Variant: `full-viewport-2col-editorial` (studionamma)
- `panelPosition`: `full-viewport`
- `panelBackgroundOpacity`: `1` (near-white)
- `listColumns`: `2` (desktop, `640px 640px`) / `1` (mobile, merges)
- `linkFontSize`: `160px` (desktop) / `64px` (mobile) — note: must target the INNER text element, not the link wrapper
- `ctaFoldedIntoListAtMobile`: `true`
- `closeControlKind`: `text-swap` (word swap, no icon)
- Child-block roster: primary-nav-column, secondary-nav-column (merges into primary at mobile)

### Variant: `full-viewport-split-zone-serif` (wearecollins)
- `panelPosition`: `full-viewport`
- `panelBackgroundOpacity`: `1` (near-black brown)
- `listColumns`: `1` (left zone) + dedicated right-zone promo rail (desktop only — becomes inline stack at mobile)
- `linkFontFamily`: `serif` (the only serif variant) / `linkFontSize`: `72px` (desktop) / `48px` (mobile) / `listAlign`: `left` (desktop) / `centre` (mobile)
- `tertiaryLinkRowVisibleAtMobile`: `false`
- `closeControlKind`: `separate-x`
- Child-block roster: pill-cta, tertiary-link-row (desktop-only), newsletter-form, social-links, promo-card-rail (repeatable, image+label+headline+arrow)

---

## Summary for the block spec

The 8 references resolve into roughly **4 structural archetypes** (not 8 variations of one shape):
1. Floating capped card (lamalama) — needs its own container-shape mode.
2. Anchored card-stack dropdown (lusion) — needs a repeatable "stacked independent cards" child structure, not a single panel background.
3. Full-viewport panel — the majority pattern (dogstudio, fantasy, buck, studionamma, wearecollins), but within this ONE archetype the type-scale (45px–160px), column count (1 or 2), alignment (left/centre/right), and secondary-block roster (0 to 4+ kinds) vary enormously and each needs its own attribute.
4. Canvas/WebGL app (resn) — out of scope for a standard attribute-driven clone; flag as a research item, not a variant to build now.

Recommend the `sgs/nav-drawer` block ship container-shape as a top-level variant selector (floating-card / anchored-stack / full-viewport), with the full-viewport variant carrying the richest attribute set (columns, alignment, type-scale, secondary-block roster, per-device content-visibility toggles) since 5/8 references land there.
