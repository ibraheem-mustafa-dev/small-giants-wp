<?php
/**
 * Server-side render for sgs/collapsible-text.
 *
 * SEO discipline: the FULL text is ALWAYS emitted into the page HTML so
 * crawlers index every word. Collapse is visual only.
 *
 * Chosen approach (FR-30-3(e)): a <button aria-expanded aria-controls> toggle +
 * a line-clamped body container + a small view.js ES module.
 *   - No-JS state: the body is NOT clamped (full text visible) and the button
 *     carries the `hidden` attribute, so no-JS visitors get the full text and
 *     no broken control. This satisfies "no-JS full text reachable".
 *   - With JS: view.js adds `is-collapsed` to the body (applies the CSS
 *     line-clamp to --sgs-collapsible-text-collapsed-lines lines), removes
 *     `hidden` from the button, and wires the toggle (aria-expanded flip +
 *     label swap).
 *   - The body text stays in the DOM and crawlable in EVERY state — collapsed
 *     uses only overflow:hidden + line-clamp, never display:none/visibility:hidden.
 *   - When collapsible=false: plain wrapper, no button, no clamp.
 *
 * Typography: sgs_typography_css_rule() (includes/helpers-typography.php)
 * emits a scoped <style> block for font-size/weight/style/line-height.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * Every declaration is emitted into the block's OWN scoped `.{uid}` <style>
 * tag via the stable core API `wp_style_engine_get_styles()`.
 *
 * BOX-GROUP (contract §B): `padding`/`margin` are the WP-native
 * `style.spacing.padding`/`margin` objects (already `{top,right,bottom,left}`
 * — WP-native box families are object-shaped by construction). Tiers =
 * `paddingTablet`/`paddingMobile`/`marginTablet`/`marginMobile` SGS custom
 * object attrs, rendered scoped `@media` (contract §B2: 1023/767).
 *
 * The `--sgs-collapsible-text-collapsed-lines` custom-property VALUE is
 * emitted into the scoped `<style>` tag as a class-level rule
 * (`.{uid}.sgs-collapsible-text .sgs-collapsible-text__body{--...}`), NOT as
 * an inline `style="--var:…"` on the body element — per FR-32-4 as amended
 * 2026-07-18 (D345): inline `--var` declarations are FORBIDDEN too.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (unused — text is a scalar attr).
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

// ---------------------------------------------------------------------------
// 1. Security sanitisers (contract §D) — a CSS-length sanitiser for box/side
// values (mirrors sgs/label + sgs/container).
// ---------------------------------------------------------------------------

$text            = $attributes['text'] ?? '';
$collapsible     = ! empty( $attributes['collapsible'] );
$collapsed_lines = isset( $attributes['collapsedLines'] ) ? max( 1, (int) $attributes['collapsedLines'] ) : 4;

// Nothing to render if the operator hasn't entered any copy yet.
if ( '' === $text ) {
	return;
}

// -------------------------------------------------------------------------
// wp_unique_id() gives a stable-per-request id for THIS instance's aria
// wiring (aria-controls/body id) when multiple collapsible-text blocks
// appear on one page. The SAME token is also added as a CLASS (not a second
// id) so the scoped CSS below never collides with the block's own `anchor`
// support id (contract §B3 — scoping identifiers are classes, never ids).
// -------------------------------------------------------------------------
$uid      = wp_unique_id( 'sgs-collapsible-text-' );
$root_sel = '.' . $uid . '.sgs-collapsible-text';

$typography_selector = '.' . esc_attr( $uid ) . ' .sgs-collapsible-text__body';
$typography_css      = sgs_typography_css_rule( $attributes, '', $typography_selector );

// ---------------------------------------------------------------------------
// 2. Box shorthand builder (hand-built, mirrors sgs/label/sgs/container).
// ---------------------------------------------------------------------------

// WP-native base padding/margin objects (skip-serialised — NOT auto-inlined).
$base_padding_obj = ( ! empty( $sgs_tor_padding_desktop ) )
	? $sgs_tor_padding_desktop
	: array();
$base_margin_obj  = ( ! empty( $sgs_tor_margin_desktop ) )
	? $sgs_tor_margin_desktop
	: array();

// SGS custom tier object attrs.
$padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

// SGS flat colour attrs (D635 pattern — native color.text/color.background
// supports are off; the SgsColourPanel writes here instead).
$style_color_text = isset( $attributes['textColour'] ) ? (string) $attributes['textColour'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// WP `typography.textAlign` support (skip-serialised, top-level attribute —
// NOT nested under style.typography). block.json maps css:text-align to the
// `body` element (`.sgs-collapsible-text__body`), so it is scoped there, not
// the root wrapper (contract §B — element manifest is DB-first, R-31-1).
$text_align_raw = $attributes['textAlign'] ?? '';
$text_align     = in_array( $text_align_raw, array( 'left', 'center', 'right' ), true ) ? $text_align_raw : '';

// ---------------------------------------------------------------------------
// 3. Scoped CSS assembly.
// ---------------------------------------------------------------------------

$scoped_css = array();

// --- Base padding/margin (WP-native style.spacing.*), emitted scoped via the
// stable core style engine. ---

$spacing_args = array();
if ( ! empty( $base_padding_obj ) ) {
	$spacing_args['padding'] = $base_padding_obj;
}
if ( ! empty( $base_margin_obj ) ) {
	$spacing_args['margin'] = $base_margin_obj;
}
if ( ! empty( $spacing_args ) ) {
	$spacing_scoped_styles = wp_style_engine_get_styles(
		array( 'spacing' => $spacing_args ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $spacing_scoped_styles['css'] ) ) {
		$scoped_css[] = $spacing_scoped_styles['css'];
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME selector (contract §B2: tablet max-width:1023px,
// mobile max-width:767px). ---
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );

$tablet_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_decls ) . ';}}';
}

$mobile_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_decls ) . ';}}';
}

// --- WP colour support (skip-serialised) — custom hex/rgb emitted scoped via
// the style engine; preset SLUGS get the standard has-* classes re-added
// manually below. ---

// D636 — sibling gradient attribute wins when set+valid.
$text_colour_gradient  = isset( $attributes['textColourGradient'] ) ? (string) $attributes['textColourGradient'] : '';
$text_colour_effective = sgs_resolve_text_colour_or_gradient( $style_color_text, $text_colour_gradient );
if ( '' !== $text_colour_effective ) {
	$text_colour_decl = sgs_text_colour_decl( $text_colour_effective );
	if ( '' !== $text_colour_decl ) {
		$scoped_css[] = "{$root_sel}{{$text_colour_decl};}";
	}
	// MANDATORY companion, not optional: a gradient reaches the browser as
	// background-clip:text, and without this @supports fallback a browser
	// lacking that support gets a bare `color:` holding a gradient string,
	// which it drops silently. No-op for a flat colour.
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $root_sel, $text_colour_effective );
}

// Background (colour + gradient, resting + hover) is owned by the shared fill
// emitter, NOT by the style engine and NOT by supports.color.gradients.
//
// supports.color.gradients was `true` here, so CORE rendered its own gradient
// panel in the Styles tab, competing with the SGS colour panel — the client saw
// two and could not tell which won. This block never actually READ
// $attributes['style']['color']['gradient'] (verified by grep — no occurrence
// in the pre-fix file), so the native gradient control was already dead: any
// gradient an operator picked there painted nothing. Switching the flag off
// alone would still have left backgroundColour without a gradient option, so
// the flip is paired with a block-private backgroundColourGradient exposed
// through fillRow(), giving the client a working control where none existed.
$sgs_ct_fill_css = sgs_fill_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $sgs_ct_fill_css ) {
	$scoped_css[] = $sgs_ct_fill_css;
}

if ( '' !== $typography_css ) {
	$scoped_css[] = $typography_css;
}

// --- text-align (skip-serialised WP support, scoped to the body element per
// the block.json element manifest — never an inert root class). ---
if ( '' !== $text_align ) {
	$scoped_css[] = $typography_selector . '{text-align:' . $text_align . ';}';
}

// --sgs-collapsible-text-collapsed-lines VALUE — scoped rule (contract §A
// amended D345: inline `--var` is FORBIDDEN too), not an inline `style=`.
// Class-level selector per FR-31-22.3 (never #uid). Pushed here (before the
// <style> tag is assembled below) regardless of $collapsible so the custom
// property is always available to the body element.
$collapsed_lines_attr = esc_attr( (string) $collapsed_lines );
$scoped_css[]         = $root_sel . ' .sgs-collapsible-text__body{--sgs-collapsible-text-collapsed-lines:' . $collapsed_lines_attr . '}';

// ---------------------------------------------------------------------------
// 4. Wrapper classes — BEM root + collapsible modifier + the CSS-scope class.
// is-style-* / align* classes are merged in automatically by
// get_block_wrapper_attributes() via the block's className attribute. NO
// 'style' key carrying a property declaration is passed — the root carries
// ZERO inline property declarations (contract §A).
// ---------------------------------------------------------------------------
$wrapper_classes = array( 'sgs-collapsible-text', $uid );
if ( $collapsible ) {
	$wrapper_classes[] = 'sgs-collapsible-text--collapsible';
}
if ( '' !== $preset_text_slug ) {
	$wrapper_classes[] = 'has-text-color';
	$wrapper_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$wrapper_classes[] = 'has-background';
	$wrapper_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'id'    => $uid,
		'class' => implode( ' ', $wrapper_classes ),
	)
);

// Sanitise the rich-text copy. wp_kses_post() is the correct pass for
// operator-entered HTML (allows p, strong, em, a, ul, ol, li, br — keeps
// the full post subset while stripping any unsafe tags).
$safe_text = wp_kses_post( $text );

// -------------------------------------------------------------------------
// Build output.
// -------------------------------------------------------------------------
$output = '';

if ( $scoped_css ) {
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while
	// leaving CSS combinators like `>` intact (contract §D). Every value
	// reaching $scoped_css is pre-sanitised (sgs_css_length_value() /
	// wp_style_engine_get_styles / sgs_typography_css_rule's own
	// sanitisers), so no un-sanitised value survives here.
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style>.
	$output .= '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>';
}

if ( $collapsible ) {
	/*
	 * Collapse mechanism (FR-30-3(e)) — button + line-clamp body + view.js.
	 *
	 * DOM shape:
	 *   <div class="sgs-collapsible-text sgs-collapsible-text--collapsible {uid}" id="{uid}" ...>
	 *     <div class="sgs-collapsible-text__body" id="{uid}-body">
	 *       {full text — always in HTML, never hidden from crawlers}
	 *       (--sgs-collapsible-text-collapsed-lines:N set via a scoped
	 *       class-level <style> rule above, never an inline style="…")
	 *     </div>
	 *     <button type="button" class="sgs-collapsible-text__toggle"
	 *             aria-expanded="false" aria-controls="{uid}-body" hidden>
	 *       Read more
	 *     </button>
	 *   </div>
	 *
	 * No-JS default: body has NO `is-collapsed` class (full text visible) and
	 * the button is `hidden`. view.js adds `is-collapsed` + un-hides the button.
	 *
	 * The text is NEVER display:none / visibility:hidden — collapsed uses ONLY
	 * overflow:hidden + line-clamp (visual clipping; the text stays in the
	 * accessibility tree and is indexed by crawlers) in every state.
	 */
	$body_id = esc_attr( $uid . '-body' );

	$output .= '<div ' . $wrapper_attrs . '>';

	// Text body — always present + unclamped by default (no-JS shows full text).
	$output .= '<div class="sgs-collapsible-text__body" id="' . $body_id . '">';
	$output .= $safe_text; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised by wp_kses_post() above.
	$output .= '</div>';

	// Toggle — `hidden` by default; view.js un-hides it. aria-controls points
	// at the body so assistive tech announces the controlled region.
	$output .= '<button type="button" class="sgs-collapsible-text__toggle" aria-expanded="false" aria-controls="' . $body_id . '" data-read-more="' . esc_attr__( 'Read more', 'sgs-blocks' ) . '" data-read-less="' . esc_attr__( 'Read less', 'sgs-blocks' ) . '" hidden>';
	$output .= esc_html__( 'Read more', 'sgs-blocks' );
	$output .= '</button>';

	$output .= '</div>';
} else {
	// Non-collapsible: plain wrapper.
	$output .= '<div ' . $wrapper_attrs . '>';
	$output .= '<div class="sgs-collapsible-text__body">';
	$output .= $safe_text; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitised by wp_kses_post() above.
	$output .= '</div>';
	$output .= '</div>';
}

echo $output; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from get_block_wrapper_attributes(), wp_kses_post(), esc_attr(), and first-party CSS.
