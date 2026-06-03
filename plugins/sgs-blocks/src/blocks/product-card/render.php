<?php
/**
 * Server-side render for the SGS Product Card block.
 *
 * Two modes, branched on the explicit `sourceMode` attribute (R-22-14 — never
 * `empty( $content )`):
 *
 *  - 'typed' (default): renders the card wrapper shell and echoes $content
 *    (InnerBlocks). UNCHANGED FR-22-6 behaviour — preserves every existing
 *    typed post + the clone-pipeline output.
 *
 *  - 'wc-product' / 'sgs-cpt' (Bound): resolves a real product (WooCommerce or
 *    sgs_product CPT), seeds the Interactivity API state from the product's
 *    _sgs_variation_sets layer, and renders a live card with reactive
 *    price/image swapping plus an optional add-to-cart button. All initial
 *    values are server-rendered, so the card is fully meaningful with no JS.
 *
 * Shell classes:
 *  - standard: .product-card
 *  - trial:    .product-card .trial-card
 *  - featured: .product-card .featured-card
 *
 * @since 1.1.0
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks HTML (typed mode only).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$variant_style  = $attributes['variantStyle'] ?? 'standard';
$source_mode    = $attributes['sourceMode'] ?? 'typed';
$card_max_width = isset( $attributes['cardMaxWidth'] ) ? sanitize_text_field( $attributes['cardMaxWidth'] ) : '';

$classes = array( 'product-card' );
if ( 'trial' === $variant_style ) {
	$classes[] = 'trial-card';
}
if ( 'featured' === $variant_style ) {
	$classes[] = 'featured-card';
}

/* ── Build inline style for per-block cardMaxWidth override ─────────────────── */

$inline_style = '';
if ( '' !== $card_max_width ) {
	// Sanitise: allow ONLY a single CSS length (digits+unit) OR a calc() of
	// digits/units/operators. Both ends anchored (^…$) so no trailing CSS can
	// be appended — prevents CSS injection into the inline style attribute
	// (a prefix-only match like "380px; } body{…}" is rejected). esc_attr is
	// belt-and-braces; the anchored allowlist already excludes ; : { } < \.
	if ( preg_match( '/^(?:[\d.]+(?:%|px|em|rem|vw|vh|ch|ex|fr|cm|mm|in|pt|pc)|calc\([\d.\s+\-*\/%a-z()]+\))$/i', $card_max_width ) ) {
		$inline_style = '--sgs-product-card-max-width:' . esc_attr( $card_max_width ) . ';';
	}
}

/* ── Typed mode (default) — unchanged FR-22-6 behaviour ────────────────────── */

if ( 'typed' === $source_mode ) {
	$wrapper_args = array( 'class' => implode( ' ', $classes ) );
	if ( '' !== $inline_style ) {
		$wrapper_args['style'] = $inline_style;
	}
	$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );
	?>
	<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-escaped. ?>>
		<?php
		// All card content rendered via InnerBlocks. No scalar-attr render — R-22-14.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $content is WP core InnerBlocks output.
		echo $content;
		?>
	</div>
	<?php
	return;
}

/* ── Bound mode — resolve a real product ───────────────────────────────────── */

require_once dirname( __DIR__, 3 ) . '/includes/class-product-bindings.php';

$product_id = absint( $attributes['productId'] ?? 0 );
$data       = \SGS\Blocks\Product_Bindings::get_product_data( $product_id, $source_mode );

$classes[] = 'product-card--bound';

// Designed empty state (FR-24-6) — never blank.
if ( null === $data ) {
	$empty_args = array( 'class' => implode( ' ', $classes ) . ' product-card--empty' );
	if ( '' !== $inline_style ) {
		$empty_args['style'] = $inline_style;
	}
	$wrapper_attributes = get_block_wrapper_attributes( $empty_args );
	?>
	<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-escaped. ?>>
		<div class="product-card-body">
			<p class="product-desc">
				<?php esc_html_e( 'No product selected. Choose a product in the block settings.', 'sgs-blocks' ); ?>
			</p>
		</div>
	</div>
	<?php
	return;
}

