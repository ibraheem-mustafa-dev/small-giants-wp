# Visual diff — sgs/product-card — 2026-07-06

verdict: PASS
first_paint_capture_passed: true

## Change under review

Built-in CTA button functionality: give product-card's BOUND-mode CTA (`.product-card__view` /
`.product-card__add-to-cart`) the same preset-as-seed, editable styling the `sgs/button` block
got (commit 9e6d9622) — WITHOUT modifying the button block (zero regression risk to it).

- **NEW `includes/helpers-button-style.php`** — `sgs_button_element_style_css($attrs, $prefix,
  $selector)`: a reusable emitter for a built-in button element's colour / border-colour /
  border-width / border-style / border-radius / font-weight / font-size / padding / full-width,
  from a prefixed attr set, scoped to a uid selector. Colours via `sgs_colour_value` (esc'd);
  numerics `absint`'d. Empty attrs → no-op. Registered in `render-helpers.php`.
- **product-card/block.json** — 15 `cta*` attrs (preset + colour×6 + border-style/width/radius +
  font-weight/size + paddingY/X + widthType), colour/border seeded to the PRIMARY `BUTTON_PRESETS`
  shape; padding/font-size seeded to the current visual (12/20/15). version 1.16.8 → 1.16.9.
- **product-card/render.php** — emits the CTA `<style>` once per card via the helper, scoped to
  the card's uid + the two CTA classes. **Gated to BOUND mode** (computed AFTER the `'typed'`
  early return) so typed cards ship no dead rule. Cart/configurator/price logic untouched.
- **product-card/style.css** — the hardcoded CTA radius/padding/font-size/font-family were moved
  off `.product-card .sgs-button` into a **`:where(.product-card) .sgs-button`** rule (specificity
  0): TYPED-mode CTAs keep their design defaults; BOUND-mode `cta*` attrs (0,2,0) override them.
  `font-family:'Inter'` dropped entirely — the CTA now inherits the theme font.
- **product-card/edit.js** — "CTA Button Style" panel (bound-mode only): Style-preset dropdown +
  Apply button (maps `BUTTON_PRESETS`→`cta*`), + colour / width / radius / font-size / padding controls.
- **check-dead-controls.js** — recognises the prefixed-helper (`{prefix}Suffix`) consumption pattern.
- **check-hardcoded-render-defaults.js — E11 (selector-aware governance):** a prefixed-helper attr
  (`sgs_button_element_style_css` / `sgs_typography_css_rule`) governs ONLY the selectors the helper
  is called with in render.php (parsed from the call site) — so `ctaBorderRadius`/`ctaPadding*`/
  `ctaFontSize` no longer false-flag the unrelated `.pill`/trial-tag radii. **Native-attr E1/E6
  behaviour unchanged.** Plant-tested both directions (see below). Not baselined — the correct fix.

## Evidence (live homepage / page 8, sandybrown, deployed 2026-07-06)

**No regression (typed CTAs unchanged).** Page 8's product-cards are TYPED mode; their CTAs
("Add to Cart — £10", "Try 3 for £5") compute IDENTICALLY to before via the `:where()` defaults:
`border-radius 10px`, `padding 12px 20px`, `font-size 15px`, `font-family Inter` (theme font),
`background rgb(230,138,149)` coral. The `:where()` refactor is behaviour-neutral for typed cards.

**Gates green + plant-tested.** `npm run build` exit 0: `check-dead-controls OK — 0 net-new`,
`check-hardcoded-render-defaults OK — 0 net-new F3`. Plant-test: a hardcoded
`border-radius:3px; padding:5px 7px; font-size:9px` planted on `.product-card__view` was flagged
as 3 net-new F3 (correctly attributed to ctaBorderRadius / ctaPaddingY,ctaPaddingX / ctaFontSize),
then removed → 0. Confirms the E11 gate still catches real CTA hardcoding (not weakened).

**Bound-mode editability** (the new colour/preset/width/radius/padding/font controls) is not
exercisable on the typed page-8 clone (no WooCommerce-bound product-card present). It is
code-reviewed (spec + quality subagent, no blockers), builds gate-green, and mirrors the proven
`sgs/button` preset-as-seed render model. Live confirmation on a bound product is deferred.

**Zero edits to `sgs/button`** — `git diff --stat plugins/sgs-blocks/src/blocks/button/` empty.
