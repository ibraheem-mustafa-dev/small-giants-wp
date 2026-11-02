<?php
/**
 * How the links inside a block's text are underlined.
 *
 * One setting beside a block's link colour, read from `{prefix}LinkUnderline`:
 *   ''       the theme's own link underline (nothing is emitted)
 *   'none'   no underline
 *   'always' an underline at rest
 *   'hover'  no underline at rest; on hover or keyboard focus a plain underline appears
 *   'sweep'  no underline at rest; on hover or keyboard focus a line sweeps in left
 *            to right and plays back on leave
 * `{prefix}LinkUnderlineThickness` sets the line's thickness for 'always', 'hover' and 'sweep'.
 * `{prefix}LinkUnderlineColour` and `{prefix}LinkUnderlineColourHover` paint the line in its own
 * colour at rest and on hover or focus (unset = the link's own colour, currentColor, so the block's
 * link colour row, normal and hover, colours it too). `{prefix}LinkUnderlineOffset` sets the gap
 * between the text and the line for 'always' and 'hover'; the sweep is a background line, so an
 * offset does not apply to it.
 *
 * The sweep is a background line, not a border or a positioned pseudo-element, so on
 * an inline link it runs along every wrapped line in reading order (the technique of
 * the theme's `.sgs-hover-underline-slide` utility, with the same
 * `--wp--custom--link-sweep--thickness` / `--duration` tokens as its defaults). It
 * starts from the inline end on a right-to-left page, shows at once under reduced
 * motion, and in forced-colours mode (where background images are not painted and
 * links take the system colour) a real underline shows at rest, for 'none' and 'hover' too. A link painted with a gradient text colour uses
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
require_once __DIR__ . '/helpers-tokens.php';
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
	 * @param bool   $self       True when `$selector` IS the link (a button is itself the `<a>`): the rules then style
	 *                           `$selector` rather than `$selector a`, and the stylesheet's own hover and focus resets
	 *                           are beaten variant by variant (see `sgs_link_underline_self_css`).
	 * @return string CSS, or '' when the setting is unset or unknown.
	 */
	function sgs_link_underline_css( array $attributes, $prefix, $selector, $paint = '', $self = false ): string {
		$mode = (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkUnderline' ) ] ?? '' );
		if ( ! in_array( $mode, array( 'none', 'always', 'hover', 'sweep' ), true ) || '' === trim( (string) $selector ) ) {
			return '';
		}
		if ( $self ) {
			return sgs_link_underline_self_css( $attributes, $prefix, (string) $selector, $mode, (string) $paint );
		}

		$link = $selector . ' a';
		// Forced-colours mode paints links in the system colour only: the line comes back at rest.
		$forced = '@media (forced-colors: active){' . $link . '{text-decoration:underline;}}';
		if ( 'none' === $mode ) {
			return $link . '{text-decoration:none;}' . $forced;
		}

		$thickness    = sgs_css_length_value( (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkUnderlineThickness' ) ] ?? '' ) );
		$offset       = sgs_css_length_value( (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkUnderlineOffset' ) ] ?? '' ) );
		$colour       = sgs_colour_value( (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkUnderlineColour' ) ] ?? '' ) );
		$colour_hover = sgs_colour_value( (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkUnderlineColourHover' ) ] ?? '' ) );

		if ( 'always' === $mode || 'hover' === $mode ) {
			// Longhands only: the `text-decoration` shorthand would reset the colour and thickness beside it.
			$css = $link . '{text-decoration-line:' . ( 'always' === $mode ? 'underline' : 'none' ) . ';'
				. ( '' !== $thickness ? 'text-decoration-thickness:' . $thickness . ';' : '' )
				. ( '' !== $colour ? 'text-decoration-color:' . $colour . ';' : '' )
				. ( '' !== $offset ? 'text-underline-offset:' . $offset . ';' : '' ) . '}';
			if ( 'always' === $mode ) {
				return $css . ( '' !== $colour_hover ? sgs_hover_state_rules( $link, 'text-decoration-color:' . $colour_hover ) : '' );
			}
			return $css
				. sgs_hover_state_rules( $link, 'text-decoration-line:underline' . ( '' !== $colour_hover ? ';text-decoration-color:' . $colour_hover : '' ) )
				. '@media (forced-colors: active){' . $link . '{text-decoration-line:underline;}}';
		}

		// 'sweep': a gradient link colour already owns the link's background.
		if ( '' !== (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkColourGradient' ) ] ?? '' ) ) {
			return '';
		}
		$size = '' !== $thickness ? $thickness : 'var(--wp--custom--link-sweep--thickness, 1px)';
		$ink  = '' !== $colour ? $colour : 'currentColor';

		$line = $link . $paint;
		// With a paint target the link itself only drops its text underline; the line is drawn on the target.
		$css  = '' === $paint ? '' : $link . '{text-decoration:none;}';
		$css .= $line . '{' . ( '' === $paint ? 'text-decoration:none;' : '' ) . 'background-image:linear-gradient(' . $ink . ',' . $ink . ');'
			. 'background-repeat:no-repeat;background-origin:content-box;background-position:0 100%;background-size:0 ' . $size . ';'
			. 'transition:background-size var(--wp--custom--link-sweep--duration, 0.25s) var(--wp--custom--easing--ease-out, ease-out);}';
		$css .= $line . ':dir(rtl){background-position:100% 100%;}';
		$css .= sgs_hover_state_rules(
			$link,
			'background-size:100% ' . $size . ( '' !== $colour_hover ? ';background-image:linear-gradient(' . $colour_hover . ',' . $colour_hover . ')' : '' ),
			':focus-visible',
			$paint
		);
		$css .= '@media (prefers-reduced-motion: reduce){' . $line . '{transition:none;}}';
		$css .= $forced;
		return $css;
	}
}

if ( ! function_exists( 'sgs_link_underline_self_css' ) ) {
	/**
	 * `sgs_link_underline_css()` for an element that is itself the link (`sgs/button`).
	 *
	 * The button stylesheet resets the decoration with `.sgs-button:hover, .sgs-button:focus-visible { text-decoration: none }`
	 * and `.sgs-button:focus:not(:focus-visible)` (0,3,0), so the line is written as longhands in four variants (rest,
	 * hover, keyboard focus, mouse focus), each at a specificity above the resets: the caller passes the doubled-uid
	 * selector (`.{uid}.{uid}.sgs-button`, 0,3,0), and the mouse-focus variant adds its own pseudo-classes. 'always' and
	 * 'none' keep the hover rule unguarded: a tap leaves `:hover` stuck on a touch device, and the reset would
	 * otherwise remove the line after the first tap. 'sweep' paints on `$paint` (the label span) and is skipped when the
	 * button has a hover fill, a gradient or an image of its own.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Attribute prefix.
	 * @param string $selector   The link itself, scoped.
	 * @param string $mode       'none', 'always', 'hover' or 'sweep'.
	 * @param string $paint      Descendant selector (leading space) that carries the sweep line.
	 * @return string CSS.
	 */
	function sgs_link_underline_self_css( array $attributes, $prefix, string $selector, string $mode, string $paint ): string {
		$thickness    = sgs_css_length_value( (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkUnderlineThickness' ) ] ?? '' ) );
		$offset       = sgs_css_length_value( (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkUnderlineOffset' ) ] ?? '' ) );
		$colour       = sgs_colour_value( (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkUnderlineColour' ) ] ?? '' ) );
		$colour_hover = sgs_colour_value( (string) ( $attributes[ sgs_typography_attr( $prefix, 'LinkUnderlineColourHover' ) ] ?? '' ) );

		$rest_sel  = $selector . ',' . $selector . ':focus:not(:focus-visible)';
		$state_sel = $selector . ':hover,' . $selector . ':focus-visible';
		$forced    = '@media (forced-colors: active){' . $selector . '{text-decoration-line:underline;}}';

		if ( 'none' === $mode ) {
			return $rest_sel . ',' . $state_sel . '{text-decoration-line:none;}' . $forced;
		}

		$line = static function ( string $ink ) use ( $thickness, $offset ): string {
			return ( '' !== $thickness ? 'text-decoration-thickness:' . $thickness . ';' : '' )
				. ( '' !== $ink ? 'text-decoration-color:' . $ink . ';' : '' )
				. ( '' !== $offset ? 'text-underline-offset:' . $offset . ';' : '' );
		};

		if ( 'always' === $mode ) {
			return $rest_sel . '{text-decoration-line:underline;' . $line( $colour ) . '}'
				. $state_sel . '{text-decoration-line:underline;' . $line( '' !== $colour_hover ? $colour_hover : $colour ) . '}';
		}

		if ( 'hover' === $mode ) {
			return $rest_sel . '{text-decoration-line:none;}'
				. sgs_hover_state_rules( $selector, 'text-decoration-line:underline;' . $line( '' !== $colour_hover ? $colour_hover : $colour ) )
				. $forced;
		}

		// 'sweep': a hover fill, a gradient or an image on the button already owns its background.
		foreach ( array( 'colourBackgroundHover', 'colourBackgroundGradient', 'colourBackgroundHoverGradient', 'backgroundImage' ) as $key ) {
			if ( '' !== (string) ( $attributes[ $key ] ?? '' ) ) {
				return '';
			}
		}
		$size = '' !== $thickness ? $thickness : 'var(--wp--custom--link-sweep--thickness, 1px)';
		$ink  = '' !== $colour ? $colour : 'currentColor';
		$bar  = $selector . $paint;

		return $rest_sel . ',' . $state_sel . '{text-decoration-line:none;}'
			. $bar . '{background-image:linear-gradient(' . $ink . ',' . $ink . ');'
			. 'background-repeat:no-repeat;background-origin:content-box;background-position:0 100%;background-size:0 ' . $size . ';'
			. 'transition:background-size var(--wp--custom--link-sweep--duration, 0.25s) var(--wp--custom--easing--ease-out, ease-out);}'
			. $bar . ':dir(rtl){background-position:100% 100%;}'
			. sgs_hover_state_rules(
				$selector,
				'background-size:100% ' . $size . ( '' !== $colour_hover ? ';background-image:linear-gradient(' . $colour_hover . ',' . $colour_hover . ')' : '' ),
				':focus-visible',
				$paint
			)
			. '@media (prefers-reduced-motion: reduce){' . $bar . '{transition:none;}}'
			. $forced;
	}
}
