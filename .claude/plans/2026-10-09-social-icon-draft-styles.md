# Social icons: style sgs/social-icons + sgs/icon exactly like two draft footers

Asked by Bean on 2026-10-09. Scope: the footer icon links only, of the Basket draft (`sites/mamas-munches/SiteFooter.dc.html`)
and the Indus Foods draft (`sites/indus-foods/Indus Foods Website v2.dc.html`). Any client must be able to do this through
block settings; nothing client-specific enters the theme or plugins.

## Measured (rendered drafts, computed styles, CDP-forced :hover and :focus-visible, 1440 and 375, identical at both)

| | Basket (2 round icons + 1 labelled pill) | Indus (4 round icons) |
|---|---|---|
| Box | 48px, 2px solid #3A2A22, radius 999px | 44px, no border, radius 50% |
| Fill | Instagram radial-gradient(circle at 30% 107%, #FDF497 0, #FD5949 45%, #D6249F 60%, #285AEB 90%); WhatsApp #25D366 | LinkedIn #0A66C2, Facebook #1877F2, Google #EA4335, Instagram the same radial gradient |
| Glyph | 20px, white, stroke 2 | 22px, white, filled |
| Row gap | 10px | 12px |
| Rest shadow | 3px 3px 0 0 #3A2A22 | none |
| Hover transform | translate(-2px,-2px) rotate(-8deg) | scale(1.15) translateY(-3px) rotate(-8deg) (matrix ty = -3.45) |
| Hover shadow | 5px 5px 0 0 #3A2A22 | 0 10px 20px -6px rgba(0,0,0,.45) |
| Transition | transform, box-shadow, background: 0.2s ease each | transform 0.35s cubic-bezier(.34,1.56,.64,1); box-shadow 0.25s ease |
| Colour change on hover | none | none |
| Focus-visible | 3px solid #3A2A22, offset 3px | browser default (auto) |

## Gaps in the framework (before this change)

1. Brand ground gradient (Instagram): `colourMode: brand` paints only a flat colour.
2. Hold the brand colours on hover: `colourMode: brand` swaps ground and glyph on hover.
3. Hard offset shadow, rest and hover, from tokens, on an icon or as a row default.
4. Hover translate (x, y) and hover rotate; only scale existed (static rest rotation).
5. Separate move and paint durations and a move easing (spring).
6. Row defaults for 3 to 5 (`sgs/social-icons`).

## Build

- `includes/data/brand-registry.json`: Instagram gets `groundGradient`, read by `sgs/icon` (and the JS twin) when the colour mode is Brand colours; `sgs_brand_paint_hold()` keeps the hover ground and glyph.
- `includes/helpers-icon-motion.php`: one place that turns hover offsets, rotation, durations, easing and the shadow
  pair into declarations, with the `--sgs-icon-*` prefix for an icon and `--sgs-si-*` for a row.
- `sgs/icon`: attributes `brandHover`, `offsetXHover`, `offsetYHover`, `iconRotateHover`, `transitionDuration`,
  `paintDuration`, `transitionEasing`, `transitionEasingCustom`, `boxShadow`, `boxShadowColour`, `boxShadowHover`,
  `boxShadowColourHover`, `shadowLiftOnHover`; panels Hover effects (extended) and Shadow (the shared `ShadowControl`).
- `sgs/social-icons`: the same set as `childIcon*` row defaults, printed as `--sgs-si-*`; `brandHover` through block context.
- `icon/style.css` reads own, then row, then default; reduced motion drops the transforms; focus-visible shares hover.
- Editor canvas twin gets the same custom properties.

## Tests (red first)

- `tests/php/IconDraftStylesTest.php`: icon render and row render assertions for each new control.
- JS: canvas custom-property twin (`tests/js`).

## Proof

Deploy to sandybrown, build a QA page with two rows (one per draft) from `plugins/sgs-blocks/scripts/qa/`,
and run `plugins/sgs-blocks/scripts/qa/social-icon-draft-compare.mjs` (rest, hover, focus at 1440 and 375, every
property side by side). Remaining differences are listed with their reason.
