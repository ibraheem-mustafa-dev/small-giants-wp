<?php
/**
 * `filter` atom: the colour treatment (Natural, Black and white with a strength, White), PHP twin of
 * `src/components/media/atoms/filter.js`. It prints one `filter` on the media element and replaces `sgsColourTreatment`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/media-values.php';

if ( ! function_exists( 'sgs_media_atom_filter_value_at' ) ) {
	/**
	 * The `filter` value in force at a device; '' for Natural.
	 *
	 * @param array  $attrs  Attributes.
	 * @param array  $slot   Slot.
	 * @param string $device Device.
	 * @return string
	 */
	function sgs_media_atom_filter_value_at( array $attrs, array $slot, string $device ): string {
		$colour   = sgs_media_resolved( $attrs, $slot, 'Colour', $device );
		$strength = sgs_media_resolved( $attrs, $slot, 'Greyscale', $device );
		return sgs_media_filter( $colour, $strength );
	}
}

if ( ! function_exists( 'sgs_media_atom_filter_emit' ) ) {
	/**
	 * C3 emitter: the media element's `filter`, printed where it changes from the wider device; `none` cancels.
	 *
	 * @param array  $slot   Slot.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class, without the dot.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string
	 */
	function sgs_media_atom_filter_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		$nodes = sgs_media_nodes( $slot, $uid, $helper );
		$rules = array();
		$prev  = '';
		foreach ( sgs_media_devices() as $device ) {
			$now = sgs_media_atom_filter_value_at( $attrs, $slot, $device );
			if ( $now !== $prev ) {
				sgs_media_add( $rules, $nodes['media'], $device, 'filter', '' === $now ? 'none' : $now );
			}
			$prev = $now;
		}
		return sgs_media_rules_css( $rules );
	}
}

if ( ! function_exists( 'sgs_media_atom_filter_disclosure' ) ) {
	/**
	 * C4 rule: the strength shows only while the treatment is Black and white.
	 *
	 * @param array  $attrs  Attributes.
	 * @param string $device Device.
	 * @param string $prefix Slot prefix.
	 * @return array<string,array{state:string,hiddenReason:?string}> By base.
	 */
	function sgs_media_atom_filter_disclosure( array $attrs, string $device = 'desktop', string $prefix = '' ): array {
		$colour = sgs_media_resolved( $attrs, array( 'prefix' => $prefix ), 'Colour', $device );
		return array(
			'Colour'    => array(
				'state'        => 'shown',
				'hiddenReason' => null,
			),
			'Greyscale' => 'greyscale' === $colour
				? array(
					'state'        => 'shown',
					'hiddenReason' => null,
				)
				: array(
					'state'        => 'omitted',
					'hiddenReason' => __( 'Strength applies to Black and white only.', 'sgs-blocks' ),
				),
		);
	}
}
