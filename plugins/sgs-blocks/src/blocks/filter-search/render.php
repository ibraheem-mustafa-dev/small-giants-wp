<?php
/**
 * Server-side render for sgs/filter-search.
 *
 * Renders a type-to-find search input that narrows a WooCommerce attribute
 * filter's chip list. Auto-shown only when the attribute has at least
 * $threshold visible terms (default 16, i.e. more than 15 — the Baymard
 * Institute threshold for showing a type-to-find input).
 *
 * Visibility scoping: get_terms() with hide_empty=true counts only terms
 * attached to at least one published product (WP keeps `term_taxonomy.count`
 * against published posts only), so draft-only terms are excluded.
 *
 * No-JS behaviour: the input is always rendered into the HTML when the
 * threshold is met (it does not depend on JS to appear). view.js only wires
 * the filtering interaction.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

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

$threshold = max( 2, absint( $attributes['threshold'] ?? 16 ) );

// Below threshold — render nothing (the boundary condition).
if ( count( $terms ) < $threshold ) {
	return;
}

$total = count( $terms );

// Unique ID for aria wiring — stable per request/instance.
$uid = wp_unique_id( 'sgs-filter-search-' );

// Placeholder: use operator-supplied value, else an i18n default.
$placeholder = ! empty( $attributes['placeholder'] )
	? $attributes['placeholder']
	: __( 'Type to filter…', 'sgs-blocks' );

// Human-readable attribute label (e.g. "Flavour", "Size").
$attribute_label = function_exists( 'wc_attribute_label' )
	? wc_attribute_label( $attribute_taxonomy )
	: $attribute_taxonomy;

// i18n template strings passed as data-attributes so view.js stays
// translation-correct without hardcoding English in the JS module.
/* translators: %1$d = count of shown options, %2$d = total options */
$shown_template = __( '%1$d of %2$d options shown', 'sgs-blocks' );
$none_text      = __( 'No matching options', 'sgs-blocks' );

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class'                  => 'sgs-filter-search',
		'data-sgs-filter-search' => '',
	)
);

?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is safe. ?>>

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

</div>
