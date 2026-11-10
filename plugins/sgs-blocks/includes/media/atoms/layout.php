<?php
/**
 * `layout` atom: Alignment and Order on the layout box, PHP twin of `src/components/media/atoms/layout.js`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/media-values.php';

if ( ! function_exists( 'sgs_media_atom_layout_emit' ) ) {
	/**
	 * C3 emitter: `margin-inline-start` and `margin-inline-end` for Alignment, `order` for Order, once per device that sets its own.
	 *
	 * @param array  $slot   Slot.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class, without the dot.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string
	 */
	function sgs_media_atom_layout_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		$layout = sgs_media_nodes( $slot, $uid, $helper )['layout'];
		$rules  = array();
		$sides  = array(
			'start'  => array( '0', 'auto' ),
			'center' => array( 'auto', 'auto' ),
			'end'    => array( 'auto', '0' ),
		);
		foreach ( sgs_media_devices() as $device ) {
			$align = sgs_media_own( $attrs, $slot, 'Alignment', $device );
			if ( is_string( $align ) && isset( $sides[ $align ] ) ) {
				sgs_media_add( $rules, $layout, $device, 'margin-inline-start', $sides[ $align ][0] );
				sgs_media_add( $rules, $layout, $device, 'margin-inline-end', $sides[ $align ][1] );
			}
			$order = sgs_media_own( $attrs, $slot, 'Order', $device );
			if ( is_numeric( $order ) ) {
				sgs_media_add( $rules, $layout, $device, 'order', (string) (int) max( -20, min( 20, (int) $order ) ) );
			}
		}
		return sgs_media_rules_css( $rules );
	}
}

if ( ! function_exists( 'sgs_media_atom_layout_disclosure' ) ) {
	/**
	 * C4 rule: both settings always show.
	 *
	 * @param array  $attrs  Attributes.
	 * @param string $device Device.
	 * @param string $prefix Slot prefix.
	 * @return array<string,array{state:string,hiddenReason:?string}> By base.
	 */
	function sgs_media_atom_layout_disclosure( array $attrs, string $device = 'desktop', string $prefix = '' ): array {
		$shown = array(
			'state'        => 'shown',
			'hiddenReason' => null,
		);
		return array(
			'Alignment' => $shown,
			'Order'     => $shown,
		);
	}
}
