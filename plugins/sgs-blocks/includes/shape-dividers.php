<?php
/**
 * Shape divider SVG library.
 *
 * Returns SVG path data for shape dividers used in the Container block.
 * Each shape is a viewBox 1200x120 SVG path.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Get all available shape divider definitions.
 *
 * @return array<string, array{label: string, path: string}>
 */
function sgs_get_shape_dividers(): array {
	return array(
		'wave'                => array(
			'label' => 'Wave',
			'path'  => 'M0,40 C200,120 400,0 600,60 C800,120 1000,0 1200,40 L1200,120 L0,120 Z',
		),
		'wave-smooth'         => array(
			'label' => 'Wave (Smooth)',
			'path'  => 'M0,60 Q300,120 600,60 Q900,0 1200,60 L1200,120 L0,120 Z',
		),
		'triangle'            => array(
			'label' => 'Triangle',
			'path'  => 'M0,120 L600,0 L1200,120 Z',
		),
		'triangle-asymmetric' => array(
			'label' => 'Triangle (Asymmetric)',
			'path'  => 'M0,120 L800,0 L1200,120 Z',
		),
		'curve'               => array(
			'label' => 'Curve',
			'path'  => 'M0,120 Q600,0 1200,120 Z',
		),
		'curve-asymmetric'    => array(
			'label' => 'Curve (Asymmetric)',
			'path'  => 'M0,120 C300,120 600,0 1200,80 L1200,120 Z',
		),
		'zigzag'              => array(
			'label' => 'Zigzag',
			'path'  => 'M0,60 L100,20 L200,60 L300,20 L400,60 L500,20 L600,60 L700,20 L800,60 L900,20 L1000,60 L1100,20 L1200,60 L1200,120 L0,120 Z',
		),
		'cloud'               => array(
			'label' => 'Cloud',
			'path'  => 'M0,80 C50,40 100,60 150,40 C200,20 250,50 300,30 C350,10 400,50 450,30 C500,10 550,40 600,20 C650,0 700,40 750,20 C800,0 850,30 900,20 C950,10 1000,40 1050,30 C1100,20 1150,50 1200,40 L1200,120 L0,120 Z',
		),
		'slant'               => array(
			'label' => 'Slant',
			'path'  => 'M0,120 L1200,0 L1200,120 Z',
		),
		'slant-gentle'        => array(
			'label' => 'Slant (Gentle)',
			'path'  => 'M0,120 L1200,60 L1200,120 Z',
		),
		'mountains'           => array(
			'label' => 'Mountains',
			'path'  => 'M0,120 L200,40 L400,90 L600,20 L800,70 L1000,30 L1200,80 L1200,120 Z',
		),
		'drops'               => array(
			'label' => 'Drops',
			'path'  => 'M0,80 C100,40 150,80 200,80 C250,80 300,40 400,80 C500,120 550,40 600,80 C650,120 700,40 800,80 C900,120 950,40 1000,80 C1050,120 1100,40 1200,80 L1200,120 L0,120 Z',
		),
		'tilt'                => array(
			'label' => 'Tilt',
			'path'  => 'M0,120 L1200,0 L1200,120 Z',
		),
		'arrow'               => array(
			'label' => 'Arrow',
			'path'  => 'M0,0 L600,120 L1200,0 L1200,120 L0,120 Z',
		),
		'split'               => array(
			'label' => 'Split',
			'path'  => 'M0,0 L600,80 L1200,0 L1200,120 L0,120 Z',
		),
	);
}

/**
 * The authored viewBox of every shape in sgs_get_shape_dividers().
 *
 * Every path above is drawn against a 1200x120 coordinate space. These two
 * constants are what make "100% = the shape's natural, undistorted size"
 * (Spec 35 §F.2.3) a computable value rather than a magic number: Y at 100%
 * IS the viewBox height in px, and X at 100% IS one tile spanning the full
 * viewBox width.
 */
const SGS_SHAPE_DIVIDER_VIEWBOX_W = 1200;
const SGS_SHAPE_DIVIDER_VIEWBOX_H = 120;

/** Slider bounds, mirrored from ContainerWrapperControls.js's SHAPE_DIVIDER_SCALE_*. */
const SGS_SHAPE_DIVIDER_SCALE_MIN = 10;
const SGS_SHAPE_DIVIDER_SCALE_MAX = 400;

