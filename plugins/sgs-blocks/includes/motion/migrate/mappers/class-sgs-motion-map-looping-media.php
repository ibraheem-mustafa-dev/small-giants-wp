<?php
/**
 * The `looping-media` migration mapper (Spec 38A §13.1, §13.2, FR-38A-52, FR-38A-31, FR-38A-32): the Ken Burns, SVG
 * animation and background Lottie attributes to `ken-burns`, `svg-loop`, `ambient-float` and `lottie` effect layers.
 *
 * Sources (blocks from `git grep -n -E "bgKenBurns|bgSvgAnimation|splitMediaKenBurns|svgAnimation" -- 'plugins/sgs-blocks/src/blocks/*\/block.json'`):
 * - `bgKenBurns`, `bgAnimationDuration`, `bgSvgAnimation`, `bgSvgAnimationSpeed`, `bgLottie`, `bgLottieLoop` on `sgs/container`, `sgs/hero`,
 *   `sgs/trust-bar`, `sgs/site-header`, `sgs/site-footer`, `sgs/multi-button` and `sgs/physics-canvas`, plus `bgKenBurnsMode`
 *   and `bgZoomStart` on `sgs/hero`;
 * - `splitMediaKenBurns` and `splitMediaAnimationDuration` (the media atom of `sgs/hero`);
 * - `kenBurns` and `animationDuration` (the media atom) and `svgAnimation` and `svgAnimationSpeed` on `sgs/media`.
 *
 * Destinations: Ken Burns of a background layer goes to the `background` part (the element that paints the background
 * image, which the host block declares); the media atom's Ken Burns goes to `media`; a background SVG animation goes to
 * the `svg-bg` part and the media block's to `media`; a background Lottie goes to `background`, where the wrapper prints
 * the Lottie's holder (`Sgs_Motion_Background_Lottie`) with the background image inside as its poster.
 *
 * Background Lottie, and why: the old wrapper played `bgLottie` on `visible` at speed 1, looping unless `bgLottieLoop`
 * was false (absent meant true), with the pause button for a loop or a file longer than five seconds; the layer stores
 * the same (`Sgs_Motion_Map_Lottie_Logo::runs_long` reads the stored length). A `bgLottie` of 0 played nothing, so both
 * attributes are consumed with no layer; a value that is not an attachment ID stays on the block with a reported row.
 * The old background image became the Lottie's poster, outside the Ken Burns selector, so a Ken Burns beside a Lottie
 * never ran: its layer is dropped and reported.
 *
 * Ken Burns, and why:
 * - `bgKenBurnsMode` `zoom-out-once` becomes mode `zoom-out-once` from `bgZoomStart` percent (default 108) to 100 over
 *   `bgAnimationDuration` seconds (default 20) with the `token:entrance.easing` the retired keyframe used. Any other mode
 *   is a loop. A zoom outside the effect's 100 to 200 range stays on the block with a reported row.
 * - A loop is two zoom values that alternate with `ease-in-out`, over `bgAnimationDuration` seconds (a layer over the
 *   effect's 120 second limit stays on the block). The retired loops drew different shapes by block: the container
 *   family scaled the background 110 to 120 with a diagonal drift, `sgs/hero` and the media atoms scaled 1 to 1.06 to
 *   1.04 to 1. The effect holds two zoom values and one pan direction, so the container family maps to 110 and 120 with
 *   pan `none` and `sgs/hero` and the media atoms to 100 and 106; a reported row says the loop's shape was simplified.
 * - The media atoms clamp their duration to 5 to 60 seconds (default 20), and a media element with its parallax on never
 *   ran its Ken Burns (parallax wins), so the Ken Burns is consumed with no layer.
 * - No layer sets `pauseControl`: the retired animations had no pause button and the effect's default is off.
 *
 * SVG animation, and why (speed words slow, medium, fast; the retired keyframes are in `container/style.css` and
 * `media/style.css`):
 * - `pulse` is an `svg-loop` pulse (opacity 1 to 0.5 and back) over 5000, 3000 or 1500 ms; `wave` an `svg-loop` wave
 *   (scale 1 to 1.05 with a 1 degree rock each way) over 8000, 5000 or 3000 ms; amplitude 1 draws the retired shape.
 * - `float` is an `ambient-float` layer: travel -10px on the y axis, ease-in-out, direction alternate. The retired
 *   keyframe went up and back in one cycle of 6000, 4000 or 2000 ms, and the effect's period is one way, so the period is
 *   3000, 2000 or 1000 ms (FR-38A-37).
 * - An animation word outside none, pulse, float and wave stays on the block with a reported row. `none` and an
 *   unreadable speed are consumed (the retired render treated both as `none` and `medium`).
 * - `sgs/media` has two stylesheets for the same words (`media/style.css` on the SVG element, the opacity pulse mapped
 *   here, and the media atom's `svg-presentation.css` with a scale pulse); a reported row says which one was mapped.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/interface-sgs-motion-mapper.php';
require_once __DIR__ . '/class-sgs-motion-map-lottie-logo.php';

/**
 * Class Sgs_Motion_Map_Looping_Media
 */
