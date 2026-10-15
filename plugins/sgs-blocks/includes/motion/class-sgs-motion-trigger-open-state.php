<?php
/**
 * The `open` and `state` entrance triggers (Spec 38A §5.2, §8, §9, §12; FR-38A-51 and FR-38A-53 enablers).
 *
 * Hooks the emitter's two extension points:
 * - `sgs_motion_entrance_trigger`: a `state` entrance must name a state its block declares in
 *   `supports.sgs.motion.states` (a list of state names); any other is refused (the entrance is dropped and
 *   `sgs_motion_layer_dropped` fires with the refusal `state-not-declared`). An accepted `open` or `state` entrance
 *   marks the page as needing `assets/css/motion-triggers.css` and enqueues it on a front-end render.
 * - `sgs_motion_entrance_css`: appends the trigger's own scoped rules through the emitter's per-device writer.
 *   - `open`: the close values `--sgs-me-close-to-<suffix>` (the suffix of the field's `--sgs-me-*` owner property),
 *     `--sgs-me-close-dur`, `--sgs-me-close-delay` (per device, so each item keeps its own stored close delay) and
 *     `--sgs-me-close-ease` (desktop only, as the schema stores it). Desktop reads the layer's `close`, Tablet and
 *     Mobile read `devices.<tier>.close`.
 *   - `state`: one rule keyed to the named state on the host:
 *     `<target>:is([data-sgs-motion-state~="<name>"],[data-sgs-motion-state~="<name>"] *){--sgs-mt-on:1;animation-name:var(--sgs-mt-in,none);}`.
 *     A multi-keyframe entrance gets only the on flag, because the WAAPI module plays it, not a CSS animation.
 *
 * The open values, timing and per-item `delay` are the entrance's own and are written by the emitter as for any
 * entrance. The owning block's script sets the state through `@sgs/motion-state`; the generic rules live in the
 * stylesheet. Nothing here writes markup.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

use function SGS\Blocks\sgs_is_frontend_render;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Trigger_Open_State
 */
final class Sgs_Motion_Trigger_Open_State {

	const STYLE    = 'sgs-motion-triggers';
	const CSS_PATH = 'assets/css/motion-triggers.css';

	/** The state attribute a block's script sets (through `@sgs/motion-state`). */
	const STATE_ATTR = 'data-sgs-motion-state';

	/** The schema's `stateName` pattern. */
	const STATE_PATTERN = '/^[a-z][a-z0-9-]{0,63}$/';

	const CLOSE_PREFIX = '--sgs-me-close-';

	/**
	 * Whether an `open` or `state` entrance was emitted this request.
	 *
	 * @var bool
	 */
	private static $used = false;

	/**
	 * Hook the extension points and the stylesheet.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_filter( 'sgs_motion_entrance_trigger', array( self::class, 'trigger' ), 10, 3 );
		add_filter( 'sgs_motion_entrance_css', array( self::class, 'css' ), 10, 4 );
		add_action( 'init', array( self::class, 'register_style' ) );
		add_action( 'enqueue_block_assets', array( self::class, 'enqueue_editor_style' ) );
	}

	/**
	 * Clear the request state (tests and a second render pass).
	 *
	 * @return void
	 */
	public static function reset(): void {
		self::$used = false;
	}

	/**
	 * Whether this request emitted an `open` or `state` entrance.
	 *
	 * @return bool
	 */
	public static function used(): bool {
		return self::$used;
	}

	/**
	 * The states a block declares in `supports.sgs.motion.states`.
	 *
	 * @param string $block_name Block name.
	 * @return array<int,string>
	 */
	public static function declared_states( string $block_name ): array {
		if ( '' === $block_name || ! class_exists( '\WP_Block_Type_Registry' ) ) {
			return array();
		}
		$type   = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
		$motion = is_object( $type ) && isset( $type->supports['sgs']['motion'] ) ? $type->supports['sgs']['motion'] : null;
		$states = is_array( $motion ) && isset( $motion['states'] ) && is_array( $motion['states'] ) ? $motion['states'] : array();
		$out    = array();
		foreach ( $states as $state ) {
			if ( is_string( $state ) && 1 === preg_match( self::STATE_PATTERN, $state ) ) {
				$out[] = $state;
			}
		}
		return array_values( array_unique( $out ) );
	}

	/**
	 * Refuse an undeclared state and note the stylesheet (filter `sgs_motion_entrance_trigger`).
	 *
	 * @param mixed $trigger The entrance trigger.
	 * @param mixed $base    The entrance base layer.
	 * @param mixed $context Render context (`block`, `target`).
	 * @return mixed The trigger, or '' to drop the entrance.
	 */
	public static function trigger( $trigger, $base = array(), $context = array() ) {
		if ( 'open' !== $trigger && 'state' !== $trigger ) {
			return $trigger;
		}
		$base    = is_array( $base ) ? $base : array();
		$context = is_array( $context ) ? $context : array();
		if ( 'state' === $trigger ) {
			$block = (string) ( $context['block'] ?? '' );
			$state = isset( $base['state'] ) && is_string( $base['state'] ) ? $base['state'] : '';
			if ( '' === $state || ! in_array( $state, self::declared_states( $block ), true ) ) {
				do_action(
					'sgs_motion_layer_dropped',
					$block,
					(string) ( $context['target'] ?? '' ),
					array(
						'id'    => 'state-not-declared',
						'layer' => 'entrance.base',
						'state' => $state,
					)
				);
				return '';
			}
		}
		self::$used = true;
		self::enqueue();
		return $trigger;
	}

