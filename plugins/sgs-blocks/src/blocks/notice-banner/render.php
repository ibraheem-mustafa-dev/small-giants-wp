<?php
/**
 * Server-side render for sgs/notice-banner.
 *
 * Dynamic render (save.js returns null; the former deprecated.js v2/v1 round-tripped older
 * static instances). The icon is the variant's ideal default (Lucide) unless the
 * operator picks an override via the shared IconPicker (any of the four sources).
 *
 * NO-WRAPPER (LOCKED per-block no-inline migration contract §A/§B/§B3, 2026-07-10): notice-banner is CONTENT-kind (box + width only) — it never used
 * SGS_Container_Wrapper's grid/section/background/overlay machinery (WS-4: CONTENT kind only ever added maxWidth/contentWidth/padding on top of the
 * block's OWN BEM-driven background/border/icon styling), so per D294 the wrapper is dropped and the block goes fully block-private — the same proven
 * pattern as sgs/quote.
 *
 * NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
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

// [D-tier-object-render-fix 2026-09-06]
// Group 1 folded padding/margin into owned tier-object attrs
// {desktop,tablet,mobile}, but this block's own scoped CSS below still
// reads the pre-migration flat shape (a plain box for the base value,
// plus four separate flat attrs for the tablet/mobile overrides --
// block.json no longer declares any of those four). Normalise once,
// into fresh locals only -- every literal reference below has been
// redirected to these instead of writing back into $attributes.
// Fixed 2026-09-06: sgs_responsive_normalise_object() lives in
// helpers-responsive.php, which this file's own render-helpers.php
// require below WOULD load -- but too late, since these two calls run
// before that require executes. A block whose render.php is the first
// SGS block PHP to run in a request (nav-menu in the site header, on
// every page) fatals with "Call to undefined function" before any
// other block's render.php has had a chance to load it. Requiring the
// defining file directly, here, removes the load-order dependency.
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/wp-icons.php';

// FR-22-6: $text is no longer rendered here — the text content slot is now
// an InnerBlocks child (sgs/text), emitted via $content below.
// Retained in block.json as historical schema only (no deprecated.js, D271). R-31-14: no fallback.
$variant           = $attributes['variant'] ?? 'info';
$icon_source       = $attributes['iconSource'] ?? '';
$icon_name         = $attributes['iconName'] ?? '';
$icon_colour       = $attributes['iconColour'] ?? '';
// D636/D644 icon/SVG gradient sibling — non-empty wins over iconColour above.
$icon_colour_gradient = $attributes['iconColourGradient'] ?? '';
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

$padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

// Border — WP-native style.border (color/width/style/radius). Style-engine
// consumes this shape directly (mirrors core's own border support output).
$style_border = isset( $style_obj['border'] ) && is_array( $style_obj['border'] ) ? $style_obj['border'] : array();

// Colour support values — BLOCK-PRIVATE (D744): native `supports.color` is
// fully false, so core no longer writes `style.color.*`/`textColor`/
// `backgroundColor`. Text + background are now `textColour*`/
// `backgroundColour*` attributes, resolved below via the shared five-variant
// colour helpers (helpers-colour-variants.php / helpers-tokens.php).
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';

// textAlign is now a block-private bare attribute (D971/D972 full-replacement
// track — mirrors sgs/text's canonical pattern; the old native
// supports.typography.textAlign was removed from block.json). Rendered as a
// `has-text-align-{value}` CLASS, not a style-engine declaration — WP core's
// own convention, does not reliably merge into get_block_wrapper_attributes()
// for a dynamic block (verified pattern: class-sgs-container-wrapper.php's
// identical fix for container-equivalent composites) — emit it explicitly.
$text_align = $attributes['textAlign'] ?? '';
if ( ! in_array( $text_align, array( 'left', 'center', 'right' ), true ) ) {
	$text_align = '';
}

// Width (SGS custom scalars, base only — matches the pre-existing attribute
// set; no tiers were requested for this pass).
$max_width = $attributes['maxWidth'] ?? '';

// -------------------------------------------------------------------------
// Build the scoped CSS.
// -------------------------------------------------------------------------

$scoped_css = array();

// --- iconColour: was an inline style="color:…" on the icon <span>; now a
// scoped declaration keyed off the SAME root uid. ---
if ( $icon_colour ) {
	$scoped_css[] = $root_sel . ' .sgs-notice-banner__icon{color:' . sgs_colour_value( $icon_colour ) . ';}';
	if ( '' !== ( $attributes['iconColourHover'] ?? '' ) ) {
		$scoped_css[] = sgs_hover_state_rules( $root_sel . ' .sgs-notice-banner__icon', 'color:' . sgs_colour_value( $attributes['iconColourHover'] ), ':focus-visible' );
	}
}
// D636/D644 icon/SVG gradient — non-empty wins over iconColour's flat
// currentColor paint above (helpers-svg-gradient.php). $resolved_source can
// be dashicon/emoji here (unlike the lucide-only blocks), so the gradient
// SELECTOR must branch on it too — a dashicon/emoji glyph paints on the
// wrapper span itself via background-clip:text, never on a child <svg>.
// FIXED 2026-09-06 (caught live): the selector was hardcoded to
// "...__icon svg" regardless of source, so a dashicon/emoji gradient matched
// no element in the DOM and silently never painted — the exact live-DOM
// verification this rollout needed. $icon_html was built earlier
// (lucide/wp-icon cases only carry real <svg> markup; sgs_svg_inject_defs()
// no-ops when there's no <svg> to match).
$sgs_notice_banner_icon_sel = $root_sel . ' .sgs-notice-banner__icon';
$sgs_notice_banner_grad_sel = in_array( $resolved_source, array( 'dashicon', 'emoji' ), true ) ? $sgs_notice_banner_icon_sel : "{$sgs_notice_banner_icon_sel} svg";
$sgs_notice_banner_stroke_grad = sgs_icon_gradient_css( $resolved_source, $icon_colour_gradient, $uid . '-ig', $sgs_notice_banner_grad_sel );
if ( '' !== $sgs_notice_banner_stroke_grad['defs'] ) {
	$icon_html = sgs_svg_inject_defs( $icon_html, $sgs_notice_banner_stroke_grad['defs'] );
}
if ( '' !== $sgs_notice_banner_stroke_grad['css'] ) {
	$scoped_css[] = "{$sgs_notice_banner_grad_sel}{" . $sgs_notice_banner_stroke_grad['css'] . ';}';
	if ( '' !== $sgs_notice_banner_stroke_grad['fallback_rule'] ) {
		$scoped_css[] = $sgs_notice_banner_stroke_grad['fallback_rule'];
	}
}

// --- Text colour (flat-or-gradient, base + hover) — D744: replaces core's
// `style.color.text` storage. Painted on the ROOT selector so it inherits
// into the InnerBlocks child (sgs/text) and matches the prior style-engine
// 'color' behaviour. ---
// FIXED 2026-09-04 — was sgs_text_decls()/sgs_emit_state_colour_css(), which
// always emits a bare `color:` even for a resolved gradient string (invalid
// CSS, silently dropped — same defect proven live on sgs/info-box and
// sgs/testimonial-slider). sgs_text_colour_decl() is the correct primary
// primitive; the companion fallback rule below was already correct.
$sgs_nb_text_normal_resolved = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColour'] ?? '' ),
	(string) ( $attributes['textColourGradient'] ?? '' )
);
$sgs_nb_text_hover_resolved  = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColourHover'] ?? '' ),
	(string) ( $attributes['textColourHoverGradient'] ?? '' )
);
$sgs_nb_text_normal_decl     = sgs_text_colour_decl( $sgs_nb_text_normal_resolved );
$sgs_nb_text_hover_decl      = sgs_text_colour_decl( $sgs_nb_text_hover_resolved );
if ( '' !== $sgs_nb_text_normal_decl || '' !== $sgs_nb_text_hover_decl ) {
	$scoped_css[] = sgs_emit_state_colour_css(
		$root_sel,
		'' !== $sgs_nb_text_normal_decl ? array( $sgs_nb_text_normal_decl ) : array(),
		'' !== $sgs_nb_text_hover_decl ? array( $sgs_nb_text_hover_decl ) : array()
	);
}
// Gradient companion rule — a no-op for a flat colour, MUST accompany
// sgs_text_colour_decl(): its gradient branch has no @supports fallback of
// its own.
$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $root_sel, $sgs_nb_text_normal_resolved );
if ( '' !== $sgs_nb_text_hover_resolved && $sgs_nb_text_hover_resolved !== $sgs_nb_text_normal_resolved ) {
	$scoped_css[] = sgs_hover_media_wrap(
		sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover', $sgs_nb_text_hover_resolved )
	) . sgs_text_colour_gradient_fallback_rule( $root_sel . ':focus-visible', $sgs_nb_text_hover_resolved );
}

// --- Background (flat-or-gradient, base + hover) — painted on a `::after`
// layer, never the root itself, so a text gradient on the SAME root
// (background-clip:text, above) cannot clip or overwrite it (mirrors
// sgs/product-card + sgs/heading + sgs/text's background/text pseudo-element
// split — text + background land on the SAME element here). ---
$sgs_nb_bg_decls = sgs_fill_decls(
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);

$scoped_css[] = sgs_block_background_layer_css(
	$root_sel,
	$sgs_nb_bg_decls['normal'][0] ?? '',
	$sgs_nb_bg_decls['hover'][0] ?? ''
);

// --- Width (base only, kept-scalar). ---
if ( $max_width ) {
	$mw_safe = sgs_css_length_value( $max_width );
	if ( '' !== $mw_safe ) {
		$scoped_css[] = "{$root_sel}{max-width:{$mw_safe};}";
	}
}
// --- Base spacing (padding/margin), border (color/width/style/radius), WP
// colour + typography supports — skip-serialised, emitted scoped via the
// stable core style engine (exactly how WP core outputs `layout` support). ---

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

if ( ! empty( $base_style_engine_args ) ) {
	$base_scoped_styles = wp_style_engine_get_styles(
		$base_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). Replaces the old WP-native
// supports.typography fontSize/lineHeight/fontStyle (removed from block.json),
// which also now offers fontWeight. Painted on the ROOT selector so it
// inherits into the InnerBlocks sgs/text child (HC2's native-typography
// wrapper-inheritance carve-out) rather than a per-element override.
$scoped_css[] = sgs_typography_css_rule( $attributes, '', $root_sel );

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B/§B2: tablet
// max-width:1023px, mobile max-width:767px). ---
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );

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
// FR-22-6: text content is $content (sgs/text InnerBlock). R-31-14: no fallback.
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
<?php
// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt = '' !== $border_width_top ? $border_width_top : '0';
		$bwr = '' !== $border_width_right ? $border_width_right : '0';
		$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl = '' !== $border_width_left ? $border_width_left : '0';
		$scoped_css[] = $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$scoped_css[] = sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$scoped_css[] = $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$radius_tiers = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$scoped_css[] = $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}
?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches SGS_Container_Wrapper
	// + sgs/quote + sgs/heading). Every value reaching $scoped_css is
	// pre-sanitised (sgs_css_length_value() / sgs_colour_value / wp_style_engine_get_styles /
	// allowlisted attribute enums), so no un-sanitised value survives to here.
	echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
</style>
<?php endif; ?>
<?php
echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-sanitised HTML; $sgs_inner_html built from escaped parts + WP InnerBlocks.
