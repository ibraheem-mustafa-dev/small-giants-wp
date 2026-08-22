<?php
/**
 * Colour-variant emitters — the PHP half of the five-variant colour family.
 *
 * File: helpers-colour-variants.php
 *
 * WHY THIS EXISTS. Each block currently hand-writes its own colour CSS. Measured
 * 2026-08-22: 3,951 lines of inline colour-row JSX across 64 blocks, each paired with
 * bespoke render.php paint. That bespoke paint is ALSO why a codemod could only reach
 * 14% of non-conformant rows — most blocks emit colour into a colour-valued CSS custom
 * property (`--sgs-mm-card`), and a gradient cannot live in one: a gradient is
 * `background-image`, a different CSS property entirely. The ceiling was a CONSEQUENCE
 * of hand-rolled paint, not a fact about the blocks. A shared emitter owns the paint,
 * so gradient + hover come free at every adoption site.
 *
 * ⛔ FAÇADE OVER PROVEN PRIMITIVES, NOT NEW PAINT CODE. Everything below delegates:
 *   sgs_background_paint_decl()  — resolves colour-or-gradient to ONE declaration,
 *                                  emitting background-image for a gradient and
 *                                  background-color otherwise, '' when neither is set.
 *   sgs_emit_state_colour_css()  — wraps declarations into `{sel}{…}` plus
 *                                  `{sel}:hover,{sel}:focus-visible{…}`.
 * Both are already load-bearing across the tree. This file adds a uniform contract,
 * not a second paint implementation.
 *
 * ATTRIBUTE NAMES ARE THE CALLER'S (Bean's ruling 2026-08-22): the map is passed in,
 * so sgs/nav-menu keeps `navBg` and sgs/media keeps `boxShadowColour`. No renames, no
 * stored-content migration.
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

/**
 * Build the FILL (background) DECLARATIONS for a block, per state.
 *
 * ⛔ RETURNS DECLARATIONS, NOT FINISHED CSS — and that is not a style preference, it
 * is what adoption revealed. The first version of this helper emitted its own
 * `{sel}{…}` rule. Attempting to adopt it in sgs/info-box showed why that is wrong:
 * that block collects FILL, TEXT and BORDER into one `$sgs_hover_decls` array and
 * emits them in a SINGLE rule (render.php:393-394). A helper that owns its own rule
 * would have split fill into a separate rule block — computed-equivalent, but not
 * byte-identical output and more CSS on every page. Real blocks compose variants into
 * shared rules, so the helper must hand back parts, not a finished rule.
 *
 * This is why the five variants are proven ONE AT A TIME against a real adoption
 * rather than designed as a set: the signature was wrong and only contact with a
 * caller showed it.
 *
 * @param array $attributes The block's attributes.
 * @param array $map        The block's OWN attribute names (Bean's ruling: helpers
 *                          adapt to existing names, nothing is renamed):
 *                          [ 'base' => 'navBg', 'hover' => 'navBgHover',
 *                            'gradient' => 'navBgGradient', 'hover_gradient' => '…' ]
 *                          Only 'base' is required; the rest are optional.
 * @return array{normal: string[], hover: string[]} Declarations per state. Both
 *                          arrays empty when nothing is set, so a caller can merge
 *                          unconditionally and an unset block emits no rule at all.
 */
function sgs_fill_decls( array $attributes, array $map ): array {
	$empty = array(
		'normal' => array(),
		'hover'  => array(),
	);

	if ( empty( $map['base'] ) ) {
		return $empty;
	}

	$read = static function ( ?string $key ) use ( $attributes ): string {
		if ( ! $key ) {
			return '';
		}
		return isset( $attributes[ $key ] ) ? (string) $attributes[ $key ] : '';
	};

	$out = $empty;

	$decl_normal = sgs_background_paint_decl(
		$read( $map['base'] ),
		$read( $map['gradient'] ?? null )
	);
	if ( '' !== $decl_normal ) {
		$out['normal'][] = $decl_normal;
	}

	$decl_hover = sgs_background_paint_decl(
		$read( $map['hover'] ?? null ),
		$read( $map['hover_gradient'] ?? null )
	);
	if ( '' !== $decl_hover ) {
		$out['hover'][] = $decl_hover;
	}

	return $out;
}

/**
 * Convenience wrapper for a block that DOES own its own rule for this variant alone.
 *
 * Most blocks should call sgs_fill_decls() and compose — see the note above. This
 * exists so the single-variant case is not forced to hand-roll the emit call.
 *
 * @param string $selector   The block's OWN scoped selector.
 * @param array  $attributes The block's attributes.
 * @param array  $map        The block's own attribute names (see sgs_fill_decls).
 * @return string CSS, or '' when nothing is set.
 */
function sgs_fill_states_css( string $selector, array $attributes, array $map ): string {
	if ( '' === $selector ) {
		return '';
	}

	$decls = sgs_fill_decls( $attributes, $map );

	if ( ! $decls['normal'] && ! $decls['hover'] ) {
		return '';
	}

	return sgs_emit_state_colour_css( $selector, $decls['normal'], $decls['hover'] );
}

