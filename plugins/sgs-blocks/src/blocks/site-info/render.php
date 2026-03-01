<?php
/**
 * Server-side render for the SGS Site Info block.
 *
 * Outputs a single piece of centralised business/contact info based on the
 * block's `type` attribute. All values come from Appearance → Customise →
 * SGS Site Info and are managed via theme_mod settings.
 *
 * Supported types: phone | email | address | social | copyright | map
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// Helper functions are defined in theme/includes/class-site-settings.php
// and loaded globally by the theme. Guard against environments where the
// theme is not active (e.g. block preview in a plugin-only install).
if ( ! function_exists( 'sgs_get_phone' ) ) {
	return;
}

$type       = $attributes['type']       ?? 'phone';
$show_icon  = $attributes['showIcon']   ?? false;
$icon_size  = $attributes['iconSize']   ?? 'medium';
$link_phone = $attributes['linkPhone']  ?? true;
$link_email = $attributes['linkEmail']  ?? true;

// Icon size class suffix — maps to CSS class modifier.
$icon_cls = 'sgs-site-info__icon sgs-site-info__icon--' . esc_attr( $icon_size );

/**
 * Return an inline SVG icon for the requested slug.
 *
 * Only a small set of glyphs needed for contact info are included here.
 * If a Lucide helper is available (loaded by the sgs-blocks plugin), it
 * will be preferred; otherwise a fallback inline path is used.
 *
 * @param string $slug  Icon slug: phone | email | map-marker | link.
 * @return string SVG markup (already safe — paths are hardcoded).
 */
$get_icon = function ( string $slug ): string {
	// Prefer the shared Lucide helper if available.
	if ( function_exists( 'sgs_get_lucide_icon' ) ) {
		return sgs_get_lucide_icon( $slug );
	}

	// Inline fallbacks — minimal SVG paths, no external dependencies.
	$icons = [
		'phone'      => '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.22 2.18 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14v2.92z"/></svg>',
		'mail'       => '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
		'map-marker' => '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>',
		'link'       => '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>',
	];

	return $icons[ $slug ] ?? '';
};

$wrapper_attributes = get_block_wrapper_attributes( [ 'class' => 'sgs-site-info sgs-site-info--' . esc_attr( $type ) ] );

/* ================================================================ */
/* Render by type                                                    */
/* ================================================================ */

switch ( $type ) {

	/* -------------------------------------------------------------- */
	/* Phone                                                            */
	/* -------------------------------------------------------------- */
	case 'phone':
		$phone = sgs_get_phone();
		if ( empty( $phone ) ) {
			return;
		}

		// Strip non-numeric characters (except leading +) for the href.
		$tel_href = 'tel:' . preg_replace( '/[^\d+]/', '', $phone );

		$content_html = $show_icon
			? '<span class="' . $icon_cls . '">' . $get_icon( 'phone' ) . '</span>'
			: '';

		$label = esc_html( $phone );

		if ( $link_phone ) {
			$content_html .= '<a href="' . esc_attr( $tel_href ) . '">' . $label . '</a>';
		} else {
			$content_html .= '<span>' . $label . '</span>';
		}

		printf( '<p %s>%s</p>', $wrapper_attributes, $content_html );
		break;

	/* -------------------------------------------------------------- */
	/* Email                                                            */
	/* -------------------------------------------------------------- */
	case 'email':
		$email = sgs_get_email();
		if ( empty( $email ) ) {
			return;
		}

		$content_html = $show_icon
			? '<span class="' . $icon_cls . '">' . $get_icon( 'mail' ) . '</span>'
			: '';

		$label = esc_html( $email );

		if ( $link_email ) {
			$content_html .= '<a href="' . esc_attr( 'mailto:' . $email ) . '">' . $label . '</a>';
		} else {
			$content_html .= '<span>' . $label . '</span>';
		}

		printf( '<p %s>%s</p>', $wrapper_attributes, $content_html );
		break;

	/* -------------------------------------------------------------- */
	/* Address                                                          */
	/* -------------------------------------------------------------- */
	case 'address':
		$addr = sgs_get_address();

		// Filter out empty lines.
		$parts = array_filter( [
			$addr['line1'],
			$addr['line2'],
			$addr['city'],
			$addr['postcode'],
			$addr['country'],
		] );

		if ( empty( $parts ) ) {
			return;
		}

		$icon_html = $show_icon
			? '<span class="' . $icon_cls . '">' . $get_icon( 'map-marker' ) . '</span>'
			: '';

		$lines_html = implode( '<br>', array_map( 'esc_html', $parts ) );

		printf( '<address %s>%s%s</address>', $wrapper_attributes, $icon_html, $lines_html );
		break;

	/* -------------------------------------------------------------- */
	/* Social Links                                                     */
	/* -------------------------------------------------------------- */
	case 'social':
		$social = sgs_get_social_urls();

		// Human-readable labels per service.
		$labels = [
			'linkedin'  => 'LinkedIn',
			'facebook'  => 'Facebook',
			'instagram' => 'Instagram',
			'twitter'   => 'X (Twitter)',
		];

		$items_html = '';
		foreach ( $social as $service => $url ) {
			if ( empty( $url ) ) {
				continue;
			}
			$label       = $labels[ $service ] ?? ucfirst( $service );
			$items_html .= sprintf(
				'<li class="sgs-site-info__social-item sgs-site-info__social-item--%s">'
				. '<a href="%s" target="_blank" rel="noopener noreferrer">%s</a>'
				. '</li>',
				esc_attr( $service ),
				esc_url( $url ),
				esc_html( $label )
			);
		}

		if ( empty( $items_html ) ) {
			return;
		}

		printf( '<ul %s>%s</ul>', $wrapper_attributes, $items_html );
		break;

	/* -------------------------------------------------------------- */
	/* Copyright                                                        */
	/* -------------------------------------------------------------- */
	case 'copyright':
		$copyright = sgs_get_copyright();
		if ( empty( $copyright ) ) {
			return;
		}

		// sgs_get_copyright() is already safe (entity-encoded name, plain text template).
		printf( '<p %s>%s</p>', $wrapper_attributes, wp_kses_post( $copyright ) );
		break;

	/* -------------------------------------------------------------- */
	/* Map Embed                                                        */
	/* -------------------------------------------------------------- */
	case 'map':
		$embed_url = sgs_get_maps_embed();
		if ( empty( $embed_url ) ) {
			return;
		}

		printf(
			'<div %s>'
			. '<iframe src="%s" width="100%%" height="300"'
			. ' style="border:0;border-radius:8px;" allowfullscreen="" loading="lazy"'
			. ' referrerpolicy="no-referrer-when-downgrade"'
			. ' title="%s"></iframe>'
			. '</div>',
			$wrapper_attributes,
			esc_url( $embed_url ),
			esc_attr__( 'Business location on Google Maps', 'sgs-blocks' )
		);
		break;
}
