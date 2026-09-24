<?php
/**
 * Server-side render for sgs/filter-search.
 *
 * Two modes (attributes.searchMode) — full rationale for each in the
 * relevant branch below and in resolve-taxonomy-terms.php's own docblock:
 * - 'attribute-chips' (legacy/default): a type-to-find input narrowing a
 *   sibling WC attribute filter's chip list. Auto-shown only once the
 *   attribute has ≥$threshold terms (default 16, the Baymard Institute
 *   type-to-find threshold).
 * - 'taxonomy-terms': the block owns the whole list — a searchable, tickable
 *   list of a chosen taxonomy's terms, usable standalone in a filter panel.
 *   Term links are plain server-built URLs (No-JS) using WooCommerce's own
 *   `filter_{param}` query-string contract; view.js only narrows the visible
 *   list by typed text — client-side, fine up to roughly 200 terms.
 *
 * Visibility scoping: get_terms( hide_empty=true ) counts only terms
 * attached to a published product, so draft-only terms are excluded.
 *
 * NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check. `margin`
 * is a block-private object attr, emitted scoped via wp_style_engine_get_styles()
 * into this block's own `.{uid}` <style> tag; tablet/mobile tiers are scoped
 *
 * @media(max-width:1023px)/767px on the same selector.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once __DIR__ . '/resolve-taxonomy-terms.php';

// ---------------------------------------------------------------------------
// Security sanitisers (contract §D) — a CSS-length sanitiser for box/side
// values (mirrors sgs/label + sgs/heading + sgs/container).
// ---------------------------------------------------------------------------

$search_mode = $attributes['searchMode'] ?? 'attribute-chips';
if ( ! in_array( $search_mode, array( 'attribute-chips', 'taxonomy-terms' ), true ) ) {
	$search_mode = 'attribute-chips';
}

$threshold = max( 2, absint( $attributes['threshold'] ?? 16 ) );

// Placeholder: use operator-supplied value, else an i18n default.
$placeholder = ! empty( $attributes['placeholder'] )
	? $attributes['placeholder']
	: __( 'Type to filter…', 'sgs-blocks' );

// i18n template strings passed as data-attributes so view.js stays
// translation-correct without hardcoding English in the JS module.
/* translators: %1$d = count of shown options, %2$d = total options */
$shown_template = __( '%1$d of %2$d options shown', 'sgs-blocks' );
$none_text      = __( 'No matching options', 'sgs-blocks' );

$terms_markup = ''; // Only populated in taxonomy-terms mode; empty string elsewhere.

if ( 'taxonomy-terms' === $search_mode ) {

	// All taxonomy-terms resolution + markup building lives in
	// resolve-taxonomy-terms.php (kept out of this file to stay under the
	// 300-line PHP file limit).
	$resolved = sgs_filter_search_resolve_taxonomy_terms( $attributes );

	if ( null === $resolved ) {
		return;
	}

	$total           = $resolved['total'];
	$attribute_label = $resolved['attribute_label'];
	$terms_markup    = $resolved['terms_markup'];

} else {

	$attribute_id = absint( $attributes['attributeId'] ?? 0 );

	// Guard: no attribute selected yet — render nothing.
	if ( 0 === $attribute_id ) {
		return;
	}

	// Resolve taxonomy slug from the WooCommerce attribute ID.
	$attribute_taxonomy = function_exists( 'wc_attribute_taxonomy_name_by_id' )
		? wc_attribute_taxonomy_name_by_id( $attribute_id )
		: '';

	if ( empty( $attribute_taxonomy ) || ! taxonomy_exists( $attribute_taxonomy ) ) {
		return;
	}

	// Count terms that are attached to at least one published product.
	// hide_empty=true relies on WP's term.count which is incremented/decremented
	// only for published posts — draft-only terms have count=0 and are excluded.
	$terms = get_terms(
		array(
			'taxonomy'   => $attribute_taxonomy,
			'hide_empty' => true,
		)
	);

	if ( is_wp_error( $terms ) || ! is_array( $terms ) ) {
		return;
	}

	// Below threshold — render nothing (the boundary condition).
	if ( count( $terms ) < $threshold ) {
		return;
	}

	$total = count( $terms );

	// Human-readable attribute label (e.g. "Flavour", "Size").
	$attribute_label = function_exists( 'wc_attribute_label' )
		? wc_attribute_label( $attribute_taxonomy )
		: $attribute_taxonomy;
}

// Unique ID for aria wiring — stable per request/instance.
$uid = wp_unique_id( 'sgs-filter-search-' );

// The search input only earns its place once there's enough to search
// through. In taxonomy-terms mode the term list still renders below the
// threshold — only the input itself is gated.
$show_input = $total >= $threshold;

// ---------------------------------------------------------------------------
// Scoped CSS assembly (contract §A). $style_uid is a CLASS — mirrors the
// sgs/heading/sgs/label/sgs/container scoped pattern. Kept distinct from
// $uid above (wp_unique_id, used for the input/label/status ARIA wiring).
// ---------------------------------------------------------------------------

$style_uid = 'sgs-fs-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel  = '.' . $style_uid . '.wp-block-sgs-filter-search';

$scoped_css = array();

