<?php
/**
 * Server-side render for sgs/heading.
 *
 * HeadingRole=heading    - emits the HTML tag from the level attr (h1-h6).
 * HeadingRole=subheading - emits the HTML tag from the subTag attr (p or div).
 *
 * Typography, spacing, colour and wrapper-level controls apply identically
 * for both roles. The subheading role applies CSS-fallback defaults via a
 * BEM modifier class for fontWeight (400) and textColour (text-muted) when
 * the attrs are still at their schema defaults.
 *
 * NO-INLINE (LOCKED per-block no-inline migration contract §A, 2026-07-09):
 * the rendered subtree carries ZERO inline CSS property declarations. Every
 * declaration — wrapper box/border/background/shadow/width/text-align, the WP
 * `color` support, AND the text element's typography — is emitted into the
 * block's OWN scoped `.{uid}` <style> tag. WP styling supports (spacing /
 * color / __experimentalBorder) all declare `__experimentalSkipSerialization`
 * in block.json so get_block_wrapper_attributes() never auto-inlines them.
 *
 * BOX-GROUP (contract §B): padding / margin / border-width are box objects.
 * Base padding/margin/border-radius = WP-native style.spacing.* /
 * style.border.radius objects (emitted scoped via wp_style_engine_get_styles);
 * tiers = paddingTablet/paddingMobile/marginTablet/marginMobile object attrs
 * (scoped @media 1023/767); border-width = SGS custom object attr.
 *
 * @since 2026-05-26  v0.4.0 - single-element refactor (headingRole + content).
 * @since 2026-06-01  v0.5.0 - variantStyle replaced by WP block-styles (is-style-*).
 * @since 2026-07-09  v0.7.0 - 100% no-inline + 100% box-group migration.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused - dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Allowed units whitelist + numeric-length helper.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'sgs_heading_safe_unit' ) ) {
	/**
	 * Sanitise a CSS length unit - falls back to px if the value is not allowed.
	 * Guarded by function_exists to allow multiple includes in one request.
	 *
	 * @param string $unit     User-supplied unit.
	 * @param string $fallback Fallback unit.
	 * @return string          Sanitised unit.
	 */
	function sgs_heading_safe_unit( $unit, $fallback = 'px' ) {
		static $allowed = array( 'px', 'em', 'rem', '%', 'vh', 'vw' );
		$unit           = sanitize_text_field( (string) $unit );
		return in_array( $unit, $allowed, true ) ? $unit : $fallback;
	}
}

if ( ! function_exists( 'sgs_heading_spacing_val' ) ) {
	/**
	 * Convert a raw numeric spacing value + unit string to a CSS length.
	 * Returns empty string for blank or non-numeric input.
	 *
	 * @param string $value Raw attribute value.
	 * @param string $unit  Validated CSS unit.
	 * @return string       CSS length string or empty string.
	 */
	function sgs_heading_spacing_val( $value, $unit ) {
		$trimmed = trim( (string) $value );
		if ( '' === $trimmed ) {
			return '';
		}
		if ( ! preg_match( '/^-?\d+(\.\d+)?$/', $trimmed ) ) {
			return '';
		}
		return $trimmed . $unit;
	}
}

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$heading_role = $attributes['headingRole'] ?? 'heading';
$content      = isset( $attributes['content'] ) ? (string) $attributes['content'] : '';
$level        = $attributes['level'] ?? 'h2';
$sub_tag      = $attributes['subTag'] ?? 'p';
$anchor       = $attributes['anchor'] ?? '';

// Validate enums.
if ( ! in_array( $heading_role, array( 'heading', 'subheading' ), true ) ) {
	$heading_role = 'heading';
}
// Coerce a numeric level (e.g. "3" stored by the editor) to the "hN" string form
// so the in_array allowlist below matches, matching what edit.js already does.
if ( is_numeric( $level ) ) {
	$level = 'h' . absint( $level );
}
if ( ! in_array( $level, array( 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ), true ) ) {
	$level = 'h2';
}
if ( ! in_array( $sub_tag, array( 'p', 'div' ), true ) ) {
	$sub_tag = 'p';
}

