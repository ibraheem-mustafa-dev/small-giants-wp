<?php
/**
 * Colour-variant emitters — the PHP half of the five-variant colour family.
 *
 * File: helpers-colour-variants.php
 *
 * WHY THIS EXISTS. Hand-written per-block colour CSS cannot carry a gradient: most
 * blocks emit colour into a colour-valued CSS custom property (`--sgs-mm-card`), and a
 * gradient cannot live in one — a gradient is `background-image`, a different CSS
 * property entirely. A shared emitter owns the paint,
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
 * ATTRIBUTE NAMES ARE THE CALLER'S: the map is passed in,
 * so sgs/nav-bar-menu keeps `navBg` and sgs/media keeps `boxShadowColour`. No renames, no
 * stored-content migration.
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

/**
 * Build the FILL (background) DECLARATIONS for a block, per state.
 *
 * ⛔ RETURNS DECLARATIONS, NOT FINISHED CSS. A block such as sgs/info-box collects
 * FILL, TEXT and BORDER into one `$sgs_hover_decls` array and emits them in a SINGLE
 * rule. A helper that owned its own `{sel}{…}` rule would split fill into a separate
 * rule block — computed-equivalent, but more CSS on every page. Real blocks compose
 * variants into shared rules, so the helper hands back parts, not a finished rule.
 *
 * @param array $attributes The block's attributes.
 * @param array $map        The block's OWN attribute names (helpers
 *                          adapt to existing names, nothing is renamed):
 *                          [ 'base' => 'navBg', 'hover' => 'navBgHover',
 *                            'gradient' => 'navBgGradient', 'hover_gradient' => '…',
 *                            'current' => '…', 'current_gradient' => '…' ]
 *                          Only 'base' is required; the rest are optional. 'current'
 *                          (Spec 41 FR-41-3(b)) is the Current/`[aria-current="page"]`
 *                          state — populated only when the caller's map carries it.
 * @return array{normal: string[], hover: string[], current: string[]} Declarations
 *                          per state. All three arrays empty when nothing is set, so
 *                          a caller can merge unconditionally and an unset block
 *                          emits no rule at all.
 */
