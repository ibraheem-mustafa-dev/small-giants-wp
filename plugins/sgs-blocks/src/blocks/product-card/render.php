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
require_once dirname( __DIR__, 3 ) . '/includes/class-product-manifest.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-configurator-compat.php';

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

/* ── FR-27-A5: WC below the version floor → read-only card (no configurator JS) */

/*
 * When the bound product is a WC variable product but the live WooCommerce is
 * older than the configurator floor (Sgs_Configurator_Compat::MIN_WC), render a
 * STATIC read-only card: image, title, "From" price, and a link to the product
 * page where WC's own UI handles purchase. No data-wp-interactive, no pickers,
 * no add-to-cart JS. A dismissible admin notice (the compat class) tells the
 * operator to update WooCommerce. Never a silent break (FR-27-A5). The gate is
 * filterable (`sgs_configurator_supported`) so it is testable without a WC
 * downgrade. Bound-branch only — page-144 Typed clones never reach this.
 */
if ( 'wc-product' === $source_mode && ! empty( $data['is_variable'] ) && ! \SGS\Blocks\Sgs_Configurator_Compat::is_supported() ) {
	$ro_classes   = $classes;
	$ro_classes[] = 'product-card--readonly';
	$ro_args      = array( 'class' => implode( ' ', $ro_classes ) );
	if ( '' !== $inline_style ) {
		$ro_args['style'] = $inline_style;
	}
	$wrapper_attributes = get_block_wrapper_attributes( $ro_args );
	$ro_permalink       = $data['wc_id'] ? esc_url( get_permalink( $data['wc_id'] ) ) : '';
	?>
	<div <?php echo $wrapper_attributes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- pre-escaped. ?>>
		<?php if ( '' !== $data['image_url'] ) : ?>
			<img class="product-card-img" src="<?php echo esc_url( $data['image_url'] ); ?>" alt="<?php echo esc_attr( $data['image_alt'] ); ?>" loading="lazy" decoding="async">
		<?php endif; ?>
		<div class="product-card-body">
			<h3><?php echo esc_html( $data['title'] ); ?></h3>
			<?php if ( '' !== $data['short_desc'] ) : ?>
				<div class="product-desc"><?php echo wp_kses_post( $data['short_desc'] ); ?></div>
			<?php endif; ?>
			<div class="price-row">
				<?php if ( ! empty( $data['price_from_html'] ) ) : ?>
					<div class="price price--from">
						<span class="price-from-label"><?php esc_html_e( 'From', 'sgs-blocks' ); ?></span>
						<span class="price-from-amount"><?php echo wp_kses_post( $data['price_from_html'] ); ?></span>
					</div>
				<?php elseif ( ! empty( $data['price_html'] ) ) : ?>
					<div class="price"><?php echo wp_kses_post( $data['price_html'] ); ?></div>
				<?php endif; ?>
			</div>
			<?php if ( '' !== $ro_permalink ) : ?>
				<a class="btn btn-primary product-card__view" href="<?php echo $ro_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- already esc_url'd. ?>"><?php esc_html_e( 'View product', 'sgs-blocks' ); ?></a>
			<?php endif; ?>
		</div>
	</div>
	<?php
	return;
}

/* ── Bound variable-product branch (U3) ────────────────────────────────────── */

/*
 * When the resolved product is a WooCommerce variable product AND the manifest
 * builds successfully, render the full interactive variable card seeded entirely
 * from live WC data.
 *
 * Scope guardrail (blub.db 304): ONLY the wc-product variable branch reaches
 * this new code path. Typed page-144 clones use the 'typed' branch above and
 * are byte-identical to before — no shared rule is touched.
 */
