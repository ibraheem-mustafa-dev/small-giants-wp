<?php
/**
 * Server-side render for sgs/order-items (Spec 27, order confirmation).
 *
 * Prints the viewed order's line items: a thumbnail, "quantity × name", the chosen options and the line price, then
 * the totals rows the editor switched on. The order is the one on WooCommerce's order-received endpoint, read through
 * `Order_Binding::viewable_order()` (the same key, owner and email-verification check as the sgs/order binding and
 * WooCommerce's own order-confirmation blocks); a visitor who may not view it gets nothing. The editor canvas shows a
 * sample order.
 *
 * Thumbnails print through the shared media renderer (`thumb` item slot, Spec 49 §10.4). NO-INLINE (Spec 32): every
 * declaration goes into one scoped `<style>`.
 *
 * BEM: .sgs-order-items (root) / __list / __row / __thumb / __main / __qty / __name / __meta / __price / __totals /
 * __totals-row / __label / __value / __total.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    Unused: no InnerBlocks.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/product-card-media.php';
require_once dirname( __DIR__, 3 ) . '/includes/order-items/helpers-order-items.php';
require_once dirname( __DIR__, 3 ) . '/includes/cart-line-summary/wording.php';
require_once dirname( __DIR__, 3 ) . '/includes/cart-line-summary/functions.php';

$in_editor = is_admin() || ( defined( 'REST_REQUEST' ) && REST_REQUEST );
if ( $in_editor ) {
	$data = sgs_order_items_sample();
} else {
	$sgs_order = class_exists( '\SGS\Blocks\Order_Binding' ) ? \SGS\Blocks\Order_Binding::viewable_order() : null;
	if ( null === $sgs_order ) {
		return;
	}
	$data = sgs_order_items_data( $sgs_order );
}

$flag  = static function ( string $key ) use ( $attributes ): bool {
	return ! array_key_exists( $key, $attributes ) || ! empty( $attributes[ $key ] );
};
$label = static function ( string $key, string $fallback ) use ( $attributes ): string {
	$text = sanitize_text_field( (string) ( $attributes[ $key ] ?? '' ) );
	return '' !== $text ? $text : $fallback;
};

$uid      = 'sgs-order-items-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-order-items';
$scoped   = array();
$tiered   = sgs_object_attr_keys( $block );
// The shop's wording option decides whether an option prints as "Label: value" or as its value alone, through the
// helper and separator the basket drawer, basket and checkout use.
$values_only = 'values' === ( \SGS\Blocks\sgs_cart_line_summary_wording()['labelFormat'] ?? 'labelled' );

// Card spacing and the gap between rows.
$scoped[] = sgs_emit_responsive_css(
	$root_sel,
	array(
		array(
			'value'        => $attributes['padding'] ?? null,
			'css'          => 'padding',
			'box'          => true,
			'unit_default' => 'px',
		),
		array(
			'value'        => $attributes['margin'] ?? null,
			'css'          => 'margin',
			'box'          => true,
			'unit_default' => 'px',
		),
	)
);
$scoped[] = sgs_emit_responsive_css(
	$root_sel . ' .sgs-order-items__list',
	array(
		array(
			'value'        => $attributes['rowGap'] ?? null,
			'css'          => 'gap',
			'unit_default' => 'px',
		),
	)
);

// Divider under each item.
$row_sel    = $root_sel . ' .sgs-order-items__row';
$row_border = sgs_border_element_decls(
	$attributes,
	'row',
	$row_sel,
	array(
		'colour' => array( 'base' => 'rowBorderColour' ),
		'radius' => false,
	)
);
$scoped[]   = sgs_emit_tier_decls(
	$row_sel,
	array(
		'desktop' => $row_border['base'],
		'tablet'  => $row_border['tablet'],
		'mobile'  => $row_border['mobile'],
	)
);
$scoped     = array_merge( $scoped, $row_border['rules'] );
$scoped[]   = sgs_emit_responsive_css(
	$row_sel,
	array(
		array(
			'value'        => $attributes['rowPadding'] ?? null,
			'css'          => 'padding',
			'box'          => true,
			'unit_default' => 'px',
		),
	)
);
$row_align = (string) ( $attributes['rowAlign'] ?? '' );
if ( in_array( $row_align, array( 'start', 'center', 'end' ), true ) ) {
	$scoped[] = $row_sel . '{align-items:' . $row_align . ';}';
}

// Totals block: its border (a top rule when only the top side is set) and padding.
$totals_sel    = $root_sel . ' .sgs-order-items__totals';
$totals_border = sgs_border_element_decls(
	$attributes,
	'totals',
	$totals_sel,
	array(
		'colour' => array( 'base' => 'totalsBorderColour' ),
		'radius' => false,
	)
);
$scoped[]      = sgs_emit_tier_decls(
	$totals_sel,
	array(
		'desktop' => $totals_border['base'],
		'tablet'  => $totals_border['tablet'],
		'mobile'  => $totals_border['mobile'],
	)
);
$scoped        = array_merge( $scoped, $totals_border['rules'] );
$scoped[]      = sgs_emit_responsive_css(
	$totals_sel,
	array(
		array(
			'value'        => $attributes['totalsPadding'] ?? null,
			'css'          => 'padding',
			'box'          => true,
			'unit_default' => 'px',
		),
	)
);

// Text: colour and typography per part.
$scoped[] = sgs_text_states_css( $root_sel . ' .sgs-order-items__name', $attributes, array( 'base' => 'itemNameColour' ) );
$scoped[] = sgs_text_states_css( $root_sel . ' .sgs-order-items__meta', $attributes, array( 'base' => 'itemMetaColour' ) );
$scoped[] = sgs_text_states_css( $root_sel . ' .sgs-order-items__price', $attributes, array( 'base' => 'itemPriceColour' ) );
$scoped[] = sgs_text_states_css( $root_sel . ' .sgs-order-items__totals', $attributes, array( 'base' => 'totalsColour' ) );
$parts = array(
	'itemName'  => '.sgs-order-items__name',
	'itemMeta'  => '.sgs-order-items__meta',
	'itemPrice' => '.sgs-order-items__price',
	'totals'    => '.sgs-order-items__totals',
	'total'     => '.sgs-order-items__total',
);
foreach ( $parts as $prefix => $part_sel ) {
	$scoped[] = sgs_typography_css_rule( $attributes, $prefix, $root_sel . ' ' . $part_sel, '', false, false, $tiered );
}
$scoped[] = sgs_text_states_css( $root_sel . ' .sgs-order-items__total', $attributes, array( 'base' => 'totalColour' ) );

// Thumbnails: one slot, one set of rules for every row.
$thumb_css   = '';
$thumb_first = true;

ob_start();
?>
<ul class="sgs-order-items__list">
	<?php foreach ( $data['lines'] as $line ) : ?>
		<?php
		$thumb_html = '';
		if ( $flag( 'showThumbnail' ) && (int) $line['image_id'] > 0 ) {
			$out        = sgs_pcm_render(
				'thumb',
				$attributes,
				$uid . '-thumb',
				array(
					'source'     => sgs_pcm_source( (string) wp_get_attachment_image_url( (int) $line['image_id'], 'medium' ), 0, 0, (int) $line['image_id'] ),
					'alt'        => '',
					'decorative' => true,
					'block'      => 'sgs/order-items',
				)
			);
			$thumb_html = (string) $out['html'];
			if ( $thumb_first && '' !== $thumb_html ) {
				// The renderer scopes its rules to the thumbnail's own single class (0,1,0), which loses to a shop theme's
				// `.woocommerce img { height: auto }` (0,1,1). Naming the block's scope class first lifts every rule to 0,2,0.
				$thumb_css   = str_replace( '.' . $uid . '-thumb', '.' . $uid . ' .' . $uid . '-thumb', (string) $out['css'] );
				$thumb_first = false;
			}
		}
		?>
		<li class="sgs-order-items__row">
			<?php if ( $flag( 'showThumbnail' ) ) : ?>
				<span class="sgs-order-items__thumb"><?php echo $thumb_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the shared media renderer escapes its own markup. ?></span>
			<?php endif; ?>
			<div class="sgs-order-items__main">
				<p class="sgs-order-items__name"><span class="sgs-order-items__qty"><?php echo esc_html( (string) $line['qty'] ); ?> &times;</span> <?php echo esc_html( $line['name'] ); ?></p>
				<?php if ( $flag( 'showMeta' ) && array() !== $line['meta'] ) : ?>
					<ul class="sgs-order-items__meta">
						<?php if ( $values_only ) : ?>
							<?php foreach ( \SGS\Blocks\sgs_cart_line_summary_lines( array( 'attributes' => $line['meta'], 'labelFormat' => 'values' ) ) as $meta_line ) : ?>
								<li><?php echo esc_html( $meta_line ); ?></li>
							<?php endforeach; ?>
						<?php else : ?>
							<?php foreach ( $line['meta'] as $entry ) : ?>
								<li><span class="sgs-order-items__meta-label"><?php echo esc_html( $entry['label'] ); ?>:</span> <?php echo esc_html( $entry['value'] ); ?></li>
							<?php endforeach; ?>
						<?php endif; ?>
					</ul>
				<?php endif; ?>
			</div>
			<span class="sgs-order-items__price"><?php echo wp_kses_post( $line['price'] ); ?></span>
		</li>
	<?php endforeach; ?>
</ul>
<?php
$rows = array();
if ( $flag( 'showSubtotal' ) && '' !== $data['subtotal'] ) {
	$rows[] = array( 'subtotal', $label( 'subtotalLabel', __( 'Subtotal', 'sgs-blocks' ) ), '', $data['subtotal'] );
}
if ( $flag( 'showDelivery' ) && '' !== $data['delivery'] ) {
	$method = $flag( 'showDeliveryMethod' ) ? $data['delivery_method'] : '';
	$rows[] = array( 'delivery', $label( 'deliveryLabel', __( 'Delivery', 'sgs-blocks' ) ), $method, $data['delivery'] );
}
if ( $flag( 'showDiscount' ) && '' !== $data['discount'] ) {
	$rows[] = array( 'discount', $label( 'discountLabel', __( 'Discount', 'sgs-blocks' ) ), '', $data['discount'] );
}
if ( $flag( 'showGiftCard' ) && '' !== $data['gift_card'] ) {
	$rows[] = array( 'gift-card', $label( 'giftCardLabel', __( 'Gift card', 'sgs-blocks' ) ), '', $data['gift_card'] );
}
if ( $flag( 'showTotal' ) && '' !== $data['total'] ) {
	$rows[] = array( 'total', $label( 'totalLabel', __( 'Total', 'sgs-blocks' ) ), '', $data['total'] );
}
if ( array() !== $rows ) :
	?>
	<dl class="sgs-order-items__totals">
		<?php foreach ( $rows as $row ) : ?>
			<div class="sgs-order-items__totals-row sgs-order-items__totals-row--<?php echo esc_attr( $row[0] ); ?><?php echo 'total' === $row[0] ? ' sgs-order-items__total' : ''; ?>">
				<dt class="sgs-order-items__label"><?php echo esc_html( $row[1] ); ?><?php echo '' !== $row[2] ? ' <span class="sgs-order-items__label-note">(' . esc_html( $row[2] ) . ')</span>' : ''; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the note is escaped here. ?></dt>
				<dd class="sgs-order-items__value"><?php echo wp_kses_post( $row[3] ); ?></dd>
			</div>
		<?php endforeach; ?>
	</dl>
<?php endif; ?>
<?php
$inner    = (string) ob_get_clean();
$scoped[] = $thumb_css;
$wrapper  = get_block_wrapper_attributes( array( 'class' => 'sgs-order-items ' . $uid ) );

?>
<style>
	<?php echo wp_strip_all_tags( implode( '', array_filter( $scoped ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value is pre-sanitised by the shared helpers. ?>
</style>
<div <?php echo $wrapper; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-sanitised. ?>>
	<?php echo $inner; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built above from escaped parts. ?>
</div>
