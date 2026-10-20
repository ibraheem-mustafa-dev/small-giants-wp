<?php
/**
 * End shapes: cut one end of a box into a shape from the shape-divider library.
 *
 * A library tile (includes/shape-dividers.php::sgs_get_shape_dividers, a 1200x120
 * viewBox) paints the part below its edge line. Laid on an end of a box, the
 * painted part is what stays and the part above the edge line is cut away, so
 * whatever is behind the box shows through the cut. `arrow` gives a V notch,
 * `triangle` a point.
 *
 * Every shaped end is one data-URI SVG tile `k` wide and 100 tall (`k` is the
 * depth, a percentage of the box's height), stretched to the box's height with
 * `mask-size:auto 100%`, so the angle holds at any box length. The library path
 * is rotated into the tile by `matrix()`: the library's base (y=120) faces the
 * box and its edge line faces outwards.
 *
 * Each shaped end has one cut tile, the box minus the painted part, which a
 * `mask-composite:subtract` layer removes from the box's layer. That layer carries
 * the box's fill and its real CSS border together, so the cut removes the fill and
 * the border along the cut: the cut sides have no line, and the straight sides keep
 * a crisp CSS border.
 *
 * `src/utils/end-shape.js` is the editor twin and returns identical strings.
 * `$side` takes `left` or `right` today.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/shape-dividers.php';

/**
 * The library shapes an end may take, in menu order.
 *
 * Cloud, drops and mountains turn to mush at about 50px, the asymmetric pair is
 * lopsided, and tilt, split, slant-gentle and wave repeat another entry.
 *
 * @return string[] Library keys.
 */
function sgs_end_shape_allowed(): array {
	return array( 'arrow', 'triangle', 'slant', 'curve', 'wave-smooth', 'zigzag' );
}

/**
 * A stored end shape, or '' (Straight) when it is not in the allowed list.
 *
 * @param mixed $shape Stored value.
 * @return string Library key or ''.
 */
function sgs_end_shape_normalise( $shape ): string {
	return ( is_string( $shape ) && in_array( $shape, sgs_end_shape_allowed(), true ) ) ? $shape : '';
}

/**
 * A stored depth clamped to 10 through 150 (percent of the box's height); 45 when unset.
 *
 * @param mixed $depth Stored value.
 * @return float Depth.
 */
function sgs_end_shape_depth( $depth ): float {
	if ( ! is_numeric( $depth ) ) {
		return 45.0;
	}
	return max( 10.0, min( 150.0, (float) $depth ) );
}

/**
 * A number as the tiles print it: four decimals at most, no trailing zeros.
 *
 * @param float $number Value (never negative here; the sign is written by the caller).
 * @return string Printed number.
 */
function sgs_end_shape_num( float $number ): string {
	$text = rtrim( rtrim( number_format( round( $number, 4 ), 4, '.', '' ), '0' ), '.' );
	return '' === $text ? '0' : $text;
}

/**
 * The library path for a shape, or '' when it is not allowed.
 *
 * @param string $shape Library key.
 * @return string Path data.
 */
function sgs_end_shape_library_path( string $shape ): string {
	if ( '' === sgs_end_shape_normalise( $shape ) ) {
		return '';
	}
	$library = sgs_get_shape_dividers();
	return isset( $library[ $shape ]['path'] ) ? (string) $library[ $shape ]['path'] : '';
}

/**
 * The matrix that rotates a library tile into a depth-wide, 100-tall end tile.
 *
 * @param string $side  'left' or 'right'.
 * @param float  $depth Depth, 10 through 150.
 * @return string An SVG transform value.
 */
function sgs_end_shape_matrix( string $side, float $depth ): string {
	$scale = sgs_end_shape_num( $depth / 120 );
	if ( 'left' === $side ) {
		return 'matrix(0 0.0833 ' . $scale . ' 0 0 0)';
	}
	return 'matrix(0 0.0833 -' . $scale . ' 0 ' . sgs_end_shape_num( $depth ) . ' 0)';
}