/**
 * Clamp one axis of a divider scale to the control's own range.
 *
 * Stored attributes are client data and can be anything (a hand-edited post,
 * a clone, an older shape). Clamping here means a nonsense value degrades to
 * the nearest sane divider rather than emitting a zero-width pattern tile
 * (which renders nothing) or a 100000% tile (which renders one invisible
 * sliver). A non-numeric value falls back to the neutral 100.
 *
 * @param mixed $value Raw stored axis value.
 * @return int Clamped percentage.
 */
function sgs_clamp_shape_divider_scale( $value ): int {
	if ( ! is_numeric( $value ) ) {
		return 100;
	}
	return (int) max( SGS_SHAPE_DIVIDER_SCALE_MIN, min( SGS_SHAPE_DIVIDER_SCALE_MAX, (int) round( (float) $value ) ) );
}

/**
 * Read one axis out of a stored `{x,y}` scale attribute.
 *
 * @param mixed  $scale Raw stored attribute (expected array with x/y keys).
 * @param string $axis  'x' or 'y'.
 * @return int Clamped percentage for that axis.
 */
function sgs_shape_divider_axis( $scale, string $axis ): int {
	if ( ! is_array( $scale ) || ! isset( $scale[ $axis ] ) ) {
		return 100;
	}
	return sgs_clamp_shape_divider_scale( $scale[ $axis ] );
}

/**
 * Get a single shape divider SVG.
 *
 * MARKUP ONLY — no `style` attribute (FR-32-1 / FR-32-4, D345). This used to
 * emit `style="height:…px;color:…"`, which are real CSS PROPERTY declarations
 * and the most serious form of the no-inline breach. The caller now owns those
 * two values and emits them as a scoped `.{uid} .sgs-shape-divider--{position}`
 * rule; `$colour`/`$height` were therefore removed from this signature rather
 * than left as dead parameters. `sgs_render_shape_divider_decls()` builds the
 * matching declarations so the two cannot drift apart.
 *
 * GRADIENT (D636/D643 gradient rollout, Builder 5): a shape divider's
 * path paints via `fill="currentColor"`, resolving a CSS `color:` declaration
 * — and `currentColor` can only ever resolve to ONE flat colour, never a
 * gradient. There is no CSS-side trick that gets a gradient onto this path.
 * The only real mechanism is SVG's own native gradient paint: a
 * `<linearGradient>`/`<radialGradient>` definition plus `fill="url(#id)"` on
 * the path, replacing the `currentColor` hop entirely. `$gradient_defs`
 * (pre-built `<linearGradient>…</linearGradient>` markup, from
 * `sgs_render_shape_divider_gradient_defs()`) and `$gradient_id` are BOTH
 * empty for the flat-colour path — the caller decides which path applies by
 * whether the stored attribute value is a gradient CSS string.
 *
 * @param string $shape         Shape key.
 * @param bool   $flip          Flip horizontally.
 * @param bool   $invert        Invert vertically (mirror).
 * @param string $position      'top' or 'bottom'.
 * @param int    $scale_x       X-axis scale percentage.
 * @param string $gradient_defs Pre-built `<linearGradient>`/`<radialGradient>`
 *                               markup, or '' for the flat-colour path.
 * @param string $gradient_id   The id referenced by `$gradient_defs`, or ''.
 * @return string SVG HTML or empty string.
 */
