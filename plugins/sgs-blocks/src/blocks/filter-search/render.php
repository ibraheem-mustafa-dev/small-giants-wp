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
 * NO-INLINE (LOCKED per-block no-inline migration contract, 2026-07-10): the
 * rendered wrapper carries ZERO inline CSS property declarations. `margin`
 * is a WP-native style.spacing.margin object; `spacing` declares
 * `__experimentalSkipSerialization` in block.json so
 * get_block_wrapper_attributes() never auto-inlines it — it is instead
 * emitted scoped via wp_style_engine_get_styles() into this block's own
 * `.{uid}` <style> tag. marginTablet / marginMobile are SGS custom object
 * attrs (not WP-native), scoped @media(max-width:1023px)/767px on the same
 * selector.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// ---------------------------------------------------------------------------
// Security sanitisers (contract §D) — a CSS-length sanitiser for box/side
// values (mirrors sgs/label + sgs/heading + sgs/container).
// ---------------------------------------------------------------------------

$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

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

// ---------------------------------------------------------------------------
// Scoped CSS assembly (contract §A). $style_uid is a CLASS — mirrors the
// sgs/heading/sgs/label/sgs/container scoped pattern. Kept distinct from
// $uid above (wp_unique_id, used for the input/label/status ARIA wiring).
// ---------------------------------------------------------------------------

$style_uid = 'sgs-fs-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel  = '.' . $style_uid . '.wp-block-sgs-filter-search';

$scoped_css = array();

// Base margin — WP-native style.spacing.margin object (skip-serialised in
// block.json), emitted scoped via the stable core style engine.
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}
if ( function_exists( 'wp_style_engine_get_styles' ) && ! empty( $base_margin_obj ) ) {
	$base_scoped_styles = wp_style_engine_get_styles(
		array( 'spacing' => array( 'margin' => $base_margin_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// Responsive margin tiers — SGS custom object attrs, hand-built shorthand,
// scoped @media on the same selector (contract §B2: tablet max-width:1023px,
// mobile max-width:767px).
$margin_tablet_obj = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

$margin_tab_val = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val = $sgs_box_shorthand( $margin_mobile_obj );

if ( null !== $margin_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{margin:{$margin_tab_val};}}";
}
if ( null !== $margin_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{margin:{$margin_mob_val};}}";
}

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'class'                  => 'sgs-filter-search ' . $style_uid,
		'data-sgs-filter-search' => '',
	)
);

?>
<?php if ( $scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> breakout. ?></style>
<?php endif; ?>
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
