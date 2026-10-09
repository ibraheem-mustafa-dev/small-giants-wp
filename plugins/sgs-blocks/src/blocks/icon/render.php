<?php
/**
 * Server-side render for the SGS Icon block.
 *
 * Markup: the block root (alignment, Spacing padding and margin, which sit OUTSIDE the shape) holds an optional
 * link (`.sgs-icon__link`, at least 44 x 44px, the shape centred in it, the focus ring on it), which holds the
 * shape (`.sgs-icon__shape`: size, background, border, radius) with the glyph (`.sgs-icon__svg`, `__dashicon` or
 * `__emoji`) centred inside.
 *
 * Shapes: square, circle and pill are the box (background and CSS border); the custom outlines (hexagon, diamond,
 * octagon, star, blob: includes/data/icon-shapes.json) draw an inline `.sgs-icon__outline` SVG behind the glyph whose fill
 * is the background and whose stroke is the border, painted by style.css from the same custom properties. Outlines
 * take no radius, no gradient and one size (width).
 *
 * Colour precedence per slot (icon plan Phase A step 6): the icon's own value, then a wrapping `sgs/social-icons`
 * group default (`--sgs-si-*`), then the brand (when brand colours apply), then the theme role in style.css. This
 * file prints a custom property only for a value the client set, so every later layer can show through.
 *
 * Glyph sources: lucide, brand (the brand registry, includes/data/brand-registry.json), wp-icon, dashicon, emoji,
 * custom (a pasted SVG, re-sanitised here).
 *
 * A link bound to a Site Info key that holds nothing renders nothing for a visitor (step 8); the editor shows it
 * dimmed with a notice instead.
 *
 * Inside an `sgs/social-icons` row (block context, `sgs_icon_group_context()`): the root is a listitem; a key the row's
 * Links checklist unticked renders nothing; colour mode `inherit` takes the row's mode; a square (the default shape)
 * takes the row's shape; the row can switch the background on and give every icon a border, and an icon's own border
 * wins.
 *
 * Visible label (`showLabel`, or the row's group switch): `.sgs-icon__label-text` inside the link, after the shape (start
 * and below are layout classes on the root), its text `labelText` else the accessible name (sgs_icon_visible_label()).
 * The visible text then is the link's name, so the visually hidden name is not printed as well; " (opens in new
 * tab)" stays visually hidden. An unlinked labelled icon wraps the shape and label in `.sgs-icon__inner` and is plain
 * text, not an image. Label colour: own (--sgs-icon-label-colour), the row's (--sgs-si-label-colour), then the icon
 * colour a client set, else the site text colour (style.css).
 *
 * NO-INLINE (Spec 32): every declaration goes into the block's own scoped `<style>`; lengths pass
 * sgs_icon_length_value()'s allowlist, colours sgs_colour_value().
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/wp-icons.php';

// ── Hide when empty (step 8) ─────────────────────────────────────────────────
$sgs_icon_block   = $block;
$bound_link_key   = (string) sgs_bound_site_info_key( is_object( $sgs_icon_block ) || is_array( $sgs_icon_block ) ? $sgs_icon_block : array(), 'linkUrl' );
$is_editor_render = sgs_icon_is_editor_render();
$is_hidden_empty  = '' !== $bound_link_key && sgs_bound_site_info_is_empty( $sgs_icon_block, 'linkUrl' );
if ( $is_hidden_empty && ! $is_editor_render ) {
	return;
}
$group = sgs_icon_group_context( $block->context ?? array() );
if ( $group['in_group'] && '' !== $bound_link_key && in_array( $bound_link_key, $group['hidden'], true ) ) {
	return;
}

// ── Glyph source ─────────────────────────────────────────────────────────────
$icon_source = $attributes['iconSource'] ?? 'lucide';
if ( ! in_array( $icon_source, array( 'lucide', 'brand', 'wp-icon', 'dashicon', 'emoji', 'custom' ), true ) ) {
	$icon_source = 'lucide';
}
$icon_name     = preg_replace( '/[^a-z0-9-]/', '', strtolower( (string) ( $attributes['iconName'] ?? 'star' ) ) );
$brand_name    = preg_replace( '/[^a-z0-9-]/', '', strtolower( (string) ( $attributes['brandName'] ?? '' ) ) );
$wp_icon_name  = preg_replace( '/[^a-z0-9-]/', '', strtolower( (string) ( $attributes['wpIconName'] ?? '' ) ) );
$dashicon_name = preg_replace( '/[^a-z0-9-]/', '', strtolower( (string) ( $attributes['dashiconName'] ?? '' ) ) );
$emoji_char    = trim( wp_strip_all_tags( (string) ( $attributes['emojiChar'] ?? '' ) ) );
// A pasted SVG is re-sanitised here: the editor's sanitiseSvg() is a second layer, never the only one.
$icon_svg_raw = (string) ( $attributes['iconSvg'] ?? '' );
$icon_svg     = '' !== trim( $icon_svg_raw ) ? wp_kses( $icon_svg_raw, sgs_svg_kses_allowed_tags() ) : '';

// The brand the glyph draws: a registry glyph, or a Lucide icon that is a brand's own mark.
$glyph_brand = null;
if ( 'brand' === $icon_source ) {
	$glyph_brand = sgs_brand_by_slug( $brand_name );
} elseif ( 'lucide' === $icon_source ) {
	$glyph_brand = sgs_brand_by_lucide_name( $icon_name );
}
$glyph_kind = 'brand' === $icon_source && null !== $glyph_brand && isset( $glyph_brand['glyph']['svg'] ) ? 'fill' : 'stroke';

// ── Brand colours (step 6, D5) ───────────────────────────────────────────────
$key_brand    = '' !== $bound_link_key ? sgs_brand_by_site_info_key( $bound_link_key ) : null;
$colour_brand = null !== $key_brand && '' !== $key_brand['colour'] ? $key_brand : ( null !== $glyph_brand && '' !== $glyph_brand['colour'] ? $glyph_brand : null );
$colour_mode  = (string) ( $attributes['colourMode'] ?? 'inherit' );
$colour_mode  = in_array( $colour_mode, array( 'inherit', 'theme', 'brand' ), true ) ? $colour_mode : 'inherit';
if ( 'inherit' === $colour_mode && $group['in_group'] ) {
	$colour_mode = $group['colour_mode'];
}
$brand_on    = 'theme' !== $colour_mode && null !== $colour_brand;
$draw_fixed  = $brand_on && 'brand' === $icon_source && null !== $glyph_brand && $glyph_brand['slug'] === $colour_brand['slug'] && ! empty( $glyph_brand['glyphBrand'] );
$brand_paint = $brand_on ? sgs_brand_paint( $colour_brand, $draw_fixed ) : null;

// ── Shape, background, border ────────────────────────────────────────────────
$shape = is_string( $attributes['shape'] ?? null ) ? $attributes['shape'] : 'square';
$shape = in_array( $shape, sgs_icon_shape_slugs(), true ) ? $shape : 'square';
if ( 'square' === $shape && '' !== $group['shape'] ) {
	$shape = $group['shape'];
}
$is_outline = sgs_icon_is_outline_shape( $shape );
$show_bg    = ! empty( $attributes['showBackground'] ) || $group['show_bg'] || $brand_on;

// ── Link ─────────────────────────────────────────────────────────────────────
$link_url    = trim( (string) ( $attributes['linkUrl'] ?? '' ) );
$link_scheme = sgs_icon_link_scheme( $link_url );
$link_target = '_blank' === ( $attributes['linkTarget'] ?? '_self' ) && ! in_array( $link_scheme, array( 'tel', 'mailto' ), true ) ? '_blank' : '_self';
$link_rel    = trim( (string) ( $attributes['linkRel'] ?? '' ) );
if ( '_blank' === $link_target && '' === $link_rel ) {
	$link_rel = 'noopener noreferrer';
}
$aria_label = trim( (string) ( $attributes['ariaLabel'] ?? '' ) );

// ── Visible label ────────────────────────────────────────────────────────────
$show_label     = ! empty( $attributes['showLabel'] ) || $group['show_label'];
$label_position = sgs_icon_label_position( $attributes['labelPosition'] ?? 'end', $group['label_position'] );
$label_text     = $show_label ? sgs_icon_visible_label( (string) ( $attributes['labelText'] ?? '' ), $aria_label, $bound_link_key, $glyph_brand, $link_url ) : '';
$has_label      = '' !== $label_text;

if ( 'dashicon' === $icon_source ) {
	wp_enqueue_style( 'dashicons' );
}

// ── Classes ──────────────────────────────────────────────────────────────────
$uid       = 'sgs-icn-' . substr( md5( wp_json_encode( $attributes ) . $bound_link_key ), 0, 8 );
$root_sel  = '.' . $uid . '.wp-block-sgs-icon';
$shape_sel = $root_sel . ' .sgs-icon__shape';
$link_sel  = $root_sel . ' .sgs-icon__link';

// ── Border (SgsBorderControl's render twin; radius for the square only) ──────
$border = sgs_border_element_decls(
	$attributes,
	'',
	$shape_sel,
	array(
		'colour' => array(
			'base'           => 'borderColour',
			'hover'          => 'borderColourHover',
			'gradient'       => 'borderColourGradient',
			'hover_gradient' => 'borderColourHoverGradient',
		),
		'radius' => true,
	)
);
// Only the square takes a radius (circle and pill draw theirs from style.css): drop any corner a stored value carries.
if ( 'square' !== $shape ) {
	foreach ( array( 'base', 'tablet', 'mobile' ) as $border_tier ) {
		$border[ $border_tier ] = array_values( preg_grep( '/radius\s*:/', $border[ $border_tier ], PREG_GREP_INVERT ) );
	}
}
$has_border   = (bool) preg_grep( '/^border(-(top|right|bottom|left))?-width\s*:/', array_merge( $border['base'], $border['tablet'], $border['mobile'] ) );
$group_border = ! $has_border && $group['border'];

// An outline shape draws its border as the SVG's stroke (sgs_icon_outline_svg()), so the box border prints nothing.
// The stroke is read from the border helper's own declarations (sgs_icon_outline_from_border()): one width per device
// and the same flat colours as a box border, printed as the --sgs-icon-border-colour[-hover] custom properties
// style.css feeds the stroke. Gradients are box shapes only.
$outline_w     = array();
$outline_dash  = 'solid';
$outline_decls = array();
if ( $is_outline ) {
	$stroke       = sgs_icon_outline_from_border( $border );
	$outline_w    = $stroke['width'];
	$outline_dash = $stroke['dash'];
	$has_border   = array() !== $outline_w;
	if ( ! $has_border && ! $stroke['none'] && $group['border'] ) {
		$group_stroke = sgs_icon_outline_stroke( $group['border_width'], $group['border_style'] );
		if ( '' !== $group_stroke['width'] ) {
			$outline_w['desktop'] = $group_stroke['width'];
			$outline_dash         = $group_stroke['dash'];
		}
	}
	$group_border = ! $has_border && array() !== $outline_w;
	if ( $has_border && '' !== $stroke['colour'] ) {
		$outline_decls[] = '--sgs-icon-border-colour:' . $stroke['colour'];
	}
	if ( $has_border && '' !== $stroke['hover'] ) {
		$outline_decls[] = '--sgs-icon-border-colour-hover:' . $stroke['hover'];
	}
	if ( isset( $outline_w['desktop'] ) ) {
		$outline_decls[] = '--sgs-icon-outline-w:' . $outline_w['desktop'];
	}
	$border = array(
		'base'   => array(),
		'tablet' => array(),
		'mobile' => array(),
		'hover'  => array(),
		'rules'  => array(),
	);
}

$icon_align = (string) ( $attributes['iconAlign'] ?? 'start' );
$icon_align = in_array( $icon_align, array( 'start', 'center', 'end' ), true ) ? $icon_align : 'start';
$classes    = array( 'sgs-icon', 'sgs-icon--source-' . $icon_source, 'sgs-icon--shape-' . $shape, $uid );
if ( $show_bg ) {
	$classes[] = 'sgs-icon--has-bg';
}
if ( $show_bg || $has_border || $group_border ) {
	$classes[] = 'sgs-icon--boxed';
}
if ( $group_border && ! $is_outline ) {
	$classes[] = 'sgs-icon--group-border';
}
if ( $is_outline ) {
	$classes[] = 'sgs-icon--outline';
	if ( array() !== $outline_w && 'solid' !== $outline_dash ) {
		$classes[] = 'sgs-icon--outline-' . $outline_dash;
	}
}
if ( $brand_on ) {
	$classes[] = 'sgs-icon--brand';
}
// A wrapping row's group glyph gradient skips an icon with a colour of its own and a filled mark.
if ( '' !== (string) ( $attributes['iconColour'] ?? '' ) || '' !== (string) ( $attributes['iconColourGradient'] ?? '' ) ) {
	$classes[] = 'sgs-icon--own-colour';
}
if ( 'fill' === $glyph_kind ) {
	$classes[] = 'sgs-icon--mark';
}
if ( ! empty( $attributes['iconFill'] ) && 'fill' !== $glyph_kind && in_array( $icon_source, array( 'lucide', 'brand', 'wp-icon', 'custom' ), true ) ) {
	$classes[] = 'sgs-icon--fill';
}
if ( 'start' !== $icon_align ) {
	$classes[] = 'sgs-icon--align-' . $icon_align;
}
if ( $is_hidden_empty ) {
	$classes[] = 'sgs-icon--hidden-empty';
}
if ( $has_label ) {
	$classes[] = 'sgs-icon--has-label';
	if ( 'end' !== $label_position ) {
		$classes[] = 'sgs-icon--label-' . $label_position;
	}
	// A wrapping row's group label gradient skips an icon with a label colour of its own.
	if ( '' !== (string) ( $attributes['labelColour'] ?? '' ) || '' !== (string) ( $attributes['labelColourGradient'] ?? '' ) ) {
		$classes[] = 'sgs-icon--own-label-colour';
	}
}

// ── Root custom properties: sizes, own colours, brand colours, motion ────────
$root_decls = array();
$tier_decls = array(
	'tablet' => array(),
	'mobile' => array(),
);

$icon_size_tiers  = sgs_responsive_normalise_object( $attributes['iconSize'] ?? null );
$shape_size_tiers = sgs_responsive_normalise_object( $attributes['shapeSize'] ?? null );
$label_gap_tiers  = $has_label ? sgs_responsive_normalise_object( $attributes['labelGap'] ?? null ) : array();
$sizes_linked     = ! array_key_exists( 'shapeSizeLinked', $attributes ) || ! empty( $attributes['shapeSizeLinked'] );
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
	$decls     = array();
	$icon_size = sgs_icon_length_value( $icon_size_tiers[ $tier ] ?? '', 512 );
	if ( '' !== $icon_size ) {
		$decls[] = '--sgs-icon-size:' . $icon_size;
	}
	$box     = is_array( $shape_size_tiers[ $tier ] ?? null ) ? $shape_size_tiers[ $tier ] : array();
	$shape_w = sgs_icon_length_value( $box['width'] ?? '', 640 );
	$shape_h = sgs_icon_shape_width_only( $shape ) || $sizes_linked ? '' : sgs_icon_length_value( $box['height'] ?? '', 640 );
	if ( '' !== $shape_w ) {
		$decls[] = '--sgs-icon-shape-w:' . $shape_w;
	}
	if ( '' !== $shape_h ) {
		$decls[] = '--sgs-icon-shape-h:' . $shape_h;
	}
	$label_gap = sgs_icon_length_value( $label_gap_tiers[ $tier ] ?? '', 640 );
	if ( '' !== $label_gap ) {
		$decls[] = '--sgs-icon-label-gap:' . $label_gap;
	}
	if ( 'desktop' !== $tier && isset( $outline_w[ $tier ] ) ) {
		$decls[] = '--sgs-icon-outline-w:' . $outline_w[ $tier ];
	}
	if ( 'desktop' === $tier ) {
		$root_decls = $decls;
	} else {
		$tier_decls[ $tier ] = $decls;
	}
}
$root_decls = array_merge( $root_decls, $outline_decls );

// Own colours: a custom property only for a value the client set.
$own_colours = array(
	'iconColour'            => '--sgs-icon-colour',
	'iconColourHover'       => '--sgs-icon-colour-hover',
	'backgroundColour'      => '--sgs-icon-bg',
	'backgroundColourHover' => '--sgs-icon-bg-hover',
);
if ( $has_label ) {
	$own_colours['labelColour']      = '--sgs-icon-label-colour';
	$own_colours['labelColourHover'] = '--sgs-icon-label-colour-hover';
}
foreach ( $own_colours as $attr => $property ) {
	$value = sgs_colour_value( is_string( $attributes[ $attr ] ?? null ) ? $attributes[ $attr ] : '' );
	if ( '' !== $value ) {
		$root_decls[] = $property . ':' . $value;
	}
}
// An own flat background (resting or hover) hides a wrapping row's group gradient in that state.
if ( '' !== (string) ( $attributes['backgroundColour'] ?? '' ) ) {
	$root_decls[] = '--sgs-icon-bg-image:none';
}
if ( '' !== (string) ( $attributes['backgroundColourHover'] ?? '' ) ) {
	$root_decls[] = '--sgs-icon-bg-hover-image:none';
}

if ( null !== $brand_paint ) {
	$brand_slots = array(
		'ground'       => '--sgs-icon-brand-ground',
		'glyph'        => '--sgs-icon-brand-glyph',
		'border'       => '--sgs-icon-brand-border',
		'ground_hover' => '--sgs-icon-brand-ground-hover',
		'glyph_hover'  => '--sgs-icon-brand-glyph-hover',
	);
	foreach ( $brand_slots as $slot => $property ) {
		$value = sgs_colour_value( $brand_paint[ $slot ] );
		if ( '' !== $value ) {
			$root_decls[] = $property . ':' . $value;
		}
	}
}

$icon_rotate = is_numeric( $attributes['iconRotate'] ?? null ) ? max( -360.0, min( 360.0, (float) $attributes['iconRotate'] ) ) : 0.0;
if ( abs( $icon_rotate ) > 0.001 ) {
	$root_decls[] = '--sgs-icon-rotate:' . round( $icon_rotate, 2 ) . 'deg';
}
$hover_scale = is_numeric( $attributes['scaleHover'] ?? null ) ? max( 1.0, min( 1.5, (float) $attributes['scaleHover'] ) ) : 1.1;
if ( abs( $hover_scale - 1.1 ) > 0.0001 ) {
	$root_decls[] = '--sgs-icon-hover-scale:' . round( $hover_scale, 3 );
}
$hover_opacity = is_numeric( $attributes['opacityHover'] ?? null ) ? max( 0.0, min( 1.0, (float) $attributes['opacityHover'] ) ) : 0.0;
if ( $hover_opacity > 0 ) {
	$root_decls[] = '--sgs-icon-opacity-hover:' . number_format( $hover_opacity, 2 );
}
$text_align = $attributes['textAlign'] ?? '';
if ( in_array( $text_align, array( 'left', 'center', 'right', 'justify' ), true ) ) {
	$root_decls[] = 'text-align:' . $text_align;
}

$scoped_css = array();
if ( $root_decls ) {
	$scoped_css[] = $root_sel . '{' . implode( ';', $root_decls ) . ';}';
}

// ── Gradients: background (box shapes only) and glyph ────────────────────────
if ( $show_bg && ! $is_outline ) {
	$bg_gradient       = sgs_css_gradient_value( (string) ( $attributes['backgroundColourGradient'] ?? '' ) );
	$bg_hover_gradient = sgs_css_gradient_value( (string) ( $attributes['backgroundColourHoverGradient'] ?? '' ) );
	if ( '' !== $bg_gradient ) {
		$scoped_css[] = $shape_sel . '{background-image:' . $bg_gradient . ';}';
	}
	if ( '' !== $bg_hover_gradient ) {
		$scoped_css[] = sgs_hover_state_rules( $link_sel, 'background-image:' . $bg_hover_gradient, ':focus-visible', ' .sgs-icon__shape' );
	} elseif ( '' !== $bg_gradient && '' !== (string) ( $attributes['backgroundColourHover'] ?? '' ) ) {
		$scoped_css[] = sgs_hover_state_rules( $link_sel, 'background-image:none', ':focus-visible', ' .sgs-icon__shape' );
	}
}

$gradient_source = 'brand' === $icon_source ? ( 'fill' === $glyph_kind ? 'custom' : 'lucide' ) : $icon_source;
$glyph_suffix    = 'dashicon' === $icon_source ? ' .sgs-icon__dashicon' : ( 'emoji' === $icon_source ? ' .sgs-icon__emoji' : ' .sgs-icon__svg svg' );
$icon_grad       = sgs_icon_gradient_css( $gradient_source, (string) ( $attributes['iconColourGradient'] ?? '' ), $uid . '-ig', $root_sel . $glyph_suffix );
$icon_grad_hover = sgs_icon_gradient_css( $gradient_source, (string) ( $attributes['iconColourHoverGradient'] ?? '' ), $uid . '-igh', $link_sel . ':hover' . $glyph_suffix );
if ( '' !== $icon_grad['css'] ) {
	$scoped_css[] = $root_sel . $glyph_suffix . '{' . $icon_grad['css'] . ';}';
}
if ( '' !== $icon_grad['fallback_rule'] ) {
	$scoped_css[] = $icon_grad['fallback_rule'];
}
if ( '' !== $icon_grad_hover['css'] ) {
	$scoped_css[] = sgs_hover_state_rules( $link_sel, $icon_grad_hover['css'], ':focus-visible', $glyph_suffix );
}
if ( '' !== $icon_grad_hover['fallback_rule'] ) {
	$scoped_css[] = $icon_grad_hover['fallback_rule'];
}

// ── Label: gradient text (resting and hover) and typography ──────────────────
if ( $has_label ) {
	$label_grad       = sgs_css_gradient_value( (string) ( $attributes['labelColourGradient'] ?? '' ) );
	$label_hover_grad = sgs_css_gradient_value( (string) ( $attributes['labelColourHoverGradient'] ?? '' ) );
	if ( '' !== $label_grad ) {
		$scoped_css[] = $root_sel . ' .sgs-icon__label-text{' . sgs_text_colour_decl( $label_grad ) . ';}';
		$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $root_sel . ' .sgs-icon__label-text', $label_grad );
	}
	if ( '' !== $label_hover_grad ) {
		$scoped_css[] = sgs_hover_state_rules( $link_sel, sgs_text_colour_decl( $label_hover_grad ), ':focus-visible', ' .sgs-icon__label-text' );
	} elseif ( '' !== $label_grad && '' !== (string) ( $attributes['labelColourHover'] ?? '' ) ) {
		// A flat hover colour over a resting gradient: drop the gradient so the hover colour shows.
		$scoped_css[] = sgs_hover_state_rules( $link_sel, 'background-image:none;color:var(--sgs-icon-label-colour-hover)', ':focus-visible', ' .sgs-icon__label-text' );
	}
	// One class above a wrapping row's group label rule, so an icon's own label typography wins.
	$scoped_css[] = sgs_typography_css_rule( $attributes, 'label', '.' . $uid . '.wp-block-sgs-icon.sgs-icon .sgs-icon__label-text' );
	$scoped_css   = array_values( array_filter( $scoped_css, 'strlen' ) );
}

// ── Border CSS ───────────────────────────────────────────────────────────────
if ( $border['base'] ) {
	$scoped_css[] = $shape_sel . '{' . implode( ';', $border['base'] ) . ';}';
}
$tier_decls_shape = array(
	'tablet' => $border['tablet'],
	'mobile' => $border['mobile'],
);
if ( $border['hover'] ) {
	$scoped_css[] = sgs_hover_state_rules( $link_sel, implode( ';', $border['hover'] ), ':focus-visible', ' .sgs-icon__shape' );
}
foreach ( $border['rules'] as $rule ) {
	$scoped_css[] = $rule;
}

// ── Spacing: padding and margin around the icon (outside the shape) ──────────
$padding_tiers = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$margin_tiers  = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$spacing       = array();
foreach ( array(
	'padding' => $padding_tiers['desktop'],
	'margin'  => $margin_tiers['desktop'],
) as $family => $box ) {
	$sides = array();
	foreach ( is_array( $box ) ? $box : array() as $side => $value ) {
		if ( is_string( $value ) && '' !== $value ) {
			$sides[ $side ] = $value;
		}
	}
	if ( $sides ) {
		$spacing[ $family ] = $sides;
	}
}
if ( $spacing ) {
	$spacing_css = wp_style_engine_get_styles( array( 'spacing' => $spacing ), array( 'selector' => $root_sel ) );
	if ( ! empty( $spacing_css['css'] ) ) {
		$scoped_css[] = $spacing_css['css'];
	}
}
foreach ( array(
	'tablet' => '1023px',
	'mobile' => '767px',
) as $tier => $max ) {
	$root_tier = $tier_decls[ $tier ];
	foreach ( array( 'padding', 'margin' ) as $family ) {
		$tiers    = 'padding' === $family ? $padding_tiers : $margin_tiers;
		$longhand = sgs_box_object_longhands( is_array( $tiers[ $tier ] ?? null ) ? $tiers[ $tier ] : array(), $family );
		if ( null !== $longhand ) {
			$root_tier[] = $longhand;
		}
	}
	$rules = '';
	if ( $root_tier ) {
		$rules .= $root_sel . '{' . implode( ';', $root_tier ) . ';}';
	}
	if ( $tier_decls_shape[ $tier ] ) {
		$rules .= $shape_sel . '{' . implode( ';', $tier_decls_shape[ $tier ] ) . ';}';
	}
	if ( '' !== $rules ) {
		$scoped_css[] = '@media(max-width:' . $max . '){' . $rules . '}';
	}
}

// ── Glyph markup ─────────────────────────────────────────────────────────────
switch ( $icon_source ) {
	case 'brand':
		$glyph_svg = null !== $glyph_brand ? sgs_brand_glyph_svg( $glyph_brand, '', 24, $draw_fixed ) : sgs_get_lucide_icon( $icon_name );
		break;
	case 'wp-icon':
		$glyph_svg = sgs_get_wp_icon( $wp_icon_name );
		break;
	case 'custom':
		$glyph_svg = $icon_svg;
		break;
	case 'dashicon':
	case 'emoji':
		$glyph_svg = '';
		break;
	case 'lucide':
	default:
		$glyph_svg = sgs_get_lucide_icon( $icon_name );
		break;
}

if ( 'dashicon' === $icon_source ) {
	$glyph_html = sprintf(
		'<span class="sgs-icon__dashicon dashicons dashicons-%s" aria-hidden="true"></span>',
		esc_attr( '' !== $dashicon_name ? $dashicon_name : 'star-filled' )
	);
} elseif ( 'emoji' === $icon_source ) {
	$glyph_html = sprintf( '<span class="sgs-icon__emoji" aria-hidden="true">%s</span>', esc_html( '' !== $emoji_char ? $emoji_char : '⭐' ) );
} else {
	$glyph_svg  = sgs_svg_inject_defs( (string) $glyph_svg, $icon_grad['defs'] );
	$glyph_svg  = sgs_svg_inject_defs( $glyph_svg, $icon_grad_hover['defs'] );
	$glyph_html = '<span class="sgs-icon__svg" aria-hidden="true">' . $glyph_svg . '</span>';
}
$image_attrs = '' === $link_url && '' !== $aria_label && $group['in_group'] && ! $has_label ? ' role="img" aria-label="' . esc_attr( $aria_label ) . '"' : '';
// An outline shape with something to paint (a background or a stroke) draws its SVG behind the glyph.
$outline_svg = $is_outline && ( $show_bg || array() !== $outline_w ) ? sgs_icon_outline_svg( $shape, $uid . '-oc' ) : '';
$output      = '<span class="sgs-icon__shape"' . $image_attrs . '>' . $outline_svg . $glyph_html . '</span>';
$label_html  = $has_label ? '<span class="sgs-icon__label-text">' . esc_html( $label_text ) . '</span>' : '';

// ── Accessible name and link (step 10) ───────────────────────────────────────
$wrapper_extra = array( 'class' => implode( ' ', $classes ) );
if ( '' !== $link_url ) {
	// A visible label is the link's name; otherwise the name prints visually hidden. Either way the new-tab warning is
	// read, never shown.
	$new_tab     = '_blank' === $link_target ? __( ' (opens in new tab)', 'sgs-blocks' ) : '';
	$hidden_name = $new_tab;
	if ( ! $has_label ) {
		$accessible_name = sgs_icon_accessible_name( $aria_label, $bound_link_key, $glyph_brand, $link_url );
		$hidden_name     = '' !== $accessible_name ? $accessible_name . $new_tab : '';
	}
	$output = sprintf(
		'<a class="sgs-icon__link" href="%s"%s%s>%s%s%s</a>',
		esc_url( $link_url ),
		'_blank' === $link_target ? ' target="_blank"' : '',
		'' !== $link_rel ? ' rel="' . esc_attr( $link_rel ) . '"' : '',
		$output,
		$label_html,
		'' !== $hidden_name ? '<span class="sgs-icon__label">' . esc_html( $hidden_name ) . '</span>' : ''
	);
} elseif ( $has_label ) {
	// An unlinked labelled icon is text beside a decorative glyph.
	$output = '<span class="sgs-icon__inner">' . $output . $label_html . '</span>';
} elseif ( '' !== $aria_label && ! $group['in_group'] ) {
	// An unlinked icon with a label is an image with that name (inside a row, its shape is); without one it is decorative.
	$wrapper_extra['role']       = 'img';
	$wrapper_extra['aria-label'] = $aria_label;
}
if ( $group['in_group'] ) {
	$wrapper_extra['role'] = 'listitem';
}

if ( $scoped_css ) {
	// wp_strip_all_tags (not esc_html) blocks a </style> breakout and keeps CSS combinators. Every value is
	// pre-sanitised: sgs_icon_length_value(), sgs_colour_value(), sgs_css_gradient_value(), the border helper and
	// the style engine.
	printf( '<style>%s</style>', wp_strip_all_tags( implode( '', $scoped_css ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style>.
}

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wrapper attributes from WP core; $output built with esc_url/esc_attr/esc_html, glyph SVG from the Lucide/WP/registry maps or wp_kses.
printf( '<div %s>%s</div>', get_block_wrapper_attributes( $wrapper_extra ), $output );
