<?php
/**
 * The sgs/container "Scroll sideways" setting (`scrollSideways`,
 * `scrollItemWidth`): at a device where it is on, the container's items sit in
 * one native row that scrolls sideways and snaps into place. The same rules the
 * "Horizontal scroll section" effect falls back to on phones
 * (assets/css/fx-horizontal-panel.css), without GSAP and without its pin, so it
 * is a layout setting, safe inside a menu panel or a drawer.
 *
 * Emitted by SGS_Container_Wrapper::render() LAST in the block's scoped CSS, on
 * the element whose direct children are the items ($grid_sel), inside each ON
 * tier's exact range, so a tier that is off needs no reset. Off everywhere (the
 * default `{}`) emits nothing.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-css-safety.php';
require_once __DIR__ . '/helpers-tier-queries.php';

if ( ! function_exists( 'sgs_container_scroll_row_length' ) ) {
	/**
	 * A safe CSS length, with a spacing preset (`var:preset|spacing|30`)
	 * turned into its custom property.
	 *
	 * @param mixed $value Stored value.
	 * @return string CSS length, or ''.
	 */
	function sgs_container_scroll_row_length( $value ): string {
		if ( ! is_string( $value ) && ! is_numeric( $value ) ) {
			return '';
		}
		$value = trim( (string) $value );
		if ( preg_match( '/^var:preset\|spacing\|([a-z0-9-]+)$/', $value, $m ) ) {
			return 'var(--wp--preset--spacing--' . $m[1] . ')';
		}
		return sgs_css_length_value( $value );
	}
}

if ( ! function_exists( 'sgs_container_scroll_row_css' ) ) {
	/**
	 * The sideways-scroll rules for one container.
	 *
	 * The row is always a left-to-right (inline-direction) row starting at the
	 * first item, whatever the container's own direction or alignment, or its
	 * leading items would be out of reach. Mandatory snap measures from the
	 * snapport, so the band's own side padding becomes `scroll-padding-inline`
	 * or the first item would snap flush to the edge.
	 *
	 * The row clips both axes (`overflow-x:auto` forces `overflow-y` off
	 * `visible`), so it gains 8px of block padding, taken back by an equal
	 * negative block margin, to hold an item's focus ring (3px outline, 2px
	 * offset, glow) without moving anything. Band padding on
	 * those sides is added to, not replaced.
	 *
	 * With `$with_container`, the Mobile tier also matches as an `@container` query under a 480px box, the same
	 * rule the framework's other tier rules use (SGS_Breakpoints::tier_at_rules); Desktop and Tablet follow the screen.
	 *
	 * @param string $row_sel        Selector of the element whose direct children are the items.
	 * @param array  $attributes     Block attributes.
	 * @param bool   $with_container Also emit each rule as an `@container` query.
	 * @param mixed  $band_padding   The container's `padding` tier object, which paints the band.
	 * @return string CSS.
	 */
	function sgs_container_scroll_row_css( string $row_sel, array $attributes, bool $with_container = false, $band_padding = array() ): string {
		if ( '' === $row_sel ) {
			return '';
		}
		$on = sgs_resolve_on_tiers( $attributes['scrollSideways'] ?? array(), 'on', 'off' );
		if ( empty( $on ) ) {
			return '';
		}

		$css = '';
		foreach ( $on as $tier ) {
			$width = sgs_resolve_tier( $attributes['scrollItemWidth'] ?? array(), $tier, '' )['value'];
			$width = sgs_container_scroll_row_length( $width );
			if ( '' === $width ) {
				$width = '80%';
			}
			$box     = sgs_resolve_tier( is_array( $band_padding ) ? $band_padding : array(), $tier, array() )['value'];
			$box     = is_array( $box ) ? $box : array();
			$pad_css = '';
			foreach ( array( 'left' => 'start', 'right' => 'end' ) as $side => $logical ) {
				$pad = sgs_container_scroll_row_length( $box[ $side ] ?? '' );
				if ( '' !== $pad ) {
					$pad_css .= 'scroll-padding-inline-' . $logical . ':' . $pad . ';';
				}
			}
			foreach ( array( 'top' => 'start', 'bottom' => 'end' ) as $side => $logical ) {
				$pad      = sgs_container_scroll_row_length( $box[ $side ] ?? '' );
				$pad_css .= 'padding-block-' . $logical . ':' . ( '' !== $pad ? 'calc(' . $pad . ' + 8px)' : '8px' ) . ';';
				$pad_css .= 'margin-block-' . $logical . ':-8px;';
			}
			$rules = $row_sel . '{display:flex;flex-direction:row;flex-wrap:nowrap;justify-content:flex-start;align-items:stretch;overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;' . $pad_css . '}'
				. $row_sel . '>*{flex:0 0 ' . $width . ';min-width:0;scroll-snap-align:start;}';
			$css  .= sgs_tier_exact_media_css( array( $tier ), $rules );
			// Tiers follow the screen; only the Mobile tier also applies in a box narrower than 480px (FW-H).
			if ( $with_container && 'mobile' === $tier ) {
				$css .= SGS_Breakpoints::container_width( SGS_Breakpoints::CONTAINER_MOBILE_MAX ) . '{' . $rules . '}';
			}
		}
		return $css;
	}
}

if ( ! function_exists( 'sgs_container_scroll_region_attrs' ) ) {
	/**
	 * The attributes that let the container's view script (src/shared/scroll-region) make the row a focusable, named
	 * region while it overflows: the name from the `scrollRegionLabel` setting (empty: the nearest heading before the row
	 * names it in the browser), and the name to fall back to when there is no heading.
	 *
	 * @param array $attributes Block attributes.
	 * @return string Attribute markup with a leading space, ready for the row's opening tag.
	 */
	function sgs_container_scroll_region_attrs( array $attributes ): string {
		$label = isset( $attributes['scrollRegionLabel'] ) && is_string( $attributes['scrollRegionLabel'] )
			? trim( sanitize_text_field( $attributes['scrollRegionLabel'] ) )
			: '';
		return ' data-sgs-scroll-region="' . esc_attr( $label ) . '" data-sgs-scroll-region-default="' . esc_attr__( 'Scrolling row', 'sgs-blocks' ) . '"';
	}
}
