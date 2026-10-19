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
 * Two tiles per end:
 * - the cut tile, the box minus the painted part, which a `mask-composite:subtract`
 *   layer removes from the fill and from the outline's own mask;
 * - the stroke tile, the edge line stroked at twice the outline width, which the
 *   cut then halves to an even outline that follows the cut.
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
 * The library path without its closing segments: the line a stroke follows.
 *
 * Drops the closing `Z`, then every trailing straight segment whose two ends
 * lie on the same edge of the 1200x120 tile.
 *
 * @param string $shape Library key.
 * @return string Path data, or '' when the shape is not allowed.
 */
function sgs_end_shape_edge_path( string $shape ): string {
	$path = sgs_end_shape_library_path( $shape );
	if ( '' === $path ) {
		return '';
	}
	preg_match_all( '/([MLQCZ])([^MLQCZ]*)/', $path, $found, PREG_SET_ORDER );

	$segments = array();
	foreach ( $found as $item ) {
		$numbers = array_map( 'floatval', preg_split( '/[\s,]+/', trim( $item[2] ), -1, PREG_SPLIT_NO_EMPTY ) );
		$count   = count( $numbers );
		$segments[] = array(
			'text' => $item[1] . trim( $item[2] ),
			'cmd'  => $item[1],
			'x'    => $count >= 2 ? $numbers[ $count - 2 ] : 0.0,
			'y'    => $count >= 2 ? $numbers[ $count - 1 ] : 0.0,
		);
	}

	while ( array() !== $segments && 'Z' === $segments[ count( $segments ) - 1 ]['cmd'] ) {
		array_pop( $segments );
	}
	while ( count( $segments ) > 1 ) {
		$last = $segments[ count( $segments ) - 1 ];
		$prev = $segments[ count( $segments ) - 2 ];
		if ( 'L' !== $last['cmd'] ) {
			break;
		}
		$on_edge = ( $last['x'] === $prev['x'] && ( 0.0 === $last['x'] || 1200.0 === $last['x'] ) )
			|| ( $last['y'] === $prev['y'] && ( 0.0 === $last['y'] || 120.0 === $last['y'] ) );
		if ( ! $on_edge ) {
			break;
		}
		array_pop( $segments );
	}

	return implode( ' ', array_column( $segments, 'text' ) );
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
 * The stroke tile for one end: the edge line at twice the outline width.
 *
 * The stroke keeps its pixel width whatever the tile is stretched to.
 *
 * @param string $shape     Library key.
 * @param string $side      'left' or 'right'.
 * @param float  $depth     Depth, 10 through 150.
 * @param float  $stroke_px Outline width in px.
 * @return string Raw SVG, or '' when the shape or side is not allowed.
 */
function sgs_end_shape_stroke_svg( string $shape, string $side, float $depth, float $stroke_px ): string {
	$edge = sgs_end_shape_edge_path( $shape );
	if ( '' === $edge || ! in_array( $side, array( 'left', 'right' ), true ) ) {
		return '';
	}
	$depth = sgs_end_shape_depth( $depth );
	return sgs_end_shape_svg_open( $depth )
		. "<path fill='none' stroke='#000' stroke-width='" . sgs_end_shape_num( $stroke_px * 2 ) . "' vector-effect='non-scaling-stroke' transform='" . sgs_end_shape_matrix( $side, $depth ) . "' d='" . $edge . "'/></svg>";
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
 * Declarations for the outline element: the straight sides as a border-wide ring,
 * plus the stroked edge line of each shaped end when the width is in px.
 *
 * The ring is the element's border box minus its content box (padding is the
 * outline width); each stroke tile is added to it. The outline element carries the
 * same cut mask as the fill, which halves the stroke to an even width.
 *
 * @param array<string, array{0: string, 1: float}> $ends      `left` and `right` as `[ shape, depth ]`.
 * @param string                                    $width_css The outline width as a CSS length.
 * @param float|null                                $stroke_px The width in px, or null when it is another unit (the straight sides only).
 * @return string Declarations ending in a semicolon.
 */
function sgs_end_shape_ring_decls( array $ends, string $width_css, ?float $stroke_px ): string {
	$ends      = sgs_end_shape_active_ends( $ends );
	$images    = array();
	$clips     = array();
	$sizes     = array();
	$positions = array();
	$composite = array();
	if ( null !== $stroke_px ) {
		foreach ( $ends as $side => $end ) {
			$images[]    = sgs_end_shape_url( sgs_end_shape_stroke_svg( $end[0], $side, $end[1], $stroke_px ) );
			$clips[]     = 'border-box';
			$sizes[]     = 'auto 100%';
			$positions[] = $side . ' center';
			$composite[] = 'add';
		}
	}
	$images    = array_merge( $images, array( 'linear-gradient(#000 0 0)', 'linear-gradient(#000 0 0)' ) );
	$clips     = array_merge( $clips, array( 'content-box', 'border-box' ) );
	$sizes     = array_merge( $sizes, array( '100% 100%', '100% 100%' ) );
	$positions = array_merge( $positions, array( '0 0', '0 0' ) );
	$composite[] = 'exclude';

	return 'padding:' . $width_css . ';'
		. 'mask-image:' . implode( ',', $images ) . ';'
		. 'mask-clip:' . implode( ',', $clips ) . ';'
		. 'mask-size:' . implode( ',', $sizes ) . ';'
		. 'mask-position:' . implode( ',', $positions ) . ';'
		. 'mask-repeat:no-repeat;'
		. 'mask-composite:' . implode( ',', $composite ) . ';';
}