// Determine the rendered HTML tag based on role.
$is_subheading = ( 'subheading' === $heading_role );
$rendered_tag  = $is_subheading ? $sub_tag : $level;

// Typography attrs.
$font_family         = $attributes['fontFamily'] ?? '';
$font_size_unit      = $attributes['fontSizeUnit'] ?? 'px';
$font_weight         = $attributes['fontWeight'] ?? '700';
$line_height         = isset( $attributes['lineHeight'] ) ? $attributes['lineHeight'] : null;
$line_height_unit    = $attributes['lineHeightUnit'] ?? 'em';
$letter_spacing      = isset( $attributes['letterSpacing'] ) ? $attributes['letterSpacing'] : null;
$letter_spacing_unit = $attributes['letterSpacingUnit'] ?? 'em';
$text_transform      = isset( $attributes['textTransform'] ) ? $attributes['textTransform'] : '';
$text_colour         = $attributes['textColour'] ?? 'text';
$font_style          = isset( $attributes['fontStyle'] ) ? sanitize_text_field( $attributes['fontStyle'] ) : '';
$text_decoration     = isset( $attributes['textDecoration'] ) ? sanitize_text_field( $attributes['textDecoration'] ) : '';

// Wrapper-level attrs. Box-object interface contract §B: padding/margin are box
// objects — base from WP-native style.spacing.* (skip-serialised, read in step
// 2b), tiers from the paddingTablet/paddingMobile/marginTablet/marginMobile
// object attrs. The flat per-side + {family}Unit attrs are removed.
$background_colour = $attributes['backgroundColour'] ?? '';
$border_colour     = $attributes['borderColour'] ?? '';
$box_shadow        = $attributes['boxShadow'] ?? '';
$box_shadow_hover  = $attributes['boxShadowHover'] ?? '';

$transition_duration_raw = isset( $attributes['transitionDuration'] ) ? absint( $attributes['transitionDuration'] ) : 300;
$transition_duration     = $transition_duration_raw > 0 ? $transition_duration_raw : 300;
$transition_easing_raw   = $attributes['transitionEasing'] ?? 'ease';
$allowed_easings         = array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' );
$transition_easing       = in_array( $transition_easing_raw, $allowed_easings, true ) ? $transition_easing_raw : 'ease';

$hover_scale      = isset( $attributes['hoverScale'] ) && null !== $attributes['hoverScale'] ? (float) $attributes['hoverScale'] : null;
$hover_colour     = $attributes['hoverColour'] ?? '';
$hover_background = $attributes['hoverBackground'] ?? '';

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

$custom_width      = $attributes['customWidth'] ?? '';
$custom_width_unit = sgs_heading_safe_unit( $attributes['customWidthUnit'] ?? 'px' );
$inherit_style     = ! empty( $attributes['inheritStyle'] );

// Text alignment — validated against allowlist; emitted scoped on the wrapper.
$text_align_raw      = isset( $attributes['textAlign'] ) ? sanitize_text_field( $attributes['textAlign'] ) : '';
$allowed_text_aligns = array( 'left', 'center', 'right', 'justify', 'start', 'end' );
$text_align          = in_array( $text_align_raw, $allowed_text_aligns, true ) ? $text_align_raw : '';

// ---------------------------------------------------------------------------
// 2b. Box-object interface contract §1 + security §D sanitisers, plus the box
// objects (border-width / border-radius), base spacing objects, tier objects,
// and the skip-serialised WP colour-support values.
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side/corner value can never break out of its
// declaration. Mirrors sgs/button + sgs/container.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// (border-style / text-transform). Strips everything except letters + hyphen so
// ;{}():digits can never break out of the declaration (contract §D).
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// Border-width — SGS custom OBJECT attr { top, right, bottom, left }, base only
// (no tiers). No WP-native border-width support; colour/style stay scalar attrs.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = $sgs_css_length( $border_width_obj['top'] ?? '' );
$border_width_right  = $sgs_css_length( $border_width_obj['right'] ?? '' );
$border_width_bottom = $sgs_css_length( $border_width_obj['bottom'] ?? '' );
$border_width_left   = $sgs_css_length( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

// Border-radius — WP-native style.border.radius (string = uniform, or an object
// with topLeft/topRight/bottomLeft/bottomRight keys), base only. Skip-serialised
// in block.json → emit scoped via the style engine in step 5.
$base_border_radius = null;
if ( isset( $attributes['style']['border']['radius'] ) ) {
	$radius_raw = $attributes['style']['border']['radius'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$base_border_radius = $radius_raw;
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean   = array();
		$has_any_corner = false;
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
			$radius_clean[ $corner ] = isset( $radius_raw[ $corner ] ) ? $sgs_css_length( $radius_raw[ $corner ] ) : '';
			if ( '' !== $radius_clean[ $corner ] ) {
				$has_any_corner = true;
			}
		}
		if ( $has_any_corner ) {
			$base_border_radius = $radius_clean;
		}
	}
}

