<?php
/**
 * SGS motion — wave gradient render layer (Spec 38 FR-38-31). Tier W.
 *
 * Turns the fx panel's choices into the custom properties the stylesheet and
 * the shader BOTH read, and emits the SC 2.2.2 pause control. Mirrors
 * `fx-cursor-field.php` exactly, including the leading-`<style>` offset.
 *
 * ⛔ WHY THE COLOURS BECOME CUSTOM PROPERTIES AND NOT RESOLVED VALUES.
 * The client may pick a palette SLUG (`primary`), which only becomes a real
 * colour through `var(--wp--preset--color--primary)`. `sgs_colour_value()`
 * turns the slug into that var() form and passes a literal hex through
 * untouched — feeding a raw slug to the style engine emits
 * `background-color:primary`, which the browser silently drops (D684).
 * Emitting the var() form means the STYLESHEET resolves it and the boot module
 * reads the COMPUTED value, so re-theming a site re-colours both the CSS
 * fallback and the shader with no PHP or JS change.
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

namespace SGS\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Colour slots: one base plus three wave layers.
 *
 * THREE IS NOT ARBITRARY — it matches the layer count used by the MIT-licensed
 * reference implementation this technique is modelled on (a base colour plus an
 * array of wave layers, each with its own colour and noise field). The
 * shader's `WAVE_LAYERS` constant must match this count.
 *
 * @var string[]
 */
const SGS_FX_WAVE_SLOTS = array( 'base', '1', '2', '3' );

/**
 * Emit the wave-gradient custom properties and pause control.
 *
 * @param string $block_content Rendered block HTML.
 * @return string Filtered HTML.
 */
function sgs_apply_fx_wave_gradient( string $block_content ): string {
	if ( false === \strpos( $block_content, 'wave-gradient' ) ) {
		return $block_content;
	}

	/*
	 * Skip any leading <style> the native supports styling emitted. Without
	 * this offset `next_tag()` lands on that <style>, `data-sgs-fx` reads
	 * null, and this filter returns untouched — so nothing paints while the
	 * p99 registry sniff still ships the JS and CSS for nothing. That exact
	 * bug has shipped on this project before; the helper exists because of it.
	 */
	$offset = sgs_fx_root_offset( $block_content );
	$head   = \substr( $block_content, 0, $offset );
	$rest   = \substr( $block_content, $offset );

	$processor = new \WP_HTML_Tag_Processor( $rest );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	if ( 'wave-gradient' !== $processor->get_attribute( 'data-sgs-fx' ) ) {
		return $block_content;
	}

	$declarations = array();
	foreach ( SGS_FX_WAVE_SLOTS as $slot ) {
		$raw = (string) $processor->get_attribute( 'data-sgs-fx-wave-' . $slot );
		if ( '' === $raw ) {
			continue;
		}
		$resolved = \sgs_colour_value( $raw );
		if ( '' === $resolved ) {
			continue;
		}
		$declarations[] = \sprintf( '--sgs-wave-%s:%s', $slot, $resolved );
	}

	/*
	 * THE SC 2.2.2 PAUSE CONTROL.
	 *
	 * Emitted `hidden`; the boot module unhides it. That ordering is the whole
	 * point — if the script never runs, nothing is animating, and a pause
	 * button that pauses nothing is a dead control, the exact defect class
	 * D767 found. `aria-pressed` carries the state so a screen-reader user is
	 * told whether they are about to pause or resume.
	 */
	$html   = $processor->get_updated_html();
	$toggle = \sprintf(
		'<button type="button" class="sgs-wave-gradient__toggle" '
			. 'data-sgs-wave-toggle aria-pressed="false" hidden>%s</button>',
		\esc_html__( 'Pause background', 'sgs-blocks' )
	);

	// Injected before the block root's closing tag, so it lands INSIDE the
	// positioned element the stylesheet anchors it to.
	$last = \strrpos( $html, '</' );
	if ( false !== $last ) {
		$html = \substr( $html, 0, $last ) . $toggle . \substr( $html, $last );
	}

	/*
	 * Variant class, emitted on the root BEFORE the early return below.
	 * Four of the five variants are pure CSS and produce no custom-property
	 * declarations at all, so if this sat after that return they would ship
	 * with no class and render nothing — the whole variant system would be
	 * silently dead for exactly the cases it exists to serve.
	 */
	$variant = (string) $processor->get_attribute( 'data-sgs-fx-wave-variant' );
	if ( '' === $variant || null === $processor->get_attribute( 'data-sgs-fx-wave-variant' ) ) {
		$variant = 'pastel';
	}
	$allowed = array( 'pastel', 'aurora', 'ink', 'horizon', 'ribbon', 'veil' );
	if ( ! \in_array( $variant, $allowed, true ) ) {
		$variant = 'pastel';
	}
	$vclass = 'sgs-wave-gradient--' . $variant;
	$vtag   = new \WP_HTML_Tag_Processor( $html );
	if ( $vtag->next_tag() ) {
		$vexisting = (string) $vtag->get_attribute( 'class' );
		$vtag->set_attribute( 'class', \trim( $vexisting . ' ' . $vclass ) );
		$html = $vtag->get_updated_html();
	}

	if ( empty( $declarations ) ) {
		return $head . $html;
	}

	// A per-instance id scopes the rule to THIS block, derived from the
	// declarations so two identically-configured instances share one rule.
	$uid = 'sgs-wg-' . \substr( \md5( \implode( ';', $declarations ) ), 0, 8 );

	$scoped = new \WP_HTML_Tag_Processor( $html );
	if ( $scoped->next_tag() ) {
		$existing = (string) $scoped->get_attribute( 'class' );
		$scoped->set_attribute( 'class', \trim( $existing . ' ' . $uid ) );
		$html = $scoped->get_updated_html();
	}

	// `$head` is re-prepended on EVERY return path that rebuilds the markup —
	// returning the processor's output alone would silently drop the block's
	// own leading <style> and with it every native supports declaration.
	return \sprintf(
		'%1$s<style>.%2$s{%3$s}</style>%4$s',
		$head,
		$uid,
		\esc_html( \implode( ';', $declarations ) ),
		$html
	);
}

\add_filter( 'render_block', __NAMESPACE__ . '\\sgs_apply_fx_wave_gradient', 11, 1 );