function sgs_fill_decls( array $attributes, array $map ): array {
	$empty = array(
		'normal'  => array(),
		'hover'   => array(),
		'current' => array(),
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

	// Current state (Spec 41 FR-41-3(b)) — populated ONLY when the caller's
	// $map carries a 'current' key, so an unmigrated caller's returned array
	// keeps an empty 'current' bucket and behaves exactly as today.
	if ( isset( $map['current'] ) ) {
		$decl_current = sgs_background_paint_decl(
			$read( $map['current'] ?? null ),
			$read( $map['current_gradient'] ?? null )
		);
		if ( '' !== $decl_current ) {
			$out['current'][] = $decl_current;
		}
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

	if ( ! $decls['normal'] && ! $decls['hover'] && ! $decls['current'] ) {
		return '';
	}

	$extra_states = array();
	if ( $decls['current'] ) {
		$extra_states['current'] = array(
			'suffix'  => '[aria-current="page"]',
			'decls'   => $decls['current'],
			'guarded' => false,
		);
	}

	return sgs_emit_state_colour_css( $selector, $decls['normal'], $decls['hover'], $extra_states );
}

/**
 * Build the TEXT DECLARATIONS for a block, per state.
 *
 * ⛔ TEXT IS NOT FILL WITH A DIFFERENT PROPERTY. A text GRADIENT needs
 * `background-clip:text`, a different CSS mechanism from painting a background, so this
 * cannot delegate to sgs_background_paint_decl(). It uses
 * sgs_resolve_text_colour_or_gradient(), which returns the GRADIENT when one is set and
 * valid and the flat colour otherwise, and sgs_text_colour_decl() to turn that resolved
 * value into the correct declaration set for either case (a bare `color:` for a flat
 * value, or the full background-image/background-clip/color:transparent set for a
 * gradient). Building `'color:' . sgs_colour_value(...)`
 * directly is only correct for a flat value; fed a resolved gradient string it
 * produces invalid CSS (`color:linear-gradient(...)`) that the browser silently drops,
 * and the MANDATORY companion rule below cannot fix a wrong primary declaration.
 *
 * ⚠ THE GRADIENT CASE STILL NEEDS A COMPANION RULE THE CALLER MUST EMIT — this is a
 * structural limitation of the return shape (per-state declaration ARRAYS for one
 * `{sel}{…}` rule), not something the fix above can close: a resolved gradient's
 * `@supports not (background-clip:text)` fallback is a SEPARATE standalone rule, which
 * cannot live inside a declaration array. A caller that supports text gradients must
 * also call sgs_text_colour_gradient_fallback_rule( $selector, $value ) — or, for the
 * common case of a block that owns its own standalone rule for this row, prefer
 * sgs_text_states_css() below instead, which handles the whole sequence (both states,
 * both fallback rules) for you.
 *
 * @param array $attributes The block's attributes.
 * @param array $map        The block's OWN attribute names:
 *                          [ 'base' => 'titleColour', 'hover' => 'titleColourHover',
 *                            'gradient' => '…', 'hover_gradient' => '…',
 *                            'current' => '…', 'current_gradient' => '…' ].
 *                          'current' (Spec 41 FR-41-3(b)) is the Current/
 *                          `[aria-current="page"]` state — populated only when the
 *                          caller's map carries it.
 * @return array{normal: string[], hover: string[], current: string[]} Declarations
 *                          per state; all three empty when nothing is set.
 */
function sgs_text_decls( array $attributes, array $map ): array {
	$out = array(
		'normal'  => array(),
		'hover'   => array(),
		'current' => array(),
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

	$normal      = sgs_resolve_text_colour_or_gradient(
		$read( $map['base'] ),
		$read( $map['gradient'] ?? null )
	);
	$normal_decl = sgs_text_colour_decl( $normal );
	if ( '' !== $normal_decl ) {
		$out['normal'][] = $normal_decl;
	}

	$hover      = sgs_resolve_text_colour_or_gradient(
		$read( $map['hover'] ?? null ),
		$read( $map['hover_gradient'] ?? null )
	);
	$hover_decl = sgs_text_colour_decl( $hover );
	if ( '' !== $hover_decl ) {
		$out['hover'][] = $hover_decl;
	}

	// Current state (Spec 41 FR-41-3(b)) — populated ONLY when the caller's
	// $map carries a 'current' key, so an unmigrated caller's returned array
	// keeps an empty 'current' bucket and behaves exactly as today.
	if ( isset( $map['current'] ) ) {
		$current      = sgs_resolve_text_colour_or_gradient(
			$read( $map['current'] ?? null ),
			$read( $map['current_gradient'] ?? null )
		);
		$current_decl = sgs_text_colour_decl( $current );
		if ( '' !== $current_decl ) {
			$out['current'][] = $current_decl;
		}
	}

	return $out;
}

/**
 * Convenience wrapper for a block that DOES own its own rule for this text-colour row
 * alone — the sgs_fill_states_css() sibling for text. Resolves both states, emits the
 * `{sel}{…}` / touch-guarded `:hover`,`:focus-visible` pair via sgs_emit_state_colour_css(),
 * AND emits both mandatory gradient fallback rules — the step every hand-rolled caller of
 * sgs_text_decls() had to remember separately (see sgs_text_decls()'s own docblock
 * above). Prefer this over hand-rolling
 * the sequence for a new adoption; sgs_text_decls() + sgs_text_colour_gradient_fallback_rule()
 * stay available directly only for a block that must compose text declarations into a
 * shared rule with fill/border (the same reason sgs_fill_decls() returns declarations, not
 * finished CSS — see that function's own docblock).
 *
 * @param string $selector   The block's OWN scoped selector.
 * @param array  $attributes The block's attributes.
 * @param array  $map        The block's own attribute names (see sgs_text_decls).
 * @return string CSS, or '' when nothing is set.
 */
function sgs_text_states_css( string $selector, array $attributes, array $map ): string {
	if ( '' === $selector || empty( $map['base'] ) ) {
		return '';
	}

	$read = static function ( ?string $key ) use ( $attributes ): string {
		if ( ! $key ) {
			return '';
		}
		return isset( $attributes[ $key ] ) ? (string) $attributes[ $key ] : '';
	};

	$normal_resolved = sgs_resolve_text_colour_or_gradient(
		$read( $map['base'] ),
		$read( $map['gradient'] ?? null )
	);
	$hover_resolved  = sgs_resolve_text_colour_or_gradient(
		$read( $map['hover'] ?? null ),
		$read( $map['hover_gradient'] ?? null )
	);

	$decls = sgs_text_decls( $attributes, $map );

	$extra_states = array();
	if ( $decls['current'] ) {
		$extra_states['current'] = array(
			'suffix'  => '[aria-current="page"]',
			'decls'   => $decls['current'],
			'guarded' => false,
		);
	}

	$css = '';
	if ( $decls['normal'] || $decls['hover'] || $decls['current'] ) {
		$css .= sgs_emit_state_colour_css( $selector, $decls['normal'], $decls['hover'], $extra_states );
	}

	$css .= sgs_text_colour_gradient_fallback_rule( $selector, $normal_resolved );
	if ( '' !== $hover_resolved && $hover_resolved !== $normal_resolved ) {
		$css .= sgs_hover_media_wrap(
			sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $selector . ':hover', $hover_resolved )
		) . sgs_text_colour_gradient_fallback_rule( $selector . ':focus-visible', $hover_resolved );
	}

	return $css;
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
 * @param array  $map        The block's OWN attribute names, plus optional 'width' and
 *                           'current' (Spec 41 FR-41-3(c) — the Current/
 *                           `[aria-current="page"]` state, FLAT-PATH ONLY: it is
 *                           gradient-exempt at the ring level, because
 *                           sgs_border_gradient_css() composes exactly two paints and
 *                           has no slot for a third), and 'suppress_edges' (Spec 41
 *                           FR-41-8, v0.4.7 — a box object
 *                           `[ 'top' => bool, 'right' => bool, 'bottom' => bool,
 *                           'left' => bool ]`, absent key/edge = false). FLAT-PATH
 *                           ONLY, same gradient exemption as 'current': the masked
 *                           `::before` ring `sgs_border_gradient_css()` builds has no
 *                           per-edge concept, so 'suppress_edges' is silently ignored
 *                           on that path. On the flat path it affects ONLY the
 *                           non-resting rules (hover, Current) — the resting rule
 *                           always keeps the plain `border-color` shorthand. When any
 *                           edge is suppressed, a non-resting rule emits per-edge
 *                           `border-<edge>-color` longhands for the unsuppressed
 *                           edges only (top/right/bottom/left order); when every edge
 *                           is suppressed, no non-resting rule is emitted at all.
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

	// ⚠ `sgs_resolve_text_colour_or_gradient()` returns the FLAT value VERBATIM
	// when no gradient is set -- its docblock says so, because its other callers
	// (`sgs_text_colour_decl()`) resolve tokens themselves. This helper does not:
	// it feeds the value straight into `background:` inside the masked ::before
	// ring, where a palette SLUG is invalid CSS the browser silently drops --
	// and the ring also sets `border-color:transparent`, so the border vanishes
	// entirely. `borderColour:
	// "primary"` would emit `background:primary` and paint nothing; a raw hex
	// works, so the failure only shows with a palette token.
	//
	// So: when the resolver fell through to the flat value, run it through
	// `sgs_colour_value()` (slug -> var(--wp--preset--color--…), raw colour
	// passes through unchanged). A gradient is already a paintable value and is
	// left untouched.
	$normal_flat  = $read( $map['base'] );
	$normal_paint = sgs_resolve_text_colour_or_gradient(
		$normal_flat,
		$read( $map['gradient'] ?? null )
	);
	if ( '' !== $normal_paint && $normal_paint === $normal_flat ) {
		$normal_paint = sgs_colour_value( $normal_paint );
	}

	$hover_flat  = $read( $map['hover'] ?? null );
	$hover_paint = sgs_resolve_text_colour_or_gradient(
		$hover_flat,
		$read( $map['hover_gradient'] ?? null )
	);
	if ( '' !== $hover_paint && $hover_paint === $hover_flat ) {
		$hover_paint = sgs_colour_value( $hover_paint );
	}

	// Current state (Spec 41 FR-41-3(c)) — FLAT-PATH ONLY, resolved here so the
	// early-return below already accounts for it. There is no 'current_gradient'
	// key: the ring primitive that a border gradient requires takes exactly two
	// paints, so Current is gradient-exempt at the ring level (see the fork
	// below) and this value is simply never consulted on that path.
	$current_flat  = $read( $map['current'] ?? null );
	$current_paint = sgs_resolve_text_colour_or_gradient( $current_flat, '' );
	if ( '' !== $current_paint && $current_paint === $current_flat ) {
		$current_paint = sgs_colour_value( $current_paint );
	}

	if ( '' === $normal_paint && '' === $hover_paint && '' === $current_paint ) {
		return '';
	}

	// ── FLAT COLOUR vs GRADIENT ────────────────────────────────────────────
	// A gradient CANNOT be a `border-color` value in CSS, so painting one needs
	// the masked ::before ring below — which necessarily sets
	// `border-color:transparent` on the element itself. That is correct FOR A
	// GRADIENT.
	//
	// It is wrong for a FLAT colour: running the ring unconditionally would leave
	// a client's flat border colour unreadable as `border-color`, with the
	// transparent border it leaves behind as the only thing painted.
	//
	// So: ring ONLY when a gradient is actually set. A flat colour emits
	// `border-color` directly, which is also cheaper — no pseudo-element, no
	// position:relative, no background-clip — and leaves `border-color`
	// readable by anything that inspects it.
	$has_gradient = ( '' !== $read( $map['gradient'] ?? null ) )
		|| ( '' !== $read( $map['hover_gradient'] ?? null ) );

	if ( ! $has_gradient ) {
		// suppress_edges (Spec 41 FR-41-8, v0.4.7) — FLAT-PATH ONLY, box-object
		// shaped exactly like every other 4-side attr in the tree. Absent
		// key/edge behaves as false. Governs ONLY the non-resting rules below;
		// the resting rule above keeps its shorthand unconditionally.
		$suppress_map = ( ! empty( $map['suppress_edges'] ) && is_array( $map['suppress_edges'] ) ) ? $map['suppress_edges'] : array();
		$box_edges    = array( 'top', 'right', 'bottom', 'left' );
		$active_edges = array();
		foreach ( $box_edges as $edge ) {
			if ( empty( $suppress_map[ $edge ] ) ) {
				$active_edges[] = $edge;
			}
		}
		$any_suppressed = count( $active_edges ) < count( $box_edges );

		// Builds the NON-RESTING declaration string for one resolved paint —
		// the flat `border-color:X;` shorthand when nothing is suppressed
		// (identical to the behaviour without suppress_edges), the unsuppressed
		// edges' `border-<edge>-color:X;` longhands when some are, or '' when
		// every edge is suppressed (no rule at all, not an empty one).
		$non_resting_decl = static function ( string $paint ) use ( $any_suppressed, $active_edges ): string {
			if ( ! $active_edges ) {
				return '';
			}
			if ( ! $any_suppressed ) {
				return 'border-color:' . $paint . ';';
			}
			$decls = '';
			foreach ( $active_edges as $edge ) {
				$decls .= 'border-' . $edge . '-color:' . $paint . ';';
			}
			return $decls;
		};

		$css = '';
		if ( '' !== $normal_paint ) {
			$css .= $selector . '{border-color:' . $normal_paint . ';}';
		}
		// Current is emitted BEFORE the hover pair (Spec 41 FR-41-3, binding
		// rule 3) and is never guarded — it is not pointer-dependent.
		if ( '' !== $current_paint ) {
			$current_decl = $non_resting_decl( $current_paint );
			if ( '' !== $current_decl ) {
				$css .= $selector . '[aria-current="page"]{' . $current_decl . '}';
			}
		}
		if ( '' !== $hover_paint && $hover_paint !== $normal_paint ) {
			$hover_decl = $non_resting_decl( $hover_paint );
			if ( '' !== $hover_decl ) {
				// :focus-within paired with :hover so keyboard users reach the
				// same state as mouse users — the same reasoning
				// sgs_border_gradient_css() applies.
				$css .= sgs_hover_state_rules( $selector, $hover_decl, ':focus-within' );
			}
		}
		return $css;
	}

	// Current is gradient-exempt at the ring level: sgs_border_gradient_css()
	// composes exactly two paints into one masked ::before construction, and a
	// border gradient has no single hex to add a third paint alongside. Silently
	// omitted here rather than attempted (Spec 41 FR-41-3(c)).
	//
	// suppress_edges is ALSO silently ignored here, for the same structural
	// reason: the masked ::before ring paints one uniform ring, with no
	// per-edge concept to suppress — a per-edge request on this path is
	// unexpressible, not merely unimplemented (Spec 41 FR-41-8, v0.4.7).

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
 *
 * The JS half needs no equivalent: GradientOverlayControl already takes an `attrNames`
 * map.
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
	// two attributes owning one value. A hover overlay changes its PAINT, not its
	// transparency.
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
 * Derive ONE of a shadow family's attribute names from its base name.
 *
 * The standard helper pair for `ShadowControl`, mirroring the shape
 * `sgs_typography_attr()` has had all along — see
 * `check-control-helper-parity.py` for why every shared control owes one.
 *
 * ⭐ THE RULES ARE ENUMERATED, NOT GENERALISED — generalising gets one WRONG.
 * Every `attrNames` map in the tree was listed and each rule tested
 * against every row carrying the key:
 *   • `colour`       = `<base>Colour`      — holds **22/22**
 *   • `hover_colour` = `<base>ColourHover` — holds **10/10**
 *   • `hover`        = `<base>Hover`       — **0 editor mounts use it.**
 *     `sgs_shadow_decls()` accepts a hover SHAPE (full symmetry: a hover shadow
 *     can LIFT, GROW and SOFTEN) but nothing passes one yet; available, not proven.
 * ⛔ The colour rule is NOT `<base>HoverColour`: `sgs/button`'s
 * `boxShadowHoverColour` belongs to a SEPARATE family whose base IS
 * `boxShadowHover`, so it is `<base>Colour` there too. The guessed rule scores
 * **0/10** against the real corpus. This is why R-31-1 wants an enumeration
 * before a rule replaces a list.
 *
 * @param string $base Base attribute name, e.g. 'boxShadow' or 'cardShadow'.
 * @param string $part One of 'base' | 'colour' | 'hover' | 'hover_colour'.
 * @return string The attribute key, or '' for an unknown part.
 */
function sgs_shadow_attr( string $base, string $part = 'base' ): string {
	if ( '' === $base ) {
		return '';
	}
	switch ( $part ) {
		case 'base':
			return $base;
		case 'colour':
			return $base . 'Colour';
		case 'hover':
			return $base . 'Hover';
		case 'hover_colour':
			return $base . 'ColourHover';
	}
	return '';
}

/**
 * The full attribute-name map for a shadow family, ready for sgs_shadow_decls().
 *
 * Replaces a hand-written array literal at each call site. Hand-writing it is
 * how a caller pairs the wrong colour attr with a shape attr — the shape of
 * mistake where a PHP roster and a JS roster of the same names drift apart.
 *
 * The JS twin is `shadowAttrKeys()` in `src/components/ShadowControl.js`;
 * both derive from the same rule, so a block declares its base name ONCE.
 *
 * ⛔ THE HOVER PAIR IS OPT-IN, and the survey is why. Blocks mounting this
 * control carry THREE family shapes, not one: resting-only (`boxShadow` +
 * `boxShadowColour`), resting+hover (`sgs/button`, `sgs/quote`), and HOVER-ONLY
 * (`shadowHover` + `shadowHoverColour` — `sgs/info-box`, `sgs/testimonial`,
 * `sgs/card-grid`'s second family). On that third shape an unconditional map
 * derives `shadowHoverHover`. Harmless HERE, because `sgs_shadow_decls()` reads
 * a missing attribute as '' — but the JS twin BINDS every key it is handed, so
 * the same unconditional map renders an editor control wired to an attribute the
 * block never declares, and WordPress silently discards writes to those.
 * The two sides must carry the SAME opt-in or the pair stops being one rule.
 *
 * @param string $base       Base attribute name, e.g. 'boxShadow'.
 * @param bool   $with_hover_shape  Include the hover SHAPE key. Default false.
 * @param bool   $with_hover_colour Include the hover COLOUR key. Default false.
 * @return array{base:string, colour:string, hover?:string, hover_colour?:string}
 */
function sgs_shadow_attr_map( string $base, bool $with_hover_shape = false, bool $with_hover_colour = false ): array {
	$map = array(
		'base'   => sgs_shadow_attr( $base, 'base' ),
		'colour' => sgs_shadow_attr( $base, 'colour' ),
	);
	// INDEPENDENT flags — the corpus has them independently: 10 editor mounts
	// carry a hover COLOUR and zero carry a hover SHAPE. Folding them into one
	// flag would name an attribute the block never declares.
	if ( $with_hover_shape ) {
		$map['hover'] = sgs_shadow_attr( $base, 'hover' );
	}
	if ( $with_hover_colour ) {
		$map['hover_colour'] = sgs_shadow_attr( $base, 'hover_colour' );
	}
	return $map;
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
 * ⭐ THE HOVER SHAPE IS A REAL KEY, not a copy of the resting one. A hover shadow
 * can LIFT, GROW and SOFTEN, not merely recolour — so 'hover' names the hover SHAPE
 * attribute and 'hover_colour' its colour. A caller supplying only 'hover_colour'
 * still gets a hover rule, composed against the RESTING shape.
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
