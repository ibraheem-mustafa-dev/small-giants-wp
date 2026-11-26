<?php
/**
 * Trust bar in a grid layout: the separator between badges, and centring a lone last row.
 *
 * A grid gives every direct child of the bar its own cell, so what a row does with sibling elements (the separator
 * glyph) and with `justify-content` (centring an orphan) needs another route here:
 *
 * - Separator: printed INSIDE each badge (helpers-trust-bar-item.php::sgs_trust_bar_separator_html, `$in_cell`) and
 *   centred on the gap beside the badge by style.css, which reads the bar's column gap from `--sgs-trust-bar-gap-x`.
 *   The last badge of every row has no neighbour to its right, so its separator is hidden by a per-device rule that
 *   needs the column count of the device.
 * - Centre last row (`centreLastRow`, off by default): a last row of ONE badge spans the row and sits in the middle.
 *   Needs the same per-device column count.
 *
 * The column count of a device is what the shared wrapper draws (class-sgs-container-wrapper.php, the
 * `gridTemplateColumns` resolution): the device's own template when it stores one, else the wider template it
 * inherits, else the Columns count. A template this file cannot count (`repeat(auto-fit, ...)`, a plain track list)
 * gives no rule for that device, so the separators stay and the orphan stays left.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_trust_bar_template_count' ) ) {
	/**
	 * The column count a `grid-template-columns` value states, when it is a plain `repeat(N, ...)`.
	 *
	 * @param string $template A stored template, e.g. "repeat(4, 1fr)".
	 * @return int|null N; null when the value is not a plain repeat (a track list, auto-fit, a keyword).
	 */
	function sgs_trust_bar_template_count( string $template ): ?int {
		if ( 1 === preg_match( '/^\s*repeat\(\s*(\d{1,2})\s*,/i', $template, $m ) && (int) $m[1] > 0 ) {
			return (int) $m[1];
		}

		return null;
	}
}

if ( ! function_exists( 'sgs_trust_bar_tier_columns' ) ) {
	/**
	 * The column count the grid draws at each device.
	 *
	 * @param array $attributes       Block attributes.
	 * @param array $authored_columns The `columns` object as the post stores it (raw parsed attrs), or array() when it
	 *                                is not stored: only a stored count overrides a wider template.
	 * @return array<string, int|null> desktop, tablet, mobile => count; null where it cannot be counted.
	 */
	function sgs_trust_bar_tier_columns( array $attributes, array $authored_columns = array() ): array {
		$template    = sgs_responsive_normalise_object( $attributes['gridTemplateColumns'] ?? null );
		$columns     = sgs_responsive_normalise_object( $attributes['columns'] ?? null );
		$authored    = sgs_responsive_normalise_object( $authored_columns ? $authored_columns : null );
		$fallback    = array(
			'desktop' => 2,
			'tablet'  => 2,
			'mobile'  => 1,
		);
		$out         = array();
		$inherits    = false;
		$wider_count = null;

		foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
			$stored = $template[ $tier ] ?? null;
			if ( is_string( $stored ) && '' !== trim( $stored ) ) {
				$wider_count  = sgs_trust_bar_template_count( $stored );
				$out[ $tier ] = $wider_count;
				$inherits     = true;
				continue;
			}
			if ( $inherits && null === ( $authored[ $tier ] ?? null ) ) {
				$out[ $tier ] = $wider_count;
				continue;
			}
			$count        = $columns[ $tier ] ?? $fallback[ $tier ];
			$out[ $tier ] = is_numeric( $count ) && (int) $count > 0 ? (int) $count : $fallback[ $tier ];
		}

		return $out;
	}
}

if ( ! function_exists( 'sgs_trust_bar_column_gap' ) ) {
	/**
	 * The column part of a gap value: the second length of a "row column" pair, else the value itself.
	 *
	 * @param string $gap A CSS length or a "row column" pair (as `sgs_container_tier_gap()` returns it).
	 * @return string The column gap.
	 */
	function sgs_trust_bar_column_gap( string $gap ): string {
		$parts = array();
		$depth = 0;
		$cur   = '';
		foreach ( str_split( trim( $gap ) ) as $ch ) {
			if ( '(' === $ch ) {
				++$depth;
			} elseif ( ')' === $ch ) {
				--$depth;
			}
			if ( 0 === $depth && ctype_space( $ch ) ) {
				if ( '' !== $cur ) {
					$parts[] = $cur;
					$cur     = '';
				}
				continue;
			}
			$cur .= $ch;
		}
		if ( '' !== $cur ) {
			$parts[] = $cur;
		}

		return $parts ? (string) end( $parts ) : '0px';
	}
}

