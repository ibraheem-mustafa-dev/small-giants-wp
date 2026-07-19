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
 * NO-INLINE (Spec 32): the rendered subtree carries ZERO inline CSS property
 * declarations. drawerBg + WCAG-computed foreground, drawerAlign, drawerGap,
 * drawerPadding, close-button colour and the skip-serialised __experimentalBorder
 * support are all emitted into this block's OWN scoped `.{uid}` <style> at CLASS
 * specificity (never `#uid`, D303).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    InnerBlocks HTML (menu, logo, CTA).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/helpers-tokens.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-colour-wcag.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

// CSS-keyword sanitiser — letters + hyphen only (for free-text keyword attrs
// concatenated into raw CSS inside the scoped <style>). Mirrors sgs/hero.
$sgs_nd_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// CSS length/unit sanitiser — digits, dot, %, unit letters only.
$sgs_nd_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$anchor_val = isset( $block->parsed_block['attrs']['anchor'] ) ? (string) $block->parsed_block['attrs']['anchor'] : '';

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

// ── Geometry (Phase 1 = full-screen only; partial edges declared, not gate-tested).
$allowed_edges = array( 'full-screen', 'left', 'right', 'top' );
$edge          = in_array( $attributes['edge'] ?? 'full-screen', $allowed_edges, true )
	? (string) $attributes['edge']
	: 'full-screen';
$width         = $sgs_nd_css_length( $attributes['width'] ?? '' );

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

// ── Background (drawerBg, slug, default 'primary') + WCAG-computed foreground
// (D339): the background stays a theme-linked var() so a palette change recolours
// it; the foreground is computed from the LIVE resolved hex each render so the
// pairing is always ≥ 4.5:1 with zero config.
$drawer_bg_slug = isset( $attributes['drawerBg'] ) ? sanitize_html_class( $attributes['drawerBg'] ) : 'primary';
$drawer_bg_hex  = '' !== $drawer_bg_slug ? sgs_resolve_palette_hex( $drawer_bg_slug, '' ) : '';
$drawer_fg_hex  = ( '' !== $drawer_bg_hex ) ? sgs_wcag_text_colour_for_bg( $drawer_bg_hex ) : '';

// ── Close-icon colour (toggleCloseColour, slug). Empty = inherit the drawer's
// computed foreground (style.css sets the × to color:inherit).
$close_colour_slug = isset( $attributes['toggleCloseColour'] ) ? sanitize_html_class( $attributes['toggleCloseColour'] ) : '';

// ── Submenu model (wired but Phase-1-inert: the flat Phase-1 menu has no
// submenus, so accordion/drill-down is not exercised until Phase 2).
$submenu_model = in_array( $attributes['submenuModel'] ?? 'accordion', array( 'accordion', 'drill-down' ), true )
	? (string) $attributes['submenuModel']
	: 'accordion';

// ── Custom CSS escape hatch (non-device-breakpoint rules only, per contract).
$custom_css = isset( $attributes['sgsCustomCss'] ) ? (string) $attributes['sgsCustomCss'] : '';

// ────────────────────────────────────────────────────────────────────────────
// Build the block's OWN scoped CSS (no-inline contract; every value pre-sanitised).
// ────────────────────────────────────────────────────────────────────────────
$css = '';

// Background + WCAG foreground on the dialog root.
if ( '' !== $drawer_bg_slug ) {
	$decls = 'background-color:var(--wp--preset--color--' . $drawer_bg_slug . ');';
	if ( '' !== $drawer_fg_hex ) {
		$decls .= 'color:' . esc_attr( $drawer_fg_hex ) . ';';
	}
	$css .= $root_sel . '{' . $decls . '}';
}

// Content alignment on the drawer body.
$css .= $body_sel . '{align-items:' . $align_items_map[ $drawer_align ] . ';}';

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
if ( '' !== $close_colour_slug ) {
	$css .= $close_sel . '{color:' . sgs_colour_value( $close_colour_slug ) . ';}';
}

