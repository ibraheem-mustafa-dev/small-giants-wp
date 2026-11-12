<?php
/**
 * The universal rich-text formats' server half (Spec 02 FR-2-4 highlight, FR-2-5 inline photo).
 *
 * Functions:
 *   sgs_rich_text_kses()              — the sanitiser every SGS render prints RichText through: the post allowlist
 *                                         with `style` removed from every tag, so pasted or imported inline style
 *                                         never reaches the page, and `img` limited to the inline photo's attributes
 *   sgs_authored_text_plain()          — the same typed value as plain text, for the places markup cannot go: an HTML
 *                                         attribute (aria-label, title, alt, data-*) or a JS string
 *   sgs_inline_format_palette_css()    — one `.sgs-highlight--{slug}` rule per palette colour, so a highlight picked
 *                                         from the palette is coloured by class
 *   sgs_inline_formats_maybe_enqueue() — a `render_block` filter: loads the `sgs-inline-formats` stylesheet
 *                                         (registered in class-sgs-blocks.php) only for markup holding a highlight or
 *                                         an inline photo
 *   sgs_inline_formats_enqueue()       — enqueues that stylesheet with its palette rules, once per request
 *   sgs_basket_count_enqueue()         — enqueues the basket-count view module (Spec 27 FR-30-24), only for markup
 *                                         holding a `sgs-basket-count` span
 *   sgs_basket_count_print()           — empties each such span, or fills it with the basket's count on cart/checkout
 *
 * The button label keeps its own narrower allowlist (src/blocks/button/render.php).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';

if ( ! function_exists( 'sgs_rich_text_kses' ) ) {
	/**
	 * Sanitise RichText markup for output: the post allowlist without inline style.
	 *
	 * Pass `$links = false` for text printed inside an `<a>`, `<button>` or `<summary>`: a nested link is invalid HTML,
	 * so `<a>` is dropped and its words stay.
	 *
	 * `$formats` is the format list the setting's editor offers (src/utils/rich-text-formats.js): 'free' (default: bold,
	 * italic, strikethrough, link, line break: an `<img>` and a highlight class are stripped to their words) or 'body'
	 * (RICH_TEXT_BODY: the free formats plus the inline photo and the highlight). A setting keeps the photo or the
	 * highlight only where its editor holds that format.
	 *
	 * @param mixed  $html    RichText markup; anything that is not a scalar sanitises to ''.
	 * @param bool   $links   Whether a link may stay (default true).
	 * @param string $formats 'free' or 'body'.
	 * @return string Sanitised markup.
	 */
	function sgs_rich_text_kses( $html, bool $links = true, string $formats = 'free' ): string {
		static $allowed = null;
		$html           = is_scalar( $html ) ? (string) $html : '';
		if ( null === $allowed ) {
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
		}
		// A `<` that opens no tag (a stored plain value like "5 < 6") is text: kses would read it as the start of a tag and
		// drop everything up to the next `>`.
		$html = preg_replace( '/<(?![a-zA-Z\/!])/', '&lt;', $html ) ?? '';
		if ( ! $links ) {
			$html = preg_replace( '#</?a(?:\s[^>]*)?>#i', '', $html ) ?? '';
		}
		$set = $allowed;
		if ( 'body' !== $formats ) {
			// The setting holds neither the inline photo nor the highlight: no image, no highlight class.
			unset( $set['img'] );
			$html = preg_replace( '#\s+class\s*=\s*(?:"[^"]*sgs-highlight[^"]*"|\x27[^\x27]*sgs-highlight[^\x27]*\x27)#i', '', $html ) ?? '';
		}
		return wp_kses( $html, $set );
	}
}

if ( ! function_exists( 'sgs_authored_text_plain' ) ) {
	/**
	 * A typed rich value as plain text: line breaks become a space, tags are stripped, entities decoded, white space
	 * collapsed. The caller escapes it for where it lands (`esc_attr()`, `wp_json_encode()`).
	 *
	 * @param mixed $value RichText markup or plain text; anything that is not a scalar reads as ''.
	 * @return string Plain text.
	 */
	function sgs_authored_text_plain( $value ): string {
		$text = is_scalar( $value ) ? (string) $value : '';
		$text = preg_replace( '#<br\s*/?>#i', ' ', $text ) ?? '';
		$text = html_entity_decode( wp_strip_all_tags( $text ), ENT_QUOTES, 'UTF-8' );
		return trim( (string) preg_replace( '/\s+/u', ' ', $text ) );
	}
}