final class Sgs_Motion_Map_Looping_Media implements Sgs_Motion_Mapper_Interface {

	/** Blocks that carry the `bg*` looping-media attributes. */
	const BACKGROUND_BLOCKS = array( 'sgs/container', 'sgs/hero', 'sgs/trust-bar', 'sgs/site-header', 'sgs/site-footer', 'sgs/multi-button', 'sgs/physics-canvas' );

	/** The block with the Ken Burns mode, the starting zoom and the split media. */
	const HERO = 'sgs/hero';

	/** The block with the media atom's Ken Burns and the SVG animation of its own. */
	const MEDIA = 'sgs/media';

	/** The parts the layers land on. */
	const BACKGROUND_PART = 'background';
	const SVG_PART        = 'svg-bg';
	const MEDIA_PART      = 'media';

	/** The retired default duration, in seconds, and the limits the media atom clamped it to. */
	const DEFAULT_SECONDS   = 20;
	const ATOM_MIN_SECONDS  = 5;
	const ATOM_MAX_SECONDS  = 60;
	const LAYER_MAX_SECONDS = 120;

	/** The retired `bgZoomStart` default, in percent. */
	const DEFAULT_ZOOM_START = 108;

	/** The loop zoom values (percent) by retired shape. */
	const CONTAINER_LOOP = array( 110, 120 );
	const HERO_LOOP      = array( 100, 106 );

	/** The retired zoom-out-once easing. */
	const ONCE_EASING = 'token:entrance.easing';

	/** Speed word to the `svg-loop` duration in ms, by motion. */
	const SVG_LOOP_MS = array(
		'pulse' => array(
			'slow'   => 5000,
			'medium' => 3000,
			'fast'   => 1500,
		),
		'wave'  => array(
			'slow'   => 8000,
			'medium' => 5000,
			'fast'   => 3000,
		),
	);

	/** Speed word to the `ambient-float` one-way period in ms (half the retired cycle). */
	const FLOAT_PERIOD_MS = array(
		'slow'   => 3000,
		'medium' => 2000,
		'fast'   => 1000,
	);

	/** The retired float's travel in px (up). */
	const FLOAT_TRAVEL = -10;

	/**
	 * The mapper's family slug.
	 *
	 * @return string
	 */
	public function family(): string {
		return 'looping-media';
	}

	/**
	 * The attributes this mapper owns on a block.
	 *
	 * @param string $block_name Block name.
	 * @return string[]
	 */
	public static function owned( string $block_name ): array {
		if ( self::MEDIA === $block_name ) {
			return array( 'kenBurns', 'animationDuration', 'svgAnimation', 'svgAnimationSpeed' );
		}
		if ( ! in_array( $block_name, self::BACKGROUND_BLOCKS, true ) ) {
			return array();
		}
		$owned = array( 'bgKenBurns', 'bgAnimationDuration', 'bgSvgAnimation', 'bgSvgAnimationSpeed', 'bgLottie', 'bgLottieLoop' );
		if ( self::HERO === $block_name ) {
			array_push( $owned, 'bgKenBurnsMode', 'bgZoomStart', 'splitMediaKenBurns', 'splitMediaAnimationDuration' );
		}
		return $owned;
	}

	/**
	 * Whether the block holds an old looping-media attribute.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return bool
	 */
	public function handles( string $block_name, array $attrs ): bool {
		return array() !== array_intersect( self::owned( $block_name ), array_keys( $attrs ) );
	}

