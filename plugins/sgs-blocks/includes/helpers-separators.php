<?php
/**
 * Separators: the shared setting for lines drawn between the items of a list.
 *
 * Gaps are spacing only. A line between items is its own setting, stored as one
 * object per list (the attribute name is the block's own: `separators`,
 * `submenuSeparators`, …):
 *
 *   {
 *     row:    { style, width: {desktop,tablet,mobile}, colour, colourHover },
 *     column: { style, width: {desktop,tablet,mobile}, colour, colourHover },
 *     edges:  'between' | 'all' | 'end',
 *     hoverTreatment: 'swap' | 'sweep' | 'none',
 *     sweepAngle: number
 *   }
 *
 * `row` is the line between rows (a horizontal line), `column` the line between
 * columns (a vertical line). An axis with no width draws nothing.
 *
 * This file normalises that object into a safe, resolved structure. The CSS is
 * emitted by helpers-separators-css.php (and -line-css.php / -hover-css.php);
 * the runtime fallback for browsers without gap decorations is
 * src/shared/separators/ (an overlay painted from measured item positions). The
 * editor twin is src/utils/separators.js.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-tokens.php';
require_once __DIR__ . '/helpers-css-safety.php';
require_once __DIR__ . '/helpers-responsive.php';

if ( ! function_exists( 'sgs_separators_axes' ) ) {
	/**
	 * The two axes a separators object can carry.
	 *
	 * @return string[] Axis names.
	 */
	function sgs_separators_axes(): array {
		return array( 'row', 'column' );
	}
}

if ( ! function_exists( 'sgs_separators_marker_class' ) ) {
	/**
	 * The class a list's root carries when it draws separators on the flow path,
	 * so the runtime fallback can find it.
	 *
	 * @return string Class name.
	 */
	function sgs_separators_marker_class(): string {
		return 'sgs-has-separators';
	}
}

if ( ! function_exists( 'sgs_separators_style' ) ) {
	/**
	 * A line style keyword. An empty or unknown style paints solid; `none` draws nothing.
	 *
	 * @param mixed $raw Stored style.
	 * @return string 'solid' | 'dashed' | 'dotted' | 'none'.
	 */
	function sgs_separators_style( $raw ): string {
		$style = strtolower( trim( (string) $raw ) );
		return in_array( $style, array( 'solid', 'dashed', 'dotted', 'none' ), true ) ? $style : 'solid';
	}
}

if ( ! function_exists( 'sgs_separators_normalise_axis' ) ) {
	/**
	 * One axis, sanitised and resolved.
	 *
	 * @param mixed $raw The stored axis object.
	 * @return array|null { style, width: {desktop,tablet,mobile}, colour, hover }, or null when the axis draws nothing.
	 */
	function sgs_separators_normalise_axis( $raw ): ?array {
		if ( ! is_array( $raw ) ) {
			return null;
		}
		$style = sgs_separators_style( $raw['style'] ?? '' );
		if ( 'none' === $style ) {
			return null;
		}
		$tiers = array();
		$width = is_array( $raw['width'] ?? null ) ? $raw['width'] : array();
		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$value = isset( $width[ $tier ] ) ? sgs_css_length_value( (string) $width[ $tier ] ) : '';
			if ( '' !== $value ) {
				$tiers[ $tier ] = $value;
			}
		}
		if ( ! $tiers ) {
			return null;
		}
		$colour = trim( (string) ( $raw['colour'] ?? '' ) );
		$hover  = trim( (string) ( $raw['colourHover'] ?? '' ) );
		return array(
			'style'  => $style,
			'width'  => $tiers,
			'colour' => '' === $colour ? 'currentColor' : sgs_colour_value( $colour ),
			'hover'  => '' === $hover ? '' : sgs_colour_value( $hover ),
		);
	}
}

if ( ! function_exists( 'sgs_separators_declared_supports' ) ) {
	/**
	 * `supports.sgs` of a block read from its block.json on disk (the built copy, else the source),
	 * for a request where the block type is not registered. Cached per block for the request.
	 *
	 * @param string $block_name Block name, e.g. 'sgs/gallery'.
	 * @return array|null The `supports.sgs` object, or null when no block.json is found.
	 */
	function sgs_separators_declared_supports( string $block_name ): ?array {
		static $cache = array();
		if ( array_key_exists( $block_name, $cache ) ) {
			return $cache[ $block_name ];
		}
		$cache[ $block_name ] = null;
		if ( 0 !== strpos( $block_name, 'sgs/' ) || ! preg_match( '/^[a-z0-9-]+$/', substr( $block_name, 4 ) ) ) {
			return null;
		}
		$slug = substr( $block_name, 4 );
		$root = dirname( __DIR__ );
		foreach ( array( '/build/blocks/', '/src/blocks/' ) as $folder ) {
			$file = $root . $folder . $slug . '/block.json';
			if ( ! is_file( $file ) ) {
				continue;
			}
			$data = json_decode( (string) file_get_contents( $file ), true );
			if ( is_array( $data ) ) {
				$sgs                  = $data['supports']['sgs'] ?? null;
				$cache[ $block_name ] = is_array( $sgs ) ? $sgs : null;
				return $cache[ $block_name ];
			}
		}
		return null;
	}
}

