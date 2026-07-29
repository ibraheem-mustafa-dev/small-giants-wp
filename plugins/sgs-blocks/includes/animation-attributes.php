<?php
/**
 * Animation attributes — server-side data-attribute injection.
 *
 * Injects data-sgs-animation, data-sgs-animation-delay, and
 * data-sgs-animation-duration attributes onto rendered block HTML.
 *
 * The JS extension (animation.js) handles the editor-side controls and
 * save-time props for static blocks. This filter handles dynamic blocks
 * (render.php) which don't go through blocks.getSaveContent.extraProps.
 *
 * Works with ALL sgs/* blocks. The frontend IntersectionObserver in
 * assets/js/animation-observer.js reads these data attributes and adds
 * the .sgs-animated class when elements scroll into view.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_animation_attributes', 10, 2 );

/**
 * Inject scroll-reveal data attributes into rendered block HTML.
 *
 * @param string $block_content The rendered block HTML.
 * @param array  $block         The parsed block data including attrs.
 * @return string Modified block HTML with animation data attributes.
 */
/**
 * Core blocks that support the animation extension.
 */
const CORE_ANIMATION_BLOCKS = array(
	'core/group',
	'core/columns',
	'core/cover',
	'core/image',
);

/**
 * Whether this block carries an fx effect that owns transform/opacity across a
 * scroll range (Spec 38 §4.3).
 *
 * Reads BOTH signals, because either alone has a blind spot: the parsed
 * attribute is absent on a block whose fx arrived pre-baked in stored markup
 * (a converter clone or pattern), and the markup scan is absent on a dynamic
 * block being evaluated before its data attributes are injected.
 *
 * The `owns_scroll_transform` flag comes from the generated registry map — NOT
 * a hardcoded list here. A load-triggered effect (DrawSVG, ScrambleText) does
 * not own the scroll range and must never suppress an entrance animation.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $attrs         Parsed block attributes.
 * @return bool True when the entrance animation must be suppressed.
 */
function sgs_fx_owns_scroll_transform( string $block_content, array $attrs ): bool {
	$effect = $attrs['fx'] ?? '';

	if ( ( ! \is_string( $effect ) || '' === $effect )
		&& \preg_match( '/data-sgs-fx="([a-z0-9-]+)"/i', $block_content, $m ) ) {
		$effect = $m[1];
	}

	if ( ! \is_string( $effect ) || '' === $effect ) {
		return false;
	}

	if ( ! \class_exists( __NAMESPACE__ . '\\SGS_Motion_Registry' ) ) {
		return false;
	}

	$effects = SGS_Motion_Registry::effects();

	return ! empty( $effects[ $effect ]['owns_scroll_transform'] );
}

/**
 * Remove any `data-sgs-animation*` attributes already present in stored markup.
 *
 * The STATIC-block half of §4.3. `animation.js` writes these at save time, so
 * for a static block they are baked into `post_content` and simply declining to
 * inject achieves nothing — they have to come out.
 *
 * Uses the same leading-`<style>`/`<script>` skip as the injection path: the
 * tag processor would otherwise land on a block's scoped style tag rather than
 * its real root, and strip attributes from an element that never had them while
 * leaving the real ones in place.
 *
 * @param string $block_content Rendered block HTML.
 * @return string Block HTML with entrance-animation attributes removed.
 */
function sgs_strip_animation_attributes( string $block_content ): string {
	if ( false === \strpos( $block_content, 'data-sgs-animation' ) ) {
		return $block_content; // Dynamic-block path: nothing was ever written.
	}

	$offset = 0;
	while ( \preg_match( '/^\s*<(style|script)\b[^>]*>/i', \substr( $block_content, $offset ), $m ) ) {
		$close     = '</' . \strtolower( $m[1] ) . '>';
		$close_pos = \stripos( $block_content, $close, $offset );
		if ( false === $close_pos ) {
			break;
		}
		$offset = $close_pos + \strlen( $close );
	}

	$head      = \substr( $block_content, 0, $offset );
	$rest      = \substr( $block_content, $offset );
	$processor = new \WP_HTML_Tag_Processor( $rest );

	if ( ! $processor->next_tag() ) {
		return $block_content;
	}

	foreach ( array(
		'data-sgs-animation',
		'data-sgs-animation-delay',
		'data-sgs-animation-duration',
		'data-sgs-animation-easing',
	) as $attr ) {
		$processor->remove_attribute( $attr );
	}

	return $head . $processor->get_updated_html();
}

/**
 * Inject scroll-reveal data attributes into rendered block HTML.
 *
 * Handles dynamic blocks (render.php) which bypass
 * blocks.getSaveContent.extraProps. The frontend IntersectionObserver reads
 * these attributes to trigger CSS transitions.
 *
 * Also enforces the Spec 38 §4.3 entrance × scroll-scrub exclusivity — see the
 * block comment inside.
 *
 * @param string $block_content The rendered block HTML.
 * @param array  $block         The parsed block data including attrs.
 * @return string Modified block HTML with animation data attributes.
 */
