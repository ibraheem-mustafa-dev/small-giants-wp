<?php
/**
 * The old `sgs/nav-drawer` `curtain` entrance read as model layers (Spec 38A §10, §13.1; FR-38A-51), for
 * `class-sgs-motion-legacy-nav-drawer.php`.
 *
 * The old curtain was a colour layer on the dialog's `::before` that grew from the left edge, covered the panel at half
 * time and left by the right edge (`nav-drawer/style.css`, `sgs-nav-drawer-curtain-sweep-in`), while the drawer body
 * stayed hidden for the first half of the opening time and faded in over the second half (`ease`); on close the layer
 * played the sweep backwards and the body faded out over the first half of the closing time. On the model that is:
 *
 * - an `entrance.text` layer on the root, effect `curtain`, trigger `open`, direction `right`, the opening time and the
 *   opening easing, with the colour as a palette slug or hex;
 * - an `open` entrance on the `body` part: opacity 0 to 1 over half the curtain time, delayed by that half, `ease`,
 *   closing by fading out over half the time the curtain's close takes.
 *
 * The curtain layer is CSS only and has one time, one colour and no per-device switch (`off` is read by the script
 * runtimes only), so a drawer maps only when the curtain plays at every tier, its colour is a palette slug or hex, and
 * no gradient is set (a gradient wins over the colour in the old renderer, and the layer paints a flat colour).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Legacy_Nav_Drawer_Curtain
 */
final class Sgs_Motion_Legacy_Nav_Drawer_Curtain {

	/** The layer id written on the root. */
	const LAYER_ID = 'curtain';

	/**
	 * Why a drawer's curtain cannot be mapped, or null when it can.
	 *
	 * @param array<string,mixed> $attrs   Stored drawer attributes.
	 * @param string[]            $tiers   The tiers that play the curtain.
	 * @return string|null
	 */
	public static function refusal( array $attrs, array $tiers ): ?string {
		if ( count( $tiers ) < count( Sgs_Motion_Legacy_Nav_Drawer::TIERS ) ) {
			return 'the curtain plays at ' . implode( ', ', $tiers ) . ' only, and the curtain layer is CSS only with no per-device switch, so it would play at every tier';
		}
		if ( self::gradient( $attrs ) ) {
			return 'curtainColourGradient is a gradient (it wins over curtainColour) and the curtain layer paints a flat palette or hex colour';
		}
		if ( null === self::colour( $attrs ) ) {
			return 'curtainColour ' . wp_json_encode( $attrs['curtainColour'] ?? null ) . ' is not a palette slug or a hex colour (a CSS colour name or an unrecognised notation) and the curtain layer takes only those';
		}
		return null;
	}

	/**
	 * Whether a valid gradient is stored (the old renderer used it in place of the colour).
	 *
	 * @param array<string,mixed> $attrs Stored drawer attributes.
	 * @return bool
	 */
	public static function gradient( array $attrs ): bool {
		$raw = $attrs['curtainColourGradient'] ?? '';
		if ( ! is_string( $raw ) || '' === trim( $raw ) ) {
			return false;
		}
		return function_exists( 'sgs_css_gradient_value' ) ? '' !== sgs_css_gradient_value( $raw ) : true;
	}

	/**
	 * The curtain colour as a schema colour reference: '' for none stored (the layer then defaults to the text colour,
	 * as the old layer did), a slug or hex otherwise, null when it has no exact reference.
	 *
	 * @param array<string,mixed> $attrs Stored drawer attributes.
	 * @return string|null
	 */
	public static function colour( array $attrs ): ?string {
		$raw = $attrs['curtainColour'] ?? '';
		if ( ! is_string( $raw ) ) {
			return null;
		}
		$raw = trim( $raw );
		if ( '' === $raw ) {
			return '';
		}
		if ( function_exists( 'sgs_is_css_colour' ) && sgs_is_css_colour( $raw ) && ! preg_match( '/^#/', $raw ) ) {
			// A functional notation the old renderer normalised to hex; a named colour keyword stays a keyword.
			$raw = function_exists( 'sgs_functional_colour_to_hex' ) ? sgs_functional_colour_to_hex( $raw ) : $raw;
		}
		if ( preg_match( '/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/', $raw ) ) {
			return $raw;
		}
		$keyword = function_exists( 'sgs_is_css_colour' ) && sgs_is_css_colour( $raw );
		if ( ! $keyword && preg_match( '/^[a-z0-9][a-z0-9-]*$/', strtolower( $raw ) ) ) {
			return strtolower( $raw );
		}
		return null;
	}

	/**
	 * The curtain's two layers.
	 *
	 * @param array<string,mixed> $attrs  Stored drawer attributes.
	 * @param int                 $enter  Opening time (ms).
	 * @param int                 $exit   Closing time (ms).
	 * @param string              $easing The opening easing as a schema easing.
	 * @return array{text:array<string,mixed>,body:array<string,mixed>,reported:array<int,array<string,mixed>>}
	 */
	public static function layers( array $attrs, int $enter, int $exit, string $easing ): array {
		$values = array( 'direction' => 'right' );
		$colour = (string) self::colour( $attrs );
		if ( '' !== $colour ) {
			$values['colour'] = $colour;
		}
		$values['duration'] = $enter;
		$values['easing']   = $easing;
		$half               = (int) round( $enter / 2 );
		$reported           = array();
		if ( $exit !== $enter ) {
			$reported[] = Sgs_Motion_Legacy_Nav_Drawer::row( 'exitDuration', $exit, 'changed: the curtain layer has one time, so it closes over the opening ' . $enter . 'ms (it was ' . $exit . 'ms) and the content fades out over half of that', true );
		}
		return array(
			'text'     => array(
				'id'      => self::LAYER_ID,
				'effect'  => 'curtain',
				'trigger' => 'open',
				'values'  => $values,
			),
			'body'     => array(
				'trigger' => 'open',
				'values'  => array(
					'from'     => array( 'opacity' => 0 ),
					'to'       => array( 'opacity' => 1 ),
					'duration' => $half,
					'delay'    => $half,
					'easing'   => 'ease',
				),
				'close'   => array(
					'closeDuration' => $half,
					'closeEasing'   => 'ease',
				),
			),
			'reported' => $reported,
		);
	}
}
