<?php
/**
 * Server-side render for the SGS Business Info block.
 *
 * Reads business details stored in wp_options (via Settings > Business Details)
 * and renders the requested type. All output is escaped at the point of output.
 *
 * Types:
 *  - phone       : clickable telephone link with optional icon
 *  - email       : clickable mailto link with optional icon
 *  - address     : multi-line postal address
 *  - hours       : definition list of opening hours
 *  - socials     : row of social media icon links
 *  - copyright   : "Copyright © [year] [name]" line
 *  - description : business tagline
 *  - map         : Google Maps iframe embed via CID
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

$type       = $attributes['type'] ?? 'phone';
$show_icon  = ! empty( $attributes['showIcon'] );
$link_phone = ! empty( $attributes['linkPhone'] );
$link_email = ! empty( $attributes['linkEmail'] );

// Placeholder shown in the editor when data is missing.
$placeholder = sprintf(
	'<span class="sgs-business-info__placeholder">%s</span>',
	esc_html__( 'Set in Settings > Business Details', 'sgs-blocks' )
);

/**
 * Helper: wrap an inline SVG icon in a presentational span.
 *
 * @param string $icon_name Lucide icon slug.
 * @return string HTML.
 */
$icon_html = function ( string $icon_name ) use ( $show_icon ): string {
	if ( ! $show_icon ) {
		return '';
	}
	$svg = sgs_get_lucide_icon( $icon_name );
	return sprintf( '<span class="sgs-business-info__icon" aria-hidden="true">%s</span>', $svg );
};

$html = '';

