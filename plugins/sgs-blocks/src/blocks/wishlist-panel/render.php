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
 * Every visible label/text is a block attribute (never hard-coded in
 * `view.js`) — resolved by `render-labels.php` into one data-* attribute map
 * on the root element. URLs (Saved items page, sign-in, shop) are resolved
 * by `render-urls.php`; the new elements' colours by `render-colours.php`.
 * `layout` (grid/list/strip) becomes a root modifier class; the client reads
 * it (`view.js`) to pick its row/bar templates.
 *
 * NO-INLINE (Spec 32): zero inline style property declarations; colours/
 * tiers are a scoped `<style>` block built from $scoped_css.
 *
 * BEM: .sgs-wishlist-panel (root, --list/--strip modifiers) / __heading /
 * __count / __status / __items / __empty / __row / __row-thumb /
 * __row-info / __row-name / __row-price / __row-price-drop / __row-stock /
 * __row-date / __row-actions / __move-to-basket / __remove /
 * __notify-form / __guest-prompt / __bar / __share-field / __view-all.
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
require_once __DIR__ . '/render-urls.php';
require_once __DIR__ . '/render-labels.php';
require_once __DIR__ . '/render-colours.php';

$heading          = sanitize_text_field( (string) ( $attributes['heading'] ?? __( 'Saved for later', 'sgs-blocks' ) ) );
$empty_text       = sanitize_text_field( (string) ( $attributes['emptyText'] ?? __( 'Your wishlist is empty.', 'sgs-blocks' ) ) );
$empty_link_label = sanitize_text_field( (string) ( $attributes['emptyLinkLabel'] ?? __( 'Continue shopping', 'sgs-blocks' ) ) );
$show_when_empty  = ! empty( $attributes['showWhenEmpty'] );
$show_price       = ! empty( $attributes['showPrice'] );
$show_stock       = ! empty( $attributes['showStock'] );
$show_count       = ! empty( $attributes['showCount'] );
$show_sort        = ! empty( $attributes['showSort'] );
$show_date_saved  = ! empty( $attributes['showDateSaved'] );
$show_price_drop  = ! empty( $attributes['showPriceDrop'] );
$show_guest_promo = ! empty( $attributes['showGuestPrompt'] );

$layout_raw = (string) ( $attributes['layout'] ?? 'grid' );
$layout     = in_array( $layout_raw, array( 'grid', 'list', 'strip' ), true ) ? $layout_raw : 'grid';
$max_items  = max( 0, absint( $attributes['maxItems'] ?? 0 ) );

$shop_url        = sgs_wishlist_panel_shop_url();
$view_all_url    = sgs_wishlist_panel_view_all_url( $attributes );
$sign_in_url     = sgs_wishlist_panel_sign_in_url();
$privacy_url     = function_exists( 'get_privacy_policy_url' ) ? get_privacy_policy_url() : '';
$saved_items_url = sgs_wishlist_panel_saved_items_url();

$uid      = 'sgs-wishlist-panel-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-wishlist-panel';

$scoped_css = array();

$scoped_css[] = sgs_text_states_css( $root_sel . ' .sgs-wishlist-panel__heading', $attributes, array( 'base' => 'headingColour' ) );

$item_name_colour = (string) ( $attributes['itemNameColour'] ?? '' );
if ( '' !== $item_name_colour ) {
	$scoped_css[] = sgs_text_states_css( $root_sel . ' .sgs-wishlist-panel__row-name', $attributes, array( 'base' => 'itemNameColour' ) );
} else {
	// No client colour set — default the product-name LINK to the palette's
	// text token, not the site's global link colour (Bean's ruling, lane A
	// commit 6962dd0e6): the brand accent stays available through the
	// block's own itemNameColour control, but is never the unreviewed
	// default (the site's anchor colour can be a low-contrast brand accent
	// on a light surface). Plain scoped selector, same specificity shape as
	// every other rule in this array — a `:where()` wrap here would drop to
	// zero specificity and lose to WordPress's own global link rule
	// (`a:where(:not(.wp-element-button))`, which still carries the bare
	// `a` element's specificity).
	$scoped_css[] = $root_sel . ' .sgs-wishlist-panel__row-name{color:var(--wp--preset--color--text);}';
}
$scoped_css[] = sgs_text_states_css( $root_sel . ' .sgs-wishlist-panel__row-price', $attributes, array( 'base' => 'priceColour' ) );
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
$scoped_css   = array_merge( $scoped_css, sgs_wishlist_panel_new_element_css( $root_sel, $attributes ) );

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

$wrapper_attrs = get_block_wrapper_attributes(
	array( 'class' => 'sgs-wishlist-panel sgs-wishlist-panel--' . $layout . ' ' . $uid )
);

$label_data = sgs_wishlist_panel_label_data( $attributes );

$data_attrs = array(
	'data-sgs-wishlist-panel' => null,
	'data-layout'             => $layout,
	'data-max-items'          => (string) $max_items,
	'data-show-when-empty'    => $show_when_empty ? '1' : '0',
	'data-show-price'         => $show_price ? '1' : '0',
	'data-show-stock'         => $show_stock ? '1' : '0',
	'data-show-count'         => $show_count ? '1' : '0',
	'data-show-sort'          => $show_sort ? '1' : '0',
	'data-show-date-saved'    => $show_date_saved ? '1' : '0',
	'data-show-price-drop'    => $show_price_drop ? '1' : '0',
	'data-show-guest-prompt'  => $show_guest_promo ? '1' : '0',
	'data-empty-text'         => $empty_text,
	'data-empty-link-label'   => $empty_link_label,
	'data-shop-url'           => $shop_url,
	'data-view-all-url'       => $view_all_url,
	'data-sign-in-url'        => $sign_in_url,
	'data-privacy-url'        => $privacy_url,
	'data-saved-items-url'    => $saved_items_url,
);
foreach ( $label_data as $key => $value ) {
	$data_attrs[ 'data-' . $key ] = $value;
}

$attrs_html = '';
foreach ( $data_attrs as $name => $value ) {
	$attrs_html .= null === $value ? ' ' . esc_attr( $name ) : ' ' . esc_attr( $name ) . '="' . esc_attr( $value ) . '"';
}

?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php echo wp_strip_all_tags( implode( '', array_filter( $scoped_css ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-sanitised. ?><?php echo $attrs_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value above is esc_attr()'d in the loop. ?> hidden>
	<div class="sgs-wishlist-panel__bar-top">
		<h2 class="sgs-wishlist-panel__heading"><?php echo esc_html( $heading ); ?><span class="sgs-wishlist-panel__count" data-sgs-wishlist-count hidden></span></h2>
		<a class="sgs-wishlist-panel__view-all" href="<?php echo esc_url( $view_all_url ); ?>" data-sgs-wishlist-view-all hidden></a>
	</div>
	<p class="sgs-wishlist-panel__status" role="status" aria-live="polite" aria-atomic="true" data-sgs-wishlist-status></p>
	<div class="sgs-wishlist-panel__bars" data-sgs-wishlist-bars></div>
	<div class="sgs-wishlist-panel__items" data-sgs-wishlist-items aria-busy="true"></div>
</div>
