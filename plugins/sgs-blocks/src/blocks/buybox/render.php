<?php
/**
 * Server-side render for sgs/buybox.
 *
 * Wires the standalone sgs/option-picker pills to the shipped product-card
 * Interactivity store (sgs/product-card), providing a full PDP buybox:
 * per-axis pickers, live price row, stock status, add-to-cart proxy form,
 * dismissible error region, and availability live region.
 *
 * Requires:  WooCommerce active + a variable product in context.
 * Fallback:  do_blocks() of core woocommerce/product-price +
 *            woocommerce/add-to-cart-with-options for simple products,
 *            manifest-null, cap-exceeded, and WC-absent cases.
 *
 * Engine:    mounts data-wp-interactive="sgs/product-card" — INTENTIONAL.
 *            That store IS the shipped configurator (proxy wire, 409 re-sync,
 *            availability). No duplication — see STEP5-BRIDGE-DESIGN.md.
 *
 * Module loading: we resolve the product-card view-script-module IDs from the
 * block type registry and enqueue them so the engine loads on PDPs that have no
 * sgs/product-card block present.
 *
 * @var array     $attributes Block attributes.
 * @var string    $content    InnerBlocks content — optional extras dropped below
 *                            the add-to-cart form (FR-Wave-B, §8g below). Empty
 *                            on every buybox that has no children.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 * @since   1.17.0 (FR-30-7)
 */

defined( 'ABSPATH' ) || exit;

// NOTE: WC class checks are ALL lazy (inside class_exists gates) — never at
// file scope. File-scope WC class references fatal the whole site when this
// file is required before WooCommerce loads (memory: file-scope-wc-class-extends-must-load-lazily).

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-product-manifest.php';
require_once dirname( __DIR__, 3 ) . '/includes/configurator-seed.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-configurator-pricing.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-value-ladder.php';
require_once dirname( __DIR__, 3 ) . '/includes/product-rrp.php';
require_once dirname( __DIR__, 3 ) . '/includes/buybox-modal-cta.php';
require_once dirname( __DIR__, 3 ) . '/includes/buybox-guided.php';
require_once dirname( __DIR__, 3 ) . '/includes/buybox-linked-flow.php';
require_once __DIR__ . '/extras.php';

// ---------------------------------------------------------------------------
// NO-INLINE (Spec 32 / per-block migration contract): a CSS-length sanitiser
// for box/side values (mirrors sgs/label + sgs/heading). Margin has a scoped
// no-inline treatment on this block; padding is off. Colour (background +
// text, flat-or-gradient, resting + hover) is owned by the block-private
// backgroundColour*/textColour* attrs below, emitted via the shared
// five-variant colour helpers — supports.color's sub-flags are all false so
// nothing native competes with the SGS colour panel.
// ---------------------------------------------------------------------------

/* ── 1. Resolve product ──────────────────────────────────────────────────── */

// Core-blocks fallback markup (FR-30-2): simple products, WC absent, manifest
// null, and cap-exceeded all fall back to the standard WC price + add-to-cart.
// FR-30-10 Step-10a: include the classic WC gallery so simple products and fallback
// cases still show a product image. The buybox column layout is the PDP product area
// for variable products — simple/WC-absent cases use the core fallback here.
$buybox_core_fallback = '<!-- wp:woocommerce/product-image-gallery /--><!-- wp:woocommerce/product-price {"isDescendentOfSingleProductBlock":true} /--><!-- wp:woocommerce/add-to-cart-with-options {"isDescendentOfSingleProductBlock":true} /-->';

// usesContext['postId'] resolves to the current queried post on a PDP template.
$buybox_post_id = isset( $block->context['postId'] ) ? absint( $block->context['postId'] ) : 0;
if ( 0 === $buybox_post_id ) {
	$buybox_post_id = absint( get_queried_object_id() );
}

/* ── 2. Guard: WooCommerce absent or no product ──────────────────────────── */

if ( ! class_exists( 'WooCommerce' ) || $buybox_post_id <= 0 ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- do_blocks output is pre-sanitised.
	echo do_blocks( $buybox_core_fallback );
	return;
}

$product = wc_get_product( $buybox_post_id );

if ( ! $product instanceof \WC_Product ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	echo do_blocks( $buybox_core_fallback );
	return;
}

/* ── 3. Simple product / non-variable: core fallback ────────────────────── */

if ( ! $product->is_type( 'variable' ) ) {
	// A linked customisation flow (FR-43-25) replaces core's Add to Cart.
	$buybox_simple_flow = sgs_buybox_simple_linked_flow_html( $buybox_post_id, sanitize_text_field( (string) ( $attributes['addToCartLabel'] ?? '' ) ) );
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	echo '' !== $buybox_simple_flow ? $buybox_simple_flow : do_blocks( $buybox_core_fallback );
	return;
}

/* ── 4. Build manifest ───────────────────────────────────────────────────── */

$manifest = \SGS\Blocks\Product_Manifest::build( $buybox_post_id );

if ( null === $manifest ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	echo do_blocks( $buybox_core_fallback );
	return;
}

/* ── 4b. Guided layout (Spec 43 FR-43-23) — resolved early so both the wrapper class (below) and the 8b picker section can read it. ── */
$buybox_layout = (string) ( $attributes['buyboxLayout'] ?? 'standard' );
if ( ! in_array( $buybox_layout, array( 'standard', 'guided' ), true ) ) {
	$buybox_layout = 'standard';
}
$buybox_is_guided = ( 'guided' === $buybox_layout );

/* ── 5. Build seeded context (mirrors product-card L444-504 exactly) ─────── */

$decimals = $manifest['decimals'];
$def      = $manifest['combos'][ $manifest['defaultKey'] ];

// Tax-display mode (same logic as product-card — 'auto' default on this block).
$tax_mode     = 'auto';
$price_suffix = wp_strip_all_tags( (string) get_option( 'woocommerce_price_display_suffix', '' ) );
$price_suffix = sanitize_text_field( trim( str_replace( array( '{price_including_tax}', '{price_excluding_tax}' ), '', $price_suffix ) ) );

$price_display   = sgs_configurator_mode_price( $def, $tax_mode, $decimals, $price_suffix );
$show_sale       = ( null !== $def['saleMinor'] );
$regular_display = $show_sale
	? sgs_configurator_mode_regular( $def, $tax_mode, $decimals )
	: '';
$pct_display     = '';
if ( $def['pctOff'] > 0 ) {
	/* translators: %d is the discount percentage, e.g. "30% off". */
	$pct_display = sprintf( __( '%d%% off', 'sgs-blocks' ), $def['pctOff'] );
}

$stock_text = $def['inStock'] ? '' : __( 'Out of stock', 'sgs-blocks' );

