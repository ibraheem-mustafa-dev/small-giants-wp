<?php
/**
 * Render helpers for sgs/icon: the length allowlist its scoped CSS accepts, its link's accessible name, and whether
 * a render is the editor's.
 *
 * Shared by `src/blocks/icon/render.php` and the `sgs/social-icons` wrapper that groups icons (icon plan Phase B).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-css-safety.php';
require_once __DIR__ . '/helpers-brand-glyphs.php';

if ( ! function_exists( 'sgs_icon_length_value' ) ) {
	/**
	 * A size an icon control stored, as one safe CSS length, or ''.
	 *
	 * Accepts only: a number (px), `<number>px|rem|em|%`, a theme spacing preset as `var(--wp--preset--spacing--x)`,
	 * or the bare preset slug the length control stores ('50'). Anything else, including `calc()`, keywords,
	 * negatives and any declaration breakout, gives ''. Lengths are clamped to `$max_px` (rem and em at 16px each,
	 * percentages at 100%).
	 *
	 * @param mixed $raw    Stored value.
	 * @param int   $max_px Largest length allowed, in px.
	 * @return string A CSS length, or ''.
	 */
	function sgs_icon_length_value( $raw, int $max_px = 512 ): string {
		if ( is_int( $raw ) || is_float( $raw ) ) {
			$raw = (string) $raw;
		}
		if ( ! is_string( $raw ) ) {
			return '';
		}
		$value = trim( $raw );
		if ( '' === $value ) {
			return '';
		}
		if ( preg_match( '/^var\(--wp--preset--spacing--([a-z0-9-]+)\)$/', $value ) ) {
			return $value;
		}
		if ( preg_match( '/^\d+$/', $value ) && in_array( $value, sgs_css_length_value_preset_slugs(), true ) ) {
			return 'var(--wp--preset--spacing--' . $value . ')';
		}
		if ( ! preg_match( '/^(\d+(?:\.\d+)?)(px|rem|em|%)?$/', $value, $m ) ) {
			return '';
		}
		$unit = $m[2] ?? '';
		$unit = '' === $unit ? 'px' : $unit;
		$max  = array(
			'px'  => (float) $max_px,
			'rem' => $max_px / 16,
			'em'  => $max_px / 16,
			'%'   => 100.0,
		)[ $unit ];
		$num  = min( (float) $m[1], $max );
		return rtrim( rtrim( number_format( $num, 3, '.', '' ), '0' ), '.' ) . $unit;
	}
}

if ( ! function_exists( 'sgs_icon_link_scheme' ) ) {
	/**
	 * A link's scheme, lowercase ('tel', 'mailto', 'https'), or '' for a relative link.
	 *
	 * @param string $url Link URL.
	 * @return string The scheme, or ''.
	 */
	function sgs_icon_link_scheme( string $url ): string {
		return preg_match( '/^([a-z][a-z0-9+.-]*):/i', trim( $url ), $m ) ? strtolower( $m[1] ) : '';
	}
}

if ( ! function_exists( 'sgs_icon_accessible_name' ) ) {
	/**
	 * The name a linked icon announces, first match wins: the client's own label; the registry's label for the Site
	 * Info key the link is bound to ('Call us'); the registry's label for the brand the glyph draws ('Follow us on
	 * Instagram'); a label from the link's scheme ('Call', 'Email'); the link's site name ('example.com'). '' when
	 * none applies (a relative link with no label), which the editor flags.
	 *
	 * @param string     $aria_label  The block's `ariaLabel`.
	 * @param string     $bound_key   Site Info key `linkUrl` is bound to, or ''.
	 * @param array|null $glyph_brand Registry entry the glyph draws, or null.
	 * @param string     $url         The link.
	 * @return string The accessible name (unescaped).
	 */
	function sgs_icon_accessible_name( string $aria_label, string $bound_key, ?array $glyph_brand, string $url ): string {
		$own = trim( $aria_label );
		if ( '' !== $own ) {
			return $own;
		}
		$key_brand = '' !== $bound_key ? sgs_brand_by_site_info_key( $bound_key ) : null;
		foreach ( array( $key_brand, $glyph_brand ) as $brand ) {
			if ( null !== $brand && '' !== $brand['autoLabel'] ) {
				return __( $brand['autoLabel'], 'sgs-blocks' ); // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralText -- registry labels (includes/data/brand-registry.json).
			}
		}
		$scheme = sgs_icon_link_scheme( $url );
		if ( 'tel' === $scheme ) {
			return __( 'Call', 'sgs-blocks' );
		}
		if ( 'mailto' === $scheme ) {
			return __( 'Email', 'sgs-blocks' );
		}
		if ( in_array( $scheme, array( 'http', 'https' ), true ) ) {
			$host = (string) ( function_exists( 'wp_parse_url' ) ? wp_parse_url( $url, PHP_URL_HOST ) : parse_url( $url, PHP_URL_HOST ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions.parse_url_parse_url -- fallback outside WordPress (unit tests).
			return (string) preg_replace( '/^www\./i', '', $host );
		}
		return '';
	}
}

if ( ! function_exists( 'sgs_icon_is_editor_render' ) ) {
	/**
	 * True when the block renders for the editor: an admin screen, or a REST request in the editor's `edit` context
	 * by a user who can edit posts (core's block renderer). A visitor's page, a logged-in admin on the front end and
	 * a public REST read are never the editor.
	 *
	 * @return bool
	 */
	function sgs_icon_is_editor_render(): bool {
		$is_ajax = function_exists( 'wp_doing_ajax' ) && wp_doing_ajax();
		if ( function_exists( 'is_admin' ) && is_admin() && ! $is_ajax ) {
			return true;
		}
		$is_rest = ( function_exists( 'wp_is_serving_rest_request' ) && wp_is_serving_rest_request() ) || ( defined( 'REST_REQUEST' ) && REST_REQUEST );
		if ( ! $is_rest ) {
			return false;
		}
		$context = isset( $_GET['context'] ) && is_string( $_GET['context'] ) ? strtolower( (string) preg_replace( '/[^a-z]/i', '', $_GET['context'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended,WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- read-only context flag, reduced to letters; the capability check decides.
		return 'edit' === $context && function_exists( 'current_user_can' ) && current_user_can( 'edit_posts' );
	}
}
