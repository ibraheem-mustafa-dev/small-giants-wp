<?php
/**
 * Shared viewport scrim: the see-through layer that dims the page behind an
 * open drawer, dialog or panel (Wave 3C U-2, family M-14).
 *
 * Design: `.claude/reports/2026-09-24-u2-scrim-design.md` (and its Addendum A).
 * Every block that dims the viewport declares `supports.sgs.scrim` plus four
 * attributes and calls sgs_scrim_render(); `scripts/scrim/check-scrim.py`
 * fails the build on a block that paints a dimmer any other way.
 *
 *   scrimColour          string  token slug or CSS colour
 *   scrimColourGradient  string  CSS gradient; non-empty wins over the colour
 *   scrimOpacity         object  per-device tint strength, 0 to 1
 *   scrimBlur            object  per-device blur of the page behind (a length)
 *
 * How it paints (one path for every adopter):
 *   - the tint sits on the scrim's `::before` with its own opacity, the blur on
 *     the scrim itself, so a strong blur is never faded by a light tint and a
 *     gradient takes the same strength control as a flat colour;
 *   - the scrim's own opacity is only the open/close fade, driven by CSS
 *     `:root:has(<open selector>)`, so no block needs JavaScript to show it;
 *   - the HTML is printed at `wp_footer` as a direct child of `<body>`, so no
 *     transformed or filtered ancestor (a blurred header, an animated
 *     container) can capture its `position:fixed`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-css-safety.php';

if ( ! function_exists( 'sgs_scrim_opacity_value' ) ) {
	/**
	 * Clamp one tier's tint strength to 0..1; anything non-numeric is unset.
	 *
	 * @param mixed $raw Raw tier value.
	 * @return string|null CSS number, or null for "not set".
	 */
	function sgs_scrim_opacity_value( $raw ) {
		if ( ! is_numeric( $raw ) ) {
			return null;
		}
		$n   = max( 0.0, min( 1.0, (float) $raw ) );
		$out = rtrim( rtrim( number_format( $n, 3, '.', '' ), '0' ), '.' );
		return '' === $out ? '0' : $out;
	}
}

if ( ! function_exists( 'sgs_scrim_blur_value' ) ) {
	/**
	 * Sanitise one tier's blur radius. A bare number is pixels.
	 *
	 * @param mixed $raw Raw tier value.
	 * @return string|null CSS length, or null for "not set".
	 */
	function sgs_scrim_blur_value( $raw ) {
		if ( null === $raw || '' === $raw ) {
			return null;
		}
		if ( is_numeric( $raw ) ) {
			return max( 0.0, (float) $raw ) . 'px';
		}
		$clean = sgs_css_length_value( (string) $raw );
		return '' === $clean ? null : $clean;
	}
}

