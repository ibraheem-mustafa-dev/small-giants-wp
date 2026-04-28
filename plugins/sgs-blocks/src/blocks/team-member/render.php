<?php
/**
 * Server-side render for the SGS Team Member block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

$photo              = $attributes['photo'] ?? null;
$name               = $attributes['name'] ?? '';
$role               = $attributes['role'] ?? '';
$bio                = $attributes['bio'] ?? '';
$social_links       = $attributes['socialLinks'] ?? array();
$name_colour        = $attributes['nameColour'] ?? '';
$role_colour        = $attributes['roleColour'] ?? 'primary';
$card_style         = $attributes['cardStyle'] ?? 'elevated';
$photo_shape        = $attributes['photoShape'] ?? 'circle';
$hover_scale        = $attributes['hoverScale'] ?? '';
$hover_shadow       = $attributes['hoverShadow'] ?? '';
$hover_img_zoom     = (bool) ( $attributes['hoverImageZoom'] ?? false );
$hover_grayscale    = (bool) ( $attributes['hoverGrayscale'] ?? false );
$transition_dur     = $attributes['transitionDuration'] ?? '300';
$transition_easing  = $attributes['transitionEasing'] ?? 'ease-in-out';
$block_link         = $attributes['blockLink'] ?? '';
$block_link_target  = (bool) ( $attributes['blockLinkTarget'] ?? false );
$hover_overlay      = (bool) ( $attributes['hoverOverlay'] ?? false );

$classes = array(
	'sgs-team-member',
	'sgs-team-member--' . esc_attr( $card_style ),
);

if ( $hover_img_zoom ) {
	$classes[] = 'sgs-has-img-zoom';
}
if ( $hover_grayscale ) {
	$classes[] = 'sgs-has-grayscale';
}
if ( $hover_overlay ) {
	$classes[] = 'sgs-has-hover-overlay';
}

// Build inline CSS custom properties for transition and hover vars.
$wrapper_styles = sgs_transition_vars( $attributes );

$allowed_scales = array( '1.02', '1.05', '1.1' );
if ( $hover_scale && in_array( $hover_scale, $allowed_scales, true ) ) {
	$wrapper_styles[] = '--sgs-hover-scale:' . esc_attr( $hover_scale );
	$classes[]        = 'sgs-has-hover-scale';
}

$allowed_shadows = array( 'sm', 'md', 'lg', 'glow' );
if ( $hover_shadow && in_array( $hover_shadow, $allowed_shadows, true ) ) {
	$wrapper_styles[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $hover_shadow ) . ')';
	$classes[]        = 'sgs-has-hover';
}

$wrapper_attr_args = array(
	'class' => implode( ' ', $classes ),
);
if ( $wrapper_styles ) {
	$wrapper_attr_args['style'] = implode( ';', $wrapper_styles ) . ';';
}

$wrapper_attributes = get_block_wrapper_attributes( $wrapper_attr_args );

// Photo.
$photo_html = '';
if ( ! empty( $photo['url'] ) ) {
	$photo_id  = ! empty( $photo['id'] ) ? absint( $photo['id'] ) : 0;
	$photo_img = sgs_responsive_image(
		$photo_id,
		$photo['url'],
		$photo['alt'] ?? $name,
		'medium',
		array( 'loading' => 'lazy' )
	);

	if ( $hover_overlay ) {
		// When overlay is active, the bio slides up over the photo on hover/focus.
		// The photo wrapper gets tabindex so keyboard users can trigger the overlay.
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

// Name.
$name_style = $name_colour ? ' style="color:' . sgs_colour_value( $name_colour ) . '"' : '';
$name_html = $name ? sprintf( '<h3 class="sgs-team-member__name"%s>%s</h3>', $name_style, wp_kses_post( $name ) ) : '';

// Role.
$role_style = $role_colour ? ' style="color:' . sgs_colour_value( $role_colour ) . '"' : '';
$role_html = $role ? sprintf( '<p class="sgs-team-member__role"%s>%s</p>', $role_style, wp_kses_post( $role ) ) : '';

// Bio.
$bio_html = $bio ? sprintf( '<p class="sgs-team-member__bio">%s</p>', wp_kses_post( $bio ) ) : '';

// Social links.
$social_html = '';
if ( ! empty( $social_links ) ) {
	$social_items = '';
	$platform_labels = array(
		'facebook'  => 'Facebook',
		'twitter'   => 'X (Twitter)',
		'linkedin'  => 'LinkedIn',
		'instagram' => 'Instagram',
		'youtube'   => 'YouTube',
		'tiktok'    => 'TikTok',
		'github'    => 'GitHub',
		'email'     => 'Email',
		'website'   => 'Website',
	);

	foreach ( $social_links as $link ) {
		if ( empty( $link['url'] ) ) continue;
		$platform = $link['platform'] ?? 'website';
		$label    = $platform_labels[ $platform ] ?? ucfirst( $platform );
		$href     = 'email' === $platform ? 'mailto:' . esc_attr( $link['url'] ) : esc_url( $link['url'] );

		$social_items .= sprintf(
			'<a href="%s" class="sgs-team-member__social-link sgs-team-member__social--%s" target="_blank" rel="noopener noreferrer" aria-label="%s">%s</a>',
			$href,
			esc_attr( $platform ),
			esc_attr( $label ),
			esc_html( $label )
		);
	}

	if ( $social_items ) {
		$social_html = '<div class="sgs-team-member__social">' . $social_items . '</div>';
	}
}

// Schema.org/Person markup (feature #252).
$schema_html = '';
if ( $name ) {
	$schema = array(
		'@context' => 'https://schema.org',
		'@type'    => 'Person',
		'name'     => $name,
	);
	if ( $role ) {
		$schema['jobTitle'] = $role;
	}
	if ( $bio ) {
		$schema['description'] = wp_strip_all_tags( $bio );
	}
	if ( ! empty( $photo['url'] ) ) {
		$schema['image'] = $photo['url'];
	}
	// Map social link URLs to sameAs (exclude email links).
	$same_as = array();
	foreach ( $social_links as $link ) {
		if ( ! empty( $link['url'] ) && 'email' !== ( $link['platform'] ?? '' ) ) {
			$same_as[] = esc_url_raw( $link['url'] );
		}
	}
	if ( $same_as ) {
		$schema['sameAs'] = $same_as;
	}
	$schema_html = sprintf(
		'<script type="application/ld+json">%s</script>',
		wp_json_encode( $schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE )
	);
}

$inner_html = sprintf(
	'<div %s>%s<div class="sgs-team-member__content">%s%s%s%s</div>%s</div>',
	$wrapper_attributes,
	$photo_html,
	$name_html,
	$role_html,
	$bio_html,
	$social_html,
	$schema_html
);

// Block link -- wraps the entire block in an <a> tag.
if ( $block_link ) {
	$target_attr = $block_link_target
		? ' target="_blank" rel="noopener noreferrer"'
		: '';
	printf(
		'<a href="%s" class="sgs-block-link-wrapper"%s>%s</a>',
		esc_url( $block_link ),
		$target_attr,
		$inner_html // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	);
} else {
	echo $inner_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}
