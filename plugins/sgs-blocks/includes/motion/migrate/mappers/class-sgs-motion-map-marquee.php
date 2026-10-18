<?php
/**
 * The `marquee` migration mapper (Spec 38A §13.2, FR-38A-31, FR-38A-44, build unit M5.15): the two marquee blocks'
 * own scroll attributes to the shared `marquee` effect layer on the root.
 *
 * `sgs/brand-strip` (`scrolling`, `scrollSpeed`, `scrollDuration`, `scrollDirection`, `fadeEdges`, `fadeWidth`,
 * `pauseOnHover`, `pauseButton`) and `sgs/trust-bar` (`autoScroll`, `autoScrollSpeed`, `autoScrollDuration`,
 * `autoScrollBelow`, `autoScrollPauseOnHover`, `autoScrollPauseButton`) each looped their items for a fixed number of
 * seconds. The layer's only pace is `speed` in pixels per second, and a loop time becomes a speed only with the
 * content-dependent track width, which a migration does not have. So no pace is written (the layer's default speed
 * applies) and the stored loop time is reported and consumed:
 *
 * - a custom loop time above 0 (`scrollDuration`, `autoScrollDuration`) is reported as not convertible to px/s; one
 *   outside the render clamp of 2 to 300 seconds says so too;
 * - a stored slow, medium or fast preset (`scrollSpeed`, `autoScrollSpeed`) is reported the same way, with the seconds
 *   it ran (brand-strip 60, 30 and 15; trust-bar 40, 25 and 15; an unknown preset ran 25);
 * - `pauseOnHover` (default on) stopped the loop under a mouse and paused it for a touch: it is `hoverRate` 0 and
 *   `touchPause` tap; off writes neither (hover rate 1 and the layer's default touch behaviour apply);
 * - `pauseButton` and `autoScrollPauseButton` are `pauseControl`;
 * - `scrollDirection` right is `direction` right (left is the default and is not written);
 * - `autoScrollBelow` 768 is `belowBreakpoint` mobile (767px and below) and 1024 is tablet (1023px and below); the
 *   block accepted no other value, and 0 is always;
 * - `fadeEdges` is `edgeFade`. The fade width was a length in pixels and the layer's is a percentage of the strip,
 *   which needs the strip's width, so `fadeWidth` is consumed and reported, and the layer's own default width applies.
 *
 * With the scroll switch off every other marquee attribute was inert: they are consumed without a layer. A value that
 * is not a boolean where the render read a boolean is reported and left on the block.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';

/**
 * Class Sgs_Motion_Map_Marquee
 */
final class Sgs_Motion_Map_Marquee implements Sgs_Motion_Mapper_Interface {

	/** The two blocks and their attribute names by role (an empty name: the block has no such attribute). */
	const BLOCKS = array(
		'sgs/brand-strip' => array(
			'on'        => 'scrolling',
			'preset'    => 'scrollSpeed',
			'duration'  => 'scrollDuration',
			'direction' => 'scrollDirection',
			'fade'      => 'fadeEdges',
			'fadeWidth' => 'fadeWidth',
			'hover'     => 'pauseOnHover',
			'button'    => 'pauseButton',
			'below'     => '',
		),
		'sgs/trust-bar'   => array(
			'on'        => 'autoScroll',
			'preset'    => 'autoScrollSpeed',
			'duration'  => 'autoScrollDuration',
			'direction' => '',
			'fade'      => '',
			'fadeWidth' => '',
			'hover'     => 'autoScrollPauseOnHover',
			'button'    => 'autoScrollPauseButton',
			'below'     => 'autoScrollBelow',
		),
	);

	/** Seconds per loop for each preset, as the block stylesheets and render set them. */
	const PRESETS = array(
		'sgs/brand-strip' => array(
			'slow'   => 60,
			'medium' => 30,
			'fast'   => 15,
		),
		'sgs/trust-bar'   => array(
			'slow'   => 40,
			'medium' => 25,
			'fast'   => 15,
		),
	);

	/** The loop time when the preset is not one of the three (and so no rule set a duration). */
	const FALLBACK_SECONDS = 25;

	/** The custom duration's render clamp, in seconds. */
	const MIN_SECONDS = 2;
	const MAX_SECONDS = 300;