// Base padding/margin — WP-native style.spacing.* objects (skip-serialised).
// Kept as-is (string values incl. preset "var:preset|spacing|N" refs) and passed
// straight to the style engine, which formats + sanitises them (contract §B / the
// button reference does exactly this).
$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

// Responsive spacing tiers — SGS object attrs { top, right, bottom, left }.
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// WP `color` support values (skip-serialised in block.json → NOT auto-inlined).
// Custom hex/rgb → emitted scoped via the style engine; preset SLUGS → the
// standard has-* classes re-added manually in step 6.
$style_color_text     = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg       = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$style_color_gradient = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
$preset_text_slug     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// ---------------------------------------------------------------------------
// 3. Build the text element's typography declarations (scoped, NOT inline).
// ---------------------------------------------------------------------------

// font-size (has tablet/mobile tiers) is emitted separately via the responsive
// helper in step 5. The remaining base-only typography goes here — all onto the
// id-scoped text selector, never inline (contract §A).
$text_decls = array();

if ( $text_colour ) {
	$text_decls[] = 'color:' . sgs_colour_value( $text_colour );
}
if ( $font_weight ) {
	$font_weight_safe = preg_replace( '/[^a-zA-Z0-9]/', '', (string) $font_weight );
	if ( '' !== $font_weight_safe ) {
		$text_decls[] = 'font-weight:' . $font_weight_safe;
	}
}
if ( null !== $line_height && '' !== $line_height ) {
	// A converter-lifted unitless line-height stores lineHeightUnit="unitless"
	// so the ratio survives serialisation — emit the bare number.
	$lh_unit      = ( 'unitless' === $line_height_unit ) ? '' : preg_replace( '/[^a-z%]/i', '', (string) $line_height_unit );
	$text_decls[] = 'line-height:' . floatval( $line_height ) . $lh_unit;
}
if ( null !== $letter_spacing && '' !== $letter_spacing ) {
	$ls_unit      = preg_replace( '/[^a-z%]/i', '', (string) $letter_spacing_unit );
	$text_decls[] = 'letter-spacing:' . floatval( $letter_spacing ) . $ls_unit;
}
if ( '' !== $text_transform ) {
	$text_transform_safe = $sgs_css_keyword( $text_transform );
	if ( '' !== $text_transform_safe ) {
		$text_decls[] = 'text-transform:' . $text_transform_safe;
	}
}
if ( $font_family ) {
	// Allow font-name chars (letters, digits, spaces, commas, quotes, hyphen);
	// strip ;{}():% so a font-family value can't break out into a new rule.
	$font_family_safe = preg_replace( '/[^a-zA-Z0-9 ,"\'\-]/', '', (string) $font_family );
	if ( '' !== $font_family_safe ) {
		$text_decls[] = 'font-family:' . $font_family_safe;
	}
}

$allowed_font_styles = array( 'normal', 'italic' );
if ( '' !== $font_style && in_array( $font_style, $allowed_font_styles, true ) ) {
	$text_decls[] = 'font-style:' . $font_style;
}

$allowed_decorations = array( 'none', 'underline', 'line-through' );
if ( '' !== $text_decoration && in_array( $text_decoration, $allowed_decorations, true ) ) {
	$text_decls[] = 'text-decoration:' . $text_decoration;
}

// ---------------------------------------------------------------------------
// 4. Build the wrapper's box/visual declarations (scoped, NOT inline).
// ---------------------------------------------------------------------------

