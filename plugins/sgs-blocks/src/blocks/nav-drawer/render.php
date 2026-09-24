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
 * scroll-lock / ESC / reparent / scrollbar-bounce behaviour is
 * OWNED BY THE SHARED STORE (src/shared/nav-interactivity/store.js); this file
 * emits only the markup the store resolves by id/attribute.
 *
 * WRAPPER NOTE (documented deviation from the "section composite KEEPS the
 * SGS_Container_Wrapper" default): the drawer root MUST be a `<dialog>` for
 * `showModal()` + top-layer + native `::backdrop`/ESC, but SGS_Container_Wrapper
 * coerces any tag outside its $allowed_tags list (section/div/article/aside/
 * main/nav/header/footer/figure/details/fieldset — 'dialog' is NOT included) to
 * 'section', and the shared file is not modified for one block. A full-screen dialog uses
 * NONE of the wrapper's grid / max-width band / background-image / shape-divider
 * machinery — it needs only background, padding, gap and content-alignment — so
 * the drawer MIRRORS those capabilities block-privately through the SAME shared
 * scoped-CSS helpers (sgs_emit_responsive_css + wp_style_engine_get_styles), with
 * ZERO inline property declarations and no divergence from the wrapper's computed
 * behaviour (the block-private-when-no-grid/section-machinery pattern).
 *
 * NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * drawerBg + WCAG-computed foreground, drawerAlign, drawerGap, drawerPadding, close-button colour, the background-image media layer
 * (`.{uid}::before`) and the skip-serialised __experimentalBorder support are all emitted into this block's OWN scoped `.{uid}` <style>
 * at CLASS specificity (never `#uid`).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    InnerBlocks HTML (menu, logo, CTA).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-surface-ground.php';
require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-colour-wcag.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
// ⚠ The source-aware icon resolver sgs/icon and sgs/nav-bar-menu's trigger both use.
// It lives in includes/nav-menu-treatments.php, which is require_once'd PER-INSTANCE
// from sgs/nav-bar-menu's own render.php rather than at plugin bootstrap -- so its
// functions are NOT in scope just because that block exists on the page, and a drawer
// can render on a page with no nav bar at all. Requiring it here is what stops this
// call fatalling for a reason nobody would find; the file's own function_exists()
// guards make the double require_once free.
require_once dirname( __DIR__, 3 ) . '/includes/nav-menu-treatments.php';

// CSS-keyword sanitiser — letters + hyphen only (for free-text keyword attrs
// concatenated into raw CSS inside the scoped <style>). Mirrors sgs/hero.
// CSS length/unit sanitiser — digits, dot, %, unit letters only.
// ── Legacy HTML-anchor salt (WP core's `supports.anchor` feature) for the uid
// hash below. Vestigial: block.json declares `supports.anchor:false`, so WP
// never populates this key for the CORE feature — but block.json ALSO
// declares a genuine object-typed `anchor` ATTRIBUTE (geometry
// selector) that occupies the SAME 'anchor' key in parsed attrs, so this must
// guard with is_string() or an array-to-string cast notice fires on every
// render that sets a per-device anchor. $attributes is already hashed whole
// via wp_json_encode() below, so the new attribute's contribution to uid
// stability does not depend on this line at all.
$anchor_val = isset( $block->parsed_block['attrs']['anchor'] ) && is_string( $block->parsed_block['attrs']['anchor'] )
	? (string) $block->parsed_block['attrs']['anchor']
	: '';

// ── drawerRef — the <dialog> id the burger's aria-controls / store context
// resolves. Defaults to 'sgs-nav-drawer' (the id Sgs_Drawer_Render::drawer_ref_for()
// falls back to on sgs/nav-bar-menu) so the single-drawer case associates with zero config. An operator /
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
 * `display`, per STOP-DIALOG-DISPLAY-GATE) for one resolved anchor value
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
// Stacking per anchor (non-modal .show() path only; a showModal() dialog is in
// the top layer and ignores z-index). A panel that covers the header's area
// (full-screen) or butts against it (header) stays one below the header, so
// the header row and its burger remain visible and clickable above it. A panel
// that hangs from the burger (trigger) or floats (centred) is a popover and
// paints ABOVE the whole header, so no header row can overlap it (Bean,
// 2026-09-24: a two-row header's second row painted over the trigger panel).
// The burger stays live under that rule because the trigger panel hangs below
// it; if a panel ever does cover the burger, store.js's isOpenerLive() check
// fails and the × comes back automatically.
$sgs_nd_z_under_header = 'z-index:min(90, max(2, calc(var(--sgs-header-z, 100) - 1)));';
$sgs_nd_z_popover      = 'z-index:calc(var(--sgs-header-z, 100) + 1);';
$sgs_nd_geometry_for_anchor = function ( $anchor_value, $panel_size, $modality_value = 'modal' ) use ( $sgs_nd_z_under_header, $sgs_nd_z_popover ) {
	switch ( $anchor_value ) {
		case 'header':
			// The real header bottom edge: the theme's utilities.css sets
			// --sgs-header-height:80px UNCONDITIONALLY (a static token, not the
			// header's live rendered height), so using it alone would sit the
			// drawer at a constant 80px — or 0 when the header is unpinned/hidden —
			// instead of tracking the header's actual bottom. store.js measures the
			// real getBoundingClientRect().bottom at open time and writes
			// --sgs-drawer-header-offset onto the dialog; that measured value takes
			// precedence, falling back to the static --sgs-header-height (then 0)
			// when JS hasn't run (no-JS / first paint).
			return 'position:fixed;top:var(--sgs-drawer-header-offset, var(--sgs-header-height, 0px));right:0;bottom:auto;left:0;margin:0;width:100%;height:auto;max-width:100vw;max-height:calc(100dvh - var(--sgs-drawer-header-offset, var(--sgs-header-height, 0px)));' . $sgs_nd_z_under_header;
		case 'trigger':
			$cap = '' !== $panel_size ? $panel_size : '360px';
			return 'position:fixed;top:var(--sgs-drawer-trigger-top, 16px);right:var(--sgs-drawer-trigger-right, 16px);bottom:auto;left:auto;margin:0;width:min(' . $cap . ', calc(100vw - 32px));height:auto;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);' . $sgs_nd_z_popover;
		case 'centred':
			$cap = '' !== $panel_size ? $panel_size : '480px';
			return 'position:fixed;inset:0;margin:auto;width:min(' . $cap . ', calc(100vw - 32px));height:fit-content;max-width:calc(100vw - 32px);max-height:calc(100dvh - 32px);' . $sgs_nd_z_popover;
		case 'full-screen':
		default:
			// Non-modal (Bean, 2026-09-24): the drawer paints ABOVE the header
			// and starts at the bottom of the burger's own header row
			// (store.js measures --sgs-drawer-opener-row-bottom on open), so
			// the burger row stays visible and live as the close control and
			// every lower header row is covered, the rule the trigger panel
			// follows. A modal drawer is in the top layer and covers all.
			if ( 'non-modal' === $modality_value ) {
				return 'position:fixed;top:var(--sgs-drawer-opener-row-bottom, 0px);right:0;bottom:auto;left:0;margin:0;width:100vw;height:calc(100dvh - var(--sgs-drawer-opener-row-bottom, 0px));max-width:100vw;max-height:calc(100dvh - var(--sgs-drawer-opener-row-bottom, 0px));' . $sgs_nd_z_popover;
			}
			// Identical to style.css's base rule — deliberately, so the
			// zero-attribute (default) case never needs this closure called
			// at all (guarded below) and an explicit 'full-screen' pick at a
			// non-desktop tier still reads correctly against a differing
			// desktop tier.
			return 'position:fixed;inset:0;margin:0;width:100vw;height:100dvh;max-width:100vw;max-height:100dvh;' . $sgs_nd_z_under_header;
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

// ── Background (drawerBg, slug, default 'surface') + WCAG-computed foreground:
// the background stays a theme-linked var() so a palette change recolours
// it; the foreground is computed from the LIVE resolved hex each render so the
// pairing is always ≥ 4.5:1 with zero config.
$drawer_bg_slug = isset( $attributes['drawerBg'] ) ? sanitize_html_class( $attributes['drawerBg'] ) : 'surface';
$drawer_bg_hex  = '' !== $drawer_bg_slug ? sgs_resolve_palette_hex( $drawer_bg_slug, '' ) : '';
$drawer_fg_hex  = ( '' !== $drawer_bg_hex ) ? sgs_wcag_text_colour_for_bg( $drawer_bg_hex ) : '';

// ── Drawer TEXT colour — the OPERATOR'S choice, which wins outright.
// $drawer_fg_hex above is a FALLBACK, not a control: the WCAG pairing applies
// only while the client has not chosen a text colour. Contrast guidance is
// advisory (an editor notice), never an override — WordPress core's own
// ContrastChecker warns and never enforces, and sgs/site-header follows the
// same rule. The drawerTextColour attribute is the operator's override of the
// computed value.
$drawer_text_effective = sgs_resolve_text_colour_or_gradient(
	$attributes['drawerTextColour'] ?? '',
	$attributes['drawerTextColourGradient'] ?? ''
);

// ── Close-icon colour (toggleCloseColour, slug). Empty = inherit the drawer's
// computed foreground (style.css sets the × to color:inherit).
// toggleCloseColourGradient is the gradient sibling; gradient wins when
// set+valid, mirrors drawerTextColourGradient above.
$close_colour_slug       = isset( $attributes['toggleCloseColour'] ) ? sanitize_html_class( $attributes['toggleCloseColour'] ) : '';
$close_colour_gradient   = $attributes['toggleCloseColourGradient'] ?? '';
$close_colour_hover_slug = isset( $attributes['toggleCloseColourHover'] ) ? sanitize_html_class( $attributes['toggleCloseColourHover'] ) : '';
// toggleCloseColourHoverGradient -- Normal resolves gradient-or-solid via
// $close_colour_gradient above; Hover does the same through this attribute
// (no smart-contrast swap applies here, unlike the bar's itemColourHover).
// Read raw here, resolved below alongside $close_colour_hover_slug.
$close_colour_hover_gradient = $attributes['toggleCloseColourHoverGradient'] ?? '';

// ── Submenu model — LIVE (FR-36-6). Published to the drawer's descendants via
// block.json `providesContext` (`sgs/navDrawerSubmenuModel`, mapped from this
// same attribute below) so any `sgs/nav-drawer-menu` inside this drawer's InnerBlocks
// content renders a REAL nested list — a native `<details name>` exclusive
// accordion for both models; `drill-down` layers a JS slide-to-sub-panel
// enhancement on top (nav-drawer-menu/render.php's sgs_nav_drawer_menu_render_items() +
// src/shared/effects/nav-drilldown.js). Standard WP block-context resolution
// (WP_Block::render(), computed from the parsed block tree before a child's
// render callback runs) means this works identically whether the drawer
// renders as ordinary page content or via the Active-drawer do_blocks() route
// (class-sgs-drawer-render.php) — both parse the SAME stored block markup
// through the same render_block() machinery.
$submenu_model = in_array( $attributes['submenuModel'] ?? 'accordion', array( 'accordion', 'drill-down' ), true )
	? (string) $attributes['submenuModel']
	: 'accordion';

// ── Modality — resolved EARLY (Wave 3C U-9/U-11, moved up from the wrapper-args
// section below) because the revised FR-36-6 close predicate (§4.2) needs it
// before the close-button CSS/markup is built, not just for the wrapper's data
// attribute. Read here (not sniffed from browser capability, which is always
// true) and carried as a data attribute so store.js has it before it opens
// the dialog.
$modality_raw = (string) ( $attributes['modality'] ?? 'modal' );
$modality     = in_array( $modality_raw, array( 'modal', 'non-modal' ), true ) ? $modality_raw : 'modal';

// ── closeOnScrollDistance (§4.6, DEC-02 carve-out) — a plain number, 0..200,
// default 0 (off). Not a tier object (one reference, one value). Carried as a
// data attribute so store.js knows the threshold without re-reading attrs.
$sgs_nd_scroll_distance = isset( $attributes['closeOnScrollDistance'] ) && is_numeric( $attributes['closeOnScrollDistance'] )
	? max( 0.0, min( 200.0, (float) $attributes['closeOnScrollDistance'] ) )
	: 0.0;

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
// constraint, not a CSS limit — the same reason sgs/button IS exempt (the <a>
// itself is the block root, so it has no inner element to move the text to).
if ( '' !== $drawer_text_effective ) {
	$css .= $body_sel . '{' . sgs_text_colour_decl( $drawer_text_effective ) . '}';
	// @supports fallback so a browser without background-clip:text still gets a
	// readable flat colour rather than transparent glyphs.
	$css .= sgs_text_colour_gradient_fallback_rule( $body_sel, $drawer_text_effective );
}

// drawerTextColour hover state — same trio, :hover/:focus-visible variant of
// the same selector.
$drawer_text_effective_hover = sgs_resolve_text_colour_or_gradient(
	$attributes['drawerTextColourHover'] ?? '',
	$attributes['drawerTextColourHoverGradient'] ?? ''
);
if ( '' !== $drawer_text_effective_hover ) {
	$css .= sgs_hover_state_rules( $body_sel, sgs_text_colour_decl( $drawer_text_effective_hover ) );
	$css .= sgs_text_colour_gradient_fallback_rule( $body_sel . ':hover', $drawer_text_effective_hover );
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
 *                           is deliberately full-width (sgs/nav-drawer-menu items are,
 *                           for touch-target size) so only the LABEL can move.
 * Consumer: nav-drawer-menu/render.php (search --sgs-drawer-align there before renaming).
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
// Sibling gradient wins when set+valid, same resolve/decl/fallback
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
// toggleCloseColourHoverGradient — same resolve/decl/fallback trio as the
// Normal state above; sgs_text_colour_decl() detects a gradient function on
// its own and swaps in the background-clip:text declaration set, so a flat
// slug still resolves via sgs_colour_value().
$close_colour_hover_effective = sgs_resolve_text_colour_or_gradient( $close_colour_hover_slug, $close_colour_hover_gradient );
if ( '' !== $close_colour_hover_effective ) {
	$close_colour_hover_decl = sgs_text_colour_decl( $close_colour_hover_effective );
	if ( '' !== $close_colour_hover_decl ) {
		$css .= sgs_hover_state_rules( $close_sel, $close_colour_hover_decl, ':focus-visible' );
		$css .= sgs_text_colour_gradient_fallback_rule( $close_sel . ':hover,' . $close_sel . ':focus-visible', $close_colour_hover_effective );
	}
}

// ── Anchor geometry (desktop variants). Guard on "is either attribute
// actually set" so the zero-attribute default emits no geometry rule —
// style.css's base rule already IS the full-screen geometry, so emitting it
// again here for the untouched default would be a redundant duplicate rule.
// A non-modal drawer always emits: its full-screen default differs from style.css's base rule.
if ( $sgs_nd_anchor_is_set || $sgs_nd_panel_is_set || 'non-modal' === $modality ) {
	$sgs_nd_anchor_desktop = sgs_resolve_tier( $anchor_attr_raw, 'desktop', 'full-screen' )['value'];
	$sgs_nd_anchor_tablet  = sgs_resolve_tier( $anchor_attr_raw, 'tablet', 'full-screen' )['value'];
	$sgs_nd_anchor_mobile  = sgs_resolve_tier( $anchor_attr_raw, 'mobile', 'full-screen' )['value'];

	$sgs_nd_anchor_desktop = in_array( $sgs_nd_anchor_desktop, $sgs_nd_allowed_anchors, true ) ? $sgs_nd_anchor_desktop : 'full-screen';
	$sgs_nd_anchor_tablet  = in_array( $sgs_nd_anchor_tablet, $sgs_nd_allowed_anchors, true ) ? $sgs_nd_anchor_tablet : 'full-screen';
	$sgs_nd_anchor_mobile  = in_array( $sgs_nd_anchor_mobile, $sgs_nd_allowed_anchors, true ) ? $sgs_nd_anchor_mobile : 'full-screen';

	// panelSize is a free-text CSS length expression (calc()/clamp() are valid
	// operator input, e.g. 'calc(100% - 40px)') — the strict digits/dot/%/unit-
	// letters-only $sgs_nd_css_length sanitiser would mangle it:
	// 'calc(100% - 40px)' → 'calc10040px'. Use the
	// shared free-text CSS-value sanitiser instead (permits the math-function
	// character set while still stripping anything that could break out of the
	// declaration).
	$sgs_nd_panel_desktop = sgs_responsive_sanitise_css_value( (string) sgs_resolve_tier( $panel_size_attr_raw, 'desktop', '' )['value'] );
	$sgs_nd_panel_tablet  = sgs_responsive_sanitise_css_value( (string) sgs_resolve_tier( $panel_size_attr_raw, 'tablet', '' )['value'] );
	$sgs_nd_panel_mobile  = sgs_responsive_sanitise_css_value( (string) sgs_resolve_tier( $panel_size_attr_raw, 'mobile', '' )['value'] );

	$sgs_nd_geom_desktop = $sgs_nd_geometry_for_anchor( $sgs_nd_anchor_desktop, $sgs_nd_panel_desktop , $modality );
	$sgs_nd_geom_tablet  = $sgs_nd_geometry_for_anchor( $sgs_nd_anchor_tablet, $sgs_nd_panel_tablet , $modality );
	$sgs_nd_geom_mobile  = $sgs_nd_geometry_for_anchor( $sgs_nd_anchor_mobile, $sgs_nd_panel_mobile , $modality );

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

// ── Scrim: the see-through layer that dims the page behind the open drawer
// (Wave 3C U-2, family M-14). One shared helper paints it for every adopter —
// includes/helpers-scrim.php::sgs_scrim_render() — driven by the four scrim*
// attributes. Its `open` selector matches the <dialog> while it carries the
// native `open` attribute (both modal showModal() and non-modal show() set
// it), so one selector covers both modality branches. Emits '' (and queues no
// HTML) when every tier's opacity/blur resolves to invisible, so an untouched
// drawer paints only its default (black at 0.55, reproducing the previous
// hardcoded rgba(0,0,0,0.55) exactly).
// ── Entry and exit motion (Wave 3C U-5): the shape per tier, the open and
// close durations, the easing, the curtain colour and the item stagger, all as
// custom-property values the keyframes in style.css and the item rules in
// nav-drawer-menu/style.css read. includes/helpers-nav-drawer-motion.php.
$sgs_nd_motion = sgs_nav_drawer_motion( $attributes, $root_sel, $anchor_attr_raw, $sgs_nd_allowed_anchors );
$css          .= $sgs_nd_motion['css'];

// The scrim fades with the drawer unless scrimFadeDuration sets its own time.
$sgs_nd_scrim_fade = sgs_motion_ms( $attributes['scrimFadeDuration'] ?? 0, 0 );
$css              .= sgs_scrim_render(
	$attributes,
	$uid,
	array(
		'open'     => '.' . $uid . '[open]',
		'z_index'  => 'min(89, max(1, calc(var(--sgs-header-z, 100) - 2)))',
		'data'     => array( 'sgs-nav-scrim' => $drawer_ref ),
		'enter_ms' => $sgs_nd_scrim_fade > 0 ? $sgs_nd_scrim_fade : $sgs_nd_motion['enter_ms'],
		'exit_ms'  => $sgs_nd_scrim_fade > 0 ? $sgs_nd_scrim_fade : $sgs_nd_motion['exit_ms'],
		'easing'   => $sgs_nd_motion['easing'],
	)
);

// ── Surface (opacity + blur on the panel itself — separate from the scrim
// above; the drawer's OWN opaque/blur styling, not the page BEHIND it).
// Opaque + unblurred (the existing default) emits nothing extra so an
// untouched drawer is unaffected.
// Fill translucency, backdrop blur and saturate all go through the shared surface-ground
// helpers (includes/helpers-surface-ground.php): color-mix() keeps the resolved token as
// the SOURCE colour (a palette change still recolours the translucent panel), an unset
// value emits nothing, and 0 is a legal opacity or saturate value.
$sgs_nd_fill_css   = '' !== $drawer_bg_slug ? 'var(--wp--preset--color--' . $drawer_bg_slug . ')' : '';
$sgs_nd_fill_alpha = sgs_surface_fill_alpha( $sgs_nd_fill_css, $attributes['surfaceOpacity'] ?? null );
if ( '' !== $sgs_nd_fill_alpha ) {
	$css .= $root_sel . '{background-color:' . $sgs_nd_fill_alpha . ';}';
}

$sgs_nd_backdrop_decls = sgs_surface_backdrop_decls( $attributes['surfaceBlur'] ?? '', $attributes['surfaceSaturate'] ?? null );
if ( ! empty( $sgs_nd_backdrop_decls ) ) {
	$css .= $root_sel . '{' . implode( ';', $sgs_nd_backdrop_decls ) . ';}';
}

// The drawer's ONE box-shadow writer: the `shadow` attribute (a theme preset slug or a raw
// layer stack + `shadowColour`), composed by sgs_shadow_box_decls(), which also adds the
// forced-colours outline fallback (the same helper the mega panel uses). Empty means no
// shadow, so a drawer that never sets it renders nothing extra.
$sgs_nd_shadow_raw   = isset( $attributes['shadow'] ) && is_string( $attributes['shadow'] ) ? trim( $attributes['shadow'] ) : '';
$sgs_nd_shadow_decls = '' !== $sgs_nd_shadow_raw
	? sgs_shadow_box_decls( $sgs_nd_shadow_raw, isset( $attributes['shadowColour'] ) ? (string) $attributes['shadowColour'] : '' )
	: array();
if ( ! empty( $sgs_nd_shadow_decls ) ) {
	$css .= $root_sel . '{' . implode( ';', $sgs_nd_shadow_decls ) . ';}';
}

// ── Default edge (Bean, 2026-09-24). A drawer that paints ABOVE the header
// needs a visible edge where it meets the header row, or it melts into a
// header of the same colour: the trigger and centred cards, and a non-modal
// full-screen drawer (which starts under the burger row), default to the
// theme's `floating` shadow, the mega panel's default. The cards also default
// to the mega panel's 20px corners; a full-screen drawer stays square. A
// modal full-screen drawer covers everything and has no edge to show. A thin
// primary border marks the same edge (see the decls closure). Emitted
// per tier (anchor is a tier object) and BEFORE the operator's radius rule
// below, so an operator radius wins by source order; an operator shadow
// replaces the default shadow entirely.
$sgs_nd_edge_for = function ( $tier ) use ( $attributes, $sgs_nd_allowed_anchors, $modality ) {
	$raw    = is_array( $attributes['anchor'] ?? null ) ? $attributes['anchor'] : array();
	$anchor = sgs_resolve_tier( $raw, $tier, 'full-screen' )['value'];
	$anchor = in_array( $anchor, $sgs_nd_allowed_anchors, true ) ? $anchor : 'full-screen';
	$card   = in_array( $anchor, array( 'trigger', 'centred' ), true );
	return array(
		'shadow' => $card || ( 'full-screen' === $anchor && 'non-modal' === $modality ),
		'radius' => $card,
	);
};
$sgs_nd_default_shadow = '' === $sgs_nd_shadow_raw ? sgs_shadow_box_decls( 'floating', '' ) : array();
$sgs_nd_edge_decls     = function ( $edge ) use ( $sgs_nd_default_shadow, $sgs_nd_shadow_raw ) {
	$decls = array();
	if ( '' === $sgs_nd_shadow_raw ) {
		$decls = $edge['shadow'] && ! empty( $sgs_nd_default_shadow ) ? $sgs_nd_default_shadow : array( 'box-shadow:none' );
	}
	$decls[] = 'border-radius:' . ( $edge['radius'] ? '20px' : '0' );
	// A 1px primary line where the drawer meets the header (Bean: the shadow
	// alone left the top edge blending into a header of the same colour):
	// all round a card, along the top only of a full-screen drawer. The
	// operator's borderWidth/borderColour rules below win by source order.
	$line = '1px solid var(--wp--preset--color--primary)';
	if ( $edge['radius'] ) {
		$decls[] = 'border:' . $line;
	} elseif ( $edge['shadow'] ) {
		$decls[] = 'border:0';
		$decls[] = 'border-top:' . $line;
	} else {
		$decls[] = 'border:0';
	}
	$decls[] = 'box-sizing:border-box';
	return implode( ';', $decls ) . ';';
};
$sgs_nd_edge_prev = null;
foreach ( array(
	'desktop' => null,
	'tablet'  => SGS_Breakpoints::TABLET_MAX,
	'mobile'  => SGS_Breakpoints::MOBILE_MAX,
) as $sgs_nd_edge_tier => $sgs_nd_edge_bp ) {
	$sgs_nd_edge = $sgs_nd_edge_for( $sgs_nd_edge_tier );
	// Tier-diff: skip a tier identical to the one above; the desktop tier
	// emits only when it has an edge (the base rule has none).
	if ( $sgs_nd_edge === $sgs_nd_edge_prev || ( null === $sgs_nd_edge_prev && ! $sgs_nd_edge['shadow'] && ! $sgs_nd_edge['radius'] ) ) {
		$sgs_nd_edge_prev = $sgs_nd_edge;
		continue;
	}
	$sgs_nd_edge_rule = $root_sel . '{' . $sgs_nd_edge_decls( $sgs_nd_edge ) . '}';
	$css             .= null === $sgs_nd_edge_bp ? $sgs_nd_edge_rule : '@media (max-width:' . $sgs_nd_edge_bp . 'px){' . $sgs_nd_edge_rule . '}';
	$sgs_nd_edge_prev = $sgs_nd_edge;
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
// 'Style set, no width' means no border by default — never fall through
// to the browser's initial medium (~3px) border-width. Gated together via
// the shared helper (helpers-box.php) so this rule is applied identically
// everywhere, not per block.
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
	// A style with no width means no border -- never fall through to the
	// browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt  = '' !== $border_width_top ? $border_width_top : '0';
		$bwr  = '' !== $border_width_right ? $border_width_right : '0';
		$bwb  = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl  = '' !== $border_width_left ? $border_width_left : '0';
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
		// the browser drops.
		$css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$css .= $root_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is not native -- Shape B
// covers all four legs). Same wp_style_engine_get_styles() route as
// sgs/media + sgs/before-after's borderRadiusTablet/Mobile tiers; base
// goes through the identical call. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$radius_tiers      = sgs_border_radius_tiers( $attributes );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
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
// survive the body-reparent). supports.anchor is false (block.json) so no
// competing anchor id is emitted. The uid is added as a CLASS for the scoped CSS.

// ── Close-button style (closeStyle). `separate-x` (default) renders the
// × icon. `text-swap`
// replaces the icon with a "Close" text label (3/8 reference sites use a
// text-only close, no icon at all). `burger-morph` renders a 2-bar icon drawn
// to already read as an X — this button's OWN close affordance, rendered here.
//
// It does NOT animate the header burger, and the reason is scope, not wiring:
// the wiring for that already exists and needs nothing new. The header burger
// stays LIVE in the header row while the drawer is open (see the module
// docstring of src/shared/nav-interactivity/store.js — it is BOTH burger and
// ×), and `nav-bar-menu/render.php::$toggle_html` already emits
// `data-wp-bind--aria-expanded="state.isOpen"` on `.sgs-nav-bar-menu__burger`,
// so the open state is a live DOM attribute on that element throughout. A true
// burger→× morph is therefore a pure CSS rule keyed on
// `.sgs-nav-bar-menu__burger[aria-expanded="true"]` in sgs/nav-bar-menu's own
// stylesheet (the burger is bar-exclusive by construction) — no Interactivity-store change, no cross-block message
// passing. Whether sgs/nav-bar-menu should ship that rule is a styling
// decision on THAT block; nothing in this file depends on the answer.
//
// The × button itself remains fixed, undeletable chrome in EVERY style (FR-36-6).
// Spec 41 FR-41-12: `icon-and-text` is the FOURTH value.
// ⛔ THIS LIST AND block.json::attributes.closeStyle.enum MUST AGREE, ALWAYS.
// A value one side accepts and the other rejects coerces the stored value away
// with NO error on either side, so the operator's choice vanishes silently.
// Wave 3C U-9/U-11 (.claude/reports/2026-09-24-u9-u11-design.md §4.1): closeStyle
// is now a TIER OBJECT (desktop concrete, tablet inherits desktop, mobile
// inherits tablet, fallback separate-x) carrying a FIFTH value, `trigger`
// ("the menu button closes it" — §4.2's revised FR-36-6 predicate). A stored
// FLAT string (pre-migration content) is defended against here too —
// migrate-stored-tier-scalars.py is the real fix for STORED post_content, but
// a render.php that only trusted the migration would break on any
// not-yet-migrated post between deploy and migration running.
$sgs_nd_allowed_close_styles = array( 'separate-x', 'text-swap', 'burger-morph', 'icon-and-text', 'trigger' );
$sgs_nd_close_style_raw      = $attributes['closeStyle'] ?? array();
if ( is_string( $sgs_nd_close_style_raw ) ) {
	$sgs_nd_close_style_raw = '' !== $sgs_nd_close_style_raw ? array( 'desktop' => $sgs_nd_close_style_raw ) : array();
}
if ( ! is_array( $sgs_nd_close_style_raw ) ) {
	$sgs_nd_close_style_raw = array();
}

$sgs_nd_valid_close_style = function ( $value ) use ( $sgs_nd_allowed_close_styles ) {
	return in_array( $value, $sgs_nd_allowed_close_styles, true ) ? (string) $value : 'separate-x';
};

$sgs_nd_close_style_desktop = $sgs_nd_valid_close_style( sgs_resolve_tier( $sgs_nd_close_style_raw, 'desktop', 'separate-x' )['value'] );
$sgs_nd_close_style_tablet  = $sgs_nd_valid_close_style( sgs_resolve_tier( $sgs_nd_close_style_raw, 'tablet', 'separate-x' )['value'] );
$sgs_nd_close_style_mobile  = $sgs_nd_valid_close_style( sgs_resolve_tier( $sgs_nd_close_style_raw, 'mobile', 'separate-x' )['value'] );

// The DESKTOP tier drives everything that is not itself tiered below (the
// modifier class, the accessible-name resolution, the icon-picker source) —
// mirrors the anchor's own desktop-only animation resolution above.
$sgs_nd_close_style = $sgs_nd_close_style_desktop;

// `trigger` renders IDENTICALLY to `separate-x` (the × glyph) whenever it
// actually renders — §4.2: "Where the × must render under `trigger` (not
// eligible, or not live), it shows the `separate-x` glyph." The predicate
// below decides WHETHER it renders at all; this decides what it looks like
// when it does.
$sgs_nd_render_style_for     = function ( $style ) {
	return 'trigger' === $style ? 'separate-x' : $style;
};
$sgs_nd_render_style_desktop = $sgs_nd_render_style_for( $sgs_nd_close_style_desktop );
$sgs_nd_render_style_tablet  = $sgs_nd_render_style_for( $sgs_nd_close_style_tablet );
$sgs_nd_render_style_mobile  = $sgs_nd_render_style_for( $sgs_nd_close_style_mobile );

// Any tier showing a WORD (text-swap/icon-and-text) — drives the aria-label
// resolution below across ALL THREE tiers, not just desktop (§4.1 "Accessible
// name" rule).
$sgs_nd_close_any_text_bearing = in_array( 'text-swap', array( $sgs_nd_close_style_desktop, $sgs_nd_close_style_tablet, $sgs_nd_close_style_mobile ), true )
	|| in_array( 'icon-and-text', array( $sgs_nd_close_style_desktop, $sgs_nd_close_style_tablet, $sgs_nd_close_style_mobile ), true );

// ── Surface tone: the drawer's children (menu items, a CTA button) can carry
// shadows, so the drawer marks its own tone from its one fill layer, drawerBg at
// surfaceOpacity (unset means opaque), through sgs_surface_tone_class(), the
// resolver SGS_Container_Wrapper uses.
$sgs_nd_tone_opacity = isset( $attributes['surfaceOpacity'] ) && is_numeric( $attributes['surfaceOpacity'] )
	? (float) $attributes['surfaceOpacity']
	: 1.0;
$sgs_nd_tone_class   = function_exists( 'sgs_surface_tone_class' )
	? sgs_surface_tone_class(
		array(
			array(
				'colour'  => $sgs_nd_fill_css,
				'opacity' => $sgs_nd_tone_opacity,
			),
		)
	)
	: '';

// ── Close-button SIZE (closeSize, mirrors sgs/nav-bar-menu's burgerSize mechanism —
// nav-menu-trigger-css.php::sgs_nav_bar_menu_trigger_css()'s own size block).
// Default '44px' matches style.css's base `.sgs-nav-drawer__close` rule, which
// carries min-width/min-height:44px with no explicit width/height, so an
// untouched drawer renders the same size whether this fires or not.
//
// Text-bearing styles (text-swap/icon-and-text) keep width:auto — style.css's
// own `--close-text-swap`/`--close-icon-and-text` rules already set
// `width:auto;min-width:44px;padding:0 12px` so the button can grow to fit the
// word; forcing a fixed `width` here would re-clip it back to a square,
// exactly the bug burgerSize's own triggerMode branch (nav-menu-trigger-css.php)
// avoids for the identical reason on the open side.
$sgs_nd_close_size = sgs_css_length_value( $attributes['closeSize'] ?? '44px' );
if ( '' !== $sgs_nd_close_size ) {
	$sgs_nd_close_text_bearing = in_array( $sgs_nd_close_style, array( 'text-swap', 'icon-and-text' ), true );
	$css                      .= $close_sel . '{'
		. ( $sgs_nd_close_text_bearing ? 'width:auto;' : 'width:' . $sgs_nd_close_size . ';' )
		. 'height:' . $sgs_nd_close_size . ';min-width:' . $sgs_nd_close_size . ';min-height:' . $sgs_nd_close_size . ';}';

	// ── §4.1 "Per-tier sizing, not only per-tier spans": tablet/mobile get
	// their OWN width/padding, keyed to THEIR OWN resolved style, so a desktop
	// text-swap never leaks width:auto onto a mobile icon button. Emitted at
	// HIGHER specificity than style.css's unconditional `.sgs-nav-drawer--close-*`
	// modifier rules (this selector already carries the uid class + the block
	// class + the element class, three simple selectors vs. their two), so it
	// wins regardless of source order.
	$sgs_nd_size_prev_bearing = $sgs_nd_close_text_bearing;
	foreach ( array(
		'tablet' => array( $sgs_nd_close_style_tablet, SGS_Breakpoints::TABLET_MAX ),
		'mobile' => array( $sgs_nd_close_style_mobile, SGS_Breakpoints::MOBILE_MAX ),
	) as $sgs_nd_close_size_tier ) {
		list( $sgs_nd_size_tier_style, $sgs_nd_size_tier_bp ) = $sgs_nd_close_size_tier;
		$sgs_nd_size_tier_text_bearing                        = in_array( $sgs_nd_size_tier_style, array( 'text-swap', 'icon-and-text' ), true );
		// Tier-diff: skip a tier whose text-bearing-ness (the only thing this
		// rule varies on) is identical to the tier above — one style
		// everywhere emits no redundant per-tier override at all.
		if ( $sgs_nd_size_tier_text_bearing === $sgs_nd_size_prev_bearing ) {
			$sgs_nd_size_prev_bearing = $sgs_nd_size_tier_text_bearing;
			continue;
		}
		$sgs_nd_size_tier_decls = ( $sgs_nd_size_tier_text_bearing ? 'width:auto;' : 'width:' . $sgs_nd_close_size . ';' )
			. 'height:' . $sgs_nd_close_size . ';min-width:' . $sgs_nd_close_size . ';min-height:' . $sgs_nd_close_size . ';'
			. ( $sgs_nd_size_tier_text_bearing ? 'padding:0 12px;' : 'padding:0;' );
		$css                     .= '@media (max-width:' . $sgs_nd_size_tier_bp . 'px){' . $close_sel . '{' . $sgs_nd_size_tier_decls . '}}';
		$sgs_nd_size_prev_bearing = $sgs_nd_size_tier_text_bearing;
	}
}

// ── FR-36-6 revised predicate (§4.2, Wave 3C U-9/U-11): the × is HIDDEN, per
// tier, only where modality is non-modal AND that tier's closeStyle is
// `trigger` AND the opener is currently LIVE (store.js sets/removes
// data-sgs-nav-opener-live on the dialog). Eligibility (modality + closeStyle)
// is decided here in PHP; liveness is decided at runtime in JS — see that
// file's isOpenerLive().
$sgs_nd_opener_live_close_sel = '.' . $uid . '[data-sgs-nav-opener-live] .sgs-nav-drawer__close';
foreach ( array(
	'desktop' => array( $sgs_nd_close_style_desktop, null ),
	'tablet'  => array( $sgs_nd_close_style_tablet, SGS_Breakpoints::TABLET_MAX ),
	'mobile'  => array( $sgs_nd_close_style_mobile, SGS_Breakpoints::MOBILE_MAX ),
) as $sgs_nd_predicate_tier ) {
	list( $sgs_nd_predicate_style, $sgs_nd_predicate_bp ) = $sgs_nd_predicate_tier;
	if ( 'non-modal' !== $modality || 'trigger' !== $sgs_nd_predicate_style ) {
		continue;
	}
	// The × hidden also hands its reserved top row back to the content
	// (style.css reads --sgs-nd-close-room for the body's padding-top), so no
	// empty band is left where the × would have been (Bean, 2026-09-24).
	$sgs_nd_predicate_rule = $sgs_nd_opener_live_close_sel . '{display:none;}'
		. '.' . $uid . '[data-sgs-nav-opener-live]{--sgs-nd-close-room:clamp(16px, 6vw, 32px);}';
	$css                  .= null === $sgs_nd_predicate_bp
		? $sgs_nd_predicate_rule
		: '@media (max-width:' . $sgs_nd_predicate_bp . 'px){' . $sgs_nd_predicate_rule . '}';
}

// ── closePlacement (§4.3) — top-row-end (default) | top-row-start | same-slot.
// `same-slot` requires `modal` (under non-modal the header paints above the
// drawer, so a × under the burger would be unreachable by pointer) — PHP
// resolves it to `top-row-end` when modality is non-modal.
$sgs_nd_allowed_placements = array( 'top-row-end', 'top-row-start', 'same-slot' );
$sgs_nd_placement_raw      = is_array( $attributes['closePlacement'] ?? null ) ? $attributes['closePlacement'] : array();
$sgs_nd_valid_placement    = function ( $value ) use ( $sgs_nd_allowed_placements ) {
	return in_array( $value, $sgs_nd_allowed_placements, true ) ? (string) $value : 'top-row-end';
};
$sgs_nd_resolve_placement  = function ( $tier ) use ( $sgs_nd_placement_raw, $sgs_nd_valid_placement, $modality ) {
	$resolved = $sgs_nd_valid_placement( sgs_resolve_tier( $sgs_nd_placement_raw, $tier, 'top-row-end' )['value'] );
	return ( 'same-slot' === $resolved && 'non-modal' === $modality ) ? 'top-row-end' : $resolved;
};
$sgs_nd_placement_desktop  = $sgs_nd_resolve_placement( 'desktop' );
$sgs_nd_placement_tablet   = $sgs_nd_resolve_placement( 'tablet' );
$sgs_nd_placement_mobile   = $sgs_nd_resolve_placement( 'mobile' );
// Spec 35 audit SHOULD 1 (2026-09-24) — whether ANY tier resolves to
// `same-slot`, over-inclusive on purpose (a tablet/mobile-only same-slot
// pick must still arm the flag) so store.js's own same-slot measurement runs
// ONLY for a drawer that genuinely uses it, never on every drawer regardless
// of placement.
$sgs_nd_any_same_slot = in_array(
	'same-slot',
	array( $sgs_nd_placement_desktop, $sgs_nd_placement_tablet, $sgs_nd_placement_mobile ),
	true
);

// closeOffset (§4.3) — {x,y} px, -40..40. x is on the INLINE axis (mirrors RTL).
$sgs_nd_offset_raw     = is_array( $attributes['closeOffset'] ?? null ) ? $attributes['closeOffset'] : array();
$sgs_nd_clamp_offset   = function ( $raw ) {
	if ( ! is_numeric( $raw ) ) {
		return 0.0;
	}
	return max( -40.0, min( 40.0, (float) $raw ) );
};
$sgs_nd_resolve_offset = function ( $tier ) use ( $sgs_nd_offset_raw, $sgs_nd_clamp_offset ) {
	$resolved = sgs_resolve_tier( $sgs_nd_offset_raw, $tier, array() )['value'];
	$resolved = is_array( $resolved ) ? $resolved : array();
	return array(
		'x' => $sgs_nd_clamp_offset( $resolved['x'] ?? 0 ),
		'y' => $sgs_nd_clamp_offset( $resolved['y'] ?? 0 ),
	);
};
$sgs_nd_offset_desktop = $sgs_nd_resolve_offset( 'desktop' );
$sgs_nd_offset_tablet  = $sgs_nd_resolve_offset( 'tablet' );
$sgs_nd_offset_mobile  = $sgs_nd_resolve_offset( 'mobile' );

// Spec 35 audit SHOULD 2 (2026-09-24) — ONE source for the 12px top/inline
// edge inset AND the same-slot fallback centre, instead of twinning the
// literal in two places. The fallback centre is derived from the RESOLVED
// close size ($sgs_nd_close_size, §4.1 above) rather than a hardcoded 34px
// (12 + half of the OLD hardcoded 44px default) — a client who resizes the
// close button no longer gets a stale fallback centre the moment store.js's
// live measurement is unavailable (first paint, JS disabled).
$sgs_nd_close_edge_inset = 12;
$sgs_nd_close_size_px    = 44.0;
if ( preg_match( '/-?\d*\.?\d+/', (string) $sgs_nd_close_size, $sgs_nd_close_size_match ) ) {
	$sgs_nd_close_size_px = (float) $sgs_nd_close_size_match[0];
}
$sgs_nd_same_slot_fallback_centre = $sgs_nd_close_edge_inset + ( $sgs_nd_close_size_px / 2 );

/**
 * Build placement + offset CSS declarations for one resolved tier.
 *
 * @param string $placement Resolved closePlacement value.
 * @param array  $offset    Resolved {x,y} in px.
 * @return string CSS declarations (no selector/braces).
 */
$sgs_nd_placement_decls_for = function ( $placement, $offset ) use ( $sgs_nd_close_edge_inset, $sgs_nd_same_slot_fallback_centre ) {
	$x = $offset['x'];
	$y = $offset['y'];
	if ( 'same-slot' === $placement ) {
		// store.js measures the opener's centre relative to the dialog's rest
		// box and writes --sgs-nav-close-x/-y; var() falls back to the
		// top-row-end position when JS has not measured yet. The variables are a CENTRE
		// (the translate(-50%) below), so the fallback centre is the edge inset plus
		// half the RESOLVED close size; a bare edge inset would hang the × off the panel.
		return 'top:var(--sgs-nav-close-y, ' . $sgs_nd_same_slot_fallback_centre . 'px);left:var(--sgs-nav-close-x, calc(100% - ' . $sgs_nd_same_slot_fallback_centre . 'px));right:auto;inset-inline-end:auto;'
			. 'transform:translate(calc(-50% + ' . $x . 'px),calc(-50% + ' . $y . 'px));';
	}
	if ( 'top-row-start' === $placement ) {
		return 'inset-inline-end:auto;inset-inline-start:' . $sgs_nd_close_edge_inset . 'px;top:' . $sgs_nd_close_edge_inset . 'px;'
			. 'transform:translate(' . $x . 'px,' . $y . 'px);';
	}
	// top-row-end (default).
	return 'transform:translate(' . $x . 'px,' . $y . 'px);';
};

$sgs_nd_placement_default = ( 'top-row-end' === $sgs_nd_placement_desktop && 0.0 === $sgs_nd_offset_desktop['x'] && 0.0 === $sgs_nd_offset_desktop['y'] );
if ( ! $sgs_nd_placement_default ) {
	$css .= $close_sel . '{' . $sgs_nd_placement_decls_for( $sgs_nd_placement_desktop, $sgs_nd_offset_desktop ) . '}';
}
if ( $sgs_nd_placement_tablet !== $sgs_nd_placement_desktop || $sgs_nd_offset_tablet !== $sgs_nd_offset_desktop ) {
	$css .= '@media (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px){' . $close_sel . '{' . $sgs_nd_placement_decls_for( $sgs_nd_placement_tablet, $sgs_nd_offset_tablet ) . '}}';
}
if ( $sgs_nd_placement_mobile !== $sgs_nd_placement_tablet || $sgs_nd_offset_mobile !== $sgs_nd_offset_tablet ) {
	$css .= '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){' . $close_sel . '{' . $sgs_nd_placement_decls_for( $sgs_nd_placement_mobile, $sgs_nd_offset_mobile ) . '}}';
}

// closeRadius (§4.10, Bean 2026-09-24) — tier object of CSS lengths, default
// {} = today's hardcoded 4px (style.css's own `.sgs-nav-drawer__close` base
// rule), emitted only when the operator actually sets a tier.
if ( function_exists( 'sgs_emit_responsive_css' ) && is_array( $attributes['closeRadius'] ?? null ) && ! empty( $attributes['closeRadius'] ) ) {
	$css .= sgs_emit_responsive_css(
		$close_sel,
		array(
			array(
				'value'        => $attributes['closeRadius'],
				'css'          => 'border-radius',
				'unit_default' => 'px',
			),
		)
	);
}

// ── Close-button LABEL typography (closeFontSize/closeFontFamily/closeFontWeight/
// closeTextTransform/closeLetterSpacing — mirrors sgs/nav-bar-menu's burgerFontSize
// family, same sgs_typography_css_rule() helper). Scoped to
// the LABEL SPAN (.sgs-nav-drawer__close-text), never the button itself, so a
// future icon-and-text glyph resize never rides on these attrs (matches
// nav-menu-trigger-css.php's own $burger_text_sel scoping rationale). The span
// only exists in the DOM under text-swap/icon-and-text closeStyle (render.php's
// $sgs_nd_close_inner branch below), so this is a no-op on every other style.
// closeTextTransform is resolved, not read raw: style.css's hardcoded
// value differs by closeStyle (text-swap: uppercase; icon-and-text:
// none — never declared there), so the untouched default must reproduce BOTH
// values exactly rather than pick one. A non-empty operator value overrides
// uniformly for either style, matching every other resolved-value pattern in
// this codebase (e.g. nav-menu-trigger-css.php's $treatments array).
if ( in_array( $sgs_nd_close_style, array( 'text-swap', 'icon-and-text' ), true ) ) {
	$sgs_nd_close_text_sel         = $root_sel . ' .sgs-nav-drawer__close-text';
	$sgs_nd_close_typography_attrs = $attributes;
	if ( empty( $attributes['closeTextTransform'] ) ) {
		$sgs_nd_close_typography_attrs['closeTextTransform'] = ( 'text-swap' === $sgs_nd_close_style ) ? 'uppercase' : '';
	}
	$css .= sgs_typography_css_rule( $sgs_nd_close_typography_attrs, 'close', $sgs_nd_close_text_sel );
}

$classes = array(
	'sgs-nav-drawer',
	$uid,
	'sgs-nav-drawer--submenu-' . $submenu_model,
	// Keyed to the DESKTOP render style (alias-resolved so `trigger` reuses
	// `separate-x`'s CSS) — style.css's existing `.sgs-nav-drawer--close-*`
	// rules are unconditional (not tier-scoped), so this is the "no-JS /
	// print / first paint" shape; the per-tier width/padding overrides above
	// and the variant spans below are what actually differ per device.
	'sgs-nav-drawer--close-' . $sgs_nd_render_style_desktop,
);

foreach ( $sgs_nd_motion['classes'] as $sgs_nd_motion_class ) {
	$classes[] = $sgs_nd_motion_class;
}

if ( '' !== $sgs_nd_tone_class ) {
	$classes[] = $sgs_nd_tone_class;
}

// ── Modality + closeOnScrollDistance were resolved earlier (Wave 3C U-9/U-11,
// moved up for the FR-36-6 close predicate) — reused here as data attributes
// so store.js has them before it opens the dialog.

$wrapper_args = array(
	'class'                 => implode( ' ', $classes ),
	'id'                    => $drawer_ref,
	'data-sgs-nav-drawer'   => '',
	'data-sgs-nav-modality' => $modality,
	// The dialog's accessible name. Operator-settable because this block supports
	// MULTIPLE drawers on one site (that is what the Drawer ID exists for), and two
	// dialogs both announced as "Navigation menu" cannot be told apart by a screen
	// reader. Falls back to the generic name when unset.
	'aria-label'            => '' !== ( $attributes['ariaLabel'] ?? '' )
		? esc_attr( $attributes['ariaLabel'] )
		: esc_attr__( 'Navigation menu', 'sgs-blocks' ),
);
foreach ( $sgs_nd_motion['data'] as $sgs_nd_data_name => $sgs_nd_data_value ) {
	$wrapper_args[ 'data-' . $sgs_nd_data_name ] = $sgs_nd_data_value;
}
if ( $sgs_nd_scroll_distance > 0 ) {
	// §4.6 — store.js reads this to know the threshold and whether to skip
	// lockScroll() at all (a locked page can never scroll, so the carve-out
	// would never fire); absent/0 means "off", the existing lock behaviour.
	$wrapper_args['data-sgs-nav-scroll-distance'] = (string) $sgs_nd_scroll_distance;
}
if ( $sgs_nd_any_same_slot ) {
	// Spec 35 audit SHOULD 1 (2026-09-24) — store.js's `updateSameSlotVars()`
	// gates its opener-measurement + `--sgs-nav-close-x/-y` writes on this
	// attribute, so a drawer that never uses `same-slot` on any tier never
	// carries an inline `style` while open.
	$wrapper_args['data-sgs-nav-close-placement'] = 'same-slot';
}
if ( $bg_image_needs_note ) {
	$wrapper_args['aria-describedby'] = $drawer_ref . '-bg-note';
}
$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

// ── The × close button — FIXED CHROME (FR-36-6). Rendered as a SIBLING of
// $content, OUTSIDE the editable InnerBlocks, so it is undeletable by
// construction. data-sgs-nav-close is wired imperatively by the store on open.
// 44px target + accessible name + visible focus (style.css). It is DOM-first so
// the store's focus-into lands on a reliable close affordance.
// ⚠ The operator's word, trimmed. An empty value is NOT an empty label -- see
// the aria-label note below, which is the whole reason this is resolved first.
$sgs_nd_close_label = trim( (string) ( $attributes['closeLabel'] ?? '' ) );

// ⛔ Resolved through the SAME source-aware resolver sgs/icon and sgs/nav-bar-menu's
// trigger both use -- never a bespoke lookup, and never a second hand-parsed call
// to sgs_get_lucide_icon(). The declared default { lucide, x } renders the
// Lucide 'x' icon.
$sgs_nd_close_icon = sgs_nav_shared_icon_markup(
	$attributes['closeIcon'] ?? null,
	array(
		'source' => 'lucide',
		'name'   => 'x',
	)
);

$sgs_nd_close_text = sprintf(
	'<span class="sgs-nav-drawer__close-text">%s</span>',
	'' !== $sgs_nd_close_label
		? esc_html( $sgs_nd_close_label )
		: esc_html__( 'Close', 'sgs-blocks' )
);

/**
 * The button's inner markup for ONE resolved render style.
 *
 * @param string $style A RENDER style (never 'trigger' — already alias-resolved).
 * @return string Trusted inner HTML.
 */
$sgs_nd_build_close_inner = function ( $style ) use ( $sgs_nd_close_text, $sgs_nd_close_icon ) {
	if ( 'text-swap' === $style ) {
		return $sgs_nd_close_text;
	}
	if ( 'burger-morph' === $style ) {
		return '<span class="sgs-nav-drawer__close-bars" aria-hidden="true"><span></span><span></span></span>';
	}
	if ( 'icon-and-text' === $style ) {
		// Icon first, then the word -- matching the open side. The glyph is
		// aria-hidden because the word beside it already carries the accessible name;
		// announcing both would read the button twice.
		return sprintf(
			'<span class="sgs-nav-drawer__close-glyph" aria-hidden="true">%s</span>%s',
			$sgs_nd_close_icon,
			$sgs_nd_close_text
		);
	}
	return $sgs_nd_close_icon; // 'separate-x' (and 'trigger''s alias, §4.2) — trusted resolver markup.
};

// ── Wave 3C U-9/U-11 — per-tier variant markup (§4.1). One style everywhere
// (the overwhelming common case) renders EXACTLY today's single-markup shape:
// no variant wrapper spans, no extra CSS. Only when tiers genuinely diverge
// does the button carry one `.sgs-nav-drawer__close-variant--{style}` span per
// DISTINCT render style, with scoped CSS (below) showing only each tier's own.
$sgs_nd_distinct_render_styles = array_values(
	array_unique(
		array(
			$sgs_nd_render_style_desktop,
			$sgs_nd_render_style_tablet,
			$sgs_nd_render_style_mobile,
		)
	)
);

if ( 1 === count( $sgs_nd_distinct_render_styles ) ) {
	$sgs_nd_close_inner = $sgs_nd_build_close_inner( $sgs_nd_render_style_desktop );
} else {
	$sgs_nd_close_inner = '';
	foreach ( $sgs_nd_distinct_render_styles as $sgs_nd_variant_style ) {
		$sgs_nd_close_inner .= sprintf(
			'<span class="sgs-nav-drawer__close-variant sgs-nav-drawer__close-variant--%1$s">%2$s</span>',
			esc_attr( $sgs_nd_variant_style ),
			$sgs_nd_build_close_inner( $sgs_nd_variant_style ) // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from esc_html()'d text / trusted resolver markup above.
		);
	}
	// Hide every variant, then show only each tier's own — base rule keyed to
	// the DESKTOP style (no media query, so it also covers no-JS/print), tablet
	// and mobile rules only when their style genuinely differs (tier-diff, no
	// redundant rule).
	$css .= $close_sel . ' .sgs-nav-drawer__close-variant{display:none;}';
	$css .= $close_sel . ' .sgs-nav-drawer__close-variant--' . $sgs_nd_render_style_desktop . '{display:inline-flex;align-items:center;}';
	if ( $sgs_nd_render_style_tablet !== $sgs_nd_render_style_desktop ) {
		$css .= '@media (max-width:' . SGS_Breakpoints::TABLET_MAX . 'px){'
			. $close_sel . ' .sgs-nav-drawer__close-variant{display:none;}'
			. $close_sel . ' .sgs-nav-drawer__close-variant--' . $sgs_nd_render_style_tablet . '{display:inline-flex;align-items:center;}}';
	}
	if ( $sgs_nd_render_style_mobile !== $sgs_nd_render_style_tablet ) {
		$css .= '@media (max-width:' . SGS_Breakpoints::MOBILE_MAX . 'px){'
			. $close_sel . ' .sgs-nav-drawer__close-variant{display:none;}'
			. $close_sel . ' .sgs-nav-drawer__close-variant--' . $sgs_nd_render_style_mobile . '{display:inline-flex;align-items:center;}}';
	}
}

/*
 * The accessible name. Under `text-swap` and `icon-and-text` the VISIBLE word IS
 * the accessible name, so an aria-label saying something else breaks WCAG SC 2.5.3
 * Label in Name -- a voice-control user says what they can see and nothing happens.
 * The attribute is therefore built as a VARIABLE and interpolated, exactly as the
 * open side's $burger_aria_attr does. Checked across ALL THREE TIERS (§4.1) --
 * a text-bearing tier anywhere means the visible word must be the accessible name.
 *
 * ⛔ BUT WHEN THE OPERATOR'S LABEL IS EMPTY, THE HARDCODED aria-label SURVIVES.
 * Emitting aria-label="" is an EMPTY ACCESSIBLE NAME -- strictly worse than a
 * mismatch, and it passes any check that only asks whether the attribute exists.
 * This is asserted, not reasoned about: the two glyph-only styles and the
 * empty-label case all keep the generic name.
 */
$sgs_nd_close_visible_word = $sgs_nd_close_any_text_bearing
	? $sgs_nd_close_label
	: '';
$sgs_nd_close_aria_attr    = '' !== $sgs_nd_close_visible_word
	? sprintf( ' aria-label="%s"', esc_attr( $sgs_nd_close_visible_word ) )
	: sprintf( ' aria-label="%s"', esc_attr__( 'Close menu', 'sgs-blocks' ) );

$close_html = sprintf(
	'<button type="button" class="sgs-nav-drawer__close" data-sgs-nav-close%s>%s</button>',
	$sgs_nd_close_aria_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_attr()/esc_attr__() applied when the segment was built.
	$sgs_nd_close_inner // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_html() applied above (text paths) or trusted static markup (burger-morph spans / resolver SVG / variant wrapper spans built from the same).
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

// ── The scrim itself is now queued by sgs_scrim_render() above (printed at
// wp_footer as a direct child of <body> — includes/helpers-scrim.php) and no
// longer rendered as a sibling <div> here.
//
// ── Emit the scoped <style> then the dialog. wp_strip_all_tags (NOT
// esc_html) blocks a </style> breakout while leaving CSS combinators intact;
// every value reaching $css is pre-sanitised (sanitize_html_class slugs /
// $sgs_nd_css_* sanitisers / esc_attr / wp_style_engine_get_styles), so no
// un-sanitised value survives here.
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
 * ── ONE DRAWER PER REQUEST. ──────────────────────────────────────────────────
 *
 * Record that a drawer has painted on this request, so the Active-drawer render
 * path (Sgs_Drawer_Render, on wp_footer) does NOT add a second `<dialog
 * id="sgs-nav-drawer">`. A `sgs/nav-drawer` placed directly in content renders
 * through this ordinary block path, outside the Active-Layout machinery, and
 * this block's `drawerRef` default is the same string the Active drawer uses —
 * without the flag a page carrying BOTH would ship two dialogs with one id: a
 * duplicate id, a second modal the store can resolve by accident, and no error
 * anywhere.
 *
 * Same flag as class-sgs-header-rules.php's rules/default path, which records it
 * so a second header slot hits the one-header guard. `render_active()` sets it
 * inline on its own success path; this is the other path that needs to.
 *
 * Set AFTER the printf, not before: the flag means "a drawer was SERVED", which is
 * the distinction Sgs_Active_Layout draws between $render_attempted and
 * $render_served. Marking it before emitting would claim a drawer that might not
 * exist.
 *
 * Guarded on class_exists because a block's render.php can be exercised outside a
 * full plugin bootstrap (tests, the block-renderer REST route).
 */
if ( class_exists( '\\SGS\\Blocks\\Sgs_Active_Layout' ) ) {
	\SGS\Blocks\Sgs_Active_Layout::mark_served( \SGS\Blocks\Sgs_Active_Layout::AREA_DRAWER );
}
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
