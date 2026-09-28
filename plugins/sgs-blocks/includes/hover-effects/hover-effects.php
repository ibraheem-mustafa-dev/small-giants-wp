<?php
/**
 * Universal Hover Effects — server-side injection.
 *
 * Adds CSS custom properties and utility classes to rendered blocks that
 * have hover attributes set.
 *
 * Default model: ALL blocks start with empty/false hover defaults.
 * A small opt-in list of card-like blocks receives subtle-lift defaults.
 * This mirrors the SCALE_SHADOW_DEFAULT_BLOCKS logic in
 * src/blocks/extensions/hover-effects/.
 *
 * Handles:
 * - sgsHoverScale (fine-grained %) + sgsHoverScalePreset (named preset)
 * - sgsHoverShadow (the slug of any theme shadow preset, `settings.shadow.presets`)
 * - sgsHoverDuration (string slug — instant/fast/medium/slow/extra-slow)
 * - sgsHoverEasing (string slug — default/ease-out/ease-in/spring/linear)
 * - sgsHoverImageZoom (boolean)
 * - sgsStaggerDelay (ms per child)
 * - sgsHoverGrayscale (boolean)
 * - sgsHoverBorderAccent (boolean)
 * - sgsHoverTilt3D (boolean)
 * - sgsFocusRing (boolean) — emits class sgs-has-focus-ring
 * - sgsHoverIndent (string, CSS length) — additive hover/focus-within
 *   inline-start padding growth on top of the block's own resting `padding`
 *   left side where present (Spec 36 "Item hover paint", generalised)
 * - sgsBlockLink + sgsBlockLinkTarget + sgsBlockLinkLabel (injects an EMPTY
 *   overlay <a class="sgs-block-link-overlay"> as the block root's LAST
 *   CHILD — a stretched-link SIBLING of the content, never a wrapper, so a
 *   link/button already inside the block never nests inside another <a>.
 *   sgsBlockLinkLabel drives the required aria-label; falls back to the
 *   href host when empty.)
 *
 * Split into this folder from a single 518-line includes/hover-effects.php:
 * resolve.php (default/exclusion resolution), vars.php (CSS custom-property
 * declarations), classes.php (extra-class list), link-overlay.php (the
 * block-link overlay). This file keeps the render_block hook and the
 * orchestrator that ties them together.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/resolve.php';
require_once __DIR__ . '/vars.php';
require_once __DIR__ . '/classes.php';
require_once __DIR__ . '/link-overlay.php';

add_filter( 'render_block', __NAMESPACE__ . '\\inject_hover_effects', 10, 2 );

/**
 * Inject hover CSS custom properties and classes into block output.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Block data including attrs.
 * @return string Modified block HTML.
 */