function sgs_render_shape_divider( string $shape, bool $flip, bool $invert, string $position, int $scale_x = 100, string $gradient_defs = '', string $gradient_id = '' ): string {
	$shapes = sgs_get_shape_dividers();

	if ( ! isset( $shapes[ $shape ] ) ) {
		return '';
	}

	$path = $shapes[ $shape ]['path'];

	$transform_parts = array();
	if ( $flip ) {
		$transform_parts[] = 'scaleX(-1)';
	}
	if ( $invert ) {
		$transform_parts[] = 'scaleY(-1)';
	}

	$transform = $transform_parts ? ' transform="' . esc_attr( implode( ' ', $transform_parts ) ) . '" transform-origin="center"' : '';

	$position_class = 'sgs-shape-divider--' . esc_attr( $position );

	$scale_x = sgs_clamp_shape_divider_scale( $scale_x );

	// The gradient path is only reachable when BOTH the defs markup and its
	// id are present — a caller passing one without the other (shouldn't
	// happen, but defensive) falls back to the flat-colour mechanism rather
	// than emitting a `url(#)` that resolves to nothing.
	$use_gradient = '' !== $gradient_defs && '' !== $gradient_id;
	$fill_attr    = $use_gradient ? 'url(#' . $gradient_id . ')' : 'currentColor';
	$defs_markup  = $use_gradient ? '<defs>' . $gradient_defs . '</defs>' : '';

	// ── X = 100%: the original single-path markup, byte-for-byte for the
	// flat-colour default ─────────────────────────────────────────────────
	// The flat-colour default MUST render exactly as it did before this
	// control existed — a divider whose look shifts merely because the
	// mechanism changed underneath it would be a regression on every
	// existing page. The <pattern> wrapper below is therefore reached ONLY
	// when the client has actually scaled the X axis away from its neutral
	// value.
	if ( SGS_SHAPE_DIVIDER_VIEWBOX_W === (int) round( SGS_SHAPE_DIVIDER_VIEWBOX_W * $scale_x / 100 ) ) {
		return sprintf(
			'<div class="sgs-shape-divider %s" aria-hidden="true">' .
			'<svg viewBox="0 0 1200 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' .
			'%s' .
			'<path d="%s" fill="%s"%s/>' .
			'</svg></div>',
			$position_class,
			$defs_markup,
			esc_attr( $path ),
			esc_attr( $fill_attr ),
			$transform
		);
	}

	// ── X != 100%: tile the shape with an SVG <pattern> ───────────────────────
	// One tile is `tile_w` user units wide (the viewBox is 1200 wide, so
	// scale_x=50 gives a 600-unit tile, i.e. two tiles across the block).
	// `patternUnits="userSpaceOnUse"` keeps the maths in viewBox coordinates so
	// the tile width is a plain multiplication rather than a bounding-box ratio.
	//
	// CENTRE ANCHORING: the pattern's x-origin is placed so that one whole tile
	// is centred on the block's horizontal midpoint, and the repeat then runs
	// outward symmetrically in both directions. Below 100% that reads as an
	// evenly-centred repeat; above 100% the single oversized tile is centred and
	// the overflow is clipped by the SVG viewport itself — ordinary overflow
	// semantics, no bespoke maths.
	$tile_w   = max( 1, (int) round( SGS_SHAPE_DIVIDER_VIEWBOX_W * $scale_x / 100 ) );
	$origin_x = (int) round( ( SGS_SHAPE_DIVIDER_VIEWBOX_W - $tile_w ) / 2 );

	// The path is authored against a 1200-wide viewBox; squeeze it into the
	// tile with a plain horizontal scale so the shape keeps its full height.
	$tile_scale = $tile_w / SGS_SHAPE_DIVIDER_VIEWBOX_W;

	// Pattern IDs must be unique PER DOCUMENT. Deriving the id from the inputs
	// alone is NOT enough: two blocks on one page sharing shape + position +
	// tile width (two default heroes with the same top divider at the same
	// scale) would emit duplicate `id` attributes — invalid markup, and the
	// browser resolves `url(#id)` to whichever came first. A per-request
	// counter guarantees uniqueness without making the markup random: it is
	// deterministic for a given page render, so caching is unaffected.
	static $instance = 0;
	++$instance;
	$pattern_id = 'sgs-sd-' . substr( md5( $shape . '|' . $position . '|' . $tile_w ), 0, 8 ) . '-' . $instance;

	// ⛔ The flip/invert transform goes on the PATH INSIDE the pattern tile, NOT
	// on the <rect>. `transform-origin="center"` resolves against the
	// transformed element's OWN bounding box: on the rect that is always the
	// full 1200x120 viewBox (centre 600,60), but several shapes have a narrower
	// box (`zigzag` spans y 20-120, centre y=70). Putting it on the rect would
	// therefore flip asymmetric shapes about a different axis than the
	// X=100% route does, so the same shape would jump when the client nudged
	// the X slider off 100. On the path, both routes share one origin.
	// Flipping each tile is equivalent to flipping the tiled result.
	// The gradient def (when present) is nested inside the SAME <defs> block
	// as the tile <pattern> — both are definitions, order doesn't matter to
	// the browser, and the path inside the pattern references it exactly the
	// same way the X=100% path does, one gradient per tile.
	return sprintf(
		'<div class="sgs-shape-divider %s" aria-hidden="true">' .
		'<svg viewBox="0 0 1200 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' .
		'<defs>%s<pattern id="%s" x="%d" y="0" width="%d" height="120" patternUnits="userSpaceOnUse">' .
		'<g transform="scale(%s 1)"><path d="%s" fill="%s"%s/></g>' .
		'</pattern></defs>' .
		'<rect x="0" y="0" width="1200" height="120" fill="url(#%s)"/>' .
		'</svg></div>',
		$position_class,
		$defs_markup,
		esc_attr( $pattern_id ),
		$origin_x,
		$tile_w,
		esc_attr( rtrim( rtrim( number_format( $tile_scale, 6, '.', '' ), '0' ), '.' ) ),
		esc_attr( $path ),
		esc_attr( $fill_attr ),
		$transform,
		esc_attr( $pattern_id )
	);
}

