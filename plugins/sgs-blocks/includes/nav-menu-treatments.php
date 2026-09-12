<?php
/**
 * SGS Nav Menu (sgs/nav-menu) — the hover-TREATMENT layer + icon resolution.
 *
 * Split out of `nav-menu-css.php` (Spec 41 step 15) because BOTH CSS modules
 * and `render.php` consume these, and because the file-length limit is a real
 * gate, not a style note. Nothing here emits a whole rule set: it answers
 * "which treatment actually applies?" (the declared Sweep-eligibility
 * predicate + the resolution), emits the one shared treatment the answer can
 * select (the glyph sweep), and resolves an IconPicker object to markup.
 *
 * ⛔ The eligibility predicate is DATA, not a function —
 * `block.json::supports.sgs.sweepEligibility` is the ONE declared source, read
 * mechanically here and by `edit.js`. Neither surface re-derives the rule; a
 * new blocking input is added to the DECLARED ROW, one edit, both surfaces.
 *
 * ⚠ LOAD ORDER: NOT bootstrap-loaded — `require_once`'d per-instance from
 * render.php, matching its sibling CSS modules.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_nav_menu_sweep_eligible' ) ) {
	/**
	 * Evaluate ONE declared `sweepEligibility` row (Spec 41 FR-41-26).
	 *
	 * ⛔ This applies the three mechanical checks and NOTHING else. The rule is
	 * DATA, not a function: `block.json::supports.sgs.sweepEligibility` is the
	 * one declared source and both surfaces (this emitter and `edit.js`) read it
	 * rather than re-deriving it. A builder tempted to inline "and also check X"
	 * on one side has recreated the two-copies problem this shape exists to end.
	 * A NEW blocking input is added to the DECLARED ROW — one edit, both
	 * surfaces, automatically.
	 *
	 * @param array $attributes Block attributes (defaults already merged in).
	 * @param array $row        The declared row: blockingBackgroundAttrs /
	 *                          blockingGradientAttrs / glyphGuard.
	 * @return bool True when Sweep may be emitted for that row.
	 */
	function sgs_nav_menu_sweep_eligible( array $attributes, array $row ): bool {
		foreach ( array( 'blockingBackgroundAttrs', 'blockingGradientAttrs' ) as $bucket ) {
			$names = isset( $row[ $bucket ] ) && is_array( $row[ $bucket ] ) ? $row[ $bucket ] : array();
			foreach ( $names as $name ) {
				if ( '' !== trim( (string) ( $attributes[ (string) $name ] ?? '' ) ) ) {
					return false;
				}
			}
		}

		$guard = $row['glyphGuard'] ?? null;
		if ( is_array( $guard ) && isset( $guard['attr'] ) ) {
			$disallowed = isset( $guard['disallowedValues'] ) && is_array( $guard['disallowedValues'] )
				? array_map( 'strval', $guard['disallowedValues'] )
				: array();
			if ( in_array( (string) ( $attributes[ (string) $guard['attr'] ] ?? '' ), $disallowed, true ) ) {
				return false;
			}
		}

		return true;
	}
}

