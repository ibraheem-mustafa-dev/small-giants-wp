<?php
/**
 * SGS Footer — Customiser CSS renderer (Decision 21, Phase 5b).
 *
 * Reads the Customiser option values written by {@see Sgs_Footer_Customiser}
 * and emits a small inline <style> block on `wp_head` containing CSS custom
 * properties scoped to `.wp-site-footer`. Template-part markup uses these
 * properties for background, text, and link colours.
 *
 * Only outputs markup when at least one option differs from the default —
 * zero unnecessary inline styles on fresh installs.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Footer_Renderer
 *
 * Static entry point — call {@see self::register()} from the plugin bootstrap.
 */
final class Sgs_Footer_Renderer {

	/**
	 * Wire WP hooks. Safe to call from sgs-blocks.php bootstrap.
	 */
	public static function register(): void {
		\add_action( 'wp_head', array( __CLASS__, 'render_css' ), 26 );
	}

	// ── Public render method ─────────────────────────────────────────────────

	/**
	 * Emit inline CSS custom properties for footer Customiser settings.
	 *
	 * Outputs a `<style id="sgs-footer-customiser">` block containing:
	 *   --sgs-footer-bg:    background colour
	 *   --sgs-footer-text:  text colour
	 *   --sgs-footer-link:  link colour
	 *   --sgs-footer-width: max-width
	 *
	 * Scoped to `.wp-site-footer` so it doesn't bleed into other areas.
	 */
	public static function render_css(): void {
		$bg    = self::get_colour( Sgs_Footer_Customiser::OPT_BG_COLOUR, Sgs_Footer_Customiser::DEFAULT_BG_COLOUR );
		$text  = self::get_colour( Sgs_Footer_Customiser::OPT_TEXT_COLOUR, Sgs_Footer_Customiser::DEFAULT_TEXT_COLOUR );
		$link  = self::get_colour( Sgs_Footer_Customiser::OPT_LINK_COLOUR, Sgs_Footer_Customiser::DEFAULT_LINK_COLOUR );
		$width = self::get_css_size( Sgs_Footer_Customiser::OPT_MAX_WIDTH, Sgs_Footer_Customiser::DEFAULT_MAX_WIDTH );

		$has_custom = (
			Sgs_Footer_Customiser::DEFAULT_BG_COLOUR !== $bg ||
			Sgs_Footer_Customiser::DEFAULT_TEXT_COLOUR !== $text ||
			Sgs_Footer_Customiser::DEFAULT_LINK_COLOUR !== $link ||
			Sgs_Footer_Customiser::DEFAULT_MAX_WIDTH !== $width
		);

		if ( ! $has_custom ) {
			return;
		}

		$css  = '.wp-site-footer{';
		$css .= '--sgs-footer-bg:' . \esc_attr( $bg ) . ';';
		$css .= '--sgs-footer-text:' . \esc_attr( $text ) . ';';
		$css .= '--sgs-footer-link:' . \esc_attr( $link ) . ';';
		$css .= '--sgs-footer-width:' . \esc_attr( $width ) . ';';
		$css .= 'background-color:var(--sgs-footer-bg);';
		$css .= 'color:var(--sgs-footer-text);';
		$css .= 'max-width:var(--sgs-footer-width);';
		$css .= '}';
		$css .= '.wp-site-footer a{color:var(--sgs-footer-link);}';

		echo '<style id="sgs-footer-customiser">' . $css . '</style>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- values are individually escaped above
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	/**
	 * Read and sanitise a hex colour option. Returns the fallback when missing or invalid.
	 *
	 * @param string $option_key wp_options key.
	 * @param string $fallback   Fallback hex colour.
	 * @return string
	 */
	private static function get_colour( string $option_key, string $fallback ): string {
		$raw       = (string) \get_option( $option_key, $fallback );
		$sanitised = \sanitize_hex_color( $raw );
		return ( null !== $sanitised && '' !== $sanitised ) ? $sanitised : $fallback;
	}

	/**
	 * Read and sanitise a CSS size option. Returns the fallback when invalid.
	 *
	 * @param string $option_key wp_options key.
	 * @param string $fallback   Fallback CSS size value.
	 * @return string
	 */
	private static function get_css_size( string $option_key, string $fallback ): string {
		$raw = \sanitize_text_field( (string) \get_option( $option_key, $fallback ) );
		if ( 1 === preg_match( '/^\d+(\.\d+)?(px|rem|em|%|vw|vh)$/', $raw ) ) {
			return $raw;
		}
		return $fallback;
	}
}