	/**
	 * The trigger's own scoped rules (filter `sgs_motion_entrance_css`).
	 *
	 * @param mixed $css      CSS so far.
	 * @param mixed $base     The entrance base layer.
	 * @param mixed $selector The target's scoped selector.
	 * @param mixed $attrs    The target's data attributes.
	 * @return mixed
	 */
	public static function css( $css, $base = array(), $selector = '', $attrs = array() ) {
		if ( ! is_string( $css ) || ! is_array( $base ) || ! is_string( $selector ) || '' === $selector || ! is_array( $attrs ) ) {
			return $css;
		}
		$tokens  = preg_split( '/\s+/', trim( (string) ( $attrs['data-sgs-me'] ?? '' ) ) );
		$trigger = is_array( $tokens ) ? (string) ( $tokens[0] ?? '' ) : '';
		if ( 'open' === $trigger ) {
			return $css . self::close_rules( $base, $selector );
		}
		if ( 'state' === $trigger ) {
			return $css . self::state_rule( $base, $selector, isset( $attrs['data-sgs-me-keyframes'] ) );
		}
		return $css;
	}

	/**
	 * The close values per device.
	 *
	 * @param array<string,mixed> $base     The entrance base layer.
	 * @param string              $selector Scoped selector.
	 * @return string
	 */
	private static function close_rules( array $base, string $selector ): string {
		$tiers  = array(
			'desktop' => is_array( $base['close'] ?? null ) ? $base['close'] : array(),
			'tablet'  => is_array( $base['devices']['tablet']['close'] ?? null ) ? $base['devices']['tablet']['close'] : array(),
			'mobile'  => is_array( $base['devices']['mobile']['close'] ?? null ) ? $base['devices']['mobile']['close'] : array(),
		);
		$timing = array(
			'closeDuration' => 'dur',
			'closeDelay'    => 'delay',
			'closeEasing'   => 'ease',
		);
		$fields = Sgs_Motion_Emitter::fields( 'EntranceCloseTo' );
		$decls  = array_fill_keys( Sgs_Motion_Emitter::TIERS, array() );
		foreach ( $tiers as $tier => $close ) {
			foreach ( is_array( $close['to'] ?? null ) ? $close['to'] : array() as $key => $value ) {
				$prop = $fields[ $key ]['css'] ?? null;
				$out  = Sgs_Motion_Emitter::value_css( 'EntranceCloseTo', (string) $key, $value );
				if ( null === $prop || null === $out || 0 !== strpos( $prop, Sgs_Motion_Emitter::ME_PREFIX ) ) {
					continue;
				}
				$decls[ $tier ][ self::CLOSE_PREFIX . 'to-' . substr( $prop, strlen( Sgs_Motion_Emitter::ME_PREFIX ) ) ] = $out;
			}
			foreach ( $timing as $key => $suffix ) {
				if ( 'closeEasing' === $key && 'desktop' !== $tier ) {
					continue;
				}
				$out = array_key_exists( $key, $close ) ? Sgs_Motion_Emitter::value_css( 'EntranceClose', $key, $close[ $key ] ) : null;
				if ( null !== $out ) {
					$decls[ $tier ][ self::CLOSE_PREFIX . $suffix ] = $out;
				}
			}
		}
		return Sgs_Motion_Emitter::rules( $selector, $decls );
	}

	/**
	 * The rule keyed to the named state on the host (the target itself or an ancestor).
	 *
	 * @param array<string,mixed> $base      The entrance base layer.
	 * @param string              $selector  Scoped selector.
	 * @param bool                $keyframes Whether the WAAPI module plays this entrance.
	 * @return string
	 */
	private static function state_rule( array $base, string $selector, bool $keyframes ): string {
		$state = isset( $base['state'] ) && is_string( $base['state'] ) ? $base['state'] : '';
		if ( 1 !== preg_match( self::STATE_PATTERN, $state ) ) {
			return '';
		}
		$host  = '[' . self::STATE_ATTR . '~="' . $state . '"]';
		$decls = array( '--sgs-mt-on' => '1' );
		if ( ! $keyframes ) {
			$decls['animation-name'] = 'var(--sgs-mt-in,none)';
		}
		return Sgs_Motion_Emitter::rules(
			$selector . ':is(' . $host . ',' . $host . ' *)',
			array(
				'desktop' => $decls,
				'tablet'  => array(),
				'mobile'  => array(),
			)
		);
	}

	/**
	 * Register the stylesheet (after `motion.css`, whose keyframes and registered properties it reads).
	 *
	 * @return void
	 */
	public static function register_style(): void {
		$file = SGS_BLOCKS_PATH . self::CSS_PATH;
		if ( ! file_exists( $file ) ) {
			return;
		}
		$time = filemtime( $file );
		wp_register_style( self::STYLE, SGS_BLOCKS_URL . self::CSS_PATH, array( Sgs_Motion_Assets::STYLE ), false === $time ? SGS_BLOCKS_VERSION : (string) $time );
	}

	/**
	 * Enqueue the stylesheet on a front-end render (the renderer runs before `wp_head` in a block theme).
	 *
	 * @return void
	 */
	private static function enqueue(): void {
		if ( sgs_is_frontend_render() ) {
			wp_enqueue_style( self::STYLE );
		}
	}

	/**
	 * Load the stylesheet in the editor iframe only, as `motion.css` is.
	 *
	 * @return void
	 */
	public static function enqueue_editor_style(): void {
		if ( is_admin() ) {
			wp_enqueue_style( self::STYLE );
		}
	}
}

Sgs_Motion_Trigger_Open_State::register();
