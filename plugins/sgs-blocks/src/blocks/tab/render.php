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
$block_id   = isset( $attributes['anchor'] ) ? sanitize_html_class( $attributes['anchor'] ) : '';
$panel_id   = ! empty( $block_id ) ? $block_id : '';
$tab_id_ref = ! empty( $block_id ) ? str_replace( '-panel-', '-tab-', $block_id ) : '';

// The tab content is wrapped in a .sgs-tab__content div (unchanged from original).
$inner_html = sprintf(
	'<div class="sgs-tab__content">%s</div>',
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Inner blocks are already escaped.
);

// Build extra_attrs — ALL four ARIA/role attrs the tabs view.js depends on.
$extra_attrs = array(
	'role'     => 'tabpanel',
	'tabindex' => '0',
);

if ( '' !== $panel_id ) {
	$extra_attrs['id'] = esc_attr( $panel_id );
}
if ( '' !== $tab_id_ref ) {
	$extra_attrs['aria-labelledby'] = esc_attr( $tab_id_ref );
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
