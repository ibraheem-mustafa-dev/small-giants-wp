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

$photo        = $attributes['photo'] ?? null;
$name         = $attributes['name'] ?? '';
$role         = $attributes['role'] ?? '';
$bio          = $attributes['bio'] ?? '';
$social_links = $attributes['socialLinks'] ?? array();
$name_colour  = $attributes['nameColour'] ?? '';
$role_colour  = $attributes['roleColour'] ?? 'primary';
$card_style   = $attributes['cardStyle'] ?? 'elevated';
$photo_shape  = $attributes['photoShape'] ?? 'circle';

$classes = array(
	'sgs-team-member',
	'sgs-team-member--' . esc_attr( $card_style ),
);

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class' => implode( ' ', $classes ),
) );

// Photo.
$photo_html = '';
if ( ! empty( $photo['url'] ) ) {
	$photo_id = ! empty( $photo['id'] ) ? absint( $photo['id'] ) : 0;
	$photo_img = sgs_responsive_image( $photo_id, $photo['url'], $photo['alt'] ?? $name, 'medium', [
		'loading' => 'lazy',
	] );
	$photo_html = sprintf(
		'<div class="sgs-team-member__photo sgs-team-member__photo--%s">%s</div>',
		esc_attr( $photo_shape ),
		$photo_img
	);
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

printf(
	'<div %s>%s<div class="sgs-team-member__content">%s%s%s%s</div>%s</div>',
	$wrapper_attributes,
	$photo_html,
	$name_html,
	$role_html,
	$bio_html,
	$social_html,
	$schema_html
);
