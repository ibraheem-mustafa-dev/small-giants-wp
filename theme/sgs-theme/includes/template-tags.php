<?php
/**
 * SGS Theme — Template Tag Helper Functions
 *
 * Global (no-namespace) functions that templates, patterns, and sgs-blocks
 * render.php files use to retrieve centralised site contact details from the
 * WordPress Customiser. Values are set in Appearance → Customise → SGS Site Info.
 *
 * These functions are intentionally in the global namespace so that block
 * render.php files inside sgs-blocks can call sgs_get_phone() etc. without
 * needing to import the SGS\Theme namespace.
 *
 * @package SGS\Theme
 *
 * @since 1.0.0
 */

defined( 'ABSPATH' ) || exit;

/**
 * Return the business name from the Customiser, falling back to the site title.
 *
 * @return string Business name (unescaped — escape on output).
 *
 * @since 1.0.0
 */
function sgs_get_business_name(): string {
	return (string) get_theme_mod( 'sgs_business_name', get_bloginfo( 'name' ) );
}

/**
 * Return the main phone number from the Customiser.
 *
 * @return string Phone number (unescaped — escape on output).
 *
 * @since 1.0.0
 */
function sgs_get_phone(): string {
	return (string) get_theme_mod( 'sgs_phone', '' );
}

/**
 * Return the main email address from the Customiser.
 *
 * @return string Email address (unescaped — escape on output).
 *
 * @since 1.0.0
 */
function sgs_get_email(): string {
	return (string) get_theme_mod( 'sgs_email', '' );
}

/**
 * Return the WhatsApp number from the Customiser.
 *
 * @return string WhatsApp number in international format (unescaped — no spaces or dashes).
 *
 * @since 1.0.0
 */
function sgs_get_whatsapp(): string {
	return (string) get_theme_mod( 'sgs_whatsapp', '' );
}

/**
 * Return all address fields as an associative array.
 *
 * Keys: line1, line2, city, postcode, country.
 * Empty strings are returned for unset fields; country defaults to "United Kingdom".
 *
 * @return array<string, string> Address parts (unescaped — escape on output).
 *
 * @since 1.0.0
 */
function sgs_get_address(): array {
	return [
		'line1'    => (string) get_theme_mod( 'sgs_address_line1', '' ),
		'line2'    => (string) get_theme_mod( 'sgs_address_line2', '' ),
		'city'     => (string) get_theme_mod( 'sgs_city', '' ),
		'postcode' => (string) get_theme_mod( 'sgs_postcode', '' ),
		'country'  => (string) get_theme_mod( 'sgs_country', 'United Kingdom' ),
	];
}

/**
 * Return an associative array of social media URLs from the Customiser.
 *
 * Keys: linkedin, facebook, instagram, twitter.
 * Empty strings are returned for services the site admin has not configured.
 *
 * @return array<string, string> Service slug → URL map (already sanitised via esc_url_raw).
 *
 * @since 1.0.0
 */
function sgs_get_social_urls(): array {
	return [
		'linkedin'  => (string) get_theme_mod( 'sgs_linkedin_url', '' ),
		'facebook'  => (string) get_theme_mod( 'sgs_facebook_url', '' ),
		'instagram' => (string) get_theme_mod( 'sgs_instagram_url', '' ),
		'twitter'   => (string) get_theme_mod( 'sgs_twitter_url', '' ),
	];
}

/**
 * Return the Google Maps embed src URL from the Customiser.
 *
 * @return string Google Maps embed URL (unescaped — use esc_url() on output).
 *
 * @since 1.0.0
 */
function sgs_get_maps_embed(): string {
	return (string) get_theme_mod( 'sgs_google_maps_embed', '' );
}

/**
 * Return the resolved copyright string.
 *
 * Replaces {year} with the current four-digit year and {business_name}
 * with the configured business name. The stored template value may contain
 * HTML entities (e.g. &copy;) which are preserved verbatim.
 *
 * Output is safe for echo or wp_kses_post() — the business name is HTML-escaped
 * and the template string is stored via sanitize_text_field().
 *
 * @return string Copyright text, ready to output.
 *
 * @since 1.0.0
 */
function sgs_get_copyright(): string {
	$template = (string) get_theme_mod(
		'sgs_copyright_text',
		'&copy; {year} {business_name}. All rights reserved.'
	);

	$template = str_replace( '{year}', gmdate( 'Y' ), $template );
	$template = str_replace( '{business_name}', esc_html( sgs_get_business_name() ), $template );

	return $template;
}
