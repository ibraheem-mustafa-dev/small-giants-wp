<?php
/**
 * Server-side render for the SGS Nav Drawer block (Spec 36 FR-36-6).
 *
 * The mobile off-canvas menu the burger opens: a FULL-SCREEN native
 * `<dialog showModal>` modal (top layer → survives a transformed header
 * ancestor). Its editable CONTENT is InnerBlocks ($content); the × close
 * button is FIXED CHROME rendered here as a SIBLING of $content, OUTSIDE the
 * editable InnerBlocks zone, so an operator editing content can never delete it
 * (undeletable by construction — FR-36-6). All open / close / focus-trap /
 * scroll-lock / ESC / reparent (D323) / scrollbar-bounce (D340) behaviour is
 * OWNED BY THE SHARED STORE (src/shared/nav-interactivity/store.js); this file
 * emits only the markup the store resolves by id/attribute.
 *
 * WRAPPER NOTE (documented deviation from the "section composite KEEPS the
 * SGS_Container_Wrapper" default): the drawer root MUST be a `<dialog>` for
 * `showModal()` + top-layer + native `::backdrop`/ESC, but SGS_Container_Wrapper
 * coerces any tag outside its $allowed_tags list (section/div/article/aside/
 * main/nav/header/footer/figure/details/fieldset — 'dialog' is NOT included) to
 * 'section', and I must not modify that shared file. A full-screen dialog uses
 * NONE of the wrapper's grid / max-width band / background-image / shape-divider
 * machinery — it needs only background, padding, gap and content-alignment — so
 * the drawer MIRRORS those capabilities block-privately through the SAME shared
 * scoped-CSS helpers (sgs_emit_responsive_css + wp_style_engine_get_styles), with
 * ZERO inline property declarations and no divergence from the wrapper's computed
 * behaviour (the D294 block-private-when-no-grid/section-machinery pattern).
 *
 * NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * drawerBg + WCAG-computed foreground, drawerAlign, drawerGap, drawerPadding, close-button colour, the background-image media layer
 * (`.{uid}::before`) and the skip-serialised __experimentalBorder support are all emitted into this block's OWN scoped `.{uid}` <style>
 * at CLASS specificity (never `#uid`, D303).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    InnerBlocks HTML (menu, logo, CTA).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-colour-wcag.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

// CSS-keyword sanitiser — letters + hyphen only (for free-text keyword attrs
// concatenated into raw CSS inside the scoped <style>). Mirrors sgs/hero.
// CSS length/unit sanitiser — digits, dot, %, unit letters only.
// ── Legacy HTML-anchor salt (WP core's `supports.anchor` feature) for the uid
// hash below. Vestigial: block.json declares `supports.anchor:false`, so WP
// never populates this key for the CORE feature — but block.json now ALSO
// declares a genuine object-typed `anchor` ATTRIBUTE (Task 1, geometry
// selector) that occupies the SAME 'anchor' key in parsed attrs, so this must
// guard with is_string() or an array-to-string cast notice fires on every
// render that sets a per-device anchor. $attributes is already hashed whole
// via wp_json_encode() below, so the new attribute's contribution to uid
// stability does not depend on this line at all.
$anchor_val = isset( $block->parsed_block['attrs']['anchor'] ) && is_string( $block->parsed_block['attrs']['anchor'] )
	? (string) $block->parsed_block['attrs']['anchor']
	: '';

// ── drawerRef — the <dialog> id the burger's aria-controls / store context
// resolves. Defaults to 'sgs-nav-drawer' (matching sgs/nav-menu's own drawerRef
// default) so the single-drawer case associates with zero config. An operator /
// converter value is sanitised to an HTML-id-safe token. Empty → the default.
$drawer_ref_raw = isset( $attributes['drawerRef'] ) ? trim( (string) $attributes['drawerRef'] ) : '';
$drawer_ref     = '' !== $drawer_ref_raw ? sanitize_html_class( $drawer_ref_raw ) : 'sgs-nav-drawer';
if ( '' === $drawer_ref ) {
	$drawer_ref = 'sgs-nav-drawer';
}

// ── uid — CLASS-scoped hook for this block's scoped <style> (kept SEPARATE from
// the functional drawerRef id). Content-addressed so a scoped <style> dedups.
// STOP-NO-KSORT: $attributes hashed verbatim, never reordered.
$uid       = 'sgs-nav-drawer-' . substr( md5( wp_json_encode( $attributes ) . $anchor_val ), 0, 8 );
$root_sel  = '.' . $uid . '.wp-block-sgs-nav-drawer';
$body_sel  = $root_sel . ' .sgs-nav-drawer__body';
$close_sel = $root_sel . ' .sgs-nav-drawer__close';

// ── Geometry — desktop-variant anchors. `anchor` is a per-device object
// { desktop, tablet, mobile } of full-screen|header|trigger|centred, resolved
// via the shared sgs_resolve_tier() cascade (identical semantics to every
// other §S9 responsive-object attribute — 'inherit'/null/absent = inherit
// upward, desktop falls back to 'full-screen'). `panelSize` is the matching
// per-device LENGTH object, consulted only by the trigger/centred anchors.
$sgs_nd_allowed_anchors = array( 'full-screen', 'header', 'trigger', 'centred' );

/**
 * Geometry declarations (position/inset/width/height/max-* ONLY — never
 * `display`, per STOP-DIALOG-DISPLAY-GATE/D338) for one resolved anchor value
 * at one tier. `header` derives its top offset from the published
 * `--sgs-header-height` custom property (never a hardcoded px) and spans full
 * width beneath it; `trigger` anchors BELOW the actual burger, reading the
 * `--sgs-drawer-trigger-top` / `--sgs-drawer-trigger-right` values store.js
 * measures from the live trigger rect at open time (same measure-and-write
 * pattern as the header offset), falling back to 16px/16px only when JS has
 * not run; `centred` is the modal-card geometry `sgs/modal` already uses
 * (margin:auto within a fixed inset).
 *
 * @param string $anchor_value Resolved anchor keyword for this tier.
 * @param string $panel_size   Resolved, pre-sanitised panelSize length for this tier (may be '').
 * @return string CSS declarations (no selector/braces).
 */