/**
 * Build the scoped-CSS declarations for one shape divider.
 *
 * Companion to sgs_render_shape_divider(), which emits markup only (FR-32-1 /
 * FR-32-4, D345). The caller wraps these declarations in a per-instance
 * selector — `.{uid} .sgs-shape-divider--{position}` — so the values land in a
 * scoped stylesheet rule instead of an inline `style` attribute. `color` is set
 * (not `fill`) because the SVG path paints with `fill="currentColor"`.
 *
 * HEIGHT is now derived from the Y axis of the `{x,y}` scale attribute rather
 * than stored as px (Spec 35 §F.2.3, D637): 100% IS the shape's natural
 * undistorted height, which is the authored viewBox height. Y anchors to the
 * edge the divider is attached to and grows from there, which is what the
 * existing `top:-1px` / `bottom:-1px` positioning in the block stylesheet
 * already does — so no repositioning is needed and no existing divider moves.
 *
 * The X axis is NOT emitted here: it changes the SVG's internal tiling, not a
 * CSS property on the wrapper, and is handled inside
 * sgs_render_shape_divider() where the markup is built.
 *
 * GRADIENT (Builder 5): the caller passes an EMPTY `$colour` for a gradient
 * divider — `currentColor` cannot resolve to a gradient, so there is nothing
 * useful to write into `color:` when the path paints via `fill="url(#id)"`
 * instead. `color:` is now OMITTED entirely rather than emitted empty (which
 * used to leave a dangling, invalid `color:` with no value).
 *
 * @param string $colour  CSS colour value (validated here, as it was inline),
 *                         or '' when this divider paints a gradient instead.
 * @param int    $scale_y Vertical scale as a percentage of natural height.
 * @return string Declarations without braces, e.g. `height:120px;color:#fff`
 *                or `height:120px` when `$colour` is ''.
 */
function sgs_shape_divider_decls( string $colour, int $scale_y ): string {
	$scale_y = sgs_clamp_shape_divider_scale( $scale_y );
	$height  = (int) round( SGS_SHAPE_DIVIDER_VIEWBOX_H * $scale_y / 100 );
	$decls   = 'height:' . absint( $height ) . 'px';

	$safe_colour = sgs_sanitise_colour( $colour );
	if ( '' !== $safe_colour ) {
		$decls .= ';color:' . $safe_colour;
	}

	return $decls;
}

/**
 * Mint a per-request-unique id for a shape-divider gradient `<defs>` element.
 *
 * SVG `id`s are document-global — two block instances on the same page each
 * using a gradient divider would collide, and the browser resolves
 * `url(#id)` to whichever gradient def came first, silently miscolouring
 * the second instance. A static per-request counter guarantees uniqueness
 * without randomness (deterministic for a given render, so caching is
 * unaffected) — mirrors the existing per-instance pattern-id counter inside
 * sgs_render_shape_divider()'s X!=100% tiling branch.
 *
 * @return string A unique id, safe for direct use in an `id="…"` attribute.
 */
function sgs_shape_divider_gradient_id(): string {
	static $instance = 0;
	++$instance;
	return 'sgs-sd-grad-' . $instance;
}

