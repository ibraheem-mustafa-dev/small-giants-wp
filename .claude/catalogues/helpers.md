---
doc_type: generated-catalogue
title: Helper and component/atom catalogue
---

# Helper and component/atom catalogue

**GENERATED** by `plugins/sgs-blocks/scripts/generate-helper-catalogue.py`. Do not hand-edit; edits are overwritten.
Refresh: `python plugins/sgs-blocks/scripts/generate-helper-catalogue.py` (`--check` exits 1 if stale).

<!-- HELPER-CATALOGUE:START -->

This section is **GENERATED** by `plugins/sgs-blocks/scripts/generate-helper-catalogue.py`. Do not hand-edit — edits are overwritten. It covers the other half of "what already exists" that the tooling catalogue (`.claude/catalogues/tooling.md`) doesn't: PHP helper FUNCTIONS (not scripts) and JS editor components/atoms. It makes existing helpers discoverable — read this before writing a new helper or component that might already exist.

### PHP helper functions — `includes/helpers-*.php`

Every top-level `function sgs_xxx(...)` across every `helpers-*.php` file, grouped by file, with the one-line purpose from its own docblock (or the adjacent `//` comment when it has no docblock). **UNDOCUMENTED** means neither exists in source — that is a real gap in the code, not a gap in this catalogue; add a docblock rather than inferring a purpose here.

#### `includes/helpers-border-style.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_border_style_allowed` | `function sgs_border_style_allowed(): array` | Every CSS border-style keyword an SGS border may emit. |
| `sgs_border_style_keyword` | `function sgs_border_style_keyword( $raw ): string` | Resolve a stored border-style value to the keyword a width paints with. |
| `sgs_border_box_decls` | `function sgs_border_box_decls( $width_box, $style_raw ): array` | Build the border-style + border-width declarations for a 4-side width box and a stored style. |
| `sgs_border_element_decls` | `function sgs_border_element_decls( array $attributes, string $prefix, string $selector, array $options =…` | Every border declaration one element needs: width, style, colour (flat or gradient, resting and hover) and corner radius at three tiers. |

#### `includes/helpers-box.php` — 12 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_css_length_sanitise` | `function sgs_css_length_sanitise( $value ): string` | Strip a CSS length value down to the safe grammar (digits, letters for the unit, dot, percent) — the shared form of the local… |
| `sgs_css_keyword_sanitise` | `function sgs_css_keyword_sanitise( $value ): string` | Strip a CSS keyword value down to letters + hyphen only (e.g. 'inline-block', 'uppercase') — the shared form of the local… |
| `sgs_box_object_shorthand` | `function sgs_box_object_shorthand( array $box ): ?string` | Build a 4-side CSS shorthand ("top right bottom left") from a box object, filling any unset side with '0'. Returns null when every side is… |
| `sgs_box_object_longhand_list` | `function sgs_box_object_longhand_list( $box, string $family ): array` | Build one longhand declaration per SET side of a padding or margin box object ("padding-top:12px"), in top, right, bottom, left order. An… |
| `sgs_box_object_longhands` | `function sgs_box_object_longhands( $box, string $family ): ?string` | The set sides of a padding or margin box as one declaration block ("padding-top:12px;padding-left:24px"), or null when no side is set, so a… |
| `sgs_corner_object_shorthand` | `function sgs_corner_object_shorthand( $box ): ?string` | Build a 4-CORNER CSS shorthand ("top-left top-right bottom-right bottom-left") from a corner-keyed box object, filling any unset corner… |
| `sgs_corner_object_longhand_list` | `function sgs_corner_object_longhand_list( $box ): array` | Build one border-radius longhand per SET corner of a corner-keyed box object ("border-top-left-radius:20px"), in top-left, top-right… |
| `sgs_corner_object_longhands` | `function sgs_corner_object_longhands( $box ): ?string` | The set corners of a corner-keyed box as one declaration block ("border-top-left-radius:20px;border-bottom-right-radius:4px"), or null when… |
| `sgs_corner_object_property_list` | `function sgs_corner_object_property_list( $box, string $prefix ): array` | Build one custom property per SET corner of a corner-keyed box object ("--sgs-x-radius-top-left:20px"), in top-left, top-right… |
| `sgs_box_object_property_list` | `function sgs_box_object_property_list( $box, string $prefix ): array` | Build one custom property per SET side of a side-keyed box object ("--sgs-x-pad-top:20px"), in top, right, bottom, left order. The… |
| `sgs_border_radius_tiers` | `function sgs_border_radius_tiers( array $attributes ): array` | Resolve a block's `borderRadius` attribute into desktop/tablet/mobile corner objects, shape-agnostic (Phase 2 tier-object migration… |
| `sgs_label_box_css_rule` | `function sgs_label_box_css_rule( array $box, string $selector ): string` | Build the SCOPED CSS for a label-style box on ONE selector. |

#### `includes/helpers-brand-glyphs.php` — 7 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_brand_registry` | `function sgs_brand_registry(): array` | Every registry entry, keyed by slug, in the registry's order. Entries with an unsafe slug or colour are dropped, so a bad edit to the JSON… |
| `sgs_brand_by_slug` | `function sgs_brand_by_slug( string $slug ): ?array` | One registry entry by its slug. |
| `sgs_brand_by_site_info_key` | `function sgs_brand_by_site_info_key( string $key ): ?array` | The registry entry a Site Info key links to. |
| `sgs_brand_by_lucide_name` | `function sgs_brand_by_lucide_name( string $name ): ?array` | The brand a Lucide icon draws, when that icon is a brand's own mark (Instagram's `instagram`). Contact entries (phone, email, address)… |
| `sgs_brand_glyph_svg` | `function sgs_brand_glyph_svg( array $brand, string $class_name = '', int $size = 24, bool $branded = false )…` | A registry glyph as inline SVG, decorative (`aria-hidden`): the caller's text or label names the action. |
| `sgs_brand_paint` | `function sgs_brand_paint( array $brand, bool $fixed_mark = false ): array` | The colours a brand paints an icon with (Bean decision D5): the brand colour as the ground and border, a white glyph when white reaches 3:1… |
| `sgs_whatsapp_glyph_svg` | `function sgs_whatsapp_glyph_svg( string $class_name, int $size = 24 ): string` | The WhatsApp mark from the registry, filled with `currentColor` so CSS sets its colour. Decorative: the caller's own text names the action. |

#### `includes/helpers-brand-logo.php` — 6 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_brand_logo_taxonomy` | `function sgs_brand_logo_taxonomy()` | The brand taxonomy's name, filterable so a site can point every brand surface at its own taxonomy in one place. |
| `sgs_brand_logo_taxonomy_available` | `function sgs_brand_logo_taxonomy_available()` | Whether the brand taxonomy is registered on this site. False when WooCommerce is off, or on a WooCommerce without core Product Brands —… |
| `sgs_brand_logo_media` | `function sgs_brand_logo_media( $term_id )` | Resolve a brand term's thumbnail into the unified media-slot shape that `sgs/brand-strip`'s `logos[]` items already use. |
| `sgs_brand_logo_term_for_product` | `function sgs_brand_logo_term_for_product( $product_id )` | A product's first brand term. |
| `sgs_brand_logo_for_product` | `function sgs_brand_logo_for_product( $product_id )` | Everything a surface needs to print one product's brand: the name, its logo when the brand has one, and the brand archive URL. |
| `sgs_brand_logo_img_markup` | `function sgs_brand_logo_img_markup( array $logo, string $class_name )` | One brand logo as an `<img>`, with the BRAND NAME as its text alternative. |

#### `includes/helpers-button-note.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_button_note_html` | `function sgs_button_note_html( array $attributes ): string` | The note's markup. |

#### `includes/helpers-button-style.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_button_element_line_height` | `function sgs_button_element_line_height( $value ): string` | Sanitise a button line-height: a unitless number or a CSS length. |
| `sgs_button_element_text_align` | `function sgs_button_element_text_align( $value ): string` | Allow-list a button text-align keyword. Used by blocks that emit a `{prefix}TextAlign` rule for their own built-in CTA; the style helper… |
| `sgs_button_element_style_css` | `function sgs_button_element_style_css( array $attrs, string $prefix, string $selector, bool $bg_layer =…` | Build a scoped CSS string (base rule + hover/focus rule) for a built-in button-like element, reading a prefixed attribute set. |

#### `includes/helpers-cart-panel-css.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_cart_panel_css` | `function sgs_cart_panel_css( array $attributes, string $uid, bool $is_drawer ): array` | Scoped CSS for the mini-cart panel's own settings (typography, colours, per-device lengths, padding boxes, shadow, motion), for flyout and… |

#### `includes/helpers-cart-panel.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_cart_trigger_html` | `function sgs_cart_trigger_html( string $mode, string $inner_html, array $args ): string` | Build the cart trigger for the given display mode. |
| `sgs_cart_panel_body_html` | `function sgs_cart_panel_body_html( array $args ): string` | Build the shared mini-cart panel body. |
| `sgs_cart_close_button_html` | `function sgs_cart_close_button_html(): string` | The drawer's close button. It sits in the panel head row (built into `sgs_cart_panel_body_html()` through `$args['close_html']`), so the… |
| `sgs_cart_panel_wrapper_html` | `function sgs_cart_panel_wrapper_html( string $mode, string $body_html, array $args ): string` | Wrap the panel body in the element the display mode's ARIA pattern requires. |

#### `includes/helpers-colour-parse.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_colour_resolve_hex_alpha` | `function sgs_colour_resolve_hex_alpha( string $value ): array` | Resolve a SOLID colour value to a 6-digit hex plus its own alpha (0.0-1.0). |
| `sgs_colour_hex_for_contrast` | `function sgs_colour_hex_for_contrast( string $value ): string` | Resolve a colour attribute as the editor stores it — a palette slug OR any CSS colour the client picked — to a 6-digit hex for contrast… |
| `sgs_split_top_level_commas` | `function sgs_split_top_level_commas( string $value ): array` | Split a comma-separated CSS argument list on TOP-LEVEL commas only — i.e. commas that are not nested inside a function call's parentheses.… |

#### `includes/helpers-colour-variants.php` — 9 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_fill_decls` | `function sgs_fill_decls( array $attributes, array $map ): array` | Build the FILL (background) DECLARATIONS for a block, per state. |
| `sgs_fill_states_css` | `function sgs_fill_states_css( string $selector, array $attributes, array $map ): string` | Convenience wrapper for a block that DOES own its own rule for this variant alone. |
| `sgs_text_decls` | `function sgs_text_decls( array $attributes, array $map ): array` | Build the TEXT DECLARATIONS for a block, per state. |
| `sgs_text_states_css` | `function sgs_text_states_css( string $selector, array $attributes, array $map ): string` | Convenience wrapper for a block that DOES own its own rule for this text-colour row alone — the sgs_fill_states_css() sibling for text.… |
| `sgs_border_states_css` | `function sgs_border_states_css( string $selector, array $attributes, array $map ): string` | Emit the BORDER-colour CSS for a block, both states, at one selector. |
| `sgs_overlay_decls_for` | `function sgs_overlay_decls_for( array $attributes, array $map ): array` | Build the OVERLAY DECLARATIONS for a block, per state. |
| `sgs_shadow_attr` | `function sgs_shadow_attr( string $base, string $part = 'base' ): string` | Derive ONE of a shadow family's attribute names from its base name. |
| `sgs_shadow_attr_map` | `function sgs_shadow_attr_map( string $base, bool $with_hover_shape = false, bool $with_hover_colour = false…` | The full attribute-name map for a shadow family, ready for sgs_shadow_decls(). |
| `sgs_shadow_decls` | `function sgs_shadow_decls( array $attributes, array $map, string $block_name = '' ): array` | Build the SHADOW DECLARATIONS for a block, per state. |