/**
 * Build the TEXT DECLARATIONS for a block, per state.
 *
 * ⛔ TEXT IS NOT FILL WITH A DIFFERENT PROPERTY. A text GRADIENT needs
 * `background-clip:text`, a different CSS mechanism from painting a background, so this
 * cannot delegate to sgs_background_paint_decl(). It uses
 * sgs_resolve_text_colour_or_gradient(), which returns the GRADIENT when one is set and
 * valid and the flat colour otherwise.
 *
 * ⚠ THE GRADIENT CASE NEEDS A COMPANION RULE THE CALLER MUST EMIT. A resolved gradient
 * is not a `color:` value — painting it requires the background-clip:text rule that
 * sgs_text_colour_gradient_fallback_rule( $selector, $value ) produces. This function
 * deliberately returns only the declarations it can honestly own; a caller that supports
 * text gradients must also emit that rule. Silently returning a `color:linear-gradient(…)`
 * declaration would be invalid CSS the browser drops — the exact silent-no-op class this
 * family exists to remove.
 *
 * @param array $attributes The block's attributes.
 * @param array $map        The block's OWN attribute names:
 *                          [ 'base' => 'titleColour', 'hover' => 'titleColourHover',
 *                            'gradient' => '…', 'hover_gradient' => '…' ].
 * @return array{normal: string[], hover: string[]} Declarations per state; both empty
 *                          when nothing is set.
 */
function sgs_text_decls( array $attributes, array $map ): array {
	$out = array(
		'normal' => array(),
		'hover'  => array(),
	);

	if ( empty( $map['base'] ) ) {
		return $out;
	}

	$read = static function ( ?string $key ) use ( $attributes ): string {
		if ( ! $key ) {
			return '';
		}
		return isset( $attributes[ $key ] ) ? (string) $attributes[ $key ] : '';
	};

	$normal = sgs_resolve_text_colour_or_gradient(
		$read( $map['base'] ),
		$read( $map['gradient'] ?? null )
	);
	if ( '' !== $normal ) {
		$out['normal'][] = 'color:' . sgs_colour_value( $normal );
	}

	$hover = sgs_resolve_text_colour_or_gradient(
		$read( $map['hover'] ?? null ),
		$read( $map['hover_gradient'] ?? null )
	);
	if ( '' !== $hover ) {
		$out['hover'][] = 'color:' . sgs_colour_value( $hover );
	}

	return $out;
}

/**
 * Emit the BORDER-colour CSS for a block, both states, at one selector.
 *
 * ⛔ THE ONLY VARIANT THAT RETURNS FINISHED CSS RATHER THAN DECLARATIONS, and it is not
 * an inconsistency for convenience. Its primitive,
 * sgs_border_gradient_css( $selector, $normal_paint, $hover_paint, $width ), takes BOTH
 * STATES IN ONE CALL: a border gradient is painted with a border-image/background
 * technique that has to know both states together, so there is no honest way to hand
 * back a per-state declaration list. The shape follows the underlying mechanism.
 *
 * @param string $selector   The block's OWN scoped selector. Never derived here —
 *                           `derived_selector` in the DB is not a CSS selector (verified:
 *                           none of its values exist as classes in the tree).
 * @param array  $attributes The block's attributes.
 * @param array  $map        The block's OWN attribute names, plus optional 'width'.
 * @return string CSS, or '' when nothing is set.
 */
function sgs_border_states_css( string $selector, array $attributes, array $map ): string {
	if ( '' === $selector || empty( $map['base'] ) ) {
		return '';
	}

	$read = static function ( ?string $key ) use ( $attributes ): string {
		if ( ! $key ) {
			return '';
		}
		return isset( $attributes[ $key ] ) ? (string) $attributes[ $key ] : '';
	};

	$normal_paint = sgs_resolve_text_colour_or_gradient(
		$read( $map['base'] ),
		$read( $map['gradient'] ?? null )
	);
	$hover_paint  = sgs_resolve_text_colour_or_gradient(
		$read( $map['hover'] ?? null ),
		$read( $map['hover_gradient'] ?? null )
	);

	if ( '' === $normal_paint && '' === $hover_paint ) {
		return '';
	}

	return sgs_border_gradient_css(
		$selector,
		$normal_paint,
		'' !== $hover_paint ? $hover_paint : null,
		! empty( $map['width'] ) ? (string) $map['width'] : '2px'
	);
}

