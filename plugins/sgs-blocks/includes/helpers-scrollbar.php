<?php
/**
 * Shared scrollbar choice for a block's scrolling area (Spec 02 FR-2-35).
 *
 * Every scrolling area inside a block (a carousel track, a tab strip that scrolls sideways, a drawer) has one
 * setting with three choices, and this file is the only place that turns the choice into CSS:
 *
 *   default  nothing is printed: the area keeps the site's bar (theme scrollbars.css, Spec 32 FR-32-26: the browser's
 *            own bar coloured by `settings.custom.scrollbar`, slim with no arrow buttons inside the page).
 *   thin     where the engine draws the WebKit scrollbar parts (Chromium, Safari) the site's slim bar at
 *            `settings.custom.scrollbar.thinWidth` (`--wp--custom--scrollbar--thin-width`, 10px when unset), with
 *            `scrollbar-color: auto` so the parts apply; elsewhere (Firefox) `scrollbar-width: thin`, at no
 *            specificity so the overlay scrollbar can still hide it. Chromium's own `scrollbar-width: thin` is not
 *            used: on Windows it is as thick as the slim bar and brings back the arrow buttons.
 *   hidden   `scrollbar-width: none` and `::-webkit-scrollbar { display: none }`; the shared overlay thumb
 *            (theme sgs-overlay-scroll.js) is hidden too. The area still scrolls by touch, trackpad, wheel and keys.
 *
 * A block keeps its setting unset by default (no block.json default, so saved content and the instance hash do not
 * move) and passes the area's starting value, the look the area had before the setting existed, to
 * sgs_scrollbar_style(). The editor's twin is `src/utils/scrollbar-style.js` (same choices, same CSS) and the
 * inspector control is `src/components/ScrollbarStyleControl.js`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_scrollbar_choices' ) ) {
	/**
	 * The three scrollbar choices.
	 *
	 * @return string[]
	 */
	function sgs_scrollbar_choices(): array {
		return array( 'default', 'thin', 'hidden' );
	}
}

if ( ! function_exists( 'sgs_scrollbar_style' ) ) {
	/**
	 * The area's choice: the stored value when it is one of the three, otherwise the area's starting value.
	 *
	 * @param mixed  $value The stored attribute value (null when unset).
	 * @param string $start The area's starting value (what an unset setting renders).
	 * @return string One of sgs_scrollbar_choices().
	 */
	function sgs_scrollbar_style( $value, string $start = 'default' ): string {
		$choices = sgs_scrollbar_choices();
		if ( is_string( $value ) && in_array( $value, $choices, true ) ) {
			return $value;
		}
		return in_array( $start, $choices, true ) ? $start : 'default';
	}
}

if ( ! function_exists( 'sgs_scrollbar_selector_with' ) ) {
	/**
	 * Appends a suffix (a pseudo-element or a child step) to every selector of a comma list.
	 *
	 * Commas inside parentheses (`:is(a, b)`) do not split.
	 *
	 * @param string $selector The selector list.
	 * @param string $suffix   What to append to each selector.
	 * @return string
	 */
	function sgs_scrollbar_selector_with( string $selector, string $suffix ): string {
		$parts = array();
		$depth = 0;
		$start = 0;
		$len   = strlen( $selector );
		for ( $i = 0; $i < $len; $i++ ) {
			$c = $selector[ $i ];
			if ( '(' === $c ) {
				++$depth;
			} elseif ( ')' === $c ) {
				--$depth;
			} elseif ( ',' === $c && 0 === $depth ) {
				$parts[] = trim( substr( $selector, $start, $i - $start ) );
				$start   = $i + 1;
			}
		}
		$parts[] = trim( substr( $selector, $start ) );
		$parts   = array_filter( $parts, 'strlen' );
		return implode(
			',',
			array_map(
				static function ( $part ) use ( $suffix ) {
					return $part . $suffix;
				},
				$parts
			)
		);
	}
}

if ( ! function_exists( 'sgs_scrollbar_css' ) ) {
	/**
	 * The CSS a scrollbar choice prints for the scrolling area matched by $selector.
	 *
	 * @param string $selector The scrolling area's selector (a list is allowed), already scoped to the instance.
	 * @param string $choice   One of sgs_scrollbar_choices(); anything else prints nothing.
	 * @param string $media    Optional condition for an area that scrolls only at some widths: a media query condition
	 *                         (`(max-width:767.98px)`, printed as `@media <condition>`), or a whole at-rule prelude
	 *                         starting with `@` (`@container name (max-width:479.98px)`), printed as given.
	 * @param bool   $width    False leaves the area's own `scrollbar-width: none` (hidden) to the caller, which prints
	 *                         sgs_scrollbar_width_declaration() in the rules of the device tiers where the area scrolls;
	 *                         the WebKit bar and overlay thumb rules still print (they draw nothing where it does not).
	 * @return string The rules ('' for default).
	 */
	function sgs_scrollbar_css( string $selector, string $choice, string $media = '', bool $width = true ): string {
		$selector = trim( $selector );
		if ( '' === $selector ) {
			return '';
		}
		$parts = sgs_scrollbar_selector_with( $selector, '::-webkit-scrollbar' );
		if ( 'hidden' === $choice ) {
			$css = ( $width ? $selector . '{scrollbar-width:none;}' : '' )
				. $parts . '{display:none;}'
				. sgs_scrollbar_selector_with( $selector, '>.sgs-overlay-scroll__thumb' ) . '{display:none;}';
		} elseif ( 'thin' === $choice ) {
			$width = 'var(--wp--custom--scrollbar--thin-width,10px)';
			$css   = $parts . '{width:' . $width . ';height:' . $width . ';}'
				. '@supports selector(::-webkit-scrollbar){' . $selector . '{scrollbar-color:auto;}}'
				. '@supports not selector(::-webkit-scrollbar){:where(' . $selector . '){scrollbar-width:thin;}}';
		} else {
			return '';
		}
		$media = trim( $media );
		if ( '' === $media ) {
			return $css;
		}
		return ( '@' === $media[0] ? $media : '@media ' . $media ) . '{' . $css . '}';
	}
}

if ( ! function_exists( 'sgs_scrollbar_width_declaration' ) ) {
	/**
	 * The area's own `scrollbar-width` declaration for a choice, for a caller that prints it per device tier
	 * (see sgs_scrollbar_css()'s `$width`): `scrollbar-width:none;` for hidden, '' otherwise (thin and default set no
	 * width on the element where the WebKit parts are drawn).
	 *
	 * @param string $choice One of sgs_scrollbar_choices().
	 * @return string
	 */
	function sgs_scrollbar_width_declaration( string $choice ): string {
		return 'hidden' === $choice ? 'scrollbar-width:none;' : '';
	}
}
