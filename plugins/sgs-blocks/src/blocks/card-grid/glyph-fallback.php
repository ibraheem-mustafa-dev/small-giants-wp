<?php
/**
 * SGS Card Grid — per-item glyph icon + image-fallback tile helpers.
 *
 * Split out of render.php (already well over the 300-line file-length
 * guidance) rather than growing it further. Kept inside this block's own
 * directory per the wave-B shared brief (touch only the files a task names,
 * or new files inside the block's own directory).
 *
 * Two related additions for the Eye Care "Shop by shape" tiles, both
 * generic — no client words/colours hardcoded:
 *
 *   1. A per-item glyph icon (`items[].glyph`, a Lucide slug) shown inside
 *      `.sgs-card-grid__image-wrap`, over the photo or over the fallback
 *      tile. Reuses the SAME shared icon registry as sgs/icon and
 *      sgs/trust-bar (includes/lucide-icons.php::sgs_get_lucide_icon()) —
 *      no second icon system.
 *   2. An image-fallback tile (`imageFallback` block attribute): when a
 *      card has no media, paint a neutral coloured tile instead of an
 *      empty box, optionally carrying the card's glyph or its title's
 *      first letter.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_card_grid_glyph_html' ) ) {
	/**
	 * Sanitised SVG markup for a per-item glyph icon.
	 *
	 * @param string $icon_slug Lucide icon slug (already sanitize_key()'d by the caller).
	 * @return string `.sgs-card-grid__glyph` span markup, or '' when the slug is empty or unknown.
	 */
	function sgs_card_grid_glyph_html( string $icon_slug ): string {
		if ( '' === $icon_slug ) {
			return '';
		}

		$svg = sgs_get_lucide_icon( $icon_slug );
		if ( '' === $svg ) {
			// Unknown slug (e.g. an eyewear-shape name not yet in the shared
			// registry — see the block's own CLAUDE.md / task report) — never
			// render a broken/empty icon silently; just skip the glyph.
			return '';
		}

		return '<span class="sgs-card-grid__glyph" aria-hidden="true">'
			. wp_kses( $svg, sgs_svg_kses_allowed_tags() )
			. '</span>';
	}
}

if ( ! function_exists( 'sgs_card_grid_fallback_initial' ) ) {
	/**
	 * A single-letter fallback glyph — the card title's first character —
	 * shown inside the image-fallback tile when no glyph icon is set.
	 *
	 * @param string $title Card title (raw, unescaped).
	 * @return string `.sgs-card-grid__glyph-initial` span markup, or '' when the title is empty.
	 */
	function sgs_card_grid_fallback_initial( string $title ): string {
		$title = trim( $title );
		if ( '' === $title ) {
			return '';
		}

		// mb_* so a multi-byte first character (e.g. an accented letter) isn't
		// truncated mid-byte.
		$initial = mb_strtoupper( mb_substr( $title, 0, 1 ) );

		return '<span class="sgs-card-grid__glyph-initial" aria-hidden="true">'
			. esc_html( $initial )
			. '</span>';
	}
}

if ( ! function_exists( 'sgs_card_grid_glyph_css' ) ) {
	/**
	 * Scoped custom-property rule for the glyph size/colour and the
	 * image-fallback tile's background colour.
	 *
	 * Emits CUSTOM PROPERTIES on the instance root, never a direct override —
	 * an empty colour leaves the property unset, so style.css's own
	 * `var(--x, <theme-token-fallback>)` chain keeps rendering exactly as
	 * before (FR-35-5 empty-means-inherit pattern, same shape as this
	 * block's existing `$card_state_vars` in render.php).
	 *
	 * @param string $root_sel        This instance's scoped root selector.
	 * @param string $glyph_colour    Palette slug or raw colour, or ''.
	 * @param string $glyph_size      Glyph size as a CSS length (Spec 35 C5 —
	 *                                a UnitControl value, e.g. '32px'/'2rem'),
	 *                                sanitised here via sgs_css_length_value().
	 * @param string $fallback_colour Palette slug or raw colour for the fallback tile background, or ''.
	 * @return string CSS, ready to append to the block's own accumulated `<style>` string.
	 */
	function sgs_card_grid_glyph_css( string $root_sel, string $glyph_colour, string $glyph_size, string $fallback_colour ): string {
		// sgs_css_length_value() rejects anything that isn't a safe CSS length
		// and returns '' on rejection/empty — fall back to the block default
		// so a hand-authored or cloned junk value never breaks the glyph size.
		$size_length = sgs_css_length_value( $glyph_size );
		if ( '' === $size_length ) {
			$size_length = '32px';
		}

		$decls = '--sgs-card-grid-glyph-size:' . $size_length . ';';

		if ( '' !== $glyph_colour ) {
			$decls .= '--sgs-card-grid-glyph-colour:' . sgs_colour_value( $glyph_colour ) . ';';
		}

		if ( '' !== $fallback_colour ) {
			$decls .= '--sgs-card-grid-fallback-bg:' . sgs_colour_value( $fallback_colour ) . ';';
		}

		return $root_sel . '{' . $decls . '}';
	}
}

if ( ! function_exists( 'sgs_card_grid_glyph_image_html' ) ) {
	/**
	 * `.sgs-card-grid__glyph` markup for an uploaded IMAGE glyph
	 * (`items[].glyphImage`, wave B round 2) — an alternative to the Lucide
	 * icon slug, in the SAME slot, sized by the same
	 * `--sgs-card-grid-glyph-size` custom property. Wins over `glyph` when
	 * set — the caller (render.php) decides which of this or
	 * sgs_card_grid_glyph_html() to call per item.
	 *
	 * An empty alt is a valid, deliberate choice here: the wrapping span is
	 * already `aria-hidden="true"` (same reasoning as the Lucide glyph
	 * above — the card's own title already names it), so alt text never
	 * reaches assistive tech either way.
	 *
	 * @param array $glyph_image Item's `glyphImage` value — {url, id, alt}.
	 *                           Caller has already checked 'url' is non-empty.
	 * @return string `.sgs-card-grid__glyph` span markup wrapping an `<img>`,
	 *                or '' when the URL fails to sanitise.
	 */
	function sgs_card_grid_glyph_image_html( array $glyph_image ): string {
		$url = esc_url( (string) ( $glyph_image['url'] ?? '' ) );
		if ( '' === $url ) {
			return '';
		}
		$alt = isset( $glyph_image['alt'] ) ? (string) $glyph_image['alt'] : '';

		return '<span class="sgs-card-grid__glyph sgs-card-grid__glyph--image" aria-hidden="true">'
			. '<img src="' . $url . '" alt="' . esc_attr( $alt ) . '" loading="lazy">'
			. '</span>';
	}
}
