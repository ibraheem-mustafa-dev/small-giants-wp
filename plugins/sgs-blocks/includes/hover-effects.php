<?php
/**
 * Universal Hover Effects — server-side injection.
 *
 * Adds CSS custom properties and utility classes to rendered blocks that
 * have hover attributes set.
 *
 * Default model: ALL blocks start with empty/false hover defaults.
 * A small opt-in list of card-like blocks receives subtle-lift defaults.
 * This mirrors the SCALE_SHADOW_DEFAULT_BLOCKS logic in hover-effects.js.
 *
 * Handles:
 * - sgsHoverScale (fine-grained %) + sgsHoverScalePreset (named preset)
 * - sgsHoverShadow (subtle/raised/floating/glow)
 * - sgsHoverDuration (string slug — instant/fast/medium/slow/extra-slow)
 * - sgsHoverEasing (string slug — default/ease-out/ease-in/spring/linear)
 * - sgsHoverImageZoom (boolean)
 * - sgsStaggerDelay (ms per child)
 * - sgsHoverGrayscale (boolean)
 * - sgsHoverBorderAccent (boolean)
 * - sgsHoverTilt3D (boolean)
 * - sgsFocusRing (boolean) — emits class sgs-has-focus-ring
 * - sgsBlockLink + sgsBlockLinkTarget + sgsBlockLinkLabel (injects an EMPTY
 *   overlay <a class="sgs-block-link-overlay"> as the block root's LAST
 *   CHILD — a stretched-link SIBLING of the content, never a wrapper, so a
 *   link/button already inside the block never nests inside another <a>.
 *   sgsBlockLinkLabel drives the required aria-label; falls back to the
 *   href host when empty.)
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_hover_effects', 10, 2 );

/**
 * Resolve per-block hover defaults from the BLOCK'S OWN DECLARATION.
 *
 * Mirrors resolveBlockDefaults() in hover-effects.js — both read the same
 * `supports.sgs.hoverDefaults` object, so there is ONE declaration per block
 * and no roster to keep in step.
 *
 * ⛔ REPLACED three hardcoded block-name arrays (D805). Those arrays named 11
 * blocks and NOTHING gated them, so eight blocks received injected hover
 * motion with the hover panel switched off and no editor control to change it
 * — a default the client cannot see or reach. Same shape as the 47-name
 * `:not()` list D784/D793 deleted: named exceptions standing in for a
 * classification. A twelfth block now declares its own defaults in its own
 * block.json instead of somebody hand-editing PHP.
 *
 * TWO conditions, both required, so "declared but unreachable" cannot recur:
 *   1. the block declares `supports.sgs.hoverDefaults`, AND
 *   2. the block opts the hover panel in via `supports.sgs.enabledExtensions`.
 * Condition 2 is what makes this structural rather than a promise: a default
 * with no control is exactly the defect being fixed, so the mechanism refuses
 * to emit one.
 *
 * @param string $block_name Block name (e.g. 'sgs/card-grid').
 * @return array { scale_preset: string, shadow: string, image_zoom: bool, focus_ring: bool }
 */
function resolve_hover_defaults( string $block_name ): array {
	$all_off = array(
		'scale_preset' => '',
		'shadow'       => '',
		'image_zoom'   => false,
		'focus_ring'   => false,
	);

	if ( '' === $block_name ) {
		return $all_off;
	}

	$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
	if ( ! $type instanceof \WP_Block_Type ) {
		return $all_off;
	}

	$sgs = $type->supports['sgs'] ?? array();
	if ( ! is_array( $sgs ) ) {
		return $all_off;
	}

	// Condition 2 — no hover panel means no injected default. A value the
	// client cannot reach is the bug, not a feature.
	$enabled = $sgs['enabledExtensions'] ?? array();
	if ( ! is_array( $enabled ) || ! in_array( 'hover', $enabled, true ) ) {
		return $all_off;
	}

	// Condition 1 — the block's own declaration.
	$declared = $sgs['hoverDefaults'] ?? null;
	if ( ! is_array( $declared ) ) {
		return $all_off;
	}

	$excluded = resolve_hover_excluded_controls( $block_name );

	return array(
		'scale_preset' => is_string( $declared['scalePreset'] ?? null ) ? $declared['scalePreset'] : '',
		'shadow'       => is_string( $declared['shadow'] ?? null ) ? $declared['shadow'] : '',
		// Gate A cleanup: a block that declares an imageZoom default but has no
		// image element to bind it to is the D805 shape (a client-visible
		// default with no effect) — see resolve_hover_excluded_controls() below.
		'image_zoom'   => in_array( 'imageZoom', $excluded, true ) ? false : (bool) ( $declared['imageZoom'] ?? false ),
		'focus_ring'   => (bool) ( $declared['focusRing'] ?? false ),
	);
}

