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
 * first Visual-QA pass shipped neither). Both are static markup here, driven
 * entirely by `view.js`:
 *   - `.sgs-choice-flow__step-count` / `__step-label` start empty and are
 *     filled by `showStepByIndex()` on every step change — "Step {n} of
 *     {total}" plus the current step's own `data-step-label` (an attribute
 *     `sgs/form-step` ALREADY emits for `sgs/form`'s own progress bar; reused
 *     here rather than adding a second per-step label attribute).
 *   - `.sgs-choice-flow__nav-back` starts `hidden` (there is nowhere to go
 *     back to on step 1) and `view.js` toggles it via the `history` stack
 *     `handleOptionClick()` was already building but nothing previously
 *     consumed.
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

$flow_title = isset( $attributes['title'] ) ? (string) $attributes['title'] : '';

// -------------------------------------------------------------------------
// Box-object interface contract — maxWidth (kept-scalar string) + padding
// (tier-object, desktop/tablet/mobile) — mirrors sgs/notice-banner's/
// sgs/quote's own box-family convention (box_family column, BoxControl).
// -------------------------------------------------------------------------

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

$wrapper_args = array(
	'class'               => 'sgs-choice-flow ' . $uid,
	'data-wp-interactive' => 'sgs/choice-flow',
);

if ( '' !== $flow_title ) {
	$wrapper_args['aria-label'] = $flow_title;
}

$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

if ( $scoped_css ) {
	echo '<style>' . wp_strip_all_tags( implode( '', $scoped_css ) ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() blocks a </style> breakout; every value above is pre-sanitised via sgs_css_length_value()/sgs_box_object_shorthand() (contract §D, matches sgs/quote + sgs/notice-banner).
}

echo '<div ' . $wrapper_attributes . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() returns pre-escaped markup.

echo '<div class="sgs-choice-flow__header">';
echo '<button type="button" class="sgs-choice-flow__nav-back" hidden aria-label="' . esc_attr__( 'Back', 'sgs-blocks' ) . '">';
echo '<span aria-hidden="true">&larr;</span> ' . esc_html__( 'Back', 'sgs-blocks' );
echo '</button>';
echo '<div class="sgs-choice-flow__step-indicator">';
echo '<span class="sgs-choice-flow__step-count"></span>';
echo '<span class="sgs-choice-flow__step-label"></span>';
echo '</div>';
echo '</div>';

echo '<div class="sgs-choice-flow__progress" aria-hidden="true"><div class="sgs-choice-flow__progress-fill"></div></div>';
echo '<div class="sgs-choice-flow__inner">';
echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- InnerBlocks content is pre-rendered/sanitised by the block editor's own save pipeline.
echo '</div>';
echo '</div>';