if ( ! function_exists( 'sgs_trust_bar_nth' ) ) {
	/**
	 * An `an+b` expression that picks the badges at the end of each row (or the one after it).
	 *
	 * @param int $columns The row length.
	 * @param int $first   The position (counting from 1, after any sibling before the badges) of the first match.
	 * @return string e.g. "4n+1".
	 */
	function sgs_trust_bar_nth( int $columns, int $first ): string {
		return $columns . 'n+' . $first;
	}
}

if ( ! function_exists( 'sgs_trust_bar_grid_css' ) ) {
	/**
	 * Scoped CSS for a grid bar's separators and its centred last row.
	 *
	 * @param array  $attributes   Block attributes.
	 * @param string $uid_scope    Scoped selector for this instance, e.g. ".sgs-tb-3".
	 * @param array  $tier_columns sgs_trust_bar_tier_columns().
	 * @param int    $offset       Siblings before the first badge in ITS parent (1 when a title is printed beside them, else 0): `:nth-child` counts them.
	 * @param string $glyph        The separator glyph ('' for none).
	 * @param bool   $title_cell   Whether the bar prints a title. In a static grid the title is a grid item and takes the first cell, wherever it sits in the markup, so it shifts every badge one cell along.
	 * @return string CSS text; '' for a bar that is not a grid or asks for neither.
	 */
	function sgs_trust_bar_grid_css( array $attributes, string $uid_scope, array $tier_columns, int $offset, string $glyph, bool $title_cell = false ): string {
		if ( 'grid' !== ( $attributes['layout'] ?? '' ) ) {
			return '';
		}
		$centre = ! empty( $attributes['centreLastRow'] );
		if ( '' === $glyph && ! $centre ) {
			return '';
		}

		// A running marquee lays the badges out as one row of its own, and a held one as the authored row.
		$still = $uid_scope . ':not([data-sgs-marquee="on"]):not([data-sgs-marquee-hold])';
		$css   = '';

		if ( '' !== $glyph ) {
			$by_tier = array();
			foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
				$by_tier[ $tier ] = sgs_trust_bar_column_gap( sgs_container_tier_gap( $attributes, $tier ) );
			}
			$css .= $uid_scope . '{--sgs-trust-bar-gap-x:' . $by_tier['desktop'] . ';}';
			// The tablet rule covers phones too (a max-width query), so a phone that stores no gap of its own keeps the tablet one.
			if ( $by_tier['tablet'] !== $by_tier['desktop'] ) {
				$css .= SGS_Breakpoints::media( 'tablet' ) . '{' . $uid_scope . '{--sgs-trust-bar-gap-x:' . $by_tier['tablet'] . ';}}';
			}
			if ( $by_tier['mobile'] !== $by_tier['tablet'] ) {
				$css .= SGS_Breakpoints::media( 'mobile' ) . '{' . $uid_scope . '{--sgs-trust-bar-gap-x:' . $by_tier['mobile'] . ';}}';
			}
		}

		$ranges = array(
			'desktop' => 'desktop',
			'tablet'  => 'tablet-only',
			'mobile'  => 'mobile',
		);
		foreach ( $ranges as $tier => $range ) {
			$count = $tier_columns[ $tier ] ?? null;
			if ( null === $count ) {
				continue;
			}
			$rules = '';
			// A badge's cell is its position plus the title's cell; `:nth-child` counts its siblings in its own parent ($offset). The
			// two differ only when the badges sit in the marquee track and the title does not.
			$shift = $offset - ( $title_cell ? 1 : 0 );
			if ( '' !== $glyph ) {
				$end = ( ( $shift % $count ) + $count ) % $count;
				$rules .= $still . ' .sgs-trust-bar__badge:nth-child(' . sgs_trust_bar_nth( $count, 0 === $end ? $count : $end ) . ')>.sgs-trust-bar__separator--cell{display:none;}';
			}
			if ( $centre && $count > 1 ) {
				$rules .= $still . ' .sgs-trust-bar__badge:last-child:nth-child(' . sgs_trust_bar_nth( $count, $count + 1 + $shift ) . '){grid-column:1 / -1;justify-self:center;}';
			}
			if ( '' !== $rules ) {
				$css .= SGS_Breakpoints::media( $range ) . '{' . $rules . '}';
			}
		}

		return $css;
	}
}
