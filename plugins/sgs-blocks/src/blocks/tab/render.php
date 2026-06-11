<?php
/**
 * SGS Tab — server-side render.
 *
 * WS-4 composite-mirror: CONTENT kind — width/spacing layers only via
 * SGS_Container_Wrapper::render(). The tab panel wrapper carries full
 * ARIA tabpanel semantics required by the parent sgs/tabs view.js:
 *   - role="tabpanel"          (ARIA role — tabs view.js shows/hides panels)
 *   - id="{panel_id}"          (referenced by the matching <button aria-controls>)
 *   - aria-labelledby="{tab}"  (references the matching tab button)
 *   - tabindex="0"             (keyboard-reachable panel per ARIA tabs pattern)
 *
 * All four are carried via extra_attrs so the parent tabs block's view.js
 * can find and toggle panel visibility without coupling to render internals.
 * The .sgs-tab__content inner div stays inside $inner_html (= $content).
 *
 * R-22-14: explicit discriminators, never empty($content).
 *
 * @var array    $attributes Block attributes (label, anchor, etc.).
 * @var string   $content    Rendered inner blocks (InnerBlocks markup).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// Generate stable IDs for ARIA relationships.
// The parent tabs block provides tab IDs; we derive the panel ID from the block's anchor.
$block_id = isset( $attributes['anchor'] ) ? sanitize_html_class( $attributes['anchor'] ) : '';
$panel_id = ! empty( $block_id ) ? $block_id : '';

// The tab content is wrapped in a .sgs-tab__content div (unchanged from original).
$inner_html = sprintf(
	'<div class="sgs-tab__content">%s</div>',
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Inner blocks are already escaped.
);

// NO ARIA tab attrs here — the parent sgs/tabs render.php wraps every tab in
// its own .sgs-tabs__panel[role="tabpanel"] wrapper and its view.js toggles
// THOSE (verified: view.js queries .sgs-tabs__panel only). The child emitting
// role="tabpanel"/tabindex too produced NESTED duplicate tabpanels (8 for 4
// tabs — caught live on the canary PDP 2026-06-11). Keep the optional anchor
// id for deep links; drop the duplicated semantics.
$extra_attrs = array();

if ( '' !== $panel_id ) {
	$extra_attrs['id'] = esc_attr( $panel_id );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() output is pre-sanitised; arrays are caller-built with esc_attr().
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'content',
	array(
		'tag'           => 'div',
		'extra_classes' => array( 'sgs-tab' ),
		'extra_attrs'   => $extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
