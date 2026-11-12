<?php
/**
 * `focal-point` atom — PHP value-setter twin of
 * `src/components/media/atoms/focal-point.js`.
 *
 * Element scope: `object-position` (the `ObjectPosition` base). Backdrop
 * scope: `background-position` / `background-repeat` / `background-
 * attachment` (the `Position` / `Repeat` / `Attachment` bases).
 *
 * Converts the `{x,y}` -> "X% Y%" maths itself
 * (`sgs_media_atom_focal_point_xy_to_css()`) and additionally accepts the already-CSS-string
 * shape `sgs/hero`'s `splitMediaObjectPosition` stores, sanitised with the
 * same charset `hero/render.php`'s own `$sgs_css_object_position` closure
 * uses (`preg_replace('/[^A-Za-z0-9%.\-\s]/', '', ...)`).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_focal_point_xy_to_css' ) ) {
	/**
	 * A focal point {x,y} (floats 0-1) as a CSS "X% Y%" position. Clamped 0-1, rounded to 2 places. Returns '' when
	 * unset or at the CSS default (centre), so the element's own default wins.
	 *
	 * @param mixed $focal_point Raw attribute value, expected {x,y}.
	 * @return string "X% Y%" or ''.
	 */
	function sgs_media_atom_focal_point_xy_to_css( $focal_point ) {
		if ( ! is_array( $focal_point ) || ! isset( $focal_point['x'], $focal_point['y'] ) ) {
			return '';
		}
		$x = max( 0.0, min( 1.0, (float) $focal_point['x'] ) );
		$y = max( 0.0, min( 1.0, (float) $focal_point['y'] ) );
		if ( 0.5 === $x && 0.5 === $y ) {
			return '';
		}
		return round( $x * 100, 2 ) . '% ' . round( $y * 100, 2 ) . '%';
	}
}

if ( ! function_exists( 'sgs_media_atom_focal_point_sanitise_string' ) ) {
	/**
	 * Sanitise an already-CSS-shaped position string — same charset
	 * `hero/render.php`'s `$sgs_css_object_position` closure uses.
	 *
	 * @param mixed $value Raw candidate.
	 * @return string Sanitised string, or '' when not a string.
	 */
	function sgs_media_atom_focal_point_sanitise_string( $value ) {
		if ( ! is_string( $value ) ) {
			return '';
		}
		return trim( preg_replace( '/[^A-Za-z0-9%.\-\s]/', '', $value ) );
	}
}

if ( ! function_exists( 'sgs_media_atom_focal_point_resolve_position' ) ) {
	/**
	 * Resolve a position value in EITHER stored shape to a CSS
	 * `object-position`/`background-position` string. An `{x,y}` array
	 * converts through `sgs_media_atom_focal_point_xy_to_css()`;
	 * a string is sanitised and passed through unchanged.
	 *
	 * @param mixed $raw Raw attribute value.
	 * @return string "X% Y%" (or a keyword string), or '' when unset/default.
	 */
	function sgs_media_atom_focal_point_resolve_position( $raw ) {
		if ( is_array( $raw ) && isset( $raw['x'], $raw['y'] ) ) {
			return sgs_media_atom_focal_point_xy_to_css( $raw );
		}
		return sgs_media_atom_focal_point_sanitise_string( $raw );
	}
}

if ( ! function_exists( 'sgs_media_atom_focal_point_validate' ) ) {
	/**
	 * Reject an out-of-vocabulary value to '' (inherit).
	 *
	 * @param mixed  $value Raw candidate.
	 * @param string $base  'ObjectPosition' | 'Position' | 'Repeat' | 'Attachment'.
	 * @return string A validated value, or ''.
	 */
	function sgs_media_atom_focal_point_validate( $value, $base = 'ObjectPosition' ) {
		if ( 'Repeat' === $base ) {
			$allowed = array( 'repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'space', 'round' );
			return is_string( $value ) && in_array( $value, $allowed, true ) ? $value : '';
		}
		if ( 'Attachment' === $base ) {
			$allowed = array( 'scroll', 'fixed', 'local' );
			return is_string( $value ) && in_array( $value, $allowed, true ) ? $value : '';
		}
		// ObjectPosition + Position share the same free-form position grammar.
		return sgs_media_atom_focal_point_resolve_position( $value );
	}
}

if ( ! function_exists( 'sgs_media_atom_focal_point_requires' ) ) {
	/**
	 * A focal point only means anything once the media is actually being
	 * cropped. Reads the ELEMENT scope's `ObjectFit` value against the exact
	 * condition declared in registry.js's `requires.ObjectPosition`. Backdrop
	 * position/repeat/attachment are NOT gated the same way — a background
	 * image's position is meaningful even at `background-size:auto`.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for `STORED_AS` resolution.
	 * @param string $scope      'element' | 'backdrop'.
	 * @return array { state: string, hiddenReason: string|null }.
	 */
	function sgs_media_atom_focal_point_requires( array $attributes, $prefix = '', $block_slug = '', $scope = 'element' ) {
		if ( 'element' !== $scope ) {
			return array(
				'state'        => 'shown',
				'hiddenReason' => null,
			);
		}

		$allowed = array( 'cover', 'contain', 'none', 'scale-down' );
		$fit_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectFit' );
		$fit_val = $attributes[ $fit_key ] ?? null;

		if ( in_array( $fit_val, $allowed, true ) ) {
			return array(
				'state'        => 'shown',
				'hiddenReason' => null,
			);
		}

		return array(
			'state'        => 'disabled',
			'hiddenReason' => __(
				'A focal point only matters when Object fit crops the media (Cover, Contain, None or Scale down).',
				'sgs-blocks'
			),
		);
	}
}

require_once dirname( __DIR__ ) . '/media-values.php';

if ( ! function_exists( 'sgs_media_atom_focal_point_emit' ) ) {
	/**
	 * C3 emitter: `object-position` on the media element once per device that sets its own Focal `{x,y}` (0 to 1).
	 * An unset point prints nothing.
	 *
	 * @param array  $slot   Slot `{prefix, kinds, context, wrapper}`.
	 * @param array  $attrs  Attributes.
	 * @param string $uid    Scope class, without the dot.
	 * @param bool   $helper Whether the helper is printed.
	 * @return string CSS, '' when nothing is set.
	 */
	function sgs_media_atom_focal_point_emit( array $slot, array $attrs, string $uid, bool $helper ): string {
		$media = sgs_media_nodes( $slot, $uid, $helper )['media'];
		$rules = array();
		sgs_media_emit_plain(
			$rules,
			$attrs,
			$slot,
			'Focal',
			$media,
			'object-position',
			static function ( $point ): string {
				if ( ! is_array( $point ) || ! is_numeric( $point['x'] ?? null ) || ! is_numeric( $point['y'] ?? null ) ) {
					return '';
				}
				$x = max( 0.0, min( 1.0, (float) $point['x'] ) ) * 100;
				$y = max( 0.0, min( 1.0, (float) $point['y'] ) ) * 100;
				return sgs_media_num( $x ) . '% ' . sgs_media_num( $y ) . '%';
			}
		);
		return sgs_media_rules_css( $rules );
	}
}