	/**
	 * Map the block's old looping-media attributes to layers.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attrs      Stored attributes.
	 * @return array{motion: array<string,mixed>, consumed: string[], reported: array<int,array<string,mixed>>}
	 */
	public function map( string $block_name, array $attrs ): array {
		$layers   = array();
		$consumed = array();
		$reported = array();
		$hero     = self::HERO === $block_name;

		if ( self::MEDIA === $block_name ) {
			$this->plan_kenburns( 'kenBurns', 'animationDuration', self::MEDIA_PART, 'parallax', 'loop', self::HERO_LOOP, true, $attrs, $layers, $consumed, $reported );
			$this->plan_svg( 'svgAnimation', 'svgAnimationSpeed', self::MEDIA_PART, $attrs, $layers, $consumed, $reported );
			if ( array_key_exists( 'svgAnimation', $attrs ) && in_array( $attrs['svgAnimation'], array( 'pulse', 'wave' ), true ) ) {
				$reported[] = self::row( 'svgAnimation', $attrs['svgAnimation'], 'the block draws it from media/style.css (opacity pulse, mapped here) and its media atom from svg-presentation.css (a scale pulse and a rotate wave); only the block stylesheet was mapped', true );
			}
		} else {
			$once = $hero && 'zoom-out-once' === ( $attrs['bgKenBurnsMode'] ?? 'loop' );
			$loop = $hero ? self::HERO_LOOP : self::CONTAINER_LOOP;
			$this->plan_kenburns( 'bgKenBurns', 'bgAnimationDuration', self::BACKGROUND_PART, '', $once ? 'zoom-out-once' : 'loop', $loop, false, $attrs, $layers, $consumed, $reported );
			if ( $hero ) {
				$this->plan_kenburns( 'splitMediaKenBurns', 'splitMediaAnimationDuration', self::MEDIA_PART, 'splitMediaParallax', 'loop', self::HERO_LOOP, true, $attrs, $layers, $consumed, $reported );
			}
			$this->plan_svg( 'bgSvgAnimation', 'bgSvgAnimationSpeed', self::SVG_PART, $attrs, $layers, $consumed, $reported );
			$this->plan_lottie( $attrs, $layers, $consumed, $reported );
		}

		$elements = array();
		foreach ( $layers as $part => $list ) {
			$elements[ $part ]['effects'] = $list;
		}
		return array(
			'motion'   => array() === $elements ? array() : array(
				'v'        => 1,
				'elements' => $elements,
			),
			'consumed' => array_values( array_unique( $consumed ) ),
			'reported' => $reported,
		);
	}

	/**
	 * The background Lottie (`bgLottie`, `bgLottieLoop`) as a `lottie` layer on the background part.
	 *
	 * @param array<string,mixed>            $attrs    Stored attributes.
	 * @param array<string,array<int,array>> $layers   Layers by part (appended to).
	 * @param string[]                       $consumed Consumed attributes (appended to).
	 * @param array<int,array<string,mixed>> $reported Reported rows (appended to).
	 */
	private function plan_lottie( array $attrs, array &$layers, array &$consumed, array &$reported ): void {
		$held = array_values( array_intersect( array( 'bgLottie', 'bgLottieLoop' ), array_keys( $attrs ) ) );
		if ( array() === $held ) {
			return;
		}
		$raw = $attrs['bgLottie'] ?? 0;
		if ( 0 === $raw || '0' === $raw || null === $raw ) {
			// No file: the old wrapper played nothing, and the loop setting changes nothing.
			array_push( $consumed, ...$held );
			return;
		}
		$file = Sgs_Motion_Map_Lottie_Logo::positive_int( $raw );
		if ( null === $file ) {
			$reported[] = self::row( 'bgLottie', $raw, 'not an attachment ID; the background Lottie attributes stay on the block', false );
			return;
		}
		if ( array_key_exists( 'bgLottieLoop', $attrs ) && ! is_bool( $attrs['bgLottieLoop'] ) ) {
			$reported[] = self::row( 'bgLottieLoop', $attrs['bgLottieLoop'], 'not a boolean; the background Lottie attributes stay on the block', false );
			return;
		}
		$loop   = $attrs['bgLottieLoop'] ?? true;
		$values = array( 'file' => $file );
		if ( $loop ) {
			$values['loop'] = true;
		}
		if ( $loop || Sgs_Motion_Map_Lottie_Logo::runs_long( $file ) ) {
			$values['pauseControl'] = true;
		}
		$kept = array();
		foreach ( $layers[ self::BACKGROUND_PART ] ?? array() as $layer ) {
			if ( 'ken-burns' === ( $layer['effect'] ?? '' ) ) {
				$reported[] = self::row( 'bgKenBurns', true, 'the background image was the Lottie poster, outside the Ken Burns selector, so the Ken Burns never ran beside a background Lottie; no ken-burns layer is written', true );
				continue;
			}
			$kept[] = $layer;
		}
		$kept[]                           = array(
			'id'      => 'lottie',
			'effect'  => 'lottie',
			'trigger' => 'visible',
			'values'  => $values,
		);
		$layers[ self::BACKGROUND_PART ] = $kept;
		array_push( $consumed, ...$held );
	}

