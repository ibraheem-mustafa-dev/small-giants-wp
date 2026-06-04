<?php
/**
 * SGS Tabs — server-side render.
 *
 * WS-4 composite-mirror: outer wrapper via SGS_Container_Wrapper (layout kind).
 * data-tabs-block + id attributes are passed via extra_attrs so view.js continues
 * to find the block via document.querySelectorAll('[data-tabs-block]').
 *
 * Builds the tab navigation (role="tablist") and tab panels (role="tabpanel")
 * from the inner sgs/tab child blocks. Handles deep linking via data attributes
 * consumed by view.js.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (not used — we render manually).
 * @var \WP_Block $block      Block instance with ->inner_blocks available.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

$orientation = $attributes['orientation'] ?? 'horizontal';
$tab_style   = $attributes['tabStyle'] ?? 'underline';
$tab_align   = $attributes['tabAlignment'] ?? 'left';
$transition  = isset( $attributes['transitionDuration'] )
	? (int) $attributes['transitionDuration']
	: 200;

// Collect tabs from inner blocks.
$tabs = array(); // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- local render.php scope; $tabs is not a WP global.
foreach ( $block->inner_blocks as $inner_block ) {
	if ( 'sgs/tab' !== $inner_block->name ) {
		continue;
	}
	$tabs[] = array( // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- $tabs[] append, not a WP global.
		'label'   => isset( $inner_block->attributes['label'] )
			? wp_strip_all_tags( $inner_block->attributes['label'] )
			: __( 'Tab', 'sgs-blocks' ),
		'content' => ( new WP_Block( $inner_block->parsed_block ) )->render(),
	);
}

if ( empty( $tabs ) ) {
	return;
}

// Generate a stable block ID for ARIA relationships.
$block_id = ! empty( $attributes['anchor'] )
	? sanitize_html_class( $attributes['anchor'] )
	: 'sgs-tabs-' . substr( md5( serialize( $attributes ) . count( $tabs ) ), 0, 8 ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.serialize_serialize -- $attributes is a plain array of scalars from block.json; no objects, no injection risk.

// ─── Inline CSS custom properties ───────────────────────────────────────────
$css_vars = array();

$colour_props = array(
	'tabTextColour'            => '--sgs-tab-text',
	'tabActiveTextColour'      => '--sgs-tab-active-text',
	'tabActiveBgColour'        => '--sgs-tab-active-bg',
	'tabActiveIndicatorColour' => '--sgs-tab-active-indicator',
	'tabHoverBgColour'         => '--sgs-tab-hover-bg',
	'panelBgColour'            => '--sgs-panel-bg',
	'panelBorderColour'        => '--sgs-panel-border',
);

foreach ( $colour_props as $attr => $prop ) {
	if ( ! empty( $attributes[ $attr ] ) ) {
		$resolved = sgs_colour_value( $attributes[ $attr ] );
		if ( $resolved ) {
			$css_vars[] = $prop . ':' . $resolved;
		}
	}
}

$css_vars[] = '--sgs-transition-duration:' . $transition . 'ms';

// ─── Own classes + styles ─────────────────────────────────────────────────────
$extra_classes = array(
	'sgs-tabs',
	'sgs-tabs--' . esc_attr( $orientation ),
	'sgs-tabs--style-' . esc_attr( $tab_style ),
	'sgs-tabs--align-' . esc_attr( $tab_align ),
);

$extra_styles = $css_vars;

// ─── Attrs that view.js queries on the OUTER wrapper ─────────────────────────
// view.js: document.querySelectorAll('[data-tabs-block]')
// The id is also on the outer wrapper for ARIA labelledby on panels.
$extra_attrs = array(
	'id'              => esc_attr( $block_id ),
	'data-tabs-block' => 'true',
);

// ─── Build interior HTML (tablist + panels) ───────────────────────────────────
$tab_count   = count( $tabs );
$nav_html    = '';
$panels_html = '';

$aria_label = ! empty( $attributes['blockLabel'] )
	? $attributes['blockLabel']
	: ( ! empty( $tabs[0]['label'] ) ? $tabs[0]['label'] : __( 'Content tabs', 'sgs-blocks' ) );

$nav_html .= sprintf(
	'<div class="sgs-tabs__nav" role="tablist" aria-label="%s" aria-orientation="%s">',
	esc_attr( $aria_label ),
	esc_attr( $orientation )
);

foreach ( $tabs as $i => $tab ) { // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- $tab is not a WP global; local loop variable.
	$tab_id   = esc_attr( $block_id . '-tab-' . $i );
	$panel_id = esc_attr( $block_id . '-panel-' . $i );
	$is_first = ( 0 === $i );

	$nav_html .= sprintf(
		'<button id="%s" class="sgs-tabs__tab%s" role="tab" aria-selected="%s" aria-controls="%s" tabindex="%s" data-tab-index="%d">%s</button>',
		$tab_id,
		$is_first ? ' sgs-tabs__tab--active' : '',
		$is_first ? 'true' : 'false',
		$panel_id,
		$is_first ? '0' : '-1',
		$i,
		esc_html( $tab['label'] )
	);
}

$nav_html .= '</div>';

$panels_html .= '<div class="sgs-tabs__panels">';
foreach ( $tabs as $i => $tab ) { // phpcs:ignore WordPress.WP.GlobalVariablesOverride.Prohibited -- $tab is not a WP global; local loop variable.
	$tab_id   = esc_attr( $block_id . '-tab-' . $i );
	$panel_id = esc_attr( $block_id . '-panel-' . $i );
	$is_first = ( 0 === $i );

	$panels_html .= sprintf(
		'<div id="%s" class="sgs-tabs__panel" role="tabpanel" aria-labelledby="%s" tabindex="0"%s>%s</div>',
		$panel_id,
		$tab_id,
		$is_first ? '' : ' hidden',
		$tab['content'] // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- rendered block HTML.
	);
}
$panels_html .= '</div>';

$inner_html = $nav_html . $panels_html;

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $extra_classes,
		'extra_styles'  => $extra_styles,
		'extra_attrs'   => $extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
