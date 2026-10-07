<?php
/**
 * Value helpers for sgs/measured-diagram and its sgs/diagram-dimension children.
 *
 * Pure value functions only — every piece of markup and every CSS rule stays in
 * the two blocks' own render.php files, so the gates that read a block's own
 * directory (readBlockPhpFiles, the DB's render-repeater walk) still see them.
 * The line geometry lives in its own tested twin,
 * includes/helpers-diagram-geometry.php::sgs_diagram_dimension_paths().
 *
 * Coordinate convention: every position is a % of the drawing box (0–100).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-css-safety.php';
require_once __DIR__ . '/helpers-responsive.php';
require_once __DIR__ . '/helpers-diagram-geometry.php';

if ( ! function_exists( 'sgs_measured_diagram_box' ) ) {
	/**
	 * The drawing's own width and height, used as the line SVGs' viewBox and the
	 * frame's aspect ratio. Before a drawing is chosen (or when the chosen file
	 * reports no size) a 16:9 box stands in, the same ratio style.css falls back
	 * to for `--sgs-measured-diagram-ratio`, so lines and frame still agree.
	 *
	 * @param mixed $width  Intrinsic width from the parent's media atom.
	 * @param mixed $height Intrinsic height from the parent's media atom.
	 * @return array{0: float, 1: float} Width, height (both > 0).
	 */
	function sgs_measured_diagram_box( $width, $height ): array {
		$w = is_numeric( $width ) ? (float) $width : 0.0;
		$h = is_numeric( $height ) ? (float) $height : 0.0;
		if ( $w > 0 && $h > 0 ) {
			return array( $w, $h );
		}
		return array( 1600.0, 900.0 );
	}
}

if ( ! function_exists( 'sgs_measured_diagram_pct' ) ) {
	/**
	 * A position as a % of the drawing box, cast and clamped to 0–100.
	 *
	 * @param mixed $value    Raw value.
	 * @param float $fallback Used for junk or absent input.
	 * @return float
	 */
	function sgs_measured_diagram_pct( $value, float $fallback ): float {
		return sgs_diagram_clamp( $value, 0, 100, $fallback );
	}
}

