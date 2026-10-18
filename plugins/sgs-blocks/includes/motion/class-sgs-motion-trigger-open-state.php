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
 *     Mobile read `devices.<tier>.close`. When the entrance insets one clip edge, `Sgs_Motion_Clip_Edge::close` writes
 *     the close clip amount on that edge's holder (`--sgs-me-close-to-clip-<t|r|b|l>`) in place of the uniform one.
 *   - `state`: one rule keyed to the named state on the host:
 *     `<target>:is([data-sgs-motion-state~="<name>"],[data-sgs-motion-state~="<name>"] *){--sgs-mt-on:1;animation-name:var(--sgs-mt-in,none);}`.
 *     A multi-keyframe entrance gets only the on flag, because the WAAPI module plays it, not a CSS animation, plus
 *     `<target>{--sgs-mt-kf:<name>}`, which tells that module (`assets/js/motion-keyframes.js`) the state it replays on.
 *     A CSS state entrance also gets (a) a rest rule keyed to `<name>-rest` (set by `restMotionState` at first paint) that
 *     gives the entrance a zero duration and delay (`--sgs-mt-rest` is never defined, so its fallback applies), so a
 *     state already true at load jumps to its held values with no visible animation, and
 *     (b) when the layer stores `close` values, the same `--sgs-me-close-*` properties as `open` plus an out rule keyed to
 *     `<name>-out` (set by `leaveMotionState` when the state is left) that plays the close keyframes on the close
 *     duration, easing and delay. Without close values leaving the state snaps back, as before.
 *     The colour to-values (`backgroundColour`, `textColour`, `borderColour`) are painted by the same rules: the state
 *     rule's declarations (and, for `open`, one rule keyed to an open host) read the scoped properties `--sgs-me-to-bg`,
 *     `-fg` and `-bd` the emitter wrote. The colours join the element's transition list (`transition_entries`) on the
 *     entrance's duration and easing, the close pair on leaving; reduced motion makes them instant.
 * - `init` (priority 20): a block that declares named states gets `@sgs/motion-state` as a dynamic dependency of its
 *   view script module, so the import map lists it and the block's `import()` of it resolves.
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

	/** The tokens `@sgs/motion-state` adds beside a named state: left (`-out`) and held at first paint (`-rest`). */
	const OUT_SUFFIX  = '-out';
	const REST_SUFFIX = '-rest';

	/** The colour to-values (`EntranceTo` key => the CSS property it paints) and the scoped property each is written to. */
	const PAINT = array(
		'backgroundColour' => array( 'background-color', '--sgs-me-to-bg' ),
		'textColour'       => array( 'color', '--sgs-me-to-fg' ),
		'borderColour'     => array( 'border-color', '--sgs-me-to-bd' ),
	);

	/** The longest state name that still fits the schema's 64-character pattern with a four-character suffix. */
	const STATE_SUFFIX_MAX = 59;

	/** The state helper's script module (`src/shared/effects/motion-state.js`). */
	const STATE_MODULE = '@sgs/motion-state';

	/**
	 * The module the triggers enqueue: it lists `@sgs/motion-state` in the import map (see the registry's MODULES).
	 */
	const STATE_LOADER = '@sgs/motion-state-loader';

	/** The custom property naming a multi-keyframe state entrance's state for the WAAPI module. */
	const KEYFRAMES_STATE_PROP = '--sgs-mt-kf';

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
			return $css . self::close_rules( $base, $selector ) . self::open_paint_rule( $base, $selector ) . self::paint_transition( $base, $selector, self::has_close( $base ) ? 'close' : '' );
		}
		if ( 'state' === $trigger ) {
			$keyframes = isset( $attrs['data-sgs-me-keyframes'] );
			$close     = ! $keyframes && self::has_close( $base ) ? self::close_rules( $base, $selector ) : '';
			$state = isset( $base['state'] ) && is_string( $base['state'] ) ? $base['state'] : '';
			$leave = ! $keyframes && '' !== $state && strlen( $state ) <= self::STATE_SUFFIX_MAX && self::has_close( $base ) ? $state . self::OUT_SUFFIX : '';
			return $css . $close . self::state_rule( $base, $selector, $keyframes ) . self::paint_transition( $base, $selector, $leave );
		}
		return $css;
	}

	/**
	 * The paint declarations of the colour to-values: each stored colour (`--sgs-me-to-bg|fg|bd`, written by the emitter on
	 * the target) read into its CSS property. Colours are stored once, for every device.
	 *
	 * @param array<string,mixed> $base The entrance base layer.
	 * @return array<string,string>
	 */
	private static function paint( array $base ): array {
		$to  = is_array( $base['values']['to'] ?? null ) ? $base['values']['to'] : array();
		$out = array();
		foreach ( self::PAINT as $key => $paint ) {
			if ( isset( $to[ $key ] ) && is_string( $to[ $key ] ) && '' !== $to[ $key ] ) {
				$out[ $paint[0] ] = 'var(' . $paint[1] . ')';
			}
		}
		return $out;
	}

	/**
	 * The colour entries of the element's `transition` list (`Sgs_Motion_Emitter::emit` adds them to the list it builds from
	 * the hover state and hover effects, so an element with both keeps its hover timing): each painted property on the
	 * entrance's duration and easing, or the leaving pair `--sgs-mt-paint-dur` and `-ease` where the leave rule sets them.
	 * Reduced motion forces every transition instant (`motion.css`), so the colour then changes at once.
	 *
	 * @param array<string,mixed> $base The entrance base layer.
	 * @return array<int,string>
	 */
	public static function transition_entries( array $base ): array {
		$list = array();
		foreach ( array_keys( self::paint( $base ) ) as $prop ) {
			$list[] = $prop . ' var(--sgs-mt-paint-dur,var(--sgs-me-dur,var(--wp--custom--duration--medium,300ms))) var(--sgs-mt-paint-ease,var(--sgs-me-ease,var(--wp--custom--easing--default,ease)))';
		}
		return $list;
	}

	/**
	 * The leave rule: on a host that is leaving (a token `close` for an open entrance, `<name>-out` for a state) the colour
	 * entries read the close duration and easing. It sets two custom properties only, so every other entry of the
	 * element's transition list keeps its own timing.
	 *
	 * @param array<string,mixed> $base     The entrance base layer.
	 * @param string              $selector Scoped selector.
	 * @param string              $leave    Host token that marks leaving, or '' for none.
	 * @return string
	 */
	private static function paint_transition( array $base, string $selector, string $leave ): string {
		if ( '' === $leave || array() === self::paint( $base ) ) {
			return '';
		}
		$host = '[' . self::STATE_ATTR . '~="' . $leave . '"]';
		return Sgs_Motion_Emitter::rules(
			$selector . ':is(' . $host . ',' . $host . ' *)',
			array(
				'desktop' => array(
					'--sgs-mt-paint-dur'  => 'var(--sgs-me-close-dur,var(--sgs-me-dur,var(--wp--custom--duration--medium,300ms)))',
					'--sgs-mt-paint-ease' => 'var(--sgs-me-close-ease,var(--sgs-me-ease,var(--wp--custom--easing--default,ease)))',
				),
				'tablet'  => array(),
				'mobile'  => array(),
			)
		);
	}

	/**
	 * The colour paint while a part's host is open: an open host, and no host that is not open shielding it.
	 *
	 * @param array<string,mixed> $base     The entrance base layer.
	 * @param string              $selector Scoped selector.
	 * @return string
	 */
	private static function open_paint_rule( array $base, string $selector ): string {
		$paint = self::paint( $base );
		if ( array() === $paint ) {
			return '';
		}
		$open   = '[' . self::STATE_ATTR . '~="open"]';
		$closed = '[' . self::STATE_ATTR . ']:not(' . $open . ')';
		return Sgs_Motion_Emitter::rules(
			$selector . ':is(' . $open . ',' . $open . ' *):not(' . $closed . ',' . $closed . ' *)',
			array(
				'desktop' => $paint,
				'tablet'  => array(),
				'mobile'  => array(),
			)
		);
	}

	/**
	 * Whether the layer stores any close value, on Desktop or a device tier.
	 *
	 * @param array<string,mixed> $base The entrance base layer.
	 * @return bool
	 */
	private static function has_close( array $base ): bool {
		foreach ( array( $base['close'] ?? null, $base['devices']['tablet']['close'] ?? null, $base['devices']['mobile']['close'] ?? null ) as $close ) {
			if ( is_array( $close ) && array() !== $close ) {
				return true;
			}
		}
		return false;
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
		Sgs_Motion_Clip_Edge::close( $base, $decls );
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
		$decls += self::paint( $base );
		$css = Sgs_Motion_Emitter::rules(
			$selector . ':is(' . $host . ',' . $host . ' *)',
			array(
				'desktop' => $decls,
				'tablet'  => array(),
				'mobile'  => array(),
			)
		);
		if ( $keyframes ) {
			$css .= Sgs_Motion_Emitter::rules(
				$selector,
				array(
					'desktop' => array( self::KEYFRAMES_STATE_PROP => $state ),
					'tablet'  => array(),
					'mobile'  => array(),
				)
			);
		}
		if ( $keyframes || strlen( $state ) > self::STATE_SUFFIX_MAX ) {
			return $css;
		}
		if ( self::has_close( $base ) ) {
			$out_host = '[' . self::STATE_ATTR . '~="' . $state . self::OUT_SUFFIX . '"]';
			$css     .= Sgs_Motion_Emitter::rules(
				$selector . ':is(' . $out_host . ',' . $out_host . ' *)',
				array(
					'desktop' => array(
						'--sgs-me-a-dur'   => 'var(--sgs-me-close-dur,var(--sgs-me-dur,var(--wp--custom--duration--slow,450ms)))',
						'--sgs-me-a-ease'  => 'var(--sgs-me-close-ease,var(--sgs-me-ease,var(--wp--custom--entrance--easing,ease-out)))',
						'--sgs-me-a-delay' => 'var(--sgs-me-close-delay,0ms)',
						'animation-name'   => 'var(--sgs-mt-out,none)',
					),
					'tablet'  => array(),
					'mobile'  => array(),
				)
			);
		}
		$rest_host = '[' . self::STATE_ATTR . '~="' . $state . self::REST_SUFFIX . '"]';
		return $css . Sgs_Motion_Emitter::rules(
			$selector . ':is(' . $rest_host . ',' . $rest_host . ' *)',
			array(
				'desktop' => array(
					'--sgs-me-a-dur'   => 'var(--sgs-mt-rest,0ms)',
					'--sgs-me-a-delay' => 'var(--sgs-mt-rest,0ms)',
				),
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
	 * Enqueue the stylesheet and the `@sgs/motion-state` module on a front-end render (the renderer runs before
	 * `wp_head` in a block theme).
	 *
	 * @return void
	 */
	private static function enqueue(): void {
		if ( sgs_is_frontend_render() ) {
			wp_enqueue_style( self::STYLE );
			// The owning block's view script loads the state helper with a native `import()`, which resolves only through
			// the import map; enqueuing it here lists it there on exactly the pages that print an `open` or `state` entrance.
			wp_enqueue_script_module( self::STATE_LOADER );
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