	/**
	 * One Ken Burns switch with its duration (and, on the hero background, its mode and starting zoom).
	 *
	 * @param string                         $toggle   Boolean attribute.
	 * @param string                         $duration     Duration attribute (seconds).
	 * @param string                         $part         Destination part.
	 * @param string                         $parallax     Attribute that, when true, stopped the Ken Burns running ('' for none).
	 * @param string                         $mode         `loop` or `zoom-out-once`.
	 * @param int[]                          $loop_zoom    Start and end zoom percent for a loop.
	 * @param bool                           $atom         Whether the media atom's clamp on the duration applies.
	 * @param array<string,mixed>            $attrs        Stored attributes.
	 * @param array<string,array<int,array>> $layers       Layers by part (appended to).
	 * @param string[]                       $consumed     Consumed attributes (appended to).
	 * @param array<int,array<string,mixed>> $reported     Reported rows (appended to).
	 */
	private function plan_kenburns( string $toggle, string $duration, string $part, string $parallax, string $mode, array $loop_zoom, bool $atom, array $attrs, array &$layers, array &$consumed, array &$reported ): void {
		$held = array_values( array_filter( array( $toggle, $duration, 'bgKenBurns' === $toggle ? 'bgKenBurnsMode' : '', 'bgKenBurns' === $toggle ? 'bgZoomStart' : '' ), static fn( string $key ): bool => '' !== $key && array_key_exists( $key, $attrs ) ) );
		if ( array() === $held ) {
			return;
		}
		if ( array_key_exists( $toggle, $attrs ) && ! is_bool( $attrs[ $toggle ] ) ) {
			$reported[] = self::row( $toggle, $attrs[ $toggle ], 'not a boolean; the Ken Burns attributes stay on the block and nothing is mapped', false );
			return;
		}
		if ( true !== ( $attrs[ $toggle ] ?? false ) ) {
			// Off: the duration, mode and zoom change nothing.
			array_push( $consumed, ...$held );
			return;
		}
		if ( '' !== $parallax && true === ( $attrs[ $parallax ] ?? false ) ) {
			array_push( $consumed, ...$held );
			$reported[] = self::row( $toggle, true, 'the parallax on the same element won and the Ken Burns never ran, so no layer is written', true );
			return;
		}
		$seconds = self::seconds( $attrs[ $duration ] ?? null, $atom );
		if ( null === $seconds ) {
			$reported[] = self::row( $duration, $attrs[ $duration ] ?? null, 'not a whole number of seconds from 1 to ' . self::LAYER_MAX_SECONDS . '; the Ken Burns attributes stay on the block', false );
			return;
		}
		$values = array(
			'mode'     => $mode,
			'duration' => $seconds * 1000,
		);
		if ( 'zoom-out-once' === $mode ) {
			$start = $attrs['bgZoomStart'] ?? self::DEFAULT_ZOOM_START;
			if ( ! self::is_number( $start ) || $start < 100 || $start > 200 ) {
				$reported[] = self::row( 'bgZoomStart', $start, 'outside the effect\'s 100 to 200 percent; the Ken Burns attributes stay on the block', false );
				return;
			}
			$values['zoomStart'] = self::whole( 0 + $start );
			$values['zoomEnd']   = 100;
			$values['easing']    = self::ONCE_EASING;
		} else {
			$values['zoomStart'] = $loop_zoom[0];
			$values['zoomEnd']   = $loop_zoom[1];
			$values['easing']    = 'ease-in-out';
			$reported[]          = self::row( $toggle, true, self::loop_note( $loop_zoom ), true );
		}
		array_push( $consumed, ...$held );
		$layers[ $part ][] = array(
			'id'     => 'ken-burns',
			'effect' => 'ken-burns',
			'values' => $values,
		);
	}

