<?php
/**
 * SGS Mail Template — wraps an email body in the shared visual shell.
 *
 * Uses WooCommerce's own `emails/email-header.php`, `email-footer.php` and
 * `WC_Email::style_inline()` when WooCommerce is active, so every email a
 * client site sends looks alike. Falls back to `templates/email.php` (a
 * self-contained, inline-CSS table layout) when WooCommerce is not active.
 *
 * WC template signature verified against WooCommerce trunk (10.7.0,
 * `plugins/woocommerce/templates/emails/email-header.php` /
 * `email-footer.php`, fetched 2026-09-26): both templates accept an
 * `email_heading` string and an `email` object (nullable — only used for the
 * `woocommerce_email_footer_text` filter's second argument), and both echo
 * their markup rather than returning it, so the call site must buffer with
 * `ob_start()`. `WC_Email::style_inline( $content )` is an instance method
 * that inlines CSS only for `text/html` / `multipart/alternative` content
 * types (verified against `includes/emails/class-wc-email.php`); a bare
 * `new WC_Email()` defaults to `text/html`.
 *
 * TRUST BOUNDARY: `$html` is trusted, pre-escaped caller HTML — this class
 * does not escape it. Every caller of {@see self::wrap()} must escape its own
 * dynamic values before building `$html`.
 *
 * @package SGS\Blocks\Mail
 * @since   1.0.0
 */

namespace SGS\Blocks\Mail;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Mail_Template
 *
 * Public static API for wrapping email bodies in the shared template.
 */
final class Sgs_Mail_Template {

	/** Neutral fallback colours, used when no theme palette entry resolves. */
	const FALLBACK_TEXT    = '#1a1a1a';
	const FALLBACK_SURFACE = '#ffffff';
	const FALLBACK_PRIMARY = '#1a1a1a';

	/**
	 * Wrap a heading and an HTML body in the shared email template.
	 *
	 * @param  string $heading Heading text (already CR/LF-stripped by the caller).
	 * @param  string $html    Trusted, pre-escaped HTML body.
	 * @return string Complete HTML document.
	 */
	public static function wrap( string $heading, string $html ): string {
		return self::woocommerce_available()
			? self::wrap_woocommerce( $heading, $html )
			: self::wrap_native( $heading, $html );
	}

	/**
	 * Whether WooCommerce's email classes and templates are available.
	 *
	 * @return bool
	 */
	private static function woocommerce_available(): bool {
		return \function_exists( 'WC' ) && \class_exists( 'WC_Email' );
	}

	/**
	 * Build the wrapped email using WooCommerce's own header/footer templates
	 * and its `style_inline()` CSS inliner.
	 *
	 * @param  string $heading Heading text.
	 * @param  string $html    Trusted HTML body.
	 * @return string Complete, CSS-inlined HTML document.
	 */
	private static function wrap_woocommerce( string $heading, string $html ): string {
		\ob_start();
		\wc_get_template(
			'emails/email-header.php',
			array(
				'email_heading' => $heading,
				'email'         => null,
			)
		);
		echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- trusted, caller-escaped HTML; see class docblock.
		\wc_get_template( 'emails/email-footer.php', array( 'email' => null ) );
		$document = (string) \ob_get_clean();

		$email = new \WC_Email();
		return (string) $email->style_inline( $document );
	}

	/**
	 * Build the wrapped email using the SGS non-WooCommerce template.
	 *
	 * @param  string $heading Heading text.
	 * @param  string $html    Trusted HTML body.
	 * @return string Complete HTML document.
	 */
	private static function wrap_native( string $heading, string $html ): string { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter -- both are read by templates/email.php via the include() below, which inherits this method's local scope.
		$site_name = (string) \get_bloginfo( 'name' );
		$logo_url  = self::resolve_logo_url();

		$colour_text    = self::palette_colour( 'text', self::FALLBACK_TEXT );
		$colour_surface = self::palette_colour( 'surface', self::FALLBACK_SURFACE );
		$colour_primary = self::palette_colour( 'primary', self::FALLBACK_PRIMARY );

		\ob_start();
		include __DIR__ . '/templates/email.php';
		return (string) \ob_get_clean();
	}

	/**
	 * Resolve the site logo's URL via {@see \SGS\Blocks\Sgs_Site_Info_Logo}, when
	 * that class is loaded.
	 *
	 * @return string Logo URL, or '' when unset or the class is unavailable.
	 */
	private static function resolve_logo_url(): string {
		if ( ! \class_exists( '\SGS\Blocks\Sgs_Site_Info_Logo' ) ) {
			return '';
		}

		$logo_id = \SGS\Blocks\Sgs_Site_Info_Logo::get_id();
		if ( $logo_id <= 0 ) {
			return '';
		}

		$url = \wp_get_attachment_image_url( $logo_id, 'medium' );
		return \is_string( $url ) ? $url : '';
	}

	/**
	 * Read one theme palette colour by slug from the active global settings.
	 *
	 * @param  string $slug     Palette entry slug ('text', 'surface', 'primary').
	 * @param  string $fallback Fallback colour when the slug is absent or invalid.
	 * @return string A validated hex or rgb()/rgba() colour string.
	 */
	private static function palette_colour( string $slug, string $fallback ): string {
		$entries = \wp_get_global_settings( array( 'color', 'palette', 'theme' ) );
		if ( ! \is_array( $entries ) ) {
			return $fallback;
		}

		foreach ( $entries as $entry ) {
			if ( ! \is_array( $entry ) || ! isset( $entry['slug'], $entry['color'] ) || $slug !== $entry['slug'] ) {
				continue;
			}
			$colour = (string) $entry['color'];
			return self::is_valid_colour( $colour ) ? $colour : $fallback;
		}

		return $fallback;
	}

	/**
	 * Whether a string is a safe, well-formed hex or rgb()/rgba() colour —
	 * never echoed into a style attribute unvalidated.
	 *
	 * @param  string $colour Candidate colour string.
	 * @return bool
	 */
	private static function is_valid_colour( string $colour ): bool {
		if ( 1 === \preg_match( '/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i', $colour ) ) {
			return true;
		}
		return 1 === \preg_match( '/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/i', $colour );
	}
}
