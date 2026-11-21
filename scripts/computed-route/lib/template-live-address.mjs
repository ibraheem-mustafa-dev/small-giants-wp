// Where a shop template shows on the live site, and how the walker's live side reaches it (Spec 48 FR-48-56, FR-48-96, FR-48-99).
// The single-product template shows at a product's own address and the product archive at the shop page; WooCommerce sends an
// empty basket's checkout to the basket, so a checkout walk's live context first adds a product to the basket (`live.prime`,
// scripts/parity/lib/prime.mjs). The site run asks the live site once (liveFactsPhp, read-only: the basket it tries a product in
// is WP-CLI's own and emptied, and its session is forgotten (WC_Session_Handler::forget_session) so WooCommerce's shutdown save
// writes no woocommerce_sessions row), then hands the addresses to site-run.mjs::liveAddress and the prime to Fill.

// A PHP single-quoted string literal.
const phpString = ( s ) => `'${ String( s ).replace( /\\/g, '\\\\' ).replace( /'/g, "\\'" ) }'`;

// The product slugs a run's product surfaces name in their draft routes (`Product.dc.html?id=zookies` names `zookies`), in order.
export function draftProductSlugs( routes ) {
	const out = [];
	for ( const r of routes || [] ) {
		const q = String( r ?? '' ).split( '?' )[ 1 ];
		const id = q ? new URLSearchParams( q ).get( 'id' ) : null;
		id && ! out.includes( id ) && out.push( id );
	}
	return out;
}

// The PHP printing one JSON line { shop, product, basket }: the shop page's path; the path of the first published, visible
// product whose slug `productSlugs` names, else the first such product that is no stand-in; and the product a basket accepts
// with the form fields that add it ({ path, fields }), found as WooCommerce's own add-to-cart form would add it: a simple
// product, else a variation with every attribute set (its parent no stand-in), each tried with no picks and then with the
// fewest picks each SGS pick group asks for. A stand-in is a calibration fixture (`_sgs_cr_fixture` or `_sgs_fixture` meta,
// or an `sgs-fixture-` SKU) or a gift card (a product type naming a gift, such as the plugin's `sgs_gift_card`, or a name or
// SKU saying "gift card"): neither shows the template as a shopper's product does. Any part the site cannot answer is null.
export function liveFactsPhp( { productSlugs = [] } = {} ) {
	return `<?php
if ( ! function_exists( 'wc_get_products' ) ) { echo wp_json_encode( array( 'shop' => null, 'product' => null, 'basket' => null ) ); return; }
$sgs_rel = static function ( $url ) { return $url ? wp_make_link_relative( $url ) : null; };
$sgs_shop_id = wc_get_page_id( 'shop' );
$sgs_out = array( 'shop' => $sgs_shop_id > 0 ? $sgs_rel( get_permalink( $sgs_shop_id ) ) : null, 'product' => null, 'basket' => null );
${ productPickPhp( { productSlugs } ) }
$sgs_candidates = array();`.concat( BASKET_PHP );
}

// The PHP printing one JSON line { product }: the product address liveFactsPhp gives, read-only and without its basket tries.
// With `flowLinked`, a product the draft does not name is first sought among the real products linked to a choice flow (the
// `_sgs_choice_flow` link the buy box resolves, plugins/sgs-blocks/includes/buybox-linked-flow.php::sgs_buybox_resolve_linked_flow),
// so a draft that draws the flow's opener is read on a page that shows one (a variable product first: see FLOW_LINKED_PICK_PHP); else the first real product, as liveFactsPhp.
export function productAddressPhp( { productSlugs = [], flowLinked = false } = {} ) {
	return `<?php
if ( ! function_exists( 'wc_get_products' ) ) { echo wp_json_encode( array( 'product' => null ) ); return; }
$sgs_rel = static function ( $url ) { return $url ? wp_make_link_relative( $url ) : null; };
$sgs_out = array( 'product' => null );
${ productPickPhp( { productSlugs, flowLinked } ) }
echo wp_json_encode( $sgs_out );
`;
}

