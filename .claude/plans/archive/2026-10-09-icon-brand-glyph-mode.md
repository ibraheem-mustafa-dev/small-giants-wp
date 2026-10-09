# Plan: sgs/icon colour mode "brand-glyph" (Brand colour: logo only)

Approved by Bean 2026-10-09 (fix register rows 39-43, owned by the main session).

## What changes

New `colourMode` enum value `brand-glyph` on `sgs/icon` and `sgs/social-icons` (the row default, handed down through the existing `sgs/socialIconsColourMode` context). `brand` keeps its meaning (brand-coloured box, contrast glyph).

Look, per brand, any client:
- Rest: the glyph alone is painted in the brand colour. The shape keeps the client's ground and border (the icon's or the row's own background and border settings; the mode never forces a ground on). Google draws its fixed four-colour `glyphBrand` mark. Instagram draws its brand gradient on the glyph stroke. WhatsApp is its registry green; every other brand its registry colour.
- Hover and keyboard focus: border turns the brand colour and a 1px ring (`box-shadow: 0 0 0 1px <brand>`) appears; the glyph stays. The mode adds no scale (`scaleHover` stays its own control, default 1.1).
- A colour the client sets (icon `iconColour`, row `childIconColour`, hover/border/background siblings, own glyph gradient) wins, as today.

## Mechanism (reuse, no new system)

1. `includes/data/brand-registry.json`: Instagram gains `logoGradient` (a CSS linear-gradient string, the brand's own gradient). Read by `sgs_brand_registry()` and the JS twin.
2. `includes/helpers-brand-glyphs.php::sgs_brand_paint( $brand, $fixed, $mode )`: new third parameter. For `brand-glyph`: `ground`/`border`/`ground_hover` empty, `glyph` = brand colour (empty for the fixed Google mark), `ring` and `border_hover` = brand colour, `gradient` = the entry's `logoGradient`. All slots exist (empty) in every mode so the JS twin and parity test stay exact.
3. `icon/render.php`: accept the mode; `brand_on` true; `show_bg` not forced by it; class `sgs-icon--brand-glyph`; `--sgs-icon-brand-glyph` carries the brand colour (the existing chain puts it below the client's own and the row's colours, so explicit colour wins with no new rule). Hover rule through `sgs_hover_state_rules()` (touch-guarded): border-colour (own/row hover border colour first), box-shadow ring, and neutralising the has-bg flip. Instagram gradient through `sgs_icon_gradient_css()` + `sgs_svg_inject_defs()`, emitted as `stroke:var(--sgs-icon-colour,var(--sgs-si-colour,url(#id)))` so a flat colour wins and an own gradient replaces it.
4. `icon/style.css`: `box-shadow` joins the shape transition list (reduced motion already sets `transition:none`).
5. `helpers-icon.php::sgs_icon_group_context()`, `icon-state.js` (`resolveBrand`, `iconGroupContext`), `icon/edit.js` (canvas slots), `icon/glyph.js` (canvas gradient), `utils/brand-registry.js::brandPaint`: the editor twins. Colour mode options in `icon/inspector.js` and `social-icons/edit.js` gain "Brand colour: logo only" with a help line.
6. `block.json` enum on both blocks.

## Contrast ruling

The ring and hover border are a UI component (3:1 against the ground). Brand colours that cannot reach 3:1 on a white or light ground (WhatsApp green about 1.9:1, Instagram gradient stops, Google blue is fine) keep the brand colour: this is a brand-identity exception on the same footing as the Google Reviews ruling (its colours are Google's, not the theme's). The hover state also changes the glyph-adjacent border AND adds the ring, and the keyboard focus keeps the 2px focus outline of `.sgs-icon__link:focus-visible`, so focus stays visible at 3:1 regardless.

## Tests (PHPUnit, red first)

`tests/php/IconBrandGlyphTest.php` (icon and row renders): Google four-colour mark with no ground; Instagram gradient defs plus var-wrapped stroke rule; WhatsApp `#25D366`; a generic brand (Facebook); hover rule present, wrapped in the `(hover:hover)` guard, with ring and border; no `:hover` outside the guard; explicit `iconColour` wins (the brand glyph variable sits under it, gradient rule yields); `theme` mode unchanged; `brand` mode unchanged; the row default reaches children; no background forced. JS parity test updated for the new paint slots.

## Gates

`npm run build` (PowerShell), `vendor/bin/phpunit`, `node scripts/audit-inline-styling.js --check`, `python scripts/run-gates.py --tier fast`.

## Not done here

No deploy, no DB reseed, no `sites/` edits (the main session changes the Eye Care trees).