// FR-Wave-B: RRP saving pill (extras.php) — SSR-only, default combo, off
// unless an RRP meta key is configured (any-client: no hardcoded meta key).
$buybox_rrp_format = sanitize_key( (string) ( $attributes['rrpSavingFormat'] ?? 'amount' ) );
if ( ! in_array( $buybox_rrp_format, array( 'amount', 'percentage' ), true ) ) {
	$buybox_rrp_format = 'amount';
}
// Eye Care Wave C: customisable saving-pill prefix ("Save" / "You save" / …).
// '' would still resolve to the translated "Save" inside the helper, but the
// block.json default is the literal "Save" (matches soldOutLabel/
// unavailableLabel's own literal-default convention on this block).
$buybox_rrp_prefix = sanitize_text_field( (string) ( $attributes['rrpSavingPrefix'] ?? 'Save' ) );
$buybox_rrp        = sgs_product_rrp_saving(
	$buybox_post_id,
	(string) ( $attributes['rrpMetaKey'] ?? '' ),
	(int) $def['priceMinor'],
	(int) $decimals,
	$buybox_rrp_format,
	$buybox_rrp_prefix
);

// Eye Care Wave C: struck-through "RRP <amount>" beside the price, shown only
// when the saving pill itself applies (same DEFAULT-combo-only, SSR-only
// scope as the pill).
$buybox_rrp_show_price = (bool) ( $attributes['rrpShowPrice'] ?? false );

// FR-Wave-B: stock-status indicator (extras.php) — SSR-only, default combo.
// Existing $stock_text/hidden behaviour is untouched unless showStockStatus is on.
$buybox_show_stock_status = (bool) ( $attributes['showStockStatus'] ?? false );
$buybox_stock_in_label    = sanitize_text_field( (string) ( $attributes['stockInStockLabel'] ?? '' ) );
$buybox_stock_status      = sgs_buybox_stock_status( (int) $def['variationId'], (bool) $def['inStock'], $stock_text, $buybox_stock_in_label );

// Per-unit and discount (mirrors product-card B3 pattern).
// FR-30-8: operator-configurable denomination — sanitised attr wins when non-empty.
$per_unit_denomination_raw = sanitize_text_field( $attributes['perUnitDenomination'] ?? '' );
if ( '' !== $per_unit_denomination_raw ) {
	$per_unit_template = $per_unit_denomination_raw;
} else {
	/* translators: %s is the unit label, e.g. "per bar" or "per 100g". */
	$per_unit_template = __( 'per %s', 'sgs-blocks' );
}
$per_unit_display = sgs_configurator_per_unit_display( $def, $tax_mode, $decimals, $per_unit_template );
$discount_label   = ( null !== $def['saleMinor'] )
	? __( 'Sale', 'sgs-blocks' )
	: ( isset( $def['discountLabel'] ) ? (string) $def['discountLabel'] : '' );

// FR-30-8: Comparative value-ladder (mirrors product-card render.php §Step 3).
// Built here — after $manifest is confirmed non-null and $tax_mode / $decimals
// are resolved — and stored in $buybox_ladder / $buybox_ladder_hidden for use
// inside the ob_start() render region below.

// 3a. Reference price with strict attestation guard (legal: FR-28-16).
$buybox_base_pence = (int) absint( get_post_meta( $buybox_post_id, '_sgs_base_price_pence', true ) );
$buybox_attested   = ( '1' === (string) get_post_meta( $buybox_post_id, '_sgs_base_price_attested', true ) );
$buybox_base_pence = ( $buybox_base_pence > 0 && $buybox_attested ) ? $buybox_base_pence : null;

// 3b. Framing mode from block attribute.
$buybox_framing_mode = sanitize_key( $attributes['framingMode'] ?? 'loss-aversion' );
if ( ! in_array( $buybox_framing_mode, array( 'savings', 'loss-aversion', 'neutral' ), true ) ) {
	$buybox_framing_mode = 'loss-aversion';
}

// 3c. Decoy flag from block attribute (no per-product meta override needed for buybox).
$buybox_decoy_enabled = (bool) ( $attributes['decoyEnabled'] ?? false );

// 3d. Enrich a copy of the FULL manifest combos with termLabel (mirrors product-card §3d).
$buybox_size_term_map = array();
$buybox_size_axis_key = '';

if ( ! empty( $manifest['axes'] ) ) {
	$buybox_operator_axis_key = sanitize_key( (string) get_post_meta( $buybox_post_id, '_sgs_pack_size_axis', true ) );
	$buybox_by_operator       = null;
	$buybox_by_label          = null;
	$buybox_by_first          = null;

	foreach ( $manifest['axes'] as $buybox_axis_def ) {
		$buybox_axis_tax = $buybox_axis_def['taxonomy'] ?? '';
		if ( '' === $buybox_axis_tax ) {
			continue;
		}
		if ( '' !== $buybox_operator_axis_key && $buybox_axis_tax === $buybox_operator_axis_key ) {
			$buybox_by_operator = $buybox_axis_def;
		}
		if ( null === $buybox_by_label && preg_match( '/size/i', (string) ( $buybox_axis_def['label'] ?? '' ) ) ) {
			$buybox_by_label = $buybox_axis_def;
		}
		if ( null === $buybox_by_first ) {
			$buybox_by_first = $buybox_axis_def;
		}
	}

	$buybox_size_axis = $buybox_by_operator ?? $buybox_by_label ?? $buybox_by_first;
	if ( null !== $buybox_size_axis ) {
		$buybox_size_axis_key = (string) ( $buybox_size_axis['taxonomy'] ?? '' );
		foreach ( (array) ( $buybox_size_axis['terms'] ?? array() ) as $buybox_term_row ) {
			$buybox_t_slug  = (string) ( $buybox_term_row['slug'] ?? '' );
			$buybox_t_label = (string) ( $buybox_term_row['label'] ?? '' );
			if ( '' !== $buybox_t_slug ) {
				$buybox_size_term_map[ $buybox_t_slug ] = $buybox_t_label;
			}
		}
	}
}

$buybox_ladder_combos = $manifest['combos']; // Full combos, not $seed_combos.
if ( '' !== $buybox_size_axis_key && ! empty( $buybox_size_term_map ) ) {
	foreach ( $buybox_ladder_combos as $buybox_c_key => &$buybox_c_val ) {
		foreach ( explode( '|', $buybox_c_key ) as $buybox_part ) {
			$buybox_colon = strpos( $buybox_part, ':' );
			if ( false === $buybox_colon ) {
				continue;
			}
			$buybox_part_tax  = substr( $buybox_part, 0, $buybox_colon );
			$buybox_part_slug = substr( $buybox_part, $buybox_colon + 1 );
			if ( $buybox_part_tax === $buybox_size_axis_key && isset( $buybox_size_term_map[ $buybox_part_slug ] ) ) {
				$buybox_c_val['termLabel'] = $buybox_size_term_map[ $buybox_part_slug ];
				break;
			}
		}
	}
	unset( $buybox_c_val );
}

// 3e. Build ladder rows.
$buybox_ladder = function_exists( 'sgs_value_ladder' )
	? sgs_value_ladder( $buybox_ladder_combos, $buybox_base_pence, $buybox_framing_mode, $buybox_decoy_enabled, $tax_mode, $decimals )
	: array();

