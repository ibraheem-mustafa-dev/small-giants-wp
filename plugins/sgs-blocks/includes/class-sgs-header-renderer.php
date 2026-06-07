<?php
/**
 * SGS Header — Customiser CSS renderer (Decision 21, Phase 5b).
 *
 * Reads the Customiser option values written by {@see Sgs_Header_Customiser}
 * and emits a small inline <style> block on `wp_head` containing CSS custom
 * properties scoped to the `.wp-block-template-part[data-type="header"]`
 * selector. Template-part markup applies these properties to heading, text,
 * link, and background elements inside the header area.
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
 * Class Sgs_Header_Renderer
 *
 * Static entry point — call {@see self::register()} from the plugin bootstrap.
 */
final class Sgs_Header_Renderer {

	/**
	 * Wire WP hooks. Safe to call from sgs-blocks.php bootstrap.
	 */
	public static function register(): void {
		\add_action( 'wp_head', array( __CLASS__, 'render_css' ), 25 );
		\add_filter( 'render_block_core/template-part', array( __CLASS__, 'add_wrapper_class' ), 10, 2 );
	}

	/**
	 * Add the `sgs-header` class to the root element of the header template part.
	 *
	 * WP renders `<header class="wp-block-template-part">` for template parts with
	 * `area: header`. This filter injects `sgs-header` so CSS and JS can target the
	 * header root with a stable SGS class rather than depending on a hardcoded
	 * `header.wp-block-template-part` selector (which is theme-infrastructure detail).
	 *
	 * Only fires when `tagName` is 'header' — leaves footer template parts
	 * untouched (those are handled by {@see Sgs_Footer_Renderer::add_wrapper_class}).
	 *
	 * @param string $block_content Rendered block HTML.
	 * @param array  $block         Block metadata.
	 * @return string
	 */
	public static function add_wrapper_class( string $block_content, array $block ): string {
		$tag_name = $block['attrs']['tagName'] ?? '';
		if ( 'header' !== $tag_name ) {
			return $block_content;
		}
		// Inject `sgs-header` into the first opening tag's class attribute.
		return \preg_replace(
			'/(<header\b[^>]*\bclass=")/i',
			'$1sgs-header ',
			$block_content,
			1
		) ?? $block_content;
	}

	// ── Public render method ─────────────────────────────────────────────────

	/**
	 * Emit inline CSS custom properties for header Customiser settings.
	 *
	 * Outputs a `<style id="sgs-header-customiser">` block containing:
	 *   --sgs-header-bg:    background colour
	 *   --sgs-header-text:  text colour
	 *   --sgs-header-link:  link colour
	 *   --sgs-header-width: max-width
	 * And applies position:sticky when the sticky option is enabled.
	 *
	 * Tokens declared on `:root` so they're always available to the cascade.
	 * Paint rules target `header.wp-block-template-part` — the WP-canonical
	 * wrapper element emitted for `area: header` template parts on every
	 * block theme, including SGS. This avoids depending on operator-edited
	 * inner block-group class names which can drift via the Site Editor.
	 */
	public static function render_css(): void {
		$bg    = self::get_colour( Sgs_Header_Customiser::OPT_BG_COLOUR, Sgs_Header_Customiser::DEFAULT_BG_COLOUR );
		$text  = self::get_colour( Sgs_Header_Customiser::OPT_TEXT_COLOUR, Sgs_Header_Customiser::DEFAULT_TEXT_COLOUR );
		$link  = self::get_colour( Sgs_Header_Customiser::OPT_LINK_COLOUR, Sgs_Header_Customiser::DEFAULT_LINK_COLOUR );
		$width = self::get_css_size( Sgs_Header_Customiser::OPT_MAX_WIDTH, Sgs_Header_Customiser::DEFAULT_MAX_WIDTH );

		$sticky = (bool) \get_option( Sgs_Header_Customiser::OPT_STICKY, Sgs_Header_Customiser::DEFAULT_STICKY );
		$css    = '';

		// Emit custom properties block only when at least one differs from default.
		$has_custom = (
			Sgs_Header_Customiser::DEFAULT_BG_COLOUR !== $bg ||
			Sgs_Header_Customiser::DEFAULT_TEXT_COLOUR !== $text ||
			Sgs_Header_Customiser::DEFAULT_LINK_COLOUR !== $link ||
			Sgs_Header_Customiser::DEFAULT_MAX_WIDTH !== $width
		);

		if ( $has_custom ) {
			// Tokens on :root — always available across the cascade.
			$css .= ':root{';
			$css .= '--sgs-header-bg:' . \esc_attr( $bg ) . ';';
			$css .= '--sgs-header-text:' . \esc_attr( $text ) . ';';
			$css .= '--sgs-header-link:' . \esc_attr( $link ) . ';';
			$css .= '--sgs-header-width:' . \esc_attr( $width ) . ';';
			$css .= '}';
			// Paint rules on the WP-canonical template-part wrapper.
			$css .= 'header.wp-block-template-part{';
			$css .= 'background-color:var(--sgs-header-bg);';
			$css .= 'color:var(--sgs-header-text);';
			$css .= '}';
			$css .= 'header.wp-block-template-part > .wp-block-group{max-width:var(--sgs-header-width);margin-inline:auto;}';
			$css .= 'header.wp-block-template-part a{color:var(--sgs-header-link);}';
		}

		if ( $sticky ) {
			$css .= 'header.wp-block-template-part{position:sticky;top:0;z-index:100;}';
		}

		if ( '' === $css ) {
			return;
		}

		echo '<style id="sgs-header-customiser">' . $css . '</style>' . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- values are individually escaped above
	}

	// ── Helpers ──────────────────────────────────────────────────────────────

	/**
	 * Read and sanitise a hex colour option. Returns the default when missing
	 * or invalid.
	 *
	 * @param string $option_key  wp_options key.
	 * @param string $fallback    Fallback hex colour when option is missing or invalid.
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
	 * @param string $option_key  wp_options key.
	 * @param string $fallback    Fallback CSS size value.
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
