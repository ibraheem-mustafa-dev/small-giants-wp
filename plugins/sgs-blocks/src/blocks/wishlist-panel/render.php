<?php
/**
 * Server-side render for sgs/wishlist-panel.
 *
 * Renders a heading + a loading skeleton only — the saved-item list is
 * entirely client-populated (`view.js`): it reads the shared wishlist store
 * (`src/shared/wishlist-store/index.js`) for the visitor's ids, then
 * `GET /wc/store/v1/products?include=…` for the product data. There is no
 * server-renderable content here (the wishlist is per-visitor, not
 * per-request-cacheable data PHP has access to at render time), so — unlike
 * `sgs/cart`'s "always render 0" trick — this block simply never emits item
 * markup server-side; `aria-busy` covers the no-JS/loading gap.
 *
 * NO-INLINE (Spec 32): zero inline style property declarations; colours/
 * tiers are a scoped `<style>` block built from $scoped_css.
 *
 * BEM: .sgs-wishlist-panel (root) / __heading / __status / __items /
 * __empty / __row / __row-thumb / __row-info / __row-name / __row-price /
 * __row-stock / __row-actions / __move-to-basket / __remove / __notify-form.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Unused — no InnerBlocks.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';

$heading          = sanitize_text_field( (string) ( $attributes['heading'] ?? __( 'Saved for later', 'sgs-blocks' ) ) );
$empty_text       = sanitize_text_field( (string) ( $attributes['emptyText'] ?? __( 'Your wishlist is empty.', 'sgs-blocks' ) ) );
$empty_link_label = sanitize_text_field( (string) ( $attributes['emptyLinkLabel'] ?? __( 'Continue shopping', 'sgs-blocks' ) ) );
$show_when_empty  = ! empty( $attributes['showWhenEmpty'] );
$show_price       = ! empty( $attributes['showPrice'] );
$show_stock       = ! empty( $attributes['showStock'] );

$shop_url = ( class_exists( 'WooCommerce' ) && function_exists( 'wc_get_page_permalink' ) )
	? wc_get_page_permalink( 'shop' )
	: home_url( '/' );

$uid      = 'sgs-wishlist-panel-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-wishlist-panel';

$scoped_css = array();

$scoped_css[] = sgs_text_states_css( $root_sel . ' .sgs-wishlist-panel__heading', $attributes, array( 'base' => 'headingColour' ) );
$scoped_css[] = sgs_text_states_css( $root_sel . ' .sgs-wishlist-panel__row-name', $attributes, array( 'base' => 'itemNameColour' ) );
$scoped_css[] = sgs_text_states_css( $root_sel . ' .sgs-wishlist-panel__row-price', $attributes, array( 'base' => 'priceColour' ) );
$scoped_css[] = sgs_text_states_css( $root_sel . ' .sgs-wishlist-panel__row-stock', $attributes, array( 'base' => 'stockColour' ) );
$scoped_css[] = sgs_fill_states_css( $root_sel . ' .sgs-wishlist-panel__move-to-basket', $attributes, array( 'base' => 'buttonBackgroundColour' ) );
$scoped_css[] = sgs_text_states_css( $root_sel . ' .sgs-wishlist-panel__move-to-basket', $attributes, array( 'base' => 'buttonTextColour' ) );
$scoped_css[] = sgs_text_states_css(
	$root_sel . ' .sgs-wishlist-panel__remove, ' . $root_sel . ' .sgs-wishlist-panel__notify-toggle',
	$attributes,
	array(
		'base'  => 'linkColour',
		'hover' => 'linkColourHover',
	)
);

// Columns / gap — tier objects, custom properties consumed by style.css
// (`.sgs-wishlist-panel__items{ grid-template-columns:repeat(var(--sgs-wishlist-panel-columns,3),1fr); gap:var(--sgs-wishlist-panel-gap,1rem); }`).
$columns_tiers = sgs_responsive_normalise_object( $attributes['columns'] ?? null, false );
$gap_tiers     = sgs_responsive_normalise_object( $attributes['gap'] ?? null, false );
foreach ( array(
	'desktop' => '',
	'tablet'  => '@media(max-width:1023px)',
	'mobile'  => '@media(max-width:767px)',
) as $tier => $media ) {
	$decls = array();
	$cols  = $columns_tiers[ $tier ] ?? null;
	if ( null !== $cols && '' !== $cols && is_numeric( $cols ) ) {
		$decls[] = '--sgs-wishlist-panel-columns:' . absint( $cols );
	}
	$gap_val = $gap_tiers[ $tier ] ?? null;
	if ( null !== $gap_val && '' !== $gap_val ) {
		$gap_safe = sgs_css_length_value( is_numeric( $gap_val ) ? $gap_val . 'px' : (string) $gap_val );
		if ( '' !== $gap_safe ) {
			$decls[] = '--sgs-wishlist-panel-gap:' . $gap_safe;
		}
	}
	if ( ! $decls ) {
		continue;
	}
	$rule         = $root_sel . '{' . implode( ';', $decls ) . ';}';
	$scoped_css[] = $media ? $media . '{' . $rule . '}' : $rule;
}

$wrapper_attrs = get_block_wrapper_attributes( array( 'class' => $uid ) );

?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php echo wp_strip_all_tags( implode( '', array_filter( $scoped_css ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-sanitised. ?> data-sgs-wishlist-panel data-show-when-empty="<?php echo $show_when_empty ? '1' : '0'; ?>" data-show-price="<?php echo $show_price ? '1' : '0'; ?>" data-show-stock="<?php echo $show_stock ? '1' : '0'; ?>" data-empty-text="<?php echo esc_attr( $empty_text ); ?>" data-empty-link-label="<?php echo esc_attr( $empty_link_label ); ?>" data-shop-url="<?php echo esc_url( $shop_url ); ?>" hidden>
	<h2 class="sgs-wishlist-panel__heading"><?php echo esc_html( $heading ); ?></h2>
	<p class="sgs-wishlist-panel__status" role="status" aria-live="polite" aria-atomic="true" data-sgs-wishlist-status></p>
	<div class="sgs-wishlist-panel__items" data-sgs-wishlist-items aria-busy="true"></div>
</div>