$buybox_ladder_hidden = ( count( $buybox_ladder ) < 2 );

// Operator-configurable labels (from block attributes).
$sold_out_label    = sanitize_text_field( $attributes['soldOutLabel'] ?? __( '(sold out)', 'sgs-blocks' ) );
$unavailable_label = sanitize_text_field( $attributes['unavailableLabel'] ?? __( '(unavailable)', 'sgs-blocks' ) );

// FR-30-10 Step-10a (all-variation fix): build the gallery DATA-ISLAND from the
// FULL combos (not the lean seed). Every combo with a >=2-image gallery is keyed
// by its combo key; the island is emitted as an on-page JSON <script> inside the
// .sgs-buybox wrapper (NOT subject to the 24 KB context cap), so EVERY variation's
// gallery is available to the store on swap, not just the few that fit the seed.
$buybox_gallery_island = array();
foreach ( $manifest['combos'] as $buybox_island_key => $buybox_island_combo ) {
	if ( ! empty( $buybox_island_combo['gallery'] )
		&& is_array( $buybox_island_combo['gallery'] )
		&& count( $buybox_island_combo['gallery'] ) >= 2 ) {
		$buybox_gallery_island[ $buybox_island_key ] = $buybox_island_combo['gallery'];
	}
}

// Lean seed — 24 KB cap guard (mirrors product-card M-C9).
// sgs_lean_seed_combos keeps gallery arrays when count >= 2, empties when < 2.
$seed_combos = sgs_lean_seed_combos( $manifest['combos'] );

// FR-30-10 Step-10a (all-variation fix): shrink the seed so it never trips the
// 24 KB cap regardless of variation count. Only the DEFAULT combo keeps its
// gallery (for SSR/first-paint parity with gallery-col.php); every other combo's
// gallery is emptied in the seed and comes from the data-island on swap instead.
foreach ( $seed_combos as $buybox_seed_key => &$buybox_seed_combo ) {
	if ( $buybox_seed_key !== $manifest['defaultKey'] ) {
		$buybox_seed_combo['gallery'] = array();
	}
}
unset( $buybox_seed_combo );

// FR-30-10 Step-10a: resolve gallery seed values from the default combo.
// Mirrors product-card context L509-511 exactly.
$buybox_def_gallery = isset( $def['gallery'] ) && is_array( $def['gallery'] ) ? $def['gallery'] : array();
$buybox_img_src     = ! empty( $buybox_def_gallery[0]['url'] )
	? $buybox_def_gallery[0]['url']
	: ( '' !== $def['imageUrl'] ? $def['imageUrl'] : '' );
// WCAG fallback: empty image alt falls back to the product name. applyPillSelection
// never updates ctx.imageAlt, so this seeded value persists across swaps too.
$buybox_img_alt       = ! empty( $buybox_def_gallery[0]['alt'] )
	? $buybox_def_gallery[0]['alt']
	: ( $product instanceof \WC_Product ? $product->get_name() : '' );
$buybox_thumbs_hidden = count( $buybox_def_gallery ) < 2;

/*
 * Draggable + Inertia roster opt-in (Spec 38 FR-38-13, register Step 3),
 * mirroring sgs/gallery / sgs/post-grid / sgs/google-reviews.
 *
 * Emitted on `.product-card__thumbs` — the DESCENDANT that actually scrolls
 * (buybox/style.css: `.sgs-buybox .product-card__thumbs` is the
 * `overflow-x: auto` + `scroll-snap-type: x mandatory` flex row), NOT the
 * block root, which never scrolls (block.json's `providesNatively` entry
 * already suppresses the generic "Scroll & effects" picker for exactly this
 * reason). Gated on the same `!$buybox_thumbs_hidden` condition the strip's
 * own visibility uses — fewer than 2 images means nothing to drag, so the
 * attribute is never emitted onto a strip that's `hidden` anyway. The shared
 * runtime (shared/effects/gsap/fx-draggable.js) structurally re-verifies the
 * element is a genuine native horizontal scroller before touching it.
 */
$buybox_drag_to_scroll = (bool) ( $attributes['dragToScroll'] ?? false );
$buybox_drag_momentum  = (bool) ( $attributes['dragMomentum'] ?? true );

/*
 * Infinite loop (Spec 38 §11 loop FR). A SEPARATE marker from
 * `data-sgs-fx="draggable"` above — Bean's ruling that looping is an
 * independent control, not a value of the shared `fx` grammar, and both can
 * be present on the SAME element at once. `shared/effects/fx-carousel-loop.js`
 * reads this; it never touches `gsap/fx-draggable.js`. Reuses the SAME
 * `!$buybox_thumbs_hidden` gate as drag — fewer than 2 images means nothing
 * to loop, which is exactly when the strip is `hidden` anyway.
 */
$buybox_loop_carousel = (bool) ( $attributes['loopCarousel'] ?? false );

$buybox_thumbs_fx_attr = '';
if ( ! $buybox_thumbs_hidden && $buybox_drag_to_scroll ) {
	$buybox_thumbs_fx_attr = ' data-sgs-fx="draggable"';
	if ( ! $buybox_drag_momentum ) {
		$buybox_thumbs_fx_attr .= ' data-sgs-fx-momentum="false"';
	}
}
if ( ! $buybox_thumbs_hidden && $buybox_loop_carousel ) {
	$buybox_thumbs_fx_attr .= ' data-sgs-loop="1"';
}

// Context array — key shape is IDENTICAL to product-card (L445-504).
// Gallery keys now seeded with real values from the default combo (FR-30-10 Step-10a).
// ctaBehaviour fixed to 'add-to-cart' (buybox always adds, no learn-more mode).
$context = array(
	'productId'           => (string) $buybox_post_id,
	'addToCartId'         => absint( $product->get_id() ),
	'decimals'            => $decimals,
	'currencySymbol'      => $manifest['currencySymbol'],
	'combos'              => $seed_combos,
	'axes'                => $manifest['axes'],
	'selectedAxes'        => $manifest['defaultAxes'],
	'selectedKey'         => $manifest['defaultKey'],
	'selectedVariationId' => (int) $def['variationId'],
	'priceDisplay'        => $price_display,
	'regularDisplay'      => $regular_display,
	'pctDisplay'          => $pct_display,
	'taxDisplayMode'      => $tax_mode,
	'priceSuffix'         => ( 'inc-suffix' === $tax_mode ) ? $price_suffix : '',
	'vatLabel'            => __( 'VAT', 'sgs-blocks' ),
	'showSale'            => $show_sale,
	'hideSale'            => ! $show_sale,
	'stockText'           => $stock_text,
	'inStock'             => (bool) $def['inStock'],
	// FR-30-10 Step-10a: real gallery seed (was neutral '' / '' / [] / true before).
	'imageSrc'            => $buybox_img_src,
	'imageAlt'            => $buybox_img_alt,
	'cartStatus'          => '',
	'pending'             => false,
	'restNonce'           => wp_create_nonce( 'wp_rest' ),
	'availabilityNote'    => '',
	'perUnitDisplay'      => $per_unit_display,
	'perUnitHidden'       => ( '' === $per_unit_display ),
	'perUnitTemplate'     => $per_unit_template,
	'discountLabel'       => $discount_label,
	'discountHidden'      => ( '' === $discount_label ),
	'saleLabel'           => __( 'Sale', 'sgs-blocks' ),
	// FR-30-10 Step-10a: real gallery seed (mirrors product-card L509-511).
	'gallery'             => $buybox_def_gallery,
	'thumbsHidden'        => $buybox_thumbs_hidden,
	'selectedThumb'       => 0,
	// buybox always add-to-cart (no buy-now / learn-more modes at P1).
	'ctaBehaviour'        => 'add-to-cart',
	'checkoutUrl'         => '',
	// Operator-configurable unavailability labels (FR-30-7).
	// Seeded into context so applyAvailability() reads them with current literals as defaults.
	'soldOutLabel'        => $sold_out_label,
	'unavailableLabel'    => $unavailable_label,
);