/*
 * Build the variations map from _sgs_variation_sets (R-22-9).
 *
 * Each variation type lists content_impact slots (price, image, …) and options.
 * Phase 1 stores only key + label per option (no per-option price/image), so
 * every option currently inherits the base product data. The map is keyed by
 * option key so view.js can resolve values reactively; when per-option pricing
 * lands (SKU matrix, Phase 2) only this loop changes — the directives stay
 * identical.
 *
 * The pill set is the FIRST variation type whose display_as is 'pills'
 * (matches the editor's first-type-wins rule, FR-24-14).
 */

$variation_sets = is_array( $data['variation_sets'] ) ? $data['variation_sets'] : array();
$pill_type      = null;

foreach ( $variation_sets as $vtype ) {
	if ( ! is_array( $vtype ) ) {
		continue;
	}
	$display_as = $vtype['display_as'] ?? 'pills';
	if ( 'pills' === $display_as && ! empty( $vtype['options'] ) ) {
		$pill_type = $vtype;
		break;
	}
}

$variations_map = array();
$first_key      = '';

if ( null !== $pill_type ) {
	$content_impact = isset( $pill_type['content_impact'] ) && is_array( $pill_type['content_impact'] )
		? array_map( 'sanitize_key', $pill_type['content_impact'] )
		: array();

	foreach ( $pill_type['options'] as $opt ) {
		if ( empty( $opt['key'] ) ) {
			continue;
		}
		$opt_key = sanitize_key( $opt['key'] );
		if ( '' === $opt_key ) {
			continue;
		}
		if ( '' === $first_key ) {
			$first_key = $opt_key;
		}

		// Base data for every option; per-option overrides arrive with the
		// SKU matrix (R-22-9 — values are driven by declared product data).
		$in_stock = ( '' === $data['stock_status'] )
			|| ( false === stripos( $data['stock_status'], 'out of stock' ) );

		$variations_map[ $opt_key ] = array(
			'price'    => $data['price_html'],
			'image'    => $data['image_url'],
			'imageAlt' => $data['image_alt'],
			'inStock'  => $in_stock,
			'impacts'  => $content_impact,
		);
	}
}

/* ── Seed Interactivity API state + per-instance context ───────────────────── */

$add_to_cart_id = absint( $data['wc_id'] );

wp_interactivity_state(
	'sgs/product-card',
	array(
		'variations' => array(
			(string) $data['id'] => $variations_map,
		),
	)
);

// Seed the reactive display values into CONTEXT (server-resolvable plain
// data) — NOT JS-only `state` getters. The WP Interactivity API processes
// `data-wp-bind`/`data-wp-text` server-side; a directive pointing at a
// JS-defined getter resolves to empty server-side and WIPES the SSR value.
// Binding to seeded context keeps SSR correct AND stays client-reactive
// (view.js mutates these same context keys on pill selection).
$context = array(
	'productId'   => (string) $data['id'],
	'selected'    => $first_key,
	'addToCartId' => $add_to_cart_id,
	'imageSrc'    => $data['image_url'],
	'imageAlt'    => $data['image_alt'],
	'cartStatus'  => '',

	/*
	 * A4 (QC): pending flag — prevents add-to-cart spam clicks.
	 * Seeded false here so the SSR button is enabled and meaningful with no JS.
	 * view.js sets this true before the fetch and false in the finally clause.
	 */
	'pending'     => false,
);

