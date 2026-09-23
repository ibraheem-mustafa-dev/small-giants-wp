<?php
/**
 * Gradient tone: resolves a gradient attribute (literal or theme preset) and judges it dark or
 * light from the position-weighted mean luminance of its stops, with the same black/white rule
 * text uses (sgs_wcag_white_wins_for_luminance()).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-colour-wcag.php';

/**
 * Resolve a theme.json gradient preset to its CSS value by slug, reading the
 * MERGED global settings (default → theme → user), same origin handling as
 * sgs_resolve_palette_hex().
 *
 * @param string $slug     Gradient slug, e.g. 'brand-fade'.
 * @param string $fallback Returned when the slug cannot be resolved.
 * @return string CSS gradient value or the fallback.
 */
function sgs_resolve_palette_gradient( string $slug, string $fallback = '' ): string {
	$gradients = wp_get_global_settings( array( 'color', 'gradients' ) );

	$lists = array();
	if ( is_array( $gradients ) && ( isset( $gradients['custom'] ) || isset( $gradients['theme'] ) || isset( $gradients['default'] ) ) ) {
		foreach ( array( 'custom', 'theme', 'default' ) as $origin ) {
			if ( ! empty( $gradients[ $origin ] ) && is_array( $gradients[ $origin ] ) ) {
				$lists[] = $gradients[ $origin ];
			}
		}
	} elseif ( is_array( $gradients ) ) {
		$lists[] = $gradients;
	}

	foreach ( $lists as $list ) {
		foreach ( $list as $entry ) {
			if ( is_array( $entry ) && isset( $entry['slug'], $entry['gradient'] ) && $slug === $entry['slug'] ) {
				return (string) $entry['gradient'];
			}
		}
	}

	return $fallback;
}

/**
 * Resolve a gradient attribute value to a literal CSS gradient string.
 *
 * Accepts an already-literal `linear-gradient(...)` / `radial-gradient(...)` /
 * `conic-gradient(...)` (optionally `repeating-`) value unchanged, or a
 * `var(--wp--preset--gradient--slug)` reference / bare slug resolved through
 * sgs_resolve_palette_gradient() (same origin handling as
 * sgs_resolve_palette_hex()). Returns '' for anything else.
 *
 * @param string $value Gradient value as stored in a block attribute.
 * @return string Literal CSS gradient value, or ''.
 */
function sgs_gradient_resolve_value( string $value ): string {
	$value = trim( $value );
	if ( '' === $value ) {
		return '';
	}

	if ( 1 === preg_match( '/^(?:repeating-)?(?:linear|radial|conic)-gradient\(/i', $value ) ) {
		return $value;
	}

	$slug = '';
	if ( 1 === preg_match( '/^var\(\s*--wp--preset--gradient--([a-z0-9-]+)\s*\)$/', $value, $matches ) ) {
		$slug = $matches[1];
	} elseif ( 1 === preg_match( '/^[a-z0-9-]+$/', $value ) ) {
		$slug = $value;
	}

	if ( '' !== $slug ) {
		return sgs_resolve_palette_gradient( $slug );
	}

	return '';
}

/**
 * Judge a gradient's tone as the WEIGHTED MEAN luminance of its stops — each stop weighted by the share of the 0-100% line closest to
 * it (midpoints between neighbouring stop positions; a stop with no explicit
 * position is spread evenly between its neighbours, as CSS itself does), then
 * the SAME black/white contrast decision as a solid colour
 * (sgs_wcag_white_wins_for_luminance()) applied to that mean.
 *
 * A leading direction/shape token (`90deg`, `to right`, `circle at center`) is
 * recognised by failing to parse as a colour and is silently dropped, but only
 * when it is the FIRST segment. Any other segment that fails to resolve to a
 * colour is an unresolvable stop: the whole gradient returns ''.
 *
 * @param string $value Gradient value as stored in a block attribute (a
 *                        literal gradient, `var(--wp--preset--gradient--slug)`,
 *                        or a bare slug).
 * @return string 'dark', 'light', or '' when any stop is unresolvable.
 */
