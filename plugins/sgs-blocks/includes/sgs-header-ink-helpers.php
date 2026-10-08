<?php
/**
 * Section-adaptive header ink: the per-tier resolvers and rule builders that
 * sgs-header-ink-css.php::sgs_header_ink_css() composes into the header's CSS.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-hover-state.php';
require_once __DIR__ . '/helpers-motion-easing.php';
require_once __DIR__ . '/class-sgs-breakpoints.php';

// PHP allow-list mirroring block.json's `sectionInk` per-tier enum.
if ( ! defined( 'SGS_HEADER_INK_VALUES' ) ) {
	define( 'SGS_HEADER_INK_VALUES', array( 'off', 'adapt', 'blend' ) );
}

if ( ! function_exists( 'sgs_header_ink_tiers' ) ) {
	/**
	 * `sectionInk` resolved per tier via the canonical cascade. A junk value
	 * coerces to 'off', never emitted raw.
	 *
	 * @param array $attributes Block attributes.
	 * @return array<string,string> desktop|tablet|mobile => 'off'|'adapt'|'blend'.
	 */
	function sgs_header_ink_tiers( array $attributes ) {
		$raw   = isset( $attributes['sectionInk'] ) ? $attributes['sectionInk'] : array();
		$tiers = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$resolved       = sgs_resolve_tier( $raw, $tier, 'off' );
			$value          = $resolved['value'];
			$tiers[ $tier ] = in_array( $value, SGS_HEADER_INK_VALUES, true ) ? $value : 'off';
		}
		return $tiers;
	}
}

if ( ! function_exists( 'sgs_header_ink_resolve_colour' ) ) {
	/**
	 * Resolve an ink colour attribute, falling back to the default token.
	 *
	 * @param mixed  $raw      Raw attribute value.
	 * @param string $fallback A CSS colour value (a `var(...)` token).
	 * @return string A CSS colour value. Never empty.
	 */
	function sgs_header_ink_resolve_colour( $raw, string $fallback ): string {
		$raw      = (string) $raw;
		$resolved = '' !== $raw ? sgs_colour_value( $raw ) : '';
		return '' !== $resolved ? $resolved : $fallback;
	}
}

if ( ! function_exists( 'sgs_header_ink_resolve_fill' ) ) {
	/**
	 * Resolve a fill colour + gradient pair into one `background` shorthand
	 * value, gradient layered over the flat colour. Empty when neither is
	 * set — "fill unchanged" (§4.1).
	 *
	 * @param mixed $colour   Raw colour attribute value.
	 * @param mixed $gradient Raw gradient attribute value.
	 * @return string A `background` shorthand value, or '' when unset.
	 */
	function sgs_header_ink_resolve_fill( $colour, $gradient ): string {
		$colour_value   = '' !== (string) $colour ? sgs_colour_value( (string) $colour ) : '';
		$gradient_value = '' !== (string) $gradient ? sgs_css_gradient_value( (string) $gradient ) : '';
		if ( '' === $colour_value && '' === $gradient_value ) {
			return '';
		}
		if ( '' !== $gradient_value ) {
			return '' !== $colour_value ? $gradient_value . ',' . $colour_value : $gradient_value;
		}
		return $colour_value;
	}
}

if ( ! function_exists( 'sgs_header_ink_mode_for_tier' ) ) {
	/**
	 * Decide WHICH ink mechanism (if any) applies at one tier (§4.2: ink adapts
	 * only where the header is see-through, or where a tone fill follows the
	 * section so the ink pairs with it).
	 *
	 * @param string $ink_state      This tier's resolved `sectionInk` value.
	 * @param bool   $has_tone_fill  fillOnLight/fillOnDark (or gradients) resolve.
	 * @param bool   $has_own_fill   The header has ANY resting fill of its own.
	 * @param bool   $transparent_on Transparent resolves ON at this tier
	 *                               (already force-solid-adjusted by the caller).
	 * @return string 'none'|'blend'|'tone-fill'|'tone-fill-transparent'|'transparent-only'|'unconditional'.
	 */
	function sgs_header_ink_mode_for_tier( string $ink_state, bool $has_tone_fill, bool $has_own_fill, bool $transparent_on ): string {
		if ( 'blend' === $ink_state ) {
			return 'blend';
		}
		if ( 'adapt' !== $ink_state ) {
			return 'none';
		}
		if ( $has_tone_fill ) {
			return $transparent_on ? 'tone-fill-transparent' : 'tone-fill';
		}
		if ( $transparent_on ) {
			return 'transparent-only';
		}
		if ( ! $has_own_fill ) {
			return 'unconditional';
		}
		// Opaque, no tone fill, not transparent: reads its own fill (§4.4 advisory).
		return 'none';
	}
}

if ( ! function_exists( 'sgs_header_ink_live_state' ) ) {
	/**
	 * When the tone classes may be set at one tier, for view.js: 'always',
	 * 'rest' (only while not `.is-header-scrolled`), 'scrolled' (only while
	 * scrolled) or '' (never). view.js sets `is-header-on-dark`/`-light` ONLY
	 * inside this window, so every consumer of those classes (this helper's
	 * ink and fill, the logo's ground response) is live exactly where the
	 * header is see-through or tone-filled, and nowhere else.
	 *
	 * @param string $mode        sgs_header_ink_mode_for_tier()'s return value.
	 * @param bool   $solid_first Whether Transparent's direction is solid-first.
	 * @return string
	 */
	function sgs_header_ink_live_state( string $mode, bool $solid_first ): string {
		if ( 'transparent-only' === $mode ) {
			return $solid_first ? 'scrolled' : 'rest';
		}
		return in_array( $mode, array( 'unconditional', 'tone-fill', 'tone-fill-transparent' ), true ) ? 'always' : '';
	}
}