#### `includes/helpers-colour-wcag.php` — 8 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_wcag_relative_luminance` | `function sgs_wcag_relative_luminance( string $hex ): float` | Compute the WCAG 2.1 relative luminance of an sRGB hex colour. |
| `sgs_wcag_contrast_ratio` | `function sgs_wcag_contrast_ratio( string $hex_a, string $hex_b ): float` | WCAG 2.1 contrast ratio between two hex colours (1.0 to 21.0). The JS twin is `src/utils/wcag-contrast.js::calculateContrastRatio`. |
| `sgs_wcag_white_wins_for_luminance` | `function sgs_wcag_white_wins_for_luminance( float $l_bg ): bool` | Whether white beats black for WCAG contrast against a background of the given relative luminance (WCAG 2.1 §1.4.3: ratio =… |
| `sgs_wcag_text_colour_for_bg` | `function sgs_wcag_text_colour_for_bg( string $hex ): string` | Return `#000` or `#fff` — whichever gives the higher WCAG contrast ratio against the supplied background hex colour. |
| `sgs_wcag_preferred_text_colour_for_bg` | `function sgs_wcag_preferred_text_colour_for_bg( string $bg_hex, string $preferred_hex ): string` | Return a PREFERRED foreground colour when it meets WCAG AA (>= 4.5:1) against the given background; otherwise degrade to the binary… |
| `sgs_resolve_palette_hex` | `function sgs_resolve_palette_hex( string $slug, string $fallback = '' ): string` | Resolve a theme.json palette colour to its hex value by slug, reading the MERGED global settings (default → theme → user/wp_global_styles)… |
| `sgs_colour_background_tone` | `function sgs_colour_background_tone( string $value ): string` | Classify a SOLID background colour value as dark or light. |
| `sgs_colour_is_dark_background` | `function sgs_colour_is_dark_background( string $value ): bool` | Whether a SOLID background colour value is dark (see sgs_colour_background_tone()). |

#### `includes/helpers-configurator-pricing.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_configurator_format_minor` | `function sgs_configurator_format_minor( int $minor, int $decimals ): string` | Format a minor-int price as a plain display string (symbol + amount), matching the SSR pattern used across the configurator (wc_price, tags… |
| `sgs_configurator_mode_price` | `function sgs_configurator_mode_price( array $combo, string $mode, int $decimals, string $suffix ): string` | The current-price display string for a combo under a tax-display mode (TAX-UI). |
| `sgs_configurator_mode_regular` | `function sgs_configurator_mode_regular( array $combo, string $mode, int $decimals ): string` | The struck-through regular-price display string for a combo under a tax mode. |
| `sgs_configurator_per_unit_display` | `function sgs_configurator_per_unit_display( array $combo, string $mode, int $decimals, string $template )…` | Per-unit price display string for a combo under a tax mode, e.g. "£1.04 per bar". |

#### `includes/helpers-container-separators.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_container_separators_caps` | `function sgs_container_separators_caps(): array` | What `sgs/container` offers (mirrors block.json `supports.sgs.separators.separators`). |
| `sgs_container_separators_active` | `function sgs_container_separators_active( array $attributes, string $layout ): bool` | Whether this container draws any line: a grid or flex layout with a thickness set. |
| `sgs_container_separators_root` | `function sgs_container_separators_root( array $attributes, string $layout, bool $grid_on_inner ): array` | The class and data attribute the root carries so the runtime fallback finds the list. |
| `sgs_container_separators_css` | `function sgs_container_separators_css( array $attributes, string $layout, string $grid_sel, bool $container =…` | The scoped CSS for the container's separators. |

#### `includes/helpers-container.php` — 8 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_sanitize_grid_template` | `function sgs_sanitize_grid_template( $value )` | Sanitise a CSS grid-template-columns value for safe inline-style emission. |
| `sgs_serialise_box_sides` | `function sgs_serialise_box_sides( $box ): string` | Serialise a 4-side box-object attr ({top,right,bottom,left}) to a CSS padding shorthand string ("top right bottom left"). Neutral: an empty… |
| `sgs_serialise_box_corners` | `function sgs_serialise_box_corners( $box ): string` | Serialise a 4-corner box-object attr ({topLeft,topRight,bottomLeft,bottomRight}) to a CSS border-radius shorthand string. CSS border-radius… |
| `sgs_container_gap_value` | `function sgs_container_gap_value( $gap )` | Resolve a gap attribute value to a safe CSS declaration fragment (the part after "gap:"). |
| `sgs_container_tier_gap` | `function sgs_container_tier_gap( array $attributes, string $tier ): string` | Resolve the effective gap for one device tier, under EITHER responsive model. |
| `sgs_intrinsic_columns_track` | `function sgs_intrinsic_columns_track( int $count, string $gap_value, ?string $basis = null ): string` | Build a track list where the operator's column count is a CEILING, not a fixed number — so columns fall away when content genuinely stops… |
| `sgs_container_tier_min_column_width` | `function sgs_container_tier_min_column_width( array $attributes, string $tier ): ?string` | Resolve the effective intrinsic-columns BASIS (minimum column width) for one device tier, from `sgs/container`'s client-configurable… |
| `sgs_block_wants_intrinsic_columns` | `function sgs_block_wants_intrinsic_columns( $block ): bool` | Does this block type opt in to content-aware column collapse? |

#### `includes/helpers-css-safety.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_css_length_value_preset_slugs` | `function sgs_css_length_value_preset_slugs(): array` | Return the currently-registered WP spacing-preset slugs (e.g. ['10','20', '30','40','50','60']), read live from theme.json via… |
| `sgs_css_length_value` | `function sgs_css_length_value( $value )` | Validate and normalise a CSS length-shaped value for safe inline emission. |
| `sgs_css_single_length_value` | `function sgs_css_single_length_value( $raw ): string` | A SINGLE CSS length, safe to place inside `max()` and `blur()`. |
| `sgs_css_length_value_self_test` | `function sgs_css_length_value_self_test()` | Run every accept/reject/backward-compat case and report an honest count. |

#### `includes/helpers-css-sizing-keyword.php` — 2 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_css_sizing_keyword` | `function sgs_css_sizing_keyword( $value ): string` | Return a CSS intrinsic sizing keyword in canonical form, or '' when the value is not one. |
| `sgs_css_length_or_sizing_keyword` | `function sgs_css_length_or_sizing_keyword( $value ): string` | Sanitise a CSS length, letting the intrinsic sizing keywords through intact. |

#### `includes/helpers-diagram-geometry.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_diagram_fmt` | `function sgs_diagram_fmt( float $value ): string` | Two decimals, trailing zeros dropped (JS twin: fmt()). |
| `sgs_diagram_clamp` | `function sgs_diagram_clamp( $value, float $min, float $max, float $fallback ): float` | Clamp a number, with a fallback for junk input (JS twin: clamp()). |
| `sgs_diagram_dimension_paths` | `function sgs_diagram_dimension_paths( array $dim, float $width, float $height ): array` | Build the SVG path data for one dimension. |

#### `includes/helpers-empty-tab.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_tab_content_is_empty` | `function sgs_tab_content_is_empty( string $html ): bool` | Whether a rendered tab's HTML carries no visible text and no media. |

#### `includes/helpers-global-settings.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_global_custom_setting` | `function sgs_global_custom_setting( string $key )` | The value at `settings.custom.<key>`, or null when it is not set. |

#### `includes/helpers-gradient-tone.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_resolve_palette_gradient` | `function sgs_resolve_palette_gradient( string $slug, string $fallback = '' ): string` | Resolve a theme.json gradient preset to its CSS value by slug, reading the MERGED global settings (default → theme → user), same origin… |
| `sgs_gradient_resolve_value` | `function sgs_gradient_resolve_value( string $value ): string` | Resolve a gradient attribute value to a literal CSS gradient string. |
| `sgs_gradient_tone` | `function sgs_gradient_tone( string $value ): string` | Judge a gradient's tone as the WEIGHTED MEAN luminance of its stops — each stop weighted by the share of the 0-100% line closest to it… |

#### `includes/helpers-grid-item.php` — 7 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_grid_item_cell_filter` | `function sgs_grid_item_cell_filter( bool $under_inner = false ): string` | The `:not()` chain that turns "any direct child" into "a grid cell". |
| `sgs_grid_item_cell_selectors` | `function sgs_grid_item_cell_selectors( string $uid ): array` | The two scoped cell selectors of one grid container instance, each at specificity (0,1,0): `.{uid} > :where(cell)` and `.{uid} >… |
| `sgs_grid_item_settings` | `function sgs_grid_item_settings( array $attributes ): array` | Read the flat (scalar) grid-item attributes. A value of the wrong shape (an array where a string belongs) reads as unset, so a malformed… |
| `sgs_grid_item_border_value` | `function sgs_grid_item_border_value( string $raw ): string` | Resolve a `gridItemBorder` shorthand ("1px solid primary") to a safe CSS `border` value: width and style as written, the colour through… |
| `sgs_grid_item_vars` | `function sgs_grid_item_vars( array $s ): array` | The resting `--sgs-gi-*` declarations from the flat settings (ground, border, shadow, text colour). The background gradient, when valid, is… |
| `sgs_grid_item_needs_scoped_css` | `function sgs_grid_item_needs_scoped_css( array $s ): bool` | Does any grid-item state need a scoped rule (and so a uid)? |
| `sgs_grid_item_state_css` | `function sgs_grid_item_state_css( array $s, string $uid, array $attributes = array(), string $block_name = ''…` | The scoped grid-item state rules at both cell depths: background hover, text-colour gradient and hover, the border-gradient ring, and the… |

#### `includes/helpers-hover-links.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_hover_link_inherit_css` | `function sgs_hover_link_inherit_css( string $selector ): string` | Make links inside `$selector` inherit its hover colour. |

#### `includes/helpers-hover-state.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_hover_guarded_rule` | `function sgs_hover_guarded_rule( string $hover_selector, string $decls ): string` | Wrap a hover-only rule in both guards. |
| `sgs_hover_state_rules` | `function sgs_hover_state_rules( string $selector, string $decls, string $focus = ':focus-visible', string…` | Emit a hover state as a touch-safe PAIR: a guarded hover rule plus an unguarded focus rule carrying the identical declarations. |
| `sgs_hover_media_wrap` | `function sgs_hover_media_wrap( string $rule ): string` | Wrap an ALREADY-BUILT hover rule in the layer-1 media query. |

#### `includes/helpers-icon.php` — 17 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_icon_length_value` | `function sgs_icon_length_value( $raw, int $max_px = 512 ): string` | A size an icon control stored, as one safe CSS length, or ''. |
| `sgs_icon_link_scheme` | `function sgs_icon_link_scheme( string $url ): string` | A link's scheme, lowercase ('tel', 'mailto', 'https'), or '' for a relative link. |
| `sgs_icon_accessible_name` | `function sgs_icon_accessible_name( string $aria_label, string $bound_key, ?array $glyph_brand, string $url )…` | The name a linked icon announces, first match wins: the client's own label; the registry's label for the Site Info key the link is bound to… |
| `sgs_icon_visible_label` | `function sgs_icon_visible_label( string $label_text, string $aria_label, string $bound_key, ?array…` | The text a visible label shows: the client's own label text, else the icon's accessible name (sgs_icon_accessible_name()), so the words a… |
| `sgs_icon_label_position` | `function sgs_icon_label_position( $own, string $group ): string` | Where an icon's visible label sits: its own position, except that an icon left on `end` (the default) inside an `sgs/social-icons` row… |
| `sgs_icon_is_editor_render` | `function sgs_icon_is_editor_render(): bool` | True when the block renders for the editor: an admin screen, or a REST request in the editor's `edit` context by a user who can edit posts… |
| `sgs_icon_group_context` | `function sgs_icon_group_context( $context ): array` | The group defaults a wrapping `sgs/social-icons` hands its `sgs/icon` children through block context… |
| `sgs_icon_group_border_decls` | `function sgs_icon_group_border_decls( $width_box, $style ): array` | The group border a `sgs/social-icons` row gives its icons, as the custom properties icon/style.css reads (`--sgs-si-border-width`… |
| `sgs_icon_outline_shapes` | `function sgs_icon_outline_shapes(): array` | The custom outline shapes (icon plan D2), keyed by slug, in the registry's order: one SVG path each in a `0 0 100 100` viewBox. Read from… |
| `sgs_icon_box_shapes` | `function sgs_icon_box_shapes(): array` | The shapes icon/style.css draws as a box (background and CSS border): the square takes a radius, the circle and pill draw their own. |
| `sgs_icon_shape_slugs` | `function sgs_icon_shape_slugs(): array` | Every `shape` value an icon accepts, box shapes first, then the outlines; `icon/block.json::attributes.shape.enum` lists exactly these… |
| `sgs_icon_is_outline_shape` | `function sgs_icon_is_outline_shape( string $shape ): bool` | **UNDOCUMENTED** |
| `sgs_icon_shape_width_only` | `function sgs_icon_shape_width_only( string $shape ): bool` | **UNDOCUMENTED** |
| `sgs_icon_outline_svg` | `function sgs_icon_outline_svg( string $shape, string $clip_id ): string` | The inline SVG an outline shape draws behind the glyph. Paint comes only from icon/style.css (classes `sgs-icon__outline`… |
| `sgs_icon_outline_stroke` | `function sgs_icon_outline_stroke( $width_box, $style ): array` | The stroke an outline shape draws for a border width box and style (a wrapping row's group border): the same declarations a box border… |
| `sgs_icon_outline_from_border` | `function sgs_icon_outline_from_border( array $border ): array` | An outline shape's stroke, read from the declarations `sgs_border_element_decls()` built for the icon's own border, so the border… |
| `sgs_icon_css_value_tokens` | `function sgs_icon_css_value_tokens( string $value ): array` | A CSS value split on top-level spaces, so `calc(1px + 1px) 0 0 0` gives four tokens. |

#### `includes/helpers-info-toggle.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_render_info_toggle` | `function sgs_render_info_toggle( string $panel_text, string $aria_label = '', string $extra_class = '' )…` | Render an info-toggle button + its (initially hidden) panel. |

#### `includes/helpers-item-effects.php` — 6 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_item_motion_transition` | `function sgs_item_motion_transition( array $attributes ): string` | The `<duration> <easing>` pair every item effect transitions with. |
| `sgs_sibling_dim_css` | `function sgs_sibling_dim_css( string $list_sel, string $item_sel, string $paint_sel, array $attributes )…` | Dim the siblings of the hovered (or keyboard-focused) item in one list. |
| `sgs_label_roll_value` | `function sgs_label_roll_value( $raw ): string` | Validate a `labelRoll` value: '' (off), `up` or `up-scale`. |
| `sgs_label_roll_markup` | `function sgs_label_roll_markup( string $text, string $roll, string $alt_hover = '', string $alt_open = ''…` | A label with its roll copies, or the plain escaped label when the roll is off (no extra DOM for anyone who has not asked for it). |
| `sgs_label_roll_wrap_html` | `function sgs_label_roll_wrap_html( string $safe_html, string $roll ): string` | The roll around label HTML that is already safe (e.g. an icon-list item's kses'd text, which may carry inline formatting). The copy is the… |
| `sgs_label_roll_css` | `function sgs_label_roll_css( string $scope_sel, string $trigger_sel, string $open_sel, array $attributes )…` | The roll's motion, scoped to one block instance. |

#### `includes/helpers-link-source.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_resolve_link_source` | `function sgs_resolve_link_source( string $source, string $typed_url ): array` | Resolve a button's `linkSource` attribute to a final href plus any extra wrapper attributes the source needs on the rendered element. |

#### `includes/helpers-link-underline.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_link_underline_css` | `function sgs_link_underline_css( array $attributes, $prefix, $selector, $paint = '' ): string` | CSS for how the links inside `$selector` are underlined. |

#### `includes/helpers-link.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_link_attributes` | `function sgs_link_attributes( ?array $link ): string` | Resolve an `SgsLinkControl` object attr into a safe HTML attribute string for an `<a>` tag (href + target + rel), ready to interpolate… |

#### `includes/helpers-list-markers.php` — 5 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_list_marker_types` | `function sgs_list_marker_types()` | The allowed `markerType` values (no JSON `enum` on the attribute — blockjson-enum-coerces-invalid-to-default — so callers validate here). |
| `sgs_list_marker_sanitise_type` | `function sgs_list_marker_sanitise_type( $raw, $fallback_type = 'icon' )` | Validate a stored `markerType` value, falling back to a safe default. |
| `sgs_list_marker_element_tag` | `function sgs_list_marker_element_tag( $marker_type )` | The list ROOT tag for a given marker type. `numbered` renders a real `<ol>` so order is conveyed to assistive tech and crawlers; every… |
| `sgs_list_marker_render` | `function sgs_list_marker_render( $marker_type, $icon_html )` | Build the per-item marker markup for one `<li>`. |
| `sgs_icon_list_flatten_menu_blocks` | `function sgs_icon_list_flatten_menu_blocks( array $blocks )` | Flatten resolved nav blocks (from SGS_Nav_Menu_Source::blocks_from_ref()) into `{ text, url }` pairs shaped like an `sgs/icon-list` typed… |

#### `includes/helpers-measured-diagram.php` — 10 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_measured_diagram_box` | `function sgs_measured_diagram_box( $width, $height ): array` | The drawing's own width and height, used as the line SVGs' viewBox and the frame's aspect ratio. Before a drawing is chosen (or when the… |
| `sgs_measured_diagram_pct` | `function sgs_measured_diagram_pct( $value, float $fallback ): float` | A position as a % of the drawing box, cast and clamped to 0–100. |
| `sgs_measured_diagram_pct_tiers` | `function sgs_measured_diagram_pct_tiers( $raw, float $desktop_fallback ): array` | A `{desktop,tablet,mobile}` % position, every present tier clamped to 0–100. An unset desktop takes $desktop_fallback (the line's midpoint… |
| `sgs_measured_diagram_dot_radius` | `function sgs_measured_diagram_dot_radius( $tick_length, float $width ): string` | Radius of a dot end, in viewBox units: half the tick length. The tick length is a % of the drawing width with the same 0–20 clamp and 1.76… |
| `sgs_measured_diagram_length` | `function sgs_measured_diagram_length( $raw ): string` | One CSS length through the shared hardened validator. A bare number is read as pixels, the unit the editor's length control shows first. |
| `sgs_measured_diagram_length_tiers` | `function sgs_measured_diagram_length_tiers( $raw ): array` | A `{desktop,tablet,mobile}` length, every tier through sgs_measured_diagram_length(); an unset or unsafe tier becomes null. |
| `sgs_measured_diagram_dash_decls` | `function sgs_measured_diagram_dash_decls( string $style, string $width ): string` | The guide lines' dash pattern for one stroke width: dashed is a 4:3 dash:gap rhythm of the width, dotted is round-capped zero-length dashes… |
| `sgs_measured_diagram_user_space_gradient` | `function sgs_measured_diagram_user_space_gradient( string $defs, float $width, float $height ): string` | Re-anchor a gradient def from sgs_svg_stroke_gradient() to the drawing. |
| `sgs_diagram_dimension_text_kses` | `function sgs_diagram_dimension_text_kses(): array` | The markup a label's caption or value may carry: simple inline emphasis, plus the bound-value span the `sgs-product/field` binding wraps a… |
| `sgs_diagram_dimension_empty_marker` | `function sgs_diagram_dimension_empty_marker( array $attributes, $block ): string` | The empty bound-value container a size change can fill later. |

#### `includes/helpers-media-element.php` — 5 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_media_element_attr` | `function sgs_media_element_attr( $prefix, $base )` | Build a prefixed media attribute name. |
| `sgs_media_element_stored_attr` | `function sgs_media_element_stored_attr( $block_slug, $prefix, $base )` | Resolve the attribute name a SURFACE actually stores. |
| `sgs_media_element_value` | `function sgs_media_element_value( array $attributes, $name, $want = 'raw' )` | Read a media attribute's value, tolerating every storage SHAPE. |
| `sgs_media_element_scope_class` | `function sgs_media_element_scope_class( $uid, $prefix )` | The per-ELEMENT scope class for one media element on a block. |
| `sgs_media_element_style` | `function sgs_media_element_style( array $attributes, $prefix, $block_slug, $scope_class, array $atoms )` | Every declared atom's custom-property VALUES for one media element, as one scoped CSS rule. |

#### `includes/helpers-media-position.php` — 2 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_media_position_focal_to_css` | `function sgs_media_position_focal_to_css( $focal_point )` | FocalPointPicker {x,y} (floats 0-1) -> CSS "X% Y%" object-position value. Clamped 0-1, rounded 2dp. Returns '' when unset or at the CSS… |
| `sgs_media_position_css` | `function sgs_media_position_css( array $attributes, $prefix, $selector )` | Build a scoped object-fit/object-position CSS rule for one media element. The caller passes its OWN, already-safe selector — this function… |

#### `includes/helpers-media.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_responsive_image` | `function sgs_responsive_image( int $id, string $url, string $alt = '', string $size = 'large', array $attrs =…` | Output a responsive image tag with srcset when a valid attachment ID is available. |
| `sgs_next_background_image_index` | `function sgs_next_background_image_index(): int` | Return the next 1-based index in the PAGE-WIDE background-image render order. |
| `sgs_render_stars` | `function sgs_render_stars( float $rating, int $best_rating = 5, int $size = 20, string $colour_css =…` | Render inline SVG star icons for a given rating value. |
| `sgs_render_media` | `function sgs_render_media( $attrs, $context = '' )` | Render an image or video from a unified SGS media-slot attribute. |

#### `includes/helpers-mega-render.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_mega_render_panel_content` | `function sgs_mega_render_panel_content( int $panel_id, string $context = '' ): ?string` | Resolve a mega panel post ID to its rendered inner HTML, guarding against self-reference recursion + runaway depth. |
| `sgs_mega_render_context` | `function sgs_mega_render_context(): string` | The context of the mega panel currently rendering: '' (bar, or no panel on the stack) or 'drawer'. |
| `sgs_mega_render_item_panel` | `function sgs_mega_render_item_panel( array $item, string $viewall_class, string $context = '' ): ?string` | Render a mega menu item's panel with its "View all" fallback, for either menu fork. One path for the bar and the drawer. |

#### `includes/helpers-motion-easing.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_motion_easing_values` | `function sgs_motion_easing_values(): array` | Every named easing value, in editor order. Mirrors the JSON enums. |
| `sgs_motion_valid_cubic_bezier` | `function sgs_motion_valid_cubic_bezier( string $value ): bool` | Validate a hand-typed `cubic-bezier(x1, y1, x2, y2)` curve. |
| `sgs_motion_easing_css` | `function sgs_motion_easing_css( string $value, string $custom = '', string $fallback = 'ease' ): string` | Resolve a named easing (plus its custom curve) to a CSS easing function. |
| `sgs_motion_ms` | `function sgs_motion_ms( $raw, int $default, int $max = 3000 ): int` | Clamp a duration attribute to 0..$max whole milliseconds. |

#### `includes/helpers-nav-drawer-motion.php` — 5 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_nav_drawer_motion_shapes` | `function sgs_nav_drawer_motion_shapes(): array` | Every `entryAnimation` value. Mirrors the JSON enum of the tier values. |
| `sgs_nav_drawer_motion_keyframes` | `function sgs_nav_drawer_motion_keyframes( string $shape, string $anchor ): array` | The keyframe pair and transform origin for one resolved shape. |
| `sgs_nav_drawer_motion_tier_decls` | `function sgs_nav_drawer_motion_tier_decls( string $shape, string $anchor, bool $grow_any = false ): string` | The custom-property declarations for one tier's shape. |
| `sgs_nav_drawer_motion` | `function sgs_nav_drawer_motion( array $attributes, string $root_sel, $anchor_raw, array $allowed_anchors )…` | Build the drawer's motion CSS, root classes and root data attributes. |
| `sgs_nav_drawer_motion_distance` | `function sgs_nav_drawer_motion_distance( $raw )` | One tier's item travel distance: a bare number is pixels, and negative means the item falls from above. |

#### `includes/helpers-nav-drawer-stagger-shape.php` — 2 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_nav_drawer_stagger_axes` | `function sgs_nav_drawer_stagger_axes(): array` | Every `itemStaggerAxis` tier value, with its (x, y) travel multipliers. |
| `sgs_nav_drawer_stagger_shape` | `function sgs_nav_drawer_stagger_shape( array $attributes, string $root_sel ): array` | The shaped-entrance CSS and class for one drawer. |

#### `includes/helpers-preselect-url.php` — 2 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_preselect_axes_from_url` | `function sgs_preselect_axes_from_url( array $axes ): array` | The requested term slug per axis, keyed by taxonomy. |
| `sgs_preselect_apply_to_manifest` | `function sgs_preselect_apply_to_manifest( array $manifest ): array` | Point a manifest's default at the combination the URL asks for. |

#### `includes/helpers-responsive.php` — 15 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_responsive_sanitise_unit` | `function sgs_responsive_sanitise_unit( $unit )` | Strip a CSS unit down to safe letters/percent only. |
| `sgs_responsive_css_rule` | `function sgs_responsive_css_rule( array $attributes, array $prop_map, $selector )` | Build a scoped responsive CSS rule (base + tablet + mobile) for one or more independent CSS properties on the SAME selector. |
| `sgs_responsive_box_shorthand_rule` | `function sgs_responsive_box_shorthand_rule( array $attributes, $css_prop, array $sides, $unit_attr…` | Build a scoped responsive 4-side shorthand rule (e.g. margin / padding) for one selector. Mirrors the heading block's original wrapper… |
| `sgs_responsive_side_order` | `function sgs_responsive_side_order()` | Canonical side order for box properties (also the CSS shorthand order). |
| `sgs_responsive_normalise_object` | `function sgs_responsive_normalise_object( $raw, $is_box = false )` | Coerce a stored attribute value into the `{desktop,tablet,mobile}` shape. |
| `sgs_responsive_atoms_from_spec` | `function sgs_responsive_atoms_from_spec( array $spec )` | Expand one property spec into a flat list of scalar "atoms". |
| `sgs_responsive_format_atom_value` | `function sgs_responsive_format_atom_value( $raw, $unit, $cast, $transform )` | Format one raw atom value into a CSS value string, or null if unusable. |
| `sgs_responsive_sanitise_css_value` | `function sgs_responsive_sanitise_css_value( $value )` | Sanitise a free-text CSS length/expression value for a scoped <style>. |
| `sgs_emit_responsive_css` | `function sgs_emit_responsive_css( $selector, array $prop_map, array $opts = array() )` | Emit scoped responsive CSS for object-model properties on one selector. |
| `sgs_canonicalise_responsive_attrs` | `function sgs_canonicalise_responsive_attrs( array $attrs )` | Canonicalisation ORACLE for object-model responsive attributes. |
| `sgs_resolve_tier` | `function sgs_resolve_tier( $value, $tier = 'desktop', $default = null )` | Canonical tier-resolver — generalised cascade for both tri-state enums and scalar/null-marker values. Implements the contract: desktop… |
| `sgs_emit_tier_rules` | `function sgs_emit_tier_rules( $uid_selector, $value, $css_on, $css_off = '', $default = 'off' )` | Emit scoped per-tier CSS rules (base + tablet + mobile) for a tri-state ('inherit'\|'on'\|'off') responsive behaviour attribute, resolved… |
| `sgs_emit_tier_rules_map` | `function sgs_emit_tier_rules_map( $uid_selector, $value, array $css_by_value, $css_fallback = '', $default =…` | The general N-value form of {@see sgs_emit_tier_rules()}: emit scoped per-tier CSS for a responsive attribute whose resolved value is one… |
| `sgs_resolve_on_tiers` | `function sgs_resolve_on_tiers( $raw, $on_marker, $default )` | Resolve a `{desktop,tablet,mobile}` responsive object into the list of tiers where the effective value equals $on_marker, via the canonical… |
| `sgs_merge_tri_state_declarations` | `function sgs_merge_tri_state_declarations( $selector, $behaviours, $default = 'off', $on_marker = 'on' )` | Merge several tri-state ('on'/'off'/'inherit') behaviours that may write to the SAME selector into ONE set of declarations per tier, with a… |

#### `includes/helpers-reviews-inline.php` — 7 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_reviews_inline_normalise` | `function sgs_reviews_inline_normalise( $items ): array` | Turn written review items into Places-API-shaped review rows. |
| `sgs_reviews_inline_data` | `function sgs_reviews_inline_data( array $attributes ): array` | The full data object `sgs/google-reviews` renders from, built from block attributes. |
| `sgs_reviews_placeholder_data` | `function sgs_reviews_placeholder_data(): array` | The three sample reviews shown ONLY when an author explicitly picks `dataSource: "placeholder"`. |
| `sgs_reviews_place_id` | `function sgs_reviews_place_id( array $attributes, string $settings_place_id ): string` | The Google place ID to fetch: the block's own, else the site-wide one from the plugin settings. |
| `sgs_reviews_resolve` | `function sgs_reviews_resolve( array $attributes, string $place_id, ?callable $fetcher = null ): ?array` | Decide what `sgs/google-reviews` may show, in order: written, live Google, sample, or nothing. |
| `sgs_reviews_may_emit_schema` | `function sgs_reviews_may_emit_schema( string $source, array $data ): bool` | Whether `LocalBusiness` + `AggregateRating` JSON-LD may be printed for this data. |
| `sgs_reviews_log_missing_attribution` | `function sgs_reviews_log_missing_attribution( array $data ): void` | Log, once per request, that live Places data lacks the fields the Google attribution links need. |

#### `includes/helpers-row-behaviour.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_row_shrink_css` | `function sgs_row_shrink_css( $selector, $padding )` | Build the per-instance "shrunk" vertical-padding CSS for one row. |
| `sgs_block_is_header_essential` | `function sgs_block_is_header_essential( $block_name )` | Is this block type flagged as essential header furniture? |
| `sgs_resolve_row_shrink_hide_target` | `function sgs_resolve_row_shrink_hide_target( $block, $raw_target )` | Validate the stored shrink-hide target against this row's actual children. |
| `sgs_row_shrink_settings_css` | `function sgs_row_shrink_settings_css( $root_sel, array $attributes )` | The row's own shrink settings: an explicit shrunk padding (rowShrinkPadding, per device, all four sides) in place of the proportional… |

#### `includes/helpers-scoped-instance-vars.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_scope_class_for_root` | `function sgs_scope_class_for_root( string $root_tag_html, string $prefix ): string` | Find an existing SGS uid-pattern class (`sgs-<slug>-<8hex>`, the pattern every migrated render.php already emits as its scoping selector… |
| `sgs_append_scoped_var_style` | `function sgs_append_scoped_var_style( string $block_content, string $scope_class, array $declarations )…` | Append a scoped `<style>` rule declaring CSS custom properties on the given scope class, to a block's rendered HTML. No-op when there are… |
| `sgs_extract_root_opening_tag` | `function sgs_extract_root_opening_tag( string $root_and_beyond ): string` | Extract just the root element's OPENING tag from a block-content substring that starts at the real root (i.e. past any leading… |

#### `includes/helpers-scrim.php` — 7 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_scrim_opacity_value` | `function sgs_scrim_opacity_value( $raw )` | Clamp one tier's tint strength to 0..1; anything non-numeric is unset. |
| `sgs_scrim_blur_value` | `function sgs_scrim_blur_value( $raw )` | Sanitise one tier's blur radius. A bare number is pixels. |
| `sgs_scrim_tiers` | `function sgs_scrim_tiers( $raw, callable $formatter )` | Normalise a tier attribute and apply a per-tier formatter. |
| `sgs_scrim_is_visible` | `function sgs_scrim_is_visible( array $opacity, array $blur )` | Whether the scrim paints anything at any device tier. |
| `sgs_scrim_render` | `function sgs_scrim_render( array $attributes, string $uid, array $args )` | Build a block's scrim: its scoped CSS, and queue its HTML for `wp_footer`. |
| `sgs_scrim_queue` | `function sgs_scrim_queue( $uid = null, $html = null )` | Queue (or, with no argument, read) the scrim HTML printed at `wp_footer`. Keyed by uid, so a block rendered twice queues one scrim. |
| `sgs_scrim_print_footer` | `function sgs_scrim_print_footer()` | Print every queued scrim as a direct child of `<body>`. |

#### `includes/helpers-separators-css.php` — 5 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_separators_var_props` | `function sgs_separators_var_props( array $n, array $list ): array` | The per-device custom properties every path reads: the line thickness and the gap, per axis. |
| `sgs_separators_axis_decls` | `function sgs_separators_axis_decls( array $n ): string` | The style and colour custom properties for the active axes (not per device). |
| `sgs_separators_flow_css` | `function sgs_separators_flow_css( array $n, string $list ): string` | The flow path: native gap decorations plus the stylesheet for the runtime overlay. |
| `sgs_separators_css` | `function sgs_separators_css( $raw, array $list, array $caps = array() ): string` | The scoped CSS for one list's separators. |
| `sgs_separators_root_attrs` | `function sgs_separators_root_attrs( string $list_selector = 'self' ): array` | What a flow list's root carries so the runtime can find the list: a class and a `data-sgs-sep-list` value ('self', or a path below the root… |

#### `includes/helpers-separators-hover-css.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_separators_hover_selectors` | `function sgs_separators_hover_selectors( string $item, string $pseudo, array $heads, string $state ): array` | The selectors that repaint one item's leading line. |
| `sgs_separators_swap_hover_css` | `function sgs_separators_swap_hover_css( string $item, string $pseudo, array $heads, string $decls ): string` | A plain colour swap on hover and focus. |
| `sgs_separators_sweep_band` | `function sgs_separators_sweep_band( string $axis, array $a, ?float $angle ): array` | The resting declarations and the hover position of a sweep band. |

#### `includes/helpers-separators-line-css.php` — 2 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_separators_line_geometry` | `function sgs_separators_line_geometry( string $axis ): array` | The logical-property names for one axis of a line. |
| `sgs_separators_line_css` | `function sgs_separators_line_css( array $n, array $list ): string` | The item-drawn rules for a line-mode list. |

#### `includes/helpers-separators.php` — 7 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_separators_axes` | `function sgs_separators_axes(): array` | The two axes a separators object can carry. |
| `sgs_separators_marker_class` | `function sgs_separators_marker_class(): string` | The class a list's root carries when it draws separators on the flow path, so the runtime fallback can find it. |
| `sgs_separators_style` | `function sgs_separators_style( $raw ): string` | A line style keyword. An empty or unknown style paints solid; `none` draws nothing. |
| `sgs_separators_normalise_axis` | `function sgs_separators_normalise_axis( $raw ): ?array` | One axis, sanitised and resolved. |
| `sgs_separators_normalise` | `function sgs_separators_normalise( $raw, array $caps = array() ): array` | The whole setting, sanitised and resolved. |
| `sgs_separators_active` | `function sgs_separators_active( array $normalised ): bool` | Whether a normalised setting draws any line. |
| `sgs_separators_gap_axis` | `function sgs_separators_gap_axis( $raw, string $axis ): string` | One axis of a gap tier value (`<row> <column>`, or one length for both). A value holding a function (`var(--x, 4px)`, `calc(…)`) is used… |

#### `includes/helpers-shadow-dark-css.php` — 5 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_shadow_dark_presets` | `function sgs_shadow_dark_presets(): array` | The theme's shadow presets as one flat list, one entry per slug. |
| `sgs_shadow_dark_original` | `function sgs_shadow_dark_original( string $literal ): string` | The presets' original layers, joined with `, `, exactly as the theme writes them. |
| `sgs_shadow_dark_declarations` | `function sgs_shadow_dark_declarations( bool $refresh = false ): array` | The declaration lists for every preset that has a dark variant, computed once per request. |
| `sgs_shadow_dark_site_colour` | `function sgs_shadow_dark_site_colour(): string` | The site's configured shadow colour (`settings.custom.shadowColour`), for the light reset. |
| `sgs_shadow_dark_preset_css` | `function sgs_shadow_dark_preset_css( string $scope, bool $refresh = false ): string` | The stylesheet text that swaps shadow presets between their original and dark variants. |

#### `includes/helpers-shadow-dark.php` — 6 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_shadow_dark_format_alpha` | `function sgs_shadow_dark_format_alpha( float $value ): string` | Format an opacity as a percentage number with no trailing zeros ("26.4", "20", "13.2"). |
| `sgs_shadow_dark_scale_alpha` | `function sgs_shadow_dark_scale_alpha( float $alpha ): float` | The opacity a site-colour layer takes on a dark background: the original scaled by SGS_SHADOW_DARK_STRENGTH, rounded to one decimal place… |
| `sgs_shadow_dark_colour` | `function sgs_shadow_dark_colour( float $alpha ): string` | The dark-background colour for a scaled opacity: the bare colour at full strength, otherwise a `color-mix()` built here from the constant… |
| `sgs_shadow_dark_ring_layer` | `function sgs_shadow_dark_ring_layer(): string` | The 1px light ring that keeps a raised element readable on a dark background. |
| `sgs_shadow_dark_classify_colour` | `function sgs_shadow_dark_classify_colour( string $colour ): ?array` | Classify a parsed layer's colour text. |
| `sgs_shadow_dark_variant` | `function sgs_shadow_dark_variant( string $literal ): ?string` | The dark variant of one shadow preset literal. |

#### `includes/helpers-shadow-filter.php` — 2 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_shadow_preset_literal` | `function sgs_shadow_preset_literal( string $slug ): string` | The literal shadow value of a theme preset, from the theme's settings. |
| `sgs_shadow_value_to_drop_shadow` | `function sgs_shadow_value_to_drop_shadow( string $composed ): string` | Convert a composed `box-shadow` value into a `filter` value: one `drop-shadow()` per layer. |

#### `includes/helpers-shadow-hover.php` — 7 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_shadow_hover_is_slug` | `function sgs_shadow_hover_is_slug( string $text ): bool` | Is `$text` a bare preset-slug reference — the same rule `sgs_shadow_layers()` uses to recognise one, minus `none` (which never resolves to… |
| `sgs_shadow_hover_raw_map` | `function sgs_shadow_hover_raw_map(): array` | The hover map (`settings.custom.shadowHover`) as slug => hover text, first origin wins. |
| `sgs_shadow_hover_lift_shape` | `function sgs_shadow_hover_lift_shape( string $shape ): ?string` | Lift a custom layered shape (not a preset slug): each OUTER layer's y offset and blur x1.25, rounded to the nearest whole pixel; x, spread… |
| `sgs_shadow_hover_value` | `function sgs_shadow_hover_value( ?string $shape, ?string $colour ): string` | The hover shadow value for a resting shadow (`box-shadow`-ready CSS, or '' for none). |
| `sgs_shadow_lift_enabled` | `function sgs_shadow_lift_enabled( array $attributes, string $block_name = '' ): bool` | Is the automatic lift-on-hover allowed for this block instance? (Design H4/H5.) |
| `sgs_shadow_hover_rules` | `function sgs_shadow_hover_rules( string $selector, string $shape, string $colour, array $attributes, string…` | The complete touch-safe hover RULE for a resting shadow (design H4). |
| `sgs_shadow_style_engine_shape` | `function sgs_shadow_style_engine_shape( string $raw ): string` | Resolve a native WP `style.shadow` value (`supports.shadow`, the five style-engine blocks: card-grid, info-box, process-steps, testimonial… |

#### `includes/helpers-shadow-layers.php` — 9 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_shadow_split_top` | `function sgs_shadow_split_top( string $value, string $sep ): array` | Split on top-level separators only (a linear scanner, never a regex). |
| `sgs_shadow_parse_length` | `function sgs_shadow_parse_length( string $token ): ?float` | Parse one length token: an optional minus, up to 4 digits and 3 decimals, optional `px`. A bare `0` is legal. Anything else (em, %… |
| `sgs_shadow_format_length` | `function sgs_shadow_format_length( float $value ): string` | Format a number as a px length with no trailing zeros ("4px", "0.5px", "0px"). |
| `sgs_shadow_colour_is_safe` | `function sgs_shadow_colour_is_safe( string $css ): bool` | Is a resolved colour safe to emit? Balanced parentheses, at most 3 deep, no comment openers or closers, no `!`, no control characters, and… |
| `sgs_shadow_resolve_colour` | `function sgs_shadow_resolve_colour( string $entry ): ?string` | Resolve ONE colour-list entry (`site`, a palette slug or CSS colour, plus an optional `N%` opacity) to a CSS colour. Opacity below 100… |
| `sgs_shadow_parse_layer` | `function sgs_shadow_parse_layer( string $layer ): ?array` | Parse one shadow layer into fields. `inset` may be first or last (any case). 2 to 4 lengths. An optional single colour token is an embedded… |
| `sgs_shadow_layers` | `function sgs_shadow_layers( ?string $shape, ?string $colour ): string` | Compose a stored shadow (shape text + colour text) into a CSS `box-shadow` value. |
| `sgs_shadow_forced_colours_decl` | `function sgs_shadow_forced_colours_decl(): string` | The forced-colours (high-contrast) fallback. Browsers remove box-shadow in that mode, so an element that depends on its shadow for an edge… |
| `sgs_shadow_box_decls` | `function sgs_shadow_box_decls( ?string $shape, ?string $colour ): array` | The full `box-shadow` declaration set for a stored shadow: the declaration plus its forced-colours fallback. Empty when there is nothing to… |

#### `includes/helpers-site-info-binding.php` — 2 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_bound_site_info_key` | `function sgs_bound_site_info_key( $block, string $attr ): ?string` | The Site Info key an attribute is bound to through the `sgs/site-info` source, or null. |
| `sgs_bound_site_info_is_empty` | `function sgs_bound_site_info_is_empty( $block, string $attr ): bool` | True when an attribute is bound to Site Info and that key makes no link (a link attribute) or holds no value. |

#### `includes/helpers-slider-nav.php` — 10 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_slider_nav_placements` | `function sgs_slider_nav_placements(): array` | The arrow placements, the first being the default. |
| `sgs_slider_nav_paginations` | `function sgs_slider_nav_paginations(): array` | The progress indicators, the first being the default. |
| `sgs_slider_nav_normalise` | `function sgs_slider_nav_normalise( $value, array $allowed ): string` | A stored value when it is one of the allowed ones, otherwise the default (the first). |
| `sgs_slider_nav_classes` | `function sgs_slider_nav_classes( string $placement, string $pagination ): array` | The generic wrapper classes for a placement and a progress indicator. |
| `sgs_slider_nav_directives` | `function sgs_slider_nav_directives( array $directives ): string` | Interactivity directives as attribute markup. Only `data-wp-*` names pass; values are escaped. |
| `sgs_slider_nav_arrow_html` | `function sgs_slider_nav_arrow_html( string $direction, string $block, string $label, array $directives )…` | One arrow button: the block's own element classes beside the generic ones. |
| `sgs_slider_nav_dots_html` | `function sgs_slider_nav_dots_html( int $count, string $block, string $label, string $dot_label, array…` | The dots: one button per item, the first marked current. |
| `sgs_slider_nav_render` | `function sgs_slider_nav_render( array $args ): string` | The whole navigation: rail, arrows, leading slot and dots, in reading order for the placement. |
| `sgs_slider_nav_enqueue_style` | `function sgs_slider_nav_enqueue_style(): void` | Enqueue the shared stylesheet. Called by a slider block's render when its navigation renders. |
| `sgs_slider_nav_editor_assets` | `function sgs_slider_nav_editor_assets(): void` | Editor: the canvas preview is a server render, which never runs the page's enqueue, so the stylesheet is always loaded into the editor… |

#### `includes/helpers-stretched-link.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_stretched_link_active` | `function sgs_stretched_link_active( array $attributes ): bool` | Whether the operator has turned the whole-block link on. |
| `sgs_stretched_link_apply` | `function sgs_stretched_link_apply( $block, string $url, string $label = '' ): bool` | Hand a render-time URL to the `blockLink` extension. |
| `sgs_stretched_link_handover` | `function sgs_stretched_link_handover( $block, array $attributes, string $url, string $label = '' ): bool` | The whole decision in one call: is the toggle on, and did the handover succeed? |

#### `includes/helpers-surface-ground.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_surface_saturate_value` | `function sgs_surface_saturate_value( $raw )` | A whole-number saturate percentage, 0 to 500, or null when nothing is set. |
| `sgs_surface_backdrop_decls` | `function sgs_surface_backdrop_decls( $blur, $saturate = null ): array` | Declarations (no trailing semicolons) for the backdrop filter. |
| `sgs_surface_fill_alpha` | `function sgs_surface_fill_alpha( $fill, $opacity ): string` | A fill colour mixed with transparency, or '' when it cannot be done. |

#### `includes/helpers-surface-tone.php` — 2 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_surface_tone` | `function sgs_surface_tone( array $layers ): string` | Judge what a composed surface looks like from its painted layers, top-down . |
| `sgs_surface_tone_class` | `function sgs_surface_tone_class( array $layers ): string` | The `sgs-on-dark` / `sgs-on-light` marker class for a composed surface, enqueuing the dark-shadow stylesheet when the surface is dark. |

#### `includes/helpers-svg-gradient.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_svg_stroke_gradient` | `function sgs_svg_stroke_gradient( string $gradient_css, string $id, string $target = 'stroke' ): array` | Convert a validated CSS gradient string into SVG gradient-def markup plus the CSS declaration that paints an icon's stroke with it. |
| `sgs_svg_inject_defs` | `function sgs_svg_inject_defs( string $svg_markup, string $defs ): string` | Inject an SVG gradient <defs> block as the first child of an SVG's opening tag. `<defs>` never paints on its own (SVG spec) so this is safe… |
| `sgs_icon_gradient_css` | `function sgs_icon_gradient_css( string $icon_source, string $gradient_css, string $unique_id, string…` | Icon gradient composer — the ONE call site every icon-source-aware block (`sgs/icon`, `sgs/social-icons`' group glyph gradient, and… |
| `sgs_icon_gradient_states_css` | `function sgs_icon_gradient_states_css( string $icon_source, string $base_gradient, string $hover_gradient…` | Resolve BOTH resting + hover icon gradient state in one call and return ready-to-append scoped-CSS rules plus each state's <defs> markup. |

#### `includes/helpers-svg-kses.php` — 1 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_svg_kses_allowed_tags` | `function sgs_svg_kses_allowed_tags(): array` | Returns the wp_kses allowed-tags array for sanitising inline SVG markup. |

#### `includes/helpers-tier-media.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_allowed_svg_tags` | `function sgs_allowed_svg_tags(): array` | The SGS inline-SVG allow-list for `wp_kses()`. |
| `sgs_tier_media_render` | `function sgs_tier_media_render( array $tiers, string $base_class, string $uid, $alt = '', array $extra =…` | Render up to three device tiers of media, each with its own TYPE. |
| `sgs_tier_media_has_source` | `function sgs_tier_media_has_source( array $spec ): bool` | Does a tier spec resolve to something renderable? |
| `sgs_tier_media_toggle_css` | `function sgs_tier_media_toggle_css( array $present, string $base_class, string $uid ): string` | Breakpoint rules that show exactly one tier at any width. |

#### `includes/helpers-tier-queries.php` — 2 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_tier_media_queries` | `function sgs_tier_media_queries( array $tiers, string $extra = '' ): array` | The exact media condition for each named tier (desktop >= 1024, tablet 768 to 1023, mobile <= 767), each optionally narrowed by `$extra`. |
| `sgs_tier_exact_media_css` | `function sgs_tier_exact_media_css( array $tiers, string $rules, string $extra = '' ): string` | Wrap `$rules` so they apply at exactly the given tiers, with no cascade into other tiers. All three tiers and no extra condition: no… |

#### `includes/helpers-tokens.php` — 33 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_attr_has_value` | `function sgs_attr_has_value( $val ): bool` | Determine whether an attribute value is meaningfully set. |
| `sgs_css_value_has_breakout` | `function sgs_css_value_has_breakout( string $value ): bool` | True when a CSS VALUE contains a declaration/rule-breakout or URL-fetch token and must not be emitted into a scoped `<style>` element. |
| `sgs_is_css_colour` | `function sgs_is_css_colour( string $value ): bool` | Determine whether a value is a direct CSS colour rather than a design token slug. |
| `sgs_functional_colour_to_hex` | `function sgs_functional_colour_to_hex( string $value ): string` | Normalise a functional-colour notation — rgb()/rgba()/hsl()/hsla() — to a hex string (6-digit, or 8-digit `#RRGGBBAA` when an alpha < 1 is… |
| `sgs_rgb_to_hex` | `function sgs_rgb_to_hex( array $rgb, string $alpha_tok = '' ): string` | Build a hex string from an RGB triple (each 0-255) + an optional CSS alpha token (0-1 float or a percentage). Emits 8-digit `#RRGGBBAA`… |
| `sgs_css_num_or_pct` | `function sgs_css_num_or_pct( string $tok, float $pct_base ): float` | Resolve a CSS number-or-percentage token. A percentage is taken as a fraction of `$pct_base`; a bare number is returned as-is. |
| `sgs_linear_srgb_to_255` | `function sgs_linear_srgb_to_255( float $c ): int` | Gamma-encode a linear-sRGB channel (0-1) to a clamped 0-255 byte. |
| `sgs_hwb_to_rgb` | `function sgs_hwb_to_rgb( float $h, float $w, float $b ): array` | CSS Color 4 hwb() → RGB (each 0-255). H degrees, W/B percent (0-100). |
| `sgs_oklab_to_rgb` | `function sgs_oklab_to_rgb( float $lightness, float $a, float $b ): array` | OKLab → sRGB (each 0-255). Björn Ottosson's canonical matrices. |
| `sgs_lab_to_rgb` | `function sgs_lab_to_rgb( float $lightness, float $a, float $b ): array` | CIE Lab (D50) → sRGB (each 0-255) — via XYZ(D50) → linear sRGB with the CSS Color 4 Bradford-adapted D50→D65 matrix. |
| `sgs_normalise_css_functional_colours` | `function sgs_normalise_css_functional_colours( string $value ): string` | Normalise EVERY functional-colour occurrence (rgb/rgba/hsl/hsla) EMBEDDED in a compound CSS value string to hex — e.g. a box-shadow `0 2px… |
| `sgs_css_channel_to_255` | `function sgs_css_channel_to_255( string $tok ): int` | Convert an rgb() channel token (0-255 integer or a percentage) to 0-255. |
| `sgs_css_alpha_to_255` | `function sgs_css_alpha_to_255( string $tok ): int` | Convert a CSS alpha token (0-1 float or a percentage) to a 0-255 byte. |
| `sgs_hsl_to_rgb` | `function sgs_hsl_to_rgb( float $h, float $s, float $l ): array` | Convert HSL to RGB (each 0-255). H in degrees, S/L in percent (0-100). |
| `sgs_colour_value` | `function sgs_colour_value( ?string $slug_or_value ): string` | Resolve a colour attribute value to a CSS colour string. |
| `sgs_shadow_value` | `function sgs_shadow_value( ?string $slug_or_value ): string` | Resolve a shadow attribute value to a CSS box-shadow string. |
| `sgs_shadow_value_composed` | `function sgs_shadow_value_composed( ?string $shape, ?string $colour ): string` | Compose a shadow SHAPE (offset-x/offset-y/blur/spread + optional `inset`, no embedded colour — `ShadowControl`'s stored value under the… |
| `sgs_css_gradient_value` | `function sgs_css_gradient_value( ?string $value ): string` | Validate a CSS gradient value for safe emission into a scoped rule / custom property. |
| `sgs_background_paint_value` | `function sgs_background_paint_value( ?string $colour, ?string $gradient ): array` | Resolve a colour attribute + its sibling gradient attribute to the correct `background-*` CSS declaration — Builder 1 of the D636 universal… |
| `sgs_background_paint_decl` | `function sgs_background_paint_decl( ?string $colour, ?string $gradient ): string` | Convenience wrapper around sgs_background_paint_value() that returns the full CSS declaration string (`property:value`, no trailing… |
| `sgs_block_background_layer_css` | `function sgs_block_background_layer_css( string $selector, string $paint_decl, string $hover_paint_decl = ''…` | Move a block's own BLOCK BACKGROUND paint off the element itself onto a `::after` pseudo-element layer, so a sibling text-gradient… |
| `sgs_custom_property_gradient_decls` | `function sgs_custom_property_gradient_decls( string $var_name, string $flat, string $gradient, string…` | Gradient sibling for a colour-valued custom property that has NO stable CSS selector of its own to hang a direct scoped rule on (the shape… |
| `sgs_gradient_overlay_attr` | `function sgs_gradient_overlay_attr( string $base, string $part = 'gradient' ): string` | Derive ONE of a gradient-overlay family's attribute names from its base. |
| `sgs_gradient_overlay_attr_map` | `function sgs_gradient_overlay_attr_map( string $base, ?string $solid = null ): array` | The attribute-key map for a gradient-overlay family. |
| `sgs_overlay_decls` | `function sgs_overlay_decls( ?string $colour, ?string $gradient, $opacity = null, ?string $blend_mode = null…` | Resolve an overlay LAYER's complete CSS declaration set — colour/gradient paint plus its own opacity (D717, 2026-08-21) plus its own blend… |
| `sgs_text_colour_decl` | `function sgs_text_colour_decl( ?string $value ): string` | Resolve a text-colour attribute (flat colour OR gradient string, D636 single-attribute storage) into a bare CSS declaration fragment — no… |
| `sgs_text_colour_gradient_fallback_rule` | `function sgs_text_colour_gradient_fallback_rule( string $selector, ?string $value ): string` | The `@supports not (background-clip: text)` fallback rule that MUST accompany `sgs_text_colour_decl()` whenever its input was a gradient (a… |
| `sgs_resolve_text_colour_or_gradient` | `function sgs_resolve_text_colour_or_gradient( ?string $flat_value, ?string $gradient_value ): string` | Resolve which of a text-colour attribute's two SIBLING values should be used — the flat colour attribute, or its `{attr}Gradient` sibling. |
| `sgs_grid_border_parts` | `function sgs_grid_border_parts( string $value ): array` | Split a `gridItemBorder`-style CSS border SHORTHAND string ("1px solid #ccc") into its width/style/colour parts, order-independent. |
| `sgs_border_gradient_css` | `function sgs_border_gradient_css( string $selector, string $normal_paint, ?string $hover_paint = null, string…` | Universal masked-`::before` gradient-border emitter (D636 border builder, 2026-08-16). `border-color` cannot legally hold a CSS gradient —… |
| `sgs_emit_state_colour_css` | `function sgs_emit_state_colour_css( string $selector, array $decls_normal, array $decls_hover, array…` | Universal per-instance hover/focus-visible colour-state emitter. |
| `sgs_font_size_value` | `function sgs_font_size_value( ?string $slug_or_value ): string` | Resolve a font-size attribute value to a CSS font-size string. |
| `sgs_transition_vars` | `function sgs_transition_vars( array $attributes ): array` | Build CSS custom properties for transition duration and easing. |

#### `includes/helpers-trust-bar-item.php` — 9 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_trust_bar_finite_number` | `function sgs_trust_bar_finite_number( $raw ): bool` | Whether a stored value is a usable number: numeric AND finite. |
| `sgs_trust_bar_icon_stroke_width` | `function sgs_trust_bar_icon_stroke_width( $raw ): float` | Normalise `iconStrokeWidth`. |
| `sgs_trust_bar_icon_bare_size` | `function sgs_trust_bar_icon_bare_size( $raw ): int` | Normalise `iconBareSize` (px). |
| `sgs_trust_bar_number` | `function sgs_trust_bar_number( float $value ): string` | Format a float for CSS without a locale decimal separator or trailing zeros. |
| `sgs_trust_bar_icon_style_vars` | `function sgs_trust_bar_icon_style_vars( array $attributes, string $badge_style ): array` | CSS custom-property declarations for the icon variants, for the wrapper's scoped rule. |
| `sgs_trust_bar_icon_stroke_force_css` | `function sgs_trust_bar_icon_stroke_force_css( array $attributes, string $badge_style, string $uid_scope )…` | Make a non-default stroke width reach every drawn element inside the icon. |
| `sgs_trust_bar_scrub_spacing` | `function sgs_trust_bar_scrub_spacing( $value, int $depth )` | Drop everything from a spacing value that cannot become a CSS length. |
| `sgs_trust_bar_library_icon_svg` | `function sgs_trust_bar_library_icon_svg( string $slug ): string` | SVG for an icon slug (Lucide, WordPress or SGS library), sanitised for output. |
| `sgs_trust_bar_item_css` | `function sgs_trust_bar_item_css( array $attributes, string $root_sel ): string` | Scoped CSS for the badge item's own spacing: `itemGap` (icon to label) and `itemPadding`, both responsive tier objects. |

#### `includes/helpers-trust-bar-marquee.php` — 4 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_trust_bar_marquee_below` | `function sgs_trust_bar_marquee_below( $raw ): int` | Normalise the `autoScrollBelow` attribute to one of the device-tier standards. |
| `sgs_trust_bar_marquee_duration` | `function sgs_trust_bar_marquee_duration( $raw ): float` | Normalise the custom marquee duration in seconds. |
| `sgs_trust_bar_seconds` | `function sgs_trust_bar_seconds( float $seconds ): string` | Format a duration in seconds for CSS ("30s", "12.5s"); locale-independent. |
| `sgs_trust_bar_marquee_css` | `function sgs_trust_bar_marquee_css( string $uid_scope, int $below, float $duration ): string` | Scoped CSS for the marquee options. Empty when neither option is set, so a default block's output is unchanged. |

#### `includes/helpers-typography.php` — 5 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_typography_attr` | `function sgs_typography_attr( $prefix, $base )` | Build a prefixed attribute key. '' + 'FontSize' → 'fontSize'; 'label' + 'FontSize' → 'labelFontSize'. |
| `sgs_font_family_sanitise` | `function sgs_font_family_sanitise( $value ): string` | Sanitise a font-family value for safe CSS interpolation. |
| `sgs_font_family_preset_slugs` | `function sgs_font_family_preset_slugs(): array` | Slugs of every font-family preset the site defines (theme, custom and default origins), cached per request. |
| `sgs_typography_css_rule` | `function sgs_typography_css_rule( array $attributes, $prefix, $selector, $indent_sibling_selector = ''…` | Build a scoped typography CSS rule string (base + responsive) for one element. The caller wraps the return value in a single <style> tag. |
| `sgs_link_colour_css` | `function sgs_link_colour_css( array $attributes, $prefix, $selector )` | Two-state, flat-or-gradient LINK colour for a RichText field whose `allowedFormats` permits `core/link` — a linked selection and the… |

#### `includes/helpers-value-ladder.php` — 3 function(s)

| Function | Signature | Purpose |
|---|---|---|
| `sgs_saving_display` | `function sgs_saving_display( int $anchor_per_unit_pence, int $pack_per_unit_pence, string $framing_mode, bool…` | Plain-text saving label for one row of the comparative value ladder (Spec 27 Part 2 P1). |
| `sgs_value_ladder` | `function sgs_value_ladder( array $combos, ?int $base_pence, string $framing_mode, bool $decoy_enabled, string…` | Build a sorted, deduplicated comparative value ladder for a product's combos (Spec 27 Part 2 P1). |
| `sgs_value_ladder_markup` | `function sgs_value_ladder_markup( string $wrapper_class, array $rows, int $default_pack, bool $decoy_enabled…` | Markup for the comparative value ladder: one <ul> of pack rows (Spec 27 Part 2 P1). |

**67 files, 335 functions.** Regenerate with `python plugins/sgs-blocks/scripts/generate-helper-catalogue.py`.

### JS shared editor components — `src/components/*.js`

One row per file (top-level only, not sub-directories, except the dedicated `media/atoms/` table below). Purpose is the file's own top-of-file JSDoc/comment header — **UNDOCUMENTED** when absent.

| File | Exports | Purpose |
|---|---|---|
| `AnimationControl.js` | `AnimationControl (default)` | Animation selector for block sidebar. |
| `BooleanResponsiveControl.js` | `BooleanResponsiveControl (default)` | BooleanResponsiveControl — a single ToggleControl on Desktop, a 3-way Inherit/On/Off switch on Tablet/Mobile, driven by the… |
| `BorderStyleControl.js` | `BorderStyleControl (default)` | BorderStyleControl — thin SGS wrapper matching WP core's native `BorderControlStylePicker` exactly (Bean-directed, 2026-08-19). |
| `ColumnShapePicker.js` | `ColumnShapePicker (default)`, `weightsToTrack`, `activeShapeKey`, `ColumnShapePicker` | ColumnShapePicker — pick a column SHAPE by clicking a diagram (FR-37-42). |
| `CursorFieldRowControls.js` | `CursorFieldRowControls` | CursorFieldRowControls — shared cursor-reactive-field (FR-38-25) controls for blocks that are NOT on the shared fx ToolsPanel… |
| `DateTimePickerField.js` | `DateTimePickerField (default)` | DateTimePickerField — the SGS standard DATE control (golden-controls.json goldens/input.json `date` row, Bean-approved live… |
| `DesignTokenPicker.js` | `DesignTokenPicker (default)`, `resolveColourToken` | Colour picker that reads the active theme.json palette. |
| `EntranceStaggerControls.js` | `EntranceStaggerControls (default)` | EntranceStaggerControls — when an entrance starts and how blocks cascade. |
| `FieldLabelLayoutPanel.js` | `FieldLabelLayoutPanel (default)` | "Label and headings" panel for SGS form fields: whether the field's label shows or is read only by screen readers, and (for boxes… |
| `FlowingGradientRowControls.js` | `isCssOnlyFlowingGradientVariant`, `FlowingGradientRowControls` | FlowingGradientRowControls — shared "flowing gradient" (`wave-gradient`) controls for blocks that reach the effect via a… |
| `FocalPositionField.js` | `FocalPositionField (default)` | FocalPositionField — the SGS wrapper around WP-native `FocalPointPicker` |
| `GradientCapableColourControl.js` | `GradientCapableColourControl (default)`, `isGradientValue` | GradientCapableColourControl — the text-colour gradient rollout's shared control (D636 Task 1b, "text" builder). |
| `GradientOverlayControl.js` | `GradientOverlayControl (default)`, `gradientOverlayAttrName`, `gradientOverlayAttrKeys` | GradientOverlayControl |
| `GridDotFieldRowControls.js` | `GridDotFieldRowControls` | GridDotFieldRowControls — shared grid-dot field (FR-38-33) controls for blocks that reach the effect via a block-private escape… |
| `index.js` | `ResponsiveControl`, `BooleanResponsiveControl`, `ResponsiveOverride`… | export { default as ResponsiveControl } from './ResponsiveControl'; export { default as BooleanResponsiveControl } from… |
| `InheritedBoxContext.js` | `InheritedBoxContext` | What each side or corner of a box takes from a wider device tier, for the box control inside a `ResponsiveOverride`. The override… |
| `LinkPopoverControl.js` | `LinkPopoverField (default)`, `LinkPopoverContent`, `TARGET_ENUM_OPTIONS` | LinkPopoverControl — the SGS standard LINK control (Spec 35 §2 LINK, promoted from `sgs/button`'s pilot 2026-08-13, Bean-approved… |
| `LinkUnderlineControl.js` | `LinkUnderlineControl (default)` | LinkUnderlineControl — how the links inside a block's text are underlined. |
| `LogicalAlignControl.js` | `LogicalAlignControl (default)`, `LogicalAlignToolbar` | LogicalAlignControl — the one inspector control for a box's horizontal alignment, stored as the logical values `start \| center… |
| `MediaElementControls.js` | `mediaAttrName`, `mediaAttrType`, `mediaAttrKeys`, `mediaStoredAttrName`, `MEDIA_BASES`… | L1 — media attribute NAMING. The contract every later wave inherits. |
| `MediaElementPanel.js` | `MediaElementPanel (default)` | L3 — the media element's DISPATCH layer. |
| `MediaGalleryPicker.js` | `MediaGalleryPicker (default)` | MediaGalleryPicker — shared bulk multi-select media component for SGS blocks. |
| `MediaPicker.js` | `MediaPicker (default)` | MediaPicker — shared media-slot component for SGS blocks. |
| `MediaSizingPanel.js` | `MediaSizingPanel (default)`, `RATIO_OPTIONS` | MediaSizingPanel — the shared "media size & crop" panel (C19, 2026-08-27). |
| `MotionEasingControl.js` | `MotionEasingControl (default)`, `isValidCubicBezier`, `motionEasingCss`… | MotionEasingControl: the shared named-easing picker for nav motion (Wave 3C U-5). One list read by the burger morph, the drawer… |
| `ParticleTrailRowControls.js` | `ParticleTrailRowControls` | ParticleTrailRowControls — shared particle-trail (FR-38-32) controls for blocks that reach the effect via a block-private escape… |
| `ResponsiveBoxControl.js` | `ResponsiveBoxControl (default)`, `ResponsiveBorderRadiusControl`, `BOX_UNITS`… | ResponsiveBoxControl / ResponsiveBorderRadiusControl — shared responsive box-family editor controls (Box-object interface… |
| `ResponsiveBoxControls.js` | `ResponsiveBoxControls (default)` | ResponsiveBoxControls — Spec 37 FR-37-16 per-device spacing + width panel. |
| `ResponsiveControl.js` | `ResponsiveControl (default)` | Responsive breakpoint switcher for block sidebar controls. |
| `ResponsiveLengthControl.js` | `ResponsiveLengthControl (default)` | ResponsiveLengthControl — one per-device CSS length under the global device toggle. |
| `ResponsiveOverride.js` | `ResponsiveOverride (default)` | ResponsiveOverride — SGS-owned per-device override control (Spec 37 FR-37-16). |
| `ResponsiveTriStateControl.js` | `ResponsiveTriStateControl (default)` | ResponsiveTriStateControl — the DP1 tri-state on/off control (Spec 35 T1.2). |
| `RowQuickInsertAppender.js` | `RowQuickInsertAppender (default)` | Promoted quick-insert appender for a freeform row block (site-header-row / site-footer-row). Steering, not gating: the row still… |
| `RowScrollBehaviourControls.js` | `RowScrollBehaviourControls (default)` | RowScrollBehaviourControls — per-row transparent / hide-on-scroll toggles |
| `SavedPostPicker.js` | `SavedPostPicker (default)` | SavedPostPicker: a searchable picker for posts of one non-public custom post type (sgs_form, sgs_choice_flow, ...). |
| `ScaleAxisControl.js` | `ScaleAxisControl (default)` | ScaleAxisControl — 2-axis (X/Y) proportional scale control with a link/unlink toggle (Spec 35A §F.2.3, D637). |
| `ScrimControls.js` | `ScrimControls (default)`, `scrimColourRow` | ScrimControls: the shared inspector controls for a viewport scrim, the see-through layer that dims the page behind an open… |
| `SeparatorAxisRow.js` | `SeparatorAxisRow (default)` | SeparatorAxisRow — one axis of `SgsSeparatorControl`: the per-device thickness beside ONE colour swatch whose popover holds the… |
| `ServerSideRender.js` | `ServerSideRender (default)`, `omitNullish` | ServerSideRender: the SGS drop-in for `@wordpress/server-side-render`. |
| `SgsBooleanField.js` | `SgsBooleanField (default)` | SgsBooleanField — the SGS standard BOOLEAN control (golden-controls.json goldens/input.json `boolean` row, Bean-approved live… |
| `SgsBorderControl.js` | `SgsBorderControl (default)` | SgsBorderControl — the border control PAIR, matching WP core's native `BorderBoxControl` layout (Bean-directed 2026-08-27 Task 0… |
| `SgsBoxControl.js` | `SgsBoxControl (default)` | SgsBoxControl — compact 4-side box editor (padding / margin / border-width), built from native primitives with a hand-aligned row… |
| `SgsColourPanel.js` | `SgsColourPanel (default)` | THE grouped colour panel — D609's "missing half" (amended 2026-08-13, corrected 2026-08-14 per Bean's direct challenge — see… |
| `SgsFreeTextField.js` | `SgsFreeTextField (default)` | SgsFreeTextField — the SGS standard FREE-TEXT / BARE-NUMBER control |
| `SgsLengthControl.js` | `SgsLengthControl (default)` | SgsLengthControl — thin SGS wrapper for a length/unit value (Bean-directed new build, 2026-08-19; same construction pattern… |
| `SgsMultiSelectField.js` | `SgsMultiSelectField (default)` | SgsMultiSelectField — the SGS standard MULTI-SELECT / TOKEN control |
| `SgsSeparatorControl.js` | `SgsSeparatorControl (default)` | SgsSeparatorControl — the one control for the lines drawn between a list's items. |
| `ShadowControl.js` | `ShadowControl (default)`, `shadowAttrName`, `shadowAttrKeys` | ShadowControl — the shared layered box-shadow control. |
| `ShadowLiftControls.js` | `ShadowLiftControls (default)` | ShadowLiftControls: the ONE hover-shadow control (Bean's ruling, 2026-09-24). |
| `ShapeDividerPreview.js` | `ShapeDividerPreview (default)` | Editor-canvas twin of sgs_render_shape_divider(): the top or bottom shape divider of any block routed through… |
| `SpacingControl.js` | `SpacingControl (default)` | Spacing control that reads theme.json spacing presets. |
| `SsrPreviewGuard.js` | `SsrPreviewGuard (default)` | SsrPreviewGuard — replaces `<Disabled>` around `<ServerSideRender>` previews. |
| `starter-look-owned-keys.js` | `deepClone`, `parseExplicitBlocks`, `findExplicitRoot`, `collectOwnedKeys`… | Owned-key derivation for the Starter Look preset control (FR-37-47). |
| `StarterLookPresetControl.js` | `StarterLookPresetControl (default)` | SGS Starter Look preset control (FR-37-47). |
| `SurfaceGroundControls.js` | `SurfaceGroundControls (default)` | SurfaceGroundControls: the shared inspector controls for a frosted surface |
| `SurfaceTreatmentPanel.js` | `isSimpleBackgroundImage`, `SurfaceTreatmentPanel` | SurfaceTreatmentPanel — shared surface-treatment (grain/halftone/duotone) controls for blocks that reach the effect via… |
| `SweepAngleControl.js` | `SweepAngleControl (default)` | SweepAngleControl — the directional sweep angle: one preset SelectControl (UI sugar) plus core's own AnglePickerControl, both… |
| `TypographyControls.js` | `TypographyControls (default)`, `isTieredValue`, `typographyAttrName`… | TypographyControls — shared, uniform typography UI for every SGS block. |

**58 files.**

### JS media atoms — `src/components/media/atoms/*.js`

One row per file (top-level only, not sub-directories, except the dedicated `media/atoms/` table below). Purpose is the file's own top-of-file JSDoc/comment header — **UNDOCUMENTED** when absent.

| File | Exports | Purpose |
|---|---|---|
| `box-shape.control.js` | `control` | `box-shape` atom — CONTROL half (JSX). |
| `box-shape.js` | `normaliseRatio`, `resolveSizingMode`, `validateShape`, `resolveHeight`, `resolveWidth`… | `box-shape` atom — L2b control + disclosure + validator + value-setter. |
| `caption.control.js` | `control` | `caption` atom — CONTROL half (JSX). |
| `caption.js` | `attrKeys`, `validateTag`, `disclosure`, `validate`, `css` | `caption` atom — L2b control + disclosure + validator + value-setter. |
| `focal-point.control.js` | `control` | `focal-point` atom — CONTROL half (JSX). |
| `focal-point.js` | `resolvePosition`, `validate`, `disclosure`, `css` | `focal-point` atom — LOGIC half (L2b value-setter + validator + disclosure). |
| `intrinsic.control.js` | `control` | Atom: INTRINSIC (control half). |
| `intrinsic.js` | `disclosure`, `validate`, `css` | Atom: INTRINSIC (logic half) — the chosen media's own pixel dimensions. |
| `link.control.js` | `control` | `link` atom — CONTROL half (JSX). |
| `link.js` | `attrKeys`, `disclosure`, `validate`, `css` | `link` atom — L2b control + disclosure + validator + value-setter. |
| `meaning.control.js` | `control` | Atom: MEANING (control half) — the editor UI. |
| `meaning.js` | `altBaseFor`, `resolveMediaType`, `disclosure`, `validate`, `css`, `TYPE_VOCABULARY` | Atom: MEANING (logic half) — accessibility text for the media. |
| `media-padding.control.js` | `control` | `media-padding` atom — CONTROL half (JSX). |
| `media-padding.js` | `attrKey`, `sidesToShorthand`, `sideDecls`, `disclosure`, `validate`, `css` | `media-padding` atom — L2b control + disclosure + validator + value-setter. |
| `media-type.control.js` | `control` | `media-type` atom — CONTROL half (JSX-equivalent `control()`, via `createElement()`). |
| `media-type.js` | `validate`, `disclosure`, `css`, `CANONICAL_ENUM`, `TIER_ENUM` | `media-type` atom — LOGIC half (pure: css/validate/disclosure). |
| `motion.control.js` | `control` | `motion` atom — CONTROL half (JSX). |
| `motion.js` | `validateBoolean`, `validateDuration`, `attrKeys`, `validate`, `disclosure`, `css` | `motion` atom — L2b control + disclosure + validator + value-setter. |
| `object-fit.control.js` | `control` | `object-fit` atom — CONTROL half (JSX). |
| `object-fit.js` | `validate`, `disclosure`, `css` | `object-fit` atom — LOGIC half (L2b value-setter + validator + disclosure). |
| `opacity.control.js` | `control` | `opacity` atom — CONTROL half (JSX). |
| `opacity.js` | `attrKeys`, `disclosure`, `validate`, `css` | `opacity` atom — L2b control + disclosure + validator + value-setter. |
| `overlay.control.js` | `control` | `overlay` atom — CONTROL half (JSX). |
| `overlay.js` | `validateGradient`, `resolveColour`, `resolvePaint`, `attrKeys`, `disclosure`… | `overlay` atom — L2b control + disclosure + validator + value-setter. |
| `registry.js` | `basesForAtoms`, `atomsForElement`, `MEDIA_ATOMS`, `MEDIA_ATOM_IDS` | L2b — the ATOM registry. The middle level between names and panels. |
| `shadow.control.js` | `control` | `shadow` atom — CONTROL half (JSX). |
| `shadow.js` | `attrKeys`, `resolveShadow`, `disclosure`, `validate`, `css` | `shadow` atom: L2b control + disclosure + validator + value-setter. |
| `source.control.js` | `pairPickerRow`, `control` | Atom: SOURCE (control half) — the editor UI. |
| `source.js` | `resolveMediaType`, `disclosure`, `validate`, `css`, `TYPE_VOCABULARY` | Atom: SOURCE (logic half) — which media is showing. |
| `svg-presentation.control.js` | `control` | `svg-presentation` atom — CONTROL half (JSX). |
| `svg-presentation.js` | `validatePosition`, `validateAnimation`, `validateSpeed`, `attrKeys`, `disclosure`… | `svg-presentation` atom — L2b control + disclosure + validator + value-setter. |
| `video-behaviour.control.js` | `control` | `video-behaviour` atom — CONTROL half (JSX-equivalent `control()`, via `createElement()`). |
| `video-behaviour.js` | `validate`, `disclosure`, `css` | `video-behaviour` atom — LOGIC half (pure: css/validate/disclosure). |

**33 files.**

<!-- HELPER-CATALOGUE:END -->
