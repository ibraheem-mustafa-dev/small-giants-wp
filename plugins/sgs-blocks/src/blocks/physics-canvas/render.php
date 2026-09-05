<?php
/**
 * Server-side render for the SGS Physics Canvas block.
 *
 * Spec 38 FR-38-27 / D447. DECORATIVE-ONLY: nothing operable or must-read may
 * ever be placed inside (enforced editor-side via edit.js's restricted
 * `allowedBlocks`) — a thrown object has no discrete single-pointer
 * alternative, so WCAG 2.5.7 is dissolved by construction rather than
 * answered. The whole arena is `aria-hidden`, matching that constraint.
 *
 * Composite-mirror rule (D152): delegates wrapper assembly to
 * SGS_Container_Wrapper::render() exactly as sgs/container does, so this
 * block never diverges from the shared padding/max-width/contentWidth/gap/
 * background capability set.
 *
 * Progressive enhancement: the markup below is the FINISHED, readable state —
 * children render in normal document flow with no inline positioning. JS
 * (view.js) upgrades them to draggable/thrown bodies only when it boots, and
 * only when the visitor has not asked for reduced motion. With JS blocked, or
 * under `prefers-reduced-motion: reduce`, this is a plain static section.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/shape-dividers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// ---------------------------------------------------------------------------
// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
// --check. Same pattern as sgs/container's render.php: extract + emit via
// the core style engine as a scoped rule, and hand the wrapper only a class
// name.
// ---------------------------------------------------------------------------

$sgs_ps_style_group = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();

$sgs_ps_supports_css     = '';
$sgs_ps_supports_classes = array();

$sgs_ps_engine_input = array();

// D635-pattern migration: text was turned off with no replacement attr
// (block.json's element note: decorative-only children never inherit `color`
// visibly). Background (colour + gradient, resting + hover) is owned by the
// shared fill emitter below, NOT by the style engine and NOT by
// supports.color.gradients.
//
// supports.color.gradients was `true` here, so CORE rendered its own gradient
// panel in the Styles tab, competing with the SGS colour panel — the client
// saw two and could not tell which won. Switching the flag off alone would
// have REMOVED the only gradient control this block had, because the sole
// gradient read was $sgs_ps_style_group['color']['gradient'] (core's own
// storage). The flag flip is therefore PAIRED with a block-private
// backgroundColourGradient exposed through fillRow(), so capability is moved
// rather than lost.
if ( ! empty( $sgs_ps_style_group['border'] ) && is_array( $sgs_ps_style_group['border'] ) ) {
	$sgs_ps_engine_input['border'] = $sgs_ps_style_group['border'];
}

// Uid is computed UNCONDITIONALLY (not just when the style engine has
// output) — the shared fill emitter below always needs a stable selector to
// attach to, and the uid class must always be present on the wrapper for
// that selector to resolve.
$sgs_ps_uid                = 'sgs-ps-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$sgs_ps_sel                = '.' . $sgs_ps_uid . '.wp-block-sgs-physics-canvas';
$sgs_ps_supports_classes[] = $sgs_ps_uid;

if ( ! empty( $sgs_ps_engine_input ) ) {
	$sgs_ps_engine_styles = wp_style_engine_get_styles(
		$sgs_ps_engine_input,
		array( 'selector' => $sgs_ps_sel )
	);
	if ( ! empty( $sgs_ps_engine_styles['css'] ) ) {
		$sgs_ps_supports_css = $sgs_ps_engine_styles['css'];
	}
}

$sgs_ps_fill_css = sgs_fill_states_css(
	$sgs_ps_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $sgs_ps_fill_css ) {
	$sgs_ps_supports_css .= $sgs_ps_fill_css;
}

$sgs_ps_preset_bg       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
$sgs_ps_preset_gradient = isset( $attributes['gradient'] ) ? sanitize_html_class( $attributes['gradient'] ) : '';

if ( '' !== $sgs_ps_preset_bg ) {
	$sgs_ps_supports_classes[] = 'has-background';
	$sgs_ps_supports_classes[] = 'has-' . $sgs_ps_preset_bg . '-background-color';
}
if ( '' !== $sgs_ps_preset_gradient ) {
	$sgs_ps_supports_classes[] = 'has-background';
	$sgs_ps_supports_classes[] = 'has-' . $sgs_ps_preset_gradient . '-gradient-background';
}

// Physics config — carried as data-* (never inline style, Spec 32). Clamped
// server-side so a hand-edited or migrated attribute cannot hand view.js a
// nonsensical value (negative gravity, bounce > 1).
$sgs_ps_gravity = isset( $attributes['physicsGravity'] ) ? (float) $attributes['physicsGravity'] : 1400;
$sgs_ps_gravity = max( 0, min( 6000, $sgs_ps_gravity ) );

$sgs_ps_bounce = isset( $attributes['physicsBounce'] ) ? (float) $attributes['physicsBounce'] : 0.55;
$sgs_ps_bounce = max( 0, min( 1, $sgs_ps_bounce ) );

$sgs_ps_edge_resistance = isset( $attributes['physicsEdgeResistance'] ) ? (float) $attributes['physicsEdgeResistance'] : 0.5;
$sgs_ps_edge_resistance = max( 0, min( 1, $sgs_ps_edge_resistance ) );

$sgs_ps_wrapper_opts = array(
	'tag'         => isset( $attributes['tagName'] ) ? sanitize_key( $attributes['tagName'] ) : 'section',
	'wrap_inner'  => true, // Always emit __inner — it IS the throw arena view.js binds to.
	'extra_attrs' => array(
		'data-sgs-physics-canvas'  => '1',
		'data-sgs-physics-gravity' => (string) $sgs_ps_gravity,
		'data-sgs-physics-bounce'  => (string) $sgs_ps_bounce,
		'data-sgs-physics-edge'    => (string) $sgs_ps_edge_resistance,
		// DECORATIVE-ONLY (FR-38-27): the whole arena carries no information a
		// screen-reader user needs, so it is removed from the accessibility
		// tree entirely rather than partially described.
		'aria-hidden'              => 'true',
	),
);
// Unconditional: the uid class is pushed onto $sgs_ps_supports_classes above on
// every render (it has to be — the scoped fill CSS keys on it), so this array is
// never empty and the `! empty()` guard that used to sit here could never be
// false. A guard that cannot fail reads like a condition and is not one.
$sgs_ps_wrapper_opts['extra_classes'] = $sgs_ps_supports_classes;

// Migrated to SGS_Container_Wrapper::resolve_kind() 2026-08-16 (D626/D633
// step 6, Phase B, second pass) after 2113eeb6 fixed the helper. An earlier
// version of resolve_kind() narrowed this block's kind from 'section' to
// 'content' (its enabledExtensions is ['background'] only — no
// 'shapeDividers'/'gridItems'/'layout'), which would have been a genuine
// interaction-risk regression: class-sgs-container-wrapper.php's
// $is_section gate (L853) controls the BASE desktop min-height entirely, and
// this block's minHeight (480px desktop/320px mobile) IS the throw arena's
// rendered box height that view.js reads as Draggable's bounds and the
// Physics2D floor/wall geometry — narrowing would have silently collapsed
// the arena. Caught before shipping, reported, and fixed at the source —
// resolve_kind() no longer narrows away from $fallback at all; it is a
// pass-through today (real per-capability narrowing is step 7 scope).
// Re-verified directly against the merged fix before wiring this in: every
// code path in resolve_kind() returns $fallback unconditionally, so this
// call is behaviourally identical to the literal 'section' it replaces —
// minHeight/vertical-align-centring/band-padding all keep rendering exactly
// as before.
$sgs_ps_output = SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	SGS_Container_Wrapper::resolve_kind( $block, 'section' ),
	$sgs_ps_wrapper_opts
);


// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt = '' !== $border_width_top ? $border_width_top : '0';
		$bwr = '' !== $border_width_right ? $border_width_right : '0';
		$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl = '' !== $border_width_left ? $border_width_left : '0';
		$sgs_ps_supports_css .= $sgs_ps_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$sgs_ps_supports_css .= sgs_border_gradient_css( $sgs_ps_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$sgs_ps_supports_css .= $sgs_ps_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$sgs_ps_supports_css .= $sgs_ps_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$radius_tiers = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $sgs_ps_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$sgs_ps_supports_css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $sgs_ps_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$sgs_ps_supports_css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $sgs_ps_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$sgs_ps_supports_css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

if ( '' !== $sgs_ps_supports_css ) {
	$sgs_ps_output = '<style>' . wp_strip_all_tags( $sgs_ps_supports_css ) . '</style>' . $sgs_ps_output;
}

// ---------------------------------------------------------------------------
// Tier G conditional load (Spec 38 §4.4). No block, no bytes: these calls only
// run on a page that actually renders this block — the same "proxy-enqueue"
// pattern already proven live by src/blocks/buybox/render.php. Registration
// (wp_register_script_module) happens once, for free, in
// SGS_Motion_Registry::register_modules(); only THIS enqueue call causes any
// byte to leave the server, and only for a page carrying this block.
// ---------------------------------------------------------------------------

$sgs_ps_is_frontend = ! function_exists( 'SGS\\Blocks\\sgs_is_frontend_render' ) || \SGS\Blocks\sgs_is_frontend_render();

if ( $sgs_ps_is_frontend && trim( $content ) !== '' ) {
	// The view module's dependency graph (needed so its bare `@sgs/*`
	// imports resolve via the browser's import map) is corrected in
	// SGS_Motion_Registry::preregister_physics_canvas_deps() — it MUST run
	// before WP core auto-registers this block's viewScriptModule handle
	// (init priority 10), so it cannot live here: render.php only runs at
	// render time, long after every `init` hook has already fired, and
	// WP_Script_Modules::register() is a no-op once an id is registered.
	wp_enqueue_script_module( '@sgs/gsap' );
	wp_enqueue_script_module( '@sgs/motion-provider' );
	wp_enqueue_script_module( '@sgs/gsap-draggable' );
	wp_enqueue_script_module( '@sgs/gsap-inertia' );
	wp_enqueue_script_module( '@sgs/gsap-physics2d' );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() returns pre-sanitised HTML; the prepended <style> is stripped of tags above.
echo $sgs_ps_output;
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