if ( ! function_exists( 'sgs_measured_diagram_pct_tiers' ) ) {
	/**
	 * A `{desktop,tablet,mobile}` % position, every present tier clamped to
	 * 0–100. An unset desktop takes $desktop_fallback (the line's midpoint for a
	 * label); an unset tablet or mobile stays null so it inherits the tier above.
	 *
	 * @param mixed $raw              Stored tier object.
	 * @param float $desktop_fallback Desktop value when none is stored.
	 * @return array{desktop: float, tablet: ?float, mobile: ?float}
	 */
	function sgs_measured_diagram_pct_tiers( $raw, float $desktop_fallback ): array {
		$tiers = sgs_responsive_normalise_object( $raw );
		$out   = array(
			'desktop' => sgs_measured_diagram_pct( $tiers['desktop'], $desktop_fallback ),
			'tablet'  => null,
			'mobile'  => null,
		);
		foreach ( array( 'tablet', 'mobile' ) as $tier ) {
			if ( null !== $tiers[ $tier ] && '' !== $tiers[ $tier ] && is_numeric( $tiers[ $tier ] ) ) {
				$out[ $tier ] = sgs_measured_diagram_pct( $tiers[ $tier ], 0.0 );
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_measured_diagram_dot_radius' ) ) {
	/**
	 * Radius of a dot end, in viewBox units: half the tick length. The tick
	 * length is a % of the drawing width with the same 0–20 clamp and 1.76
	 * fallback as the geometry twin's tick (helpers-diagram-geometry.php), so a
	 * dot is exactly as wide as a tick is long.
	 *
	 * @param mixed $tick_length Tick length, % of drawing width.
	 * @param float $width       Drawing (viewBox) width.
	 * @return string Formatted radius.
	 */
	function sgs_measured_diagram_dot_radius( $tick_length, float $width ): string {
		return sgs_diagram_fmt( sgs_diagram_clamp( $tick_length, 0, 20, 1.76 ) * $width / 100 / 2 );
	}
}

if ( ! function_exists( 'sgs_measured_diagram_length' ) ) {
	/**
	 * One CSS length through the shared hardened validator. A bare number is
	 * read as pixels, the unit the editor's length control shows first.
	 *
	 * @param mixed $raw Stored value.
	 * @return string A safe CSS length, or '' when unset or unsafe.
	 */
	function sgs_measured_diagram_length( $raw ): string {
		if ( null === $raw || '' === $raw || is_array( $raw ) || is_bool( $raw ) ) {
			return '';
		}
		if ( is_numeric( $raw ) ) {
			return (string) (float) $raw . 'px';
		}
		return sgs_css_length_value( (string) $raw );
	}
}

if ( ! function_exists( 'sgs_measured_diagram_length_tiers' ) ) {
	/**
	 * A `{desktop,tablet,mobile}` length, every tier through
	 * sgs_measured_diagram_length(); an unset or unsafe tier becomes null.
	 *
	 * @param mixed $raw Stored tier object.
	 * @return array{desktop: ?string, tablet: ?string, mobile: ?string}
	 */
	function sgs_measured_diagram_length_tiers( $raw ): array {
		$tiers = sgs_responsive_normalise_object( $raw );
		$out   = array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$clean        = sgs_measured_diagram_length( $tiers[ $tier ] );
			$out[ $tier ] = '' === $clean ? null : $clean;
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_measured_diagram_dash_decls' ) ) {
	/**
	 * The guide lines' dash pattern for one stroke width: dashed is a 4:3
	 * dash:gap rhythm of the width, dotted is round-capped zero-length dashes
	 * spaced 2.5 widths apart, solid clears any pattern.
	 *
	 * @param string $style 'solid' | 'dashed' | 'dotted' (already allow-listed).
	 * @param string $width A safe CSS length (already validated).
	 * @return string Declarations without braces.
	 */
	function sgs_measured_diagram_dash_decls( string $style, string $width ): string {
		if ( 'dashed' === $style ) {
			return 'stroke-dasharray:calc(' . $width . ' * 4) calc(' . $width . ' * 3);stroke-linecap:butt;';
		}
		if ( 'dotted' === $style ) {
			return 'stroke-dasharray:0 calc(' . $width . ' * 2.5);stroke-linecap:round;';
		}
		return 'stroke-dasharray:none;';
	}
}

if ( ! function_exists( 'sgs_measured_diagram_user_space_gradient' ) ) {
	/**
	 * Re-anchor a gradient def from sgs_svg_stroke_gradient() to the drawing.
	 *
	 * The shared helper writes objectBoundingBox coordinates, which suit an
	 * icon. A dimension line is often perfectly horizontal or vertical, so its
	 * bounding box has zero height or width, and SVG ignores a bounding-box
	 * gradient on such a shape — the line would paint nothing. Re-expressing the
	 * same gradient in the drawing's own user space (every line SVG shares the
	 * drawing's viewBox) paints every line, and runs one gradient across the
	 * whole diagram rather than restarting on each line.
	 *
	 * @param string $defs  `<defs>…</defs>` markup from sgs_svg_stroke_gradient().
	 * @param float  $width  Drawing (viewBox) width.
	 * @param float  $height Drawing (viewBox) height.
	 * @return string The adjusted markup ('' stays '').
	 */
	function sgs_measured_diagram_user_space_gradient( string $defs, float $width, float $height ): string {
		if ( '' === $defs ) {
			return '';
		}
		$scale_linear = static function ( array $m ) use ( $width, $height ): string {
			return '<linearGradient id="' . $m[1] . '" gradientUnits="userSpaceOnUse"'
				. ' x1="' . sgs_diagram_fmt( (float) $m[2] * $width ) . '"'
				. ' y1="' . sgs_diagram_fmt( (float) $m[3] * $height ) . '"'
				. ' x2="' . sgs_diagram_fmt( (float) $m[4] * $width ) . '"'
				. ' y2="' . sgs_diagram_fmt( (float) $m[5] * $height ) . '">';
		};
		$defs = (string) preg_replace_callback(
			'/<linearGradient id="([A-Za-z0-9-]+)" x1="(-?[\d.]+)" y1="(-?[\d.]+)" x2="(-?[\d.]+)" y2="(-?[\d.]+)">/',
			$scale_linear,
			$defs
		);
		return (string) preg_replace(
			'/<radialGradient id="([A-Za-z0-9-]+)"/',
			'<radialGradient id="$1" gradientUnits="userSpaceOnUse"',
			$defs
		);
	}
}

if ( ! function_exists( 'sgs_diagram_dimension_text_kses' ) ) {
	/**
	 * The markup a label's caption or value may carry: simple inline emphasis,
	 * plus the bound-value span the `sgs-product/field` binding wraps a value in
	 * (its `data-sgs-bound-*` markers let a size change swap the number).
	 *
	 * @return array<string, array<string, bool>>
	 */
	function sgs_diagram_dimension_text_kses(): array {
		return array(
			'span'   => array(
				'class'                 => true,
				'data-sgs-bound-source' => true,
				'data-sgs-bound-scope'  => true,
				'data-sgs-bound-key'    => true,
				'data-sgs-bound-empty'  => true,
			),
			'strong' => array(),
			'em'     => array(),
			'b'      => array(),
			'i'      => array(),
			'sup'    => array(),
			'sub'    => array(),
			'br'     => array(),
		);
	}
}

if ( ! function_exists( 'sgs_diagram_dimension_empty_marker' ) ) {
	/**
	 * The empty bound-value container a size change can fill later.
	 *
	 * When `value` is bound to `sgs-product/field` and the product's first-paint
	 * value is empty, the binding returns '' (by design — its empty behaviour is
	 * an open decision kept off this block). If the key varies by variation,
	 * another size may still have it, so the child prints an empty bound span
	 * carrying the same markers the binding uses, flagged `data-sgs-bound-empty`,
	 * and registers the key with the size-following module. The binding's
	 * before/after text is left out of this empty case.
	 *
	 * @param array $attributes Block attributes (including `metadata`).
	 * @param mixed $block      Block instance (\WP_Block) or null.
	 * @return string The marker span, or '' when it does not apply.
	 */
	function sgs_diagram_dimension_empty_marker( array $attributes, $block ): string {
		$binding = $attributes['metadata']['bindings']['value'] ?? null;
		if ( ! is_array( $binding ) || 'sgs-product/field' !== ( $binding['source'] ?? '' ) ) {
			return '';
		}
		if ( ! class_exists( '\SGS\Blocks\Product_Bindings' ) || ! class_exists( '\SGS\Blocks\Product_Field_Variations' ) ) {
			return '';
		}
		$args = isset( $binding['args'] ) && is_array( $binding['args'] ) ? $binding['args'] : array();
		$pid  = \SGS\Blocks\Product_Bindings::resolve_product_id( $args, $block );
		$key  = \SGS\Blocks\Product_Bindings::sanitise_key( $args );
		if ( 0 === $pid || '' === $key || ! \SGS\Blocks\Product_Field_Variations::varies( $key ) ) {
			return '';
		}
		\SGS\Blocks\Product_Field_Variations::request( $pid, $key );
		// The binding's own text around the value (" mm"), so a size that fills
		// the marker later reads "54 mm" exactly as a first-paint value would.
		$before = isset( $args['before'] ) ? esc_html( (string) $args['before'] ) : '';
		$after  = isset( $args['after'] ) ? esc_html( (string) $args['after'] ) : '';
		return $before . '<span class="sgs-bound"' . \SGS\Blocks\Product_Field_Variations::marker_attrs( $pid, $key ) . ' data-sgs-bound-empty></span>' . $after;
	}
}
