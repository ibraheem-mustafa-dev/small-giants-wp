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

// D635-pattern migration: background now reads from the flat backgroundColour
// attr (SgsColourPanel), not native style.color.background (supports.color.
// background is now false). Text was turned off with no replacement attr
// (block.json's element note: decorative-only children never inherit `color`
// visibly). Gradient stays native (supports.color.gradients unchanged).
$sgs_ps_color_args = array();
if ( isset( $attributes['backgroundColour'] ) && '' !== $attributes['backgroundColour'] ) {
	$sgs_ps_color_args['background'] = (string) $attributes['backgroundColour'];
}
if ( ! empty( $sgs_ps_style_group['color']['gradient'] ) ) {
	$sgs_ps_color_args['gradient'] = (string) $sgs_ps_style_group['color']['gradient'];
}
if ( ! empty( $sgs_ps_color_args ) ) {
	$sgs_ps_engine_input['color'] = $sgs_ps_color_args;
}
if ( ! empty( $sgs_ps_style_group['border'] ) && is_array( $sgs_ps_style_group['border'] ) ) {
	$sgs_ps_engine_input['border'] = $sgs_ps_style_group['border'];
}

if ( ! empty( $sgs_ps_engine_input ) ) {
	$sgs_ps_uid = 'sgs-ps-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
	$sgs_ps_sel = '.' . $sgs_ps_uid . '.wp-block-sgs-physics-canvas';

	$sgs_ps_engine_styles = wp_style_engine_get_styles(
		$sgs_ps_engine_input,
		array( 'selector' => $sgs_ps_sel )
	);
	if ( ! empty( $sgs_ps_engine_styles['css'] ) ) {
		$sgs_ps_supports_css       = $sgs_ps_engine_styles['css'];
		$sgs_ps_supports_classes[] = $sgs_ps_uid;
	}
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
if ( ! empty( $sgs_ps_supports_classes ) ) {
	$sgs_ps_wrapper_opts['extra_classes'] = $sgs_ps_supports_classes;
}

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
	wp_enqueue_script_module( '@sgs/gsap' );
	wp_enqueue_script_module( '@sgs/motion-provider' );
	wp_enqueue_script_module( '@sgs/gsap-draggable' );
	wp_enqueue_script_module( '@sgs/gsap-inertia' );
	wp_enqueue_script_module( '@sgs/gsap-physics2d' );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() returns pre-sanitised HTML; the prepended <style> is stripped of tags above.
echo $sgs_ps_output;
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
