<?php
/**
 * The universal rich-text formats' server half (Spec 02 FR-2-4 highlight, FR-2-5 inline photo).
 *
 * Functions:
 *   sgs_rich_text_kses()              — the sanitiser every SGS render prints RichText through: the post allowlist
 *                                         with `style` removed from every tag, so pasted or imported inline style
 *                                         never reaches the page, and `img` limited to the inline photo's attributes
 *   sgs_inline_format_palette_css()    — one `.sgs-highlight--{slug}` rule per palette colour, so a highlight picked
 *                                         from the palette is coloured by class
 *   sgs_inline_formats_maybe_enqueue() — a `render_block` filter: loads the `sgs-inline-formats` stylesheet
 *                                         (registered in class-sgs-blocks.php) only for markup holding a highlight or
 *                                         an inline photo
 *   sgs_inline_formats_enqueue()       — enqueues that stylesheet with its palette rules, once per request
 *
 * The button label keeps its own narrower allowlist (src/blocks/button/render.php).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_rich_text_kses' ) ) {
	/**
	 * Sanitise RichText markup for output: the post allowlist without inline style.
	 *
	 * @param mixed $html RichText markup; anything that is not a scalar sanitises to ''.
	 * @return string Sanitised markup.
	 */
	function sgs_rich_text_kses( $html ): string {
		$html    = is_scalar( $html ) ? (string) $html : '';
		$allowed = wp_kses_allowed_html( 'post' );
		foreach ( $allowed as $tag => $attributes ) {
			if ( is_array( $attributes ) ) {
				unset( $allowed[ $tag ]['style'] );
			}
		}
		$allowed['img'] = array(
			'src'      => true,
			'alt'      => true,
			'class'    => true,
			'srcset'   => true,
			'sizes'    => true,
			'width'    => true,
			'height'   => true,
			'loading'  => true,
			'decoding' => true,
		);
		return wp_kses( $html, $allowed );
	}
}

if ( ! function_exists( 'sgs_inline_format_palette_css' ) ) {
	/**
	 * The highlight colour rule for each palette slug that is safe in a selector.
	 *
	 * Reads every palette origin (default, theme, custom) and a flat list alike; a slug appears once.
	 *
	 * @return string CSS, or '' when the palette is empty.
	 */
	function sgs_inline_format_palette_css(): string {
		$palette = wp_get_global_settings( array( 'color', 'palette' ) );
		if ( ! is_array( $palette ) ) {
			return '';
		}
		$entries = isset( $palette[0] ) || array() === $palette ? array( $palette ) : array_values( $palette );
		$seen    = array();
		$css     = '';
		foreach ( $entries as $origin ) {
			if ( ! is_array( $origin ) ) {
				continue;
			}
			foreach ( $origin as $colour ) {
				$slug = is_array( $colour ) && isset( $colour['slug'] ) ? (string) $colour['slug'] : '';
				if ( '' === $slug || isset( $seen[ $slug ] ) || 1 !== preg_match( '/^[a-z0-9-]+$/', $slug ) ) {
					continue;
				}
				$seen[ $slug ] = true;
				$css          .= '.sgs-highlight--' . $slug . '{--sgs-highlight-colour:var(--wp--preset--color--' . $slug . ')}';
			}
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_inline_formats_enqueue' ) ) {
	/**
	 * Enqueue the `sgs-inline-formats` stylesheet with its palette rules, once per request.
	 *
	 * @return void
	 */
	function sgs_inline_formats_enqueue(): void {
		static $done = false;
		if ( $done ) {
			return;
		}
		$done = true;
		wp_enqueue_style( 'sgs-inline-formats' );
		$css = sgs_inline_format_palette_css();
		if ( '' !== $css ) {
			wp_add_inline_style( 'sgs-inline-formats', $css );
		}
	}
}

if ( ! function_exists( 'sgs_inline_formats_maybe_enqueue' ) ) {
	/**
	 * `render_block` filter: load the inline-format stylesheet when the block's markup holds a highlight or a photo.
	 *
	 * Parameters stay untyped: a hook callback typed `string` fatals on the null some blocks pass.
	 *
	 * @param mixed $block_content The block's rendered markup.
	 * @param mixed $block         The parsed block (unused).
	 * @return mixed The markup, unchanged.
	 */
	function sgs_inline_formats_maybe_enqueue( $block_content, $block = array() ) {
		unset( $block );
		if ( ! is_string( $block_content ) ) {
			return $block_content;
		}
		if ( false !== strpos( $block_content, 'sgs-highlight' ) || false !== strpos( $block_content, 'sgs-inline-photo' ) ) {
			sgs_inline_formats_enqueue();
		}
		return $block_content;
	}
}
