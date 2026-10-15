<?php
/**
 * The `lottie-logo` migration mapper (Spec 38A §13.2, FR-38A-31, FR-38A-52; build unit M5.14): the logo's SVG draw
 * and Lottie switch, and the Lottie settings of `sgs/media`, become effect layers.
 *
 * `sgs/responsive-logo` chose its substrate with `animationSubstrate` (`svg-draw`, the default, or `lottie`); only the
 * chosen substrate's attributes were read:
 *
 * - `lottie` with `lottieId` > 0: a `lottie` layer in `effects` on the `wrapper` part (`file`, `loop`, `speed`,
 *   `pauseControl`, and the trigger on the layer). `animationStyle` and `svgAnimationSource` were ignored.
 * - `svg-draw` with `animationStyle` one of `draw-on-load`, `scroll-trigger`, `hover-redraw` and `svgAnimationSource` > 0:
 *   a `draw` layer on the `wrapper` part carrying the SVG as `asset`: `entrance.text` with trigger `load` or `scroll`,
 *   `effects` with trigger `hover`. The `lottie*` attributes were ignored.
 * - Anything else (the other substrate's attributes, a style of `none`, an unknown style, no file) was inert in the
 *   render; those attributes are consumed with no layer and each one is reported as inert.
 *
 * `sgs/media` renders a Lottie when `mediaType` is `lottie` or, with no image or video, when `lottieId` is set: its
 * `lottieId` becomes a `lottie` layer on the `media` part and `attrs.mediaType` is set to `lottie` so the block still
 * renders the poster the layer animates. Its loop is the video-behaviour `videoLoop` (the render reads no `lottieLoop`),
 * which stays on the block because video media shares it.
 *
 * Values follow the old render: a trigger outside load, visible, hover, scroll falls back to the block's default (`load`
 * on the logo, `visible` on media); a speed outside 0.25 to 3 played at 1 and is not stored; a loop gets the pause button
 * (`pauseControl`) the old render printed, and so does a non-looping file longer than five seconds when the attachment's
 * stored meta is readable. A scroll-driven animation is scrubbed by the scrollbar, not auto-played, so it gets no pause
 * control.
 *
 * `bgLottie` and `bgLottieLoop` (the wrapper background) belong to the `looping-media` family, which reuses
 * `positive_int` and `runs_long` from here.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';


/**
 * Class Sgs_Motion_Map_Lottie_Logo
 */
final class Sgs_Motion_Map_Lottie_Logo implements Sgs_Motion_Mapper_Interface {

	const LOGO  = 'sgs/responsive-logo';
	const MEDIA = 'sgs/media';

	/** The attributes this family owns, by block. `videoLoop` is read on media but never consumed (video shares it). */
	const OWNED = array(
		self::LOGO  => array( 'animationStyle', 'animationSubstrate', 'svgAnimationSource', 'lottieId', 'lottieLoop', 'lottieSpeed', 'lottieTrigger' ),
		self::MEDIA => array( 'lottieId', 'lottieLoop', 'lottieSpeed', 'lottieTrigger' ),
	);

	/** The part each block's layers go on. */
	const PART = array(
		self::LOGO  => 'wrapper',
		self::MEDIA => 'media',
	);

	/** The trigger each block's render used when the stored one was not valid. */
	const DEFAULT_TRIGGER = array(
		self::LOGO  => 'load',
		self::MEDIA => 'visible',
	);

	const TRIGGERS = array( 'load', 'visible', 'hover', 'scroll' );

	/** The draw trigger for each `animationStyle` that drew. */
	const DRAW_TRIGGER = array(
		'draw-on-load'   => 'load',
		'scroll-trigger' => 'scroll',
		'hover-redraw'   => 'hover',
	);

