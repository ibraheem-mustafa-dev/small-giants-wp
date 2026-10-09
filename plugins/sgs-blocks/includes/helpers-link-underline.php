<?php
/**
 * How the links inside a block's text are underlined.
 *
 * One setting beside a block's link colour, read from `{prefix}LinkUnderline`:
 *   ''       the theme's own link underline (nothing is emitted)
 *   'none'   no underline
 *   'always' an underline at rest
 *   'sweep'  no underline at rest; on hover or keyboard focus a line sweeps in left
 *            to right and plays back on leave
 * `{prefix}LinkUnderlineThickness` sets the line's thickness for 'always' and 'sweep'.
 * The line is in the link's own colour (currentColor), so the block's link colour
 * row, normal and hover, colours it too.
 *
 * The sweep is a background line, not a border or a positioned pseudo-element, so on
 * an inline link it runs along every wrapped line in reading order (the technique of
 * the theme's `.sgs-hover-underline-slide` utility, with the same
 * `--wp--custom--link-sweep--thickness` / `--duration` tokens as its defaults). It
 * starts from the inline end on a right-to-left page, shows at once under reduced
 * motion, and in forced-colours mode (where background images are not painted and
 * links take the system colour) a real underline shows at rest, for 'none' too. A link painted with a gradient text colour uses
 * its background for the glyphs, so the sweep is skipped there and the theme's
 * underline stays. The line sits on the content box, so a link padded out to a 44px
 * touch target (business-info's) draws it under its text, not under the padding.
 *
 * Canvas twin: `src/utils/link-underline.js::linkUnderlinePreviewCss`.
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-hover-state.php';
require_once __DIR__ . '/helpers-css-safety.php';
require_once __DIR__ . '/helpers-typography.php';

if ( ! function_exists( 'sgs_link_underline_css' ) ) {
	/**
	 * CSS for how the links inside `$selector` are underlined.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Attribute prefix ('' for the block's own text), as sgs_link_colour_css.
	 * @param string $selector   Scoped selector of the element holding the links (not the `a`).
	 * @param string $paint      Optional descendant selector (leading space) inside the link that carries the
	 *                           sweep line. For a link that is a flex box, an inline element inside it lets the
	 *                           line follow every wrapped line instead of sitting under the box's last line.
	 * @return string CSS, or '' when the setting is unset or unknown.
	 */
	function sgs_link_underline_css( array $attributes, $prefix, $selector, $paint = '' ): string {
		$mode = (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkUnderline' ) ] ?? '' );
		if ( ! in_array( $mode, array( 'none', 'always', 'sweep' ), true ) || '' === trim( (string) $selector ) ) {
			return '';
		}

		$link = $selector . ' a';
		// Forced-colours mode paints links in the system colour only: the line comes back at rest.
		$forced = '@media (forced-colors: active){' . $link . '{text-decoration:underline;}}';
		if ( 'none' === $mode ) {
			return $link . '{text-decoration:none;}' . $forced;
		}

		$thickness = sgs_css_length_value( (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkUnderlineThickness' ) ] ?? '' ) );

		if ( 'always' === $mode ) {
			return $link . '{text-decoration-line:underline;' . ( '' !== $thickness ? 'text-decoration-thickness:' . $thickness . ';' : '' ) . '}';
		}

		// 'sweep': a gradient link colour already owns the link's background.
		if ( '' !== (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkColourGradient' ) ] ?? '' ) ) {
			return '';
		}
		$size = '' !== $thickness ? $thickness : 'var(--wp--custom--link-sweep--thickness, 1px)';

		$line = $link . $paint;
		// With a paint target the link itself only drops its text underline; the line is drawn on the target.
		$css  = '' === $paint ? '' : $link . '{text-decoration:none;}';
		$css .= $line . '{' . ( '' === $paint ? 'text-decoration:none;' : '' ) . 'background-image:linear-gradient(currentColor,currentColor);'
			. 'background-repeat:no-repeat;background-origin:content-box;background-position:0 100%;background-size:0 ' . $size . ';'
			. 'transition:background-size var(--wp--custom--link-sweep--duration, 0.25s) ease-out;}';
		$css .= $line . ':dir(rtl){background-position:100% 100%;}';
		$css .= sgs_hover_state_rules( $link, 'background-size:100% ' . $size, ':focus-visible', $paint );
		$css .= '@media (prefers-reduced-motion: reduce){' . $line . '{transition:none;}}';
		$css .= $forced;
		return $css;
	}
}