	/** The marquee-below-breakpoint values the trust bar accepted, as the layer's tier names. */
	const BELOW = array(
		768  => 'mobile',
		1024 => 'tablet',
	);

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'marquee';
	}

	/**
	 * Whether the block is a marquee block holding one of its own scroll attributes.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		return array() !== $this->present( $block_name, $attrs );
	}

	/**
	 * Map the scroll attributes to a marquee layer on the root.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported?: array<int,array<string,mixed>>}
	 */
	public function map( string $block_name, array $attrs ): array {
		$present = $this->present( $block_name, $attrs );
		if ( array() === $present ) {
			return array(
				'motion'   => array(),
				'consumed' => array(),
			);
		}
		$names    = self::BLOCKS[ $block_name ];
		$consumed = $present;
		$reported = array();
		$on       = $attrs[ $names['on'] ] ?? false;
		if ( ! is_bool( $on ) ) {
			return array(
				'motion'   => array(),
				'consumed' => array(),
				'reported' => array( $this->row( $names['on'], $on, 'not a boolean, so the render did not read it as on; the marquee attributes stay on the block', false ) ),
			);
		}
		if ( ! $on ) {
			return array(
				'motion'   => array(),
				'consumed' => $consumed,
			);
		}

		$values = array();
		$this->report_loop_time( $block_name, $attrs, $names, $reported );
		if ( '' !== $names['direction'] && 'right' === ( $attrs[ $names['direction'] ] ?? 'left' ) ) {
			$values['direction'] = 'right';
		}
		$hover = $attrs[ $names['hover'] ] ?? true;
		if ( true === $hover ) {
			$values['hoverRate']  = 0;
			$values['touchPause'] = 'tap';
		} elseif ( false !== $hover ) {
			$consumed   = array_values( array_diff( $consumed, array( $names['hover'] ) ) );
			$reported[] = $this->row( $names['hover'], $hover, 'not a boolean, so the pause behaviour is not mapped and the attribute stays', false );
		}
		if ( true === ( $attrs[ $names['button'] ] ?? false ) ) {
			$values['pauseControl'] = true;
		}
		if ( '' !== $names['below'] && is_numeric( $attrs[ $names['below'] ] ?? null ) && isset( self::BELOW[ (int) $attrs[ $names['below'] ] ] ) ) {
			$values['belowBreakpoint'] = self::BELOW[ (int) $attrs[ $names['below'] ] ];
		}
		if ( '' !== $names['fade'] && true === ( $attrs[ $names['fade'] ] ?? false ) ) {
			$values['edgeFade'] = true;
			if ( isset( $attrs[ $names['fadeWidth'] ] ) ) {
				$reported[] = $this->row( $names['fadeWidth'], $attrs[ $names['fadeWidth'] ], 'a fade width in pixels cannot become a percentage of the strip without its width; the default fade width applies', true );
			}
		}

		$result = array(
			'motion'   => array(
				'v'        => 1,
				'elements' => array(
					'root' => array(
						'effects' => array(
							array(
								'id'     => 'marquee',
								'effect' => 'marquee',
								'values' => $values,
							),
						),
					),
				),
			),
			'consumed' => $consumed,
		);
		if ( array() !== $reported ) {
			$result['reported'] = $reported;
		}
		return $result;
	}

	/**
	 * The owned attributes the block holds.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return string[] Attribute names.
	 */
	private function present( string $block_name, array $attrs ): array {
		if ( ! isset( self::BLOCKS[ $block_name ] ) ) {
			return array();
		}
		$out = array();
		foreach ( self::BLOCKS[ $block_name ] as $name ) {
			if ( '' !== $name && array_key_exists( $name, $attrs ) ) {
				$out[] = $name;
			}
		}
		return $out;
	}

	/**
	 * Report the stored loop time (a custom one, or a stored preset) as not convertible to a speed in pixels per second.
	 *
	 * @param string                         $block_name Block name.
	 * @param array<string,mixed>            $attrs      Stored attributes.
	 * @param array<string,string>           $names      Attribute names by role.
	 * @param array<int,array<string,mixed>> $reported   Reported rows (appended to).
	 * @return void
	 */
	private function report_loop_time( string $block_name, array $attrs, array $names, array &$reported ): void {
		$custom = $attrs[ $names['duration'] ] ?? 0;
		if ( is_numeric( $custom ) && (float) $custom > 0 ) {
			$seconds = max( (float) self::MIN_SECONDS, min( (float) self::MAX_SECONDS, (float) $custom ) );
			$clamped = (float) $custom !== $seconds ? ' (outside the render clamp of 2 to 300 seconds, so it ran ' . $seconds . ')' : '';
			$reported[] = $this->row( $names['duration'], $custom, 'a loop time of ' . (float) $custom . ' seconds' . $clamped . ' cannot become a speed in px/s without the track width; the layer default speed applies', true );
			return;
		}
		if ( array_key_exists( $names['preset'], $attrs ) ) {
			$preset  = $attrs[ $names['preset'] ];
			$seconds = is_string( $preset ) && isset( self::PRESETS[ $block_name ][ $preset ] ) ? self::PRESETS[ $block_name ][ $preset ] : self::FALLBACK_SECONDS;
			$reported[] = $this->row( $names['preset'], $preset, 'a preset loop time of ' . $seconds . ' seconds cannot become a speed in px/s without the track width; the layer default speed applies', true );
		}
	}

	/**
	 * One reported row.
	 *
	 * @param string $attr     Attribute name.
	 * @param mixed  $value    Stored value.
	 * @param string $reason   Why it is reported.
	 * @param bool   $consumed Whether the attribute is consumed all the same.
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
