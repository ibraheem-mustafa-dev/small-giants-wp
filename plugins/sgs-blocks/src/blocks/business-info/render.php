<?php
/**
 * Server-side render for the SGS Business Info block.
 *
 * Reads business details from the central Sgs_Site_Info store (populated via
 * Appearance > SGS Site Info) and renders the requested type. All output is
 * escaped at the point of output via Sgs_Site_Info::get_esc_html() /
 * get_esc_url() where the escaping context is unambiguous.
 *
 * Types:
 *  - phone       : clickable telephone link with optional icon
 *  - email       : clickable mailto link with optional icon
 *  - address     : multi-line postal address
 *  - hours       : definition list of opening hours
 *  - socials     : row of social media icon links
 *  - copyright   : "Copyright © [year] [name]" line
 *  - description : business tagline
 *  - map         : Google Maps iframe embed via address search
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — dynamic block).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

use SGS\Blocks\Sgs_Site_Info;

$display_type = $attributes['type'] ?? 'phone';
$show_icon    = ! empty( $attributes['showIcon'] );
$link_phone   = ! empty( $attributes['linkPhone'] );
$link_email   = ! empty( $attributes['linkEmail'] );
$icon_colour  = $attributes['iconColour'] ?? 'primary';
$text_colour  = $attributes['textColour'] ?? 'text';
$label_colour = $attributes['labelColour'] ?? 'text-muted';

// Placeholder shown when data is missing.
$placeholder = sprintf(
	'<span class="sgs-business-info__placeholder">%s</span>',
	esc_html__( 'Set in Appearance > SGS Site Info', 'sgs-blocks' )
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

switch ( $display_type ) {

	// ── Phone ─────────────────────────────────────────────────────────────────
	case 'phone':
		$phone_raw = (string) Sgs_Site_Info::get( 'phone', '' );
		if ( '' !== $phone_raw ) {
			$tel_href = 'tel:' . preg_replace( '/[^0-9+]/', '', $phone_raw );
			$inner    = $icon_html( 'phone' ) . '<span>' . Sgs_Site_Info::get_esc_html( 'phone' ) . '</span>';
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
		$email_raw = (string) Sgs_Site_Info::get( 'email', '' );
		if ( '' !== $email_raw && is_email( $email_raw ) ) {
			$inner = $icon_html( 'mail' ) . '<span>' . Sgs_Site_Info::get_esc_html( 'email' ) . '</span>';
			if ( $link_email ) {
				$html = sprintf(
					'<a href="%s" class="sgs-business-info__link">%s</a>',
					esc_url( 'mailto:' . antispambot( $email_raw ) ),
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
		$address_raw = (string) Sgs_Site_Info::get( 'address', '' );
		if ( '' !== $address_raw ) {
			// Address is stored sanitised by Sgs_Site_Info::sanitise_address()
			// which allows only plain text + <br>. Safe to echo as-is.
			$html = sprintf(
				'<address class="sgs-business-info sgs-business-address">%s%s</address>',
				$icon_html( 'map-pin' ),
				wp_kses( $address_raw, array( 'br' => array() ) )
			);
		} else {
			$html = '<address class="sgs-business-info sgs-business-address">' . $placeholder . '</address>';
		}
		break;

	// ── Opening Hours ─────────────────────────────────────────────────────────
	case 'hours':
		$days = array(
			'mon' => __( 'Monday', 'sgs-blocks' ),
			'tue' => __( 'Tuesday', 'sgs-blocks' ),
			'wed' => __( 'Wednesday', 'sgs-blocks' ),
			'thu' => __( 'Thursday', 'sgs-blocks' ),
			'fri' => __( 'Friday', 'sgs-blocks' ),
			'sat' => __( 'Saturday', 'sgs-blocks' ),
			'sun' => __( 'Sunday', 'sgs-blocks' ),
		);

		$rows     = '';
		$has_rows = false;
		foreach ( $days as $slug => $label ) {
			$value = (string) Sgs_Site_Info::get( "opening_hours.{$slug}", '' );
			if ( '' === $value ) {
				continue;
			}
			$has_rows = true;
			$rows    .= sprintf(
				'<div class="sgs-business-hours__row"><dt class="sgs-business-hours__day">%s</dt><dd class="sgs-business-hours__time">%s</dd></div>',
				esc_html( $label ),
				Sgs_Site_Info::get_esc_html( "opening_hours.{$slug}" )
			);
		}

		if ( $has_rows ) {
			$html = sprintf( '<dl class="sgs-business-info sgs-business-hours">%s</dl>', $rows );
		} else {
			$html = '<dl class="sgs-business-info sgs-business-hours"><div class="sgs-business-hours__row">' . $placeholder . '</div></dl>';
		}
		break;

	// ── Social Links ──────────────────────────────────────────────────────────
	case 'socials':
		$social_map = array(
			'linkedin'  => array(
				'icon'  => 'linkedin',
				'label' => 'LinkedIn',
			),
			'facebook'  => array(
				'icon'  => 'facebook',
				'label' => 'Facebook',
			),
			'instagram' => array(
				'icon'  => 'instagram',
				'label' => 'Instagram',
			),
			'youtube'   => array(
				'icon'  => 'youtube',
				'label' => 'YouTube',
			),
			'tiktok'    => array(
				'icon'  => 'music',
				'label' => 'TikTok',
			),
			'twitter'   => array(
				'icon'  => 'twitter',
				'label' => 'X/Twitter',
			),
			'whatsapp'  => array(
				'icon'  => 'message-circle',
				'label' => 'WhatsApp',
			),
		);

		$items = '';
		foreach ( $social_map as $slug => $meta ) {
			$url_raw = (string) Sgs_Site_Info::get( "socials.{$slug}", '' );
			if ( '' === $url_raw ) {
				continue;
			}
			$items .= sprintf(
				'<li class="sgs-business-socials__item"><a href="%s" target="_blank" rel="noopener noreferrer" aria-label="%s" class="sgs-business-socials__link">%s</a></li>',
				Sgs_Site_Info::get_esc_url( "socials.{$slug}" ),
				esc_attr( $meta['label'] ),
				sgs_get_lucide_icon( $meta['icon'] )
			);
		}

		if ( '' !== $items ) {
			$html = sprintf( '<ul class="sgs-business-info sgs-business-socials">%s</ul>', $items );
		} else {
			$html = '<ul class="sgs-business-info sgs-business-socials"><li>' . $placeholder . '</li></ul>';
		}
		break;

	// ── Copyright ─────────────────────────────────────────────────────────────
	case 'copyright':
		$name_raw = (string) Sgs_Site_Info::get( 'copyright', '' );
		if ( '' !== $name_raw ) {
			$html = sprintf(
				'<p class="sgs-business-info sgs-business-copyright">%s &copy; %s %s</p>',
				esc_html__( 'Copyright', 'sgs-blocks' ),
				esc_html( gmdate( 'Y' ) ),
				Sgs_Site_Info::get_esc_html( 'copyright' )
			);
		} else {
			$html = '<p class="sgs-business-info sgs-business-copyright">' . $placeholder . '</p>';
		}
		break;

	// ── Description / Tagline ─────────────────────────────────────────────────
	case 'description':
		$tagline_raw = (string) Sgs_Site_Info::get( 'tagline', '' );
		if ( '' !== $tagline_raw ) {
			$html = sprintf(
				'<p class="sgs-business-info sgs-business-description">%s</p>',
				nl2br( Sgs_Site_Info::get_esc_html( 'tagline' ) )
			);
		} else {
			$html = '<p class="sgs-business-info sgs-business-description">' . $placeholder . '</p>';
		}
		break;

	// ── Map Embed ─────────────────────────────────────────────────────────────
	case 'map':
		$address_raw = (string) Sgs_Site_Info::get( 'address', '' );
		if ( '' !== $address_raw ) {
			// Strip <br> back to commas for the maps search query.
			$query   = trim( preg_replace( '/\s*<br\s*\/?>\s*/i', ', ', $address_raw ) );
			$map_url = 'https://maps.google.com/maps?q=' . rawurlencode( $query ) . '&z=15&hl=en&t=m&output=embed&iwloc=near';
			$html    = sprintf(
				'<div class="sgs-business-info sgs-business-map"><iframe src="%s" width="100%%" height="400" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="%s"></iframe></div>',
				esc_url( $map_url ),
				esc_attr__( 'Business location map', 'sgs-blocks' )
			);
		} else {
			$html = '<div class="sgs-business-info sgs-business-map">' . $placeholder . '</div>';
		}
		break;
}

// Emit colour CSS custom properties so style.css can consume them.
$wrapper_styles = array(
	'--sgs-bi-icon-colour:' . sgs_colour_value( $icon_colour ),
	'--sgs-bi-text-colour:' . sgs_colour_value( $text_colour ),
	'--sgs-bi-label-colour:' . sgs_colour_value( $label_colour ),
);

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => 'sgs-business-info-wrap sgs-business-info-wrap--' . esc_attr( $display_type ),
		'style' => implode( ';', $wrapper_styles ) . ';',
	)
);

// $wrapper_attributes is pre-escaped by get_block_wrapper_attributes() (core).
// $html is composed entirely from internally-escaped pieces (esc_html/esc_url/esc_attr).
printf( '<div %s>%s</div>', $wrapper_attributes, $html ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
