<?php
/**
 * SGS motion — generative background render layer (Spec 38, D874 technique
 * spec). Tier W, THIRD entry — v1 STATIC BUILD ONLY.
 *
 * ⛔ THIS IS NOT WEBGL. Per the technique spec's Assembly & priority order
 * §1 (build order step 1), v1 ships zero shader, zero WebGL context and zero
 * per-frame animation: a single OKLCH-interpolated gradient image, built
 * once client-side on a `<canvas>` 2D context
 * (`src/shared/effects/fx-generative-background.js`), painted as a static
 * background. The folded-plane geometry / animation / camera sections of the
 * technique spec are v1.1 — a separate, later, design-gated build.
 *
 * Turns the fx panel's four colour slots + ground preset into the custom
 * properties BOTH the CSS fallback (`assets/css/fx-generative-background.css`)
 * and the JS-built OKLCH image read, and applies the ground preset as a
 * root-level modifier class. Mirrors `fx-wave-gradient.php` almost exactly,
 * including the leading-`<style>` offset — see that file's own docblock for
 * why the colours become custom properties rather than resolved values.
 *
 * @package SGS\Blocks
 */

declare( strict_types = 1 );

namespace SGS\Blocks;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The four colour slots this effect carries.
 *
 * FOUR, matching the technique spec's own colour count (§2/§5): the
 * `DesignTokenPicker`-fed `fxGenColour1`-`fxGenColour4` attributes.
 *
 * @var string[]
 */
const SGS_FX_GENBG_COLOUR_SLOTS = array( '1', '2', '3', '4' );

/**
 * Ground preset -> the theme.json colour token it resolves from.
 *
 * §6 of the technique spec: "resolved from the client's own base colour
 * token, never hardcoded" — 'surface' (near-white) and 'footer-bg'
 * (near-black) are the theme's own existing tokens (`theme/sgs-theme/
 * theme.json`), not literal hex values authored here.
 *
 * @var array<string, string>
 */
const SGS_FX_GENBG_GROUND_TOKENS = array(
	'light' => 'surface',
	'dark'  => 'footer-bg',
);

/**
 * Emit the generative-background custom properties + ground class.
 *
 * @param string $block_content Rendered block HTML.
 * @return string Filtered HTML.
 */
function sgs_apply_fx_generative_background( string $block_content ): string {
	if ( false === \strpos( $block_content, 'generative-background' ) ) {
		return $block_content;
	}

	// Skip any leading <style> the native supports styling emitted — see
	// `sgs_fx_root_offset()`'s own docblock for why this is load-bearing.
	$offset = sgs_fx_root_offset( $block_content );
	$head   = \substr( $block_content, 0, $offset );
	$rest   = \substr( $block_content, $offset );

	$processor = new \WP_HTML_Tag_Processor( $rest );
	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	if ( 'generative-background' !== $processor->get_attribute( 'data-sgs-fx' ) ) {
		return $block_content;
	}

	$declarations = array();
	foreach ( SGS_FX_GENBG_COLOUR_SLOTS as $slot ) {
		$raw = (string) $processor->get_attribute( 'data-sgs-fx-gen-colour-' . $slot );
		if ( '' === $raw ) {
			continue;
		}
		$resolved = \sgs_colour_value( $raw );
		if ( '' === $resolved ) {
			continue;
		}
		$declarations[] = \sprintf( '--sgs-genbg-%s:%s', $slot, $resolved );
	}

	$ground = (string) $processor->get_attribute( 'data-sgs-fx-gen-ground' );
	if ( ! isset( SGS_FX_GENBG_GROUND_TOKENS[ $ground ] ) ) {
		$ground = 'light';
	}
	$ground_resolved = \sgs_colour_value( SGS_FX_GENBG_GROUND_TOKENS[ $ground ] );
	if ( '' !== $ground_resolved ) {
		$declarations[] = \sprintf( '--sgs-genbg-ground:%s', $ground_resolved );
	}

	$html = $processor->get_updated_html();

	// Ground modifier class, emitted on the root BEFORE the early return
	// below — it must land even when no colour custom properties are set, so
	// the CSS fallback's ground-only rule still applies.
	$gclass = 'sgs-generative-background--ground-' . $ground;
	$gtag   = new \WP_HTML_Tag_Processor( $html );
	if ( $gtag->next_tag() ) {
		$gexisting = (string) $gtag->get_attribute( 'class' );
		$gtag->set_attribute( 'class', \trim( $gexisting . ' ' . $gclass ) );
		$html = $gtag->get_updated_html();
	}

	if ( empty( $declarations ) ) {
		return $head . $html;
	}

	// A per-instance id scopes the rule to THIS block, derived from the
	// declarations so two identically-configured instances share one rule.
	$uid = 'sgs-genbg-' . \substr( \md5( \implode( ';', $declarations ) ), 0, 8 );

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

\add_filter( 'render_block', __NAMESPACE__ . '\\sgs_apply_fx_generative_background', 11, 1 );
