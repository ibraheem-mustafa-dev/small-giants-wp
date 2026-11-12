<?php
/**
 * Server-side render for the SGS Media block.
 *
 * One media slot (Spec 49 §7, §15): `SGS_Media_Element::render()` prints the markup (figure, link, helper, mask and
 * the photo, video, embed or inline SVG per device) and every setting's scoped CSS. This file adds what the block
 * keeps for itself: the caption's typography and colour, and the player readout's typography.
 *
 * NO-INLINE: this block emits zero inline style declarations. Contract: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 *
 * The internal CSS scope is a CLASS (`.sgs-media-XXXXXXXX`), never an id, so it cannot collide with the anchor
 * id (Spec 32 FR-32-4); the renderer prints the anchor from `$attributes['anchor']`.
 *
 * @since 1.1.0
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused: dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

if ( ! class_exists( 'SGS_Media_Element' ) ) {
	return;
}

$sgs_media_slot = array(
	'prefix'  => '',
	'kinds'   => array( 'image', 'video', 'embed', 'svg' ),
	'context' => 'content',
);
foreach ( (array) ( $block->block_type->supports['sgs']['mediaElements'] ?? array() ) as $sgs_media_entry ) {
	if ( '' === (string) ( $sgs_media_entry['prefix'] ?? '' ) && ! empty( $sgs_media_entry['kinds'] ) ) {
		$sgs_media_slot = array(
			'prefix'  => '',
			'kinds'   => (array) $sgs_media_entry['kinds'],
			'context' => (string) ( $sgs_media_entry['context'] ?? 'content' ),
		);
	}
}

$sgs_media_uid   = 'sgs-media-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_media_wrap  = get_block_wrapper_attributes();
$sgs_media_extra = preg_match( '/class="([^"]*)"/', $sgs_media_wrap, $sgs_media_cm ) ? $sgs_media_cm[1] : 'wp-block-sgs-media';

$sgs_media_out = SGS_Media_Element::render(
	$sgs_media_slot,
	$attributes,
	array(
		'uid'         => $sgs_media_uid,
		'block'       => 'sgs/media',
		'extra_class' => $sgs_media_extra,
		'anchor'      => (string) ( $attributes['anchor'] ?? '' ),
		'in_editor'   => defined( 'REST_REQUEST' ) && REST_REQUEST,
	)
);
if ( '' === $sgs_media_out['html'] ) {
	return;
}

$sgs_media_css      = $sgs_media_out['css'];
$sgs_media_scope    = '.' . esc_attr( $sgs_media_uid );
$sgs_media_cap_sel  = $sgs_media_scope . ' .sgs-media-caption';
$sgs_media_obj_keys = sgs_object_attr_keys( $block );

// The player readout (`0:00 / 0:00`): view.js builds the bar after load; a scoped rule still reaches it, and style.css
// keeps the size and line height inside :where() so this rule wins.
$sgs_media_css .= sgs_typography_css_rule( $attributes, 'videoTime', $sgs_media_scope . ' .sgs-video__time', '', false, false, $sgs_media_obj_keys );


// The caption's own typography and colour print only when there is a caption to style.
if ( '' !== trim( (string) ( $attributes['caption'] ?? '' ) ) ) {
	// Caption typography, responsive, through the shared helper.
	$sgs_media_css .= sgs_typography_css_rule( $attributes, 'caption', $sgs_media_cap_sel, '', false, false, $sgs_media_obj_keys );

	// Caption colour, flat or gradient, then its hover form. The fallback rule is the mandatory companion of a gradient.
	$sgs_media_cap_colour = sgs_resolve_text_colour_or_gradient(
		(string) ( $attributes['captionColour'] ?? '' ),
		(string) ( $attributes['captionColourGradient'] ?? '' )
	);
	if ( '' !== $sgs_media_cap_colour ) {
		$sgs_media_cap_decl = sgs_text_colour_decl( $sgs_media_cap_colour );
		if ( '' !== $sgs_media_cap_decl ) {
			$sgs_media_css .= $sgs_media_cap_sel . '{' . $sgs_media_cap_decl . '}';
		}
	}
	$sgs_media_css .= sgs_text_colour_gradient_fallback_rule( $sgs_media_cap_sel, $sgs_media_cap_colour );

	$sgs_media_cap_hover = sgs_resolve_text_colour_or_gradient(
		(string) ( $attributes['captionColourHover'] ?? '' ),
		(string) ( $attributes['captionColourHoverGradient'] ?? '' )
	);
	if ( '' !== $sgs_media_cap_hover ) {
		$sgs_media_cap_hover_decl = sgs_text_colour_decl( $sgs_media_cap_hover );
		if ( '' !== $sgs_media_cap_hover_decl ) {
			$sgs_media_css .= sgs_hover_state_rules( $sgs_media_cap_sel, $sgs_media_cap_hover_decl );
		}
		$sgs_media_css .= sgs_text_colour_gradient_fallback_rule( $sgs_media_cap_sel . ':hover', $sgs_media_cap_hover );
	}
}

if ( '' !== $sgs_media_css ) {
	printf(
		'<style id="%s-css">%s</style>',
		esc_attr( $sgs_media_uid ),
		wp_strip_all_tags( $sgs_media_css ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- emitter output and sanitiser-validated components; wp_strip_all_tags guards a </style> breakout.
	);
}
echo $sgs_media_out['html']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built by SGS_Media_Element::render() with per-attribute escaping.