	/**
	 * One SVG animation word with its speed word.
	 *
	 * @param string                         $anim     Animation attribute.
	 * @param string                         $speed    Speed attribute.
	 * @param string                         $part     Destination part.
	 * @param array<string,mixed>            $attrs    Stored attributes.
	 * @param array<string,array<int,array>> $layers   Layers by part (appended to).
	 * @param string[]                       $consumed Consumed attributes (appended to).
	 * @param array<int,array<string,mixed>> $reported Reported rows (appended to).
	 */
	private function plan_svg( string $anim, string $speed, string $part, array $attrs, array &$layers, array &$consumed, array &$reported ): void {
		$held = array_values( array_filter( array( $anim, $speed ), static fn( string $key ): bool => array_key_exists( $key, $attrs ) ) );
		if ( array() === $held ) {
			return;
		}
		$word = $attrs[ $anim ] ?? 'none';
		if ( ! is_string( $word ) || ! in_array( $word, array( 'none', 'pulse', 'float', 'wave' ), true ) ) {
			$reported[] = self::row( $anim, $word, 'not none, pulse, float or wave; the SVG animation attributes stay on the block', false );
			return;
		}
		array_push( $consumed, ...$held );
		if ( 'none' === $word ) {
			return;
		}
		$speed_word = $attrs[ $speed ] ?? 'medium';
		$speed_word = is_string( $speed_word ) && isset( self::FLOAT_PERIOD_MS[ $speed_word ] ) ? $speed_word : 'medium';
		if ( 'float' === $word ) {
			$layers[ $part ][] = array(
				'id'     => 'ambient-float',
				'effect' => 'ambient-float',
				'values' => array(
					'travel'    => self::FLOAT_TRAVEL,
					'axis'      => 'y',
					'period'    => self::FLOAT_PERIOD_MS[ $speed_word ],
					'easing'    => 'ease-in-out',
					'direction' => 'alternate',
				),
			);
			return;
		}
		$layers[ $part ][] = array(
			'id'     => 'svg-loop',
			'effect' => 'svg-loop',
			'values' => array(
				'motion'    => $word,
				'duration'  => self::SVG_LOOP_MS[ $word ][ $speed_word ],
				'amplitude' => 1,
			),
		);
	}

	/**
	 * The reported note for a loop's simplified shape.
	 *
	 * @param int[] $zoom Start and end zoom percent.
	 * @return string
	 */
	private static function loop_note( array $zoom ): string {
		return self::CONTAINER_LOOP === $zoom
			? 'the retired loop scaled the background 110 to 120 percent with a drift of 2 percent left and down; mapped to a 110 to 120 alternating zoom with pan none (the effect has one pan direction)'
			: 'the retired loop scaled 1 to 1.06 to 1.04 to 1 with a small drift; mapped to a 100 to 106 alternating zoom with pan none';
	}

	/**
	 * A stored duration as whole seconds the layer can hold, or null when it cannot (the default when absent).
	 *
	 * @param mixed $value Stored value.
	 * @param bool  $atom  Whether the media atom's 5 to 60 clamp applies.
	 * @return int|null
	 */
	private static function seconds( $value, bool $atom ): ?int {
		if ( null === $value ) {
			return self::DEFAULT_SECONDS;
		}
		if ( ! self::is_number( $value ) ) {
			return null;
		}
		$whole = (int) round( (float) $value );
		if ( $atom ) {
			return max( self::ATOM_MIN_SECONDS, min( self::ATOM_MAX_SECONDS, $whole ) );
		}
		// The wrapper wrote `absint( value )` and fell back to the default for 0.
		$whole = abs( $whole );
		$whole = 0 === $whole ? self::DEFAULT_SECONDS : $whole;
		return $whole > self::LAYER_MAX_SECONDS ? null : $whole;
	}

	/**
	 * Whether a stored value is a finite number (or a numeric string).
	 *
	 * @param mixed $value Stored value.
	 * @return bool
	 */
	private static function is_number( $value ): bool {
		return ( is_int( $value ) || is_float( $value ) || ( is_string( $value ) && is_numeric( $value ) ) ) && is_finite( (float) $value );
	}

	/**
	 * A number as an integer when it is whole.
	 *
	 * @param float|int $number Number.
	 * @return float|int
	 */
	private static function whole( $number ) {
		$rounded = round( (float) $number, 4 );
		return floor( $rounded ) === $rounded ? (int) $rounded : $rounded;
	}

	/**
	 * One reported row.
	 *
	 * @param string $attr     Attribute.
	 * @param mixed  $value    Stored value.
	 * @param string $reason   Reason.
	 * @param bool   $consumed Whether it is removed.
	 * @return array{attr:string,value:mixed,reason:string,consumed:bool}
	 */
	private static function row( string $attr, $value, string $reason, bool $consumed ): array {
		return array(
			'attr'     => $attr,
			'value'    => $value,
			'reason'   => $reason,
			'consumed' => $consumed,
		);
	}
}