function inject_animation_attributes( string $block_content, array $block ): string {
	$block_name = $block['blockName'] ?? '';

	// Process SGS blocks + supported core blocks.
	if ( empty( $block_name ) ) {
		return $block_content;
	}

	$is_sgs  = str_starts_with( $block_name, 'sgs/' );
	$is_core = in_array( $block_name, CORE_ANIMATION_BLOCKS, true );

	if ( ! $is_sgs && ! $is_core ) {
		return $block_content;
	}

	// Skip empty blocks.
	if ( empty( $block_content ) ) {
		return $block_content;
	}

	$attrs     = $block['attrs'] ?? array();
	$animation = $attrs['sgsAnimation'] ?? 'none';

	/*
	 * ── Spec 38 §4.3 — entrance × scroll-scrub MUTUAL EXCLUSIVITY ──────────
	 *
	 * A scrub timeline owns this element's transform and opacity for its whole
	 * scroll range. An IntersectionObserver entrance animation fighting it
	 * produces double-animation and broken initial states. Precedence ordering
	 * cannot fix a shared-property conflict — it can only hide it — so the
	 * scrub wins outright and the entrance is suppressed.
	 *
	 * TWO CODE PATHS, because the entrance attributes reach the frontend two
	 * ways and suppressing only one leaves the bug alive on half the blocks:
	 *
	 *   · DYNAMIC blocks — nothing is stored; this filter injects. Suppression
	 *                      = simply OMIT (return before the injection below).
	 *   · STATIC blocks  — `animation.js` baked the attributes into stored
	 *                      post_content at save time, so they are ALREADY in
	 *                      $block_content. Omitting achieves nothing; they must
	 *                      be actively STRIPPED.
	 *
	 * Enforced at RENDER time rather than in the editor because stored
	 * attributes bypass the editor constantly — converter clones, patterns,
	 * direct inserts. WP silently keeps whatever attributes are stored (D338),
	 * so an editor-only guard is a suggestion, not a gate.
	 *
	 * Which effects exclude entrances is driven by the registry's
	 * `owns_scroll_transform` flag, never a hardcoded effect list: a
	 * load-triggered effect (DrawSVG, ScrambleText) does NOT own the scroll
	 * range and must not suppress anything.
	 */
	if ( sgs_fx_owns_scroll_transform( $block_content, $attrs ) ) {
		return sgs_strip_animation_attributes( $block_content );
	}

	// Nothing to do if no animation set.
	if ( 'none' === $animation || empty( $animation ) ) {
		return $block_content;
	}

	$delay    = $attrs['sgsAnimationDelay'] ?? '0';
	$duration = $attrs['sgsAnimationDuration'] ?? 'medium';
	$easing   = $attrs['sgsAnimationEasing'] ?? 'default';

	// --- Locate the block's actual ROOT element. ---
	// The no-inline styling contract (Spec 32, D293-D296) has every composite
	// using SGS_Container_Wrapper — and several blocks directly — PREPEND a
	// scoped `<style id="…">…</style>` tag before their real wrapper element.
	// WP_HTML_Tag_Processor::next_tag() matches ANY tag, including <style>, so
	// calling it on the raw $block_content lands on the leading <style> tag and
	// writes data-sgs-animation* onto it — inert (style tags aren't visually
	// targetable) and later stripped wholesale by the p99 CSS-lift filter
	// (sgs_lift_block_css, class-sgs-css-registry.php), so the animation never
	// fires. Same root cause + fix shape as the hover-effects.php overlay bug
	// (device-visibility.php's skip-loop is the original proven pattern).
	$sgs_root_offset = 0;
	while ( preg_match( '/^\s*<(style|script)\b[^>]*>/i', substr( $block_content, $sgs_root_offset ), $sgs_lead_match ) ) {
		$sgs_close_tag = '</' . strtolower( $sgs_lead_match[1] ) . '>';
		$sgs_close_pos = stripos( $block_content, $sgs_close_tag, $sgs_root_offset );
		if ( false === $sgs_close_pos ) {
			break; // Malformed markup — bail out, treat the whole string as-is.
		}
		$sgs_root_offset = $sgs_close_pos + strlen( $sgs_close_tag );
	}

	// Use WP_HTML_Tag_Processor for safe attribute injection, scoped to the
	// substring starting at the real root tag so <style>/<script> is never
	// mistaken for it.
	$sgs_head = substr( $block_content, 0, $sgs_root_offset );
	$sgs_root = substr( $block_content, $sgs_root_offset );

	$processor = new \WP_HTML_Tag_Processor( $sgs_root );

	if ( $processor->next_tag() ) {
		// Only add if not already present (static blocks may already have them).
		if ( null === $processor->get_attribute( 'data-sgs-animation' ) ) {
			$processor->set_attribute( 'data-sgs-animation', esc_attr( $animation ) );
			$processor->set_attribute( 'data-sgs-animation-delay', esc_attr( $delay ) );
			$processor->set_attribute( 'data-sgs-animation-duration', esc_attr( $duration ) );
			$processor->set_attribute( 'data-sgs-animation-easing', esc_attr( $easing ) );
		}

		return $sgs_head . $processor->get_updated_html();
	}

	return $block_content;
}
