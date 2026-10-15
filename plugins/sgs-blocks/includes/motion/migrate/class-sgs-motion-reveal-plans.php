<?php
/**
 * The per-block reveal rules of the `block-reveals` migration mapper (Spec 38A §13.2, FR-38A-31): timeline reveal,
 * buybox photo entrance, footer row scrub, plus the whole-millisecond reader the mapper's
 * stagger rules share. Every rule takes one block's stored attributes and returns a plan part (`motion`, `consumed`,
 * `unmapped`); `Sgs_Motion_Map_Block_Reveals` owns the table of blocks and merges the parts. What each old attribute
 * did is documented on that class.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Reveal_Plans
 */
final class Sgs_Motion_Reveal_Plans {

	/** The stagger helper's largest step (`$defs.Stagger.properties.step.maximum`). */
	const HELPER_STEP_MAX = 2000;

	/** Timeline defaults, mirroring `src/blocks/timeline/block.json`. */
	const TIMELINE_DEFAULT_STAGGER = 100;

	/**
	 * The entrance start line of a connector reveal: the timeline's reading line sits 38 percent of the viewport height
	 * below the top (`view.js::computeViewProgress`), which is 62 percent above the bottom edge. The header clearance
	 * that function adds cannot be a percentage and is not carried.
	 */
	const CONNECTOR_START = 62;

	/** The part the timeline's entries are (a declared target of `sgs/timeline`). */
	const TIMELINE_ENTRY_PART = 'entry';

	/**
	 * The buybox main photo part. `sgs/buybox` declares it in `block.json::supports.sgs.elements` on
	 * `.sgs-buybox__main-photo`, the class `gallery-col.php` prints on the main `<img>`, so the layer targets the photo.
	 */
	const BUYBOX_PHOTO_PART = 'main-photo';

	/** Presets the `photoEntrance` values stamp (`motion_presets`), by value. */
	const PHOTO_PRESETS = array(
		'fade' => 'entrance-fade-in',
		'rise' => 'entrance-fade-up',
	);

	/**
	 * GSAP `power2.out` as the schema's easing: GSAP's own eases are not storable, and its cubic-out is the standard
	 * ease-out-cubic curve (the same convention as `Sgs_Motion_Fx_Grammar::GSAP_CURVES` for `power1.out` and `power3.out`).
	 */
	const POWER2_OUT = 'cubic-bezier(0.215, 0.61, 0.355, 1)';

	/**
	 * One empty plan part.
	 *
	 * @return array{motion: array<string,mixed>, consumed: string[], unmapped: array<string,string>}
	 */
	public static function nothing(): array {
		return array(
			'motion'   => array(),
			'consumed' => array(),
			'unmapped' => array(),
		);
	}

	/**
	 * A whole number of milliseconds in range, from a stored number or digit string.
	 *
	 * @param mixed $value Stored value.
	 * @param int   $max   Largest accepted value.
	 * @return int|null Null when the value is not a whole number from 0 to `$max`.
	 */
	public static function whole_ms( $value, int $max ): ?int {
		if ( is_string( $value ) && 1 === preg_match( '/^\d+$/', $value ) ) {
			$value = (int) $value;
		}
		if ( is_float( $value ) && floor( $value ) === $value && is_finite( $value ) ) {
			$value = (int) $value;
		}
		return is_int( $value ) && $value >= 0 && $value <= $max ? $value : null;
	}

