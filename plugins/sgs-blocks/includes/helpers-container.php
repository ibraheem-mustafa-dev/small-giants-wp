<?php
/**
 * Container layout helpers for SGS block server-side rendering.
 *
 * Provides sgs_sanitize_grid_template() and sgs_container_gap_value() —
 * sanitising CSS grid-template-columns values and resolving gap attribute
 * values to safe CSS fragments.
 *
 * Both functions are guarded with function_exists() wrappers so that
 * class-sgs-container-wrapper.php (which also defines them) can be loaded
 * in any order without fatal redeclaration errors.
 *
 * @package SGS\Blocks
 */

if ( ! function_exists( 'sgs_sanitize_grid_template' ) ) {
	/**
	 * Sanitise a CSS grid-template-columns value for safe inline-style emission.
	 *
	 * Allows: digits, letters, whitespace, percent, parens, commas, dashes.
	 * Forbids: semicolons, braces, quotes, angle brackets, slashes.
	 * Strips: anything else.
	 *
	 * @param string $value Raw attribute value.
	 * @return string Sanitised CSS fragment.
	 */
	function sgs_sanitize_grid_template( $value ) {
		$value = (string) $value;
		// Keep only characters that can appear in a legitimate grid-template-columns value.
		$value = preg_replace( '/[^A-Za-z0-9\s%(),.\-]/', '', $value );
		return trim( $value );
	}
}

if ( ! function_exists( 'sgs_serialise_box_sides' ) ) {
	/**
	 * Serialise a 4-side box-object attr ({top,right,bottom,left}) to a CSS
	 * padding shorthand string ("top right bottom left"). Neutral: an empty
	 * or absent box returns '' (matches the pre-migration empty-string
	 * default so callers' existing `'' !== $value` guards stay unchanged).
	 *
	 * Thin wrapper over sgs_box_object_shorthand() (helpers-box.php) — that
	 * helper fills an unset side with '0' when at least one side IS set;
	 * this wrapper only adds the null→'' normalisation for string-typed
	 * callers (e.g. class-sgs-container-wrapper.php's grid-item defaults).
	 *
	 * @param mixed $box Box object (array) or legacy scalar/empty value.
	 * @return string CSS shorthand, or '' when nothing is set.
	 */
	function sgs_serialise_box_sides( $box ): string {
		if ( ! is_array( $box ) ) {
			// Defensive: a legacy string value read from an old post still renders as-is.
			return (string) $box;
		}
		$shorthand = function_exists( 'sgs_box_object_shorthand' ) ? sgs_box_object_shorthand( $box ) : null;
		return null === $shorthand ? '' : $shorthand;
	}
}

if ( ! function_exists( 'sgs_serialise_box_corners' ) ) {
	/**
	 * Serialise a 4-corner box-object attr
	 * ({topLeft,topRight,bottomLeft,bottomRight}) to a CSS border-radius
	 * shorthand string. CSS border-radius shorthand order is
	 * TL TR BR BL (NOT TL TR BL BR — a common transcription error).
	 * Neutral: an empty or absent object returns ''.
	 *
	 * @param mixed $box Corner object (array) or legacy scalar/empty value.
	 * @return string CSS shorthand, or '' when nothing is set.
	 */
	function sgs_serialise_box_corners( $box ): string {
		if ( ! is_array( $box ) ) {
			// Defensive: a legacy string value read from an old post still renders as-is.
			return (string) $box;
		}
		$top_left     = sgs_css_length_value( $box['topLeft'] ?? '' );
		$top_right    = sgs_css_length_value( $box['topRight'] ?? '' );
		$bottom_left  = sgs_css_length_value( $box['bottomLeft'] ?? '' );
		$bottom_right = sgs_css_length_value( $box['bottomRight'] ?? '' );
		if ( '' === $top_left && '' === $top_right && '' === $bottom_left && '' === $bottom_right ) {
			return '';
		}
		// CSS order: top-left top-right bottom-right bottom-left.
		return ( '' !== $top_left ? $top_left : '0' ) . ' '
			. ( '' !== $top_right ? $top_right : '0' ) . ' '
			. ( '' !== $bottom_right ? $bottom_right : '0' ) . ' '
			. ( '' !== $bottom_left ? $bottom_left : '0' );
	}
}

