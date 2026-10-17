<?php
/**
 * The form Focus state's emission (Spec 38A §5.1; build plan M3.4, "one timing per state change").
 *
 * A `hover.focus` layer lives on the `sgs/form` root only. Its rules style that form's own field controls (the shared
 * `.sgs-form-field__input` class every field block prints, scoped under the form's motion scope, so a saved
 * `sgs_form` post rendered through a linking `sgs/form` block is covered by the definition block's own scope):
 *
 * - `<scope> .sgs-form-field__input` carries one `transition` list (`border-color`, `background-color`) on the
 *   state's one duration, easing and delay. Desktop is the base rule; a Tablet or Mobile tier that sets its own timing
 *   repeats the whole list inside its media query.
 * - `<scope> .sgs-form-field__input:focus-visible:not(:is([aria-invalid="true"],:user-invalid))` sets the border
 *   colour and the background colour. An invalid field keeps the form stylesheet's validation border while focused,
 *   so the rule skips it.
 * - Reduced motion: the field's transition becomes an instant state flip, as `assets/css/motion.css` does for every
 *   motion target.
 *
 * Neither `outline` nor `box-shadow` is written: the focus system (`theme/sgs-theme/assets/css/focus.css`) stays the
 * accessible indicator and owns both on a focused field. A layer with no look value (border or background colour)
 * emits nothing. A `hover.focus` layer anywhere else than the `sgs/form` root is refused: nothing is emitted and
 * `sgs_motion_layer_dropped` fires with the refusal `focus-not-form`.
 *
 * The editor twin is `src/blocks/extensions/motion/canvas/emit-focus.js`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Focus_State
 */
final class Sgs_Motion_Focus_State {

	/** The one block that owns the Focus state. */
	const BLOCK = 'sgs/form';

	/** The element key the state lives on. */
	const TARGET = 'root';

	/** The values def of the layer. */
	const DEF = 'FocusStateValues';

	/** The field control class every form field block prints (`form-field-*` render.php). */
	const FIELD_SELECTOR = '.sgs-form-field__input';

	/** The focus condition: keyboard-visible focus on a field the visitor has not made invalid. */
	const FOCUS_SUFFIX = ':focus-visible:not(:is([aria-invalid="true"],:user-invalid))';

	/** The properties the one timing animates, in order. */
	const PAINT = array( 'border-color', 'background-color' );

	/** The reduced-motion flip, as `assets/css/motion.css` writes it. */
	const REDUCED = '@media (prefers-reduced-motion: reduce)';

	/**
	 * Whether a block's element may hold the Focus state.
	 *
	 * @param string $block  Block name.
	 * @param string $target Element key.
	 * @return bool
	 */
	public static function allowed( string $block, string $target ): bool {
		return self::BLOCK === $block && self::TARGET === $target;
	}

	/**
	 * The Focus state's CSS, or '' when it is refused or sets no look value.
	 *
	 * @param array<string,mixed> $layer    The `hover.focus` layer.
	 * @param string              $selector The target's scoped selector.
	 * @param array<string,mixed> $context  Render context (`block`, `target`).
	 * @return string
	 */
	public static function css( array $layer, string $selector, array $context ): string {
		$block  = (string) ( $context['block'] ?? '' );
		$target = (string) ( $context['target'] ?? '' );
		if ( ! self::allowed( $block, $target ) ) {
			do_action(
				'sgs_motion_layer_dropped',
				$block,
				$target,
				array(
					'id'    => 'focus-not-form',
					'layer' => 'hover.focus',
				)
			);
			return '';
		}
		$fields = Sgs_Motion_Emitter::fields( self::DEF );
		$tiers  = array(
			'desktop' => is_array( $layer['values'] ?? null ) ? $layer['values'] : array(),
			'tablet'  => is_array( $layer['devices']['tablet'] ?? null ) ? $layer['devices']['tablet'] : array(),
			'mobile'  => is_array( $layer['devices']['mobile'] ?? null ) ? $layer['devices']['mobile'] : array(),
		);
		$timing = array(
			'transition-duration'        => Sgs_Motion_Field_Types::resolve_token( 'token:duration.fast' ) ?? '200ms',
			'transition-delay'           => '0ms',
			'transition-timing-function' => Sgs_Motion_Field_Types::resolve_token( 'token:easing.ease-out' ) ?? 'ease-out',
		);
		$base   = array_fill_keys( Sgs_Motion_Emitter::TIERS, array() );
		$focus  = array_fill_keys( Sgs_Motion_Emitter::TIERS, array() );
		$look   = false;
		foreach ( Sgs_Motion_Emitter::TIERS as $tier ) {
			$timing_changed = 'desktop' === $tier;
			foreach ( $tiers[ $tier ] as $key => $value ) {
				$key = (string) $key;
				$css = Sgs_Motion_Emitter::value_css( self::DEF, $key, $value );
				if ( null === $css || ! isset( $fields[ $key ] ) ) {
					continue;
				}
				$prop = $fields[ $key ]['css'];
				if ( null !== $prop && isset( $timing[ $prop ] ) ) {
					$timing[ $prop ] = $css;
					$timing_changed  = true;
				} elseif ( null !== $prop ) {
					$focus[ $tier ][ $prop ] = $css;
					$look                    = true;
				}
			}
			if ( $timing_changed ) {
				$entries = array();
				foreach ( self::PAINT as $prop ) {
					$entries[] = $prop . ' ' . $timing['transition-duration'] . ' ' . $timing['transition-timing-function'] . ' ' . $timing['transition-delay'];
				}
				$base[ $tier ]['transition'] = implode( ', ', $entries );
			}
		}
		if ( ! $look ) {
			return '';
		}
		$field = $selector . ' ' . self::FIELD_SELECTOR;
		$css   = Sgs_Motion_Emitter::rules( $field, $base );
		$css  .= Sgs_Motion_Emitter::rules( $field . self::FOCUS_SUFFIX, $focus );
		$css  .= self::REDUCED . '{' . $field . '{transition-duration:var(--wp--custom--duration--instant, 0ms);transition-delay:initial;}}';
		return $css;
	}
}