// Colour attributes — focus ring and text colour, emitted as custom
// properties on the root selector (fall back to style.css's defaults when
// unset). focusRingColour deliberately skips sgs_border_states_css() — that
// helper writes `border-color` unconditionally on its base selector, which
// would overwrite the input's RESTING border with the focus-only ring colour
// on every render; a flat-only custom property consumed by style.css's own
// `:focus-visible{outline:2px solid var(--sgs-filter-search-focus,...)}` is
// the correct mechanism (outline cannot hold a gradient in any case).
$input_css = '';
if ( ! empty( $attributes['focusRingColour'] ?? '' ) ) {
	$input_css .= '--sgs-filter-search-focus:' . sanitize_text_field( $attributes['focusRingColour'] ) . ';';
}
if ( ! empty( $attributes['textColour'] ?? '' ) ) {
	$input_css .= '--sgs-filter-search-text:' . sanitize_text_field( $attributes['textColour'] ) . ';';
}
if ( ! empty( $input_css ) ) {
	$scoped_css[] = "{$root_sel}{" . $input_css . '}';
}

// Hover state for text colour (flat colour only; no gradient — exempted per
// Task 1, colour-conformance FILL closeout).
if ( ! empty( $attributes['textColourHover'] ?? '' ) ) {
	$scoped_css[] = sgs_hover_state_rules(
		$root_sel,
		'--sgs-filter-search-text-hover:' . sanitize_text_field( $attributes['textColourHover'] ) . ';'
	);
}

// --- Input border colour — base + hover, flat-or-gradient, one owned rule
// (CLAUDE.md "Colour EMISSION helpers" decision table row 4). Targets the
// input element directly (css_element='input' per block_attributes DB),
// out-specifying style.css's `border: 1px solid var(...)` shorthand at
// (0,2,0) vs (0,1,0). ---
$input_border_colour_css = sgs_border_states_css(
	"{$root_sel} .sgs-filter-search__input",
	$attributes,
	array(
		'base'           => 'inputBorderColour',
		'hover'          => 'inputBorderColourHover',
		'gradient'       => 'inputBorderColourGradient',
		'hover_gradient' => 'inputBorderColourHoverGradient',
		'width'          => '1px',
	)
);
if ( '' !== $input_border_colour_css ) {
	$scoped_css[] = $input_border_colour_css;
}

// Base margin — `margin` is a single block-owned TIER-of-BOXES envelope attr
// {desktop,tablet,mobile} (folded 2026-09-11 from the wrong 3-sibling shape
// margin/marginTablet/marginMobile), read once via
// sgs_responsive_normalise_object() and emitted scoped via the stable core
// style engine (mirrors sgs/star-rating's already-shipped margin migration).
$sgs_fs_margin_tiers = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$base_margin_obj     = array();
$margin_raw          = is_array( $sgs_fs_margin_tiers['desktop'] ?? null ) ? $sgs_fs_margin_tiers['desktop'] : array();
if ( ! empty( $margin_raw ) ) {
	foreach ( $margin_raw as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}
if ( ! empty( $base_margin_obj ) ) {
	$base_scoped_styles = wp_style_engine_get_styles(
		array( 'spacing' => array( 'margin' => $base_margin_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// Responsive margin tiers — hand-built shorthand, scoped @media on the same
// selector (contract §B2: tablet max-width:1023px, mobile max-width:767px).
$margin_tablet_obj = is_array( $sgs_fs_margin_tiers['tablet'] ?? null ) ? $sgs_fs_margin_tiers['tablet'] : array();
$margin_mobile_obj = is_array( $sgs_fs_margin_tiers['mobile'] ?? null ) ? $sgs_fs_margin_tiers['mobile'] : array();

$margin_tab_val = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val = sgs_box_object_shorthand( $margin_mobile_obj );

if ( null !== $margin_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{margin:{$margin_tab_val};}}";
}
if ( null !== $margin_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{margin:{$margin_mob_val};}}";
}

$is_terms_mode = ( 'taxonomy-terms' === $search_mode );

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class'                       => 'sgs-filter-search ' . ( $is_terms_mode ? 'sgs-filter-search--terms ' : '' ) . $style_uid,
		'data-sgs-filter-search'      => '',
		'data-sgs-filter-search-mode' => $is_terms_mode ? 'terms' : 'chips',
	)
);

?>
<?php if ( $scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> breakout. ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is safe. ?>>

	<?php if ( $show_input ) : ?>

		<?php // Visually-hidden label — associates with the input for screen readers. ?>
	<label for="<?php echo esc_attr( $uid ); ?>" class="screen-reader-text">
		<?php
		echo esc_html(
			sprintf(
				/* translators: %s is the attribute name, e.g. "Flavour" */
				__( 'Search %s options', 'sgs-blocks' ),
				$attribute_label
			)
		);
		?>
	</label>

	<input
		type="search"
		id="<?php echo esc_attr( $uid ); ?>"
		class="sgs-filter-search__input"
		placeholder="<?php echo esc_attr( $placeholder ); ?>"
		autocomplete="off"
		aria-describedby="<?php echo esc_attr( $uid . '-status' ); ?>"
	/>

		<?php // Aria-live region — announces the narrowed count to screen readers. ?>
	<p
		id="<?php echo esc_attr( $uid . '-status' ); ?>"
		class="sgs-filter-search__status screen-reader-text"
		role="status"
		aria-live="polite"
		data-total="<?php echo esc_attr( (string) $total ); ?>"
		data-shown-template="<?php echo esc_attr( $shown_template ); ?>"
		data-none-text="<?php echo esc_attr( $none_text ); ?>"
	></p>

		<?php // Visible "no matching options" message — hidden by default; view.js shows it. ?>
	<p class="sgs-filter-search__empty" hidden>
		<?php echo esc_html__( 'No matching options', 'sgs-blocks' ); ?>
	</p>

	<?php endif; ?>

	<?php if ( $is_terms_mode ) : ?>
		<?php echo $terms_markup; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value inside $terms_markup was esc_html()/esc_attr()/esc_url()'d when it was built above; this is pre-escaped markup, not raw user input. ?>
	<?php endif; ?>

</div>