$sgs_nd_geometry_for_anchor = function ( $anchor_value, $panel_size ) {
	switch ( $anchor_value ) {
		case 'header':
			// The real header bottom edge (Fix 7, multi-rater pre-commit review):
			// the theme's utilities.css sets --sgs-header-height:80px UNCONDITIONALLY
			// (a static token, not the header's live rendered height), so the drawer
			// sat at a constant 80px — or 0 when the header is unpinned/hidden —
			// instead of tracking the header's actual bottom. store.js measures the
			// real getBoundingClientRect().bottom at open time and writes
			// --sgs-drawer-header-offset onto the dialog; that measured value takes
			// precedence, falling back to the static --sgs-header-height (then 0)
			// when JS hasn't run (no-JS / first paint).
			return 'position:fixed;top:var(--sgs-drawer-header-offset, var(--sgs-header-height, 0px));right:0;bottom:auto;left:0;margin:0;width:100%;height:auto;max-width:100vw;max-height:calc(100dvh - var(--sgs-drawer-header-offset, var(--sgs-header-height, 0px)));';
		case 'trigger':
			$cap = '' !== $panel_size ? $panel_size : '360px';
			return 'position:fixed;top:var(--sgs-drawer-trigger-top, 16px);right:var(--sgs-drawer-trigger-right, 16px);bottom:auto;left:auto;margin:0;width:min(' . $cap . ', calc(100vw - 32px));height:auto;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);';
		case 'centred':
			$cap = '' !== $panel_size ? $panel_size : '480px';
			return 'position:fixed;inset:0;margin:auto;width:min(' . $cap . ', calc(100vw - 32px));height:fit-content;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);';
		case 'full-screen':
		default:
			// Identical to style.css's base rule — deliberately, so the
			// zero-attribute (default) case never needs this closure called
			// at all (guarded below) and an explicit 'full-screen' pick at a
			// non-desktop tier still reads correctly against a differing
			// desktop tier.
			return 'position:fixed;inset:0;margin:0;width:100vw;height:100dvh;max-width:100vw;max-height:100dvh;';
	}
};

$anchor_attr_raw      = $attributes['anchor'] ?? array();
$panel_size_attr_raw  = $attributes['panelSize'] ?? array();
$sgs_nd_anchor_is_set = is_array( $anchor_attr_raw ) && ! empty( $anchor_attr_raw );
$sgs_nd_panel_is_set  = is_array( $panel_size_attr_raw ) && ! empty( $panel_size_attr_raw );

// ── Content alignment → align-items on the drawer body. 'left'/'center'/'right'
// map to flex-start/center/flex-end (CSS keyword — US spelling is the syntax).
$allowed_aligns  = array( 'left', 'center', 'right' );
$drawer_align    = in_array( $attributes['drawerAlign'] ?? 'left', $allowed_aligns, true )
	? (string) $attributes['drawerAlign']
	: 'left';
$align_items_map = array(
	'left'   => 'flex-start',
	'center' => 'center',
	'right'  => 'flex-end',
);
// Logical text-align equivalents of the same pick, for descendants whose BOX is
// full-width (so align-items can move nothing) and whose LABEL is what must move.
$text_align_map = array(
	'left'   => 'start',
	'center' => 'center',
	'right'  => 'end',
);

// ── Background (drawerBg, slug, default 'primary') + WCAG-computed foreground
// (D339): the background stays a theme-linked var() so a palette change recolours
// it; the foreground is computed from the LIVE resolved hex each render so the
// pairing is always ≥ 4.5:1 with zero config.
$drawer_bg_slug = isset( $attributes['drawerBg'] ) ? sanitize_html_class( $attributes['drawerBg'] ) : 'primary';
$drawer_bg_hex  = '' !== $drawer_bg_slug ? sgs_resolve_palette_hex( $drawer_bg_slug, '' ) : '';
$drawer_fg_hex  = ( '' !== $drawer_bg_hex ) ? sgs_wcag_text_colour_for_bg( $drawer_bg_hex ) : '';