/**
 * Split a comma-separated CSS argument list on TOP-LEVEL commas only —
 * i.e. commas that are not nested inside a function call's parentheses.
 * A gradient's colour stops are comma-separated, but a stop's own colour
 * can itself be a function containing commas (`rgb(0, 0, 0)`,
 * `var(--a, --b)`), so a naive `explode(',', …)` would shred those in half.
 *
 * @param string $value The inner argument list of a gradient function.
 * @return array<int, string> Trimmed top-level segments.
 */
function sgs_split_top_level_commas( string $value ): array {
	$parts   = array();
	$depth   = 0;
	$current = '';
	$length  = strlen( $value );

	for ( $i = 0; $i < $length; $i++ ) {
		$char = $value[ $i ];
		if ( '(' === $char ) {
			++$depth;
		} elseif ( ')' === $char ) {
			--$depth;
		}
		if ( ',' === $char && 0 === $depth ) {
			$parts[] = trim( $current );
			$current = '';
			continue;
		}
		$current .= $char;
	}
	if ( '' !== trim( $current ) ) {
		$parts[] = trim( $current );
	}

	return $parts;
}

/**
 * Format a float for direct use inside an SVG attribute — trims trailing
 * zeros/decimal point so `50.0000` becomes `50`, without ever producing an
 * empty string (a value that rounds to exactly 0 stays `0`, not '').
 *
 * @param float $value     The number to format.
 * @param int   $precision Decimal places before trimming.
 * @return string A compact numeric string.
 */
function sgs_svg_trim_number( float $value, int $precision = 4 ): string {
	$formatted = rtrim( rtrim( number_format( $value, $precision, '.', '' ), '0' ), '.' );
	return '' === $formatted ? '0' : $formatted;
}

/**
 * Split an `sgs_colour_value()`-resolved colour into its opaque `stop-color`
 * and a separate `stop-opacity`. SVG's `stop-color` presentation attribute
 * does not carry alpha the way CSS hex8/rgba() does — some browsers accept
 * hex8/rgba() there as a CSS-colour-4 extension, but writing the alpha out
 * explicitly as `stop-opacity` is the SVG-native mechanism and works
 * everywhere, matching the same alpha the operator picked via the gradient
 * bar's `enableAlpha` control.
 *
 * A `var(--wp--preset--color--…)` token cannot have its alpha inspected at
 * render time (it resolves in the browser, not in PHP) — it is treated as
 * fully opaque, same as every other SGS colour consumer treats an unresolved
 * token.
 *
 * @param string $resolved_colour Output of sgs_colour_value() for one stop.
 * @return array{colour: string, opacity: float} Opaque colour + 0-1 opacity.
 */
function sgs_svg_stop_colour_parts( string $resolved_colour ): array {
	if ( preg_match( '/^#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i', $resolved_colour, $matches ) ) {
		return array(
			'colour'  => '#' . $matches[1] . $matches[2] . $matches[3],
			'opacity' => round( hexdec( $matches[4] ) / 255, 3 ),
		);
	}
	return array(
		'colour'  => $resolved_colour,
		'opacity' => 1.0,
	);
}

/**
 * Parse a validated CSS gradient string (output of sgs_css_gradient_value())
 * into its type/angle/stops, so a shape divider can rebuild it as a native
 * SVG gradient. Never called on unvalidated input — the caller always
 * routes the raw attribute through sgs_css_gradient_value() first, which is
 * the ONE place the security allow-list lives; this function only decides
 * how to lay a value it already trusts out as SVG stops.
 *
 * @param string $gradient A gradient string already passed by sgs_css_gradient_value().
 * @return array{type: string, angle: ?float, stops: array<int, array{colour: string, position: ?float}>}
 *         Empty 'stops' when parsing fails (caller degrades to flat colour).
 */