if ( ! function_exists( 'sgs_nav_menu_resolved_treatments' ) ) {
	/**
	 * Resolve every hover-treatment attribute ONCE, server-side (FR-41-26).
	 *
	 * ⛔ The predicate is re-evaluated HERE and the EMISSION is what is gated.
	 * A UI-only gate is not a gate: the predicate's inputs are OTHER attributes
	 * the operator can change AFTER choosing Sweep, so a stored `'sweep'` can
	 * outlive its own eligibility and would otherwise clip an operator's
	 * brand-new background down to the shape of the letters.
	 *
	 * ⛔ The stored value is NOT cleared — it becomes valid again the moment the
	 * blocking attribute is cleared, exactly as switching a treatment back to
	 * `Swap` restores it. Only the emission falls back to `'swap'`.
	 *
	 * ⚠ Only rows DECLARED in `sweepEligibility` are gated. `itemBorderHoverTreatment`
	 * IS declared (Spec 41 Wave 2 H1) — its Sweep is a `::after` gradient band, which
	 * can only ever render solid, so it is gated purely via `glyphGuard` against
	 * `itemBorderStyle` (dashed/dotted/etc withdraw Sweep back to `swap`); it has no
	 * `blockingBackgroundAttrs`/`blockingGradientAttrs` referent since the band isn't
	 * a `background-clip:text` glyph sweep.
	 *
	 * @param array $attributes Block attributes as handed to render.php.
	 * @return array<string,string> Resolved treatment per attribute name.
	 */
	function sgs_nav_menu_resolved_treatments( array $attributes ): array {
		$resolved = array(
			'itemColourHoverTreatment'    => 'swap',
			'itemBgHoverTreatment'        => 'swap',
			'itemBorderHoverTreatment'    => 'swap',
			'submenuColourHoverTreatment' => 'swap',
			'submenuLinkBgHoverTreatment' => 'swap',
			'burgerColourHoverTreatment'  => 'swap',
			'burgerBgHoverTreatment'      => 'swap',
		);

		$type        = null;
		$eligibility = array();
		if ( class_exists( 'WP_Block_Type_Registry' ) ) {
			$type = WP_Block_Type_Registry::get_instance()->get_registered( 'sgs/nav-menu' );
		}
		if ( $type && isset( $type->supports['sgs']['sweepEligibility'] ) && is_array( $type->supports['sgs']['sweepEligibility'] ) ) {
			$eligibility = $type->supports['sgs']['sweepEligibility'];
		}

		/*
		 * Merge the REGISTERED defaults underneath the stored attributes before
		 * evaluating. A blocking input that is simply absent from the stored set
		 * (a programmatic writer, a pattern) must still be read at its declared
		 * default — `triggerMode`'s default IS `'icon'`, which is the value its
		 * own glyphGuard disallows, so reading an absent key as '' would let a
		 * pure-icon button through the guard that exists to stop it.
		 */
		if ( $type && is_array( $type->attributes ) ) {
			$defaults = array();
			foreach ( $type->attributes as $name => $schema ) {
				if ( is_array( $schema ) && array_key_exists( 'default', $schema ) ) {
					$defaults[ $name ] = $schema['default'];
				}
			}
			$attributes = array_merge( $defaults, $attributes );
		}

		$allowed = array( 'none', 'swap', 'sweep', 'highlight' );
		foreach ( $resolved as $key => $unused ) {
			$stored = (string) ( $attributes[ $key ] ?? '' );
			if ( in_array( $stored, $allowed, true ) ) {
				$resolved[ $key ] = $stored;
			}
			if ( 'sweep' === $resolved[ $key ] && isset( $eligibility[ $key ] ) ) {
				$row = is_array( $eligibility[ $key ] ) ? $eligibility[ $key ] : array();
				if ( ! sgs_nav_menu_sweep_eligible( $attributes, $row ) ) {
					$resolved[ $key ] = 'swap';
				}
			}
		}

		return $resolved;
	}
}