if ( ! function_exists( 'sgs_container_gap_value' ) ) {
	/**
	 * Resolve a gap attribute value to a safe CSS declaration fragment (the part after "gap:").
	 *
	 * Delegates to the shared sgs_css_length_value() validator (helpers-css-safety.php)
	 * — routed here as Task 2 of the gap-sanitiser plan (.superpowers/sdd/task-2-brief.md),
	 * superseding this function's own narrow allowlist. This is now a thin
	 * name-preserving wrapper: every caller (class-sgs-container-wrapper.php:554,
	 * 1280, 1283, 1286; sgs_container_tier_gap() below) is unchanged.
	 *
	 * Backward compatibility (bare-slug wrapping, plain lengths, two-value gaps)
	 * is proven byte-identical against the old allowlist implementation by the
	 * differential test at scripts/diff-gap-sanitiser.php — it freezes the old
	 * implementation verbatim and asserts equality on the corpus in task-2-brief.md
	 * constraint 5. This function additionally now accepts fluid CSS function
	 * calls (var()/calc()/min()/max()/minmax()/clamp()) that the old allowlist
	 * stripped to invalid CSS, e.g. the header row's clamp() gap default
	 * (src/blocks/site-header-row/block.json).
	 *
	 * @param string $gap Raw gap attribute value from block attributes.
	 * @return string CSS value fragment safe to emit after "gap:", or empty string on failure.
	 */
	function sgs_container_gap_value( $gap ) {
		return sgs_css_length_value( $gap );
	}
}

if ( ! function_exists( 'sgs_container_tier_gap' ) ) {
	/**
	 * Resolve the effective gap for one device tier, under EITHER responsive model.
	 *
	 * Needed because the intrinsic-columns track list (below) must subtract the
	 * real gap from the available width. Reading `$attributes['gap']` directly is
	 * not enough: under the object model the wrapper deliberately blanks the flat
	 * `$gap` local (class-sgs-container-wrapper.php ~line 160) because
	 * sgs_emit_responsive_css() owns that property — so a calc built from the
	 * local would silently use 0 and let one extra column squeeze in, which is the
	 * documented failure mode of this pattern.
	 *
	 * Tiers inherit upward (mobile → tablet → desktop), matching how the rest of
	 * the responsive system resolves an unset tier.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $tier       'desktop' | 'tablet' | 'mobile'.
	 * @return string A sanitised CSS length, or '0px' when nothing is set.
	 */
	function sgs_container_tier_gap( array $attributes, string $tier ): string {
		$chain = array(
			'desktop' => array( 'desktop' ),
			'tablet'  => array( 'tablet', 'desktop' ),
			'mobile'  => array( 'mobile', 'tablet', 'desktop' ),
		);
		if ( ! isset( $chain[ $tier ] ) ) {
			return '0px';
		}

		$raw = $attributes['gap'] ?? '';
		if ( is_array( $raw ) ) {
			$by_tier = $raw;
		} else {
			$by_tier = array(
				'desktop' => $raw,
				'tablet'  => $attributes['gapTablet'] ?? '',
				'mobile'  => $attributes['gapMobile'] ?? '',
			);
		}

		foreach ( $chain[ $tier ] as $key ) {
			if ( isset( $by_tier[ $key ] ) && '' !== trim( (string) $by_tier[ $key ] ) ) {
				$value = sgs_container_gap_value( $by_tier[ $key ] );
				if ( '' !== $value ) {
					return $value;
				}
			}
		}
		return '0px';
	}
}

if ( ! function_exists( 'sgs_intrinsic_columns_track' ) ) {
	/**
	 * Build a track list where the operator's column count is a CEILING, not a
	 * fixed number — so columns fall away when content genuinely stops fitting
	 * rather than at a hard viewport breakpoint.
	 *
	 * Emits:
	 *   repeat(auto-fit, minmax(min(100%, max(BASIS, MAXTRACK)), 1fr))
	 *
	 * Read outward-in:
	 *  - MAXTRACK = what one column WOULD be at exactly N columns, gaps
	 *    subtracted. Wide viewports: this exceeds BASIS, becomes the track floor,
	 *    and auto-fit can therefore never produce MORE than N tracks. The
	 *    `(N-1) * gap` term is not optional — omit it and the bound is
	 *    systematically too generous and one extra column squeezes in.
	 *  - BASIS = the narrowest a column may be before one has to go. Narrow
	 *    viewports: MAXTRACK falls below BASIS, BASIS takes over, and the count
	 *    degrades CONTINUOUSLY with available width. No breakpoint involved.
	 *  - min(100%, …) = the overflow guard. Without it a track cannot shrink
	 *    below BASIS and the row overflows horizontally at ~320px — a WCAG 1.4.10
	 *    failure. With it the row reaches one column naturally instead.
	 *
	 * BASIS is a `rem` custom property, never `cqi`/`vw`: container and viewport
	 * units do not respond to browser text zoom, so a unit-only basis can fail
	 * WCAG 1.4.4. Override per instance or per theme via `--sgs-col-basis`.
	 *
	 * `auto-fit` (not `auto-fill`) is deliberate. With the MAXTRACK bound above,
	 * more tracks than N is impossible, so the two keywords behave identically
	 * whenever the child count equals N. They differ only when an operator sets
	 * N=4 but adds 3 children: auto-fill reserves a 4th empty track and leaves a
	 * quarter of the row blank; auto-fit collapses it and the three balance.
	 *
	 * @param int         $count     Operator's column count for this tier (the ceiling).
	 * @param string      $gap_value Sanitised CSS gap length for this tier.
	 * @param string|null $basis     Optional explicit CSS length (e.g. '320px') to use as
	 *                               BASIS instead of the built-in `var(--sgs-col-basis,16rem)`
	 *                               default. Client-configurable via `sgs/container`'s
	 *                               `minColumnWidth`/`minColumnWidthUnit` attribute pair
	 *                               (resolved per-tier by `sgs_container_tier_min_column_width()`).
	 *                               Null or an empty string falls back to the default unchanged —
	 *                               `sgs/site-footer-row`, the only other caller, never passes
	 *                               this argument and is therefore unaffected.
	 * @return string A `grid-template-columns` value, or '' when count is invalid.
	 */
	function sgs_intrinsic_columns_track( int $count, string $gap_value, ?string $basis = null ): string {
		$count = absint( $count );
		if ( $count < 1 ) {
			return '';
		}
		// One column is one column — there is nothing to degrade toward, and the
		// calc would divide the row by 1 and pin the track to the full width,
		// defeating the min(100%) guard.
		if ( 1 === $count ) {
			return 'repeat(1,1fr)';
		}

		$gap   = '' !== trim( $gap_value ) ? $gap_value : '0px';
		$basis = null !== $basis && '' !== trim( $basis ) ? $basis : 'var(--sgs-col-basis,16rem)';
		$max   = 'calc((100% - (' . ( $count - 1 ) . ' * ' . $gap . ')) / ' . $count . ')';

		return 'repeat(auto-fit,minmax(min(100%,max(' . $basis . ',' . $max . ')),1fr))';
	}
}