// The PHP (no opening tag; $sgs_rel and $sgs_out set before it) defining the visibility and stand-in tests and setting
// $sgs_out['product']: the first visible product `productSlugs` names, else (with `flowLinked`) the first real product linked to
// a choice flow (a variable one first), else the first real product.
function productPickPhp( { productSlugs = [], flowLinked = false } ) {
	return `$sgs_visible = static function ( $p ) { return $p && 'publish' === $p->get_status() && 'hidden' !== $p->get_catalog_visibility(); };
$sgs_stand_in = static function ( $p ) {
	$id = $p->get_id();
	$fixture = '' !== (string) get_post_meta( $id, '_sgs_cr_fixture', true ) || '' !== (string) get_post_meta( $id, '_sgs_fixture', true ) || 0 === strpos( (string) $p->get_sku(), 'sgs-fixture-' );
	return $fixture || false !== stripos( (string) $p->get_type(), 'gift' ) || 1 === preg_match( '/gift[\\s_-]*card/i', $p->get_name() . ' ' . $p->get_sku() );
};
$sgs_real = static function ( $p ) use ( $sgs_visible, $sgs_stand_in ) { return $sgs_visible( $p ) && ! $sgs_stand_in( $p ); };
foreach ( array( ${ productSlugs.map( phpString ).join( ', ' ) } ) as $sgs_slug ) {
	$sgs_found = get_page_by_path( $sgs_slug, OBJECT, 'product' );
	$sgs_p = $sgs_found ? wc_get_product( $sgs_found->ID ) : null;
	if ( $sgs_visible( $sgs_p ) ) { $sgs_out['product'] = $sgs_rel( get_permalink( $sgs_p->get_id() ) ); break; }
}
${ flowLinked ? FLOW_LINKED_PICK_PHP : '' }if ( null === $sgs_out['product'] ) {
	foreach ( wc_get_products( array( 'status' => 'publish', 'limit' => 20, 'orderby' => 'ID', 'order' => 'ASC' ) ) as $sgs_p ) {
		if ( $sgs_real( $sgs_p ) ) { $sgs_out['product'] = $sgs_rel( get_permalink( $sgs_p->get_id() ) ); break; }
	}
}`;
}

// The first real variable product linked to a choice flow whose link resolves (the buy box's own resolver where the plugin is
// loaded), else the first real product of any type linked to one. A simple product's buy box returns before its `.sgs-buybox`
// wrapper and prints core's own Add to Cart (plugins/sgs-blocks/src/blocks/buybox/render.php, the `! $product->is_type( 'variable' )`
// branch: sgs_buybox_simple_keep_flow_html, sgs_buybox_simple_linked_flow_html), which no `addToCart*` setting styles and the live
// selector of Add to Cart (data/part-live-selectors.json) does not find; a variable product prints `.sgs-buybox .buybox__add-to-cart`
// with the opener beside it (keepAddToCartWithFlow) or in its place. So the verify reads a variable product when the shop has one.
const FLOW_LINKED_PICK_PHP = `if ( null === $sgs_out['product'] ) {
	$sgs_linked_first = null;
	foreach ( get_posts( array( 'post_type' => 'product', 'post_status' => 'publish', 'posts_per_page' => 50, 'orderby' => 'ID', 'order' => 'ASC', 'fields' => 'ids', 'meta_key' => '_sgs_choice_flow', 'meta_compare' => 'EXISTS' ) ) as $sgs_id ) {
		$sgs_p = wc_get_product( $sgs_id );
		$sgs_linked = function_exists( 'sgs_buybox_resolve_linked_flow' ) ? null !== sgs_buybox_resolve_linked_flow( (int) $sgs_id ) : '' !== (string) get_post_meta( $sgs_id, '_sgs_choice_flow', true );
		if ( ! ( $sgs_p && $sgs_real( $sgs_p ) && $sgs_linked ) ) { continue; }
		if ( $sgs_p->is_type( 'variable' ) ) { $sgs_out['product'] = $sgs_rel( get_permalink( $sgs_p->get_id() ) ); break; }
		$sgs_linked_first = $sgs_linked_first ?? $sgs_p;
	}
	if ( null === $sgs_out['product'] && $sgs_linked_first ) { $sgs_out['product'] = $sgs_rel( get_permalink( $sgs_linked_first->get_id() ) ); }
}
`;