if ( ! function_exists( 'sgs_separators_caps' ) ) {
	/**
	 * What a block offers for one separators attribute, read from its block.json
	 * `supports.sgs.separators.<attribute>` (axes, edges, hover, sweep): the same entry
	 * the editor's SeparatorsPanel reads, so the two cannot disagree. A block that does
	 * not declare the attribute offers nothing (no axes), so nothing draws. Where the
	 * block type is not registered (the CSS render harness has no registry), the block's
	 * own block.json is read from the plugin folder instead, so the answer is the same.
	 *
	 * `$override` is for a block whose own state narrows what it can draw this render
	 * (a marquee strip is one row) or that draws an edge itself without offering the
	 * choice; keys in it replace the declared ones.
	 *
	 * @param string $block_name Block name, e.g. 'sgs/gallery'.
	 * @param string $attribute  The attribute, e.g. 'separators' or 'submenuSeparators'.
	 * @param array  $override   Capabilities that replace the declared ones for this render.
	 * @return array { axes: string[], edges: bool, hover: bool, sweep: bool }.
	 */
	function sgs_separators_caps( string $block_name, string $attribute = 'separators', array $override = array() ): array {
		$caps = array(
			'axes'  => array(),
			'edges' => false,
			'hover' => false,
			'sweep' => false,
		);
		$type = class_exists( '\\WP_Block_Type_Registry' ) ? \WP_Block_Type_Registry::get_instance()->get_registered( $block_name ) : null;
		$sgs  = ( null !== $type && is_array( $type->supports ?? null ) ) ? ( $type->supports['sgs'] ?? null ) : sgs_separators_declared_supports( $block_name );
		$decl = is_array( $sgs ) && isset( $sgs['separators'][ $attribute ] ) && is_array( $sgs['separators'][ $attribute ] ) ? $sgs['separators'][ $attribute ] : array();
		if ( isset( $decl['axes'] ) && is_array( $decl['axes'] ) ) {
			$caps['axes'] = array_values( array_intersect( sgs_separators_axes(), $decl['axes'] ) );
		}
		foreach ( array( 'edges', 'hover', 'sweep' ) as $key ) {
			$caps[ $key ] = ! empty( $decl[ $key ] );
		}
		return array_merge( $caps, $override );
	}
}

if ( ! function_exists( 'sgs_separators_normalise' ) ) {
	/**
	 * The whole setting, sanitised and resolved.
	 *
	 * @param mixed $raw  The stored `separators` object.
	 * @param array $caps What the block opted in to (`supports.sgs.separators.<attr>`):
	 *                    axes (string[]), edges (bool), hover (bool), sweep (bool).
	 * @return array { row, column (axis|null), edges, treatment, angle }.
	 */
	function sgs_separators_normalise( $raw, array $caps = array() ): array {
		$raw     = is_array( $raw ) ? $raw : array();
		$allowed = isset( $caps['axes'] ) && is_array( $caps['axes'] ) ? $caps['axes'] : sgs_separators_axes();
		$out     = array(
			'row'       => null,
			'column'    => null,
			'edges'     => 'between',
			'treatment' => 'none',
			'angle'     => null,
		);
		foreach ( sgs_separators_axes() as $axis ) {
			if ( in_array( $axis, $allowed, true ) ) {
				$out[ $axis ] = sgs_separators_normalise_axis( $raw[ $axis ] ?? null );
			}
		}
		$edges = (string) ( $raw['edges'] ?? 'between' );
		if ( ! empty( $caps['edges'] ) && in_array( $edges, array( 'all', 'end' ), true ) ) {
			$out['edges'] = $edges;
		}
		if ( ! empty( $caps['hover'] ) ) {
			$treatment = (string) ( $raw['hoverTreatment'] ?? 'swap' );
			if ( 'sweep' === $treatment && empty( $caps['sweep'] ) ) {
				$treatment = 'swap';
			}
			$out['treatment'] = in_array( $treatment, array( 'swap', 'sweep', 'none' ), true ) ? $treatment : 'swap';
			if ( isset( $raw['sweepAngle'] ) && is_numeric( $raw['sweepAngle'] ) ) {
				$out['angle'] = (float) $raw['sweepAngle'];
			}
		}
		return $out;
	}
}

if ( ! function_exists( 'sgs_separators_active' ) ) {
	/**
	 * Whether a normalised setting draws any line.
	 *
	 * @param array $normalised Output of sgs_separators_normalise().
	 * @return bool
	 */
	function sgs_separators_active( array $normalised ): bool {
		return null !== $normalised['row'] || null !== $normalised['column'];
	}
}

if ( ! function_exists( 'sgs_separators_gap_axis' ) ) {
	/**
	 * One axis of a gap tier value (`<row> <column>`, or one length for both).
	 * A value holding a function (`var(--x, 4px)`, `calc(…)`) is used whole for both
	 * axes, since splitting it on whitespace would break it.
	 *
	 * @param mixed  $raw  One tier's gap value.
	 * @param string $axis 'row' or 'column'.
	 * @return string A safe length, or '' when there is none.
	 */
	function sgs_separators_gap_axis( $raw, string $axis ): string {
		$value = trim( (string) $raw );
		if ( '' === $value ) {
			return '';
		}
		if ( false === strpos( $value, '(' ) ) {
			$parts = preg_split( '/\s+/', $value );
			$value = ( 'column' === $axis && isset( $parts[1] ) ) ? $parts[1] : $parts[0];
		}
		return sgs_css_length_value( $value );
	}
}