function sgs_parse_gradient_stops( string $gradient ): array {
	$empty = array(
		'type'  => '',
		'angle' => null,
		'stops' => array(),
	);

	if ( ! preg_match( '/^(?:repeating-)?(linear|radial|conic)-gradient\((.+)\)$/is', $gradient, $outer ) ) {
		return $empty;
	}

	$type  = $outer[1];
	$parts = sgs_split_top_level_commas( $outer[2] );

	if ( empty( $parts ) ) {
		return $empty;
	}

	// The first segment MAY be an angle/direction/shape descriptor rather
	// than a colour stop (`180deg`, `to right`, `circle at center`, …) —
	// detect and strip it before treating every remaining segment as a stop.
	$angle                 = null;
	$first                 = $parts[0];
	$is_leading_descriptor = (bool) preg_match( '/^-?[\d.]+(deg|turn|rad|grad)$/i', $first )
		|| 0 === stripos( $first, 'to ' )
		|| 0 === stripos( $first, 'circle' )
		|| 0 === stripos( $first, 'ellipse' )
		|| 0 === stripos( $first, 'closest-' )
		|| 0 === stripos( $first, 'farthest-' )
		|| 0 === stripos( $first, 'from ' )
		|| 0 === stripos( $first, 'at ' );

	if ( $is_leading_descriptor ) {
		if ( preg_match( '/^(-?[\d.]+)deg$/i', $first, $angle_match ) ) {
			$angle = (float) $angle_match[1];
		} elseif ( preg_match( '/^(-?[\d.]+)turn$/i', $first, $turn_match ) ) {
			$angle = ( (float) $turn_match[1] ) * 360;
		}
		array_shift( $parts );
	}

	if ( empty( $parts ) ) {
		return $empty;
	}

	$stops = array();
	foreach ( $parts as $part ) {
		// A stop is "<colour>" or "<colour> <position%>" — the position, when
		// present, is always the trailing percentage token.
		if ( preg_match( '/^(.*\S)\s+(-?[\d.]+)%$/', $part, $stop_match ) ) {
			$colour_raw = $stop_match[1];
			$position   = (float) $stop_match[2];
		} else {
			$colour_raw = $part;
			$position   = null;
		}

		$resolved = sgs_colour_value( trim( $colour_raw ) );
		if ( '' === $resolved ) {
			continue;
		}

		$stops[] = array(
			'colour'   => $resolved,
			'position' => $position,
		);
	}

	if ( empty( $stops ) ) {
		return $empty;
	}

	// Fill in missing positions using CSS's own default distribution: first
	// defaults to 0%, last to 100%, and any gap between two known positions
	// is spread evenly across the stops sitting between them.
	$last_index = count( $stops ) - 1;
	if ( null === $stops[0]['position'] ) {
		$stops[0]['position'] = 0.0;
	}
	if ( null === $stops[ $last_index ]['position'] ) {
		$stops[ $last_index ]['position'] = 100.0;
	}
	for ( $i = 0; $i <= $last_index; $i++ ) {
		if ( null !== $stops[ $i ]['position'] ) {
			continue;
		}
		$next_index = $i + 1;
		while ( null === $stops[ $next_index ]['position'] ) {
			++$next_index;
		}
		$prev_position           = $stops[ $i - 1 ]['position'];
		$next_position           = $stops[ $next_index ]['position'];
		$span                    = $next_index - ( $i - 1 );
		$stops[ $i ]['position'] = $prev_position + ( $next_position - $prev_position ) * ( $i - ( $i - 1 ) ) / $span;
	}

	return array(
		'type'  => $type,
		'angle' => $angle,
		'stops' => $stops,
	);
}

/**
 * Build the SVG `<linearGradient>`/`<radialGradient>` definition markup for
 * one shape-divider gradient, ready to be nested inside a `<defs>` block.
 *
 * `radial` gradients map directly to SVG's native `<radialGradient>`.
 * `linear` gradients are converted from the CSS angle convention (0deg =
 * pointing up, increasing clockwise) to SVG's x1/y1/x2/y2 on a unit square
 * via the standard CSS→SVG gradient-angle formula. `conic` has no native SVG
 * primitive — SVG cannot express an angular sweep as a paint server — so it
 * degrades to the SAME linear treatment using whichever angle the author
 * supplied (or the CSS default). This is a visible, honest approximation,
 * not a silent flat-colour drop: every stop's colour still renders, just
 * swept linearly instead of angularly. Recorded as an accepted limitation
 * (mirrors D643's own precedent of admitting a capability gap rather than
 * inventing an unproven algorithm for a mechanism SVG cannot express).
 *
 * @param string $gradient    A validated gradient string (sgs_css_gradient_value() output).
 * @param string $gradient_id The id this definition will be referenced by.
 * @return string `<linearGradient>…</linearGradient>` / `<radialGradient>…</radialGradient>`
 *                markup, or '' when the gradient could not be parsed into any usable stops.
 */