/**
 * Build the OVERLAY DECLARATIONS for a block, per state.
 *
 * ⛔ WHY THIS EXISTS WHEN sgs_overlay_decls() ALREADY DOES. That one takes VALUES
 * ( $colour, $gradient, $opacity, $blend_mode ) — it is a PRIMITIVE, so every installing
 * block hand-reads four attributes and passes them positionally. This is the FAÇADE:
 * the block passes its own attribute NAMES once, matching sgs_fill_decls/sgs_text_decls,
 * so installing overlay somewhere new is one call rather than four reads plus a call.
 * Bean 2026-08-22: "I want that and the shadow control to be in a helper so it's easy to
 * install them in new places and we don't need to keep rebuilding those 2 variants."
 *
 * The JS half needed no equivalent: GradientOverlayControl already takes an `attrNames`
 * map. Overlay was half-installable — JS yes, PHP no.
 *
 * @param array $attributes The block's attributes.
 * @param array $map        The block's OWN attribute names. Keys mirror
 *                          GradientOverlayControl's attrNames so one map can drive both
 *                          halves: [ 'solid', 'gradient', 'solid_hover',
 *                          'gradient_hover', 'opacity', 'blend_mode' ].
 * @return array{normal: string[], hover: string[]} Declarations per state; both empty
 *                          when nothing is set.
 */
function sgs_overlay_decls_for( array $attributes, array $map ): array {
	$out = array(
		'normal' => array(),
		'hover'  => array(),
	);

	$read = static function ( ?string $key ) use ( $attributes ) {
		if ( ! $key ) {
			return null;
		}
		return $attributes[ $key ] ?? null;
	};

	// Opacity and blend mode belong to the RESTING overlay only. They are not
	// per-state: there is one opacity attribute, and duplicating it per state would be
	// two attributes owning one value — the shape Bean rejected for the overlay
	// boolean (S-2). A hover overlay changes its PAINT, not its transparency.
	$normal = sgs_overlay_decls(
		$read( $map['solid'] ?? null ),
		$read( $map['gradient'] ?? null ),
		$read( $map['opacity'] ?? null ),
		$read( $map['blend_mode'] ?? null )
	);
	if ( '' !== $normal ) {
		$out['normal'][] = $normal;
	}

	$hover = sgs_overlay_decls(
		$read( $map['solid_hover'] ?? null ),
		$read( $map['gradient_hover'] ?? null ),
		null,
		null
	);
	if ( '' !== $hover ) {
		$out['hover'][] = $hover;
	}

	return $out;
}

/**
 * Build the SHADOW DECLARATIONS for a block, per state.
 *
 * Façade over sgs_shadow_value_composed( $shape, $colour ), which takes VALUES. Same
 * reason as the overlay façade above: installing shadow somewhere new should be one
 * call with the block's own attribute names, not four reads and two compositions.
 *
 * ⛔ SHADOW IS GRADIENT-EXEMPT BY MECHANISM, and there is deliberately no gradient key
 * in the map. `box-shadow` takes a colour; a gradient there is invalid CSS the browser
 * drops. rule 31 already encodes this exemption centrally so it is never declared
 * per block.
 *
 * ⭐ THE HOVER SHAPE IS A REAL KEY, not a copy of the resting one. Bean's full-symmetry
 * ruling (2026-08-22) is that a hover shadow can LIFT, GROW and SOFTEN, not merely
 * recolour — so 'hover' names the hover SHAPE attribute and 'hover_colour' its colour.
 * A caller supplying only 'hover_colour' still gets a hover rule, composed against the
 * RESTING shape, which is the pre-symmetry behaviour and remains valid.
 *
 * @param array $attributes The block's attributes.
 * @param array $map        The block's OWN attribute names:
 *                          [ 'base' => 'boxShadow', 'colour' => 'boxShadowColour',
 *                            'hover' => 'boxShadowHover', 'hover_colour' => '…' ].
 * @return array{normal: string[], hover: string[]} Declarations per state; both empty
 *                          when nothing is set.
 */
function sgs_shadow_decls( array $attributes, array $map ): array {
	$out = array(
		'normal' => array(),
		'hover'  => array(),
	);

	if ( empty( $map['base'] ) ) {
		return $out;
	}

	$read = static function ( ?string $key ) use ( $attributes ): string {
		if ( ! $key ) {
			return '';
		}
		return isset( $attributes[ $key ] ) ? (string) $attributes[ $key ] : '';
	};

	$base_shape = $read( $map['base'] );

	$normal = sgs_shadow_value_composed( $base_shape, $read( $map['colour'] ?? null ) );
	if ( '' !== $normal ) {
		$out['normal'][] = 'box-shadow:' . $normal;
	}

	// Fall back to the resting SHAPE when only a hover colour is wired — see the
	// note above. Without this a caller that has not yet adopted the hover shape
	// would silently lose its existing hover-colour behaviour.
	$hover_shape  = $read( $map['hover'] ?? null );
	$hover_colour = $read( $map['hover_colour'] ?? null );
	if ( '' !== $hover_shape || '' !== $hover_colour ) {
		$hover = sgs_shadow_value_composed(
			'' !== $hover_shape ? $hover_shape : $base_shape,
			'' !== $hover_colour ? $hover_colour : $read( $map['colour'] ?? null )
		);
		if ( '' !== $hover ) {
			$out['hover'][] = 'box-shadow:' . $hover;
		}
	}

	return $out;
}