if ( ! function_exists( 'sgs_container_tier_min_column_width' ) ) {
	/**
	 * Resolve the effective intrinsic-columns BASIS (minimum column width) for one
	 * device tier, from `sgs/container`'s client-configurable `minColumnWidth` /
	 * `minColumnWidthUnit` attribute pair.
	 *
	 * `minColumnWidth` is tiered (desktop/tablet/mobile), the same shape as `gap`;
	 * `minColumnWidthUnit` is a single flat string applied to every tier, the same
	 * shape as `sgs/feature-grid`'s `minItemWidth`/`minItemWidthUnit` pair. Tiers
	 * inherit upward (mobile -> tablet -> desktop) via the canonical
	 * `sgs_resolve_tier()` cascade, matching every other responsive attribute.
	 *
	 * Returns null (never a fabricated default) when the client hasn't set a value
	 * for this tier — the caller then omits the `$basis` argument to
	 * `sgs_intrinsic_columns_track()`, which falls back to its own built-in
	 * `var(--sgs-col-basis,16rem)` default unchanged.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $tier       'desktop' | 'tablet' | 'mobile'.
	 * @return string|null A sanitised CSS length (e.g. '320px'), or null when unset.
	 */
	function sgs_container_tier_min_column_width( array $attributes, string $tier ): ?string {
		$raw      = $attributes['minColumnWidth'] ?? null;
		$resolved = sgs_resolve_tier( is_array( $raw ) ? $raw : array(), $tier, null );
		$width    = $resolved['value'];

		if ( null === $width || '' === trim( (string) $width ) ) {
			return null;
		}

		$unit = $attributes['minColumnWidthUnit'] ?? 'px';
		$unit = in_array( $unit, array( 'px', 'em', 'rem' ), true ) ? $unit : 'px';

		return absint( $width ) . $unit;
	}
}

if ( ! function_exists( 'sgs_block_wants_intrinsic_columns' ) ) {
	/**
	 * Does this block type opt in to content-aware column collapse?
	 *
	 * Declarative, read from `supports.sgs.intrinsicColumns` in the block-type
	 * registry — the same mechanism as `supports.sgs.headerEssential`. R-31-1
	 * forbids a hardcoded block-name list here, and this is deliberately opt-in
	 * rather than universal: flipping every grid container to intrinsic sizing at
	 * once would change the rendered column count of card grids, feature grids
	 * and every cloned layout on every site, none of which has been measured.
	 * A block opts in once its own behaviour has been verified.
	 *
	 * @param mixed $block WP_Block (or anything with a ->name).
	 * @return bool
	 */
	function sgs_block_wants_intrinsic_columns( $block ): bool {
		$name = ( is_object( $block ) && isset( $block->name ) ) ? (string) $block->name : '';
		if ( '' === $name || ! class_exists( 'WP_Block_Type_Registry' ) ) {
			return false;
		}
		$type = WP_Block_Type_Registry::get_instance()->get_registered( $name );
		if ( ! $type || ! isset( $type->supports['sgs']['intrinsicColumns'] ) ) {
			return false;
		}
		return (bool) $type->supports['sgs']['intrinsicColumns'];
	}
}
