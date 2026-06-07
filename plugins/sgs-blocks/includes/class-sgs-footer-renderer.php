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
		\add_filter( 'render_block_core/template-part', array( __CLASS__, 'add_wrapper_class' ), 10, 2 );
	}

	/**
	 * Add the `sgs-footer` class to the root element of the footer template part.
	 *
	 * WP renders `<footer class="wp-block-template-part">` for template parts with
	 * `area: footer`. This filter injects `sgs-footer` so CSS and JS can target the
	 * footer root without depending on a hardcoded `footer.wp-block-template-part`
	 * selector (which breaks if the area changes or a non-block theme is used).
	 *
	 * The `tagName` in block attrs is 'footer' for footer template parts, 'header'
	 * for header template parts. We match on 'footer' to stay surgical.
	 *
	 * @param string $block_content Rendered block HTML.
	 * @param array  $block         Block metadata.
	 * @return string
	 */
	public static function add_wrapper_class( string $block_content, array $block ): string {
		$tag_name = $block['attrs']['tagName'] ?? '';
		if ( 'footer' !== $tag_name ) {
			return $block_content;
		}
		// Inject `sgs-footer` into the first opening tag's class attribute.
		// Uses a targeted regex that matches only the outer wrapper element.
		return \preg_replace(
			'/(<footer\b[^>]*\bclass=")/i',
			'$1sgs-footer ',
			$block_content,
			1
		) ?? $block_content;
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
	 * Tokens declared on `:root`; paint rules target `footer.wp-block-template-part`
	 * — the WP-canonical wrapper element emitted for `area: footer` template
	 * parts on every block theme.
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

		$css  = ':root{';
		$css .= '--sgs-footer-bg:' . \esc_attr( $bg ) . ';';
		$css .= '--sgs-footer-text:' . \esc_attr( $text ) . ';';
		$css .= '--sgs-footer-link:' . \esc_attr( $link ) . ';';
		$css .= '--sgs-footer-width:' . \esc_attr( $width ) . ';';
		$css .= '}';
		$css .= 'footer.wp-block-template-part{';
		$css .= 'background-color:var(--sgs-footer-bg);';
		$css .= 'color:var(--sgs-footer-text);';
		$css .= '}';
		$css .= 'footer.wp-block-template-part > .wp-block-group{max-width:var(--sgs-footer-width);margin-inline:auto;}';
		$css .= 'footer.wp-block-template-part a{color:var(--sgs-footer-link);}';

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
