<?php
/**
 * SGS motion — cursor grid-dot field per-instance colour (Spec 38 FR-38-33).
 *
 * Resolves `data-sgs-fx-grid-colour` into the `--sgs-fx-grid-dot-colour`
 * custom property, scoped to the one block instance that set it.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 * The effect shipped on 2026-08-28 with NO colour control and an ACCENT
 * default. Measured live on the canary: accent `#F59E0B` on the client's cream
 * section background `#FBF3DC` is **1.35:1**, at 34% rest opacity. Bean's
 * report: "very hard to even see them". That is WORSE than the 1.44:1 particle
 * trail of D846 — the incident the effect's own stylesheet comment cited as its
 * reason for stating a default at all.
 *
 * Two things were wrong and both are fixed:
 *   1. The DEFAULT. A brand ACCENT is a ground, never an indicator — accents
 *      are picked to sit behind content, so they are mid-luminance by
 *      construction and fail on light AND dark surfaces. The default is now
 *      `primary`.
 *   2. The ABSENCE OF A CONTROL. A default cannot be right for every client
 *      palette. This file is the escape hatch.
 *
 * ⚠ CORRECTED 2026-08-28 — point 1 above used to end "(~7:1 on that same
 * cream)". That figure was measured on the stylesheet's FALLBACK teal
 * `#1F7A7A`, then written as though it described `primary`. `primary` is not a
 * colour; it is whatever the client's palette says. On this very canary it is
 * `#e68a95`, which measures **2.25:1** on the cream — better than the accent it
 * replaced, nowhere near 7:1. A token's contrast is a per-client fact and must
 * never be quoted as a fixed property of the token.
 *
 * ── A SECOND COLOUR, AND WHERE OPACITY LIVES (2026-08-28) ─────────────────
 * The field now resolves TWO colours: a resting colour and the colour a dot
 * reaches at the pointer, interpolated by proximity in `grid-dots.js`. Both
 * accept an alpha channel (the picker stores hex8), and the engine no longer
 * multiplies a hardcoded `0.34` over them — so the opacity a client picks is
 * the opacity that paints.
 *
 * ── MIRRORS `fx-particles.php`, DELIBERATELY ──────────────────────────────
 * Same structure, same resolver, same uid-scoping. That file is the D846 fix
 * for the identical problem on a different effect; solving it a second way
 * would mean two behaviours to keep in step.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

if ( ! \defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The custom property `assets/css/fx-grid-dots.css` reads, and which the canvas
 * inherits as its computed `color`.
 *
 * ⛔ The JS reads the CANVAS's computed `color`, never this property directly:
 * `getPropertyValue()` on a custom property returns the `var(...)` TEXT
 * unresolved, and a canvas cannot paint with a string.
 */
const SGS_FX_GRID_DOT_COLOUR_VAR = '--sgs-fx-grid-dot-colour';

/**
 * The pointer-colour property. The canvas exposes it to the JS as its computed
 * `text-decoration-color` — a real colour-valued property (so it resolves,
 * unlike a custom property read directly) that paints nothing on a canvas.
 */
const SGS_FX_GRID_DOT_COLOUR_HOVER_VAR = '--sgs-fx-grid-dot-colour-hover';

/**
 * Emit the per-instance grid-dot colour override.
 *
 * @param string $block_content Rendered block HTML.
 * @return string Filtered HTML.
 */
function sgs_apply_fx_grid_dots( string $block_content ): string {
	// Cheap bail before constructing a tag processor for every block on the
	// page — this filter runs on ALL of them.
	if ( false === \strpos( $block_content, 'data-sgs-fx="grid-dots"' ) ) {
		return $block_content;
	}

	/*
	 * Skip a leading `<style>` before looking for the block root — the shared
	 * guard every fx render layer uses. NOT defensive padding: `sgs/container`
	 * (the primary emitter for this effect) prepends its own scoped `<style>`
	 * whenever the instance has any native supports styling set. Without the
	 * offset, `next_tag()` lands on that `<style>`, `get_attribute()` returns
	 * null, and the colour override is silently dropped.
	 */
	$offset = sgs_fx_root_offset( $block_content );
	$head   = \substr( $block_content, 0, $offset );
	$rest   = \substr( $block_content, $offset );

	$processor = new \WP_HTML_Tag_Processor( $rest );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	if ( 'grid-dots' !== $processor->get_attribute( 'data-sgs-fx' ) ) {
		return $block_content;
	}

	$stored = (string) $processor->get_attribute( 'data-sgs-fx-grid-colour' );

	/*
	 * Reuse the cursor field's resolver verbatim rather than writing a third
	 * one (`fx-particles.php` and `fx-surface-treatment.php` both reuse it for
	 * the same reason). It maps a palette SLUG to
	 * `var(--wp--preset--color--<slug>)` rather than to a hex, so the token
	 * stays LIVE — re-theming the client's palette re-colours every field with
	 * no re-render — and it refuses anything that is neither a hex literal nor
	 * a `[a-z0-9-]` slug, which is what stops an arbitrary string reaching a
	 * CSS custom-property value.
	 */
	$colour = sgs_fx_cursor_field_colour( $stored );

	$stored_hover = (string) $processor->get_attribute( 'data-sgs-fx-grid-colour-hover' );
	$colour_hover = sgs_fx_cursor_field_colour( $stored_hover );

	if ( '' === $colour && '' === $colour_hover ) {
		// Nothing to override — the stylesheet's own defaults stand. Return the
		// ORIGINAL content, not the processor's output: re-prepending `$head`
		// around an unmodified processor is a no-op that still costs a string
		// rebuild on every grid-dots block.
		return $block_content;
	}

	/*
	 * Each property is emitted ONLY when that colour was actually set. Writing
	 * an empty declaration for the unset one would replace the stylesheet's
	 * fallback CHAIN with nothing — and for the hover colour that chain is what
	 * degrades a palette without `primary-dark` down to `contrast` and finally
	 * to the resting colour. An unset value must inherit the chain, not blank it.
	 */
	$declarations = array();
	if ( '' !== $colour ) {
		$declarations[] = SGS_FX_GRID_DOT_COLOUR_VAR . ':' . $colour;
	}
	if ( '' !== $colour_hover ) {
		$declarations[] = SGS_FX_GRID_DOT_COLOUR_HOVER_VAR . ':' . $colour_hover;
	}

	// A per-instance id scopes the rule to THIS block, derived from the
	// declarations themselves so two instances configured identically share one
	// rule rather than emitting a near-duplicate each.
	$uid = 'sgs-gd-' . \substr( \md5( \implode( ';', $declarations ) ), 0, 8 );

	$existing = (string) $processor->get_attribute( 'class' );
	$processor->set_attribute( 'class', \trim( $existing . ' ' . $uid ) );

	// `$head` is re-prepended here because the processor only ever saw `$rest`;
	// returning its output alone would silently drop the block's own leading
	// <style> and with it every native supports declaration.
	return \sprintf(
		'%1$s<style>.%2$s{%3$s}</style>%4$s',
		$head,
		$uid,
		\esc_html( \implode( ';', $declarations ) ),
		$processor->get_updated_html()
	);
}

\add_filter( 'render_block', __NAMESPACE__ . '\\sgs_apply_fx_grid_dots', 11, 1 );