	/**
	 * `revealOnScroll`, `revealStagger` and `revealTrigger` on the timeline.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], unmapped: array<string,string>}
	 */
	public static function timeline( array $attrs ): array {
		$out = self::nothing();
		$on  = true;
		if ( array_key_exists( 'revealOnScroll', $attrs ) ) {
			if ( ! is_bool( $attrs['revealOnScroll'] ) ) {
				$out['unmapped']['revealOnScroll'] = 'not true or false';
			} else {
				$on                = $attrs['revealOnScroll'];
				$out['consumed'][] = 'revealOnScroll';
			}
		}
		$step = null;
		if ( array_key_exists( 'revealStagger', $attrs ) ) {
			$step = self::whole_ms( $attrs['revealStagger'], self::HELPER_STEP_MAX );
			if ( null === $step ) {
				$out['unmapped']['revealStagger'] = 'not a whole number of milliseconds from 0 to ' . self::HELPER_STEP_MAX;
			} else {
				$out['consumed'][] = 'revealStagger';
			}
		}
		$trigger = 'viewport';
		if ( array_key_exists( 'revealTrigger', $attrs ) ) {
			if ( ! in_array( $attrs['revealTrigger'], array( 'viewport', 'connector' ), true ) ) {
				$out['unmapped']['revealTrigger'] = 'not viewport or connector';
			} else {
				$trigger           = $attrs['revealTrigger'];
				$out['consumed'][] = 'revealTrigger';
			}
		}
		if ( array() !== $out['unmapped'] ) {
			// A value without a destination keeps the whole reveal in the old attributes: half a reveal would change it.
			$out['consumed'] = array();
			return $out;
		}
		$pinned = 'pinned-journey' === ( $attrs['scrollEffect'] ?? 'basic' ) && 'vertical' === ( $attrs['orientation'] ?? 'vertical' );
		if ( ! $on || $pinned ) {
			return $out; // Every entry rendered revealed; the trigger and step did nothing.
		}
		$connector = 'connector' === $trigger && ! empty( $attrs['connectorProgressFill'] );
		$changed   = $connector || ( null !== $step && self::TIMELINE_DEFAULT_STAGGER !== $step );
		if ( ! $changed ) {
			return $out;
		}
		$values = array(
			'from'     => array(
				'opacity'    => 0,
				'translateY' => 20,
			),
			'to'       => array(
				'opacity'    => 1,
				'translateY' => 0,
			),
			'duration' => 400,
			'easing'   => 'ease-out',
		);
		if ( $connector ) {
			$values['start'] = self::CONNECTOR_START;
		}
		$out['motion'] = array(
			'elements' => array(
				self::TIMELINE_ENTRY_PART => array(
					'entrance' => array(
						'base' => array(
							'trigger' => 'scroll',
							'values'  => $values,
						),
					),
				),
			),
		);
		if ( ! $connector ) {
			$out['motion']['stagger'] = array(
				'step'   => $step,
				'offset' => 0,
				'order'  => 'row-first',
				'perRow' => false,
			);
		}
		return $out;
	}

	/**
	 * `photoEntrance` on the buybox.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], unmapped: array<string,string>}
	 */
	public static function photo_entrance( array $attrs ): array {
		$out = self::nothing();
		if ( ! array_key_exists( 'photoEntrance', $attrs ) ) {
			return $out;
		}
		$value = $attrs['photoEntrance'];
		if ( 'none' === $value ) {
			$out['consumed'][] = 'photoEntrance';
			return $out;
		}
		if ( ! is_string( $value ) || ! isset( self::PHOTO_PRESETS[ $value ] ) ) {
			$out['unmapped']['photoEntrance'] = 'not none, fade or rise';
			return $out;
		}
		$from = array( 'opacity' => 0 );
		if ( 'rise' === $value ) {
			$from['translateY'] = 'token:entrance.distance';
		}
		$out['consumed'][] = 'photoEntrance';
		$out['motion']     = array(
			'elements' => array(
				self::BUYBOX_PHOTO_PART => array(
					'entrance' => array(
						'base' => array(
							'preset'  => self::PHOTO_PRESETS[ $value ],
							'trigger' => 'load',
							'values'  => array(
								'from'     => $from,
								'to'       => array_merge( array( 'opacity' => 1 ), 'rise' === $value ? array( 'translateY' => 0 ) : array() ),
								'duration' => 'token:entrance.duration',
								'easing'   => 'token:entrance.easing',
							),
						),
					),
				),
			),
		);
		return $out;
	}

	/**
	 * `fxFooterStagger` on the footer row.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], unmapped: array<string,string>}
	 */
	public static function footer_scrub( array $attrs ): array {
		$out = self::nothing();
		if ( ! array_key_exists( 'fxFooterStagger', $attrs ) ) {
			return $out;
		}
		if ( ! is_bool( $attrs['fxFooterStagger'] ) ) {
			$out['unmapped']['fxFooterStagger'] = 'not true or false';
			return $out;
		}
		$out['consumed'][] = 'fxFooterStagger';
		$paint             = $attrs['fxEffect'] ?? '';
		if ( ! $attrs['fxFooterStagger'] || ( is_string( $paint ) && '' !== $paint ) ) {
			return $out; // Off, or a paint effect held the node and the reveal never ran.
		}
		$out['motion'] = array(
			'elements' => array(
				'root' => array(
					'effects' => array(
						array(
							'id'      => 'scrub',
							'effect'  => 'scrub',
							'trigger' => 'scroll',
							'values'  => array(
								'rows'          => array(
									array(
										'property' => 'opacity',
										'from'     => 0,
										'to'       => 1,
									),
									array(
										'property' => 'y',
										'from'     => 40,
										'to'       => 0,
									),
								),
								'startElement'  => 'top',
								'startViewport' => 90,
								'endElement'    => 'top',
								'endViewport'   => 55,
								'smoothing'     => 1000,
								'easing'        => self::POWER2_OUT,
							),
						),
					),
				),
			),
		);
		return $out;
	}
}