if ( ! function_exists( 'sgs_header_ink_not_hover_rule' ) ) {
	/**
	 * A rule that applies to each selector except while it is hovered or keyboard-focused.
	 *
	 * The hover exclusion sits behind the shared hover guard (`sgs_hover_media_wrap()` plus
	 * `SGS_HOVER_NOT_TOUCH`); a device without a hovering pointer gets the focus-only
	 * exclusion instead, so a tap's sticky :hover never disables the rule.
	 *
	 * @param string $selectors Comma-separated base selectors.
	 * @param string $block     Declaration block including braces.
	 * @return string CSS.
	 */
	function sgs_header_ink_not_hover_rule( string $selectors, string $block ): string {
		$parts = array_map( 'trim', explode( ',', $selectors ) );
		$hover = array();
		$touch = array();
		foreach ( $parts as $part ) {
			$hover[] = SGS_HOVER_NOT_TOUCH . ' ' . $part . ':not(:hover):not(:focus-visible)';
			$touch[] = $part . ':not(:focus-visible)';
		}
		return sgs_hover_media_wrap( implode( ',', $hover ) . $block )
			. '@media not all and (hover: hover) and (pointer: fine){' . implode( ',', $touch ) . $block . '}';
	}
}

if ( ! function_exists( 'sgs_header_ink_mode_rule' ) ) {
	/**
	 * The CSS text for one resolved mode, unwrapped (the caller wraps it in
	 * that tier's exact-range `@media`, so no tier ever cancels another).
	 * Ink rules carry no scroll-state selector: view.js sets the tone classes
	 * only inside the live window (sgs_header_ink_live_state()).
	 *
	 * @param string $mode        sgs_header_ink_mode_for_tier()'s return value.
	 * @param string $root_sel    The header's uid-scoped selector.
	 * @param string $ink_dark    Resolved ink colour over a dark section.
	 * @param string $ink_light   Resolved ink colour over a light section.
	 * @param string $fill_dark   Resolved fill over a dark section ('' = unchanged).
	 * @param string $fill_light  Resolved fill over a light section ('' = unchanged).
	 * @param bool   $solid_first Whether Transparent's direction is solid-first.
	 * @return string CSS rule text (no `@media` wrapper), '' for nothing.
	 */
	function sgs_header_ink_mode_rule( string $mode, string $root_sel, string $ink_dark, string $ink_light, string $fill_dark, string $fill_light, bool $solid_first ): string {
		if ( 'blend' === $mode ) {
			// mix-blend-mode:difference on the header's rows, ink forced white so
			// difference inverts; isolation scopes the blend to the header.
			return $root_sel . '{isolation:isolate;color:#fff !important;}'
				. $root_sel . ' .sgs-site-header-row{mix-blend-mode:difference;}';
		}
		if ( 'none' === $mode ) {
			return '';
		}

		$css = $root_sel . '.is-header-on-dark{color:' . $ink_dark . ' !important;}'
			. $root_sel . '.is-header-on-light{color:' . $ink_light . ' !important;}';

		// While live, top-level links, the burger and header icons follow the ink
		// over their own colour; hover, focus, dropdowns and filled chips keep theirs.
		foreach ( array( 'dark', 'light' ) as $tone ) {
			$on = $root_sel . '.is-header-on-' . $tone;
			// The `:not(:hover)` half is a hover state, so it is guarded like any other:
			// hover-capable pointers exclude hover from the override, touch (where a tap
			// leaves :hover stuck on) excludes focus only.
			$hoverable = $on . ' .sgs-nav-bar-menu__item>.sgs-nav-bar-menu__link,'
				. $on . ' .sgs-nav-bar-menu__burger,'
				. $on . ' .wp-block-sgs-business-info:not(.is-style-button) .sgs-business-info__link';
			$inherit   = '{color:inherit !important;-webkit-text-fill-color:currentColor !important;}';
			$css      .= sgs_header_ink_not_hover_rule( $hoverable, $inherit )
				. $on . ' .wp-block-sgs-business-info:not(.is-style-button),' . $on . ' .sgs-cart,'
				. $on . ' .sgs-social-icons .sgs-icon:not(.sgs-icon--has-bg)'
				. '{--sgs-bi-icon-colour:currentColor !important;--sgs-cart-icon-colour:currentColor !important;--sgs-icon-colour:currentColor !important;}';
		}

		if ( 'tone-fill' === $mode || 'tone-fill-transparent' === $mode ) {
			// Transparent on: the fill follows the section only in the header's
			// SOLID state (wearecollins: see-through at the top, filled once
			// scrolled); the see-through state keeps its transparency. Three or
			// more classes, beating the two-class `!important` scrolled fill.
			$state = '';
			if ( 'tone-fill-transparent' === $mode ) {
				$state = $solid_first ? ':not(.is-header-scrolled)' : '.is-header-scrolled';
			}
			if ( '' !== $fill_dark ) {
				$css .= $root_sel . '.is-header-on-dark' . $state . '{background:' . $fill_dark . ' !important;}';
			}
			if ( '' !== $fill_light ) {
				$css .= $root_sel . '.is-header-on-light' . $state . '{background:' . $fill_light . ' !important;}';
			}
		}
		return $css;
	}
}
