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