// Contract §A: background / border-style / border-color / box-shadow / width /
// text-align / border-width all move OFF the wrapper `style` attr and into the
// scoped .{uid} rule below. Gated by !inherit_style (inheritStyle suppresses
// block-level wrapper styling and inherits from the parent).
$wrapper_decls = array();

if ( ! $inherit_style ) {
	if ( $background_colour ) {
		$wrapper_decls[] = 'background-color:' . sgs_colour_value( $background_colour );
	}
	// $border_style is allowlist-validated above (stronger than the keyword regex).
	if ( $border_style && 'none' !== $border_style ) {
		$wrapper_decls[] = 'border-style:' . $border_style;
	}
	if ( $border_colour ) {
		$wrapper_decls[] = 'border-color:' . sgs_colour_value( $border_colour );
	}
	if ( $box_shadow ) {
		$wrapper_decls[] = 'box-shadow:' . sgs_shadow_value( $box_shadow );
	}
	if ( '' !== $custom_width ) {
		$cw_val = sgs_heading_spacing_val( $custom_width, $custom_width_unit );
		if ( $cw_val ) {
			$wrapper_decls[] = 'width:' . $cw_val;
		}
	}
	// $text_align is allowlist-validated above.
	if ( '' !== $text_align ) {
		$wrapper_decls[] = 'text-align:' . $text_align;
	}
	// Border-width — SGS custom object attr, base only, hand-built shorthand.
	if ( $has_border_width ) {
		$bwt             = '' !== $border_width_top ? $border_width_top : '0';
		$bwr             = '' !== $border_width_right ? $border_width_right : '0';
		$bwb             = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl             = '' !== $border_width_left ? $border_width_left : '0';
		$wrapper_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	}
}

// ---------------------------------------------------------------------------
// 5. Scoped CSS assembly.
//
// Contract §B3: the heading has NO wrapper <div> — the semantic <h{level}>/<p>
// element IS the block root, carrying both the box/background/border AND the
// typography. Because the root element also carries the anchor `id` (ToC), the
// scoped uid is a CLASS (`.sgs-hdg-{md5}`, container-style), never an `id` —
// so every scoped rule targets the root selector `.{uid}.wp-block-sgs-heading`.
// ---------------------------------------------------------------------------

$uid      = 'sgs-hdg-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-heading';

$scoped_css = array();

// --- Hover states ---
$hover_rules = array();
if ( $hover_colour ) {
	$hover_rules[] = 'color:' . sgs_colour_value( $hover_colour );
}
if ( $hover_background ) {
	$hover_rules[] = 'background-color:' . sgs_colour_value( $hover_background );
}
if ( $box_shadow_hover ) {
	$hover_rules[] = 'box-shadow:' . sgs_shadow_value( $box_shadow_hover );
}
$has_scale = null !== $hover_scale && abs( $hover_scale - 1.0 ) > 0.001;
if ( $has_scale ) {
	$hover_rules[] = 'transform:scale(' . round( $hover_scale, 3 ) . ')';
}

if ( $hover_rules || $has_scale ) {
	$scoped_css[] = "{$root_sel}{transition:all {$transition_duration}ms {$transition_easing};}";
	$scoped_css[] = "@media(prefers-reduced-motion:reduce){{$root_sel}{transition:none !important;transform:none !important;}}";
	if ( $hover_rules ) {
		$scoped_css[] = "{$root_sel}:hover,{$root_sel}:focus-within{" . implode( ';', $hover_rules ) . ';}';
	}
}

// --- Root typography (scoped) — the h-tag IS the text element now. ---
if ( $text_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $text_decls ) . ';}';
}

// --- Root font-size — base + tablet + mobile on the SAME selector (Pattern A)
// so the narrower tier wins by cascade order, never inline. ---
$scoped_css[] = sgs_responsive_css_rule(
	$attributes,
	array(
		array(
			'attr'         => 'fontSize',
			'css'          => 'font-size',
			'unit_default' => $font_size_unit,
			'tablet_attr'  => 'fontSizeTablet',
			'mobile_attr'  => 'fontSizeMobile',
			'cast'         => 'int',
		),
	),
	$root_sel
);

