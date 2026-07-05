<?php
/**
 * SGS Multi-Button -- server-side render.
 *
 * Outputs a flex container wrapping one or more sgs/button children.
 * Responsive layout is scoped per-instance via a unique ID.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks (sgs/button instances).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

$direction        = isset( $attributes['direction'] ) ? esc_attr( $attributes['direction'] ) : 'row';
$direction_tablet = ! empty( $attributes['directionTablet'] ) ? esc_attr( $attributes['directionTablet'] ) : $direction;
$direction_mobile = ! empty( $attributes['directionMobile'] ) ? esc_attr( $attributes['directionMobile'] ) : 'column';

// Gap: resolved via the shared helper (handles preset slugs + raw CSS lengths + back-compat).
// Falls back to "12px" matching the block.json default.
// Back-compat: pre-consolidation posts stored a numeric (int) gap value; the old render
// appended "px" via absint(). Append "px" to digit-only strings before the helper so
// sgs_container_gap_value() treats them as raw CSS lengths, not WP preset slugs.
$gap_raw = isset( $attributes['gap'] ) ? (string) $attributes['gap'] : '12px';
if ( preg_match( '/^\d+$/', $gap_raw ) ) {
	$gap_raw = $gap_raw . 'px';
}
$gap_css = sgs_container_gap_value( $gap_raw );
if ( '' === $gap_css ) {
	$gap_css = '12px';
}
$gap_tab_raw = isset( $attributes['gapTablet'] ) ? (string) $attributes['gapTablet'] : '';
if ( '' !== $gap_tab_raw ) {
	if ( preg_match( '/^\d+$/', $gap_tab_raw ) ) {
		$gap_tab_raw = $gap_tab_raw . 'px';
	}
	$gap_tab_css = sgs_container_gap_value( $gap_tab_raw );
	if ( '' === $gap_tab_css ) {
		$gap_tab_css = $gap_css;
	}
} else {
	$gap_tab_css = $gap_css;
}
$gap_mob_raw = isset( $attributes['gapMobile'] ) ? (string) $attributes['gapMobile'] : '8px';
if ( '' !== $gap_mob_raw ) {
	if ( preg_match( '/^\d+$/', $gap_mob_raw ) ) {
		$gap_mob_raw = $gap_mob_raw . 'px';
	}
	$gap_mob_css = sgs_container_gap_value( $gap_mob_raw );
	if ( '' === $gap_mob_css ) {
		$gap_mob_css = '8px';
	}
} else {
	$gap_mob_css = '8px';
}

$justify_content        = isset( $attributes['justifyContent'] ) ? esc_attr( $attributes['justifyContent'] ) : 'flex-start';
$justify_content_tablet = ! empty( $attributes['justifyContentTablet'] ) ? esc_attr( $attributes['justifyContentTablet'] ) : $justify_content;
$justify_content_mobile = ! empty( $attributes['justifyContentMobile'] ) ? esc_attr( $attributes['justifyContentMobile'] ) : $justify_content;

$wrap        = isset( $attributes['wrap'] ) ? esc_attr( $attributes['wrap'] ) : 'wrap';
$wrap_tablet = ! empty( $attributes['wrapTablet'] ) ? esc_attr( $attributes['wrapTablet'] ) : $wrap;
$wrap_mobile = ! empty( $attributes['wrapMobile'] ) ? esc_attr( $attributes['wrapMobile'] ) : 'wrap';

$align_items = isset( $attributes['alignItems'] ) ? esc_attr( $attributes['alignItems'] ) : 'center';

// Generate a unique ID so responsive CSS is scoped per block instance.
$uid = wp_unique_id( 'sgs-mb-' );

// Build scoped responsive CSS using concatenation (WPCS: no variable interpolation in strings).
$css  = '#' . $uid . '.sgs-multi-button{';
$css .= 'display:flex;';
$css .= 'flex-direction:' . $direction . ';';
$css .= 'flex-wrap:' . $wrap . ';';
$css .= 'gap:' . $gap_css . ';';
$css .= 'justify-content:' . $justify_content . ';';
$css .= 'align-items:' . $align_items . ';';
$css .= '}';

// Tablet breakpoint (768px to 1023px — device-tier standard, CLAUDE.md
// "Responsive breakpoint discipline"). H6 fix (2026-07-05): was
// 769-1024px, off by one vs the 767/1023 standard, so a draft rule of
// `@media (min-width:768px)` (row at exactly 768px) fell into the OLD
// mobile band below instead of this one — the hero CTAs rendered column
// at 768px when the draft wants row.
$css .= '@media(max-width:1023px) and (min-width:768px){';
$css .= '#' . $uid . '.sgs-multi-button{';
$css .= 'flex-direction:' . $direction_tablet . ';';
$css .= 'flex-wrap:' . $wrap_tablet . ';';
$css .= 'gap:' . $gap_tab_css . ';';
$css .= 'justify-content:' . $justify_content_tablet . ';';
$css .= '}}';

// Mobile breakpoint (max 767px — device-tier standard; was 768px, see above).
$css .= '@media(max-width:767px){';
$css .= '#' . $uid . '.sgs-multi-button{';
$css .= 'flex-direction:' . $direction_mobile . ';';
$css .= 'flex-wrap:' . $wrap_mobile . ';';
$css .= 'gap:' . $gap_mob_css . ';';
$css .= 'justify-content:' . $justify_content_mobile . ';';
$css .= '}}';

// WS-4: the outer wrapper is now the shared sgs/container element. multi-button keeps
// its own scoped flex CSS (#uid.sgs-multi-button) + the id via extra_attrs; the buttons
// ($content) become the interior. The mirror adds the container width capability.
$mb_style = '<style>' . esc_html( $css ) . '</style>';

// H6 fix (2026-07-05, proven live -- STOP-43): kind was 'layout', which also makes
// SGS_Container_Wrapper emit ITS OWN display:flex / flex-wrap / align-items /
// flex-direction (from the separate, non-responsive $attributes['flexDirection'])
// as an INLINE style on this same wrapper element. An inline style always beats
// the #uid.sgs-multi-button <style> rule above regardless of specificity or
// @media, so whenever flexDirection is non-empty (e.g. set by the cloning
// converter) it permanently pins flex-direction at every viewport, hiding this
// block's own responsive direction/directionTablet/directionMobile system
// entirely -- confirmed live on the hero CTAs (flex-direction:row at 375/768/
// 1440 alike, never column). multi-button already fully owns display/flex-wrap/
// gap/justify-content/align-items/flex-direction responsively above, so it does
// not need the wrapper's grid/flex layer at all -- only the width/contentWidth
// capability mirror. kind='content' keeps that (align/maxWidth/contentWidth +
// padding/spacing -- an already-exercised pattern, e.g. sgs/quote, sgs/testimonial,
// sgs/product-card) and drops the wrapper's flex/grid + duplicate-gap emission,
// which multi-button never used. Zero shared-file edit.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $mb_style is esc_html'd CSS; SGS_Container_Wrapper::render() escapes its output internally; $content is WP-rendered inner blocks.
echo $mb_style . SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'content',
	array(
		'tag'           => 'div',
		'extra_classes' => array( 'sgs-multi-button' ),
		'extra_attrs'   => array( 'id' => esc_attr( $uid ) ),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
