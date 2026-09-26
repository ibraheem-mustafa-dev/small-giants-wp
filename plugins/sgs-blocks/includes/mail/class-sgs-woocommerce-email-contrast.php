<?php
/**
 * SGS WooCommerce Email Contrast — keeps every WooCommerce transactional
 * email's links and headings on the site's text colour, never the brand
 * accent (unified-email plan row 7, Spec 04).
 *
 * WooCommerce's `emails/email-styles.php` (11.x, "sync colours with theme"
 * on by default) forces every link, `.link` and `.email-logo-text` onto
 * `woocommerce_email_base_color` whenever the `email_improvements` feature
 * is enabled — verified against WooCommerce trunk on sandybrown 2026-09-27
 * (`$link_color = $base;` when the feature flag is on, regardless of the
 * base/body pairing's own contrast). A client's brand accent doubles as that
 * base colour, so a light accent on a light body can fail contrast: Mama's
 * Munches measures `#f5d050` on `#fbf3dc` at 1.35:1. Bean's decision
 * (2026-09-26): links and headings always take the text colour; the accent
 * stays a background only.
 *
 * This appends `!important` overrides to the compiled email CSS via the
 * `woocommerce_email_styles` filter rather than touching WooCommerce's
 * template or its stored colour options, so it survives a WooCommerce
 * update, needs no per-site provisioning step, and never disturbs the
 * accent's use as the order-confirmation header band's background colour
 * (`#template_header`, left alone here — WooCommerce already picks a
 * contrasting colour for that band's own heading text via
 * `wc_light_or_dark()`).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Forces WooCommerce email link and heading colour onto the site's text colour. */
final class Sgs_Woocommerce_Email_Contrast {

	/** Wire the filter. Called once from sgs-blocks.php; a no-op until WooCommerce fires it. */
	public static function register(): void {
		\add_filter( 'woocommerce_email_styles', array( __CLASS__, 'force_text_colour' ) );
	}

	/**
	 * Append overrides that put links and content headings on the text colour.
	 *
	 * @param  string $css Compiled email CSS, before WooCommerce inlines it.
	 * @return string
	 */
	public static function force_text_colour( string $css ): string {
		$text = \get_option( 'woocommerce_email_text_color' );
		if ( ! \is_string( $text ) || 1 !== \preg_match( '/^#[0-9a-f]{3,8}$/i', $text ) ) {
			return $css;
		}

		return $css . "\na, .link, .email-logo-text, .email-order-detail-heading span a,\nh1, h2, h3 {\n\tcolor: {$text} !important;\n}\n";
	}
}