if ( ! function_exists( 'sgs_rich_text_sanitise_param' ) ) {
	/**
	 * A REST argument sanitiser for typed rich text that prints inside a link or button: the sanitised markup, no link.
	 *
	 * @param mixed $value The request value.
	 * @return string Sanitised markup.
	 */
	function sgs_rich_text_sanitise_param( $value ): string {
		return sgs_rich_text_kses( $value, false );
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
	 * Enqueue the `sgs-inline-formats` stylesheet with its palette rules.
	 *
	 * The guard is the current style queue, not a per-request flag: the editor collects the canvas iframe's styles
	 * in a fresh queue after the post content has rendered (and enqueued the sheet) in the admin document, so the
	 * canvas call must still enqueue. The palette rules are added once, because they live on the registration,
	 * which the canvas queue copies.
	 *
	 * @return void
	 */
	function sgs_inline_formats_enqueue(): void {
		static $palette_added = false;
		if ( ! wp_style_is( 'sgs-inline-formats', 'registered' ) || wp_style_is( 'sgs-inline-formats', 'enqueued' ) ) {
			return;
		}
		wp_enqueue_style( 'sgs-inline-formats' );
		if ( $palette_added ) {
			return;
		}
		$palette_added = true;
		$css           = sgs_inline_format_palette_css();
		if ( '' !== $css ) {
			wp_add_inline_style( 'sgs-inline-formats', $css );
		}
	}
}

if ( ! function_exists( 'sgs_basket_count_enqueue' ) ) {
	/**
	 * Load the basket-count view module, once per request; called only for markup holding a `sgs-basket-count` span.
	 *
	 * @return void
	 */
	function sgs_basket_count_enqueue(): void {
		$base = defined( 'SGS_BLOCKS_PATH' ) ? SGS_BLOCKS_PATH : dirname( __DIR__ ) . '/';
		$url  = defined( 'SGS_BLOCKS_URL' ) ? SGS_BLOCKS_URL : '';
		$js   = 'build/basket-count/index.js';
		if ( is_file( $base . $js ) ) {
			wp_enqueue_script_module( '@sgs/basket-count', $url . $js, array(), (string) filemtime( $base . $js ) );
		}
	}
}

if ( ! function_exists( 'sgs_basket_count_print' ) ) {
	/**
	 * Empty each basket-count span, or fill it with the basket's item count on cart and checkout.
	 *
	 * The words an author selects to stand for the number show in the editor only, so the span is printed empty and the
	 * page never flashes a wrong figure. Cart and checkout are never page-cached, so there the server prints the real
	 * count (the script then keeps it current); every other page is cached for everyone and is filled by the script.
	 *
	 * @param string $html The block's rendered markup.
	 * @return string The markup with each text-only basket-count span emptied or filled.
	 */
	function sgs_basket_count_print( string $html ): string {
		$count = '';
		if ( function_exists( 'is_cart' ) && function_exists( 'is_checkout' ) && ( is_cart() || is_checkout() )
			&& function_exists( 'WC' ) && WC() && WC()->cart ) {
			$count = (string) (int) WC()->cart->get_cart_contents_count();
		}
		$printed = preg_replace(
			'#(<span\b[^>]*\bclass="[^"]*\bsgs-basket-count\b[^"]*"[^>]*>)[^<]*(</span>)#',
			'${1}' . $count . '${2}',
			$html
		);
		return is_string( $printed ) ? $printed : $html;
	}
}

if ( ! function_exists( 'sgs_inline_formats_maybe_enqueue' ) ) {
	/**
	 * `render_block` filter: load the inline-format assets the block's markup needs. A highlight or a photo loads the
	 * stylesheet; a basket count loads its view module and prints its span empty (or filled on cart and checkout).
	 *
	 * Parameters stay untyped: a hook callback typed `string` fatals on the null some blocks pass.
	 *
	 * @param mixed $block_content The block's rendered markup.
	 * @param mixed $block         The parsed block (unused).
	 * @return mixed The markup.
	 */
	function sgs_inline_formats_maybe_enqueue( $block_content, $block = array() ) {
		unset( $block );
		if ( ! is_string( $block_content ) ) {
			return $block_content;
		}
		if ( false !== strpos( $block_content, 'sgs-highlight' ) || false !== strpos( $block_content, 'sgs-inline-photo' ) ) {
			sgs_inline_formats_enqueue();
		}
		if ( false !== strpos( $block_content, 'sgs-basket-count' ) && ! is_admin() && ! ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			sgs_basket_count_enqueue();
			$block_content = sgs_basket_count_print( $block_content );
		}
		return $block_content;
	}
}

if ( ! function_exists( 'sgs_inline_photo_img_tag' ) ) {
	/**
	 * `wp_content_img_tag` filter: an inline photo (the `sgs-inline-photo` format, sized in `em` beside the words) loads
	 * lazily with `sizes="auto, …"`, so the browser picks the file from its drawn size, and never takes the page's high
	 * fetch priority: it is a small decoration in a line of text, never the main image.
	 *
	 * Parameters stay untyped: a hook callback typed `string` fatals on an unexpected value.
	 *
	 * @param mixed $filtered_image The image tag.
	 * @return mixed The tag.
	 */
	function sgs_inline_photo_img_tag( $filtered_image ) {
		if ( ! is_string( $filtered_image ) || ! preg_match( '/\bclass="[^"]*\bsgs-inline-photo\b/', $filtered_image ) ) {
			return $filtered_image;
		}
		$tag = (string) preg_replace( '/\s(?:fetchpriority|loading)="[^"]*"/', '', $filtered_image );
		$tag = (string) preg_replace( '/^<img\b/', '<img loading="lazy"', $tag, 1 );
		if ( preg_match( '/\ssizes="([^"]*)"/', $tag, $m ) ) {
			if ( 0 !== stripos( ltrim( $m[1] ), 'auto' ) ) {
				$tag = str_replace( $m[0], ' sizes="auto, ' . $m[1] . '"', $tag );
			}
		} else {
			$tag = (string) preg_replace( '/^<img\b/', '<img sizes="auto"', $tag, 1 );
		}
		return $tag;
	}
}