// ── Drawer TEXT colour — the OPERATOR'S choice, which wins outright.
// $drawer_fg_hex above is a FALLBACK, not a control: the WCAG pairing applies
// only while the client has not chosen a text colour. Contrast guidance is
// advisory (an editor notice), never an override — WordPress core's own
// ContrastChecker warns and never enforces, and sgs/site-header follows the
// same rule (D681-D684). Before this, the computed value was the SOLE author of
// the drawer's text colour and no attribute existed to override it.
$drawer_text_effective = sgs_resolve_text_colour_or_gradient(
	$attributes['drawerTextColour'] ?? '',
	$attributes['drawerTextColourGradient'] ?? ''
);

// ── Close-icon colour (toggleCloseColour, slug). Empty = inherit the drawer's
// computed foreground (style.css sets the × to color:inherit).
// D956 — toggleCloseColourGradient is the gradient sibling (778879732 rollout,
// Phase 3); gradient wins when set+valid, mirrors drawerTextColourGradient above.
$close_colour_slug       = isset( $attributes['toggleCloseColour'] ) ? sanitize_html_class( $attributes['toggleCloseColour'] ) : '';
$close_colour_gradient   = $attributes['toggleCloseColourGradient'] ?? '';
$close_colour_hover_slug = isset( $attributes['toggleCloseColourHover'] ) ? sanitize_html_class( $attributes['toggleCloseColourHover'] ) : '';

// ── Submenu model — LIVE (FR-36-6). Published to the drawer's descendants via
// block.json `providesContext` (`sgs/navDrawerSubmenuModel`, mapped from this
// same attribute below) so any `sgs/nav-menu` inside this drawer's InnerBlocks
// content renders a REAL nested list — a native `<details name>` exclusive
// accordion for both models; `drill-down` layers a JS slide-to-sub-panel
// enhancement on top (nav-menu/render.php's render_items_drawer() +
// src/shared/effects/nav-drilldown.js). Standard WP block-context resolution
// (WP_Block::render(), computed from the parsed block tree before a child's
// render callback runs) means this works identically whether the drawer
// renders as ordinary page content or via the Active-drawer do_blocks() route
// (class-sgs-drawer-render.php) — both parse the SAME stored block markup
// through the same render_block() machinery.
$submenu_model = in_array( $attributes['submenuModel'] ?? 'accordion', array( 'accordion', 'drill-down' ), true )
	? (string) $attributes['submenuModel']
	: 'accordion';

// ── Background image (backgroundImage + size/position/repeat/attachment).
// Mirrors sgs/container's own media-LAYER pattern (class-sgs-container-wrapper.php,
// "Background image — section kind only" block): the image paints on a
// `.{uid}::before` pseudo-element, never on the dialog root itself, because the
// root already carries drawerBg/drawerBgGradient (a `background-image` here
// would simply overwrite the gradient rather than layering with it) and a
// dedicated layer lets a future opacity/blend control dim the picture without
// dimming the drawer's editable InnerBlocks content painted above it.
// `.wp-block-sgs-nav-drawer` uses neither `::before` nor `::after` anywhere in
// style.css, so the layer is free to claim (confirmed by reading the file).
$bg_image     = $attributes['backgroundImage'] ?? array();
$has_bg_image = ! empty( $bg_image['url'] );

// Spec 35 item 18 — see block.json's own comment on backgroundImageDecorative
// for why this is aria-describedby rather than aria-label: the dialog root's
// aria-label is already claimed for the drawer's own accessible name.
$bg_image_decorative = (bool) ( $attributes['backgroundImageDecorative'] ?? true );
$bg_image_alt        = $has_bg_image ? sanitize_text_field( $bg_image['alt'] ?? '' ) : '';
$bg_image_needs_note = $has_bg_image && ! $bg_image_decorative && '' !== $bg_image_alt;

$bg_size          = $attributes['backgroundSize'] ?? 'cover';
$allowed_bg_sizes = array( 'cover', 'contain', 'auto' );
if ( ! in_array( $bg_size, $allowed_bg_sizes, true ) ) {
	$bg_size = 'cover';
}
$bg_position        = $attributes['backgroundPosition'] ?? 'center center';
$bg_position        = preg_replace( '/[^A-Za-z0-9\s%]/', '', (string) $bg_position );
$bg_repeat          = $attributes['backgroundRepeat'] ?? 'no-repeat';
$allowed_bg_repeats = array( 'no-repeat', 'repeat', 'repeat-x', 'repeat-y' );
if ( ! in_array( $bg_repeat, $allowed_bg_repeats, true ) ) {
	$bg_repeat = 'no-repeat';
}
$bg_attachment       = $attributes['backgroundAttachment'] ?? 'scroll';
$allowed_attachments = array( 'scroll', 'fixed' );
if ( ! in_array( $bg_attachment, $allowed_attachments, true ) ) {
	$bg_attachment = 'scroll';
}