/**
 * The opening of an end tile: depth wide, 100 tall, stretched without keeping its ratio.
 *
 * @param float $depth Depth.
 * @return string The `<svg …>` start tag.
 */
function sgs_end_shape_svg_open( float $depth ): string {
	$width = sgs_end_shape_num( $depth );
	return "<svg xmlns='http://www.w3.org/2000/svg' width='" . $width . "' height='100' viewBox='0 0 " . $width . " 100' preserveAspectRatio='none'>";
}

/**
 * The cut tile for one end: the tile minus the library's painted part.
 *
 * @param string $shape Library key.
 * @param string $side  'left' or 'right'.
 * @param float  $depth Depth, 10 through 150.
 * @return string Raw SVG, or '' when the shape or side is not allowed.
 */
function sgs_end_shape_cut_svg( string $shape, string $side, float $depth ): string {
	$path = sgs_end_shape_library_path( $shape );
	if ( '' === $path || ! in_array( $side, array( 'left', 'right' ), true ) ) {
		return '';
	}
	$depth = sgs_end_shape_depth( $depth );
	return sgs_end_shape_svg_open( $depth )
		. "<path fill-rule='evenodd' transform='" . sgs_end_shape_matrix( $side, $depth ) . "' d='M0,0H1200V120H0Z " . $path . "'/></svg>";
}

/**
 * An SVG as a CSS `url()` value: only `%`, `<`, `>`, `#` and `"` are encoded.
 *
 * `<` and `>` stay out of the stylesheet so a tag-stripping pass cannot touch it.
 *
 * @param string $svg Raw SVG using single-quoted attributes.
 * @return string `url("data:image/svg+xml,…")`.
 */
function sgs_end_shape_url( string $svg ): string {
	$encoded = str_replace( array( '%', '<', '>', '#', '"' ), array( '%25', '%3C', '%3E', '%23', '%22' ), $svg );
	return 'url("data:image/svg+xml,' . $encoded . '")';
}

/**
 * The shaped ends of a box, right first, as `side => [ shape, depth ]`.
 *
 * @param array<string, array{0: string, 1: float}> $ends Caller's ends.
 * @return array<string, array{0: string, 1: float}> Only the ends with an allowed shape.
 */
function sgs_end_shape_active_ends( array $ends ): array {
	$out = array();
	foreach ( array( 'right', 'left' ) as $side ) {
		$shape = sgs_end_shape_normalise( $ends[ $side ][0] ?? '' );
		if ( '' !== $shape ) {
			$out[ $side ] = array( $shape, sgs_end_shape_depth( $ends[ $side ][1] ?? 45 ) );
		}
	}
	return $out;
}

/**
 * Mask declarations that cut the shaped ends out of a box.
 *
 * One layer keeps the whole box, one cut tile per shaped end is subtracted from it.
 *
 * @param array<string, array{0: string, 1: float}> $ends `left` and `right` as `[ shape, depth ]`.
 * @return string Declarations ending in a semicolon, or '' when no end is shaped.
 */
function sgs_end_shape_mask_decls( array $ends ): string {
	$ends = sgs_end_shape_active_ends( $ends );
	if ( array() === $ends ) {
		return '';
	}
	$images    = array( 'linear-gradient(#000 0 0)' );
	$positions = array( '0 0' );
	$sizes     = array( '100% 100%' );
	foreach ( $ends as $side => $end ) {
		$images[]    = sgs_end_shape_url( sgs_end_shape_cut_svg( $end[0], $side, $end[1] ) );
		$positions[] = $side . ' center';
		$sizes[]     = 'auto 100%';
	}
	return 'mask-image:' . implode( ',', $images ) . ';'
		. 'mask-position:' . implode( ',', $positions ) . ';'
		. 'mask-size:' . implode( ',', $sizes ) . ';'
		. 'mask-repeat:no-repeat;'
		. 'mask-composite:' . ( count( $ends ) > 1 ? 'subtract,add' : 'subtract' ) . ';';
}