// --- Root box/visual declarations (scoped) ---
if ( $wrapper_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $wrapper_decls ) . ';}';
}

// --- Base spacing (padding/margin), border-radius, and WP colour support —
// skip-serialised in block.json, emitted scoped via the stable core style
// engine (exactly how WP core outputs `layout` support). ---
if ( ! $inherit_style && function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();

	$base_spacing = array();
	if ( ! empty( $base_padding_obj ) ) {
		$base_spacing['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$base_spacing['margin'] = $base_margin_obj;
	}
	if ( ! empty( $base_spacing ) ) {
		$base_style_engine_args['spacing'] = $base_spacing;
	}

	if ( null !== $base_border_radius ) {
		$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
	}

	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( '' !== $style_color_gradient ) {
		$color_args['gradient'] = $style_color_gradient;
	}
	if ( ! empty( $color_args ) ) {
		$base_style_engine_args['color'] = $color_args;
	}

	if ( ! empty( $base_style_engine_args ) ) {
		$base_scoped_styles = wp_style_engine_get_styles(
			$base_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$scoped_css[] = $base_scoped_styles['css'];
		}
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME wrapper selector (contract §B / §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

if ( ! $inherit_style ) {
	$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
	$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
	$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
	$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );

	$tablet_box_decls = array();
	if ( null !== $padding_tab_val ) {
		$tablet_box_decls[] = "padding:{$padding_tab_val}";
	}
	if ( null !== $margin_tab_val ) {
		$tablet_box_decls[] = "margin:{$margin_tab_val}";
	}
	if ( $tablet_box_decls ) {
		$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_box_decls ) . ';}}';
	}

	$mobile_box_decls = array();
	if ( null !== $padding_mob_val ) {
		$mobile_box_decls[] = "padding:{$padding_mob_val}";
	}
	if ( null !== $margin_mob_val ) {
		$mobile_box_decls[] = "margin:{$margin_mob_val}";
	}
	if ( $mobile_box_decls ) {
		$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_box_decls ) . ';}}';
	}
}

// ---------------------------------------------------------------------------
// 6. Build the root element's classes + attributes.
//
// Contract §B3: NO wrapper <div>. The <h{level}>/<p> IS the block root. It
// carries get_block_wrapper_attributes(), the block class `wp-block-sgs-heading`,
// the scoped uid CLASS (`sgs-hdg-{md5}`), and the anchor `id` (ToC). There is no
// separate `__text` child element any more.
// ---------------------------------------------------------------------------

$root_classes = array( 'wp-block-sgs-heading', $uid );

if ( $is_subheading ) {
	$root_classes[] = 'wp-block-sgs-heading--subheading';
}

// Preset colour slugs — the `color` support is skip-serialised, so re-add the
// standard has-* classes manually (they set the colour from the theme palette).
if ( ! $inherit_style ) {
	if ( '' !== $preset_text_slug ) {
		$root_classes[] = 'has-text-color';
		$root_classes[] = 'has-' . $preset_text_slug . '-color';
	}
	if ( '' !== $preset_bg_slug ) {
		$root_classes[] = 'has-background';
		$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
	}
}

// The uid is a CLASS (§B3) so the element's single `id` is free for the anchor
// (ToC target). is-style-* / align* classes are merged in automatically by
// get_block_wrapper_attributes() via the block's className attribute. NO 'style'
// key is passed — the root carries ZERO inline property declarations (contract
// §A); everything is in the scoped <style> above.
$root_attr_args = array(
	'class' => implode( ' ', $root_classes ),
);
if ( $anchor ) {
	$root_attr_args['id'] = $anchor;
}
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

$rendered_tag_escaped = tag_escape( $rendered_tag );
?>
<?php if ( $scoped_css ) : ?>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches SGS_Container_Wrapper).
	// Every value reaching $scoped_css is pre-sanitised ($sgs_css_length /
	// $sgs_css_keyword / allowlists / floatval / wp_style_engine_get_styles /
	// sgs_colour_value / sgs_shadow_value), so no un-sanitised value survives here.
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<<?php echo $rendered_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php echo wp_kses_post( $content ); ?>
</<?php echo $rendered_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
