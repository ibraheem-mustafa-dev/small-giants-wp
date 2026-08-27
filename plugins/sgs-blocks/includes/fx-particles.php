<?php
/**
 * FR-38-32 particle trail — per-instance colour override.
 *
 * WHY THIS FILE EXISTS (D846, 2026-08-27).
 *
 * `particles.js` reads the trail colour from the emitter's resolved `color`,
 * i.e. the inherited TEXT colour. That was a deliberate choice — a client
 * re-theming the site re-colours the trail with no JS change — but it carries
 * an unguarded assumption: that the text colour contrasts with the surface the
 * trail is painted ON. Nothing enforces that, and the two are set independently.
 *
 * MEASURED on canary page 2744, not reasoned: the emitter inherits
 * `rgb(58,46,38)` straight from `<body>` while setting its own near-black
 * `rgb(16,16,24)` background — a contrast ratio of **1.44:1**. The effect fired
 * correctly (~7,400 lit canvas pixels) and was invisible to the eye. A
 * lit-pixel count called it healthy; only the contrast measurement and a
 * screenshot disagreed.
 *
 * The owner's ruling was to give the client a control rather than have the
 * engine guess a colour: the cursor field (FR-38-25) already ships a field
 * COLOUR picker beside its style and size controls, and the particle trail
 * shipped style, density and size but no colour — so this closes an
 * inconsistency between two sibling effects as well as a live defect.
 *
 * ⛔ The inherited-`color` default is UNCHANGED. This override is opt-in: with
 * no colour set, behaviour is byte-identical to before, so no existing instance
 * moves. `particles.js` prefers this custom property and falls back to `color`.
 *
 * PRIORITY 11 — the same slot as `fx-cursor-field.php` / `fx-surface-treatment.php`
 * / `fx-path-routes.php`, i.e. AFTER `sgs_inject_fx_attributes()` at priority 10
 * has stamped `data-sgs-fx-*` onto the block root.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

if ( ! \defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The custom property `particles.js` reads before falling back to `color`.
 *
 * Named as a constant so the JS-side string and this one can be grepped to a
 * single owner — the multi-list drift this plugin has been bitten by four times
 * (`TRANSITION_STYLES`, `class-sgs-motion-registry.php`, the fx triads) always
 * starts with the same literal living in two files with no link between them.
 */
const SGS_FX_PARTICLE_COLOUR_VAR = '--sgs-fx-particle-colour';

/**
 * Emit the particle trail's per-instance colour override.
 *
 * @param string $block_content Rendered block HTML.
 * @return string Filtered HTML.
 */
function sgs_apply_fx_particles( string $block_content ): string {
	// Cheap bail before constructing a tag processor for every block on the
	// page — this filter runs on ALL of them.
	if ( false === \strpos( $block_content, 'data-sgs-fx="particles"' ) ) {
		return $block_content;
	}

	/*
	 * Skip a leading `<style>` before looking for the block root. NOT defensive
	 * padding: `sgs/container` prepends its own scoped `<style>` whenever the
	 * instance has any native WP supports styling set, and without this offset
	 * `next_tag()` lands on that `<style>`, `get_attribute()` returns null, and
	 * the override silently never applies. That exact bug has shipped on this
	 * project before, which is why the shared helper exists.
	 */
	$offset = sgs_fx_root_offset( $block_content );
	$head   = \substr( $block_content, 0, $offset );
	$rest   = \substr( $block_content, $offset );

	$processor = new \WP_HTML_Tag_Processor( $rest );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	if ( 'particles' !== $processor->get_attribute( 'data-sgs-fx' ) ) {
		return $block_content;
	}

	$stored = (string) $processor->get_attribute( 'data-sgs-fx-particle-colour' );

	/*
	 * Reuse the cursor field's resolver verbatim rather than writing a second
	 * one (`fx-surface-treatment.php` already reuses it for the same reason).
	 * It maps a palette SLUG to `var(--wp--preset--color--<slug>)` rather than
	 * to a hex value, so the token stays LIVE — re-theming the client's palette
	 * re-colours every trail with no re-render — and it refuses anything that
	 * is neither a hex literal nor a `[a-z0-9-]` slug, which is what stops an
	 * arbitrary string reaching a CSS custom-property value.
	 */
	$colour = sgs_fx_cursor_field_colour( $stored );

	if ( '' === $colour ) {
		// Nothing to override. Return the ORIGINAL content, not the processor's
		// output — re-prepending `$head` around an unmodified processor is a
		// no-op that still costs a string rebuild on every particles block.
		return $block_content;
	}

	$declarations = array( SGS_FX_PARTICLE_COLOUR_VAR . ':' . $colour );

	// A per-instance id scopes the rule to THIS block, derived from the
	// declarations themselves so two instances configured identically share one
	// rule rather than emitting a near-duplicate each.
	$uid = 'sgs-pt-' . \substr( \md5( \implode( ';', $declarations ) ), 0, 8 );

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

\add_filter( 'render_block', __NAMESPACE__ . '\\sgs_apply_fx_particles', 11, 1 );
