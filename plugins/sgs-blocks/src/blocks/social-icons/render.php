<?php
/**
 * Server-side render for the SGS Social Icons block: a row of `sgs/icon` children (role list, each child a
 * listitem) with group defaults.
 *
 * Group defaults (icon plan Phase B): sizes and colours print here as the `--sgs-si-*` custom properties
 * icon/style.css reads after an icon's own value, so an icon's own setting always wins. The shape, the background
 * switch, the border, the colour mode and the visible label switch and position reach the children through block
 * context (`block.json::providesContext`, read by `sgs_icon_group_context()`); an unticked Links key
 * (`hiddenLinks`) makes its child render nothing. The row renders nothing when no child renders.
 *
 * Label group defaults: flat colours as --sgs-si-label-colour[-hover]; a gradient as a scoped rule that skips an icon
 * with a label colour of its own (`.sgs-icon--own-label-colour`); typography as one scoped rule an icon's own label
 * rule out-ranks by one class.
 *
 * NO-INLINE (Spec 32): every declaration goes into the block's own scoped `<style>`; lengths pass
 * sgs_icon_length_value()'s allowlist, colours sgs_colour_value().
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    The rendered `sgs/icon` children.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

if ( '' === trim( (string) $content ) ) {
	return;
}

$uid      = 'sgs-si-' . substr( md5( (string) wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-social-icons';

$root_decls = array();
$tier_decls = array(
	'tablet' => array(),
	'mobile' => array(),
);

// ── Per-device group sizes and the row gap ───────────────────────────────────
$size_tiers  = sgs_responsive_normalise_object( $attributes['childIconSize'] ?? null );
$shape_tiers = sgs_responsive_normalise_object( $attributes['childIconShapeSize'] ?? null );
$gap_tiers   = sgs_responsive_normalise_object( $attributes['gap'] ?? null );
$group_shape = (string) ( $attributes['childIconShape'] ?? '' );
$linked      = ! array_key_exists( 'childIconShapeSizeLinked', $attributes ) || ! empty( $attributes['childIconShapeSizeLinked'] );
foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
	$decls = array();
	$size  = sgs_icon_length_value( $size_tiers[ $tier ] ?? '', 512 );
	if ( '' !== $size ) {
		$decls[] = '--sgs-si-size:' . $size;
	}
	$box     = is_array( $shape_tiers[ $tier ] ?? null ) ? $shape_tiers[ $tier ] : array();
	$shape_w = sgs_icon_length_value( $box['width'] ?? '', 640 );
	$shape_h = sgs_icon_shape_width_only( $group_shape ) || $linked ? '' : sgs_icon_length_value( $box['height'] ?? '', 640 );
	if ( '' !== $shape_w ) {
		$decls[] = '--sgs-si-shape-w:' . $shape_w;
	}
	if ( '' !== $shape_h ) {
		$decls[] = '--sgs-si-shape-h:' . $shape_h;
	}
	$gap = sgs_icon_length_value( $gap_tiers[ $tier ] ?? '', 640 );
	if ( '' !== $gap ) {
		$decls[] = 'gap:' . $gap;
	}
	if ( 'desktop' === $tier ) {
		$root_decls = $decls;
	} else {
		$tier_decls[ $tier ] = $decls;
	}
}

// ── Group colours: a custom property only for a value the client set ─────────
$group_colours = array(
	'childIconColour'            => '--sgs-si-colour',
	'childIconColourHover'       => '--sgs-si-colour-hover',
	'childIconBorderColour'      => '--sgs-si-border-colour',
	'childIconBorderColourHover' => '--sgs-si-border-colour-hover',
	'childIconLabelColour'       => '--sgs-si-label-colour',
	'childIconLabelColourHover'  => '--sgs-si-label-colour-hover',
);
foreach ( $group_colours as $attr => $property ) {
	$value = sgs_colour_value( is_string( $attributes[ $attr ] ?? null ) ? $attributes[ $attr ] : '' );
	if ( '' !== $value ) {
		$root_decls[] = $property . ':' . $value;
	}
}

// Background: flat and gradient, resting and hover (--sgs-si-bg[-hover][-gradient], read by icon/style.css). A hover
// colour with no hover gradient clears a resting gradient on hover, so the hover colour shows.
$root_decls = array_merge(
	$root_decls,
	sgs_custom_property_gradient_decls(
		'sgs-si-bg',
		(string) ( $attributes['childIconBackground'] ?? '' ),
		(string) ( $attributes['childIconBackgroundGradient'] ?? '' ),
		(string) ( $attributes['childIconBackgroundHover'] ?? '' ),
		(string) ( $attributes['childIconBackgroundHoverGradient'] ?? '' )
	)
);
if ( '' !== sgs_css_gradient_value( (string) ( $attributes['childIconBackgroundGradient'] ?? '' ) ) && '' !== (string) ( $attributes['childIconBackgroundHover'] ?? '' ) && '' === sgs_css_gradient_value( (string) ( $attributes['childIconBackgroundHoverGradient'] ?? '' ) ) ) {
	$root_decls[] = '--sgs-si-bg-hover-gradient:none';
}

// ── Group border (width and style; icons with their own border keep theirs) ───
$root_decls = array_merge( $root_decls, sgs_icon_group_border_decls( $attributes['childIconBorderWidth'] ?? array(), $attributes['childIconBorderStyle'] ?? '' ) );

// ── Alignment along the row (logical, so a right-to-left site flips) ─────────
$align = (string) ( $attributes['rowAlign'] ?? 'start' );
if ( 'center' === $align ) {
	$root_decls[] = 'justify-content:center';
} elseif ( 'end' === $align ) {
	$root_decls[] = 'justify-content:flex-end';
}

$scoped_css = array();
if ( $root_decls ) {
	$scoped_css[] = $root_sel . '{' . implode( ';', $root_decls ) . ';}';
}

// ── Group glyph gradient: outline glyphs of icons with no colour of their own (a filled brand mark keeps its paint) ─
$glyph_sel  = ' .sgs-icon:not(.sgs-icon--own-colour):not(.sgs-icon--mark) .sgs-icon__svg svg';
$grad       = sgs_icon_gradient_css( 'lucide', (string) ( $attributes['childIconColourGradient'] ?? '' ), $uid . '-g', $root_sel . $glyph_sel );
$grad_hover = sgs_icon_gradient_css( 'lucide', (string) ( $attributes['childIconColourHoverGradient'] ?? '' ), $uid . '-gh', $root_sel . $glyph_sel );
if ( '' !== $grad['css'] ) {
	$scoped_css[] = $root_sel . $glyph_sel . '{' . $grad['css'] . ';}';
}
if ( '' !== $grad_hover['css'] ) {
	$scoped_css[] = sgs_hover_state_rules( $root_sel . ' .sgs-icon:not(.sgs-icon--own-colour):not(.sgs-icon--mark) .sgs-icon__link', $grad_hover['css'], ':focus-visible', ' .sgs-icon__svg svg' );
}
$defs = $grad['defs'] . $grad_hover['defs'];

// ── Group label: gradient text for labels with no colour of their own, and typography ─
$label_grad       = sgs_css_gradient_value( (string) ( $attributes['childIconLabelColourGradient'] ?? '' ) );
$label_hover_grad = sgs_css_gradient_value( (string) ( $attributes['childIconLabelColourHoverGradient'] ?? '' ) );
if ( '' !== $label_grad ) {
	$scoped_css[] = $root_sel . ' .sgs-icon:not(.sgs-icon--own-label-colour) .sgs-icon__label-text{' . sgs_text_colour_decl( $label_grad ) . ';}';
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $root_sel . ' .sgs-icon:not(.sgs-icon--own-label-colour) .sgs-icon__label-text', $label_grad );
}
if ( '' !== $label_hover_grad ) {
	$scoped_css[] = sgs_hover_state_rules( $root_sel . ' .sgs-icon:not(.sgs-icon--own-label-colour) .sgs-icon__link', sgs_text_colour_decl( $label_hover_grad ), ':focus-visible', ' .sgs-icon__label-text' );
} elseif ( '' !== $label_grad && '' !== (string) ( $attributes['childIconLabelColourHover'] ?? '' ) ) {
	// A flat hover colour over a resting gradient: drop the gradient so the hover colour shows.
	$scoped_css[] = sgs_hover_state_rules( $root_sel . ' .sgs-icon:not(.sgs-icon--own-label-colour) .sgs-icon__link', 'background-image:none;color:var(--sgs-si-label-colour-hover)', ':focus-visible', ' .sgs-icon__label-text' );
}
$scoped_css[] = sgs_typography_css_rule( $attributes, 'childIconLabel', '.' . $uid . '.sgs-social-icons .sgs-icon__label-text' );
$scoped_css   = array_values( array_filter( $scoped_css, 'strlen' ) );

// ── Spacing: padding and margin around the row ───────────────────────────────
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
	$decls = $tier_decls[ $tier ];
	foreach ( array( 'padding', 'margin' ) as $family ) {
		$tiers    = 'padding' === $family ? $padding_tiers : $margin_tiers;
		$longhand = sgs_box_object_longhands( is_array( $tiers[ $tier ] ?? null ) ? $tiers[ $tier ] : array(), $family );
		if ( null !== $longhand ) {
			$decls[] = $longhand;
		}
	}
	if ( $decls ) {
		$scoped_css[] = '@media(max-width:' . $max . '){' . $root_sel . '{' . implode( ';', $decls ) . ';}}';
	}
}

$aria_label = trim( (string) ( $attributes['ariaLabel'] ?? '' ) );
if ( '' === $aria_label ) {
	$aria_label = __( 'Social media and contact', 'sgs-blocks' );
}

if ( $scoped_css ) {
	// wp_strip_all_tags (not esc_html) blocks a </style> breakout and keeps CSS combinators. Every value is
	// pre-sanitised: sgs_icon_length_value(), sgs_colour_value(), the box and border-style helpers, the style engine.
	printf( '<style>%s</style>', wp_strip_all_tags( implode( '', $scoped_css ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style>.
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- wrapper attributes from WP core; $content is the rendered sgs/icon children.
printf(
	'<div %s>%s</div>',
	get_block_wrapper_attributes(
		array(
			'class'      => 'sgs-social-icons ' . $uid,
			'role'       => 'list',
			'aria-label' => $aria_label,
		)
	),
	( '' !== $defs ? '<svg class="sgs-social-icons__defs" aria-hidden="true" focusable="false">' . $defs . '</svg>' : '' ) . $content
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
