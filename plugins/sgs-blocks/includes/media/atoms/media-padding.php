<?php
/**
 * `media-padding` atom — PHP value-setter twin of
 * `src/components/media/atoms/media-padding.js`.
 *
 * BRAND NEW capability, not a retrofit — `sgs/media` never declared a
 * padding attribute before this atom. See the JS twin's module docblock for
 * why this is scoped to padding alone rather than reintroducing
 * border/radius, which `box-shape` already owns.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';
// sgs_media_atom_box_shape_to_length_value(): the shared length sanitiser (twin of box-shape.js's toLengthValue()).
require_once __DIR__ . '/box-shape.php';

if ( ! function_exists( 'sgs_media_atom_media_padding_sides_to_shorthand' ) ) {
	/**
	 * Convert a 4-SIDE box object into the CSS `padding` shorthand VALUE
	 * string ("top right bottom left") — mirrors the JS twin's
	 * `sidesToShorthand()` exactly. Each side already carries its own unit
	 * (`ResponsiveBoxControl`'s own shape), so no unit-append step runs here.
	 *
	 * @param mixed $sides Raw `Padding`-shaped value.
	 * @return string "T R B L", or '' when nothing is set.
	 */
	function sgs_media_atom_media_padding_sides_to_shorthand( $sides ) {
		if ( ! is_array( $sides ) ) {
			return '';
		}
		$order   = array( 'top', 'right', 'bottom', 'left' );
		$has_any = false;
		foreach ( $order as $k ) {
			if ( isset( $sides[ $k ] ) && '' !== $sides[ $k ] ) {
				$has_any = true;
				break;
			}
		}
		if ( ! $has_any ) {
			return '';
		}
		$parts = array();
		foreach ( $order as $k ) {
			$parts[] = ( isset( $sides[ $k ] ) && '' !== $sides[ $k ] ) ? $sides[ $k ] : '0';
		}
		return implode( ' ', $parts );
	}
}

if ( ! function_exists( 'sgs_media_atom_media_padding_side_decls' ) ) {
	/**
	 * Per-side custom-property declarations for ONE tier — mirrors the JS
	 * twin's `sideDecls()` exactly. Only the sides the client set are emitted
	 * (order: top, right, bottom, left), so an unset side falls through to the
	 * wider tier's value in the stylesheet instead of being zeroed.
	 *
	 * @param mixed  $sides  Raw `Padding`-shaped value for one tier.
	 * @param string $suffix Tier suffix: '', '-tablet' or '-mobile'.
	 * @return string[] `--sgs-media-padding-<side><suffix>:<value>` declarations.
	 */
	function sgs_media_atom_media_padding_side_decls( $sides, $suffix ) {
		$decls = array();
		if ( ! is_array( $sides ) ) {
			return $decls;
		}
		foreach ( array( 'top', 'right', 'bottom', 'left' ) as $k ) {
			if ( isset( $sides[ $k ] ) && '' !== $sides[ $k ] ) {
				$decls[] = '--sgs-media-padding-' . $k . $suffix . ':' . sgs_media_atom_box_shape_to_length_value( $sides[ $k ] );
			}
		}
		return $decls;
	}
}

if ( ! function_exists( 'sgs_media_atom_media_padding_requires' ) ) {
	/**
	 * Unconditional — nothing gates padding off.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array{state:string,hiddenReason:null}
	 */
	function sgs_media_atom_media_padding_requires( array $attributes, $prefix = '', $block_slug = '' ) {
		return array(
			'state'        => 'shown',
			'hiddenReason' => null,
		);
	}
}

require_once dirname( __DIR__ ) . '/media-values.php';

if ( ! function_exists( 'sgs_media_atom_media_padding_emit' ) ) {
	/**
	 * C3 emitter (the `surface` atom): `padding-*` per side once per device that sets its own, and `background-color`
	 * (Background, all devices), on the surface.
	 *
	 * @param array  $slot   Slot `{prefix, kinds, context, wrapper}`.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class, without the dot.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string CSS, '' when nothing is set.
	 */
	function sgs_media_atom_media_padding_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		$surface = sgs_media_nodes( $slot, $uid, $helper )['surface'];
		$rules   = array();
		foreach ( sgs_media_devices() as $device ) {
			$box = sgs_media_own( $attrs, $slot, 'Padding', $device );
			foreach ( is_array( $box ) ? array( 'top', 'right', 'bottom', 'left' ) : array() as $side ) {
				$value = sgs_media_px( $box[ $side ] ?? null );
				if ( '' !== $value ) {
					sgs_media_add( $rules, $surface, $device, 'padding-' . $side, $value );
				}
			}
		}
		$background = sgs_media_colour( sgs_media_scalar( $attrs, $slot, 'Background' ) );
		if ( '' !== $background ) {
			sgs_media_add( $rules, $surface, 'desktop', 'background-color', $background );
		}
		return sgs_media_rules_css( $rules );
	}
}