function sgs_render_shape_divider_gradient_defs( string $gradient, string $gradient_id ): string {
	$parsed = sgs_parse_gradient_stops( $gradient );

	if ( empty( $parsed['stops'] ) ) {
		return '';
	}

	$stop_markup = '';
	foreach ( $parsed['stops'] as $stop ) {
		$parts        = sgs_svg_stop_colour_parts( $stop['colour'] );
		$stop_markup .= sprintf(
			'<stop offset="%s%%" stop-color="%s" stop-opacity="%s"/>',
			esc_attr( sgs_svg_trim_number( (float) $stop['position'] ) ),
			esc_attr( $parts['colour'] ),
			esc_attr( sgs_svg_trim_number( $parts['opacity'], 3 ) )
		);
	}

	if ( '' === $stop_markup ) {
		return '';
	}

	if ( 'radial' === $parsed['type'] ) {
		return sprintf(
			'<radialGradient id="%s" cx="50%%" cy="50%%" r="75%%">%s</radialGradient>',
			esc_attr( $gradient_id ),
			$stop_markup
		);
	}

	// linear (and conic, degraded — see docblock above).
	$angle = $parsed['angle'] ?? 180.0; // CSS default for an angle-less linear-gradient: "to bottom".
	$rad   = deg2rad( $angle );
	$x2    = 0.5 + sin( $rad ) * 0.5;
	$y2    = 0.5 - cos( $rad ) * 0.5;
	$x1    = 1 - $x2;
	$y1    = 1 - $y2;

	return sprintf(
		'<linearGradient id="%s" x1="%s" y1="%s" x2="%s" y2="%s">%s</linearGradient>',
		esc_attr( $gradient_id ),
		esc_attr( sgs_svg_trim_number( $x1 ) ),
		esc_attr( sgs_svg_trim_number( $y1 ) ),
		esc_attr( sgs_svg_trim_number( $x2 ) ),
		esc_attr( sgs_svg_trim_number( $y2 ) ),
		$stop_markup
	);
}

/**
 * Validate a colour value against a strict allow-list of formats.
 *
 * Accepts: theme.json palette slugs (a-z, 0-9, -), CSS variables, hex (#rgb, #rrggbb, #rrggbbaa),
 * rgb()/rgba(), hsl()/hsla(), oklch(), and the 'currentColor' / 'transparent' / 'inherit' keywords.
 * Anything else (including raw text, malformed CSS, embedded quotes) returns empty string,
 * which collapses to no inline colour — the block falls back to its CSS default.
 *
 * Defence-in-depth on top of esc_attr(): esc_attr only neutralises HTML entities; it does not
 * prevent CSS-context attacks like style="color:red;background:url(javascript:alert(1))".
 *
 * @param string $colour Raw colour value from block attribute or settings.
 * @return string Validated colour or empty string.
 */
function sgs_sanitise_colour( string $colour ): string {
	$colour = trim( $colour );
	if ( '' === $colour ) {
		return '';
	}

	// Theme.json palette slug (e.g. "primary", "accent-light").
	if ( preg_match( '/^[a-z][a-z0-9-]*$/i', $colour ) ) {
		return 'var(--wp--preset--color--' . sanitize_key( $colour ) . ')';
	}

	// Already a CSS variable — pass through if shape is exactly var(--name).
	if ( preg_match( '/^var\(--[a-z0-9-]+\)$/i', $colour ) ) {
		return $colour;
	}

	// Hex: #rgb / #rgba / #rrggbb / #rrggbbaa.
	if ( preg_match( '/^#([a-f0-9]{3,4}|[a-f0-9]{6}|[a-f0-9]{8})$/i', $colour ) ) {
		return strtolower( $colour );
	}

	// Functional notations: rgb(), rgba(), hsl(), hsla(), oklch(), oklab().
	if ( preg_match( '/^(rgb|rgba|hsl|hsla|oklch|oklab)\([0-9 .,%\/-]+\)$/i', $colour ) ) {
		return $colour;
	}

	// Reserved keywords.
	if ( in_array( strtolower( $colour ), array( 'currentcolor', 'transparent', 'inherit' ), true ) ) {
		return strtolower( $colour );
	}

	// Anything else: reject.
	return '';
}