if ( 'wc-product' === $source_mode && ! empty( $data['is_variable'] ) ) {
	$manifest = \SGS\Blocks\Product_Manifest::build( $product_id );

	if ( null !== $manifest ) {
		// ── 2a. Build the seeded context ──────────────────────────────────────

		$decimals = $manifest['decimals'];
		$def      = $manifest['combos'][ $manifest['defaultKey'] ];

		// Pre-format display strings server-side so SSR text == seeded value
		// (SSR-wipe-safe — see MEMORY rule wp-interactivity-directives-wipe-ssr).
		$price_display   = html_entity_decode( wp_strip_all_tags( wc_price( $def['priceMinor'] / 10 ** $decimals ) ), ENT_QUOTES, 'UTF-8' );
		$show_sale       = ( null !== $def['saleMinor'] );
		$regular_display = $show_sale
			? html_entity_decode( wp_strip_all_tags( wc_price( $def['regularMinor'] / 10 ** $decimals ) ), ENT_QUOTES, 'UTF-8' )
			: '';
		$pct_display = '';
		if ( $def['pctOff'] > 0 ) {
			/* translators: %d is the discount percentage, e.g. "30% off". */
			$pct_display = sprintf( __( '%d%% off', 'sgs-blocks' ), $def['pctOff'] );
		}
		$stock_text  = $def['inStock'] ? '' : __( 'Out of stock', 'sgs-blocks' );
		$image_src   = '' !== $def['imageUrl'] ? $def['imageUrl'] : $data['image_url'];

		// Context array — manifest lives here (M-C3: NOT in wp_interactivity_state).
		$context = array(
			'productId'           => (string) $data['id'],
			'addToCartId'         => absint( $data['wc_id'] ),
			'decimals'            => $decimals,
			'currencySymbol'      => $manifest['currencySymbol'],
			'combos'              => $manifest['combos'],
			'axes'                => $manifest['axes'],
			'selectedAxes'        => $manifest['defaultAxes'],
			'selectedKey'         => $manifest['defaultKey'],
			'selectedVariationId' => (int) $def['variationId'],
			// ── display literals (default; == the SSR span text — SSR-wipe-safe) ──
			'priceDisplay'        => $price_display,
			'regularDisplay'      => $regular_display,
			'pctDisplay'          => $pct_display,
			'showSale'            => $show_sale,
			'hideSale'            => ! $show_sale,
			'stockText'           => $stock_text,
			'inStock'             => (bool) $def['inStock'],
			'imageSrc'            => $image_src,
			'imageAlt'            => $data['image_alt'],
			'cartStatus'          => '',
			'pending'             => false,
			// U7: wp_rest nonce for the SGS cart proxy (X-WP-Nonce header).
			// Guests receive a per-tick shared nonce — acceptable WC parity for
			// Phase 1; the proxy returns a clear 403 "reload" message when stale.
			'restNonce'           => wp_create_nonce( 'wp_rest' ),
			// U5: polite live-region seed — empty string so data-wp-text resolves
			// to the seeded value server-side (SSR-wipe-safe). view.js writes
			// non-empty strings here after selections + post-409 re-syncs.
			'availabilityNote'    => '',
		);

		// M-C9 hard cap: 24 KB max serialised context — never trips for 48 SKUs
		// (~6 KB), but guard is here to future-proof larger catalogues.
		if ( strlen( wp_json_encode( $context ) ) > 24576 ) {
			// Cap exceeded — fall through to the existing non-interactive "From" card.
			unset( $context, $manifest, $def );
		} else {
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
	data-wp-init="callbacks.initPillBridge"
>
			<?php if ( '' !== $image_src ) : ?>
		<img
			class="product-card-img"
			src="<?php echo esc_url( $image_src ); ?>"
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
			// ── 2b. Render TWO option-picker blocks — Size then Flavour ──────────
			foreach ( $manifest['axes'] as $axis ) {
				// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
				echo render_block(
					array(
						'blockName' => 'sgs/option-picker',
						'attrs'     => array(
							'label'           => $axis['label'],
							'showLabel'       => true,
							'optionItems'     => array_map(
								static function ( $t ) {
									return array(
										'key'   => $t['slug'],
										'label' => $t['label'],
									);
								},
								$axis['terms']
							),
							'defaultSelected' => $manifest['defaultAxes'][ $axis['taxonomy'] ] ?? '',
							'typeKey'         => $axis['taxonomy'],
						),
					)
				);
			}
			?>

			<?php // ── 2c. Price slot — bound to seeded context literals (SSR-wipe-safe). ?>
		<div class="price-row" aria-live="polite">
			<span
				class="price price--current"
				data-wp-text="context.priceDisplay"
			><?php echo esc_html( $price_display ); ?></span>
			<s
				class="price--regular"
				data-wp-bind--hidden="context.hideSale"
				data-wp-text="context.regularDisplay"
			><?php echo esc_html( $regular_display ); ?></s>
			<span
				class="price--pct-off"
				data-wp-bind--hidden="context.hideSale"
				data-wp-text="context.pctDisplay"
			><?php echo esc_html( $pct_display ); ?></span>
		</div>

			<?php // ── 2d. Stock slot — hidden when in stock (default). ?>
		<p
			class="product-card__stock"
			role="status"
			aria-live="polite"
			data-wp-bind--hidden="context.inStock"
			data-wp-text="context.stockText"
		><?php echo esc_html( $stock_text ); ?></p>

			<?php // ── 2e. U5: availability live region — polite, visually hidden. ?>
		<p
			class="product-card__availability sgs-sr-only"
			role="status"
			aria-live="polite"
			data-wp-text="context.availabilityNote"
		></p>

			<?php
			// ── 2f. Add-to-cart <a> — UNCHANGED in U3 (U7 rewires). ─────────────
			$add_to_cart_id = absint( $data['wc_id'] );
			if ( $add_to_cart_id > 0 ) :
				$product_permalink = esc_url( get_permalink( $add_to_cart_id ) );
				?>
			<form
				class="product-card__cart-form"
				method="post"
				action="<?php echo $product_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- already esc_url'd above. ?>"
				data-wp-on--submit="actions.addToCart"
			>
				<button
					type="submit"
					class="btn btn-primary product-card__add-to-cart"
					data-wp-bind--disabled="context.pending"
					data-wp-bind--aria-busy="context.pending"
				>
					<svg class="product-card__cart-icon" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
					<span class="product-card__cart-label"><?php esc_html_e( 'Add to Cart', 'sgs-blocks' ); ?></span>
				</button>
			</form>
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
			return;
		} // end if cap OK.
	} // end if manifest non-null.
} // end variable branch.