$bound_args = array( 'class' => implode( ' ', $classes ) );
if ( '' !== $inline_style ) {
	$bound_args['style'] = $inline_style;
}
$wrapper_attributes = get_block_wrapper_attributes( $bound_args );
?>
<div
	<?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-escaped. ?>
	data-wp-interactive="sgs/product-card"
	<?php echo wp_interactivity_data_wp_context( $context ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- helper returns escaped attribute markup. ?>
	data-wp-on--sgs:option-selected="actions.handlePillSelect"
>
	<?php if ( '' !== $data['image_url'] ) : ?>
		<img
			class="product-card-img"
			src="<?php echo esc_url( $data['image_url'] ); ?>"
			alt="<?php echo esc_attr( $data['image_alt'] ); ?>"
			loading="eager"
			fetchpriority="high"
			decoding="async"
			data-wp-bind--src="context.imageSrc"
			data-wp-bind--alt="context.imageAlt"
		>
	<?php endif; ?>

	<div class="product-card-body">
		<h3><?php echo esc_html( $data['title'] ); ?></h3>

		<?php if ( '' !== $data['short_desc'] ) : ?>
			<div class="product-desc">
				<?php echo wp_kses_post( $data['short_desc'] ); ?>
			</div>
		<?php endif; ?>

		<?php
		// Pills — reuse the sgs/option-picker block (DRY) so its verified view.js
		// fires the sgs:option-selected event the wrapper listens for above.
		if ( null !== $pill_type ) :
			$picker_options = array();
			foreach ( $pill_type['options'] as $opt ) {
				if ( empty( $opt['key'] ) ) {
					continue;
				}
				$picker_options[] = array(
					'key'   => sanitize_key( $opt['key'] ),
					'label' => isset( $opt['label'] ) ? sanitize_text_field( $opt['label'] ) : '',
				);
			}
			$picker_impacts = isset( $pill_type['content_impact'] ) && is_array( $pill_type['content_impact'] )
				? array_map( 'sanitize_key', $pill_type['content_impact'] )
				: array();

			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
			echo render_block(
				array(
					'blockName' => 'sgs/option-picker',
					'attrs'     => array(
						'label'           => $pill_type['type_label'] ?? __( 'Choose an option', 'sgs-blocks' ),
						'showLabel'       => true,
						'optionItems'     => $picker_options,
						'defaultSelected' => $first_key,
						'contentImpact'   => $picker_impacts,
						'typeKey'         => sanitize_key( $pill_type['type_key'] ?? '' ),
					),
				)
			);
		endif;
		?>

		<div class="price-row" aria-live="polite">
			<?php
			// Static SSR price. For a VARIABLE product we show "From <min>" — a
			// single inviting price reads far better than a bare range
			// (£9.99–£59.99) before a variation is chosen (the min is tax-correct
			// via wc_get_price_to_display in the resolver). Simple products / CPT
			// show the exact price. NOT reactive in Phase 1: when per-variation
			// pricing lands (FR-27-A2), the selected price binds to a seeded
			// context key (NOT a JS-only `state` getter — that wipes the SSR
			// value server-side).
			if ( ! empty( $data['is_variable'] ) && ! empty( $data['price_from_html'] ) ) :
				?>
				<div class="price price--from">
					<span class="price-from-label"><?php esc_html_e( 'From', 'sgs-blocks' ); ?></span>
					<span class="price-from-amount"><?php echo wp_kses_post( $data['price_from_html'] ); ?></span>
				</div>
			<?php else : ?>
				<div class="price">
					<?php echo wp_kses_post( $data['price_html'] ); ?>
				</div>
			<?php endif; ?>
		</div>

		<?php if ( $add_to_cart_id > 0 ) : ?>
			<?php
			/*
			 * A3 (QC): progressive-enhancement add-to-cart.
			 * Rendered as an <a> linking to the product permalink so the action
			 * works without JS (user lands on the product page).
			 * With JS, the Interactivity API intercepts the click via
			 * data-wp-on--click="actions.addToCart" which calls preventDefault()
			 * and uses the Store API instead.
			 *
			 * A4 (QC): spam guard via context.pending.
			 * data-wp-bind--disabled + aria-busy reflect the in-flight state;
			 * view.js guards the action at the top (if pending, return early).
			 */
			$product_permalink = esc_url( get_permalink( $add_to_cart_id ) );
			?>
			<a
				href="<?php echo $product_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- already esc_url'd above. ?>"
				class="btn btn-primary product-card__add-to-cart"
				data-wp-on--click="actions.addToCart"
				data-wp-bind--disabled="context.pending"
				data-wp-bind--aria-busy="context.pending"
				role="button"
			>
				<svg class="product-card__cart-icon" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
				<span class="product-card__cart-label"><?php esc_html_e( 'Add to Cart', 'sgs-blocks' ); ?></span>
			</a>
			<p
				class="product-card__cart-status sgs-sr-only"
				role="status"
				aria-live="polite"
				data-wp-text="context.cartStatus"
			></p>
		<?php endif; ?>
	</div>
</div>
<?php
// `data-wp-text="state.currentPriceText"` shows the resolved price as plain text
// once JS hydrates; the SSR markup above carries the full price HTML (ranges,
// strikethrough sale prices) for the no-JS / pre-hydration case.