/**
 * Resolve a block's declared hover-control exclusions.
 *
 * Gate A cleanup (D808 follow-up, 2026-08-27): pricing-table, google-reviews
 * and whatsapp-cta are root-hover blocks (D808) but have no image element for
 * the panel's "Zoom image on hover" / "Grayscale to colour" toggles to bind
 * to — cta-section is the only one of the four with a real (optional
 * background) image; see plugins/sgs-blocks/src/blocks/cta-section/style.css.
 * Leaving the toggles present-but-inert on the other three is exactly the
 * D805 failure shape (a control the client can flip that does nothing), so
 * they are suppressed structurally rather than left for the client to
 * discover are dead.
 *
 * Declared per-block via `supports.sgs.hoverExcludeControls` (a plain array
 * of control keys, e.g. `["imageZoom", "grayscale"]`), read identically by
 * the JS twin (resolveHoverExcludedControls() in hover-effects.js). ONE
 * declaration per block, no named-block array in this shared file — the same
 * discipline D805 already enforced for hoverDefaults/enabledExtensions.
 *
 * @param string $block_name Block name (e.g. 'sgs/pricing-table').
 * @return string[] Excluded control keys.
 */
function resolve_hover_excluded_controls( string $block_name ): array {
	if ( '' === $block_name ) {
		return array();
	}

	$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
	if ( ! $type instanceof \WP_Block_Type ) {
		return array();
	}

	$sgs = $type->supports['sgs'] ?? array();
	if ( ! is_array( $sgs ) ) {
		return array();
	}

	$excluded = $sgs['hoverExcludeControls'] ?? array();
	if ( ! is_array( $excluded ) ) {
		return array();
	}

	// NOT sanitize_key() — it lowercases, and every caller compares against the
	// literal camelCase control key ('imageZoom'/'grayscale'). sanitize_key()
	// would silently turn 'imageZoom' into 'imagezoom', breaking every
	// in_array( 'imageZoom', $excluded, true ) check downstream (caught live by
	// a standalone harness against this exact function before deploy — 'grayscale'
	// happened to survive because it has no capital letters to begin with, so
	// only imageZoom's suppression was silently broken). This mirrors
	// `enabledExtensions` immediately above, which is also compared unsanitised.
	return array_values( array_filter( $excluded, 'is_string' ) );
}

/**
 * Inject hover CSS custom properties and classes into block output.
 *
 * @param string $block_content Rendered block HTML.
 * @param array  $block         Block data including attrs.
 * @return string Modified block HTML.
 */