/* ── Non-variable Bound mode (simple WC product / CPT / cap-exceeded fallback) */

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

$first_key = '';

if ( null !== $pill_type ) {
	// Resolve the default (first valid) option key for the no-JS selected state.
	// Per-option commerce data is NOT seeded here: simple/CPT Bound cards have no
	// per-option price/image (the live per-variation manifest is the WC-variable
	// branch above, FR-27-A2). The pill swap is dormant on this path by design.
	foreach ( $pill_type['options'] as $opt ) {
		$opt_key = empty( $opt['key'] ) ? '' : sanitize_key( $opt['key'] );
		if ( '' !== $opt_key ) {
			$first_key = $opt_key;
			break;
		}
	}
}

/* ── Seed Interactivity API state + per-instance context ───────────────────── */

$add_to_cart_id = absint( $data['wc_id'] );

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

	// U7: wp_rest nonce for the SGS cart proxy (X-WP-Nonce header).
	// Guests receive a per-tick shared nonce — acceptable WC parity for
	// Phase 1; the proxy returns a clear 403 "reload" message when stale.
	'restNonce'   => wp_create_nonce( 'wp_rest' ),
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
	data-wp-init="callbacks.initPillBridge"
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
			 * A3 (QC) + U9 (FR-27-B1): progressive-enhancement add-to-cart.
			 * A native <button type="submit"> activates on BOTH Space and Enter
			 * (an <a role=button> fires on Enter only — a WCAG 2.1.1 failure
			 * axe-core does not catch). The wrapping <form action=permalink> is
			 * the no-JS fallback: submitting lands the visitor on the product
			 * page (identical UX to the previous <a href>). With JS, the
			 * Interactivity API intercepts data-wp-on--submit, preventDefault()s
			 * the navigation, and routes the add through the secure proxy.
			 *
			 * A4 (QC): spam guard via context.pending.
			 * data-wp-bind--disabled + aria-busy reflect the in-flight state;
			 * view.js guards the action at the top (if pending, return early).
			 */
			$product_permalink = esc_url( get_permalink( $add_to_cart_id ) );
			?>
			<form
				class="product-card__cart-form"
				method="post"
				action="<?php echo $product_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- already esc_url'd above. ?>"
				data-wp-on--submit="actions.addToCart"
			>
				<button
					type="submit"
					class="btn btn-primary product-card__add-to-cart"
					data-wp-bind--disabled="context.pending"
					data-wp-bind--aria-busy="context.pending"
				>
					<svg class="product-card__cart-icon" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
					<span class="product-card__cart-label"><?php esc_html_e( 'Add to Cart', 'sgs-blocks' ); ?></span>
				</button>
			</form>
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
