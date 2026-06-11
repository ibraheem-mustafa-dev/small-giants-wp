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
 * Announcement mode (displayMode='announcement'):
 * Renders a full-width, fixed-position page-level bar. When dismissible=true a
 * close button + WP Interactivity context is emitted. The dismiss flag is stored
 * in sessionStorage (session) or localStorage (permanent) keyed by anchor/wp_unique_id.
 * A pre-paint <script> sets display:none before the first paint if the flag is
 * already stored, eliminating any flash of the dismissed bar.
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
$variant           = $attributes['variant'] ?? 'info';
$icon_source       = $attributes['iconSource'] ?? '';
$icon_name         = $attributes['iconName'] ?? '';
$icon_colour       = $attributes['iconColour'] ?? '';
$display_mode      = $attributes['displayMode'] ?? 'inline';
$sticky_position   = $attributes['stickyPosition'] ?? 'top';
$dismissible       = ! empty( $attributes['dismissible'] );
$dismiss_behaviour = $attributes['dismissBehaviour'] ?? 'session';

$is_announcement = ( 'announcement' === $display_mode );

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

if ( $is_announcement ) {
	$sgs_wrapper_classes[] = 'sgs-notice-banner--announcement';
	$sgs_wrapper_classes[] = 'sgs-notice-banner--sticky-' . sanitize_html_class( $sticky_position );
	if ( $dismissible ) {
		$sgs_wrapper_classes[] = 'sgs-notice-banner--dismissible';
	}
}

// -------------------------------------------------------------------------
// Interior HTML — icon + InnerBlocks content + optional close button.
// FR-22-6: text content is $content (sgs/text InnerBlock). R-22-14: no fallback.
// -------------------------------------------------------------------------
$sgs_inner_html = '';
if ( $icon_html ) {
	$icon_colour_style = '';
	if ( $icon_colour ) {
		$icon_colour_style = ' style="color:' . esc_attr( sgs_colour_value( $icon_colour ) ) . '"';
	}
	$sgs_inner_html .= '<span class="sgs-notice-banner__icon" aria-hidden="true"' . $icon_colour_style . '>' . $icon_html . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG from first-party icon maps; dashicon slug + emoji escaped above. $icon_colour_style uses esc_attr().
}
$sgs_inner_html .= $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WP core InnerBlocks output.

// Close button — announcement + dismissible only.
// The × is a decorative glyph; the accessible name comes from aria-label.
if ( $is_announcement && $dismissible ) {
	$sgs_inner_html .= '<button class="sgs-notice-banner__close" type="button" aria-label="' . esc_attr__( 'Dismiss announcement', 'sgs-blocks' ) . '" data-wp-on--click="actions.dismiss"><span aria-hidden="true">&times;</span></button>';
}

// -------------------------------------------------------------------------
// Announcement mode: WP Interactivity context + pre-paint hide script.
//
// A per-instance storage key (anchor or wp_unique_id) ensures multiple
// announcement banners on one page are tracked independently.
//
// Pre-paint strategy: a tiny inline <script> checks storage BEFORE the
// first paint and sets display:none on the element when the dismiss flag is
// present, eliminating flash-of-dismissed-content.
// -------------------------------------------------------------------------
$output = '';

if ( $is_announcement && $dismissible ) {
	// Use the block's anchor if set, otherwise generate a stable unique ID.
	$anchor      = $attributes['anchor'] ?? '';
	$block_id    = $anchor ? sanitize_html_class( $anchor ) : wp_unique_id( 'sgs-notice-' );
	$storage_key = 'sgs-notice-dismissed-' . $block_id;

	// Pre-paint inline script — checks sessionStorage / localStorage before
	// the first paint so the element never flickers visible.
	// phpcs:disable WordPress.WP.EnqueuedResources.NonEnqueuedScript
	if ( 'session' === $dismiss_behaviour ) {
		$prepaint_js = 'if(sessionStorage.getItem(' . wp_json_encode( $storage_key ) . ")){document.currentScript.parentElement.style.display='none';}";
	} else {
		$expiry_check = 'var _d=localStorage.getItem(' . wp_json_encode( $storage_key ) . ");if(_d){try{var _p=JSON.parse(_d);if(_p.expiry>Date.now()){document.currentScript.parentElement.style.display='none';}}catch(e){}}";
		$prepaint_js  = $expiry_check;
	}
	// phpcs:enable WordPress.WP.EnqueuedResources.NonEnqueuedScript

	$extra_attrs = array(
		'role'                        => 'banner',
		'aria-label'                  => __( 'Site announcement', 'sgs-blocks' ),
		'data-wp-interactive'         => 'sgs/notice-banner',
		'data-wp-context'             => wp_json_encode(
			array(
				'isDismissed'      => false,
				'blockId'          => $block_id,
				'storageKey'       => $storage_key,
				'dismissBehaviour' => $dismiss_behaviour,
			)
		),
		'data-wp-class--is-dismissed' => 'context.isDismissed',
		'data-wp-watch'               => 'callbacks.init',
	);

	// Wrap inner HTML in a containing div so the pre-paint script sits inside
	// the wrapper element and can reference currentScript.parentElement.
	$sgs_inner_html = '<script>' . $prepaint_js . '</script>' . $sgs_inner_html; // phpcs:ignore WordPress.WP.EnqueuedResources.NonEnqueuedScript -- Intentional pre-paint inline script; no alternative for FODC prevention.
} else {
	// Inline mode or non-dismissible announcement: no Interactivity context needed.
	$extra_attrs = array( 'role' => ( $is_announcement ? 'banner' : 'note' ) );
	if ( $is_announcement ) {
		$extra_attrs['aria-label'] = __( 'Site announcement', 'sgs-blocks' );
	}
}

// -------------------------------------------------------------------------
// WS-4 CONTENT kind: SGS_Container_Wrapper adds width/spacing controls only.
// Announcement mode bypasses CONTENT kind (it must be full-width + fixed)
// and calls get_block_wrapper_attributes() directly.
// -------------------------------------------------------------------------
if ( $is_announcement ) {
	$wrapper_attrs = get_block_wrapper_attributes(
		array_merge(
			array( 'class' => implode( ' ', $sgs_wrapper_classes ) ),
			$extra_attrs
		)
	);
	$output        = '<div ' . $wrapper_attrs . '>' . $sgs_inner_html . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attrs from get_block_wrapper_attributes(); $sgs_inner_html built from escaped parts + WP InnerBlocks.
} else {
	$output = SGS_Container_Wrapper::render(
		$attributes,
		$block,
		$sgs_inner_html,
		'content',
		array(
			'tag'           => 'div',
			'extra_classes' => $sgs_wrapper_classes,
			'extra_attrs'   => $extra_attrs,
		)
	);
}

echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() / get_block_wrapper_attributes() return pre-sanitised HTML.
