<?php
/**
 * The `ripple` migration mapper (Spec 38A §13.1, FR-38A-45): the legacy click ripple to a Ripple effect layer.
 *
 * `sgsClickEffect` (a string on every block the hover extension reaches) with the value `ripple` put
 * `.sgs-has-click-ripple` on the block, which `assets/js/ripple.js` ran from the click point: a 4px seed dot scaled so
 * its diameter reached twice the distance to the furthest corner, ease-out, fading from full opacity to nothing over
 * `sgsClickRippleDuration` ms (default 600), in `sgsClickRippleColour` (a palette slug or hex; default the text colour
 * at 30%). It becomes one Ripple layer on the root with the click trigger:
 * - `duration`: `sgsClickRippleDuration`, or the legacy 600 when unset; `easing`: `ease-out`.
 * - `sizeFactor`: 2.8, the top of the schema range, because the legacy circle always reached the furthest corner from
 *   any click point (a diameter of up to about 2.83 times the larger side).
 * - `colour` and `peakOpacity`: a stored colour is written with peak opacity 1 (the legacy circle was opaque at its
 *   start); an unset colour has no destination (the schema holds a palette slug or hex, not "the text colour"), so the
 *   layer keeps the default colour, takes the legacy 30% peak opacity, and the loss is reported.
 *
 * Any other `sgsClickEffect` value that is not `ripple` or `none` is not consumed and is reported. A colour that is
 * neither a slug nor a hex, or a duration that is not a positive number, stays on the block and is reported while the
 * layer is still written with the default for that value. The colour and duration of a block whose effect is not
 * `ripple` were never read by the legacy render, so they are consumed alone.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';

/**
 * Class Sgs_Motion_Map_Ripple
 */
final class Sgs_Motion_Map_Ripple implements Sgs_Motion_Mapper_Interface {

	/** The legacy attributes. */
	const EFFECT_ATTR   = 'sgsClickEffect';
	const COLOUR_ATTR   = 'sgsClickRippleColour';
	const DURATION_ATTR = 'sgsClickRippleDuration';

	/** The values the legacy script and stylesheet used. */
	const LEGACY_DURATION     = 600;
	const LEGACY_EASING       = 'ease-out';
	const LEGACY_PEAK_DEFAULT = 0.3;

	/** The size factor that reaches the furthest corner from any point (the schema's maximum is 5). */
	const SIZE_FACTOR = 2.8;

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'ripple';
	}

	/**
	 * Whether the block holds a legacy ripple attribute.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		return array_key_exists( self::EFFECT_ATTR, $attrs )
			|| array_key_exists( self::COLOUR_ATTR, $attrs )
			|| array_key_exists( self::DURATION_ATTR, $attrs );
	}

	/**
	 * Map the legacy click ripple to a Ripple layer on the root.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported?: array<int,array<string,mixed>>}
	 */
	public function map( string $block_name, array $attrs ): array {
		$effect   = $attrs[ self::EFFECT_ATTR ] ?? null;
		$consumed = array();
		$reported = array();
		foreach ( array( self::EFFECT_ATTR, self::COLOUR_ATTR, self::DURATION_ATTR ) as $name ) {
			if ( array_key_exists( $name, $attrs ) && 'ripple' !== $effect ) {
				// Never read by the legacy render without the ripple effect, or an unrecognised effect value.
				if ( self::EFFECT_ATTR !== $name || in_array( $effect, array( '', 'none', null ), true ) ) {
					$consumed[] = $name;
				}
			}
		}
		if ( 'ripple' !== $effect ) {
			if ( array_key_exists( self::EFFECT_ATTR, $attrs ) && ! in_array( $effect, array( '', 'none', null ), true ) ) {
				$reported[] = $this->row( self::EFFECT_ATTR, $effect, 'not a click effect this mapper knows, so it stays on the block', false );
			}
			return array(
				'motion'   => array(),
				'consumed' => $consumed,
				'reported' => $reported,
			);
		}

		$consumed = array( self::EFFECT_ATTR );
		$values   = array(
			'sizeFactor' => self::SIZE_FACTOR,
			'easing'     => self::LEGACY_EASING,
		);

		$duration = $attrs[ self::DURATION_ATTR ] ?? null;
		if ( ! array_key_exists( self::DURATION_ATTR, $attrs ) || null === $duration || '' === $duration ) {
			$values['duration'] = self::LEGACY_DURATION;
			if ( array_key_exists( self::DURATION_ATTR, $attrs ) ) {
				$consumed[] = self::DURATION_ATTR;
			}
		} elseif ( is_numeric( $duration ) && (float) $duration > 0 && (float) $duration <= 120000 ) {
			$values['duration'] = $duration + 0;
			$consumed[]         = self::DURATION_ATTR;
		} else {
			$values['duration'] = self::LEGACY_DURATION;
			$reported[]         = $this->row( self::DURATION_ATTR, $duration, 'not a positive number of milliseconds, so the layer takes the legacy 600 and the value stays on the block', false );
		}

		$colour = $attrs[ self::COLOUR_ATTR ] ?? null;
		if ( ! array_key_exists( self::COLOUR_ATTR, $attrs ) || null === $colour || '' === $colour ) {
			$values['peakOpacity'] = self::LEGACY_PEAK_DEFAULT;
			if ( array_key_exists( self::COLOUR_ATTR, $attrs ) ) {
				$consumed[] = self::COLOUR_ATTR;
			}
			$reported[] = $this->row( self::COLOUR_ATTR, $colour, 'the legacy default was the text colour at 30%; the schema holds a palette slug or hex, so the layer keeps its default colour at 30% peak opacity', true );
		} elseif ( is_string( $colour ) && 1 === preg_match( '/^(?:[a-z0-9][a-z0-9-]*|#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8}))$/D', $colour ) ) {
			$values['colour']      = $colour;
			$values['peakOpacity'] = 1;
			$consumed[]            = self::COLOUR_ATTR;
		} else {
			$values['peakOpacity'] = self::LEGACY_PEAK_DEFAULT;
			$reported[]            = $this->row( self::COLOUR_ATTR, $colour, 'neither a palette slug nor a hex colour, so it has no destination and stays on the block', false );
		}

		return array(
			'motion'   => array(
				'v'        => 1,
				'elements' => array(
					'root' => array(
						'effects' => array(
							array(
								'id'      => 'ripple',
								'effect'  => 'ripple',
								'trigger' => 'click',
								'values'  => $values,
							),
						),
					),
				),
			),
			'consumed' => array_values( array_unique( $consumed ) ),
			'reported' => $reported,
		);
	}

	/**
	 * One reported row.
	 *
	 * @param string $attr     Attribute.
	 * @param mixed  $value    Stored value.
	 * @param string $reason   Why it is reported.
	 * @param bool   $consumed Whether the attribute is removed from the block.
	 * @return array<string,mixed>
	 */
	private function row( string $attr, $value, string $reason, bool $consumed ): array {
		return array(
			'attr'     => $attr,
			'value'    => $value,
			'reason'   => $reason,
			'consumed' => $consumed,
		);
	}
}