// Partial-width geometry (Phase 2+ — declared, not gate-tested this phase). A
// non-full-screen edge with an explicit width caps the panel; full-screen (the
// default) emits nothing extra (style.css handles the full-bleed geometry).
if ( 'full-screen' !== $edge && '' !== $width ) {
	if ( 'left' === $edge || 'right' === $edge ) {
		$css .= $root_sel . '{width:' . $width . ';max-width:100vw;}';
	} elseif ( 'top' === $edge ) {
		$css .= $root_sel . '{height:' . $width . ';max-height:100dvh;}';
	}
}

// ── Skip-serialised WP-native __experimentalBorder support → scoped rule
// (Spec 32 no-inline). block.json declares __experimentalBorder with
// __experimentalSkipSerialization:true, so get_block_wrapper_attributes() never
// auto-inlines it; read the resolved values from $attributes['style']['border']
// and emit them into this block's own scoped <style>.
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		// Sanitised via sgs_colour_value() (route-by-role, D301/D302): resolves a
		// preset slug to var(), passes a hex/rgba through. Defence-in-depth: strip
		// any structural CSS chars so no declaration/selector injection can ride in.
		$border_args['color'] = preg_replace( '/[;{}<>]/', '', sgs_colour_value( (string) $attributes['style']['border']['color'] ) );
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$border_args['style'] = $sgs_nd_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$border_args['width'] = $sgs_nd_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
			$border_args['radius'] = $sgs_nd_css_length( $radius_raw );
		} elseif ( is_array( $radius_raw ) ) {
			$radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
				if ( ! empty( $radius_raw[ $corner ] ) ) {
					$radius_clean[ $corner ] = $sgs_nd_css_length( $radius_raw[ $corner ] );
				}
			}
			if ( ! empty( $radius_clean ) ) {
				$border_args['radius'] = $radius_clean;
			}
		}
	}
	if ( ! empty( $border_args ) ) {
		$border_scoped = wp_style_engine_get_styles(
			array( 'border' => $border_args ),
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $border_scoped['css'] ) ) {
			$css .= $border_scoped['css'];
		}
	}
}

// Custom CSS escape hatch — appended verbatim (sanitised of a </style> breakout
// by wp_strip_all_tags below alongside the rest of $css).
if ( '' !== $custom_css ) {
	$css .= $custom_css;
}

// ── Build the dialog wrapper attributes. The <dialog> id IS the drawerRef (the
// store resolves the drawer by getElementById — the id + data-sgs-nav-drawer
// survive the D323 body-reparent). supports.anchor is false (block.json) so no
// competing anchor id is emitted. The uid is added as a CLASS for the scoped CSS.
$classes = array(
	'sgs-nav-drawer',
	$uid,
	'sgs-nav-drawer--edge-' . $edge,
	'sgs-nav-drawer--submenu-' . $submenu_model,
);

$wrapper_args       = array(
	'class'               => implode( ' ', $classes ),
	'id'                  => $drawer_ref,
	'data-sgs-nav-drawer' => '',
	'aria-label'          => esc_attr__( 'Navigation menu', 'sgs-blocks' ),
);
$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

// ── The × close button — FIXED CHROME (FR-36-6). Rendered as a SIBLING of
// $content, OUTSIDE the editable InnerBlocks, so it is undeletable by
// construction. data-sgs-nav-close is wired imperatively by the store on open.
// 44px target + accessible name + visible focus (style.css). It is DOM-first so
// the store's focus-into lands on a reliable close affordance.
$close_icon = sgs_get_lucide_icon( 'x' );
$close_html = sprintf(
	'<button type="button" class="sgs-nav-drawer__close" data-sgs-nav-close aria-label="%s">%s</button>',
	esc_attr__( 'Close menu', 'sgs-blocks' ),
	$close_icon // Trusted Lucide SVG markup.
);

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
	'<dialog %1$s>%2$s<div class="sgs-nav-drawer__body">%3$s</div></dialog>',
	$wrapper_attributes,
	$close_html,
	$content
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