function sgs_gradient_tone( string $value ): string {
	$gradient = sgs_gradient_resolve_value( $value );
	if ( '' === $gradient ) {
		return '';
	}

	if ( 1 !== preg_match( '/^(?:repeating-)?(?:linear|radial|conic)-gradient\(\s*(.*)\s*\)$/is', $gradient, $outer ) ) {
		return '';
	}

	$segments = array_map( 'trim', sgs_split_top_level_commas( $outer[1] ) );
	$segments = array_values( array_filter( $segments, static fn( $s ) => '' !== $s ) );

	if ( array() === $segments ) {
		return '';
	}

	$stops = array();
	foreach ( $segments as $i => $segment ) {
		$pos          = null;
		$colour_part  = $segment;
		$has_position = 1 === preg_match( '/^(.*)\s+(-?[0-9]*\.?[0-9]+)%$/', $segment, $stop_match );
		if ( $has_position ) {
			$colour_part = trim( $stop_match[1] );
			$pos         = max( 0.0, min( 100.0, (float) $stop_match[2] ) );
		}

		$parsed = sgs_colour_resolve_hex_alpha( $colour_part );
		if ( '' === $parsed['hex'] ) {
			if ( 0 === $i && array() === $stops ) {
				// Leading direction/shape token — not a stop, skip it.
				continue;
			}
			return ''; // Unresolvable stop.
		}

		$stops[] = array(
			'hex' => $parsed['hex'],
			'pos' => $pos,
		);
	}

	$count = count( $stops );
	if ( 0 === $count ) {
		return '';
	}

	if ( 1 === $count ) {
		$luminance = sgs_wcag_relative_luminance( $stops[0]['hex'] );
		if ( $luminance < 0 ) {
			return '';
		}
		return sgs_wcag_white_wins_for_luminance( $luminance ) ? 'dark' : 'light';
	}

	// Fill missing positions per CSS's own hint-distribution rule: the first
	// and last stop default to 0%/100% when unset, and any run of unset stops
	// between two known positions is spread evenly across that span.
	if ( null === $stops[0]['pos'] ) {
		$stops[0]['pos'] = 0.0;
	}
	if ( null === $stops[ $count - 1 ]['pos'] ) {
		$stops[ $count - 1 ]['pos'] = 100.0;
	}
	$i = 0;
	while ( $i < $count ) {
		if ( null !== $stops[ $i ]['pos'] ) {
			++$i;
			continue;
		}
		$j = $i;
		while ( null === $stops[ $j ]['pos'] ) {
			++$j;
		}
		$start = $stops[ $i - 1 ]['pos'];
		$end   = $stops[ $j ]['pos'];
		$span  = $j - ( $i - 1 );
		for ( $k = $i; $k < $j; $k++ ) {
			$stops[ $k ]['pos'] = $start + ( $end - $start ) * ( $k - ( $i - 1 ) ) / $span;
		}
		$i = $j;
	}

	// Weight each stop by the share of the line closest to it: midpoints
	// between neighbours, with the outer two stops reaching the 0%/100% line
	// edges (or their own position, if it overshoots that edge).
	$weights = array();
	$total_w = 0.0;
	for ( $i = 0; $i < $count; $i++ ) {
		$left      = 0 === $i ? min( 0.0, $stops[0]['pos'] ) : ( $stops[ $i - 1 ]['pos'] + $stops[ $i ]['pos'] ) / 2;
		$right     = ( $count - 1 ) === $i ? max( 100.0, $stops[ $count - 1 ]['pos'] ) : ( $stops[ $i ]['pos'] + $stops[ $i + 1 ]['pos'] ) / 2;
		$w         = max( 0.0, $right - $left );
		$weights[] = $w;
		$total_w  += $w;
	}

	if ( $total_w <= 0.0 ) {
		return '';
	}

	$mean_luminance = 0.0;
	foreach ( $stops as $i => $stop ) {
		$luminance = sgs_wcag_relative_luminance( $stop['hex'] );
		if ( $luminance < 0 ) {
			return '';
		}
		$mean_luminance += ( $weights[ $i ] / $total_w ) * $luminance;
	}

	return sgs_wcag_white_wins_for_luminance( $mean_luminance ) ? 'dark' : 'light';
}
