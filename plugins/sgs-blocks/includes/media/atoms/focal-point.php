<?php
/**
 * `focal-point` atom — PHP value-setter twin of
 * `src/components/media/atoms/focal-point.js`.
 *
 * Element scope: `object-position` (the `ObjectPosition` base). Backdrop
 * scope: `background-position` / `background-repeat` / `background-
 * attachment` (the `Position` / `Repeat` / `Attachment` bases).
 *
 * Builds on the SHARED emitter in `helpers-media-position.php`
 * (`sgs_media_position_focal_to_css()`) for the `{x,y}` -> "X% Y%" maths —
 * does not re-derive it — and additionally accepts the already-CSS-string
 * shape `sgs/hero`'s `splitMediaObjectPosition` stores, sanitised with the
 * same charset `hero/render.php`'s own `$sgs_css_object_position` closure
 * uses (`preg_replace('/[^A-Za-z0-9%.\-\s]/', '', ...)`).
 *
 * `sgs_media_atom_focal_point_css()` must emit BYTE-IDENTICAL declarations to
 * the JS twin's `css()` for the same attribute set — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';
require_once dirname( __DIR__, 2 ) . '/helpers-media-position.php';

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
	 * converts via the SHARED emitter (`sgs_media_position_focal_to_css()`);
	 * a string is sanitised and passed through unchanged.
	 *
	 * @param mixed $raw Raw attribute value.
	 * @return string "X% Y%" (or a keyword string), or '' when unset/default.
	 */
	function sgs_media_atom_focal_point_resolve_position( $raw ) {
		if ( is_array( $raw ) && isset( $raw['x'], $raw['y'] ) ) {
			return sgs_media_position_focal_to_css( $raw );
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

if ( ! function_exists( 'sgs_media_atom_focal_point_css' ) ) {
	/**
	 * Custom-property declarations for this atom. Mirrors the JS twin's
	 * `css()` exactly.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for `STORED_AS` resolution.
	 * @return string[] `--custom-property:value;` declarations, never bare rules.
	 */
	function sgs_media_atom_focal_point_css( array $attributes, $prefix, $block_slug ) {
		$decls = array();

		// Element scope, tiered (MEDIA_TIERED_BASES carries `ObjectPosition`).
		$pos_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectPosition' );
		$pos     = sgs_media_atom_focal_point_validate( $attributes[ $pos_key ] ?? null, 'ObjectPosition' );
		if ( '' !== $pos ) {
			$decls[] = '--sgs-media-object-position:' . $pos;
		}
		$pos_tablet_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectPositionTablet' );
		$pos_tablet     = sgs_media_atom_focal_point_validate( $attributes[ $pos_tablet_key ] ?? null, 'ObjectPosition' );
		if ( '' !== $pos_tablet ) {
			$decls[] = '--sgs-media-object-position-tablet:' . $pos_tablet;
		}
		$pos_mobile_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectPositionMobile' );
		$pos_mobile     = sgs_media_atom_focal_point_validate( $attributes[ $pos_mobile_key ] ?? null, 'ObjectPosition' );
		if ( '' !== $pos_mobile ) {
			$decls[] = '--sgs-media-object-position-mobile:' . $pos_mobile;
		}

		// Backdrop scope. None of these three bases are in MEDIA_TIERED_BASES.
		$bg_pos_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'Position' );
		$bg_pos     = sgs_media_atom_focal_point_validate( $attributes[ $bg_pos_key ] ?? null, 'Position' );
		if ( '' !== $bg_pos ) {
			$decls[] = '--sgs-media-background-position:' . $bg_pos;
		}
		$bg_repeat_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'Repeat' );
		$bg_repeat     = sgs_media_atom_focal_point_validate( $attributes[ $bg_repeat_key ] ?? null, 'Repeat' );
		if ( '' !== $bg_repeat ) {
			$decls[] = '--sgs-media-background-repeat:' . $bg_repeat;
		}
		$bg_attachment_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'Attachment' );
		$bg_attachment     = sgs_media_atom_focal_point_validate( $attributes[ $bg_attachment_key ] ?? null, 'Attachment' );
		if ( '' !== $bg_attachment ) {
			$decls[] = '--sgs-media-background-attachment:' . $bg_attachment;
		}

		return $decls;
	}
}