// ── Custom CSS escape hatch (non-device-breakpoint rules only, per contract).
$custom_css = isset( $attributes['sgsCustomCss'] ) ? (string) $attributes['sgsCustomCss'] : '';

// ────────────────────────────────────────────────────────────────────────────
// Build the block's OWN scoped CSS (no-inline contract; every value pre-sanitised).
// ────────────────────────────────────────────────────────────────────────────
$css = '';

// Background + WCAG foreground on the dialog root.
if ( '' !== $drawer_bg_slug ) {
	$decls = 'background-color:var(--wp--preset--color--' . $drawer_bg_slug . ');';
	// A background GRADIENT layers OVER the flat colour rather than replacing it.
	// The canonical helper is gradient-wins (sgs_background_paint_value), but a drawer
	// is an OVERLAY panel: if the gradient carries alpha, dropping the solid base makes
	// the page behind it show through. Keeping both is what CSS layering already does,
	// and the value still goes through the canonical sanitiser.
	// No background-clip is involved here, so this does NOT hit the clipping problem
	// that keeps the TEXT gradient off this element (see the body rule below).
	$drawer_bg_gradient = sgs_css_gradient_value( $attributes['drawerBgGradient'] ?? '' );
	if ( '' !== $drawer_bg_gradient ) {
		$decls .= 'background-image:' . $drawer_bg_gradient . ';';
	}
	if ( '' !== $drawer_fg_hex ) {
		// FALLBACK only — the WCAG pairing applies while the client has not
		// chosen a text colour, and is overridden below when they have.
		$decls .= 'color:' . esc_attr( $drawer_fg_hex ) . ';';
	}
	$css .= $root_sel . '{' . $decls . '}';
}

// ── Operator's text colour — painted on the BODY, never on the dialog root.
//
// ⛔ THE ROOT IS THE ONE PLACE THIS CANNOT GO. A text gradient is a
// `background-image` plus `background-clip:text`, and background-clip clips the
// element's WHOLE background painting area to the glyph shapes — background-COLOUR
// included, not just the image. On the dialog root, which carries the drawer's own
// background-color above, a gradient would clip the panel's fill to the letters and
// the drawer would lose its background.
//
// `.sgs-nav-drawer__body` carries no background of its own, so both work at once:
// the panel keeps its fill, the text keeps its gradient. This is a DOM-shape
// constraint, not a CSS limit — the same reason sgs/button IS exempt (D288 makes
// the <a> itself the block root, so it has no inner element to move the text to).
if ( '' !== $drawer_text_effective ) {
	$css .= $body_sel . '{' . sgs_text_colour_decl( $drawer_text_effective ) . '}';
	// @supports fallback so a browser without background-clip:text still gets a
	// readable flat colour rather than transparent glyphs.
	$css .= sgs_text_colour_gradient_fallback_rule( $body_sel, $drawer_text_effective );
}

/*
 * Content alignment on the drawer body, PLUS the same pick published as two
 * inheritable custom properties so descendant blocks can honour it.
 *
 * Why custom properties and not WP block context: context reaches InnerBlocks
 * descendants only, and the Active-CPT route renders drawer content through a
 * separate do_blocks() call where that chain is broken — context would look
 * correct on one route and silently do nothing on the other. A custom property
 * inherits through the rendered DOM on BOTH routes, needs no JS, and extends
 * for free if drawerAlign ever goes per-device (re-declare inside @media).
 *
 * --sgs-drawer-align      = the flexbox value, for a descendant that is itself
 *                           a flex/grid container of its own children.
 * --sgs-drawer-text-align = the logical text value, for a descendant whose BOX
 *                           is deliberately full-width (sgs/nav-menu items are,
 *                           for touch-target size) so only the LABEL can move.
 * Consumer: nav-menu/render.php (search --sgs-drawer-align there before renaming).
 */
$css .= $body_sel . '{align-items:' . $align_items_map[ $drawer_align ] . ';'
	. '--sgs-drawer-align:' . $align_items_map[ $drawer_align ] . ';'
	. '--sgs-drawer-text-align:' . $text_align_map[ $drawer_align ] . ';}';

// Inner element spacing (drawerGap — object model {desktop,tablet,mobile},
// each a length string). Emitted via the shared object-model helper (device
// tiers 1023/767 come from SGS_Breakpoints).
if ( function_exists( 'sgs_emit_responsive_css' ) && is_array( $attributes['drawerGap'] ?? null ) ) {
	$css .= sgs_emit_responsive_css(
		$body_sel,
		array(
			array(
				'value'        => $attributes['drawerGap'],
				'css'          => 'gap',
				'unit_default' => 'px',
			),
		)
	);
}

