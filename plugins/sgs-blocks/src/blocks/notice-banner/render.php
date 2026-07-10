<?php
/**
 * Server-side render for sgs/notice-banner.
 *
 * Dynamic render (save.js returns null; deprecated.js v2/v1 round-trip older
 * static instances). The icon is the variant's ideal default (Lucide) unless the
 * operator picks an override via the shared IconPicker (any of the four sources).
 *
 * NO-INLINE, NO-WRAPPER (LOCKED per-block no-inline migration contract §A/§B/§B3,
 * 2026-07-10): notice-banner is CONTENT-kind (box + width only) — it never used
 * SGS_Container_Wrapper's grid/section/background/overlay machinery (WS-4:
 * CONTENT kind only ever added maxWidth/contentWidth/padding on top of the
 * block's OWN BEM-driven background/border/icon styling), so per D294 the
 * wrapper is dropped and the block goes fully block-private — the same proven
 * pattern as sgs/quote. The rendered subtree carries ZERO inline CSS property
 * declarations; every declaration (base + tiered padding/margin, WP colour/
 * typography/border supports, iconColour, width) is emitted into the block's
 * OWN scoped `.{uid}` <style> tag. WP styling supports declare
 * `__experimentalSkipSerialization` in block.json so get_block_wrapper_attributes()
 * never auto-inlines them.
 *
 * The uid is a CLASS (`sgs-notice-banner-{md5}`), never an `id` — the block
 * declares `anchor: true`, so the id attribute stays free for the anchor (ToC).
 *
 * Announcement mode (displayMode='announcement'):
 * Renders a full-width, fixed-position page-level bar via get_block_wrapper_attributes()
 * directly (always bypassed the wrapper — it must be full-width + fixed). When
 * dismissible=true a close button + WP Interactivity context is emitted. The
 * dismiss flag is stored in sessionStorage (session) or localStorage (permanent)
 * keyed by anchor/content-hash.
 *
 * ANTI-FLASH (no-inline, D298 mobile-nav `.is-swiping` precedent): a pre-paint
 * <script> ADDS the `is-dismissed` CLASS (never writes `.style.display`) before
 * the first paint when the dismiss flag is already stored — style.css's
 * `.sgs-notice-banner--announcement.is-dismissed{display:none}` rule (unchanged)
 * hides it. WP Interactivity's `data-wp-class--is-dismissed` toggles the SAME
 * class reactively post-hydration, so the pre-paint script and Interactivity
 * agree on one mechanism.
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
// Box-object interface contract §1 + security §D sanitiser.
// -------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side value can never break out of its
// declaration. Mirrors sgs/quote + sgs/heading + sgs/button.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// -------------------------------------------------------------------------
// Resolve anchor / scope id. Uid is a CLASS (contract §B3) — the element's
// single `id` attribute stays free for the anchor (ToC target).
// -------------------------------------------------------------------------

$anchor   = $attributes['anchor'] ?? '';
$uid      = 'sgs-notice-banner-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-notice-banner';

// -------------------------------------------------------------------------
// WP `color`/`typography`/`spacing`/`border` support values (skip-serialised
// → NOT auto-inlined). Read straight from $attributes['style'] — the shape
// WP's native controls (ColorPalette/BoxControl/BorderBoxControl/FontSizePicker)
// already write.
// -------------------------------------------------------------------------

$style_obj = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();

$base_padding_obj = array();
if ( isset( $style_obj['spacing']['padding'] ) && is_array( $style_obj['spacing']['padding'] ) ) {
	foreach ( $style_obj['spacing']['padding'] as $side => $val ) {
		if ( is_string( $val ) && '' !== $val ) {
			$base_padding_obj[ $side ] = $val;
		}
	}
}
$base_margin_obj = array();
if ( isset( $style_obj['spacing']['margin'] ) && is_array( $style_obj['spacing']['margin'] ) ) {
	foreach ( $style_obj['spacing']['margin'] as $side => $val ) {
		if ( is_string( $val ) && '' !== $val ) {
			$base_margin_obj[ $side ] = $val;
		}
	}
}

$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// Border — WP-native style.border (color/width/style/radius). Style-engine
// consumes this shape directly (mirrors core's own border support output).
$style_border = isset( $style_obj['border'] ) && is_array( $style_obj['border'] ) ? $style_obj['border'] : array();

// Colour support values.
$style_color_text     = isset( $style_obj['color']['text'] ) ? (string) $style_obj['color']['text'] : '';
$style_color_bg       = isset( $style_obj['color']['background'] ) ? (string) $style_obj['color']['background'] : '';
$style_color_gradient = isset( $style_obj['color']['gradient'] ) ? (string) $style_obj['color']['gradient'] : '';
$preset_text_slug     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// Typography support values.
$style_font_size   = isset( $style_obj['typography']['fontSize'] ) ? (string) $style_obj['typography']['fontSize'] : '';
$style_line_height = isset( $style_obj['typography']['lineHeight'] ) ? (string) $style_obj['typography']['lineHeight'] : '';

// typography.textAlign is NOT a style-engine key — WP core applies it as a
// `has-text-align-{value}` CLASS from the `textAlign` attribute, but does not
// reliably merge that class into get_block_wrapper_attributes() for a dynamic
// block (verified pattern: class-sgs-container-wrapper.php's identical fix for
// container-equivalent composites) — emit it explicitly.
$text_align = $attributes['textAlign'] ?? '';
if ( ! in_array( $text_align, array( 'left', 'center', 'right' ), true ) ) {
	$text_align = '';
}

// Width (SGS custom scalars, base only — matches the pre-existing attribute
// set; no tiers were requested for this pass).
$content_width = $attributes['contentWidth'] ?? '';
$max_width     = $attributes['maxWidth'] ?? '';

// -------------------------------------------------------------------------
// Build the scoped CSS.
// -------------------------------------------------------------------------

$scoped_css = array();

// --- iconColour: was an inline style="color:…" on the icon <span>; now a
// scoped declaration keyed off the SAME root uid. ---
if ( $icon_colour ) {
	$scoped_css[] = $root_sel . ' .sgs-notice-banner__icon{color:' . sgs_colour_value( $icon_colour ) . ';}';
}

// --- Width (base only, kept-scalar). ---
if ( $max_width ) {
	$mw_safe = $sgs_css_length( $max_width );
	if ( '' !== $mw_safe ) {
		$scoped_css[] = "{$root_sel}{max-width:{$mw_safe};}";
	}
}
if ( $content_width ) {
	$cw_safe = $sgs_css_length( $content_width );
	if ( '' !== $cw_safe ) {
		$scoped_css[] = "{$root_sel}{width:{$cw_safe};}";
	}
}

// --- Base spacing (padding/margin), border (color/width/style/radius), WP
// colour + typography supports — skip-serialised, emitted scoped via the
// stable core style engine (exactly how WP core outputs `layout` support). ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();

	$base_spacing = array();
	if ( ! empty( $base_padding_obj ) ) {
		$base_spacing['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$base_spacing['margin'] = $base_margin_obj;
	}
	if ( ! empty( $base_spacing ) ) {
		$base_style_engine_args['spacing'] = $base_spacing;
	}

	if ( ! empty( $style_border ) ) {
		$base_style_engine_args['border'] = $style_border;
	}

	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( '' !== $style_color_gradient ) {
		$color_args['gradient'] = $style_color_gradient;
	}
	if ( ! empty( $color_args ) ) {
		$base_style_engine_args['color'] = $color_args;
	}

	$typography_args = array();
	if ( '' !== $style_font_size ) {
		$typography_args['fontSize'] = $style_font_size;
	}
	if ( '' !== $style_line_height ) {
		$typography_args['lineHeight'] = $style_line_height;
	}
	if ( ! empty( $typography_args ) ) {
		$base_style_engine_args['typography'] = $typography_args;
	}

	if ( ! empty( $base_style_engine_args ) ) {
		$base_scoped_styles = wp_style_engine_get_styles(
			$base_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$scoped_css[] = $base_scoped_styles['css'];
		}
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B/§B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );

$tablet_box_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_box_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_box_decls ) . ';}}';
}

$mobile_box_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_box_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_box_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_box_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_box_decls ) . ';}}';
}

// -------------------------------------------------------------------------
// Wrapper classes — BEM root + variant modifier + preset colour/align classes
// re-added manually (the color/typography supports are skip-serialised so WP
// no longer auto-adds has-* classes for them).
// -------------------------------------------------------------------------

$sgs_wrapper_classes = array( 'sgs-notice-banner', 'sgs-notice-banner--' . sanitize_html_class( $variant ), $uid );

if ( '' !== $preset_text_slug ) {
	$sgs_wrapper_classes[] = 'has-text-color';
	$sgs_wrapper_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$sgs_wrapper_classes[] = 'has-background';
	$sgs_wrapper_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}
if ( '' !== $text_align ) {
	$sgs_wrapper_classes[] = 'has-text-align-' . $text_align;
}

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
// The icon <span> carries NO inline style any more — iconColour is scoped above.
// -------------------------------------------------------------------------
$sgs_inner_html = '';
if ( $icon_html ) {
	$sgs_inner_html .= '<span class="sgs-notice-banner__icon" aria-hidden="true">' . $icon_html . '</span>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG from first-party icon maps; dashicon slug + emoji escaped above.
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
// first paint and ADDS the `is-dismissed` CLASS when the dismiss flag is
// already stored — style.css's `.sgs-notice-banner--announcement.is-dismissed`
// rule hides it. No inline `style.display` write (no-inline contract).
// -------------------------------------------------------------------------
$output = '';

if ( $is_announcement && $dismissible ) {
	// Stable dismissal key. An explicit anchor wins. Otherwise we must NOT use
	// wp_unique_id() — it is a per-REQUEST counter, so it would mint a different
	// key on every page load and the dismissal would never persist (QC-council
	// BLOCKER, 2026-06-11). Fall back to a deterministic content hash so the same
	// banner yields the same key across loads. The message lives in $content
	// (InnerBlocks); hash that + the variant for a stable per-instance id.
	$block_id = $anchor
		? sanitize_html_class( $anchor )
		: 'h' . substr( md5( (string) $content . '|' . $variant ), 0, 12 );
	$storage_key = 'sgs-notice-dismissed-' . $block_id;

	// Pre-paint inline script — checks sessionStorage / localStorage before
	// the first paint so the element never flickers visible. Adds a CLASS
	// (never `.style.display`) — matches the D298 mobile-nav `.is-swiping`
	// no-inline pattern.
	// phpcs:disable WordPress.WP.EnqueuedResources.NonEnqueuedScript
	if ( 'session' === $dismiss_behaviour ) {
		$prepaint_js = 'if(sessionStorage.getItem(' . wp_json_encode( $storage_key ) . ")){document.currentScript.parentElement.classList.add('is-dismissed');}";
	} else {
		$expiry_check = 'var _d=localStorage.getItem(' . wp_json_encode( $storage_key ) . ");if(_d){try{var _p=JSON.parse(_d);if(_p.expiry>Date.now()){document.currentScript.parentElement.classList.add('is-dismissed');}}catch(e){}}";
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
// NO-WRAPPER: notice-banner builds its own root <div> via
// get_block_wrapper_attributes() in BOTH modes now (contract §B3 — content-
// KIND composite, box+width only, dropped SGS_Container_Wrapper per D294).
// NO 'style' key is passed — the root carries ZERO inline property
// declarations; everything is in the scoped <style> above.
// -------------------------------------------------------------------------

$root_attr_args = array_merge(
	array( 'class' => implode( ' ', $sgs_wrapper_classes ) ),
	$extra_attrs
);
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}

$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );
$output        = '<div ' . $wrapper_attrs . '>' . $sgs_inner_html . '</div>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attrs from get_block_wrapper_attributes(); $sgs_inner_html built from escaped parts + WP InnerBlocks.

?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches SGS_Container_Wrapper
	// + sgs/quote + sgs/heading). Every value reaching $scoped_css is
	// pre-sanitised ($sgs_css_length / sgs_colour_value / wp_style_engine_get_styles /
	// allowlisted attribute enums), so no un-sanitised value survives to here.
	echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
</style>
<?php endif; ?>
<?php
echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-sanitised HTML; $sgs_inner_html built from escaped parts + WP InnerBlocks.
