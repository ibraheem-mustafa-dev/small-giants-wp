<?php
/**
 * `box-shape` atom — PHP value-setter twin of
 * `src/components/media/atoms/box-shape.js`.
 *
 * Sizing MODE (auto / height / ratio, mutually exclusive per registry.js
 * `requires`) plus an independent named SHAPE (none / rounded / circle /
 * square) expressed through `clip-path` — NEVER `border-radius`, which
 * `SgsBorderControl` (44 blocks) and native `__experimentalBorder`
 * (`sgs/media`) own outright. See the JS twin's docblock for the full
 * reasoning, the `custom` handoff from the `object-fit` atom, the ratio
 * format bridge, and the three `reads` traps (product-card `imageHeight`
 * flat string, hero `splitMediaWidth` number, decorative-image
 * `maxWidthPercent`).
 *
 * `sgs_media_atom_box_shape_css()` must emit BYTE-IDENTICAL declarations to
 * the JS twin's `css()` for the same attribute set — enforced by
 * `scripts/tests/test-media-atom-parity.mjs`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_box_shape_clip_paths' ) ) {
	/**
	 * The shape -> clip-path map. Never `border-radius` — see module docblock.
	 *
	 * @return array<string,string>
	 */
	function sgs_media_atom_box_shape_clip_paths() {
		return array(
			'square'  => 'inset(0)',
			'rounded' => 'inset(0 round 12px)',
			'circle'  => 'circle(50%)',
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_normalise_ratio' ) ) {
	/**
	 * Normalise a ratio string in EITHER format ("16/10" or "16 / 10") to the
	 * canonical spaced form. Refuses anything that is not two positive
	 * numbers either side of a slash.
	 *
	 * @param mixed $value Raw candidate.
	 * @return string "W / H", or '' when not a valid ratio.
	 */
	function sgs_media_atom_box_shape_normalise_ratio( $value ) {
		if ( ! is_string( $value ) ) {
			return '';
		}
		if ( ! preg_match( '/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/', trim( $value ), $m ) ) {
			return '';
		}
		return $m[1] . ' / ' . $m[2];
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_resolve_sizing_mode' ) ) {
	/**
	 * Reject an out-of-vocabulary `MediaSizing` value to 'auto'. `custom`
	 * (the object-fit atom's sizing-mode sentinel) resolves to 'height' only
	 * when nothing has explicitly chosen a mode yet.
	 *
	 * @param mixed $raw_sizing Raw `MediaSizing` value.
	 * @param mixed $object_fit The surface's own object-fit value (may be 'custom').
	 * @return string 'auto' | 'height' | 'ratio'.
	 */
	function sgs_media_atom_box_shape_resolve_sizing_mode( $raw_sizing, $object_fit ) {
		$vocabulary = array( 'auto', 'height', 'ratio' );
		if ( is_string( $raw_sizing ) && in_array( $raw_sizing, $vocabulary, true ) ) {
			return $raw_sizing;
		}
		if ( 'custom' === $object_fit ) {
			return 'height';
		}
		return 'auto';
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_validate_shape' ) ) {
	/**
	 * Reject an out-of-vocabulary `Shape` value to 'none'.
	 *
	 * @param mixed $value Raw candidate.
	 * @return string A vocabulary member.
	 */
	function sgs_media_atom_box_shape_validate_shape( $value ) {
		$vocabulary = array( 'none', 'rounded', 'circle', 'square' );
		return is_string( $value ) && in_array( $value, $vocabulary, true ) ? $value : 'none';
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_resolve_tier_object' ) ) {
	/**
	 * Read a Height/Width-shaped value in EITHER stored shape: this atom's
	 * own tier object (`{desktop,tablet,mobile}`) or a flat unit-embedded
	 * STRING / bare number (the `imageHeight`/`splitMediaWidth` traps).
	 *
	 * @param mixed $raw Raw attribute value.
	 * @return array{desktop?:mixed,tablet?:mixed,mobile?:mixed,__unitEmbedded?:bool}
	 */
	function sgs_media_atom_box_shape_resolve_tier_object( $raw ) {
		if ( is_string( $raw ) && '' !== $raw ) {
			return array(
				'desktop'        => $raw,
				'__unitEmbedded' => true,
			);
		}
		if ( is_numeric( $raw ) ) {
			return array( 'desktop' => $raw );
		}
		if ( is_array( $raw ) ) {
			$out = array();
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				if ( isset( $raw[ $tier ] ) && ( is_numeric( $raw[ $tier ] ) || ( is_string( $raw[ $tier ] ) && '' !== $raw[ $tier ] ) ) ) {
					$out[ $tier ] = $raw[ $tier ];
				}
			}
			return $out;
		}
		return array();
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_format_length' ) ) {
	/**
	 * Format a numeric-or-string tier value with its unit, unless already
	 * unit-embedded.
	 *
	 * @param mixed  $value            Tier value.
	 * @param string $unit             Unit to append when not embedded.
	 * @param bool   $already_embedded True when the source was a unit-embedded string.
	 * @return string
	 */
	function sgs_media_atom_box_shape_format_length( $value, $unit, $already_embedded ) {
		if ( null === $value || '' === $value ) {
			return '';
		}
		if ( $already_embedded || is_string( $value ) ) {
			return (string) $value;
		}
		return $value . ( $unit ? $unit : 'px' );
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_requires' ) ) {
	/**
	 * Height/Aspect ratio are mutually exclusive (registry.js `requires`);
	 * Shape and the min/max/width rows are independent of sizing mode.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug.
	 * @return array{state:string,hiddenReason:null|string,mode:string,heightState:string,ratioState:string}
	 */
	function sgs_media_atom_box_shape_requires( array $attributes, $prefix = '', $block_slug = '' ) {
		$sizing_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MediaSizing' );
		$fit_key    = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectFit' );
		$mode       = sgs_media_atom_box_shape_resolve_sizing_mode( $attributes[ $sizing_key ] ?? null, $attributes[ $fit_key ] ?? null );

		return array(
			'state'        => 'shown',
			'hiddenReason' => null,
			'mode'         => $mode,
			'heightState'  => 'height' === $mode ? 'visible' : 'hidden',
			'ratioState'   => 'ratio' === $mode ? 'visible' : 'hidden',
		);
	}
}

if ( ! function_exists( 'sgs_media_atom_box_shape_css' ) ) {
	/**
	 * Custom-property declarations for this atom. Mirrors the JS twin's
	 * `css()` exactly.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return string[] `--custom-property:value;` declarations, never bare rules.
	 */
	function sgs_media_atom_box_shape_css( array $attributes, $prefix, $block_slug ) {
		$decls = array();

		$sizing_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MediaSizing' );
		$fit_key    = sgs_media_element_stored_attr( $block_slug, $prefix, 'ObjectFit' );
		$mode       = sgs_media_atom_box_shape_resolve_sizing_mode( $attributes[ $sizing_key ] ?? null, $attributes[ $fit_key ] ?? null );

		if ( 'height' === $mode ) {
			$height_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'Height' );
			$unit_key   = sgs_media_element_stored_attr( $block_slug, $prefix, 'HeightUnit' );
			$resolved   = sgs_media_atom_box_shape_resolve_tier_object( $attributes[ $height_key ] ?? null );
			$unit       = $attributes[ $unit_key ] ?? 'px';
			$embedded   = ! empty( $resolved['__unitEmbedded'] );

			$tiers = array(
				'desktop' => '',
				'tablet'  => '-tablet',
				'mobile'  => '-mobile',
			);
			foreach ( $tiers as $tier => $suffix ) {
				$val = sgs_media_atom_box_shape_format_length( $resolved[ $tier ] ?? null, $unit, $embedded );
				if ( '' !== $val ) {
					$decls[] = '--sgs-media-height' . $suffix . ':' . $val;
				}
			}
		}

		if ( 'ratio' === $mode ) {
			$ratio_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'AspectRatio' );
			$ratio     = sgs_media_atom_box_shape_normalise_ratio( $attributes[ $ratio_key ] ?? null );
			if ( '' !== $ratio ) {
				$decls[] = '--sgs-media-aspect-ratio:' . $ratio;
			}
		}

		$width_key      = sgs_media_element_stored_attr( $block_slug, $prefix, 'Width' );
		$width_unit_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'WidthUnit' );
		$resolved_width = sgs_media_atom_box_shape_resolve_tier_object( $attributes[ $width_key ] ?? null );
		$width_unit     = $attributes[ $width_unit_key ] ?? 'px';
		$width_tiers    = array(
			'desktop' => '',
			'tablet'  => '-tablet',
			'mobile'  => '-mobile',
		);
		foreach ( $width_tiers as $tier => $suffix ) {
			$val = sgs_media_atom_box_shape_format_length( $resolved_width[ $tier ] ?? null, $width_unit, false );
			if ( '' !== $val ) {
				$decls[] = '--sgs-media-width' . $suffix . ':' . $val;
			}
		}

		$min_height_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MinHeight' );
		$min_height_raw = $attributes[ $min_height_key ] ?? null;
		$min_height_obj = is_array( $min_height_raw ) ? $min_height_raw : array();
		$mh_tiers       = array(
			'desktop' => '',
			'tablet'  => '-tablet',
			'mobile'  => '-mobile',
		);
		foreach ( $mh_tiers as $tier => $suffix ) {
			$val = $min_height_obj[ $tier ] ?? null;
			if ( null !== $val && '' !== $val ) {
				$decls[] = '--sgs-media-min-height' . $suffix . ':' . $val;
			}
		}

		$max_width_key      = sgs_media_element_stored_attr( $block_slug, $prefix, 'MaxWidth' );
		$max_width_unit_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MaxWidthUnit' );
		$max_width_raw      = $attributes[ $max_width_key ] ?? null;
		$max_width_desktop  = is_array( $max_width_raw ) ? ( $max_width_raw['desktop'] ?? null ) : null;
		if ( null !== $max_width_desktop && '' !== $max_width_desktop ) {
			$decls[] = '--sgs-media-max-width:' . $max_width_desktop . ( $attributes[ $max_width_unit_key ] ?? 'px' );
		}

		$max_height_key      = sgs_media_element_stored_attr( $block_slug, $prefix, 'MaxHeight' );
		$max_height_unit_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MaxHeightUnit' );
		$max_height_raw      = $attributes[ $max_height_key ] ?? null;
		$max_height_desktop  = is_array( $max_height_raw ) ? ( $max_height_raw['desktop'] ?? null ) : null;
		if ( null !== $max_height_desktop && '' !== $max_height_desktop ) {
			$decls[] = '--sgs-media-max-height:' . $max_height_desktop . ( $attributes[ $max_height_unit_key ] ?? 'px' );
		}

		$max_width_percent_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'MaxWidthPercent' );
		$max_width_percent     = $attributes[ $max_width_percent_key ] ?? null;
		if ( is_numeric( $max_width_percent ) ) {
			$decls[] = '--sgs-media-max-width-percent:' . $max_width_percent . '%;';
		}

		$shape_key = sgs_media_element_stored_attr( $block_slug, $prefix, 'Shape' );
		$shape     = sgs_media_atom_box_shape_validate_shape( $attributes[ $shape_key ] ?? null );
		if ( 'none' !== $shape ) {
			$clip_paths = sgs_media_atom_box_shape_clip_paths();
			$decls[]    = '--sgs-media-clip-path:' . $clip_paths[ $shape ];
		}

		return $decls;
	}
}
