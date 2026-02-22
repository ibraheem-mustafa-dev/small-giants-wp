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
	$photo_html = sprintf(
		'<div class="sgs-team-member__photo sgs-team-member__photo--%s"><img src="%s" alt="%s" loading="lazy" /></div>',
		esc_attr( $photo_shape ),
		esc_url( $photo['url'] ),
		esc_attr( $photo['alt'] ?? $name )
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

printf(
	'<div %s>%s<div class="sgs-team-member__content">%s%s%s%s</div></div>',
	$wrapper_attributes,
	$photo_html,
	$name_html,
	$role_html,
	$bio_html,
	$social_html
);
