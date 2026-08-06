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
// No-inline residual (Spec 32) — same pattern as sgs/container's render.php:
// block.json skip-serialises color/border, so extract + emit via the core
// style engine as a scoped rule, and hand the wrapper only a class name.
// ---------------------------------------------------------------------------

$sgs_ps_style_group = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();

$sgs_ps_supports_css     = '';
$sgs_ps_supports_classes = array();

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$sgs_ps_engine_input = array();

	if ( ! empty( $sgs_ps_style_group['color'] ) && is_array( $sgs_ps_style_group['color'] ) ) {
		$sgs_ps_engine_input['color'] = $sgs_ps_style_group['color'];
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
		'data-sgs-physics-canvas' => '1',
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

// 'section' kind — matches block.json's declared containerKind: 'section'
// (composite-mirror rule, D152). NOT 'content': this block never renders its
// own background-image/video/SVG/shape-divider attributes, so the extra
// layers 'section' kind can address simply never activate — but the kind
// argument must still agree with the declared containerKind or a future
// capability added to the wrapper (padding/gap/contentWidth on THIS layer)
// would silently be unreachable here while every other section-kind
// composite gets it for free.
$sgs_ps_output = SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'section',
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

if ( $sgs_ps_is_frontend && function_exists( 'wp_enqueue_script_module' ) && trim( $content ) !== '' ) {
	wp_enqueue_script_module( '@sgs/gsap' );
	wp_enqueue_script_module( '@sgs/motion-provider' );
	wp_enqueue_script_module( '@sgs/gsap-draggable' );
	wp_enqueue_script_module( '@sgs/gsap-inertia' );
	wp_enqueue_script_module( '@sgs/gsap-physics2d' );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() returns pre-sanitised HTML; the prepended <style> is stripped of tags above.
echo $sgs_ps_output;
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