// Popup padding (drawerPadding — object box model {desktop:{top,right,bottom,
// left},…}). Per-side longhand via the shared object-model helper.
if ( function_exists( 'sgs_emit_responsive_css' ) && is_array( $attributes['drawerPadding'] ?? null ) ) {
	$css .= sgs_emit_responsive_css(
		$body_sel,
		array(
			array(
				'value'        => $attributes['drawerPadding'],
				'css'          => 'padding',
				'box'          => true,
				'unit_default' => 'px',
			),
		)
	);
}

// Close-icon colour override (else inherits the computed foreground).
// D956 — sibling gradient wins when set+valid, same resolve/decl/fallback
// shape as the drawer text colour above.
$close_colour_effective = sgs_resolve_text_colour_or_gradient( $close_colour_slug, $close_colour_gradient );
if ( '' !== $close_colour_effective ) {
	$close_colour_decl = sgs_text_colour_decl( $close_colour_effective );
	if ( '' !== $close_colour_decl ) {
		$css .= $close_sel . '{' . $close_colour_decl . ';}';
	}
	$css .= sgs_text_colour_gradient_fallback_rule( $close_sel, $close_colour_effective );
}

// The close button IS an interactive target, so it carries a real hover state —
// it is NOT a candidate for a states exemption. :focus-visible is paired with
// :hover so keyboard users get the same affordance.
if ( '' !== $close_colour_hover_slug ) {
	$css .= sgs_hover_state_rules( $close_sel, 'color:' . sgs_colour_value( $close_colour_hover_slug ), ':focus-visible' );
}

// ── Anchor geometry (desktop variants). Guard on "is either attribute
// actually set" so the zero-attribute default renders BYTE-IDENTICAL to the
// pre-Task-1 output — style.css's base rule already IS the full-screen
// geometry, so emitting it again here for the untouched default would be a
// redundant (harmless but non-identical) duplicate rule.
if ( $sgs_nd_anchor_is_set || $sgs_nd_panel_is_set ) {
	$sgs_nd_anchor_desktop = sgs_resolve_tier( $anchor_attr_raw, 'desktop', 'full-screen' )['value'];
	$sgs_nd_anchor_tablet  = sgs_resolve_tier( $anchor_attr_raw, 'tablet', 'full-screen' )['value'];
	$sgs_nd_anchor_mobile  = sgs_resolve_tier( $anchor_attr_raw, 'mobile', 'full-screen' )['value'];

	$sgs_nd_anchor_desktop = in_array( $sgs_nd_anchor_desktop, $sgs_nd_allowed_anchors, true ) ? $sgs_nd_anchor_desktop : 'full-screen';
	$sgs_nd_anchor_tablet  = in_array( $sgs_nd_anchor_tablet, $sgs_nd_allowed_anchors, true ) ? $sgs_nd_anchor_tablet : 'full-screen';
	$sgs_nd_anchor_mobile  = in_array( $sgs_nd_anchor_mobile, $sgs_nd_allowed_anchors, true ) ? $sgs_nd_anchor_mobile : 'full-screen';

	// panelSize is a free-text CSS length expression (calc()/clamp() are valid
	// operator input, e.g. 'calc(100% - 40px)') — the strict digits/dot/%/unit-
	// letters-only $sgs_nd_css_length sanitiser would mangle it (Fix 6, multi-
	// rater pre-commit review): 'calc(100% - 40px)' → 'calc10040px'. Use the
	// shared free-text CSS-value sanitiser instead (permits the math-function
	// character set while still stripping anything that could break out of the
	// declaration).
	$sgs_nd_panel_desktop = sgs_responsive_sanitise_css_value( (string) sgs_resolve_tier( $panel_size_attr_raw, 'desktop', '' )['value'] );
	$sgs_nd_panel_tablet  = sgs_responsive_sanitise_css_value( (string) sgs_resolve_tier( $panel_size_attr_raw, 'tablet', '' )['value'] );
	$sgs_nd_panel_mobile  = sgs_responsive_sanitise_css_value( (string) sgs_resolve_tier( $panel_size_attr_raw, 'mobile', '' )['value'] );

	$sgs_nd_geom_desktop = $sgs_nd_geometry_for_anchor( $sgs_nd_anchor_desktop, $sgs_nd_panel_desktop );
	$sgs_nd_geom_tablet  = $sgs_nd_geometry_for_anchor( $sgs_nd_anchor_tablet, $sgs_nd_panel_tablet );
	$sgs_nd_geom_mobile  = $sgs_nd_geometry_for_anchor( $sgs_nd_anchor_mobile, $sgs_nd_panel_mobile );

	if ( '' !== $sgs_nd_geom_desktop ) {
		$css .= $root_sel . '{' . $sgs_nd_geom_desktop . '}';
	}
	// Tier-diff: only emit a tier's @media rule when it genuinely differs from
	// the tier above (mirrors sgs_emit_tier_rules()'s own convention).
	if ( $sgs_nd_geom_tablet !== $sgs_nd_geom_desktop ) {
		$css .= '@media (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px){' . $root_sel . '{' . $sgs_nd_geom_tablet . '}}';
	}
	if ( $sgs_nd_geom_mobile !== $sgs_nd_geom_tablet ) {
		$css .= '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){' . $root_sel . '{' . $sgs_nd_geom_mobile . '}}';
	}
}

