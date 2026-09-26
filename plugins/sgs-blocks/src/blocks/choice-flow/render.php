<?php
/**
 * Server-side render for sgs/choice-flow.
 *
 * The branching-quiz wizard root. Renders its InnerBlocks (sgs/form-step
 * children) as-is via $content. Carries a DELIBERATELY MINIMAL maxWidth +
 * padding box shape only (content-block composition_role, not
 * wrapper-shell-kind) — never calls SGS_Container_Wrapper, matching
 * sgs/form-review's own minimal shape.
 *
 * `data-wp-interactive="sgs/choice-flow"` on the wrapper is the load-bearing
 * hook `view.js`'s FLOW_SELECTOR depends on
 * (`[data-wp-interactive="sgs/choice-flow"]`) — do not rename or remove it
 * without updating view.js in the same commit.
 *
 * `title` is shown to the editor operator as a canvas preview only
 * (edit.js) and here as an accessible landmark label — real content for
 * assistive tech, never a general-purpose visible heading.
 *
 * Progress bar: a track + fill pair, scoped inside this same wrapper. The
 * fill's WIDTH is driven entirely client-side by `view.js`'s
 * `showStepByIndex()`, which sets a `--sgs-choice-flow-progress` custom
 * property (0–1) on the flow root — this file only emits the static markup
 * + the CSS that consumes that property.
 *
 * Step transition: CSS-only opacity+translate transition on
 * `.sgs-form-step`, gated by `prefers-reduced-motion`. `view.js` toggles an
 * `.is-entering` class alongside its existing `hidden` show/hide — `hidden`
 * remains the real accessibility/layout mechanism; `.is-entering` is a pure
 * visual enhancement layered on top.
 *
 * Step indicator + Back button: `.sgs-choice-flow__step-count`/`__step-label`
 * start empty and are filled by `navigation.js`'s `showStepByIndex()` on
 * every step change. `.sgs-choice-flow__nav-back` starts `hidden` and
 * `navigation.js` toggles it via its `history` stack; both live in a bottom
 * sticky footer strip (border-top divider, left-aligned). Styled via the
 * shared `sgs_button_element_style_css()` helper.
 *
 * Footer: Back left; Continue (muted with aria-disabled until the step has a
 * choice), or a result step's own Add to basket / Buy now, on the right —
 * `includes/choice-flow-chrome.php::sgs_choice_flow_footer_html`, driven by
 * `navigation.js::updateFooterActions`. A recommendation or email-capture
 * terminal shows neither.
 *
 * Progress style variants (`progressStyle` attr): 'bar' (default) is this
 * file's own plain fill bar. 'circles'/'badge' need an EMPTY container here
 * that `view.js` populates — it alone knows the flow's total step count and
 * per-step labels.
 *
 * Layout (`layout` attr, FR-43-24): 'compact' (default, unchanged output) or
 * 'showcase' — a full-height frame with a sticky stage beside the steps; see
 * this file's own `$is_showcase` branches below and
 * choice-flow-chrome.php's header helper.
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
require_once dirname( __DIR__, 3 ) . '/includes/choice-flow-chrome.php';
require_once dirname( __DIR__, 3 ) . '/includes/choice-flow-variation-seed.php';
require_once dirname( __DIR__, 3 ) . '/includes/choice-flow-summary.php';

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
	// The referenced post's own root carries the slug as flowId (never
	// flowIsLinked), so its steps know which saved flow they belong to.
	foreach ( parse_blocks( $referenced_flow->post_content ) as $flow_part ) {
		if ( 'sgs/choice-flow' === $flow_part['blockName'] ) {
			$flow_part['attrs']['flowId'] = $flow_ref_slug;
		}
		echo render_block( $flow_part ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- core-rendered block HTML, same provenance as sgs/form's linked path.
	}
	unset( $sgs_choice_flow_rendering[ $flow_ref_slug ] );
	return;
}

$flow_title = isset( $attributes['title'] ) ? (string) $attributes['title'] : '';

// FR-43-24 — layout: 'compact' (unchanged single column) or 'showcase' (a
// full-height frame with a sticky stage beside the steps). Showcase always
// shows the chrome header (logo/eyebrow/Close), regardless of showHeader —
// a full-screen flow needs it either way; a local attributes copy keeps
// choice-flow-chrome.php's own helpers untouched.
$layout       = isset( $attributes['flowLayout'] ) && 'showcase' === $attributes['flowLayout'] ? 'showcase' : 'compact';
$is_showcase  = 'showcase' === $layout;
$chrome_attrs = $is_showcase ? array_merge( $attributes, array( 'showHeader' => true ) ) : $attributes;

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

// FIXES item 2 — the showcase header eyebrow's product name (chrome.js
// composes "<Product name> — <Step name>" from it).
$resolved_product_name = sgs_choice_flow_resolve_product_name( $resolved_product_id );

// -------------------------------------------------------------------------
// Box-object interface contract — maxWidth (kept-scalar string) + padding
// (tier-object, desktop/tablet/mobile) — mirrors sgs/notice-banner's/
// sgs/quote's own box-family convention (box_family column, BoxControl).
// -------------------------------------------------------------------------

$progress_style  = isset( $attributes['progressStyle'] ) && in_array( $attributes['progressStyle'], array( 'circles', 'badge' ), true )
	? $attributes['progressStyle']
	: 'bar';
// D1 (v1.8.0) — the footer's Continue button; navigation.js reads this off
// the wrapper to decide whether a question step shows Continue at all.
$advance_mode    = isset( $attributes['advanceMode'] ) && 'tap' === $attributes['advanceMode'] ? 'tap' : 'continue';
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
$scoped_css[] = sgs_choice_flow_chrome_progress_colour_css( $attributes, $root_sel );

$inner_parsed = isset( $block->parsed_block['innerBlocks'] ) && is_array( $block->parsed_block['innerBlocks'] ) ? $block->parsed_block['innerBlocks'] : array();

$wrapper_args = array(
	'class'                 => trim( 'sgs-choice-flow sgs-choice-flow--layout-' . $layout . ' ' . $uid . ' ' . sgs_choice_flow_chrome_classes( $chrome_attrs ) ),
	'data-wp-interactive'   => 'sgs/choice-flow',
	'data-flow-id'          => get_the_ID() . '-' . $uid, // Session-state key: unique per page and flow.
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
	// D1: read by navigation.js's advanceModeOf().
	'data-advance-mode'     => $advance_mode,
);

if ( '' !== $flow_title ) {
	$wrapper_args['aria-label'] = $flow_title;
}

$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

$scoped_css = array_filter( $scoped_css );
if ( $scoped_css ) {
	echo '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() blocks a </style> breakout; every value above is pre-sanitised via sgs_css_length_value()/sgs_box_object_shorthand() (contract §D, matches sgs/quote + sgs/notice-banner).
}

echo '<div ' . $wrapper_attributes . sgs_choice_flow_variation_seed_attr( $inner_parsed, $resolved_product_id ) . ' data-progress-style="' . esc_attr( $progress_style ) . '">'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() and the seed helper return pre-escaped markup.

// Questions only, as view.js counts them: a step holding a result is not numbered.
$step_total = count( array_filter( $inner_parsed, static fn( $b ) => 'sgs/form-step' === ( $b['blockName'] ?? '' ) && false === strpos( (string) wp_json_encode( $b['innerBlocks'] ?? array() ), 'sgs\/choice-flow-result' ) ) );
echo sgs_choice_flow_chrome_header_html( $chrome_attrs, $step_total, $resolved_product_name ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- helper returns pre-escaped markup.

// FR-43-24: in 'showcase', this moves below into the step pane (the eyebrow
// above each question) instead of sitting here above the progress line —
// same markup either way, view.js fills it the same way regardless.
$step_indicator_html = '<div class="sgs-choice-flow__header"><div class="sgs-choice-flow__step-indicator">'
	. '<span class="sgs-choice-flow__step-count"></span><span class="sgs-choice-flow__step-label"></span>'
	. '</div></div>';
if ( ! $is_showcase ) {
	echo $step_indicator_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed string, no dynamic content.
}

// 'circles' gets an empty stepper container ABOVE the plain bar (mirrors
// AthleanX: numbered circles + connecting lines above a separate fill bar)
// — populated entirely by view.js (it already knows step count + labels).
if ( 'circles' === $progress_style ) {
	echo '<div class="sgs-choice-flow__stepper" aria-hidden="true"></div>';
}

echo '<div class="sgs-choice-flow__progress" aria-hidden="true"><div class="sgs-choice-flow__progress-fill"></div></div>';

// FR-43-24: showcase always renders the stage (the summary panel doubles as
// it — see choice-flow-summary.php's own docblock), not only when
// showPricePanel is on.
$render_stage = $show_price_panel || $is_showcase;

echo '<div class="sgs-choice-flow__body' . ( $render_stage ? ' sgs-choice-flow__body--with-panel' : '' ) . '">'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed string, no dynamic content.
echo '<div class="sgs-choice-flow__inner">';
if ( $is_showcase ) {
	echo $step_indicator_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- fixed string, no dynamic content.
}
// FR-43-21: form fields in a purchase step are styled by sgs/form's own
// stylesheet (the field blocks carry none), which a page with no sgs/form
// would never load.
if ( false !== strpos( $content, 'sgs-form-field' ) ) {
	wp_enqueue_style( generate_block_asset_handle( 'sgs/form', 'style' ) );
}
echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks content is pre-rendered/sanitised by the block editor's own save pipeline.
echo '</div>';

// FR-43-19/D4/FR-43-24: the live summary/stage panel is DISPLAY ONLY — the
// image, every row and the total are built/updated entirely by view.js's
// pricing + summary modules (they alone know which options have been chosen
// along the path taken, and which variation/image has resolved). This call
// only reserves the markup + heading; empty rows render nothing extra (no
// flash of a stray total before the first paint pass runs).
if ( $render_stage ) {
	echo sgs_choice_flow_summary_panel_html( $attributes, $resolved_product_id ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- helper returns pre-escaped markup.
}

echo '</div>'; // .sgs-choice-flow__body

echo sgs_choice_flow_footer_html( $attributes ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- helper returns pre-escaped markup.

echo '</div>';
