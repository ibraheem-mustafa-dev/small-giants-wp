<?php
/**
 * The `tilt` migration mapper (Spec 38A §13.2, FR-38A-31, FR-38A-41): the legacy 3D tilt switch to Follow pointer.
 *
 * `sgsHoverTilt3D` (a boolean on `sgs/container`, `sgs/google-reviews`, `sgs/info-box`, `sgs/media`,
 * `sgs/pricing-table`, `sgs/product-card`, `sgs/team-member` and `sgs/whatsapp-cta`) put `.sgs-has-tilt-3d` on the
 * block, which `assets/js/tilt-3d.js` tilted by at most 6deg under an 800px perspective, settling in 100ms ease-out.
 * It becomes the root's hover state with Follow pointer on and those same values: `followPointer` true, `maxAngle` 6,
 * `resetDuration` 100 and `resetEasing` `ease-out` (the renderer writes the 800px self perspective itself when an X or
 * Y owner has none). The legacy tilt had no glare setting, so no glare layer is written.
 *
 * `false` carries nothing and is consumed alone. Any other value (a string, a number) is not a boolean the legacy
 * render read as on, so it is NOT consumed and stays on the block. Once the attribute is consumed the block no longer
 * gets `.sgs-has-tilt-3d`, so a migrated element never carries both the legacy script and Follow pointer.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';

/**
 * Class Sgs_Motion_Map_Tilt
 */
final class Sgs_Motion_Map_Tilt implements Sgs_Motion_Mapper_Interface {

	/** The legacy attribute. */
	const ATTR = 'sgsHoverTilt3D';

	/** The values the legacy script and stylesheet used. */
	const MAX_ANGLE      = 6;
	const RESET_DURATION = 100;
	const RESET_EASING   = 'ease-out';

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'tilt';
	}

	/**
	 * Whether the block holds the legacy attribute.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		return array_key_exists( self::ATTR, $attrs );
	}

	/**
	 * Map the legacy switch to the root's Follow pointer hover state.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported?: array<int,array<string,mixed>>}
	 */
	public function map( string $block_name, array $attrs ): array {
		if ( ! array_key_exists( self::ATTR, $attrs ) ) {
			return array(
				'motion'   => array(),
				'consumed' => array(),
			);
		}
		$on = $attrs[ self::ATTR ];
		if ( false === $on || null === $on ) {
			return array(
				'motion'   => array(),
				'consumed' => array( self::ATTR ),
			);
		}
		if ( true !== $on ) {
			return array(
				'motion'   => array(),
				'consumed' => array(),
				'reported' => array(
					array(
						'attr'     => self::ATTR,
						'value'    => $on,
						'reason'   => 'not a boolean, so the legacy render did not read it as on; it stays on the block',
						'consumed' => false,
					),
				),
			);
		}
		return array(
			'motion'   => array(
				'v'        => 1,
				'elements' => array(
					'root' => array(
						'hover' => array(
							'state' => array(
								'values' => array(
									'followPointer' => true,
									'maxAngle'      => self::MAX_ANGLE,
									'resetDuration' => self::RESET_DURATION,
									'resetEasing'   => self::RESET_EASING,
								),
							),
						),
					),
				),
			),
			'consumed' => array( self::ATTR ),
		);
	}
}
