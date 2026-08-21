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

if ( function_exists( 'wp_style_engine_get_styles' ) ) {
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

	if ( ! empty( $sgs_container_style_group['border'] ) && is_array( $sgs_container_style_group['border'] ) ) {
		$sgs_container_style_engine_input['border'] = $sgs_container_style_group['border'];
	}
	if ( ! empty( $sgs_container_style_group['typography'] ) && is_array( $sgs_container_style_group['typography'] ) ) {
		$sgs_container_style_engine_input['typography'] = $sgs_container_style_group['typography'];
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

// Preset font-size slug — skip-serialisation drops WP's automatic has-*-font-size
// class, so re-add it manually (mirrors sgs/label). fontSize IS declared/supported
// on this block (typography.fontSize), unlike the two ghosts removed below.
//
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
$sgs_container_preset_fontsize = isset( $attributes['fontSize'] ) ? sanitize_html_class( $attributes['fontSize'] ) : '';

if ( '' !== $sgs_container_preset_fontsize ) {
	$sgs_container_supports_classes[] = 'has-' . $sgs_container_preset_fontsize . '-font-size';
}

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
