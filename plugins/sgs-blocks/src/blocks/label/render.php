<?php
/**
 * Server-side render for sgs/label.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/label {attrs} /-->`) produce the
 * expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-section-heading__label`
 * className (and the label text) never reach the deployed page.
 *
 * Render is a faithful PHP port of save.js. Existing static instances on
 * already-published posts continue to round-trip via their stored save
 * HTML; only new (cv2-emitted) instances flow through this renderer.
 *
 * NO-INLINE (LOCKED per-block no-inline migration contract §A, 2026-07-09):
 * the rendered `<span>` carries ZERO inline CSS property declarations. Every
 * declaration is emitted into the block's OWN scoped `.{uid}` <style> tag.
 * The `color`/`spacing` WP supports declare `__experimentalSkipSerialization`
 * in block.json so get_block_wrapper_attributes() never auto-inlines them.
 *
 * BOX-GROUP (contract §B): `padding` is a SGS custom object attr (this block
 * has no WP-native `spacing.padding` support — padding is pill-gated, so it
 * cannot be a plain WP style.spacing.padding value). Tiers = paddingTablet /
 * paddingMobile object attrs (scoped @media 1023/767), pill-gated identically
 * to the base. `margin` IS a WP-native style.spacing.margin object (skip-
 * serialised, scoped via wp_style_engine_get_styles); marginTablet/
 * marginMobile tiers are SGS custom object attrs, NOT pill-gated.
 * `borderRadius` stays a single scalar number (one uniform value, not a
 * 4-corner family — Spec 32 §6.1(c)) but is rendered scoped, never inline.
 *
 * @since 2026-05-16  P-PHASE8-2 render.php audit
 * @since 2026-07-10  No-inline migration (padding object + scoped output).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Security sanitisers (contract §D) — a CSS-keyword sanitiser for free-text
// properties (mirrors sgs/heading + sgs/container). Box/side CSS-length values
// are sanitised inside the shared sgs_label_box_css_rule() helper
// (sgs_css_length_sanitise), so no local length closure is needed here.
// ---------------------------------------------------------------------------

$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$text = $attributes['text'] ?? '';
// User-facing HTML-tag chooser removed (2026-07-05) — the converter never
// emitted this attr; sgs/label always renders a <span>.
$tag_name          = 'span';
$text_colour       = $attributes['textColour'] ?? '';
$background_colour = $attributes['backgroundColour'] ?? '';
$font_family       = $attributes['fontFamily'] ?? '';
$font_size         = $attributes['fontSize'] ?? '';
$font_size_unit    = $sgs_css_keyword( $attributes['fontSizeUnit'] ?? 'px' );
if ( '' === $font_size_unit ) {
	$font_size_unit = 'px';
}
$font_size_tablet = isset( $attributes['fontSizeTablet'] ) ? $attributes['fontSizeTablet'] : null;
$font_size_mobile = isset( $attributes['fontSizeMobile'] ) ? $attributes['fontSizeMobile'] : null;
$font_weight      = $attributes['fontWeight'] ?? '';
$line_height      = $attributes['lineHeight'] ?? '';
$line_height_unit = $attributes['lineHeightUnit'] ?? '';
// Decode the "unitless" sentinel so line-height emits a bare number (e.g. 1.65 not 1.65unitless).
$line_height_unit    = ( 'unitless' === $line_height_unit ) ? '' : $line_height_unit;
$letter_spacing      = $attributes['letterSpacing'] ?? '';
$letter_spacing_unit = $attributes['letterSpacingUnit'] ?? 'px';
$text_transform      = $attributes['textTransform'] ?? '';
$text_decoration     = $attributes['textDecoration'] ?? '';
$border_radius       = $attributes['borderRadius'] ?? '';

$font_style_raw      = isset( $attributes['fontStyle'] ) ? sanitize_text_field( $attributes['fontStyle'] ) : '';
$allowed_font_styles = array( 'normal', 'italic' );
$font_style          = in_array( $font_style_raw, $allowed_font_styles, true ) ? $font_style_raw : '';

$text_align_raw      = isset( $attributes['textAlign'] ) ? sanitize_text_field( $attributes['textAlign'] ) : '';
$allowed_text_aligns = array( 'left', 'center', 'right', 'justify', 'start', 'end' );
$text_align          = in_array( $text_align_raw, $allowed_text_aligns, true ) ? $text_align_raw : '';

// Style-variant detection. Padding / background / radius now paint on VALUE-
// PRESENCE (ungated 2026-07-12): the pill block-styles are one-click convenience
// presets that SET those values, no longer the gate that renders them. The only
// thing still keyed on a variant is the DISPLAY model — when an is-style-* class
// is present the variant's own CSS owns display, so render.php emits none.
$extra_classes     = isset( $attributes['className'] ) ? $attributes['className'] : '';
$has_style_variant = ( false !== strpos( $extra_classes, 'is-style-' ) );
$full_width        = ! empty( $attributes['fullWidth'] );

// Padding — SGS custom object attr { top, right, bottom, left }, base + tiers.
// Ungated 2026-07-12 (value-presence): padding paints whenever a value is set,
// emitted via the shared sgs_label_box_css_rule() helper below.
$padding_obj        = is_array( $attributes['padding'] ?? null ) ? $attributes['padding'] : array();
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();

// Margin — WP-native style.spacing.margin object (skip-serialised → emitted
// scoped via the style engine below), NOT pill-gated. Tiers are SGS custom
// object attrs, also not pill-gated.
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}
$margin_tablet_obj = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// WP `color` support values (skip-serialised in block.json → NOT auto-inlined).
$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// ---------------------------------------------------------------------------
// 3. Build the root element's declarations (scoped, NOT inline).
// ---------------------------------------------------------------------------

$root_decls = array();

if ( $text_colour ) {
	$root_decls[] = 'color:' . sgs_colour_value( $text_colour );
}
// Background, border-radius, padding + the display model are BOX properties,
// emitted below via the shared sgs_label_box_css_rule() helper (the SAME
// renderer the product-card trial tag uses) — never here in $root_decls.
if ( $font_weight ) {
	$font_weight_safe = preg_replace( '/[^a-zA-Z0-9]/', '', (string) $font_weight );
	if ( '' !== $font_weight_safe ) {
		$root_decls[] = 'font-weight:' . $font_weight_safe;
	}
}
if ( '' !== $line_height && null !== $line_height ) {
	$lh_unit      = ( '' === $line_height_unit ) ? '' : $sgs_css_keyword( $line_height_unit );
	$root_decls[] = 'line-height:' . floatval( $line_height ) . $lh_unit;
}
if ( '' !== $letter_spacing && null !== $letter_spacing ) {
	$ls_unit      = $sgs_css_keyword( $letter_spacing_unit );
	$root_decls[] = 'letter-spacing:' . floatval( $letter_spacing ) . $ls_unit;
}
if ( $text_transform ) {
	$text_transform_safe = $sgs_css_keyword( $text_transform );
	if ( '' !== $text_transform_safe ) {
		$root_decls[] = 'text-transform:' . $text_transform_safe;
	}
}
if ( $text_decoration ) {
	// Free-text historically; sanitise as a keyword (letters/hyphen only) —
	// covers the legitimate values ('none', 'underline', 'line-through', etc.).
	$text_decoration_safe = $sgs_css_keyword( $text_decoration );
	if ( '' !== $text_decoration_safe ) {
		$root_decls[] = 'text-decoration:' . $text_decoration_safe;
	}
}
if ( $font_family ) {
	$font_family_safe = preg_replace( '/[^a-zA-Z0-9 ,"\'\-]/', '', (string) $font_family );
	if ( '' !== $font_family_safe ) {
		$root_decls[] = 'font-family:' . $font_family_safe;
	}
}
if ( $font_style ) {
	$root_decls[] = 'font-style:' . $font_style;
}
if ( $text_align ) {
	$root_decls[] = 'text-align:' . $text_align;
}

// ---------------------------------------------------------------------------
// 4. Scoped CSS assembly. uid is a CLASS (this block has no anchor support,
// but the class pattern mirrors sgs/heading/sgs/container so every scoped
// rule targets `.{uid}.wp-block-sgs-label`).
// ---------------------------------------------------------------------------

$uid      = 'sgs-lbl-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-label';

$scoped_css = array();

if ( $root_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $root_decls ) . ';}';
}

// --- Base font-size — base + tablet + mobile on the SAME selector so the
// narrower tier wins by cascade order, never inline. ---
$font_size_css = sgs_responsive_css_rule(
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
if ( '' !== $font_size_css ) {
	$scoped_css[] = $font_size_css;
}

// --- Base margin (WP-native style.spacing.margin, skip-serialised) emitted
// scoped via the stable core style engine. ---
if ( function_exists( 'wp_style_engine_get_styles' ) && ! empty( $base_margin_obj ) ) {
	$base_scoped_styles = wp_style_engine_get_styles(
		array( 'spacing' => array( 'margin' => $base_margin_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// --- BOX (padding base + tiers, radius, background) + DISPLAY model — emitted
// through the shared sgs_label_box_css_rule() helper: the SAME renderer the
// product-card trial tag uses, so label + product-card produce byte-identical
// box CSS (Bean's composite-mirror requirement, R-31-9). Padding + background +
// radius paint on VALUE-PRESENCE (ungated 2026-07-12). ---
$base_padding_shorthand = sgs_box_object_shorthand( $padding_obj );

// A meaningful (non-zero, present) border-radius. A stored 0 is treated as
// "no rounding" and not emitted — keeps a bare eyebrow free of a pointless
// `border-radius:0px` (regression guard: bare eyebrows stay box-free).
$has_radius   = ( '' !== (string) $border_radius && 0 !== intval( $border_radius ) );
$radius_value = $has_radius ? $border_radius : '';

// Box-present = either background channel (native style.color.background OR the
// custom backgroundColour attr), a non-empty base padding, or a meaningful
// border-radius. Drives the display model.
$box_present = ( '' !== $style_color_bg )
	|| ( '' !== $background_colour )
	|| ( null !== $base_padding_shorthand )
	|| $has_radius;

// Display model (contract §C): a bare eyebrow renders display:block (so its
// margin-bottom paints); a boxed label hugs at inline-block; a full-width label
// spans the row (block + width:100%). Suppressed entirely when an is-style-*
// variant class is present — that variant's own CSS owns display.
$label_display   = '';
$label_fullwidth = false;
if ( ! $has_style_variant ) {
	if ( $full_width ) {
		$label_fullwidth = true;
	} elseif ( $box_present ) {
		$label_display = 'inline-block';
	} else {
		$label_display = 'block';
	}
}

$box_css = sgs_label_box_css_rule(
	array(
		'padding'       => $padding_obj,
		'paddingTablet' => $padding_tablet_obj,
		'paddingMobile' => $padding_mobile_obj,
		'radius'        => $radius_value,
		'background'    => $background_colour,
		'display'       => $label_display,
		'fullWidth'     => $label_fullwidth,
	),
	$root_sel
);
if ( '' !== $box_css ) {
	$scoped_css[] = $box_css;
}

// --- Responsive MARGIN tiers — box objects, scoped @media on the SAME selector
// (contract §B2: tablet max-width:1023px, mobile max-width:767px). Margin tiers
// are never gated. (Padding tiers are handled inside the box helper above.) ---
$margin_tab_val = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val = sgs_box_object_shorthand( $margin_mobile_obj );
if ( null !== $margin_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{margin:{$margin_tab_val};}}";
}
if ( null !== $margin_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{margin:{$margin_mob_val};}}";
}

// --- WP colour support (skip-serialised) — custom hex/rgb emitted scoped via
// the style engine; preset SLUGS get the standard has-* classes re-added
// manually in step 5. ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( ! empty( $color_args ) ) {
		$color_scoped_styles = wp_style_engine_get_styles(
			array( 'color' => $color_args ),
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $color_scoped_styles['css'] ) ) {
			$scoped_css[] = $color_scoped_styles['css'];
		}
	}
}

// ---------------------------------------------------------------------------
// 5. Build the root element's classes + attributes.
//
// uid is a CLASS (not an id) — matches the sgs/heading/sgs/container scoped
// pattern. is-style-* / align* classes are merged in automatically by
// get_block_wrapper_attributes() via the block's className attribute. NO
// 'style' key is passed — the root carries ZERO inline property declarations
// (contract §A); every declaration lives in the scoped <style> above.
// ---------------------------------------------------------------------------

$root_classes = array( 'wp-block-sgs-label', $uid );

if ( '' !== $preset_text_slug ) {
	$root_classes[] = 'has-text-color';
	$root_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$root_classes[] = 'has-background';
	$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$wrapper_attrs = get_block_wrapper_attributes(
	array( 'class' => implode( ' ', $root_classes ) )
);

if ( $scoped_css ) :
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D). Every value reaching
	// $scoped_css is pre-sanitised (the box helper's length/keyword sanitisers / $sgs_css_keyword /
	// allowlists / floatval / wp_style_engine_get_styles / sgs_colour_value),
	// so no un-sanitised value survives here.
	?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<?php
printf(
	'<%1$s %2$s>%3$s</%1$s>',
	tag_escape( $tag_name ),
	$wrapper_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_kses_post( $text )
);
