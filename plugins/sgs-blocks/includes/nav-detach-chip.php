<?php
/**
 * The sgs/nav-bar-menu detaching burger chip (`triggerDetach*`, Wave 3C U-14,
 * family M-08): buck's "the header is not the sticky element, the burger is".
 *
 * The header scrolls away; once its burger has left the screen (and, if set,
 * the page has scrolled past `triggerDetachAfter` at the current tier) the
 * burger reappears as a fixed chip in the top inline-end corner.
 *
 * The chip is a SECOND copy of the burger, built by the same
 * `sgs_nav_bar_menu_burger_toggle_markup()` call in the menu's own uid wrapper,
 * so it carries every uid-scoped burger style, `data-sgs-nav-collapse`
 * (DEC-09's resize-close), `aria-controls` and the accessible name. It is
 * printed on `wp_footer`, outside the header, because a header row's
 * `will-change: transform` and Hide on scroll's `transform` would make a
 * `position:fixed` child scroll with the header. Its directives run through
 * `wp_interactivity_process_directives()`.
 *
 * Visibility: `display:none` unless `is-detached` (set by
 * src/shared/nav-interactivity/detach-chip.js) at a tier where
 * `triggerDetach` is on, below the collapse point. No JS: it never shows and
 * the header burger still works.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/sgs-header-pass-through.php';

if ( ! function_exists( 'sgs_nav_detach_chip_queue' ) ) {
	/**
	 * Queue one chip for printing on wp_footer; with no argument, return (and
	 * clear) the queue. Keyed by the menu's uid, so a menu rendered twice
	 * prints one chip.
	 *
	 * @param string|null $uid  The menu's uid class.
	 * @param string      $html The chip wrapper markup.
	 * @return array<string,string> The queue, when read.
	 */
	function sgs_nav_detach_chip_queue( ?string $uid = null, string $html = '' ): array {
		static $queue = array();
		if ( null === $uid ) {
			$out   = $queue;
			$queue = array();
			return $out;
		}
		$queue[ $uid ] = $html;
		return array();
	}
}

if ( ! function_exists( 'sgs_nav_detach_chip_print_footer' ) ) {
	/**
	 * Print every queued chip, directives processed.
	 */
	function sgs_nav_detach_chip_print_footer(): void {
		foreach ( sgs_nav_detach_chip_queue() as $html ) {
			if ( function_exists( 'wp_interactivity_process_directives' ) ) {
				$html = wp_interactivity_process_directives( $html );
			}
			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled by sgs_nav_detach_chip_wrap() from escaped parts and the burger markup function.
			echo $html;
		}
	}
	add_action( 'wp_footer', 'sgs_nav_detach_chip_print_footer', 5 );
}