if ( ! function_exists( 'sgs_nav_menu_text_sweep_css' ) ) {
	/**
	 * The glyph colour-sweep (Spec 41 FR-41-26) — the shipped
	 * `sgs/business-info` attribution-link technique, adopted rather than
	 * reinvented. Colour-only: it claims NO pseudo-element, so it never collides
	 * with the item background layer on `::before` or the border band on
	 * `::after`.
	 *
	 * Returns the base half and the hover half SEPARATELY so the caller can slot
	 * the Current-state rule between them — Current is emitted before Hover
	 * (FR-41-3 binding rule 3) and at equal specificity source order is the only
	 * tie-breaker.
	 *
	 * @param string $selector Base selector.
	 * @param string $normal   Resolved resting colour ('' = inherit).
	 * @param string $hover    Resolved hover colour (required).
	 * @return array{base: string, hover: string}
	 */
	function sgs_nav_menu_text_sweep_css( string $selector, string $normal, string $hover ): array {
		if ( '' === $selector || '' === $hover ) {
			return array(
				'base'  => '',
				'hover' => '',
			);
		}

		$rest = '' !== $normal ? $normal : 'currentColor';
		$grad = 'linear-gradient(to right,' . $hover . ' 50%,' . $rest . ' 50%)';

		/*
		 * ⛔ The `@supports not ((background-clip:text) …)` fallback is MANDATORY,
		 * not belt-and-braces: `-webkit-text-fill-color:transparent` applies on a
		 * browser that does not support the clip, so the glyphs render transparent
		 * over nothing and THE TEXT IS INVISIBLE — total content loss, not a
		 * degraded effect.
		 *
		 * ⛔ Its base rule seeds the NORMAL colour. The helper takes the FIRST
		 * gradient stop as its fallback colour, so the base call is handed the
		 * same two stops in normal-first order; the hover call keeps the real
		 * hover-first ordering. Seeding the base with HOVER would render the menu
		 * permanently hover-coloured — a state the visitor can never leave, on
		 * exactly the browsers least able to cope with it. ⛔ Do not hand-roll
		 * either rule; the shared helper is the one shape this codebase ships.
		 */
		$fallback_src = 'linear-gradient(to right,' . $rest . ' 50%,' . $hover . ' 50%)';

		$base  = $selector . '{position:relative;'
			. ( '' !== $normal ? 'color:' . $normal . ';' : '' )
			. 'background-image:' . $grad . ';'
			. 'background-size:200% 100%;background-position:100% 0;background-repeat:no-repeat;'
			. '-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;'
			. 'transition:background-position 300ms ease;}';
		// Keep both end states, drop only the travel.
		$base .= '@media (prefers-reduced-motion:reduce){' . $selector . '{transition:none;}}';
		// A supporting browser in a special mode — distinct from the @supports
		// case below, which covers a browser that never supported the mechanism.
		$base .= '@media (forced-colors:active),print{' . $selector . '{background-image:none;-webkit-text-fill-color:currentColor;}}';
		$base .= sgs_text_colour_gradient_fallback_rule( $selector, $fallback_src );

		// ⚠ The hover half still routes through sgs_hover_state_rules() — a bare
		// `{sel}:hover` here would be an unguarded hover rule, and
		// hover-guard/check.js scans the PHP emitters as well as the stylesheets.
		$hover_css  = sgs_hover_state_rules( $selector, 'background-position:0 0', ':focus-visible' );
		$hover_css .= sgs_hover_media_wrap(
			sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $selector . ':hover', $grad )
		);
		$hover_css .= sgs_text_colour_gradient_fallback_rule( $selector . ':focus-visible', $grad );

		return array(
			'base'  => $base,
			'hover' => $hover_css,
		);
	}
}

if ( ! function_exists( 'sgs_nav_menu_icon_markup' ) ) {
	/**
	 * Resolve an IconPicker `{source,name}` object to markup (Spec 41 FR-41-30).
	 *
	 * ⛔ Not a bespoke lookup — this is the SAME four-source resolution
	 * `src/blocks/icon/render.php` performs (`sgs_get_lucide_icon()` /
	 * `sgs_get_wp_icon()` / a `span.dashicons` / a literal emoji glyph), against
	 * the SAME four-value allowlist, reached from the `{source,name}` object
	 * shape `sgs/icon` already stores. Block-private for the same reason
	 * `sgs_nav_menu_typography_hover_rule()` is, and guarded for the same reason.
	 *
	 * @param mixed  $icon     The stored `{source,name}` object (anything else falls back).
	 * @param array  $fallback Default `array( 'source' => …, 'name' => … )`.
	 * @return string Icon markup, or '' when nothing resolves.
	 */
	function sgs_nav_menu_icon_markup( $icon, array $fallback ): string {
		$icon   = is_array( $icon ) ? $icon : array();
		$source = (string) ( $icon['source'] ?? $fallback['source'] );
		$name   = (string) ( $icon['name'] ?? $fallback['name'] );

		if ( ! in_array( $source, array( 'lucide', 'wp-icon', 'dashicon', 'emoji' ), true ) ) {
			$source = (string) $fallback['source'];
			$name   = (string) $fallback['name'];
		}
		if ( '' === $name ) {
			$name = (string) $fallback['name'];
		}

		switch ( $source ) {
			case 'wp-icon':
				return function_exists( 'sgs_get_wp_icon' ) ? (string) sgs_get_wp_icon( sanitize_key( $name ) ) : '';
			case 'dashicon':
				// Matches sgs/icon: the Dashicons stylesheet is only enqueued by
				// the source that needs it, never unconditionally.
				wp_enqueue_style( 'dashicons' );
				return sprintf(
					'<span class="dashicons dashicons-%s" aria-hidden="true"></span>',
					esc_attr( (string) preg_replace( '/[^a-z0-9-]/', '', strtolower( $name ) ) )
				);
			case 'emoji':
				return esc_html( wp_strip_all_tags( $name ) );
			case 'lucide':
			default:
				return (string) sgs_get_lucide_icon( sanitize_key( $name ) );
		}
	}
}
