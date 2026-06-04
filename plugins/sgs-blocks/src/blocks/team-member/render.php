<?php
/**
 * Server-side render for the SGS Team Member block.
 *
 * WS-4: CONTENT kind — width/spacing layers only (no bg/overlay/grid).
 * The block's own colour/border/hover CSS rides on $sgs_classes (extra_classes)
 * and CSS custom properties ($sgs_wrapper_styles → extra_styles).
 * R-22-14: explicit attribute discriminators used throughout; no empty($content) branching.
 *
 * Wrapper split:
 *  - OUTER shell   → SGS_Container_Wrapper::render() handles widthMode/contentWidth/padding.
 *  - Interior HTML → photo + name + role + bio + social InnerBlocks + Schema.org JSON-LD.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (sgs/social-icons InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// ---------------------------------------------------------------------------
// Media / photo — prefer memberMedia, fall back to legacy photo.
// ---------------------------------------------------------------------------
$member_media = $attributes['memberMedia'] ?? null;
$photo        = $attributes['photo'] ?? null;

if ( empty( $member_media['url'] ) && ! empty( $photo['url'] ) ) {
	$member_media = array(
		'url'  => $photo['url'],
		'type' => 'image',
		'id'   => ! empty( $photo['id'] ) ? absint( $photo['id'] ) : 0,
		'alt'  => $photo['alt'] ?? '',
		'mime' => 'image/jpeg',
	);
}

// Schema.org needs a plain image URL.
$schema_image_url = '';
if ( ! empty( $member_media['url'] ) ) {
	$schema_image_url = $member_media['url'];
} elseif ( ! empty( $photo['url'] ) ) {
	$schema_image_url = $photo['url'];
}

// ---------------------------------------------------------------------------
// Scalar content / layout attributes.
// ---------------------------------------------------------------------------
$name              = $attributes['name'] ?? '';
$sgs_role          = $attributes['role'] ?? '';
$bio               = $attributes['bio'] ?? '';
$name_colour       = $attributes['nameColour'] ?? '';
$role_colour       = $attributes['roleColour'] ?? 'text-muted';
$card_style        = $attributes['cardStyle'] ?? 'elevated';
$photo_shape       = $attributes['photoShape'] ?? 'circle';
$hover_scale       = $attributes['hoverScale'] ?? '';
$hover_shadow      = $attributes['hoverShadow'] ?? '';
$hover_img_zoom    = (bool) ( $attributes['hoverImageZoom'] ?? false );
$hover_grayscale   = (bool) ( $attributes['hoverGrayscale'] ?? false );
$hover_overlay     = (bool) ( $attributes['hoverOverlay'] ?? false );
$display_mode      = $attributes['displayMode'] ?? 'full';
$is_compact        = 'compact' === $display_mode;
$block_link        = $attributes['blockLink'] ?? '';
$block_link_target = (bool) ( $attributes['blockLinkTarget'] ?? false );

// ---------------------------------------------------------------------------
// Wrapper classes — the block's own BEM classes ride on extra_classes so the
// container-wrapper shell gets sgs-container + sgs-team-member + modifiers.
// ---------------------------------------------------------------------------
$sgs_classes = array(
	'sgs-team-member',
	'sgs-team-member--' . esc_attr( $card_style ),
);

if ( $is_compact ) {
	$sgs_classes[] = 'sgs-team-member--compact';
}
if ( $hover_img_zoom ) {
	$sgs_classes[] = 'sgs-has-img-zoom';
}
if ( $hover_grayscale ) {
	$sgs_classes[] = 'sgs-has-grayscale';
}
if ( $hover_overlay ) {
	$sgs_classes[] = 'sgs-has-hover-overlay';
}

// ---------------------------------------------------------------------------
// Wrapper inline styles (CSS custom properties for transition / hover effects).
// ---------------------------------------------------------------------------
$sgs_wrapper_styles = sgs_transition_vars( $attributes );

$allowed_scales = array( '1.02', '1.05', '1.1' );
if ( $hover_scale && in_array( $hover_scale, $allowed_scales, true ) ) {
	$sgs_wrapper_styles[] = '--sgs-hover-scale:' . esc_attr( $hover_scale );
	$sgs_classes[]        = 'sgs-has-hover-scale';
}

$allowed_shadows = array( 'sm', 'md', 'lg', 'glow' );
if ( $hover_shadow && in_array( $hover_shadow, $allowed_shadows, true ) ) {
	$sgs_wrapper_styles[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $hover_shadow ) . ')';
	$sgs_classes[]        = 'sgs-has-hover';
}

// ---------------------------------------------------------------------------
// Photo HTML.
// ---------------------------------------------------------------------------
$photo_html = '';
$photo_img  = '';
if ( ! empty( $member_media['url'] ) ) {
	$media_for_render = $member_media;
	if ( empty( $media_for_render['alt'] ) ) {
		$media_for_render['alt'] = $name;
	}
	$photo_img = sgs_render_media( $media_for_render, 'sgs/team-member' );
}

if ( '' !== $photo_img ) {
	if ( $hover_overlay && ! $is_compact ) {
		$photo_html = sprintf(
			'<div class="sgs-team-member__photo sgs-team-member__photo--%s sgs-team-member__photo--has-overlay" tabindex="0" role="img" aria-label="%s">%s<div class="sgs-team-member__overlay" aria-hidden="true"><div class="sgs-team-member__overlay-bio">%s</div></div></div>',
			esc_attr( $photo_shape ),
			esc_attr( $name ),
			$photo_img,
			wp_kses_post( $bio )
		);
	} else {
		$photo_html = sprintf(
			'<div class="sgs-team-member__photo sgs-team-member__photo--%s">%s</div>',
			esc_attr( $photo_shape ),
			$photo_img
		);
	}
}

// ---------------------------------------------------------------------------
// Name / role / bio HTML.
// ---------------------------------------------------------------------------
$name_style = $name_colour ? ' style="color:' . sgs_colour_value( $name_colour ) . '"' : '';
$name_html  = $name ? sprintf( '<h3 class="sgs-team-member__name"%s>%s</h3>', $name_style, wp_kses_post( $name ) ) : '';

$role_style = $role_colour ? ' style="color:' . sgs_colour_value( $role_colour ) . '"' : '';
$role_html  = $sgs_role ? sprintf( '<p class="sgs-team-member__role"%s>%s</p>', $role_style, wp_kses_post( $sgs_role ) ) : '';

$bio_html = ( $bio && ! $is_compact ) ? sprintf( '<p class="sgs-team-member__bio">%s</p>', wp_kses_post( $bio ) ) : '';

// ---------------------------------------------------------------------------
// Social icons — InnerBlocks ($content) — hidden in Compact mode.
// R-22-14: discriminate on explicit $display_mode attr, not empty($content).
// ---------------------------------------------------------------------------
$social_html = $is_compact ? '' : $content;

// ---------------------------------------------------------------------------
// Schema.org/Person markup.
// ---------------------------------------------------------------------------
$schema_html = '';
if ( $name ) {
	$schema = array(
		'@context' => 'https://schema.org',
		'@type'    => 'Person',
		'name'     => $name,
	);
	if ( $sgs_role ) {
		$schema['jobTitle'] = $sgs_role;
	}
	if ( $bio ) {
		$schema['description'] = wp_strip_all_tags( $bio );
	}
	if ( $schema_image_url ) {
		$schema['image'] = $schema_image_url;
	}
	$schema_html = sprintf(
		'<script type="application/ld+json">%s</script>',
		wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE )
	);
}

// ---------------------------------------------------------------------------
// Build interior HTML — everything INSIDE the wrapper element.
// ---------------------------------------------------------------------------
$sgs_inner_html = sprintf(
	'%s<div class="sgs-team-member__content">%s%s%s</div>%s%s',
	$photo_html,
	$name_html,
	$role_html,
	$bio_html,
	$social_html,
	$schema_html
);

// ---------------------------------------------------------------------------
// Render via SGS_Container_Wrapper (CONTENT kind = width/spacing only).
// The block's own BEM classes + hover CSS vars ride on extra_classes/extra_styles.
// No overlay, no bg-image, no grid layers emitted for content kind.
// ---------------------------------------------------------------------------
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $sgs_inner_html built with esc_*/wp_kses()/wp_json_encode(); SGS_Container_Wrapper::render() output is pre-sanitised.
$sgs_card_html = SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$sgs_inner_html,
	'content',
	array(
		'tag'           => 'div',
		'extra_classes' => $sgs_classes,
		'extra_styles'  => $sgs_wrapper_styles,
	)
);

// Block link — wraps the entire card in an <a> tag.
if ( $block_link ) {
	$sgs_block_target = $block_link_target ? ' target="_blank" rel="noopener noreferrer"' : '';
	echo '<a href="' . esc_url( $block_link ) . '" class="sgs-block-link-wrapper"' . $sgs_block_target . '>'
		. $sgs_card_html
		. '</a>';
} else {
	echo $sgs_card_html;
}
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