function inject_hover_effects( string $block_content, array $block ): string {
	// A block that rendered nothing (a dynamic block with no data returns '') has no element to decorate.
	// Without this guard the scoped <style> below was appended to the empty string: ~222 bytes of CSS for
	// an element that does not exist, on the front end, and in the editor a non-empty ServerSideRender
	// response, so a block's own empty-state placeholder never showed (found 2026-09-21, sgs/google-reviews).
	if ( '' === trim( $block_content ) ) {
		return $block_content;
	}

	$block_name = $block['blockName'] ?? '';

	// Resolve per-block defaults for this block type.
	$defaults          = resolve_hover_defaults( $block_name );
	$excluded_controls = resolve_hover_excluded_controls( $block_name );

	$attrs = $block['attrs'] ?? array();

	// Gate A cleanup (D808 follow-up): a block that declares imageZoom/grayscale
	// as EXCLUDED never emits the class below, even if a stored/legacy attribute
	// value is true — the class-injection path is where the D805 "present but
	// inert" shape actually gets fixed, not just the inspector UI.
	$hover_scale           = (int) ( $attrs['sgsHoverScale'] ?? 0 );
	$hover_lift            = min( 24, absint( $attrs['sgsHoverLift'] ?? $defaults['lift'] ) );
	$hover_zoom            = min( 130, absint( $attrs['sgsHoverZoom'] ?? $defaults['zoom'] ) );
	$hover_zoom_duration   = min( 2000, absint( $attrs['sgsHoverZoomDuration'] ?? $defaults['zoom_duration'] ) );
	$hover_scale_preset    = $attrs['sgsHoverScalePreset'] ?? $defaults['scale_preset'];
	$hover_shadow          = $attrs['sgsHoverShadow'] ?? $defaults['shadow'];
	$hover_dur_slug        = $attrs['sgsHoverDuration'] ?? 'medium';
	$hover_dur_ms          = min( 2000, absint( $attrs['sgsHoverDurationMs'] ?? 0 ) );
	$hover_easing_slug     = $attrs['sgsHoverEasing'] ?? 'default';
	$hover_easing_custom   = (string) ( $attrs['sgsHoverEasingCustom'] ?? '' );
	$hover_img_zoom        = in_array( 'imageZoom', $excluded_controls, true )
		? false
		: (bool) ( $attrs['sgsHoverImageZoom'] ?? $defaults['image_zoom'] );
	$stagger_delay         = (int) ( $attrs['sgsStaggerDelay'] ?? 0 );
	$hover_grayscale       = in_array( 'grayscale', $excluded_controls, true )
		? false
		: (bool) ( $attrs['sgsHoverGrayscale'] ?? false );
	$hover_border_acc      = (bool) ( $attrs['sgsHoverBorderAccent'] ?? false );
	$hover_tilt_3d         = (bool) ( $attrs['sgsHoverTilt3D'] ?? false );
	$focus_ring            = (bool) ( $attrs['sgsFocusRing'] ?? $defaults['focus_ring'] );
	$block_link            = $attrs['sgsBlockLink'] ?? '';
	$block_link_target     = (bool) ( $attrs['sgsBlockLinkTarget'] ?? false );
	$block_link_label      = $attrs['sgsBlockLinkLabel'] ?? '';
	$click_effect          = $attrs['sgsClickEffect'] ?? 'none';
	$click_ripple_colour   = $attrs['sgsClickRippleColour'] ?? '';
	$click_ripple_duration = absint( $attrs['sgsClickRippleDuration'] ?? 600 );
	$hover_opacity         = min( 1.0, max( 0.0, (float) ( $attrs['sgsHoverOpacity'] ?? 0 ) ) );

	require_once __DIR__ . '/../render-helpers.php';
	require_once __DIR__ . '/../helpers-scoped-instance-vars.php';

	// Custom hover shadow — a raw box-shadow string, read only when
	// $hover_shadow is the literal 'custom'. sgs_shadow_value() is the SAME
	// sanitiser sgs/button's boxShadowHover uses (helpers-tokens.php): passes
	// a raw CSS shadow through (breakout-checked), or resolves a token slug.
	$hover_shadow_custom = 'custom' === $hover_shadow
		? sgs_shadow_value( (string) ( $attrs['sgsHoverShadowCustom'] ?? '' ) )
		: '';

	// Padding indent — additive hover-only inline-start growth (generalised
	// nav "Item hover paint" shape, Spec 36). The RESTING base is read from
	// this block's own `padding` tier-object attribute where present — the
	// SAME canonical box-object shape every SGS block with padding controls
	// uses ({desktop,tablet,mobile}.{top,right,bottom,left}) — so the growth
	// is genuinely additive on any block using that attribute name, and
	// simply grows from zero (documented, non-breaking) on one that doesn't.
	$hover_indent      = sgs_css_single_length_value( $attrs['sgsHoverIndent'] ?? '' );
	$hover_indent_base = '';
	if ( '' !== $hover_indent ) {
		$padding_left_raw  = $attrs['padding']['desktop']['left'] ?? '';
		$hover_indent_base = sgs_css_single_length_value( is_string( $padding_left_raw ) ? $padding_left_raw : '' );
	}

	// 'custom' with no surviving sanitised value is inert — never counts as
	// an active shadow (mirrors an out-of-list preset slug already being
	// silently inert in build_hover_vars()/build_hover_classes()).
	$hover_shadow_active = 'custom' === $hover_shadow ? ( '' !== $hover_shadow_custom ) : (bool) $hover_shadow;

	$has_ripple      = 'ripple' === $click_effect;
	$has_scale_hover = $hover_scale || $hover_scale_preset;
	$has_hover       = $has_scale_hover || $hover_shadow_active || $hover_lift || $hover_opacity > 0;

	// Bail early if nothing is active (respects per-block defaults above).
	if (
		! $has_hover &&
		! $hover_img_zoom &&
		! $stagger_delay &&
		! $hover_grayscale &&
		! $hover_border_acc &&
		! $hover_tilt_3d &&
		! $focus_ring &&
		! $block_link &&
		! $has_ripple &&
		'' === $hover_indent
	) {
		return $block_content;
	}

	// --- Locate the block's actual ROOT element. ---
	// The no-inline styling contract (Spec 32, D293-D296) has every composite
	// using SGS_Container_Wrapper — and several blocks directly — PREPEND a
	// scoped `<style id="…">…</style>` tag before their real wrapper element
	// (e.g. sgs/card-grid, sgs/hero). Every injection below used to assume
	// $block_content's FIRST TAG is the block's root, which broke the moment
	// a leading <style> tag existed: the class landed on the <style> tag
	// (invisible — style tags aren't visually targetable), the CSS-var
	// injection wrote a nonsense style="" ATTRIBUTE onto the <style> ELEMENT,
	// and the block-link overlay got inserted as literal TEXT inside
	// <style>…</style> — which Stage 99's CSS-lift filter (sgs_lift_block_css,
	// class-sgs-css-registry.php) then strips wholesale, so the overlay never
	// reached the DOM at all. Proven live on sandybrown page 1849, 2026-07-28.
	// Mirrors the proven fix already shipped in device-visibility.php's
	// inject_device_visibility_classes() — skip every leading <style>/<script>
	// block to find the real wrapper tag, universally, for any block.
	$sgs_root_offset = 0;
	while ( preg_match( '/^\s*<(style|script)\b[^>]*>/i', substr( $block_content, $sgs_root_offset ), $sgs_lead_match ) ) {
		$sgs_close_tag = '</' . strtolower( $sgs_lead_match[1] ) . '>';
		$sgs_close_pos = stripos( $block_content, $sgs_close_tag, $sgs_root_offset );
		if ( false === $sgs_close_pos ) {
			break; // Malformed markup — bail out, treat the whole string as-is.
		}
		$sgs_root_offset = $sgs_close_pos + strlen( $sgs_close_tag );
	}

	// --- Build CSS custom properties. ---
	$css_vars = build_hover_vars(
		$hover_scale,
		$hover_scale_preset,
		$hover_shadow,
		$hover_lift,
		$hover_img_zoom ? $hover_zoom : 0,
		$hover_img_zoom ? $hover_zoom_duration : 0,
		$hover_dur_slug,
		$hover_dur_ms,
		$hover_easing_slug,
		$stagger_delay,
		$has_ripple,
		$click_ripple_colour,
		$click_ripple_duration,
		$hover_opacity,
		$hover_easing_custom,
		$hover_indent,
		$hover_indent_base,
		$hover_shadow_custom
	);

	// --- Resolve the scoping class for the scoped <style> rule below (Spec 32
	// no-inline contract) BEFORE any classes are injected into the root tag,
	// so the uid-pattern search sees only the block's OWN classes. ---
	$sgs_scope_class = '';
	if ( $css_vars ) {
		$sgs_root_tag_html = sgs_extract_root_opening_tag( substr( $block_content, $sgs_root_offset ) );
		$sgs_scope_class   = sgs_scope_class_for_root( $sgs_root_tag_html, 'sgs-hover' );
	}

	// --- Build extra classes. ---
	$add_classes = build_hover_classes(
		$sgs_scope_class,
		$has_hover,
		$hover_shadow,
		$hover_lift,
		$hover_scale,
		$hover_scale_preset,
		$hover_img_zoom,
		$hover_grayscale,
		$hover_border_acc,
		$hover_tilt_3d,
		$stagger_delay,
		$focus_ring,
		$block_link,
		$has_ripple,
		$hover_opacity,
		$hover_indent,
		$hover_shadow_custom
	);

	// --- Inject classes into the ROOT tag (never the leading <style>/<script>). ---
	// Regexes below are anchored to $sgs_root (the substring starting at the
	// real wrapper), not $block_content, so a prepended scoped <style> tag
	// (see $sgs_root_offset above) is never mistaken for the root.
	if ( $add_classes ) {
		$classes_str = implode( ' ', $add_classes );
		$sgs_head    = substr( $block_content, 0, $sgs_root_offset );
		$sgs_root    = substr( $block_content, $sgs_root_offset );
		// Append to existing class="..." attribute.
		if ( preg_match( '/^(<\w+\b[^>]*\bclass=["\'])/', $sgs_root ) ) {
			$sgs_root = preg_replace(
				'/^(<\w+\b[^>]*\bclass=["\'])/',
				'$1' . $classes_str . ' ',
				$sgs_root,
				1
			);
		} else {
			// No class attribute yet; add one.
			$sgs_root = preg_replace(
				'/^(<\w+)(\b)/',
				'$1 class="' . $classes_str . '"$2',
				$sgs_root,
				1
			);
		}
		$block_content = $sgs_head . $sgs_root;
	}

	// --- Inject the block-link overlay as the block root's LAST CHILD. ---
	if ( $block_link ) {
		$block_content = insert_block_link_overlay(
			$block_content,
			$sgs_root_offset,
			$block_link,
			$block_link_target,
			$block_link_label
		);
	}

	// --- Emit CSS custom properties as a scoped <style> rule (Spec 32
	// no-inline contract, FR-32-11) — NEVER a style="" attribute. The rule is
	// keyed to $sgs_scope_class (added to the root's class list above), and
	// appended LAST (after the overlay insertion) as the block's own <style>
	// tag: on the front end the Spec-32 CSS collector
	// (class-sgs-css-registry.php, render_block p99) lifts it into the
	// consolidated <head> stylesheet; in the editor (ServerSideRender REST,
	// no wp_footer flush) it stays inline and renders as-authored — the same
	// shape every migrated block's render.php already uses. Appending after
	// the overlay step means the overlay's root-close-tag lookup never has to
	// reason about a trailing <style> tag being present.
	if ( $css_vars && $sgs_scope_class ) {
		$block_content = sgs_append_scoped_var_style( $block_content, $sgs_scope_class, $css_vars );
	}

	return $block_content;
}