// liveFactsPhp's basket half: the product a basket accepts, tried in WP-CLI's own basket, emptied and forgotten.
const BASKET_PHP = `
foreach ( wc_get_products( array( 'status' => 'publish', 'type' => 'simple', 'stock_status' => 'instock', 'limit' => 20, 'orderby' => 'ID', 'order' => 'ASC' ) ) as $sgs_p ) {
	if ( $sgs_p->is_purchasable() && $sgs_p->is_in_stock() && $sgs_real( $sgs_p ) ) { $sgs_candidates[] = $sgs_p; }
}
foreach ( wc_get_products( array( 'status' => 'publish', 'type' => 'variable', 'limit' => 20, 'orderby' => 'ID', 'order' => 'ASC' ) ) as $sgs_p ) {
	if ( ! $sgs_real( $sgs_p ) ) { continue; }
	foreach ( $sgs_p->get_children() as $sgs_vid ) {
		$sgs_v = wc_get_product( $sgs_vid );
		if ( $sgs_v && $sgs_v->is_purchasable() && $sgs_v->is_in_stock() && ! in_array( '', $sgs_v->get_variation_attributes(), true ) ) { $sgs_candidates[] = $sgs_v; break; }
	}
}
$sgs_pick_sets = static function ( $parent_id ) {
	$sets = array( array() );
	if ( ! class_exists( '\\SGS\\Blocks\\Configurator_Groups' ) || ! function_exists( '\\SGS\\Blocks\\sgs_picks_active_groups' ) ) { return $sets; }
	$active = \\SGS\\Blocks\\sgs_picks_active_groups( \\SGS\\Blocks\\Configurator_Groups::for_product( $parent_id ) );
	if ( ! $active ) { return $sets; }
	$fields = array();
	foreach ( $active as $key => $group ) {
		$need = max( 1, (int) ( $group['flags']['least'] ?? 1 ) );
		foreach ( array_slice( $group['terms'], 0, $need ) as $i => $term ) { $fields[ "sgs_picks[$key][$i]" ] = (string) $term['slug']; }
	}
	$sets[] = $fields;
	return $sets;
};
if ( function_exists( 'wc_load_cart' ) ) {
	wc_load_cart();
	foreach ( $sgs_candidates as $sgs_c ) {
		$sgs_pid = $sgs_c->get_parent_id() ? $sgs_c->get_parent_id() : $sgs_c->get_id();
		$sgs_attrs = $sgs_c->get_parent_id() ? $sgs_c->get_variation_attributes() : array();
		foreach ( $sgs_pick_sets( $sgs_pid ) as $sgs_set ) {
			$_POST = array();
			foreach ( $sgs_set as $sgs_k => $sgs_val ) {
				preg_match( '/^sgs_picks\\[([^\\]]+)\\]\\[(\\d+)\\]$/', $sgs_k, $sgs_m );
				$_POST['sgs_picks'][ $sgs_m[1] ][ (int) $sgs_m[2] ] = $sgs_val;
			}
			wc_clear_notices();
			$sgs_ok = apply_filters( 'woocommerce_add_to_cart_validation', true, $sgs_pid, 1, $sgs_c->get_parent_id() ? $sgs_c->get_id() : 0, $sgs_attrs );
			$sgs_in = $sgs_ok ? WC()->cart->add_to_cart( $sgs_pid, 1, $sgs_c->get_parent_id() ? $sgs_c->get_id() : 0, $sgs_attrs ) : false;
			WC()->cart->empty_cart();
			$_POST = array();
			if ( $sgs_in ) {
				$sgs_fields = array( 'add-to-cart' => (string) $sgs_pid, 'product_id' => (string) $sgs_pid, 'quantity' => '1' );
				if ( $sgs_c->get_parent_id() ) { $sgs_fields['variation_id'] = (string) $sgs_c->get_id(); $sgs_fields += $sgs_attrs; }
				$sgs_out['basket'] = array( 'path' => $sgs_rel( get_permalink( $sgs_pid ) ), 'fields' => $sgs_fields + $sgs_set );
				break 2;
			}
		}
	}
	wc_clear_notices();
	if ( isset( WC()->session ) && method_exists( WC()->session, 'forget_session' ) ) { WC()->session->forget_session(); }
}
echo wp_json_encode( $sgs_out );
`;

// The facts from the PHP's output (its last JSON object line), or null facts when it printed none.
export function readLiveFacts( output ) {
	const line = String( output ?? '' ).trim().split( /\r?\n/ ).reverse().find( ( l ) => l.trim().startsWith( '{' ) );
	const f = line ? JSON.parse( line ) : {};
	return { shop: f.shop ?? null, product: f.product ?? null, basket: f.basket?.path && f.basket?.fields ? f.basket : null };
}

// The addresses of the shop templates the facts answer, keyed by template slug (site-run.mjs::liveAddress's `shown`).
export function templateAddresses( facts ) {
	return Object.fromEntries( [ [ 'archive-product', facts?.shop ], [ 'single-product', facts?.product ] ].filter( ( [ , a ] ) => a ) );
}

// The walker's `live.prime` for a surface showing `template`: the checkout's basket product posted as its own form, else null.
export function livePrimeFor( template, facts ) {
	return 'checkout' === template && facts?.basket ? [ { url: facts.basket.path, form: facts.basket.fields } ] : null;
}