if ( ! function_exists( 'sgs_scrim_tiers' ) ) {
	/**
	 * Normalise a tier attribute and apply a per-tier formatter.
	 *
	 * @param mixed    $raw       Tier object (or a flat legacy value, read as desktop).
	 * @param callable $formatter sgs_scrim_opacity_value / sgs_scrim_blur_value.
	 * @return array{desktop:?string,tablet:?string,mobile:?string}
	 */
	function sgs_scrim_tiers( $raw, callable $formatter ) {
		$obj = sgs_responsive_normalise_object( $raw );
		$out = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$out[ $tier ] = $formatter( $obj[ $tier ] ?? null );
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_scrim_is_visible' ) ) {
	/**
	 * Whether the scrim paints anything at any device tier.
	 *
	 * @param array $opacity Formatted opacity tiers.
	 * @param array $blur    Formatted blur tiers.
	 * @return bool
	 */
	function sgs_scrim_is_visible( array $opacity, array $blur ) {
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			if ( null !== $opacity[ $tier ] && (float) $opacity[ $tier ] > 0 ) {
				return true;
			}
			if ( null !== $blur[ $tier ] && ! preg_match( '/^0(\.0+)?[a-z%]*$/i', $blur[ $tier ] ) ) {
				return true;
			}
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_scrim_render' ) ) {
	/**
	 * Build a block's scrim: its scoped CSS, and queue its HTML for `wp_footer`.
	 *
	 * @param array  $attributes Block attributes (the four scrim attributes).
	 * @param string $uid        The block instance's scoping class (no dot).
	 * @param array  $args       Options: `open` (REQUIRED) the selector that matches while
	 *                           the owner is open, e.g. `.{uid}:modal`, `.{uid}[open]` or
	 *                           `.{uid} [data-sgs-mega-trigger][aria-expanded="true"]`;
	 *                           `z_index` a CSS z-index expression (default 9990);
	 *                           `data` extra `data-*` attributes (name without `data-`).
	 * @return string Scoped CSS for the block's own `<style>`; '' when the scrim
	 *                paints nothing at any tier (and then no HTML is queued).
	 */
	function sgs_scrim_render( array $attributes, string $uid, array $args ) {
		$uid  = sanitize_html_class( $uid );
		$open = isset( $args['open'] ) ? trim( (string) $args['open'] ) : '';
		// The open selector is framework-authored, never client input; still refuse
		// anything that could break out of a selector list.
		if ( '' === $uid || '' === $open || preg_match( '/[{};<>]|\/\*/', $open ) ) {
			return '';
		}

		$opacity = sgs_scrim_tiers( $attributes['scrimOpacity'] ?? array(), 'sgs_scrim_opacity_value' );
		$blur    = sgs_scrim_tiers( $attributes['scrimBlur'] ?? array(), 'sgs_scrim_blur_value' );
		if ( ! sgs_scrim_is_visible( $opacity, $blur ) ) {
			return '';
		}

		$gradient = sgs_css_gradient_value( (string) ( $attributes['scrimColourGradient'] ?? '' ) );
		$colour   = sgs_colour_value( (string) ( $attributes['scrimColour'] ?? '' ) );
		$fill     = '' !== $gradient ? $gradient : ( '' !== $colour ? $colour : '#000' );
		$z_index  = isset( $args['z_index'] ) && ! preg_match( '/[{};<>]/', (string) $args['z_index'] )
			? (string) $args['z_index']
			: '9990';

		$sel      = '.' . $uid . '-scrim';
		$has_blur = false;
		foreach ( $blur as $b ) {
			$has_blur = $has_blur || null !== $b;
		}

		$css  = $sel . '{position:fixed;inset:0;z-index:' . $z_index . ';opacity:0;pointer-events:none;transition:opacity .2s ease;--sgs-scrim-fill:' . $fill . '}';
		$css .= $sel . '::before{content:"";position:absolute;inset:0;background:var(--sgs-scrim-fill);opacity:var(--sgs-scrim-opacity,0)}';
		$css .= sgs_emit_responsive_css(
			$sel,
			array(
				array(
					'css'       => '--sgs-scrim-opacity',
					'value'     => $opacity,
					'transform' => 'sgs_scrim_opacity_value',
				),
			)
		);
		if ( $has_blur ) {
			$css .= $sel . '{-webkit-backdrop-filter:blur(var(--sgs-scrim-blur,0px));backdrop-filter:blur(var(--sgs-scrim-blur,0px))}';
			$css .= sgs_emit_responsive_css(
				$sel,
				array(
					array(
						'css'       => '--sgs-scrim-blur',
						'value'     => $blur,
						'transform' => 'sgs_scrim_blur_value',
					),
				)
			);
		}
		$css .= ':root:has(' . $open . ') ' . $sel . '{opacity:1;pointer-events:auto}';
		$css .= '@media (prefers-reduced-motion:reduce){' . $sel . '{transition-duration:.01ms}}';
		$css .= '@media (forced-colors:active){' . $sel . '{display:none}}';

		$data = '';
		foreach ( (array) ( $args['data'] ?? array() ) as $name => $value ) {
			$name = preg_replace( '/[^a-z0-9-]/', '', strtolower( (string) $name ) );
			if ( '' !== $name ) {
				$data .= sprintf( ' data-%s="%s"', $name, esc_attr( (string) $value ) );
			}
		}
		sgs_scrim_queue(
			$uid,
			sprintf( '<div class="sgs-scrim %s" aria-hidden="true"%s></div>', esc_attr( $uid . '-scrim' ), $data )
		);

		return $css;
	}
}

if ( ! function_exists( 'sgs_scrim_queue' ) ) {
	/**
	 * Queue (or, with no argument, read) the scrim HTML printed at `wp_footer`.
	 * Keyed by uid, so a block rendered twice queues one scrim.
	 *
	 * @param string|null $uid  Instance uid.
	 * @param string|null $html Pre-escaped scrim markup.
	 * @return array<string,string> The queue.
	 */
	function sgs_scrim_queue( $uid = null, $html = null ) {
		static $queue = array();
		if ( null !== $uid && null !== $html ) {
			$queue[ $uid ] = $html;
		}
		return $queue;
	}
}

if ( ! function_exists( 'sgs_scrim_print_footer' ) ) {
	/**
	 * Print every queued scrim as a direct child of `<body>`.
	 */
	function sgs_scrim_print_footer() {
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- each entry built from esc_attr() values in sgs_scrim_render().
		echo implode( '', sgs_scrim_queue() );
	}
	if ( function_exists( 'add_action' ) ) {
		add_action( 'wp_footer', 'sgs_scrim_print_footer', 5 );
	}
}
