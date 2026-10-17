<?php
/**
 * SGS Footer Row — server-side render.
 *
 * A single row of a site footer. Two shapes, both driven by the shared
 * SGS_Container_Wrapper (composite wrapper, R-31-9) via the block's
 * `layout` attr — no divergent per-block styling path:
 *   - layout='grid'  → a column grid (up to 6 columns → 1 below the mobile tier)
 *                       for the columns row; `columns` (a TIER OBJECT)
 *                       and `gridTemplateColumns` are consumed by the
 *                       wrapper via sgs_responsive_normalise_object().
 *   - layout='flex'  → an intrinsic never-overflow cluster (top strip / bottom
 *                       bar) that wraps rather than overflowing at any width.
 *
 * The only block-private CSS is the min-width:0 hardening in style.css + the
 * scoped colour/border re-emit below (no-inline contract, Spec 32).
 *
 * An empty row (no inner blocks) emits ZERO output — no wrapper, no padding
 * (Spec 37 §3.4 empty-row-zero-output, verified FR-37-10).
 *
 * Variables from WordPress:
 *   $attributes  array     Block attributes (validated against block.json).
 *   $content     string    InnerBlocks HTML.
 *   $block       WP_Block  Block object.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// Empty-row zero-output guard (Spec 37 §3.4, verified FR-37-10). No inner content → render nothing.
if ( '' === trim( (string) $content ) ) {
	return '';
}

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS length/keyword sanitisers for free-text style-engine values concatenated
// into this block's scoped <style> (mirrors sgs/site-header-row contract).
// Deterministic, content-addressed uid — mirrors SGS_Container_Wrapper's own
// md5( wp_json_encode( $attributes ) ) derivation rather than the per-request counter
// wp_unique_id(): identical row attributes (rowSlot etc.) yield an identical uid on
// every page, so the CSS collector can dedup this row's scoped <style> across pages
// (this row's uid was the one proven to shift page-to-page: sfr-6/7 vs sfr-12/13).
// STOP-NO-KSORT: do not reorder $attributes before hashing.
$uid = 'sgs-sfr-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );

// Row-slot identity class (top / columns / bottom) — set by the parent
// sgs/site-footer template, not operator-editable. Consumed for CSS targeting.
$row_slot   = isset( $attributes['rowSlot'] ) ? sanitize_html_class( $attributes['rowSlot'] ) : '';
$slot_class = '' !== $row_slot ? 'sgs-site-footer-row--' . $row_slot : '';

// $uid is applied as BOTH an id (extra_attrs) AND a class (extra_classes) by
// the wrapper, so the class-scoped `.{$uid}.sgs-site-footer-row` colour/border rules
// below match this element.
$root_sel = '.' . $uid . '.sgs-site-footer-row';
$classes  = array( 'sgs-site-footer-row', $uid );
if ( '' !== $slot_class ) {
	$classes[] = $slot_class;
}

$css = '';

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// Read the resolved values from $attributes['style'] and emit them into this
// block's own scoped <style>. Mirrors sgs/site-header-row exactly.


// Text colour (flat or gradient) — gradient sibling attribute wins when
// set+valid (sibling-attribute shape). sgs_text_colour_decl() resolves a
// palette SLUG to var(--wp--preset--color--…) the same way sgs_colour_value()
// does, so a bare slug never reaches the browser as invalid CSS. Mirrors
// sgs/counter's labelColour / sgs/tab's textColour.
$sfr_text_colour           = (string) ( $attributes['textColour'] ?? '' );
$sfr_text_colour_gradient  = (string) ( $attributes['textColourGradient'] ?? '' );
$sfr_text_colour_effective = sgs_resolve_text_colour_or_gradient( $sfr_text_colour, $sfr_text_colour_gradient );
if ( '' !== $sfr_text_colour_effective ) {
	$sfr_text_colour_decl = sgs_text_colour_decl( $sfr_text_colour_effective );
	if ( '' !== $sfr_text_colour_decl ) {
		$css .= "{$root_sel}{{$sfr_text_colour_decl};}";
	}
	// MANDATORY companion, not optional — see sgs/counter render.php for the
	// browser-support rationale. No-op for a flat colour.
	$css .= sgs_text_colour_gradient_fallback_rule( $root_sel, $sfr_text_colour_effective );
}

// Precondition check: the `row`
// manifest element shares BOTH css:color (textColour) and
// css:background-color (backgroundColour) on this SAME $root_sel, so a
// hover text-GRADIENT here (background-clip:text) would clip/overwrite the
// wrapper's background paint if both stayed on the same selector. Only swap
// the background onto its own ::after layer when the hover text value
// actually resolves to a gradient — the flat-colour hover case is
// unaffected and keeps the existing sgs_fill_states_css() emission untouched.
$sfr_text_colour_hover           = (string) ( $attributes['textColourHover'] ?? '' );
$sfr_text_colour_hover_gradient  = (string) ( $attributes['textColourHoverGradient'] ?? '' );
$sfr_text_colour_hover_effective = sgs_resolve_text_colour_or_gradient( $sfr_text_colour_hover, $sfr_text_colour_hover_gradient );
$sfr_hover_is_gradient           = str_contains( $sfr_text_colour_hover_effective, 'gradient(' );

if ( '' !== $sfr_text_colour_hover_effective ) {
	$sfr_text_colour_hover_decl = sgs_text_colour_decl( $sfr_text_colour_hover_effective );
	if ( '' !== $sfr_text_colour_hover_decl ) {
		$css .= sgs_hover_state_rules( $root_sel, $sfr_text_colour_hover_decl . ';' );
		$css .= sgs_text_colour_gradient_fallback_rule( $root_sel . ':hover', $sfr_text_colour_hover_effective );
	}
}

// Background (colour + gradient, resting + hover) is owned by the shared fill
// emitter, NOT by the style engine and NOT by supports.color.gradients. The
// gradient is the block-private backgroundColourGradient exposed through
// fillRow(), so core renders no competing gradient panel in the Styles tab.
if ( $sfr_hover_is_gradient ) {
	$sfr_fill_decls = sgs_fill_decls(
		$attributes,
		array(
			'base'           => 'backgroundColour',
			'hover'          => 'backgroundColourHover',
			'gradient'       => 'backgroundColourGradient',
			'hover_gradient' => 'backgroundColourHoverGradient',
		)
	);
	$css           .= sgs_block_background_layer_css(
		$root_sel,
		implode( ';', $sfr_fill_decls['normal'] ),
		implode( ';', $sfr_fill_decls['hover'] )
	);
} else {
	$sfr_fill_css = sgs_fill_states_css(
		$root_sel,
		$attributes,
		array(
			'base'           => 'backgroundColour',
			'hover'          => 'backgroundColourHover',
			'gradient'       => 'backgroundColourGradient',
			'hover_gradient' => 'backgroundColourHoverGradient',
		)
	);
	if ( '' !== $sfr_fill_css ) {
		$css .= $sfr_fill_css;
	}
}

// Border width/style/colour are block-private attrs, emitted below.

// There is no native style-engine colour path. Text colour renders through
// sgs_resolve_text_colour_or_gradient() + sgs_text_colour_decl() above,
// because wp_style_engine_get_styles()'s color.text input cannot carry a
// gradient (background-clip:text is not a colour value).

// Skip-serialised `color` support also stops WP adding has-*-color classes onto
// the wrapper — re-add them so preset palette colours still resolve (mirrors hero/quote).
$sfr_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$sfr_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $sfr_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $sfr_preset_text_slug . '-color';
}
if ( '' !== $sfr_preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $sfr_preset_bg_slug . '-background-color';
}

// ── Per-row scroll behaviours (FR-37-per-row) ───────────────────────────────
// Independent of the header-level behaviour path: view.js scans
// `.sgs-row-behaviour` rows and toggles per-row state classes based on the
// tiers listed in these data-attrs.
// A behaviour off in every tier emits NOTHING (no attr at all). Mirrors
// sgs/site-header-row exactly.
$sfr_extra_attrs = array( 'id' => $uid );
// rowTransparent/rowHideOnScroll/rowShrink are tri-state STRING enums
// ('on'/'off'/'inherit') — see the identical note in
// sgs/site-header-row/render.php. sgs_resolve_on_tiers() is the same
// canonical resolver for header + row + footer-row.
$sfr_transparent_on_tiers = sgs_resolve_on_tiers( isset( $attributes['rowTransparent'] ) ? $attributes['rowTransparent'] : array(), 'on', 'off' );
$sfr_hide_on_scroll_tiers = sgs_resolve_on_tiers( isset( $attributes['rowHideOnScroll'] ) ? $attributes['rowHideOnScroll'] : array(), 'on', 'off' );
// Per-row shrink. Same tier resolver, own data-attr + state class.
$sfr_shrink_tiers = sgs_resolve_on_tiers( isset( $attributes['rowShrink'] ) ? $attributes['rowShrink'] : array(), 'on', 'off' );
if ( ! empty( $sfr_transparent_on_tiers ) || ! empty( $sfr_hide_on_scroll_tiers ) || ! empty( $sfr_shrink_tiers ) ) {
	$classes[] = 'sgs-row-behaviour';
	if ( ! empty( $sfr_transparent_on_tiers ) ) {
		$sfr_extra_attrs['data-sgs-row-transparent'] = implode( ' ', $sfr_transparent_on_tiers );
	}
	if ( ! empty( $sfr_hide_on_scroll_tiers ) ) {
		$sfr_extra_attrs['data-sgs-row-hide-on-scroll'] = implode( ' ', $sfr_hide_on_scroll_tiers );
	}
	if ( ! empty( $sfr_shrink_tiers ) ) {
		$sfr_extra_attrs['data-sgs-row-shrink'] = implode( ' ', $sfr_shrink_tiers );
	}
}

// "Shrink hides a chosen element". SERVER-SIDE BACKSTOP, identical to
// sgs/site-header-row: the helper re-validates the stored target against this
// row's real children and refuses any block flagged supports.sgs.headerEssential.
// An orphaned target (child deleted) resolves to '' — hides nothing, no error.
if ( ! empty( $sfr_shrink_tiers ) ) {
	// Proportional shrunk size from this row's OWN resting padding — identical
	// mechanism to sgs/site-header-row, via the one shared helper so the twins
	// cannot drift. A row with no padding emits nothing and does not resize.
	// An explicit shrunk padding (rowShrinkPadding) replaces the halving.
	if ( empty( $attributes['rowShrinkPadding'] ) ) {
		$css .= sgs_row_shrink_css(
			$root_sel . '.is-row-shrunk',
			isset( $attributes['padding'] ) ? $attributes['padding'] : array()
		);
	}
	$css .= sgs_row_shrink_settings_css( $root_sel, $attributes );

	$sfr_hide_target = sgs_resolve_row_shrink_hide_target( $block, isset( $attributes['rowShrinkHideTarget'] ) ? $attributes['rowShrinkHideTarget'] : '' );
	if ( '' !== $sfr_hide_target ) {
		$sfr_extra_attrs['data-sgs-row-shrink-hide'] = $sfr_hide_target;
		// display:none also removes the element from the tab order while
		// hidden (a11y) — a visually-hidden-but-focusable element is a trap.
		$css .= $root_sel . '.is-row-shrunk #' . $sfr_hide_target . '{display:none;}';
	}
}

// ── Border (width, style, colour, gradient ring, none override, radius at
// three tiers) through the shared assembler. The base rule prints before the
// tier rules so a tablet or mobile radius (same specificity) wins in its query.
$border = sgs_border_element_decls(
	$attributes,
	'',
	$root_sel,
	array(
		'colour' => array(
			'base'     => 'borderColour',
			'gradient' => 'borderColourGradient',
		),
	)
);
if ( $border['base'] ) {
	$css .= $root_sel . '{' . implode( ';', $border['base'] ) . ';}';
}
$css .= implode( '', $border['rules'] );
if ( $border['tablet'] ) {
	$css .= '@media(max-width:1023px){' . $root_sel . '{' . implode( ';', $border['tablet'] ) . ';}}';
}
if ( $border['mobile'] ) {
	$css .= '@media(max-width:767px){' . $root_sel . '{' . implode( ';', $border['mobile'] ) . ';}}';
}

if ( '' !== $css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied; $css built from pre-sanitised values only (wp_style_engine_get_styles()).
	printf( '<style id="%s">%s</style>', esc_attr( $uid . '-style' ), wp_strip_all_tags( $css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes all output internally; variables are pre-sanitised above.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'layout',
	array(
		'tag'               => 'div',
		'extra_classes'     => $classes,
		'extra_attrs'       => $sfr_extra_attrs,
		// Spec 37 FR-37-16: gap + gridTemplateColumns are the {desktop,tablet,mobile} object
		// model; the shared wrapper emits their responsive CSS via sgs_emit_responsive_css().
		'container_queries' => true,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
