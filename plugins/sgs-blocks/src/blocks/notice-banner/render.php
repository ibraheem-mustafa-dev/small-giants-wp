<?php
/**
 * Server-side render for sgs/notice-banner.
 *
 * Dynamic render (save.js returns null; deprecated.js v2/v1 round-trip older
 * static instances). The icon is the variant's ideal default (Lucide) unless the
 * operator picks an override via the shared IconPicker (any of the four sources).
 *
 * WS-4: CONTENT kind — width/spacing layers only (no bg/overlay/grid).
 * notice-banner's own background, border, icon, and per-variant styling are
 * driven by its BEM classes and CSS; SGS_Container_Wrapper CONTENT kind adds
 * no bg/overlay, so those identities are automatically preserved.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (sgs/text child carrying the notice message).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/wp-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// FR-22-6: $text is no longer rendered here — the text content slot is now
// an InnerBlocks child (sgs/text), emitted via $content below.
// Retained in block.json for deprecated.js back-compat only. R-22-14: no fallback.
$variant     = $attributes['variant'] ?? 'info';
$icon_source = $attributes['iconSource'] ?? '';
$icon_name   = $attributes['iconName'] ?? '';

// Show the icon? New posts use the explicit showIcon toggle. Backwards-compat:
// older posts hid the icon with the legacy icon='none' value.
$legacy_icon = $attributes['icon'] ?? '';
$show_icon   = ! empty( $attributes['showIcon'] ) && 'none' !== $legacy_icon;

// Ideal default icon per variant (Lucide). Keep in sync with edit.js.
$variant_default = array(
	'info'    => 'info',
	'success' => 'circle-check',
	'warning' => 'triangle-alert',
	'error'   => 'circle-x',
	'accent'  => 'sparkles',
);

// Resolve the icon: an explicit override wins, else the variant's default.
if ( $icon_source && $icon_name ) {
	$resolved_source = $icon_source;
	$resolved_name   = $icon_name;
} else {
	$resolved_source = 'lucide';
	$resolved_name   = $variant_default[ $variant ] ?? 'info';
}

// Build the icon markup from the resolved source.
$icon_html = '';
if ( $show_icon ) {
	switch ( $resolved_source ) {
		case 'emoji':
			$icon_html = esc_html( $resolved_name );
			break;
		case 'dashicon':
			$slug      = preg_replace( '/[^a-z0-9-]/', '', strtolower( $resolved_name ) );
			$icon_html = '<span class="dashicons dashicons-' . esc_attr( $slug ) . '"></span>';
			wp_enqueue_style( 'dashicons' );
			break;
		case 'wp-icon':
			$icon_html = sgs_get_wp_icon( preg_replace( '/[^a-z0-9-]/', '', strtolower( $resolved_name ) ) );
			break;
		case 'lucide':
		default:
			$icon_html = sgs_get_lucide_icon( preg_replace( '/[^a-z0-9-]/', '', strtolower( $resolved_name ) ) );
			break;
	}
}

// FR-22-6: text colour + size are now carried on the sgs/text child block's
// own attrs and rendered by that block's render.php. No wrapper-level text
// style injection needed here — $content carries the already-rendered child.

// -------------------------------------------------------------------------
// Wrapper classes — BEM root + variant modifier.
// These ride on notice-banner's own CSS and are NOT affected by CONTENT kind,
// which only adds width/spacing layers.
// -------------------------------------------------------------------------
$sgs_wrapper_classes = array( 'sgs-notice-banner', 'sgs-notice-banner--' . sanitize_html_class( $variant ) );

// -------------------------------------------------------------------------
// Interior HTML — icon + InnerBlocks content.
// FR-22-6: text content is $content (sgs/text InnerBlock). R-22-14: no fallback.
// -------------------------------------------------------------------------
$sgs_inner_html = '';
if ( $icon_html ) {
	$sgs_inner_html .= '<span class="sgs-notice-banner__icon" aria-hidden="true">' . $icon_html . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG from first-party icon maps; dashicon slug + emoji escaped above.
}
$sgs_inner_html .= $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WP core InnerBlocks output.

// -------------------------------------------------------------------------
// WS-4 CONTENT kind: SGS_Container_Wrapper adds width/spacing controls only.
// role="note" is passed via extra_attrs so the semantic role is preserved on
// the wrapper element that get_block_wrapper_attributes() emits.
// -------------------------------------------------------------------------
$sgs_output = SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$sgs_inner_html,
	'content',
	array(
		'tag'           => 'div',
		'extra_classes' => $sgs_wrapper_classes,
		'extra_attrs'   => array( 'role' => 'note' ),
	)
);
echo $sgs_output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() returns pre-sanitised HTML.
