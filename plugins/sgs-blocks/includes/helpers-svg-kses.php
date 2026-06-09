<?php
/**
 * SVG wp_kses allowed-tags helper for SGS block server-side rendering.
 *
 * Provides sgs_svg_kses_allowed_tags() — returning the wp_kses allowed-tags
 * array for sanitising inline SVG markup. Covers the full set of SVG 1.1 +
 * SVG 2 drawing, structural, and presentation elements needed for animated
 * logos. Strips script elements, event-handler attributes (on*), and any
 * HTML-only elements.
 *
 * Used by sgs/responsive-logo render.php when inlining a media-library SVG
 * for animation via Vivus Instant.
 *
 * @package SGS\Blocks
 */

/**
 * Returns the wp_kses allowed-tags array for sanitising inline SVG markup.
 *
 * @return array<string, array<string, bool>> Tag → allowed attributes map.
 */
function sgs_svg_kses_allowed_tags(): array {
	// Shared presentation attributes permitted on most SVG elements.
	$presentation_attrs = array(
		'id'                  => true,
		'class'               => true,
		'style'               => true,
		'fill'                => true,
		'fill-opacity'        => true,
		'fill-rule'           => true,
		'stroke'              => true,
		'stroke-dasharray'    => true,
		'stroke-dashoffset'   => true,
		'stroke-linecap'      => true,
		'stroke-linejoin'     => true,
		'stroke-miterlimit'   => true,
		'stroke-opacity'      => true,
		'stroke-width'        => true,
		'opacity'             => true,
		'transform'           => true,
		'clip-path'           => true,
		'clip-rule'           => true,
		'marker'              => true,
		'marker-end'          => true,
		'marker-mid'          => true,
		'marker-start'        => true,
		'filter'              => true,
		'mask'                => true,
		'display'             => true,
		'visibility'          => true,
		'color'               => true,
		'color-interpolation' => true,
		'color-rendering'     => true,
		'shape-rendering'     => true,
		'text-rendering'      => true,
		'image-rendering'     => true,
	);

	$core_attrs = array_merge(
		$presentation_attrs,
		array(
			'xml:space'   => true,
			'xml:lang'    => true,
			'xmlns'       => true,
			'xmlns:xlink' => true,
		)
	);

	return array(
		'svg'               => array_merge(
			$core_attrs,
			array(
				'viewbox'             => true,
				'viewBox'             => true,
				'width'               => true,
				'height'              => true,
				'x'                   => true,
				'y'                   => true,
				'version'             => true,
				'baseprofile'         => true,
				'preserveaspectratio' => true,
				'role'                => true,
				'aria-label'          => true,
				'aria-hidden'         => true,
				'focusable'           => true,
			)
		),
		'g'                 => $core_attrs,
		'defs'              => $core_attrs,
		'use'               => array_merge(
			$core_attrs,
			array(
				'xlink:href' => true,
				'href'       => true,
				'x'          => true,
				'y'          => true,
				'width'      => true,
				'height'     => true,
			)
		),
		'symbol'            => array_merge(
			$core_attrs,
			array(
				'viewbox' => true,
				'viewBox' => true,
				'width'   => true,
				'height'  => true,
				'x'       => true,
				'y'       => true,
			)
		),
		'path'              => array_merge(
			$core_attrs,
			array(
				'd'          => true,
				'pathLength' => true,
			)
		),
		'rect'              => array_merge(
			$core_attrs,
			array(
				'x'      => true,
				'y'      => true,
				'width'  => true,
				'height' => true,
				'rx'     => true,
				'ry'     => true,
			)
		),
		'circle'            => array_merge(
			$core_attrs,
			array(
				'cx' => true,
				'r'  => true,
				'cy' => true,
			)
		),
		'ellipse'           => array_merge(
			$core_attrs,
			array(
				'cx' => true,
				'cy' => true,
				'rx' => true,
				'ry' => true,
			)
		),
		'line'              => array_merge(
			$core_attrs,
			array(
				'x1' => true,
				'y1' => true,
				'x2' => true,
				'y2' => true,
			)
		),
		'polyline'          => array_merge( $core_attrs, array( 'points' => true ) ),
		'polygon'           => array_merge( $core_attrs, array( 'points' => true ) ),
		'text'              => array_merge(
			$core_attrs,
			array(
				'x'              => true,
				'y'              => true,
				'dx'             => true,
				'dy'             => true,
				'text-anchor'    => true,
				'font-size'      => true,
				'font-family'    => true,
				'font-weight'    => true,
				'letter-spacing' => true,
			)
		),
		'tspan'             => array_merge(
			$core_attrs,
			array(
				'x'  => true,
				'y'  => true,
				'dx' => true,
				'dy' => true,
			)
		),
		'textpath'          => array_merge(
			$core_attrs,
			array(
				'xlink:href'  => true,
				'href'        => true,
				'startoffset' => true,
				'method'      => true,
				'spacing'     => true,
			)
		),
		'image'             => array_merge(
			$core_attrs,
			array(
				'x'                   => true,
				'y'                   => true,
				'width'               => true,
				'height'              => true,
				'href'                => true,
				'xlink:href'          => true,
				'preserveaspectratio' => true,
			)
		),
		'clippath'          => array_merge( $core_attrs, array( 'clippathunits' => true ) ),
		'mask'              => array_merge(
			$core_attrs,
			array(
				'x'                => true,
				'y'                => true,
				'width'            => true,
				'height'           => true,
				'maskunits'        => true,
				'maskcontentunits' => true,
			)
		),
		'marker'            => array_merge(
			$core_attrs,
			array(
				'viewbox'      => true,
				'viewBox'      => true,
				'markerwidth'  => true,
				'markerheight' => true,
				'markerunits'  => true,
				'orient'       => true,
				'refx'         => true,
				'refy'         => true,
			)
		),
		'pattern'           => array_merge(
			$core_attrs,
			array(
				'x'                   => true,
				'y'                   => true,
				'width'               => true,
				'height'              => true,
				'patternunits'        => true,
				'patterncontentunits' => true,
				'patterntransform'    => true,
				'viewbox'             => true,
				'viewBox'             => true,
			)
		),
		'lineargradient'    => array_merge(
			$core_attrs,
			array(
				'x1'                => true,
				'y1'                => true,
				'x2'                => true,
				'y2'                => true,
				'gradientunits'     => true,
				'gradienttransform' => true,
				'spreadmethod'      => true,
				'xlink:href'        => true,
				'href'              => true,
			)
		),
		'radialgradient'    => array_merge(
			$core_attrs,
			array(
				'cx'                => true,
				'cy'                => true,
				'r'                 => true,
				'fx'                => true,
				'fy'                => true,
				'gradientunits'     => true,
				'gradienttransform' => true,
				'spreadmethod'      => true,
				'xlink:href'        => true,
				'href'              => true,
			)
		),
		'stop'              => array_merge(
			$core_attrs,
			array(
				'offset'       => true,
				'stop-color'   => true,
				'stop-opacity' => true,
			)
		),
		'filter'            => array_merge(
			$core_attrs,
			array(
				'x'              => true,
				'y'              => true,
				'width'          => true,
				'height'         => true,
				'filterunits'    => true,
				'primitiveunits' => true,
			)
		),
		'feblend'           => array_merge(
			$core_attrs,
			array(
				'in'     => true,
				'in2'    => true,
				'mode'   => true,
				'result' => true,
			)
		),
		'fecolormatrix'     => array_merge(
			$core_attrs,
			array(
				'in'     => true,
				'type'   => true,
				'values' => true,
				'result' => true,
			)
		),
		'fecomposite'       => array_merge(
			$core_attrs,
			array(
				'in'       => true,
				'in2'      => true,
				'operator' => true,
				'k1'       => true,
				'k2'       => true,
				'k3'       => true,
				'k4'       => true,
				'result'   => true,
			)
		),
		'fedisplacementmap' => array_merge(
			$core_attrs,
			array(
				'in'               => true,
				'in2'              => true,
				'scale'            => true,
				'xchannelselector' => true,
				'ychannelselector' => true,
				'result'           => true,
			)
		),
		'fegaussianblur'    => array_merge(
			$core_attrs,
			array(
				'in'           => true,
				'stddeviation' => true,
				'result'       => true,
			)
		),
		'femerge'           => $core_attrs,
		'femergenode'       => array_merge( $core_attrs, array( 'in' => true ) ),
		'feoffset'          => array_merge(
			$core_attrs,
			array(
				'in'     => true,
				'dx'     => true,
				'dy'     => true,
				'result' => true,
			)
		),
		'title'             => array( 'id' => true ),
		'desc'              => array( 'id' => true ),
		'metadata'          => array( 'id' => true ),
		'a'                 => array_merge(
			$core_attrs,
			array(
				'href'       => true,
				'xlink:href' => true,
				'target'     => true,
			)
		),
	);
}