/* ── 6. Hard cap: 24 KB max serialised context ───────────────────────────── */

if ( strlen( wp_json_encode( $context ) ) > 24576 ) {
	// Cap exceeded — fall back to core WC blocks.
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	echo do_blocks( $buybox_core_fallback );
	return;
}

/*
 * ── 7. Enqueue the product-card view-script module ──────────────────────────
 * The buybox mounts sgs/product-card's store — we must enqueue it even when
 * no sgs/product-card block is present on this page. Resolve the registered
 * module ID from the block type registry (authoritative, no guessing).
 */
// NOTE: if sgs/product-card is ever deregistered, $card_type is null and the
// module is never enqueued — the buybox renders its SSR HTML with no
// interactivity (the no-JS form fallback still navigates). Silent progressive
// degradation by design; check this first if the configurator "stops working".
$card_type = WP_Block_Type_Registry::get_instance()->get_registered( 'sgs/product-card' );
if ( $card_type ) {
	$module_ids = isset( $card_type->view_script_module_ids ) ? (array) $card_type->view_script_module_ids : array();
	foreach ( $module_ids as $module_id ) {
		wp_enqueue_script_module( $module_id );
	}
}

/* ── 8. Render ───────────────────────────────────────────────────────────── */

$product_permalink = esc_url( get_permalink( $buybox_post_id ) );

// CTA label.
$add_to_cart_label_raw = $attributes['addToCartLabel'] ?? '';
$add_to_cart_label     = '' !== sanitize_text_field( $add_to_cart_label_raw )
	? sanitize_text_field( $add_to_cart_label_raw )
	: __( 'Add to Cart', 'sgs-blocks' );

// Spec 43 Phase 3/4 §5a — the button either adds to the cart (default) or
// opens an sgs/modal (typically holding a choice-flow) instead. Falls back to
// cart mode when 'modal' is selected but no modal anchor is set — never a
// button that opens nothing.
$add_to_cart_action = sanitize_key( (string) ( $attributes['addToCartAction'] ?? 'cart' ) );
if ( ! in_array( $add_to_cart_action, array( 'cart', 'modal' ), true ) ) {
	$add_to_cart_action = 'cart';
}
$add_to_cart_modal_id    = sanitize_text_field( (string) ( $attributes['addToCartModalId'] ?? '' ) );
$add_to_cart_opens_modal = ( 'modal' === $add_to_cart_action && '' !== $add_to_cart_modal_id );

// Spec 43 FR-43-25 — a product-linked Choice Flow auto-wires this same modal
// mode when no explicit addToCartAction:modal already wins (includes/buybox-
// linked-flow.php owns the decision + the resolved flow post).
$buybox_linked_flow_wire = sgs_buybox_apply_linked_flow( $buybox_post_id, $buybox_is_guided, $add_to_cart_action, $add_to_cart_modal_id, $add_to_cart_opens_modal );
$add_to_cart_action      = $buybox_linked_flow_wire['action'];
$add_to_cart_modal_id    = $buybox_linked_flow_wire['modal_id'];
$add_to_cart_opens_modal = $buybox_linked_flow_wire['opens_modal'];
$buybox_linked_flow_post = $buybox_linked_flow_wire['flow'];

// Eye Care Wave C: add-to-cart button style preset + optional price display.
// sgs_buybox_add_to_cart_class() allowlists to '' (today's look) or
// primary|secondary|outline (extras.php) — style.css's
// `.buybox__add-to-cart--{style}` rules read the SAME
// `--wp--custom--button-presets--{style}--*` tokens sgs/button's own presets
// do, so the two stay visually matched without depending on sgs/button's
// stylesheet being enqueued on this page.
$add_to_cart_style_class = sgs_buybox_add_to_cart_class( sanitize_key( (string) ( $attributes['addToCartStyle'] ?? '' ) ) );
$add_to_cart_show_price  = (bool) ( $attributes['addToCartShowPrice'] ?? false );

$add_to_cart_button_classes = 'wp-element-button buybox__add-to-cart';
if ( '' !== $add_to_cart_style_class ) {
	$add_to_cart_button_classes .= ' buybox__add-to-cart--' . $add_to_cart_style_class;
}
if ( $add_to_cart_show_price ) {
	$add_to_cart_button_classes .= ' buybox__add-to-cart--show-price';
}

// ---------------------------------------------------------------------------
// NO-INLINE (Spec 32): uid is a CLASS (mirrors sgs/label/sgs/heading/
// sgs/container). `margin` is a block-private object attr (base + the two
// SGS custom object-attr tiers), scoped here, plus the block-private colour
// attrs below — padding is off, so nothing else to route.
// ---------------------------------------------------------------------------

$uid      = 'sgs-bb-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-buybox';

$scoped_css = array();

// --- Base margin — `margin` is a single block-owned TIER-of-BOXES envelope
// attr {desktop,tablet,mobile} (folded 2026-09-11 from the wrong 3-sibling
// shape margin/marginTablet/marginMobile), read once via
// sgs_responsive_normalise_object() and emitted scoped via the stable core
// style engine (mirrors sgs/info-box + sgs/star-rating's already-shipped
// margin migration). ---
$sgs_bb_margin_tiers = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$base_margin_obj     = array();
$margin_raw          = is_array( $sgs_bb_margin_tiers['desktop'] ?? null ) ? $sgs_bb_margin_tiers['desktop'] : array();
if ( ! empty( $margin_raw ) ) {
	foreach ( $margin_raw as $margin_side => $margin_value ) {
		if ( is_string( $margin_value ) && '' !== $margin_value ) {
			$base_margin_obj[ $margin_side ] = $margin_value;
		}
	}
}