// ── Surface (opacity + blur on the panel itself — no separate scrim element;
// 8/8 reference sites skip a dedicated scrim div). Opaque + unblurred (the
// existing default) emits nothing extra so an untouched drawer is unaffected.
$sgs_nd_surface_opacity = isset( $attributes['surfaceOpacity'] ) ? (float) $attributes['surfaceOpacity'] : 1.0;
$sgs_nd_surface_opacity = max( 0.0, min( 1.0, $sgs_nd_surface_opacity ) );
$sgs_nd_surface_blur    = sgs_css_length_value( $attributes['surfaceBlur'] ?? '' );

if ( $sgs_nd_surface_opacity < 1.0 || '' !== $sgs_nd_surface_blur ) {
	$sgs_nd_surface_decls = '';
	if ( $sgs_nd_surface_opacity < 1.0 && '' !== $drawer_bg_slug ) {
		// color-mix() keeps the resolved token as the SOURCE colour (a palette
		// change still recolours the translucent panel) while expressing the
		// operator's chosen opacity — no separate alpha-channel attribute needed.
		$sgs_nd_pct            = rtrim( rtrim( number_format( $sgs_nd_surface_opacity * 100, 2 ), '0' ), '.' );
		$sgs_nd_pct            = '' !== $sgs_nd_pct ? $sgs_nd_pct : '0';
		$sgs_nd_surface_decls .= 'background-color:color-mix(in srgb, var(--wp--preset--color--' . $drawer_bg_slug . ') ' . $sgs_nd_pct . '%, transparent);';
	}
	if ( '' !== $sgs_nd_surface_blur ) {
		$sgs_nd_surface_decls .= 'backdrop-filter:blur(' . $sgs_nd_surface_blur . ');-webkit-backdrop-filter:blur(' . $sgs_nd_surface_blur . ');';
	}
	if ( '' !== $sgs_nd_surface_decls ) {
		$css .= $root_sel . '{' . $sgs_nd_surface_decls . '}';
	}
}

// ── Background image media layer (`.{uid}::before`). z-index:-1 keeps it below
// the dialog's own background-colour/gradient paint and below the real
// `.sgs-nav-drawer__body`/close-button children (both default z-index:auto,
// which stacks above a negative-z sibling) — the drawer's editable content
// always stays visible over the picture, mirroring sgs/container's identical
// media-layer contract (class-sgs-container-wrapper.php).
if ( $has_bg_image ) {
	$sgs_nd_media_decls   = array();
	$sgs_nd_media_decls[] = 'content:""';
	$sgs_nd_media_decls[] = 'position:absolute';
	$sgs_nd_media_decls[] = 'inset:0';
	$sgs_nd_media_decls[] = 'z-index:-1';
	$sgs_nd_media_decls[] = 'pointer-events:none';
	$sgs_nd_media_decls[] = 'background-image:url(' . esc_url( $bg_image['url'] ) . ')';
	$sgs_nd_media_decls[] = 'background-size:' . esc_attr( $bg_size );
	$sgs_nd_media_decls[] = 'background-position:' . esc_attr( $bg_position );
	$sgs_nd_media_decls[] = 'background-repeat:' . esc_attr( $bg_repeat );
	if ( 'fixed' === $bg_attachment ) {
		$sgs_nd_media_decls[] = 'background-attachment:fixed';
	}
	$css .= $root_sel . '::before{' . implode( ';', $sgs_nd_media_decls ) . '}';
}

// ── Skip-serialised WP-native __experimentalBorder support → scoped rule
// (Spec 32 no-inline). block.json declares __experimentalBorder with
// __experimentalSkipSerialization:true, so get_block_wrapper_attributes() never
// auto-inlines it; read the resolved values from $attributes['style']['border']
// and emit them into this block's own scoped <style>.

$border_args = array();
// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width. Gated together via the shared helper (helpers-box.php)
// so this rule is applied identically everywhere, not per block.
if ( ! empty( $border_args ) ) {
	$border_scoped = wp_style_engine_get_styles(
		array( 'border' => $border_args ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_scoped['css'] ) ) {
		$css .= $border_scoped['css'];
	}
}

