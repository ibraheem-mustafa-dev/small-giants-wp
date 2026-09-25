<?php
/**
 * Server-side render for sgs/choice-flow.
 *
 * Spec 43 Phase 2 (§9) — the branching-quiz wizard root. Renders its
 * InnerBlocks (sgs/form-step children) as-is via $content. Originally
 * declared no colour/typography/box attrs (block.json's old
 * supports.sgs.elements.wrapper._note) — the Visual-QA pass (2026-09-15,
 * design-reviewer gap #1) added a DELIBERATELY MINIMAL maxWidth + padding
 * shape only (content-block composition_role, not wrapper-shell-kind — see
 * the composition_role decision in scripts/seed-composition-roles.py). This
 * still does NOT call SGS_Container_Wrapper — that would be a real
 * architecture change needing its own design-gate (CLAUDE.md rule 7) — it
 * stays block-private, matching sgs/form-review's minimal shape.
 *
 * `data-wp-interactive="sgs/choice-flow"` on the wrapper is the load-bearing
 * hook `view.js`'s FLOW_SELECTOR depends on
 * (`[data-wp-interactive="sgs/choice-flow"]`) — view.js was built and
 * verified against this exact contract before this file existed; do not
 * rename or remove it without updating view.js in the same commit.
 *
 * `title` (FR-43-9 build note) is shown to the editor operator as a canvas
 * preview only (edit.js) and here as an accessible landmark label — real
 * content for assistive tech, never a general-purpose visible heading (the
 * attribute's own help text: "not necessarily displayed to visitors").
 *
 * Progress bar (Visual-QA gap #2): a track + fill pair, scoped inside this
 * same wrapper. The fill's WIDTH is driven entirely client-side by
 * `view.js`'s `showStepByIndex()`, which sets a `--sgs-choice-flow-progress`
 * custom property (0–1) on the flow root — this file only emits the
 * static markup + the CSS that consumes that property
 * (`width:calc(var(--sgs-choice-flow-progress,0) * 100%)`); it does not
 * compute an initial value (view.js's `initFlow()` sets it on load, same as
 * it does on every step change, so there is no flash-of-0%-then-jump beyond
 * ordinary paint timing).
 *
 * Step transition (Visual-QA gap #3): CSS-only opacity+translate transition
 * on `.sgs-form-step`, gated by `prefers-reduced-motion`. `view.js` toggles
 * an `.is-entering` class alongside its existing `hidden` show/hide — the
 * `hidden` attribute remains the real accessibility/layout mechanism
 * (untouched); `.is-entering` is a pure visual enhancement layered on top.
 *
 * Step indicator + Back button (user-reported gap, 2026-09-15 — all three
 * reference quizzes have numbered/named stages AND a Back control; the
 * first Visual-QA pass shipped neither).
 *   - `.sgs-choice-flow__step-count` / `__step-label` start empty and are
 *     filled by `showStepByIndex()` on every step change — "Step {n} of
 *     {total}" plus the current step's own `data-step-label` (an attribute
 *     `sgs/form-step` ALREADY emits for `sgs/form`'s own progress bar; reused
 *     here rather than adding a second per-step label attribute).
 *   - `.sgs-choice-flow__nav-back` starts `hidden` (there is nowhere to go
 *     back to on step 1) and `view.js` toggles it via the `history` stack
 *     `handleOptionClick()` was already building but nothing previously
 *     consumed. LIVE evidence read from the client's own real lens-
 *     configurator source (2026-09-15 —
 *     sites/eye-care-ward-end/design_handoff_ward_end_eye_care/
 *     Eye Care Birmingham.dc.html:1529-1532) put this in a BOTTOM sticky
 *     footer strip (border-top divider, left-aligned), not inline with the
 *     progress bar — AthleanX matches the same bottom-footer placement;
 *     Invisalign's top-of-page text-link placement was explicitly rejected
 *     (Bean, "the invisalign one is definitely the outlier"). Styled via the
 *     shared `sgs_button_element_style_css()` helper — see the block.json
 *     `back` element's own `_note` for the full colour-token evidence.
 *
 * Progress style variants (`progressStyle` attr, user-directed 2026-09-15):
 * 'bar' (default) is this file's own plain fill bar, unchanged. 'circles'
 * and 'badge' both need an EMPTY container here that `view.js` populates —
 * only `view.js` reliably knows the flow's total step count + per-step
 * labels (via `getSteps()`/`data-step-label`), so building N circles or a
 * positioned badge server-side would mean re-deriving that count from the
 * parsed InnerBlocks tree, duplicating logic `view.js` already owns.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Inner block content (the sgs/form-step children).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__ ) . '/choice-flow-question/helpers-addon-pricing.php';

// FR-43-6 — a linked flow renders the referenced sgs_choice_flow post's own
// sgs/choice-flow (its steps, pricing and styling) in place of this block,
// the same by-slug, fail-closed reference sgs/form uses for sgs_form posts.
// Gated on flowIsLinked so the flow post's own block never resolves itself;
// the static stack also stops a flow that links to itself, however deep.
$flow_ref_slug  = isset( $attributes['flowId'] ) ? sanitize_title( (string) $attributes['flowId'] ) : '';
$flow_is_linked = ! empty( $attributes['flowIsLinked'] ) && '' !== $flow_ref_slug;
if ( $flow_is_linked ) {
	static $sgs_choice_flow_rendering = array();
	$referenced_flow = isset( $sgs_choice_flow_rendering[ $flow_ref_slug ] ) || ! class_exists( '\SGS\Blocks\Sgs_Block_CPTs' )
		? null
		: \SGS\Blocks\Sgs_Block_CPTs::resolve_choice_flow( $flow_ref_slug );

	if ( null === $referenced_flow ) {
		echo '<div class="sgs-choice-flow sgs-choice-flow--broken-reference">';
		if ( current_user_can( 'edit_sgs_forms' ) ) {
			echo '<p class="sgs-choice-flow__admin-notice" role="alert">' . esc_html__( "This flow's link is broken: go to Choice Flows, find the linked flow, and publish it or unlink this block.", 'sgs-blocks' ) . '</p>';
		}
		echo '<p class="sgs-choice-flow__fallback-message">' . esc_html__( "This isn't available right now. Please contact us instead.", 'sgs-blocks' ) . '</p>';
		echo '</div>';
		return;
	}

	$sgs_choice_flow_rendering[ $flow_ref_slug ] = true;
	echo (string) do_blocks( $referenced_flow->post_content ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- do_blocks() output is core-trusted block HTML, same provenance as sgs/form's linked path.
	unset( $sgs_choice_flow_rendering[ $flow_ref_slug ] );
	return;
}

$flow_title = isset( $attributes['title'] ) ? (string) $attributes['title'] : '';

// -------------------------------------------------------------------------
// FR-43-19/FR-43-20 (v1.4.0) — price panel + "what is being bought".
// Resolution order: the page's own product (a single product template) wins
// — the flow prices/purchases whatever the shopper is already looking at —
// falling back to `flowProductId` when the flow is used off a product page.
// The buybox/product-card's own live combo swap (a window
// `sgs-variation-change` event) overrides this static value client-side the
// moment it fires; this is only the first-paint value.
// -------------------------------------------------------------------------

$show_price_panel  = ! empty( $attributes['showPricePanel'] );
$price_panel_title = isset( $attributes['pricePanelTitle'] ) ? (string) $attributes['pricePanelTitle'] : '';
$flow_product_id   = isset( $attributes['flowProductId'] ) ? absint( $attributes['flowProductId'] ) : 0;

$page_product_id     = is_singular( 'product' ) ? absint( get_queried_object_id() ) : 0;
$resolved_product_id = $page_product_id > 0 ? $page_product_id : $flow_product_id;

$flow_price = $resolved_product_id > 0
	? sgs_choice_flow_resolve_product_price_minor( $resolved_product_id )
	: null;

// -------------------------------------------------------------------------
// Box-object interface contract — maxWidth (kept-scalar string) + padding
// (tier-object, desktop/tablet/mobile) — mirrors sgs/notice-banner's/
// sgs/quote's own box-family convention (box_family column, BoxControl).
// -------------------------------------------------------------------------

$progress_style  = isset( $attributes['progressStyle'] ) && in_array( $attributes['progressStyle'], array( 'circles', 'badge' ), true )
	? $attributes['progressStyle']
	: 'bar';
$max_width       = isset( $attributes['maxWidth'] ) ? (string) $attributes['maxWidth'] : '';
$padding_tiers   = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$padding_desktop = is_array( $padding_tiers['desktop'] ?? null ) ? $padding_tiers['desktop'] : array();
$padding_tablet  = is_array( $padding_tiers['tablet'] ?? null ) ? $padding_tiers['tablet'] : array();
$padding_mobile  = is_array( $padding_tiers['mobile'] ?? null ) ? $padding_tiers['mobile'] : array();

$uid      = 'sgs-choice-flow-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-choice-flow';

$scoped_css = array();

if ( '' !== $max_width ) {
	$mw_safe = sgs_css_length_value( $max_width );
	if ( '' !== $mw_safe ) {
		$scoped_css[] = "{$root_sel}{max-width:{$mw_safe};margin-left:auto;margin-right:auto;}";
	}
}

$padding_base_val = sgs_box_object_shorthand( $padding_desktop );
if ( null !== $padding_base_val ) {
	$scoped_css[] = "{$root_sel}{padding:{$padding_base_val};}";
}

$padding_tablet_val = sgs_box_object_shorthand( $padding_tablet );
if ( null !== $padding_tablet_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{padding:{$padding_tablet_val};}}";
}

$padding_mobile_val = sgs_box_object_shorthand( $padding_mobile );
if ( null !== $padding_mobile_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{padding:{$padding_mobile_val};}}";
}

// Back button — shared button-style emitter (mirrors sgs/product-card's
// built-in CTA). Uppercase + letter-spacing is a fixed styling constant
// (not a control), matching the real reference's own small-caps nav-button
// treatment — same status as sgs/label's fixed 12px eyebrow size.
$back_css = sgs_button_element_style_css( $attributes, 'back', "{$root_sel} .sgs-choice-flow__nav-back" );
if ( '' !== $back_css ) {
	$scoped_css[] = $back_css;
}

$wrapper_args = array(
	'class'                 => 'sgs-choice-flow ' . $uid,
	'data-wp-interactive'   => 'sgs/choice-flow',
	// FR-43-19/20: the flow's first-paint product/price, read by view.js's
	// pricing module. A live `sgs-variation-change` event (item 5, the page's
	// own buybox/product-card) overwrites these client-side the moment it
	// fires — this is only the value at render time.
	'data-flow-product-id'  => (string) $resolved_product_id,
	'data-flow-price-minor' => null !== $flow_price ? (string) $flow_price['minor'] : '',
	'data-flow-decimals'    => null !== $flow_price ? (string) $flow_price['decimals'] : '2',
	// WooCommerce's own "drop .00 on whole amounts" switch, so the panel's
	// JS-formatted prices match wc_price() everywhere else on the site.
	'data-flow-trim-zeros'  => apply_filters( 'woocommerce_price_trim_zeros', false ) ? '1' : '0',
);

if ( '' !== $flow_title ) {
	$wrapper_args['aria-label'] = $flow_title;
}

$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

if ( $scoped_css ) {
	echo '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() blocks a </style> breakout; every value above is pre-sanitised via sgs_css_length_value()/sgs_box_object_shorthand() (contract §D, matches sgs/quote + sgs/notice-banner).
}

echo '<div ' . $wrapper_attributes . ' data-progress-style="' . esc_attr( $progress_style ) . '">'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped markup.

echo '<div class="sgs-choice-flow__header">';
echo '<div class="sgs-choice-flow__step-indicator">';
echo '<span class="sgs-choice-flow__step-count"></span>';
echo '<span class="sgs-choice-flow__step-label"></span>';
echo '</div>';
echo '</div>';

// 'circles' gets an empty stepper container ABOVE the plain bar (mirrors
// AthleanX: numbered circles + connecting lines above a separate fill bar)
// — populated entirely by view.js (it already knows step count + labels).
if ( 'circles' === $progress_style ) {
	echo '<div class="sgs-choice-flow__stepper" aria-hidden="true"></div>';
}

echo '<div class="sgs-choice-flow__progress" aria-hidden="true"><div class="sgs-choice-flow__progress-fill"></div></div>';

echo '<div class="sgs-choice-flow__body' . ( $show_price_panel ? ' sgs-choice-flow__body--with-panel' : '' ) . '">'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed string, no dynamic content.
echo '<div class="sgs-choice-flow__inner">';
// FR-43-21: form fields in a purchase step are styled by sgs/form's own
// stylesheet (the field blocks carry none), which a page with no sgs/form
// would never load.
if ( false !== strpos( $content, 'sgs-form-field' ) ) {
	wp_enqueue_style( generate_block_asset_handle( 'sgs/form', 'style' ) );
}
echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks content is pre-rendered/sanitised by the block editor's own save pipeline.
echo '</div>';

// FR-43-19: the live price panel is DISPLAY ONLY — every row + the total is
// built/updated entirely by view.js's pricing module (it alone knows which
// priced-add-on options have been chosen along the path taken). This shell
// only reserves the markup + heading; an empty rows list renders nothing
// extra (no flash of a stray total before the first paint pass runs).
if ( $show_price_panel ) {
	echo '<aside class="sgs-choice-flow__price-panel" aria-live="polite">';
	if ( '' !== $price_panel_title ) {
		echo '<h4 class="sgs-choice-flow__price-panel-title">' . esc_html( $price_panel_title ) . '</h4>';
	}
	echo '<div class="sgs-choice-flow__price-panel-base-row">';
	echo '<span class="sgs-choice-flow__price-panel-base-label">' . esc_html__( 'Base price', 'sgs-blocks' ) . '</span>';
	echo '<span class="sgs-choice-flow__price-panel-base-value"></span>';
	echo '</div>';
	echo '<ul class="sgs-choice-flow__price-panel-rows"></ul>';
	echo '<div class="sgs-choice-flow__price-panel-total-row">';
	echo '<span class="sgs-choice-flow__price-panel-total-label">' . esc_html__( 'Total', 'sgs-blocks' ) . '</span>';
	echo '<span class="sgs-choice-flow__price-panel-total-value"></span>';
	echo '</div>';
	echo '</aside>';
}

echo '</div>'; // .sgs-choice-flow__body

// Bottom sticky footer — Back button only (this flow's option-click-to-
// advance model needs no separate forward button; see render.php's own
// docblock for the real-evidence reasoning).
echo '<div class="sgs-choice-flow__footer">';
echo '<button type="button" class="sgs-choice-flow__nav-back" hidden aria-label="' . esc_attr__( 'Back', 'sgs-blocks' ) . '">';
echo '<span aria-hidden="true">&larr;</span> ' . esc_html__( 'Back', 'sgs-blocks' );
echo '</button>';
echo '</div>';

echo '</div>';
