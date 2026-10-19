<?php
/**
 * The sgs/container "Pin to edge" setting (`pinEdge`): at a device where it is
 * `top` or `bottom`, the container sticks to that edge of its nearest
 * scrolling ancestor (offset 0) while the content around it scrolls, sits
 * above its sibling content (z-index 2, over the `:where(.sgs-container) > *`
 * z-index 1), and adds the device's safe-area inset to its padding on that
 * edge, so a band pinned to the bottom of a full-height drawer clears the
 * phone's home indicator.
 *
 * With "Stop below the site header" (`pinBelowHeader`, "on" at a tier whose
 * edge is `top`) the pin also sits below a sticky site header: `top` becomes the
 * published `--sgs-header-height` (0 when the header is not sticky) plus
 * `pinGap` (default: the shop filter's spacing). The `:not(dialog *, ...)`
 * guard keeps a drawer, modal or pop-up pin at `top:0`, since those are
 * top-layer elements above the header. A bottom pin takes no offset.
 *
 * Emitted by `container/render.php` into the block's own scoped `<style>`,
 * inside each pinned tier's exact range (`sgs_tier_exact_media_css()`), so a
 * tier that is not pinned needs no reset. Unset everywhere (the default `{}`)
 * emits nothing.
 *
 * The padding on the pinned edge is the container's own padding for that tier
 * (per-side cascade: mobile, then tablet, then desktop, then the legacy
 * `style.spacing.padding`) plus `env(safe-area-inset-*)`. The wrapper prints
 * its tablet and mobile padding `!important` at (0,1,0), so the pinned rule is
 * `!important` at (0,2,0) to carry the inset on top of it.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-tier-queries.php';
require_once __DIR__ . '/container-scroll-row-css.php';

if ( ! function_exists( 'sgs_container_pin_edge_values' ) ) {
	/**
	 * Every stored `pinEdge` tier value; '' and 'none' are "not pinned".
	 *
	 * @return string[]
	 */
	function sgs_container_pin_edge_values(): array {
		return array( 'none', 'top', 'bottom' );
	}
}

if ( ! function_exists( 'sgs_container_pin_edge_padding' ) ) {
	/**
	 * The container's padding on one side at one tier, cascading per side from
	 * the narrower tier up to desktop, then to the legacy flat
	 * `style.spacing.padding`.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $tier       desktop | tablet | mobile.
	 * @param string $side       top | bottom.
	 * @return string A CSS length, or '' when no padding is set on that side.
	 */
	function sgs_container_pin_edge_padding( array $attributes, string $tier, string $side ): string {
		$tiers = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
		$order = array( 'mobile', 'tablet', 'desktop' );
		$start = array_search( $tier, $order, true );
		foreach ( array_slice( $order, false === $start ? 2 : (int) $start ) as $step ) {
			$box   = is_array( $tiers[ $step ] ?? null ) ? $tiers[ $step ] : array();
			$value = sgs_container_scroll_row_length( $box[ $side ] ?? '' );
			if ( '' !== $value ) {
				return $value;
			}
		}
		$legacy = $attributes['style']['spacing']['padding'][ $side ] ?? '';
		return sgs_container_scroll_row_length( is_string( $legacy ) ? $legacy : '' );
	}
}

if ( ! function_exists( 'sgs_container_pin_below_header_offset' ) ) {
	/**
	 * The gap that keeps a top-pinned container below the site header at one
	 * tier: '' unless `pinBelowHeader` resolves to "on" there, else the tier's
	 * `pinGap` (a CSS length or spacing preset; an unsafe value counts as unset)
	 * or the shop filter's default spacing.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $tier       desktop | tablet | mobile.
	 * @return string A CSS length to add to the header height, or ''.
	 */
	function sgs_container_pin_below_header_offset( array $attributes, string $tier ): string {
		if ( 'on' !== sgs_resolve_tier( $attributes['pinBelowHeader'] ?? array(), $tier, 'off' )['value'] ) {
			return '';
		}
		$gap = sgs_container_scroll_row_length( sgs_resolve_tier( $attributes['pinGap'] ?? array(), $tier, '' )['value'] );
		return '' !== $gap ? $gap : 'var(--wp--preset--spacing--40,1.5rem)';
	}
}

if ( ! function_exists( 'sgs_container_pin_edge_css' ) ) {
	/**
	 * The pin rules for one container.
	 *
	 * @param string $selector   The container's scoped selector (two classes).
	 * @param array  $attributes Block attributes.
	 * @return string CSS, or '' when no tier is pinned.
	 */
	function sgs_container_pin_edge_css( string $selector, array $attributes ): string {
		$raw = $attributes['pinEdge'] ?? array();
		if ( '' === $selector || ! is_array( $raw ) || empty( $raw ) ) {
			return '';
		}

		$groups = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$edge = sgs_resolve_tier( $raw, $tier, 'none' )['value'];
			if ( ! in_array( $edge, array( 'top', 'bottom' ), true ) ) {
				continue;
			}
			$pad    = sgs_container_pin_edge_padding( $attributes, $tier, $edge );
			$offset = 'top' === $edge ? sgs_container_pin_below_header_offset( $attributes, $tier ) : '';
			$key    = (string) json_encode( array( $edge, $pad, $offset ) );

			$groups[ $key ][] = $tier;
		}

		$css = '';
		foreach ( $groups as $key => $tiers ) {
			list( $edge, $pad, $offset ) = json_decode( $key, true );

			$inset = 'env(safe-area-inset-' . $edge . ', 0px)';
			$rules = $selector . '{position:sticky;' . $edge . ':0;z-index:2;padding-' . $edge . ':'
				. ( '' !== $pad ? 'calc(' . $pad . ' + ' . $inset . ')' : $inset ) . ' !important;}';
			if ( '' !== $offset ) {
				$rules .= $selector . ':not(dialog *,[role="dialog"] *,[popover] *){top:calc(var(--sgs-header-height,0px) + ' . $offset . ');}';
			}
			$css .= sgs_tier_exact_media_css( $tiers, $rules );
		}
		return $css;
	}
}