// Custom CSS escape hatch — appended verbatim (sanitised of a </style> breakout

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
		$css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
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
$border_radius_obj = is_array( $attributes['borderRadius'] ?? null ) ? $attributes['borderRadius'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// by wp_strip_all_tags below alongside the rest of $css).
if ( '' !== $custom_css ) {
	$css .= $custom_css;
}

// ── Build the dialog wrapper attributes. The <dialog> id IS the drawerRef (the
// store resolves the drawer by getElementById — the id + data-sgs-nav-drawer
// survive the D323 body-reparent). supports.anchor is false (block.json) so no
// competing anchor id is emitted. The uid is added as a CLASS for the scoped CSS.

/*
 * Entry-animation direction (animateFrom). `auto` (the default) resolves to a
 * PER-ANCHOR default motion — the drawer's own DESKTOP anchor decides which
 * animation class applies, since the anchor (not an independent direction)
 * IS the design-defining choice now: full-screen keeps the pre-existing
 * fade-drop (no class, so an untouched drawer is unaffected), header expands
 * down, trigger scales/fades from its corner, centred scales up like a
 * modal. `fade` is an explicit opacity-only override available at every
 * anchor. All rules live inside the CSS's `prefers-reduced-motion:
 * no-preference` block, so a reduced-motion user is unaffected regardless.
 */
$sgs_nd_allowed_anims = array( 'auto', 'fade' );
$sgs_nd_animate_from  = in_array( $attributes['animateFrom'] ?? 'auto', $sgs_nd_allowed_anims, true )
	? (string) $attributes['animateFrom']
	: 'auto';

$sgs_nd_anim_class = '';
if ( 'fade' === $sgs_nd_animate_from ) {
	$sgs_nd_anim_class = 'sgs-nav-drawer--anim-fade';
} else {
	// auto → per-anchor default. Resolve the DESKTOP anchor only for the
	// animation choice (the entry motion is a single per-instance decision,
	// not itself per-device) — falls back to 'full-screen' (no class) when
	// `anchor` is unset, byte-identical to the pre-Task-1 default.
	$sgs_nd_anim_anchor = $sgs_nd_anchor_is_set
		? sgs_resolve_tier( $anchor_attr_raw, 'desktop', 'full-screen' )['value']
		: 'full-screen';
	$sgs_nd_anim_anchor = in_array( $sgs_nd_anim_anchor, $sgs_nd_allowed_anchors, true ) ? $sgs_nd_anim_anchor : 'full-screen';
	$sgs_nd_anim_map    = array(
		'header'  => 'sgs-nav-drawer--anim-expand-down',
		'trigger' => 'sgs-nav-drawer--anim-corner-scale',
		'centred' => 'sgs-nav-drawer--anim-modal-scale',
	);
	$sgs_nd_anim_class  = $sgs_nd_anim_map[ $sgs_nd_anim_anchor ] ?? '';
}

// ── Close-button style (closeStyle). `separate-x` (default) renders the
// existing × icon, byte-identical to the pre-Task-1 output. `text-swap`
// replaces the icon with a "Close" text label (3/8 reference sites use a
// text-only close, no icon at all). `burger-morph` renders a 2-bar icon drawn
// to already read as an X (an honest simplification: true cross-block
// synchronisation with the HEADER burger's own morph would need new
// Interactivity-store wiring between two independent block instances, which
// is out of this task's scope — documented, not silently assumed). The ×
// button itself remains fixed, undeletable chrome in EVERY style (FR-36-6).
$sgs_nd_allowed_close_styles = array( 'separate-x', 'text-swap', 'burger-morph' );
$sgs_nd_close_style          = in_array( $attributes['closeStyle'] ?? 'separate-x', $sgs_nd_allowed_close_styles, true )
	? (string) $attributes['closeStyle']
	: 'separate-x';

$classes = array(
	'sgs-nav-drawer',
	$uid,
	'sgs-nav-drawer--submenu-' . $submenu_model,
	'sgs-nav-drawer--close-' . $sgs_nd_close_style,
);

if ( '' !== $sgs_nd_anim_class ) {
	$classes[] = $sgs_nd_anim_class;
}

// ── variantPreset — the variation slug this instance was inserted from. No
// CSS behaviour depends on it (each variation's LOOK comes entirely from the
// attrs it sets, per the binding variant principle), but rendering it as a
// class makes the attribute non-dead (check-dead-controls.js) and gives
// per-preset CSS a hook should a future need arise.
$variant_preset_slug = isset( $attributes['variantPreset'] ) ? sanitize_html_class( (string) $attributes['variantPreset'] ) : '';
if ( '' !== $variant_preset_slug ) {
	$classes[] = 'sgs-nav-drawer--preset-' . $variant_preset_slug;
}

$wrapper_args       = array(
	'class'               => implode( ' ', $classes ),
	'id'                  => $drawer_ref,
	'data-sgs-nav-drawer' => '',
	// The dialog's accessible name. Operator-settable because this block supports
	// MULTIPLE drawers on one site (that is what the Drawer ID exists for), and two
	// dialogs both announced as "Navigation menu" cannot be told apart by a screen
	// reader. Falls back to the generic name when unset, so nothing regresses.
	'aria-label'          => '' !== ( $attributes['ariaLabel'] ?? '' )
		? esc_attr( $attributes['ariaLabel'] )
		: esc_attr__( 'Navigation menu', 'sgs-blocks' ),
);
if ( $bg_image_needs_note ) {
	$wrapper_args['aria-describedby'] = $drawer_ref . '-bg-note';
}
$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

// ── The × close button — FIXED CHROME (FR-36-6). Rendered as a SIBLING of
// $content, OUTSIDE the editable InnerBlocks, so it is undeletable by
// construction. data-sgs-nav-close is wired imperatively by the store on open.
// 44px target + accessible name + visible focus (style.css). It is DOM-first so
// the store's focus-into lands on a reliable close affordance.
if ( 'text-swap' === $sgs_nd_close_style ) {
	$sgs_nd_close_inner = '<span class="sgs-nav-drawer__close-text">' . esc_html__( 'Close', 'sgs-blocks' ) . '</span>';
} elseif ( 'burger-morph' === $sgs_nd_close_style ) {
	$sgs_nd_close_inner = '<span class="sgs-nav-drawer__close-bars" aria-hidden="true"><span></span><span></span></span>';
} else {
	$sgs_nd_close_inner = sgs_get_lucide_icon( 'x' ); // Trusted Lucide SVG markup.
}
$close_html = sprintf(
	'<button type="button" class="sgs-nav-drawer__close" data-sgs-nav-close aria-label="%s">%s</button>',
	esc_attr__( 'Close menu', 'sgs-blocks' ),
	$sgs_nd_close_inner // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_html() applied above (text-swap) or trusted static markup (burger-morph spans / Lucide SVG).
);

// Spec 35 item 18 — the visually-hidden note the aria-describedby above
// points at, only emitted when the operator marked the background image
// non-decorative and supplied alt text (see block.json comment).
$bg_image_note_html = '';
if ( $bg_image_needs_note ) {
	$bg_image_note_html = sprintf(
		'<span id="%s" class="screen-reader-text">%s</span>',
		esc_attr( $drawer_ref . '-bg-note' ),
		esc_html( $bg_image_alt )
	);
}

// ── Emit the scoped <style> then the dialog. wp_strip_all_tags (NOT esc_html)
// blocks a </style> breakout while leaving CSS combinators intact; every value
// reaching $css is pre-sanitised (sanitize_html_class slugs / $sgs_nd_css_*
// sanitisers / esc_attr / wp_style_engine_get_styles), so no un-sanitised value
// survives here.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $css pre-sanitised (sanitize_html_class / $sgs_nd_css_* / esc_attr / wp_style_engine_get_styles), wp_strip_all_tags guards </style>; $wrapper_attributes from get_block_wrapper_attributes(); $close_html pre-escaped + trusted Lucide SVG; $content is trusted WP InnerBlocks output.
if ( '' !== $css ) {
	printf( '<style>%s</style>', wp_strip_all_tags( $css ) );
}

printf(
	'<dialog %1$s>%2$s%3$s<div class="sgs-nav-drawer__body">%4$s</div></dialog>',
	$wrapper_attributes,
	$close_html,
	$bg_image_note_html,
	$content
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped

/*
 * ── ONE DRAWER PER REQUEST (W2-a, council BLOCKER 3). ────────────────────────
 *
 * Record that a drawer has now painted on this request, so the Active-drawer
 * render path (Sgs_Drawer_Render, on wp_footer) does NOT add a second one.
 *
 * This is the ORDINARY block path — the 8 header patterns each embed a
 * `sgs/nav-drawer` as a sibling of `sgs/site-header`, and until this line existed
 * they rendered entirely outside the Active-Layout machinery: a grep of this file
 * for `Sgs_Active_Layout` returned nothing. The consequence was concrete, not
 * theoretical — this block's `drawerRef` default and `sgs/nav-menu`'s are the same
 * string, so a page carrying BOTH a pattern-embedded drawer and an Active CPT
 * drawer would have shipped two `<dialog id="sgs-nav-drawer">` elements: a
 * duplicate id, a second modal the store can resolve by accident, and no error
 * anywhere.
 *
 * Exact precedent, including the reasoning: class-sgs-header-rules.php:253-258,
 * where the rules/default path records the same flag so a second header slot hits
 * the one-header guard. `render_active()` sets it inline on its own success path;
 * this is the other path that needed to.
 *
 * Set AFTER the printf, not before: the flag means "a drawer was SERVED", which is
 * the distinction Sgs_Active_Layout draws between $render_attempted and
 * $render_served (:52-74). Marking it before emitting would claim a drawer that
 * might not exist.
 *
 * Guarded on class_exists because a block's render.php can be exercised outside a
 * full plugin bootstrap (tests, the block-renderer REST route).
 */
if ( class_exists( '\\SGS\\Blocks\\Sgs_Active_Layout' ) ) {
	\SGS\Blocks\Sgs_Active_Layout::mark_served( \SGS\Blocks\Sgs_Active_Layout::AREA_DRAWER );
}
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
