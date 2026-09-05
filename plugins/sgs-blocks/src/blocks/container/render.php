<?php
/**
 * Server-side render for the SGS Container block.
 *
 * Delegates all wrapper-assembly to SGS_Container_Wrapper::render() so the
 * sgs/container output is byte-identical to before while composite blocks can
 * share the same logic without re-implementing it.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/shape-dividers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// sgs_sanitize_grid_template() and sgs_container_gap_value() live in render-helpers.php.
// SGS_Container_Wrapper::render() handles the full wrapper + responsive-CSS assembly.
// $attributes passed VERBATIM to the wrapper — uid is md5(wp_json_encode($attributes).anchor);
// any mutation would change the uid → different scoped <style> selector → pixel drift.
// Reading $attributes below for the color/border/typography supports is READ-ONLY —
// the array handed to SGS_Container_Wrapper::render() further down is untouched.

// Semantic HTML tag (D344, 2026-07-16) — restored with a concrete purpose:
// ARIA landmarks (<main>/<nav>/<aside>/<header>/<footer>) + sectioning
// (<article>/<section>) for screen-reader landmark navigation (WCAG 2.2 1.3.1)
// and machine/SEO document structure. The wrapper already validated + rendered
// a 'tag' opt (class-sgs-container-wrapper.php) — this un-hardcodes the value so
// the block/converter can drive it. Default 'section' preserves prior output;
// the wrapper allowlist is the final guard against an out-of-range value.
$html_tag = isset( $attributes['tagName'] ) ? sanitize_key( $attributes['tagName'] ) : 'section';

// ---------------------------------------------------------------------------
// No-inline residual (Spec 32) — WP-native color/__experimentalBorder/typography
// supports. block.json declares __experimentalSkipSerialization on all three
// (mirrors the existing spacing pattern, D292) so WordPress never auto-inlines
// them via get_block_wrapper_attributes() — which is called INSIDE the shared
// SGS_Container_Wrapper (a shared file this block must not modify). Extract the
// values here, emit them as a scoped rule via the stable core style engine
// (same approach as sgs/label render.php), and hand the wrapper ONLY a class
// name via its existing 'extra_classes' opt — a public composite-integration
// hook the shared wrapper already supports, so this needs no shared-file edit.
// Skip-serialisation also suppresses WP's automatic has-*-color /
// has-*-background-color / has-*-gradient-background / has-*-font-size preset
// classes, so those are re-added manually below.
// ---------------------------------------------------------------------------

$sgs_container_style_group = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();

$sgs_container_supports_css     = '';
$sgs_container_supports_classes = array();

$sgs_container_style_engine_input = array();

if ( ! empty( $sgs_container_style_group['color'] ) && is_array( $sgs_container_style_group['color'] ) ) {
	$sgs_container_style_engine_input['color'] = $sgs_container_style_group['color'];
}

// SGS-OWNED base background colour (D294 pattern, mirrors sgs/site-header /
// sgs/site-header-row) — the OUTER-most paint layer, BELOW the media ::before
// (z-index:-1), the overlay span (z-index:0, backgroundOverlayColour/
// overlayGradient — a DIFFERENT, deliberately untouched attribute) and content
// (z-index:1). See class-sgs-container-wrapper.php's z-index doc (~L948-950).
// ⚠ EVERY value goes through sgs_colour_value() before the style engine:
// DesignTokenPicker stores a token SLUG ('surface') when linked:true, and the
// style engine does not resolve a bare slug — it would emit the invalid
// `background-color:surface` (proven live defect, D684, site-header-row).
// RESTING flat colour goes through the style engine as before. The GRADIENT
// sibling and the HOVER state cannot: the style engine has no state axis and
// would emit a gradient as a flat colour. Both are emitted below as a scoped
// `.uid{…}` / `.uid:hover,.uid:focus-visible{…}` pair via the shared
// sgs_emit_state_colour_css(), exactly as sgs/hero does (render.php:386-419).
//
// ⛔ WHY THE PAIR EXISTS AT ALL (2026-08-20): this row shipped earlier the same
// day with ONE state and NO gradient, and rule 31 correctly flagged it twice —
// a non-conformant colour row added while enforcing the colour standard. It is
// completed here rather than exempted. A row with a resting colour but no hover
// is not a smaller feature, it is an asymmetric one: the same STATE_WITHOUT_BASE
// shape in reverse.
if ( isset( $attributes['backgroundColour'] ) && '' !== $attributes['backgroundColour']
	&& empty( $attributes['backgroundColourGradient'] ) ) {
	$sgs_container_bg_value = sgs_colour_value( (string) $attributes['backgroundColour'] );
	if ( '' !== $sgs_container_bg_value ) {
		$sgs_container_style_engine_input['color']['background'] = $sgs_container_bg_value;
	}
}

// Border COLOUR/WIDTH/STYLE are block-private (R2c pattern, mirrors
// sgs/product-card render.php) — NOT read from $sgs_container_style_group any
// more. Only border-RADIUS stays on the native style.border path (a
// corner-shape control, not a colour/paint decision), resolved here exactly
// as sgs/product-card's own radius-only extraction (render.php ~L352-375).
if ( isset( $attributes['borderRadius'] ) ) {
	$sgs_container_radius_raw = $attributes['borderRadius'];
	if ( is_string( $sgs_container_radius_raw ) && '' !== $sgs_container_radius_raw ) {
		$sgs_container_style_engine_input['border']['radius'] = sgs_css_length_value( $sgs_container_radius_raw );
	} elseif ( is_array( $sgs_container_radius_raw ) ) {
		$sgs_container_radius_clean = array();
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $sgs_container_corner ) {
			if ( ! empty( $sgs_container_radius_raw[ $sgs_container_corner ] ) ) {
				$sgs_container_radius_clean[ $sgs_container_corner ] = sgs_css_length_value( $sgs_container_radius_raw[ $sgs_container_corner ] );
			}
		}
		if ( ! empty( $sgs_container_radius_clean ) ) {
			$sgs_container_style_engine_input['border']['radius'] = $sgs_container_radius_clean;
		}
	}
}
if ( ! empty( $sgs_container_style_engine_input ) ) {
	$sgs_container_supports_uid = 'sgs-cst-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
	$sgs_container_supports_sel = '.' . $sgs_container_supports_uid . '.wp-block-sgs-container';

	$sgs_container_engine_styles = wp_style_engine_get_styles(
		$sgs_container_style_engine_input,
		array( 'selector' => $sgs_container_supports_sel )
	);
	if ( ! empty( $sgs_container_engine_styles['css'] ) ) {
		$sgs_container_supports_css       = $sgs_container_engine_styles['css'];
		$sgs_container_supports_classes[] = $sgs_container_supports_uid;
	}
}

// Border-radius tablet/mobile tiers — block-private object attrs (2026-08-30
// radius target-shape correction), same uid/selector idiom as the border-width
// block below (mint the uid only if nothing above already needed one; APPEND
// to $sgs_container_supports_css, never overwrite it — the block above may
// already have written the base colour/radius/typography CSS into it).
$sgs_container_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$sgs_container_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();
$sgs_container_radius_tab_val    = sgs_corner_object_shorthand( $sgs_container_radius_tablet_obj );
$sgs_container_radius_mob_val    = sgs_corner_object_shorthand( $sgs_container_radius_mobile_obj );
if ( null !== $sgs_container_radius_tab_val || null !== $sgs_container_radius_mob_val ) {
	if ( empty( $sgs_container_supports_uid ) ) {
		$sgs_container_supports_uid       = 'sgs-cst-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
		$sgs_container_supports_classes[] = $sgs_container_supports_uid;
	}
	$sgs_container_radius_sel = '.' . $sgs_container_supports_uid . '.wp-block-sgs-container';

	$sgs_container_radius_tablet_decls = array();
	if ( null !== $sgs_container_radius_tab_val ) {
		$sgs_container_radius_tablet_decls[] = "border-radius:{$sgs_container_radius_tab_val}";
	}
	if ( $sgs_container_radius_tablet_decls ) {
		$sgs_container_supports_css .= '@media(max-width:1023px){' . $sgs_container_radius_sel . '{' . implode( ';', $sgs_container_radius_tablet_decls ) . ';}}';
	}

	$sgs_container_radius_mobile_decls = array();
	if ( null !== $sgs_container_radius_mob_val ) {
		$sgs_container_radius_mobile_decls[] = "border-radius:{$sgs_container_radius_mob_val}";
	}
	if ( $sgs_container_radius_mobile_decls ) {
		$sgs_container_supports_css .= '@media(max-width:767px){' . $sgs_container_radius_sel . '{' . implode( ';', $sgs_container_radius_mobile_decls ) . ';}}';
	}
}

// ── Background colour: GRADIENT sibling + HOVER state ────────────────────────
// The style engine above handles only a resting FLAT colour. It has no state
// axis and would emit a gradient as a flat colour, so both are emitted here as
// a scoped `.uid{…}` / `.uid:hover,.uid:focus-visible{…}` pair through the same
// shared helper sgs/hero uses (render.php:386-419) — one emitter, not a second
// mechanism. `sgs_background_paint_decl()` returns background-image for a
// gradient and background-color for a flat value, so a gradient wins over its
// flat sibling exactly as it does on hero and sgs/quote.
$sgs_container_resting_decls = array();
$sgs_container_hover_decls   = array();

$sgs_container_resting_bg = sgs_background_paint_decl(
	(string) ( $attributes['backgroundColour'] ?? '' ),
	(string) ( $attributes['backgroundColourGradient'] ?? '' )
);
// Only emit the resting declaration here when a GRADIENT is in play — the flat
// case already went through the style engine above, and emitting it twice would
// duplicate the declaration for no benefit.
if ( '' !== $sgs_container_resting_bg && ! empty( $attributes['backgroundColourGradient'] ) ) {
	$sgs_container_resting_decls[] = $sgs_container_resting_bg;
}

$sgs_container_hover_bg = sgs_background_paint_decl(
	(string) ( $attributes['backgroundColourHover'] ?? '' ),
	(string) ( $attributes['backgroundColourHoverGradient'] ?? '' )
);
if ( '' !== $sgs_container_hover_bg ) {
	$sgs_container_hover_decls[] = $sgs_container_hover_bg;
}

// Root TEXT colour (D702 shape, same emitter as sgs/hero render.php:390-412 —
// sgs_resolve_text_colour_or_gradient() picks the gradient over the flat value,
// sgs_text_colour_decl() turns it into the right declaration, including the
// background-clip:text form a gradient needs). One emitter, not a second
// mechanism.
//
// WHY A SECTION-KIND BLOCK OWNS A ROOT TEXT COLOUR (Bean-ruled 2026-08-21): a
// section-class block can be the parent of ANY non-section block that has no
// forced parent, so this is the INHERITABLE cascade default for whatever the
// client nests inside — not a duplicate of a child's own text control. The child
// overrides one instance; this sets the default for all of them.
//
// It REPLACES a dead binding: the wrapper manifest mapped css:color to
// `native:color.text` while `supports.color` is FALSE on this block, so that
// mapping pointed at a mechanism that does not exist and the container had no
// text-colour control at all. check-element-manifest-conformance already
// reported both text/css:color and text/css:color-gradient as GAPs here.
$sgs_container_resting_text = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColour'] ?? '' ),
	(string) ( $attributes['textColourGradient'] ?? '' )
);
if ( '' !== $sgs_container_resting_text ) {
	$sgs_container_resting_text_decl = sgs_text_colour_decl( $sgs_container_resting_text );
	if ( '' !== $sgs_container_resting_text_decl ) {
		$sgs_container_resting_decls[] = $sgs_container_resting_text_decl;
	}
}

$sgs_container_hover_text = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColourHover'] ?? '' ),
	(string) ( $attributes['textColourHoverGradient'] ?? '' )
);
if ( '' !== $sgs_container_hover_text ) {
	$sgs_container_hover_text_decl = sgs_text_colour_decl( $sgs_container_hover_text );
	if ( '' !== $sgs_container_hover_text_decl ) {
		$sgs_container_hover_decls[] = $sgs_container_hover_text_decl;
	}
}

if ( $sgs_container_resting_decls || $sgs_container_hover_decls ) {
	// The uid is normally minted by the style-engine branch above, but that
	// branch does not run when the ONLY colour set is a gradient or a hover —
	// mint it here in that case, using the identical derivation so a block that
	// has both paths still gets exactly one uid and one class.
	if ( empty( $sgs_container_supports_uid ) ) {
		$sgs_container_supports_uid       = 'sgs-cst-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
		$sgs_container_supports_classes[] = $sgs_container_supports_uid;
	}
	$sgs_container_state_sel = '.' . $sgs_container_supports_uid . '.wp-block-sgs-container';

	$sgs_container_supports_css = ( $sgs_container_supports_css ?? '' ) . sgs_emit_state_colour_css(
		$sgs_container_state_sel,
		$sgs_container_resting_decls,
		$sgs_container_hover_decls
	);
}

// ── Wrapper border (width/style + colour/gradient) — R2c pattern, mirrors
// sgs/product-card render.php exactly. borderWidth/borderStyle/borderColour/
// borderColourGradient are block-private attrs (see block.json note on the
// wrapper element's attrMap); only border-radius stays native (resolved
// above via the style engine). No hover pair (block.json declares none).
$sgs_container_border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$sgs_container_border_width_top    = sgs_css_length_value( $sgs_container_border_width_obj['top'] ?? '' );
$sgs_container_border_width_right  = sgs_css_length_value( $sgs_container_border_width_obj['right'] ?? '' );
$sgs_container_border_width_bottom = sgs_css_length_value( $sgs_container_border_width_obj['bottom'] ?? '' );
$sgs_container_border_width_left   = sgs_css_length_value( $sgs_container_border_width_obj['left'] ?? '' );
$sgs_container_has_border_width    = ( '' !== $sgs_container_border_width_top || '' !== $sgs_container_border_width_right || '' !== $sgs_container_border_width_bottom || '' !== $sgs_container_border_width_left );

$sgs_container_border_style_raw      = $attributes['borderStyle'] ?? '';
$sgs_container_allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$sgs_container_border_style          = in_array( $sgs_container_border_style_raw, $sgs_container_allowed_border_styles, true ) ? $sgs_container_border_style_raw : '';

// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width.
if ( '' !== $sgs_container_border_style && 'none' !== $sgs_container_border_style && $sgs_container_has_border_width ) {
	if ( empty( $sgs_container_supports_uid ) ) {
		$sgs_container_supports_uid       = 'sgs-cst-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
		$sgs_container_supports_classes[] = $sgs_container_supports_uid;
	}
	$sgs_container_border_sel = '.' . $sgs_container_supports_uid . '.wp-block-sgs-container';

	$sgs_container_border_box_decls = array( 'border-style:' . $sgs_container_border_style );
	if ( $sgs_container_has_border_width ) {
		$sgs_container_bwt                = '' !== $sgs_container_border_width_top ? $sgs_container_border_width_top : '0';
		$sgs_container_bwr                = '' !== $sgs_container_border_width_right ? $sgs_container_border_width_right : '0';
		$sgs_container_bwb                = '' !== $sgs_container_border_width_bottom ? $sgs_container_border_width_bottom : '0';
		$sgs_container_bwl                = '' !== $sgs_container_border_width_left ? $sgs_container_border_width_left : '0';
		$sgs_container_border_box_decls[] = "border-width:{$sgs_container_bwt} {$sgs_container_bwr} {$sgs_container_bwb} {$sgs_container_bwl}";
	}
	$sgs_container_supports_css .= $sgs_container_border_sel . '{' . implode( ';', $sgs_container_border_box_decls ) . ';}';

	$sgs_container_supports_css .= sgs_border_states_css(
		$sgs_container_border_sel,
		$attributes,
		array(
			'base'           => 'borderColour',
			'gradient'       => 'borderColourGradient',
			'hover'          => 'borderColourHover',
			'hover_gradient' => 'borderColourHoverGradient',
			'width'          => '' !== $sgs_container_border_width_top ? $sgs_container_border_width_top : '1px',
		)
	);
}

// ── Text align — allows inheritance when empty, so child blocks can pick up
// this value and override per-instance. Emitted only when set (non-empty).
$sgs_container_text_align_raw      = $attributes['textAlign'] ?? '';
$sgs_container_allowed_text_aligns = array( '', 'left', 'center', 'right', 'justify' );
$sgs_container_text_align          = in_array( $sgs_container_text_align_raw, $sgs_container_allowed_text_aligns, true ) ? $sgs_container_text_align_raw : '';

if ( '' !== $sgs_container_text_align ) {
	if ( empty( $sgs_container_supports_uid ) ) {
		$sgs_container_supports_uid       = 'sgs-cst-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
		$sgs_container_supports_classes[] = $sgs_container_supports_uid;
	}
	$sgs_container_text_align_sel = '.' . $sgs_container_supports_uid . '.wp-block-sgs-container';
	$sgs_container_supports_css  .= $sgs_container_text_align_sel . '{text-align:' . esc_attr( $sgs_container_text_align ) . ';}';
}

// ⛔ REMOVED 2026-08-20 (base-background-colour build, this session): the
// $attributes['backgroundColor'] / ['textColor'] / ['gradient'] reads that used
// to live here were a GHOST — none of the three is declared in block.json
// (supports.color is false, no matching attribute schema), so WP's editor drops
// them from getBlockAttributes() (no client could ever see or edit them) while
// PHP's WP_Block_Type::prepare_attributes_for_render() does NOT drop an
// undeclared key before render.php runs — it `continue`s past it rather than
// unsetting it. The result was a REAL painting background (via the has-*-
// background-color preset class WP's global-styles CSS renders for any
// matching class, independent of block support declarations) with no client-
// facing control. Fixed at the ROOT — `backgroundColour` (British spelling) is
// now a real declared+painted attribute (see the style-engine block above,
// mirrors sgs/site-header) and every theme authoring of `backgroundColor` was
// renamed to it via `scripts/migrate-theme-attr-rename.py` (38 instances, 23
// files). `textColor`'s single theme authoring (templates/single.html:11) was
// deliberately LEFT — container has no textColour equivalent control today and
// none is invented here; it is now correctly editor-invisible AND render-inert
// (was previously editor-invisible but render-active, which is worse). `gradient`
// had zero authorings anywhere and was never wired to any control — pure debt.

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). Replaces the retired WP-native
// supports.typography (fontSize/lineHeight/textAlign/letterSpacing/textTransform/
// fontWeight/fontStyle) with the framework's own helper, which also now offers
// fontWeight/fontStyle. The old preset-font-size-slug re-add (has-*-font-size)
// is retired alongside it — fontSize is now an object attr driven by
// TypographyControls, not a native string preset slug.
if ( empty( $sgs_container_supports_uid ) ) {
	$sgs_container_supports_uid       = 'sgs-cst-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
	$sgs_container_supports_classes[] = $sgs_container_supports_uid;
}
$sgs_container_typography_sel = '.' . $sgs_container_supports_uid . '.wp-block-sgs-container';
$sgs_container_supports_css  .= sgs_typography_css_rule( $attributes, '', $sgs_container_typography_sel );

$sgs_container_wrapper_opts = array( 'tag' => $html_tag );
if ( ! empty( $sgs_container_supports_classes ) ) {
	$sgs_container_wrapper_opts['extra_classes'] = $sgs_container_supports_classes;
}

// Landmark label (nav/aside only). `main` is allowed again as of 2026-08-21 but
// deliberately takes NO label: a document has exactly one <main>, so there is
// nothing for a label to disambiguate it from — unlike nav/aside, which repeat.
// header/footer lose their landmark role once nested, so they need none either.
if ( in_array( $html_tag, array( 'nav', 'aside' ), true ) && ! empty( $attributes['ariaLabel'] ) ) {
	$sgs_container_wrapper_opts['extra_attrs'] = array(
		'aria-label' => sanitize_text_field( $attributes['ariaLabel'] ),
	);
}

$sgs_container_output = SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	SGS_Container_Wrapper::resolve_kind( $block, 'section' ),
	$sgs_container_wrapper_opts
);

if ( '' !== $sgs_container_supports_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators intact — the CSS is entirely style-engine-generated or
	// slug-derived (sanitize_html_class), so nothing un-sanitised survives here.
	$sgs_container_output = '<style>' . wp_strip_all_tags( $sgs_container_supports_css ) . '</style>' . $sgs_container_output;
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() returns pre-sanitised HTML; all variables sanitised internally via esc_*/wp_kses()/get_block_wrapper_attributes(); the prepended <style> is pre-sanitised above.
echo $sgs_container_output;
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