/**
 * The layer's inset, border and border colour for one set of border declarations.
 *
 * The layer is an absolutely positioned child of the box, whose containing block is
 * the box's padding box; each side is inset outwards by that side's border width, so
 * the layer covers the box's border box exactly and its own border sits where the
 * box's (transparent) border is.
 *
 * Each shaped side's border is a 1px transparent strip and the fill stops at the
 * padding box, so no paint meets the layer's edge along the cut: Chrome draws a
 * hairline where paint meets the edge of a masked element that is rotated. The cut
 * removes that side's border anyway, apart from its two corner points.
 *
 * @param array<string, array{0: string, 1: float}> $ends         `left` and `right` as `[ shape, depth ]`.
 * @param string[]                                  $border_decls The width declarations sgs_border_element_decls()
 *                                                                prints for one tier (`border-style:…`,
 *                                                                `border-width:t r b l`), or none.
 * @param string                                    $paint        The border colour as a background-paint
 *                                                                declaration (`facts.paint`): a flat colour
 *                                                                becomes `border-color`, a gradient a
 *                                                                `border-image`; '' leaves the border on
 *                                                                `currentColor`.
 * @return string Declarations ending in a semicolon.
 */
function sgs_end_shape_border_box_decls( array $ends, array $border_decls, string $paint ): string {
	$ends  = sgs_end_shape_active_ends( $ends );
	$sides = array();
	foreach ( $border_decls as $decl ) {
		if ( 0 === strpos( $decl, 'border-width:' ) ) {
			$sides = preg_split( '/\s+/', trim( substr( $decl, strlen( 'border-width:' ) ) ), -1, PREG_SPLIT_NO_EMPTY );
		}
	}
	$css = 'inset:0;';
	if ( array() !== $sides ) {
		$inset = array();
		foreach ( $sides as $side ) {
			$inset[] = 1 === preg_match( '/^0+(?:\.0+)?[a-z%]*$/i', $side ) ? '0' : 'calc(-1 * ' . $side . ')';
		}
		$css = 'inset:' . implode( ' ', $inset ) . ';' . implode( ';', $border_decls ) . ';';
		if ( 0 === strpos( $paint, 'background-color:' ) ) {
			$css .= 'border-color:' . substr( $paint, strlen( 'background-color:' ) ) . ';';
		} elseif ( 0 === strpos( $paint, 'background-image:' ) ) {
			$image_widths = array();
			foreach ( array( 'top', 'right', 'bottom', 'left' ) as $side ) {
				$image_widths[] = isset( $ends[ $side ] ) ? '0' : '1';
			}
			$css .= 'border-image:' . substr( $paint, strlen( 'background-image:' ) ) . ' 1;border-image-width:' . implode( ' ', $image_widths ) . ';';
		}
	}
	if ( array() !== $ends ) {
		foreach ( array( 'right', 'left' ) as $side ) {
			if ( isset( $ends[ $side ] ) ) {
				$css .= 'border-' . $side . ':1px solid transparent;';
			}
		}
		$css .= 'background-clip:padding-box;';
	}
	return $css;
}

/**
 * Declarations for a shaped box's `::after` layer: the box's border on the layer,
 * then the cut mask. The caller adds the fill paint.
 *
 * @param array<string, array{0: string, 1: float}> $ends         `left` and `right` as `[ shape, depth ]`.
 * @param string[]                                  $border_decls The box's desktop border width declarations.
 * @param string                                    $paint        The border colour as a background-paint declaration, or ''.
 * @return string Declarations ending in a semicolon, or '' when no end is shaped.
 */
function sgs_end_shape_layer_decls( array $ends, array $border_decls, string $paint ): string {
	$mask = sgs_end_shape_mask_decls( $ends );
	if ( '' === $mask ) {
		return '';
	}
	return 'content:"";position:absolute;'
		. sgs_end_shape_border_box_decls( $ends, $border_decls, $paint )
		. 'z-index:-2;box-sizing:border-box;pointer-events:none;border-radius:inherit;'
		. $mask;
}