function inject_hover_effects( string $block_content, array $block ): string {
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
	$hover_scale_preset    = $attrs['sgsHoverScalePreset'] ?? $defaults['scale_preset'];
	$hover_shadow          = $attrs['sgsHoverShadow'] ?? $defaults['shadow'];
	$hover_dur_slug        = $attrs['sgsHoverDuration'] ?? 'medium';
	$hover_easing_slug     = $attrs['sgsHoverEasing'] ?? 'default';
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

	$has_ripple      = 'ripple' === $click_effect;
	$has_scale_hover = $hover_scale || $hover_scale_preset;
	$has_hover       = $has_scale_hover || $hover_shadow;

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
		! $has_ripple
	) {
		return $block_content;
	}

	require_once __DIR__ . '/render-helpers.php';
	require_once __DIR__ . '/helpers-scoped-instance-vars.php';

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
	$css_vars = array();

	// Fine-grained scale takes priority over named preset.
	if ( $hover_scale ) {
		$css_vars[] = '--sgs-hover-scale:' . number_format( $hover_scale / 100, 4 );
	} elseif ( $hover_scale_preset ) {
		$allowed_presets = array( '1.02', '1.05', '1.1' );
		if ( in_array( $hover_scale_preset, $allowed_presets, true ) ) {
			$css_vars[] = '--sgs-hover-scale:' . esc_attr( $hover_scale_preset );
		}
	}

	if ( $hover_shadow ) {
		$allowed_shadows = array( 'subtle', 'raised', 'floating', 'glow' );
		if ( in_array( $hover_shadow, $allowed_shadows, true ) ) {
			$css_vars[] = '--sgs-hover-shadow:var(--wp--preset--shadow--' . esc_attr( $hover_shadow ) . ')';
		}
	}

	// Duration: emit as a reference to the theme.json motion token.
	// Slug maps to var(--wp--custom--duration--{slug}) e.g. 'medium' → 300ms.
	$allowed_durations = array( 'instant', 'fast', 'medium', 'slow', 'extra-slow' );
	$dur_slug          = in_array( $hover_dur_slug, $allowed_durations, true )
		? $hover_dur_slug
		: 'medium';
	$css_vars[]        = '--sgs-hover-duration:var(--wp--custom--duration--' . esc_attr( $dur_slug ) . ')';

	// Easing: emit as a reference to the theme.json motion token.
	// Slug maps to var(--wp--custom--easing--{slug}).
	$allowed_easings = array( 'default', 'ease-out', 'ease-in', 'spring', 'linear' );
	$easing_slug     = in_array( $hover_easing_slug, $allowed_easings, true )
		? $hover_easing_slug
		: 'default';
	$css_vars[]      = '--sgs-hover-easing:var(--wp--custom--easing--' . esc_attr( $easing_slug ) . ')';

	if ( $stagger_delay > 0 ) {
		$css_vars[] = '--sgs-stagger:' . absint( $stagger_delay ) . 'ms';
	}

	if ( $has_ripple ) {
		// Ripple colour: editor token if set, otherwise currentColour at 30% alpha via color-mix().
		// color-mix() is a safe CSS literal; sgs_colour_value() sanitises the token branch.
		if ( $click_ripple_colour ) {
			$css_vars[] = '--sgs-ripple-colour:' . \sgs_colour_value( $click_ripple_colour );
		} else {
			$css_vars[] = '--sgs-ripple-colour:color-mix(in srgb, currentColor 30%, transparent)';
		}
		$css_vars[] = '--sgs-ripple-duration:' . absint( $click_ripple_duration ) . 'ms';
	}

	// --- Resolve the scoping class for the scoped <style> rule below (Spec 32
	// no-inline contract) BEFORE any classes are injected into the root tag,
	// so the uid-pattern search sees only the block's OWN classes. ---
	$sgs_scope_class = '';
	if ( $css_vars ) {
		$sgs_root_tag_html = sgs_extract_root_opening_tag( substr( $block_content, $sgs_root_offset ) );
		$sgs_scope_class   = sgs_scope_class_for_root( $sgs_root_tag_html, 'sgs-hover' );
	}

	// --- Build extra classes. ---
	$add_classes = array();

	if ( $sgs_scope_class ) {
		$add_classes[] = $sgs_scope_class;
	}
	if ( $has_hover ) {
		$add_classes[] = 'sgs-has-hover';
	}
	// PER-PROPERTY hover classes (2026-08-10). Each exists so extensions.css can
	// gate that ONE declaration on real evidence that the operator set it.
	//
	// WHY THIS WAS NEEDED. The hover rules in extensions.css were gated on
	// `[style*="--sgs-hover-bg"]`, which can NEVER match — this file emits its
	// custom properties inside a scoped <style> and never writes a style=""
	// attribute (Spec 32 / FR-32-11, see sgs_append_scoped_var_style below).
	// Every hover colour/shadow rule was therefore DEAD on the frontend.
	//
	// Un-gating alone would have been a REGRESSION, not a fix. The early bail
	// above is per-BLOCK, not per-PROPERTY: a block that set only a hover SCALE
	// still carries `sgs-has-hover`, so an unconditional
	// `box-shadow: var(--sgs-hover-shadow, none)` would strip a resting shadow
	// on hover. CSS cannot express "declare this only if the var exists" —
	// var() ALWAYS declares, and no fallback value means "don't declare me".
	// So the gate has to come from the class list, which is what the
	// pre-existing `sgs-has-hover-scale` already did for scale. This extends
	// that same proven pattern to the shadow property.
	//
	// Each condition MIRRORS its `$css_vars[]` guard above exactly — if a var is
	// emitted, its class is emitted, and neither without the other.
	//
	// sgs-has-hover-bg/text/border were REMOVED 2026-08-20: sgsHoverBgColour/
	// TextColour/BorderColour were dead attrs (Bean, D-pending) — gated behind
	// the 'hover' opt-in extension that zero blocks declare, and duplicative
	// of each block's own element-owned backgroundColourHover/textColourHover/
	// borderColourHover controls. See hover-effects.js for the full removal.
	if ( $hover_shadow && in_array( $hover_shadow, array( 'subtle', 'raised', 'floating', 'glow' ), true ) ) {
		// Mirrors the allowlist on the --sgs-hover-shadow var above: an
		// out-of-list value emits NO var, so it must emit no class either.
		$add_classes[] = 'sgs-has-hover-shadow';
	}
	// ⛔ THE ALLOW-LIST MUST BE MIRRORED HERE — it was not, and the comment on the
	// shadow branch directly above ("out-of-list value emits NO var, so it must
	// emit no class either") described a rule its own neighbour broke.
	//
	// The var guard above only emits `--sgs-hover-scale` for a preset in
	// ('1.02','1.05','1.1'). This condition had NO allow-list, so an out-of-list
	// preset emitted the CLASS WITHOUT THE VAR. Both consumers then fell back to
	// their own defaults — and they differ: the generic root rule
	// (`extensions.css`) falls back to `scale(1)` (no-op), while a block-owned
	// item rule such as `card-grid/style.css:237` falls back to `scale(1.05)`.
	// One operator setting, two different behaviours, decided by which stylesheet
	// happened to match. Found 2026-08-26 by the WP-core seat of the hover council.
	$sgs_scale_allowed = array( '1.02', '1.05', '1.1' );
	if ( $hover_scale || ( $hover_scale_preset && in_array( $hover_scale_preset, $sgs_scale_allowed, true ) ) ) {
		$add_classes[] = 'sgs-has-hover-scale';
	}
	if ( $hover_img_zoom ) {
		$add_classes[] = 'sgs-has-img-zoom';
	}
	if ( $hover_grayscale ) {
		$add_classes[] = 'sgs-has-grayscale';
	}
	if ( $hover_border_acc ) {
		$add_classes[] = 'sgs-has-border-accent';
	}
	if ( $hover_tilt_3d ) {
		$add_classes[] = 'sgs-has-tilt-3d';
	}
	if ( $stagger_delay > 0 ) {
		$add_classes[] = 'sgs-has-stagger';
	}
	if ( $focus_ring ) {
		$add_classes[] = 'sgs-has-focus-ring';
	}
	if ( $block_link ) {
		$add_classes[] = 'sgs-has-block-link';
	}
	if ( $has_ripple ) {
		$add_classes[] = 'sgs-has-click-ripple';
	}

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
	// Stretched-link pattern: the overlay is a SIBLING of the content, never
	// a wrapper, so a link/button already inside the block (e.g. card-grid
	// items, team-member socials) never nests inside a second <a> — invalid
	// HTML the old whole-block wrap produced. `.sgs-has-block-link` (already
	// added to the root's class list above) gives the root the positioning
	// context the overlay needs; extensions.css raises real interactive
	// descendants above the overlay via z-index.
	if ( $block_link ) {
		$target_attr = $block_link_target
			? ' target="_blank" rel="noopener noreferrer"'
			: '';

		// An empty anchor is invisible to screen readers without an
		// accessible name — aria-label is required, never optional. Prefer
		// the operator-supplied label; fall back to the link's host so the
		// overlay is never unlabelled even when the control is left blank.
		$link_label = $block_link_label;
		if ( '' === $link_label ) {
			$link_host  = wp_parse_url( $block_link, PHP_URL_HOST );
			$link_label = $link_host ? $link_host : $block_link;
		}

		$overlay_html = sprintf(
			'<a class="sgs-block-link-overlay" href="%s" aria-label="%s"%s></a>',
			esc_url( $block_link ),
			esc_attr( $link_label ),
			$target_attr
		);

		// Locate the ROOT element's own closing tag (the LAST occurrence of
		// its tag name's closing tag WITHIN $sgs_root — never within a
		// prepended <style>/<script> block, which would otherwise be
		// mistaken for the root and swallow the overlay as inert CSS text,
		// see $sgs_root_offset above) and insert the overlay immediately
		// before it, making it the root's final child rather than a wrapper
		// around the whole subtree.
		$sgs_root = substr( $block_content, $sgs_root_offset );
		if ( preg_match( '/^<([a-zA-Z][a-zA-Z0-9-]*)\b/', $sgs_root, $root_tag_match ) ) {
			$root_close_tag = '</' . $root_tag_match[1] . '>';
			$root_close_pos = strrpos( $sgs_root, $root_close_tag );
			if ( false !== $root_close_pos ) {
				$sgs_root      = substr_replace( $sgs_root, $overlay_html, $root_close_pos, 0 );
				$block_content = substr( $block_content, 0, $sgs_root_offset ) . $sgs_root;
			}
		}
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