$style_group       = is_array( $attributes['style'] ?? null ) ? $attributes['style'] : array();
$style_border_args = ! empty( $style_group['border'] ) && is_array( $style_group['border'] ) ? $style_group['border'] : array();

$base_style_engine_args = array();

if ( ! empty( $base_margin_obj ) ) {
	$base_style_engine_args['spacing'] = array( 'margin' => $base_margin_obj );
}

if ( ! empty( $style_border_args ) ) {
	$base_style_engine_args['border'] = $style_border_args;
}

if ( ! empty( $base_style_engine_args ) ) {
	$base_scoped_styles = wp_style_engine_get_styles(
		$base_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $base_scoped_styles['css'] ) ) {
		$scoped_css[] = $base_scoped_styles['css'];
	}
}

// --- Block-private colour (background + text, flat-or-gradient, resting +
// hover) — supports.color's sub-flags are all false, so nothing native can
// write $attributes['style']['color'] any more; these block-private attrs
// (exposed through SgsColourPanel/fillRow/textRow in edit.js) are the SOLE
// owner. Text colour applies to the same root element as the background
// paint, so the background is painted on a `::after` layer rather than the
// root itself — a text gradient (`background-clip:text`) on the root would
// otherwise clip or overwrite the background paint (mirrors sgs/product-card's
// text/background pseudo-element split). ---
// FIXED 2026-09-04 — was sgs_text_decls()/sgs_emit_state_colour_css(), which
// always emits a bare `color:` even for a resolved gradient string (invalid
// CSS, silently dropped — same defect proven live on sgs/info-box and
// sgs/testimonial-slider). sgs_text_colour_decl() is the correct primary
// primitive; the companion fallback rule below was already correct.
$sgs_bb_text_normal_resolved = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColour'] ?? '' ),
	(string) ( $attributes['textColourGradient'] ?? '' )
);
$sgs_bb_text_hover_resolved  = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColourHover'] ?? '' ),
	(string) ( $attributes['textColourHoverGradient'] ?? '' )
);
$sgs_bb_text_normal_decl     = sgs_text_colour_decl( $sgs_bb_text_normal_resolved );
$sgs_bb_text_hover_decl      = sgs_text_colour_decl( $sgs_bb_text_hover_resolved );
if ( '' !== $sgs_bb_text_normal_decl || '' !== $sgs_bb_text_hover_decl ) {
	$scoped_css[] = sgs_emit_state_colour_css(
		$root_sel,
		'' !== $sgs_bb_text_normal_decl ? array( $sgs_bb_text_normal_decl ) : array(),
		'' !== $sgs_bb_text_hover_decl ? array( $sgs_bb_text_hover_decl ) : array()
	);
}
// Gradient companion rule — a no-op for a flat colour, MUST accompany
// sgs_text_colour_decl(): its gradient branch has no @supports fallback of
// its own.

$sgs_bb_text_gradient_rule = sgs_text_colour_gradient_fallback_rule( $root_sel, $sgs_bb_text_normal_resolved );
if ( '' !== $sgs_bb_text_gradient_rule ) {
	$scoped_css[] = $sgs_bb_text_gradient_rule;
}
if ( '' !== $sgs_bb_text_hover_resolved && $sgs_bb_text_hover_resolved !== $sgs_bb_text_normal_resolved ) {
	$sgs_bb_text_hover_gradient_rule = sgs_hover_media_wrap(
		sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover', $sgs_bb_text_hover_resolved )
	) . sgs_text_colour_gradient_fallback_rule( $root_sel . ':focus-visible', $sgs_bb_text_hover_resolved );
	if ( '' !== $sgs_bb_text_hover_gradient_rule ) {
		$scoped_css[] = $sgs_bb_text_hover_gradient_rule;
	}
}

$sgs_bb_bg_decls = sgs_fill_decls(
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);

$sgs_bb_bg_layer_css = sgs_block_background_layer_css(
	$root_sel,
	$sgs_bb_bg_decls['normal'][0] ?? '',
	$sgs_bb_bg_decls['hover'][0] ?? ''
);
if ( '' !== $sgs_bb_bg_layer_css ) {
	$scoped_css[] = $sgs_bb_bg_layer_css;
}

// --- Responsive margin tiers — SGS custom object attrs, hand-built shorthand,
// scoped @media on the SAME selector (contract §B2: tablet max-width:1023px,
// mobile max-width:767px). ---
$margin_tablet_obj = is_array( $sgs_bb_margin_tiers['tablet'] ?? null ) ? $sgs_bb_margin_tiers['tablet'] : array();
$margin_mobile_obj = is_array( $sgs_bb_margin_tiers['mobile'] ?? null ) ? $sgs_bb_margin_tiers['mobile'] : array();

$margin_tab_val = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val = sgs_box_object_shorthand( $margin_mobile_obj );

if ( null !== $margin_tab_val ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{margin:{$margin_tab_val};}}";
}
if ( null !== $margin_mob_val ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{margin:{$margin_mob_val};}}";
}

// FR-Wave-B: sticky configurator column (extras.php). Off by default — every
// existing buybox keeps rendering exactly as before.
$buybox_sticky          = sgs_buybox_sticky_data( $attributes );
$buybox_wrapper_classes = 'sgs-buybox ' . $uid;
if ( $buybox_sticky['enabled'] ) {
	$buybox_wrapper_classes .= ' sgs-buybox--sticky-config';
}
if ( 'tablet' === ( $attributes['stackBelow'] ?? 'mobile' ) ) {
	$buybox_wrapper_classes .= ' sgs-buybox--stack-tablet';
}
if ( $buybox_is_guided ) {
	$buybox_wrapper_classes .= ' sgs-buybox--guided';
}

// Wrapper attributes — includes Interactivity API bindings. uid CLASS added
// (no 'style' key — the root carries ZERO inline property declarations;
// every declaration lives in the scoped <style> below).
$wrapper_attrs = get_block_wrapper_attributes(
	array( 'class' => $buybox_wrapper_classes )
);

ob_start();
?>
<?php
// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt          = '' !== $border_width_top ? $border_width_top : '0';
		$bwr          = '' !== $border_width_right ? $border_width_right : '0';
		$bwb          = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl          = '' !== $border_width_left ? $border_width_left : '0';
		$scoped_css[] = $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$scoped_css[] = sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$scoped_css[] = $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$radius_tiers      = sgs_border_radius_tiers( $attributes );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$scoped_css[] = $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$scoped_css[] = '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

// FR-Wave-B: sticky column / RRP pill / stock-status scoped CSS (extras.php).
$scoped_css = array_merge(
	$scoped_css,
	sgs_buybox_extras_scoped_css( $attributes, $root_sel, $buybox_rrp, $buybox_sticky )
);