if ( ! function_exists( 'sgs_nav_detach_chip_tiers' ) ) {
	/**
	 * Per-tier resolved chip values: after (px or 0), size (px, never below
	 * 44), offset x/y (px).
	 *
	 * @param array $attributes Block attributes.
	 * @return array<string,array{after:int,size:float,x:float,y:float}>
	 */
	function sgs_nav_detach_chip_tiers( array $attributes ): array {
		$out = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$after  = sgs_resolve_tier( $attributes['triggerDetachAfter'] ?? array(), $tier, 0 )['value'];
			$size   = sgs_resolve_tier( $attributes['triggerDetachSize'] ?? array(), $tier, 56 )['value'];
			$offset = sgs_resolve_tier( $attributes['triggerDetachOffset'] ?? array(), $tier, array() )['value'];
			$offset = is_array( $offset ) ? $offset : array();

			$out[ $tier ] = array(
				'after' => is_numeric( $after ) ? max( 0, (int) $after ) : 0,
				'size'  => is_numeric( $size ) ? max( 44.0, round( (float) $size, 1 ) ) : 56.0,
				'x'     => is_numeric( $offset['x'] ?? null ) ? round( (float) $offset['x'], 1 ) : 20.0,
				'y'     => is_numeric( $offset['y'] ?? null ) ? round( (float) $offset['y'], 1 ) : 20.0,
			);
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_nav_detach_chip_wrap' ) ) {
	/**
	 * The chip wrapper around a burger toggle built with the
	 * `sgs-nav-bar-menu__detach-wrap` class. It carries the per-tier scroll
	 * thresholds for the watcher as JSON.
	 *
	 * @param string $uid         The menu's uid class.
	 * @param string $toggle_html The burger toggle markup.
	 * @param array  $attributes  Block attributes.
	 * @return string Markup.
	 */
	function sgs_nav_detach_chip_wrap( string $uid, string $toggle_html, array $attributes ): string {
		$after = array();
		foreach ( sgs_nav_detach_chip_tiers( $attributes ) as $tier => $values ) {
			$after[ $tier ] = $values['after'];
		}
		return sprintf(
			'<div class="%1$s sgs-nav-bar-menu__detach" data-sgs-nav-detach-after="%2$s">%3$s</div>',
			esc_attr( $uid ),
			esc_attr( (string) wp_json_encode( $after ) ),
			$toggle_html
		);
	}
}

if ( ! function_exists( 'sgs_nav_detach_chip_css' ) ) {
	/**
	 * The chip's scoped CSS: hidden by default, shown with `is-detached` only
	 * at ON tiers below the collapse point; per-tier size and offset.
	 *
	 * @param array  $attributes     Block attributes.
	 * @param string $uid_sel        The menu's uid selector.
	 * @param int    $collapse_point The menu's resolved collapse point.
	 * @return string CSS.
	 */
	function sgs_nav_detach_chip_css( array $attributes, string $uid_sel, int $collapse_point ): string {
		$on = sgs_resolve_on_tiers( $attributes['triggerDetach'] ?? array(), 'on', 'off' );
		if ( empty( $on ) ) {
			return '';
		}
		$wrap   = $uid_sel . '.sgs-nav-bar-menu__detach';
		$button = $wrap . ' .sgs-nav-bar-menu__burger';
		$z      = isset( $attributes['triggerDetachZIndex'] ) && is_numeric( $attributes['triggerDetachZIndex'] )
			? max( 0, min( 99998, (int) $attributes['triggerDetachZIndex'] ) )
			: 110;
		$radius = sgs_css_length_value( $attributes['triggerDetachRadius'] ?? '9999px' );

		$css  = $wrap . '{display:none;position:fixed;top:calc(var(--wp-admin--admin-bar--height, 0px) + var(--sgs-nav-detach-y, 20px));inset-inline-end:var(--sgs-nav-detach-x, 20px);z-index:' . $z . ';}';
		$css .= $button . '{width:var(--sgs-nav-detach-size, 56px);height:var(--sgs-nav-detach-size, 56px);min-width:44px;min-height:44px;border-radius:' . ( '' !== $radius ? $radius : '9999px' ) . ';}';

		$bg = (string) ( $attributes['triggerDetachBackground'] ?? '' );
		if ( '' !== $bg ) {
			$css .= $button . '{background-color:' . sgs_colour_value( $bg ) . ';}';
		}
		$bg_hover = (string) ( $attributes['triggerDetachBackgroundHover'] ?? '' );
		if ( '' !== $bg_hover ) {
			$css .= sgs_hover_state_rules( $button, 'background-color:' . sgs_colour_value( $bg_hover ), ':focus-visible' );
		}

		foreach ( sgs_nav_detach_chip_tiers( $attributes ) as $tier => $values ) {
			$css .= sgs_tier_exact_media_css(
				array( $tier ),
				$wrap . '{--sgs-nav-detach-size:' . $values['size'] . 'px;--sgs-nav-detach-x:' . $values['x'] . 'px;--sgs-nav-detach-y:' . $values['y'] . 'px;}'
			);
		}
		$css .= sgs_tier_exact_media_css( $on, $wrap . '.is-detached{display:block;}', '(max-width:' . ( max( 1, $collapse_point ) - 1 ) . 'px)' );

		return $css;
	}
}