	/** `sgs_render_lottie()` showed the pause button for a file longer than this many seconds. */
	const PAUSE_AFTER_SECONDS = 5.0;

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'lottie-logo';
	}

	/**
	 * Whether the block holds one of the family's attributes.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		return array() !== $this->present( $block_name, $attrs );
	}

	/**
	 * Map the block's draw and Lottie attributes to effect layers.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], attrs?: array<string,mixed>, reported?: array<int,array<string,mixed>>}
	 */
	public function map( string $block_name, array $attrs ): array {
		$present = $this->present( $block_name, $attrs );
		if ( array() === $present ) {
			return array(
				'motion'   => array(),
				'consumed' => array(),
			);
		}
		$part     = self::PART[ $block_name ];
		$element  = array();
		$used     = array();
		$set      = array();
		$reported = array();
		$lottie   = array( 'lottieId', 'lottieLoop', 'lottieSpeed', 'lottieTrigger' );

		if ( self::MEDIA === $block_name ) {
			$layer = $this->lottie_layer( $block_name, $attrs );
			if ( null !== $layer ) {
				$element['effects'][] = $layer;
				$used                 = $lottie;
				$set['mediaType']     = 'lottie';
			}
		} elseif ( 'lottie' === ( $attrs['animationSubstrate'] ?? null ) ) {
			$layer = $this->lottie_layer( $block_name, $attrs );
			if ( null !== $layer ) {
				$element['effects'][] = $layer;
				$used                 = $lottie;
			}
		} else {
			$layer = $this->draw_layer( $attrs );
			if ( null !== $layer ) {
				$this->put( $element, 'hover' === $layer['trigger'] ? 'effects' : 'entrance.text', $layer );
				$used = array( 'animationStyle', 'svgAnimationSource' );
			}
		}
		// The substrate switch itself is carried by whichever layer it chose.
		if ( array() !== $used ) {
			$used[] = 'animationSubstrate';
		}

		foreach ( $present as $attr ) {
			if ( ! in_array( $attr, $used, true ) ) {
				$reported[] = array(
					'attr'     => $attr,
					'value'    => $attrs[ $attr ],
					'reason'   => $this->inert_reason( $block_name, $attr, $attrs ),
					'consumed' => true,
				);
			}
		}

		$result = array(
			'motion'   => array() === $element ? array() : array(
				'v'        => 1,
				'elements' => array( $part => $element ),
			),
			'consumed' => $present,
			'reported' => $reported,
		);
		if ( array() !== $set ) {
			$result['attrs'] = $set;
		}
		return $result;
	}

	/**
	 * The family's attributes the block holds, in the order the family lists them.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return string[]
	 */
	private function present( string $block_name, array $attrs ): array {
		$owned = self::OWNED[ $block_name ] ?? array();
		return array_values( array_filter( $owned, static fn( $attr ) => array_key_exists( $attr, $attrs ) ) );
	}

	/**
	 * The `lottie` layer for the block's stored settings, or null when it has no file.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array<string,mixed>|null
	 */
	private function lottie_layer( string $block_name, array $attrs ): ?array {
		$file = self::positive_int( $attrs['lottieId'] ?? null );
		if ( null === $file ) {
			return null;
		}
		$trigger = $attrs['lottieTrigger'] ?? null;
		$trigger = is_string( $trigger ) && in_array( $trigger, self::TRIGGERS, true ) ? $trigger : self::DEFAULT_TRIGGER[ $block_name ];
		$loop    = self::LOGO === $block_name ? ! empty( $attrs['lottieLoop'] ) : ! empty( $attrs['videoLoop'] );
		$speed   = is_numeric( $attrs['lottieSpeed'] ?? null ) ? (float) $attrs['lottieSpeed'] : 1.0;
		$speed   = $speed >= 0.25 && $speed <= 3 ? $speed : 1.0;

		$values = array( 'file' => $file );
		if ( $loop ) {
			$values['loop'] = true;
		}
		if ( 1.0 !== $speed ) {
			$values['speed'] = $speed;
		}
		if ( 'scroll' !== $trigger && ( $loop || self::runs_long( $file ) ) ) {
			$values['pauseControl'] = true;
		}
		return array(
			'id'      => 'lottie',
			'effect'  => 'lottie',
			'trigger' => $trigger,
			'values'  => $values,
		);
	}

	/**
	 * The `draw` layer for the logo's stored draw settings, or null when the old render drew nothing.
	 *
	 * @param array<string,mixed> $attrs Stored attributes.
	 * @return array<string,mixed>|null
	 */
	private function draw_layer( array $attrs ): ?array {
		$style = $attrs['animationStyle'] ?? null;
		$asset = self::positive_int( $attrs['svgAnimationSource'] ?? null );
		if ( ! is_string( $style ) || ! isset( self::DRAW_TRIGGER[ $style ] ) || null === $asset ) {
			return null;
		}
		return array(
			'id'      => 'draw',
			'effect'  => 'draw',
			'trigger' => self::DRAW_TRIGGER[ $style ],
			'values'  => array( 'asset' => $asset ),
		);
	}

	/**
	 * Add a layer to an element's list (`effects` or `entrance.text`).
	 *
	 * @param array<string,mixed> $element The element so far (by reference).
	 * @param string              $into    `effects` or `entrance.text`.
	 * @param array<string,mixed> $layer   The layer.
	 * @return void
	 */
	private function put( array &$element, string $into, array $layer ): void {
		$parts = explode( '.', $into );
		if ( 2 === count( $parts ) ) {
			$element[ $parts[0] ][ $parts[1] ][] = $layer;
			return;
		}
		$element[ $into ][] = $layer;
	}

	/**
	 * Why a consumed attribute produced no layer.
	 *
	 * @param string              $block_name Block name.
	 * @param string              $attr       The attribute.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return string
	 */
	private function inert_reason( string $block_name, string $attr, array $attrs ): string {
		$lottie_attr = 0 === strpos( $attr, 'lottie' );
		$substrate   = $attrs['animationSubstrate'] ?? 'svg-draw';
		if ( self::LOGO === $block_name && 'lottie' !== $substrate && $lottie_attr ) {
			return 'inert: the logo draws an SVG, so the old render never read its Lottie settings';
		}
		if ( self::LOGO === $block_name && 'lottie' === $substrate && ! $lottie_attr && 'animationSubstrate' !== $attr ) {
			return 'inert: the logo plays a Lottie, so the old render ignored its SVG draw settings';
		}
		return 'inert: the old render drew or played nothing for this value (no file, a style of none, or an unknown style)';
	}

	/**
	 * Whether the attachment's stored meta says the animation runs longer than the pause threshold. False when
	 * WordPress cannot be asked (the standalone run) or the meta is absent.
	 *
	 * @param int $attachment_id Lottie JSON attachment ID.
	 * @return bool
	 */
	public static function runs_long( int $attachment_id ): bool {
		if ( ! function_exists( 'get_post_meta' ) ) {
			return false;
		}
		$meta = get_post_meta( $attachment_id, '_sgs_lottie_meta', true );
		return is_array( $meta ) && isset( $meta['duration'] ) && (float) $meta['duration'] > self::PAUSE_AFTER_SECONDS;
	}

	/**
	 * A stored attachment ID as a positive integer, or null.
	 *
	 * @param mixed $value Stored value.
	 * @return int|null
	 */
	public static function positive_int( $value ): ?int {
		if ( is_int( $value ) ) {
			return $value > 0 ? $value : null;
		}
		if ( is_string( $value ) && ctype_digit( $value ) && (int) $value > 0 ) {
			return (int) $value;
		}
		return null;
	}
}