// Eye Care Wave C: price typography (font-family/size/weight) — shared
// TypographyControls prefix 'price', scoped to the current-price figure only
// (mirrors sgs/product-card's own priceFontFamily/priceFontSize/
// priceFontWeight trio and sgs_typography_css_rule() call).
$sgs_bb_price_typo_css = sgs_typography_css_rule( $attributes, 'price', $root_sel . ' .buybox__price--current' );
if ( '' !== $sgs_bb_price_typo_css ) {
	$scoped_css[] = $sgs_bb_price_typo_css;
}
?>
<?php if ( $scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised via sgs_css_length_value() / wp_style_engine_get_styles; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	data-wp-interactive="sgs/product-card"
	data-wp-init="callbacks.initPillBridge"
	<?php echo wp_interactivity_data_wp_context( $context ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
>

	<?php // ── 8-gallery. Gallery column (FR-30-10 Step-10a) — left column, sticky on desktop. ?>
	<div class="sgs-buybox__gallery-col">
		<?php require __DIR__ . '/gallery-col.php'; ?>
	</div>

	<?php
	// ── 8-config. Configurator column — right column, all interactive content.
	// extrasBeforeCount (FR-Wave-B extension): when set, the extras slot's
	// first N children render here, above the price, instead of all of them
	// dropping below the add-to-cart form (8g below). extrasBeforeCartCount
	// (Eye Care Wave C): the NEXT M children render between the pickers/stock
	// status and the add-to-cart form (8c-iii below). Both 0 keeps the
	// original $content path byte-identical — see sgs_buybox_split_extras()
	// docblock.
	$buybox_extras_before_count      = (int) max( 0, (int) ( $attributes['extrasBeforeCount'] ?? 0 ) );
	$buybox_extras_before_cart_count = (int) max( 0, (int) ( $attributes['extrasBeforeCartCount'] ?? 0 ) );
	$buybox_extras_before_html       = '';
	$buybox_extras_before_cart_html  = '';
	$buybox_extras_after_html        = $content;

	if ( ( $buybox_extras_before_count > 0 || $buybox_extras_before_cart_count > 0 ) && $block->inner_blocks->count() > 0 ) {
		$buybox_extras_split            = sgs_buybox_split_extras( $block->inner_blocks, $buybox_extras_before_count, $buybox_extras_before_cart_count );
		$buybox_extras_before_html      = $buybox_extras_split['before'];
		$buybox_extras_before_cart_html = $buybox_extras_split['beforeCart'];
		$buybox_extras_after_html       = $buybox_extras_split['after'];
	}
	?>
	<div class="sgs-buybox__config-col">

	<?php if ( '' !== trim( (string) $buybox_extras_before_html ) ) : ?>
	<div class="sgs-buybox__extras sgs-buybox__extras--before">
		<?php echo $buybox_extras_before_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WP core InnerBlocks output, already rendered + escaped by WP_Block::render(). ?>
	</div>
	<?php endif; ?>

	<?php // ── 8a. Price row FIRST (CRO: price anchor visible before the pickers — uimax e-commerce hierarchy rule). ?>
	<div class="buybox__price-row" aria-live="polite">
		<span
			class="buybox__price buybox__price--current"
			data-wp-text="context.priceDisplay"
		><?php echo esc_html( $price_display ); ?></span>
		<s
			class="buybox__price--regular"
			data-wp-bind--hidden="context.hideSale"
			data-wp-text="context.regularDisplay"
		><?php echo esc_html( $regular_display ); ?></s>
		<span
			class="buybox__price--pct-off"
			data-wp-bind--hidden="context.hideSale"
			data-wp-text="context.pctDisplay"
		><?php echo esc_html( $pct_display ); ?></span>
		<?php
		// ── 8a-iii. Struck-through "RRP <amount>" (Eye Care Wave C, rrpShowPrice) —
		// same DEFAULT-combo-only, SSR-only scope as the pill directly below.
		?>
		<?php if ( $buybox_rrp_show_price && ! $buybox_rrp['hidden'] ) : ?>
		<span class="buybox__rrp-price">
			<span class="sgs-sr-only"><?php esc_html_e( 'Recommended retail price', 'sgs-blocks' ); ?></span>
			<?php esc_html_e( 'RRP', 'sgs-blocks' ); ?> <s><?php echo esc_html( $buybox_rrp['rrp_display'] ); ?></s>
		</span>
		<?php endif; ?>
		<?php
		// ── 8a-iv. RRP saving pill (FR-Wave-B, SSR-only — same "no data-wp-*"
		// pattern as the value-ladder below: the RRP compares the DEFAULT
		// combo's price only, it does not recompute on a pill swap).
		?>
		<?php if ( ! $buybox_rrp['hidden'] ) : ?>
		<span class="buybox__rrp-pill"><?php echo esc_html( $buybox_rrp['text'] ); ?></span>
		<?php endif; ?>
	</div>
	<p
		class="buybox__price-note buybox__price-note--per-unit"
		data-wp-bind--hidden="context.perUnitHidden"
		data-wp-text="context.perUnitDisplay"
	><?php echo esc_html( $per_unit_display ); ?></p>

	<?php // ── 8a-ii. Comparative value-ladder (FR-30-8, SSR-only — no data-wp-* on ladder nodes). ?>
	<?php if ( false !== ( $attributes['showLadder'] ?? true ) && ! $buybox_ladder_hidden ) : ?>
	<ul
		class="buybox__value-ladder"
		aria-label="<?php esc_attr_e( 'Price per unit by pack size', 'sgs-blocks' ); ?>"
	>
		<?php foreach ( $buybox_ladder as $buybox_ladder_row ) : ?>
			<?php
			// PD-12: aria-current on the row matching the default-selected combo's unitDivisor.
			// (int)round() on both sides mirrors the data-pack write + view.js comparison.
			$buybox_row_pack     = (int) round( $buybox_ladder_row['pack'] );
			$buybox_default_pack = isset( $def['unitDivisor'] ) ? (int) round( (float) $def['unitDivisor'] ) : 0;
			$buybox_is_default   = ( $buybox_row_pack === $buybox_default_pack );
			?>
		<li
			class="value-ladder__row"
			data-pack="<?php echo esc_attr( (string) $buybox_row_pack ); ?>"
			<?php echo $buybox_is_default ? 'aria-current="true"' : ''; ?>
		>
			<span class="value-ladder__pack"><?php echo esc_html( $buybox_ladder_row['row_label'] ); ?></span>
			<span class="value-ladder__per-unit"><?php echo esc_html( $buybox_ladder_row['per_unit_display'] ); ?></span>
			<?php if ( '' !== $buybox_ladder_row['saving_display'] && ! $buybox_ladder_row['suppressed'] ) : ?>
			<span class="value-ladder__saving"><?php echo esc_html( $buybox_ladder_row['saving_display'] ); ?></span>
			<?php endif; ?>
			<?php if ( $buybox_ladder_row['is_target'] ) : ?>
				<?php
				// PD-10: no data-wp-* on this span — directives wipe SSR text on hydration.
				// Legal: 'Best value' only on the non-decoy target (genuinely cheapest per-unit);
				// 'Most popular' on the decoy target (not cheapest, so not a superlative claim).
				$buybox_badge_text = $buybox_decoy_enabled
					? __( 'Most popular', 'sgs-blocks' )
					: __( 'Best value', 'sgs-blocks' );
				?>
			<span class="wp-block-sgs-label is-style-pill-wrap product-card__best-value-badge"><?php echo esc_html( $buybox_badge_text ); ?></span>
			<?php endif; ?>
		</li>
		<?php endforeach; ?>
	</ul>
	<?php endif; ?>

	<?php
	// ── 8b. Per-axis option-picker blocks (single-variant suppression: skip axes with <2 terms) ──
	// Eye Care Wave C: pickerSwatchStyle/pickerStyle/pickerSubLabelMetaKey/
	// pickerShowSelectedTick forwarded to every rendered picker below — only a
	// non-empty override is passed on, so an unset value leaves option-picker's
	// OWN default governing (block.json's own contract for these attrs).
	$buybox_allowed_picker_styles = array( '', 'outlined', 'filled', 'ghost', 'tile' );
	$buybox_picker_swatch_style   = sanitize_key( (string) ( $attributes['pickerSwatchStyle'] ?? '' ) );
	$buybox_picker_swatch_style   = in_array( $buybox_picker_swatch_style, $buybox_allowed_picker_styles, true ) ? $buybox_picker_swatch_style : '';
	$buybox_picker_plain_style    = sanitize_key( (string) ( $attributes['pickerStyle'] ?? '' ) );
	$buybox_picker_plain_style    = in_array( $buybox_picker_plain_style, $buybox_allowed_picker_styles, true ) ? $buybox_picker_plain_style : '';
	$buybox_picker_sub_label_key  = sanitize_key( (string) ( $attributes['pickerSubLabelMetaKey'] ?? '' ) );
	$buybox_picker_show_tick      = array_key_exists( 'pickerShowSelectedTick', $attributes ) ? (bool) $attributes['pickerShowSelectedTick'] : true;

	if ( $buybox_is_guided ) :
		// Spec 43 FR-43-23 — one decision per screen behind a progress meter,
		// instead of every axis picker at once. New file (includes/buybox-
		// guided.php) so this render.php stays byte-identical in standard
		// layout (the only path this file's size cap allows).
		$buybox_guided_groups = sgs_buybox_guided_groups(
			$product,
			$manifest,
			(bool) ( $attributes['guidedAnswerAttributes'] ?? true )
		);
		echo sgs_buybox_guided_render( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_buybox_guided_render() escapes every value it interpolates.
			$buybox_guided_groups,
			array(
				'swatch_style'  => $buybox_picker_swatch_style,
				'plain_style'   => $buybox_picker_plain_style,
				'sub_label_key' => $buybox_picker_sub_label_key,
				'show_tick'     => $buybox_picker_show_tick,
			),
			(bool) ( $attributes['guidedAutoAdvance'] ?? true ),
			array(
				'next_label'   => (string) ( $attributes['guidedNextLabel'] ?? '' ),
				'back_label'   => (string) ( $attributes['guidedBackLabel'] ?? '' ),
				'meter_style'  => (string) ( $attributes['guidedMeterStyle'] ?? 'segments' ),
				'meter_colour' => (string) ( $attributes['guidedMeterColour'] ?? '' ),
			)
		);
	else :
		foreach ( $manifest['axes'] as $axis ) {
			$terms = $axis['terms'] ?? array();

			// Single-variant suppression (QA Gate B from design doc): skip axes where
			// there is only one selectable term — no meaningful choice to present.
			if ( count( $terms ) < 2 ) {
				continue;
			}

			$buybox_axis_taxonomy = (string) ( $axis['taxonomy'] ?? '' );
			$buybox_axis_style    = sgs_buybox_axis_has_swatch( $buybox_axis_taxonomy, $terms )
				? $buybox_picker_swatch_style
				: $buybox_picker_plain_style;

			$buybox_picker_attrs = array(
				'label'            => $axis['label'],
				'showLabel'        => true,
				'optionItems'      => array_map(
					static function ( $t ) {
						return array(
							'key'   => $t['slug'],
							'label' => $t['label'],
						);
					},
					$terms
				),
				'defaultSelected'  => $manifest['defaultAxes'][ $axis['taxonomy'] ] ?? '',
				'typeKey'          => $axis['taxonomy'],
				'showSelectedTick' => $buybox_picker_show_tick,
			);
			if ( '' !== $buybox_axis_style ) {
				$buybox_picker_attrs['pillStyle'] = $buybox_axis_style;
			}
			if ( '' !== $buybox_picker_sub_label_key ) {
				$buybox_picker_attrs['subLabelMetaKey'] = $buybox_picker_sub_label_key;
			}

			// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render_block() returns fully-rendered, escaped block markup.
			echo render_block(
				array(
					'blockName' => 'sgs/option-picker',
					'attrs'     => $buybox_picker_attrs,
				)
			);
		}
	endif;
	?>

	<?php
	// ── 8c. Stock status (FR-Wave-B). Default: hidden when in stock (today's
	// behaviour, unchanged). showStockStatus on: an always-visible coloured
	// dot + label, SSR-only for the default combo (extras.php).
	?>
	<?php if ( $buybox_show_stock_status ) : ?>
	<p
		class="buybox__stock buybox__stock--status <?php echo esc_attr( $buybox_stock_status['class'] ); ?>"
		role="status"
		aria-live="polite"
	>
		<span class="buybox__stock-dot" aria-hidden="true"></span><?php echo esc_html( $buybox_stock_status['label'] ); ?>
	</p>
	<?php else : ?>
	<p
		class="buybox__stock"
		role="status"
		aria-live="polite"
		data-wp-bind--hidden="context.inStock"
		data-wp-text="context.stockText"
	><?php echo esc_html( $stock_text ); ?></p>
	<?php endif; ?>

	<?php
	// ── 8c-ii. Back-in-stock notify-me form (FR-30-10, Step 10).
	// Gated on notifyEnabled attribute (default true). Shown ONLY when the
	// selected variation is out of stock via data-wp-bind--hidden="context.inStock"
	// on the outer wrapper (pure read of existing context — no new store state).
	$notify_enabled = (bool) ( $attributes['notifyEnabled'] ?? true );
	if ( $notify_enabled ) {
		$notify_me_label = sanitize_text_field( $attributes['notifyMeLabel'] ?? __( 'Notify me', 'sgs-blocks' ) );
		if ( '' === $notify_me_label ) {
			$notify_me_label = __( 'Notify me', 'sgs-blocks' );
		}
		// Enqueue Turnstile script when configured.
		if ( \SGS\Blocks\Turnstile::is_configured() ) {
			\SGS\Blocks\Turnstile::enqueue_script();
		}
		require __DIR__ . '/notify-form.php';
	}
	?>

	<?php
	// ── 8c-iii. Extras between the pickers/stock status and the add-to-cart
	// form (Eye Care Wave C, extrasBeforeCartCount) — the same rendered-child
	// markup sgs_buybox_split_extras() already produced above (8-config).
	?>
	<?php if ( '' !== trim( (string) $buybox_extras_before_cart_html ) ) : ?>
	<div class="sgs-buybox__extras sgs-buybox__extras--before-cart">
		<?php echo $buybox_extras_before_cart_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WP core InnerBlocks output, already rendered + escaped by WP_Block::render(). ?>
	</div>
	<?php endif; ?>

	<?php if ( $add_to_cart_opens_modal ) : ?>
		<?php
		// ── 8d (modal mode). Spec 43 Phase 3/4 §5a — opens an sgs/modal instead
		// of submitting the cart. Built in includes/buybox-modal-cta.php so this
		// render.php stays byte-identical in cart mode (the only path this
		// contract's size cap allows). Same hidden-when-out-of-stock gate as the
		// cart-mode form below, and the SAME opener mechanism sgs/modal's own
		// open-anywhere.js already provides — no second mechanism invented.
		echo sgs_buybox_modal_cta_html( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sgs_buybox_modal_cta_html() escapes every value it interpolates.
			$add_to_cart_label,
			$add_to_cart_button_classes,
			$add_to_cart_show_price,
			$price_display,
			$add_to_cart_modal_id
		);
		?>
	<?php else : ?>
		<?php
		// ── 8d. Add-to-cart form (mirrors product-card L948-963 proxy form pattern).
		// HIDDEN WHEN OUT OF STOCK: `data-wp-bind--disabled` evaluates a single path
		// and the Interactivity API has no `||`, so gating the button on both stock
		// and pending would need new store state; hiding the form is the same read
		// of existing context, uses the `!` negation already used in
		// form/render.php:356,369,377, mirrors the notify-me wrapper 15 lines above,
		// and leaves the notify-me form as the offered action instead of a dead
		// control.
		?>
	<form
		class="buybox__cart-form"
		data-wp-bind--hidden="!context.inStock"
		method="post"
		action="<?php echo $product_permalink; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- already esc_url'd above. ?>"
		data-wp-on--submit="actions.addToCart"
	>
		<button
			type="submit"
			class="<?php echo esc_attr( $add_to_cart_button_classes ); ?>"
			data-wp-bind--disabled="context.pending"
			data-wp-bind--aria-busy="context.pending"
		>
			<?php if ( $add_to_cart_show_price ) : ?>
			<span class="buybox__add-to-cart-content">
				<svg class="buybox__cart-icon" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
				<span class="buybox__cart-label"><?php echo esc_html( $add_to_cart_label ); ?></span>
			</span>
				<?php
				// Bound directly to the SAME context.priceDisplay path the price row
				// (8a) already reads — reactive on a variation swap for free, since the
				// button label itself is static (no data-wp-text) and does not need its
				// own re-render logic to stay in sync.
				?>
				<span class="buybox__cart-price" data-wp-text="context.priceDisplay"><?php echo esc_html( $price_display ); ?></span>
			<?php else : ?>
			<svg class="buybox__cart-icon" aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
			<span class="buybox__cart-label"><?php echo esc_html( $add_to_cart_label ); ?></span>
			<?php endif; ?>
		</button>
	</form>
	<?php endif; ?>

	<?php // ── 8e. Cart-status error region — ARIA-live with dismiss button. ?>
	<?php
	// Mirror the product-card cartStatus pattern (L991-996).
	// The dismiss button is inside the region; it is visually hidden when
	// cartStatus is empty via the CSS :empty-adjacent rule (see style.css).
	// data-wp-text writes the error message; an empty string empties the span,
	// collapsing the region visually (CSS) and announcing nothing to screen readers.
	?>
	<div
		class="buybox__cart-status-region"
		role="alert"
		aria-live="assertive"
		aria-atomic="true"
		data-wp-class--buybox__cart-status-region--visible="context.cartStatus"
	>
		<p
			class="buybox__cart-status"
			data-wp-text="context.cartStatus"
		></p>
		<button
			type="button"
			class="buybox__dismiss-status"
			aria-label="<?php esc_attr_e( 'Dismiss message', 'sgs-blocks' ); ?>"
			data-wp-on--click="actions.dismissCartStatus"
		>
			<svg aria-hidden="true" focusable="false" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
		</button>
	</div>

	<?php // ── 8f. Availability live region — polite, visually hidden (mirrors card L900-906). ?>
	<p
		class="buybox__availability sgs-sr-only"
		role="status"
		aria-live="polite"
		data-wp-text="context.availabilityNote"
	></p>

	<?php
	// ── 8g. Optional extras (FR-Wave-B, extended by extrasBeforeCount) — child
	// blocks dropped below the add-to-cart form (a second CTA,
	// sgs/whatsapp-cta, an sgs/icon-list assurance list…), or the trailing
	// remainder once extrasBeforeCount has taken its share above the price
	// (8-config above). $buybox_extras_after_html is $content unchanged when
	// extrasBeforeCount is 0, so a buybox with no children — or the feature
	// left off — renders byte-identical to before this feature existed.
	?>
	<?php if ( '' !== trim( (string) $buybox_extras_after_html ) ) : ?>
	<div class="sgs-buybox__extras">
		<?php echo $buybox_extras_after_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WP core InnerBlocks output, already rendered + escaped by render_block()/WP_Block::render(). ?>
	</div>
	<?php endif; ?>

	</div><?php // end .sgs-buybox__config-col. ?>

	<?php
	// ── 8-island. Gallery data-island (FR-30-10 Step-10a, all-variation fix).
	// All >=2-image variation galleries, keyed by combo key, emitted as JSON
	// inside the .sgs-buybox wrapper so the product-card store (which registers
	// this wrapper as its cardRef in initPillBridge) can read each variation's
	// gallery on swap WITHOUT the 24 KB context-cap limit. The HEX flags neutralise
	// </script>, &, ', and " so the JSON cannot break out of the script element
	// or inject markup (XSS-safe). wp_json_encode returns false on failure → {}.
	$buybox_island_json = wp_json_encode(
		$buybox_gallery_island,
		JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_SLASHES
	);
	if ( false === $buybox_island_json ) {
		$buybox_island_json = '{}';
	}
	?>
	<script type="application/json" class="sgs-buybox-galleries"><?php echo $buybox_island_json; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_json_encode with JSON_HEX_TAG|AMP|APOS|QUOT neutralises all script-breakout / XSS vectors. ?></script>

</div>
<?php
echo ob_get_clean(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- ob_get_clean() returns the buffered HTML built above with esc_* on all dynamic values.

// Spec 43 FR-43-25 — the product-linked flow's full-screen modal, rendered
// after the buybox itself (once per page even with two buyboxes for the
// same product/flow — see buybox-linked-flow.php's static guard).
if ( $buybox_linked_flow_post instanceof \WP_Post ) {
	sgs_buybox_render_linked_flow_modal( $buybox_linked_flow_post );
}