switch ( $type ) {

	// ── Phone ─────────────────────────────────────────────────────────────────
	case 'phone':
		$phone = get_option( 'sgs_business_phone', '' );
		if ( $phone ) {
			// Build a tel: href — strip everything except digits and +.
			$tel_href = 'tel:' . preg_replace( '/[^0-9+]/', '', $phone );
			$inner = $icon_html( 'phone' ) . '<span>' . esc_html( $phone ) . '</span>';
			if ( $link_phone ) {
				$html = sprintf(
					'<a href="%s" class="sgs-business-info__link">%s</a>',
					esc_url( $tel_href ),
					$inner
				);
			} else {
				$html = $inner;
			}
			$html = '<p class="sgs-business-info sgs-business-phone">' . $html . '</p>';
		} else {
			$html = '<p class="sgs-business-info sgs-business-phone">' . $placeholder . '</p>';
		}
		break;

	// ── Email ─────────────────────────────────────────────────────────────────
	case 'email':
		$email = get_option( 'sgs_business_email', '' );
		if ( $email && is_email( $email ) ) {
			$inner = $icon_html( 'mail' ) . '<span>' . esc_html( $email ) . '</span>';
			if ( $link_email ) {
				$html = sprintf(
					'<a href="%s" class="sgs-business-info__link">%s</a>',
					esc_url( 'mailto:' . antispambot( $email ) ),
					$inner
				);
			} else {
				$html = $inner;
			}
			$html = '<p class="sgs-business-info sgs-business-email">' . $html . '</p>';
		} else {
			$html = '<p class="sgs-business-info sgs-business-email">' . $placeholder . '</p>';
		}
		break;

	// ── Address ───────────────────────────────────────────────────────────────
	case 'address':
		$street   = get_option( 'sgs_business_street', '' );
		$city     = get_option( 'sgs_business_city', '' );
		$postcode = get_option( 'sgs_business_postcode', '' );
		$country  = get_option( 'sgs_business_country', 'United Kingdom' );

		$lines = array_filter( [
			$street,
			$city,
			$postcode,
			$country,
		] );

		if ( $lines ) {
			$address_html = implode(
				'<br>',
				array_map( 'esc_html', $lines )
			);
			$html = sprintf(
				'<address class="sgs-business-info sgs-business-address">%s%s</address>',
				$icon_html( 'map-pin' ),
				$address_html
			);
		} else {
			$html = '<address class="sgs-business-info sgs-business-address">' . $placeholder . '</address>';
		}
		break;

	// ── Opening Hours ─────────────────────────────────────────────────────────
	case 'hours':
		$hours = get_option( 'sgs_business_hours', [] );
		$days  = [
			'monday'    => __( 'Monday', 'sgs-blocks' ),
			'tuesday'   => __( 'Tuesday', 'sgs-blocks' ),
			'wednesday' => __( 'Wednesday', 'sgs-blocks' ),
			'thursday'  => __( 'Thursday', 'sgs-blocks' ),
			'friday'    => __( 'Friday', 'sgs-blocks' ),
			'saturday'  => __( 'Saturday', 'sgs-blocks' ),
			'sunday'    => __( 'Sunday', 'sgs-blocks' ),
		];

		if ( is_array( $hours ) && array_filter( $hours ) ) {
			$rows = '';
			foreach ( $days as $slug => $label ) {
				$value = isset( $hours[ $slug ] ) ? sanitize_text_field( $hours[ $slug ] ) : '';
				if ( '' === $value ) {
					continue;
				}
				$rows .= sprintf(
					'<div class="sgs-business-hours__row"><dt class="sgs-business-hours__day">%s</dt><dd class="sgs-business-hours__time">%s</dd></div>',
					esc_html( $label ),
					esc_html( $value )
				);
			}
			$html = sprintf(
				'<dl class="sgs-business-info sgs-business-hours">%s</dl>',
				$rows
			);
		} else {
			$html = '<dl class="sgs-business-info sgs-business-hours"><div class="sgs-business-hours__row">' . $placeholder . '</div></dl>';
		}
		break;

	// ── Social Links ──────────────────────────────────────────────────────────
	case 'socials':
		$social_map = [
			'sgs_social_linkedin'  => [ 'icon' => 'linkedin',  'label' => 'LinkedIn'  ],
			'sgs_social_facebook'  => [ 'icon' => 'facebook',  'label' => 'Facebook'  ],
			'sgs_social_instagram' => [ 'icon' => 'instagram', 'label' => 'Instagram' ],
			'sgs_social_google'    => [ 'icon' => 'star',      'label' => 'Google'    ],
			'sgs_social_twitter'   => [ 'icon' => 'twitter',   'label' => 'X/Twitter' ],
		];

		$items = '';
		foreach ( $social_map as $option_key => $meta ) {
			$url = get_option( $option_key, '' );
			if ( ! $url ) {
				continue;
			}
			$items .= sprintf(
				'<li class="sgs-business-socials__item"><a href="%s" target="_blank" rel="noopener noreferrer" aria-label="%s" class="sgs-business-socials__link">%s</a></li>',
				esc_url( $url ),
				esc_attr( $meta['label'] ),
				sgs_get_lucide_icon( $meta['icon'] )
			);
		}

		if ( $items ) {
			$html = sprintf(
				'<ul class="sgs-business-info sgs-business-socials">%s</ul>',
				$items
			);
		} else {
			$html = '<ul class="sgs-business-info sgs-business-socials"><li>' . $placeholder . '</li></ul>';
		}
		break;

	// ── Copyright ─────────────────────────────────────────────────────────────
	case 'copyright':
		$name = get_option( 'sgs_business_name', '' );
		if ( $name ) {
			$html = sprintf(
				'<p class="sgs-business-info sgs-business-copyright">%s &copy; %s %s</p>',
				esc_html__( 'Copyright', 'sgs-blocks' ),
				esc_html( gmdate( 'Y' ) ),
				esc_html( $name )
			);
		} else {
			$html = '<p class="sgs-business-info sgs-business-copyright">' . $placeholder . '</p>';
		}
		break;

	// ── Description / Tagline ─────────────────────────────────────────────────
	case 'description':
		$tagline = get_option( 'sgs_business_tagline', '' );
		if ( $tagline ) {
			// nl2br so multi-line taglines preserve their line breaks.
			$html = sprintf(
				'<p class="sgs-business-info sgs-business-description">%s</p>',
				nl2br( esc_html( $tagline ) )
			);
		} else {
			$html = '<p class="sgs-business-info sgs-business-description">' . $placeholder . '</p>';
		}
		break;

	// ── Map Embed ─────────────────────────────────────────────────────────────
	case 'map':
		$name     = get_option( 'sgs_business_name', '' );
		$street   = get_option( 'sgs_business_street', '' );
		$city     = get_option( 'sgs_business_city', '' );
		$postcode = get_option( 'sgs_business_postcode', '' );
		$cid      = get_option( 'sgs_business_maps_cid', '' );

		// Prefer search-based embed (shows pin, address panel, stars).
		// Fall back to CID-based embed if no address is set.
		$query_parts = array_filter( [ $name, $street, $city, $postcode ] );
		if ( $query_parts ) {
			$map_url = 'https://www.google.com/maps?q=' . rawurlencode( implode( ', ', $query_parts ) ) . '&output=embed';
		} elseif ( $cid && preg_match( '/^[0-9]+$/', $cid ) ) {
			$map_url = 'https://www.google.com/maps?cid=' . rawurlencode( $cid ) . '&output=embed';
		} else {
			$map_url = '';
		}

		if ( $map_url ) {
			$html = sprintf(
				'<div class="sgs-business-info sgs-business-map"><iframe src="%s" width="100%%" height="400" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="%s"></iframe></div>',
				esc_url( $map_url ),
				esc_attr__( 'Business location map', 'sgs-blocks' )
			);
		} else {
			$html = '<div class="sgs-business-info sgs-business-map">' . $placeholder . '</div>';
		}
		break;
}

$wrapper_attributes = get_block_wrapper_attributes( [
	'class' => 'sgs-business-info-wrap sgs-business-info-wrap--' . esc_attr( $type ),
] );

printf( '<div %s>%s</div>', $wrapper_attributes, $html );
