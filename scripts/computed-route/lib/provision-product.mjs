// The calibration product (the fixtures' `{{product}}` role) that provision-calibration-refs.mjs finds or completes on a
// site: a published VARIABLE product, so every product setting has an element to paint. Generic for any client: every
// name is a "CR calibration" / "cr-" fixture name, nothing from a client's catalogue.
//   - two variation attributes, colour (each term carries a `_sgs_swatch_color` hex, so the card prints its colour dots
//     and the pickers their swatches; five colours, one more than the fixture's swatchMaxVisible, so the "+N" chip shows)
//     and size (numeric term slugs that the buybox fixture's band scale "S:52,M:57,L" places in S, M and L, each with the
//     `_sgs_size_measure` term meta the picker prints as its sub-label), and one non-variation attribute whose term the
//     product-card attribute tag matches;
//   - one variation per colour and size, each with a regular and a sale price;
//   - an RRP (`_sgs_rrp`, the fixtures' rrpMetaKey) above the price, so the RRP and the saving badge print;
//   - WooCommerce's own placeholder image (the `woocommerce_placeholder_image` attachment every WooCommerce site holds)
//     as the product image, and no image on the variations: the card treats a placeholder as no photo
//     (includes/product-card-no-photo.php::sgs_product_card_has_real_image) and shows its no-photo state (the
//     noImageLabel settings), while the buybox shows that image as its main image and thumbnail strip;
//   - two brand terms (the brand taxonomy, `product_brand` unless a site filters it), both on the product, so the card's
//     brand prints and a brand filter has the two terms its threshold needs; the first carries the calibration image as
//     its logo (`thumbnail_id`) when the site has one.
// A product found by title is completed in place (same ID, so the target's refs stay valid); `_sgs_cr_fixture` records
// the spec key it was completed to, so a site already at this spec plans nothing.
import { createHash } from 'crypto';

export const PRODUCT_TITLE = 'CR calibration product';

export const PRODUCT_SPEC = {
	title: PRODUCT_TITLE,
	regular: '139',
	sale: '119',
	rrp: '171',
	brands: [
		{ slug: 'cr-calibration-brand', name: 'CR calibration brand' },
		{ slug: 'cr-calibration-brand-two', name: 'CR calibration brand two' },
	],
	attributes: [
		{
			name: 'cr-colour',
			label: 'CR colour',
			variation: true,
			terms: [
				{ slug: 'cr-black', name: 'Black', meta: { _sgs_swatch_color: '#1a1a1a' } },
				{ slug: 'cr-gold', name: 'Gold', meta: { _sgs_swatch_color: '#c9a227' } },
				{ slug: 'cr-silver', name: 'Silver', meta: { _sgs_swatch_color: '#b8bcc2' } },
				{ slug: 'cr-blue', name: 'Blue', meta: { _sgs_swatch_color: '#1f4e9b' } },
				{ slug: 'cr-red', name: 'Red', meta: { _sgs_swatch_color: '#9b1f2e' } },
			],
		},
		{
			name: 'cr-size',
			label: 'CR size',
			variation: true,
			terms: [
				{ slug: '50', name: '50', meta: { _sgs_size_measure: '50 mm' } },
				{ slug: '55', name: '55', meta: { _sgs_size_measure: '55 mm' } },
				{ slug: '60', name: '60', meta: { _sgs_size_measure: '60 mm' } },
			],
		},
		{
			name: 'cr-feature',
			label: 'CR feature',
			variation: false,
			terms: [ { slug: 'cr-tagged', name: 'Tagged' } ],
		},
	],
};

// The spec's key, over the spec and the PHP that applies it: a product completed by an older spec or an older apply is
// completed again.
export const PRODUCT_SPEC_KEY = createHash( 'md5' ).update( JSON.stringify( PRODUCT_SPEC ) + productApplyPhp.toString() ).digest( 'hex' ).slice( 0, 12 );

// The basket line calibration adds before reading sgs/cart: the first colour and size of the variation attributes.
export const BASKET_VARIATION = Object.fromEntries( PRODUCT_SPEC.attributes.filter( ( a ) => a.variation ).map( ( a ) => [ `pa_${ a.name }`, a.terms[ 0 ].slug ] ) );

// Read-only PHP (inside statePhp, after `$s['product']` is set): whether the found product is at this spec.
export function productStatePhp() {
	return `$s['productReady'] = $s['product'] && '${ PRODUCT_SPEC_KEY }' === (string) get_post_meta( $s['product'], '_sgs_cr_fixture', true ) && 'variable' === WC_Product_Factory::get_product_type( $s['product'] );`;
}

// PHP (inside applyPhp, after media) that finds the product by title or creates it, and completes it to the spec. Reads
// `$ids` (the image attachment, if any, as the first brand's logo), sets `$ids['product']`, and calls `$fail` on an error.
export function productApplyPhp() {
	const spec = Buffer.from( JSON.stringify( { ...PRODUCT_SPEC, key: PRODUCT_SPEC_KEY } ) ).toString( 'base64' );
	return `$P = json_decode( base64_decode( '${ spec }' ), true );
$q = get_posts( array( 'post_type' => 'product', 'title' => $P['title'], 'post_status' => 'publish', 'numberposts' => 1 ) );
$pid = $q ? (int) $q[0]->ID : 0;
if ( ! $pid ) {
	$np = new WC_Product_Variable();
	$np->set_name( $P['title'] );
	$np->set_status( 'publish' );
	$pid = (int) $np->save();
}
if ( 'variable' !== WC_Product_Factory::get_product_type( $pid ) ) {
	wp_set_object_terms( $pid, 'variable', 'product_type' );
	wc_delete_product_transients( $pid );
}
$wc_attrs = array();
$axes = array();
foreach ( $P['attributes'] as $pos => $at ) {
	$tax = wc_attribute_taxonomy_name( $at['name'] );
	$aid = (int) wc_attribute_taxonomy_id_by_name( $at['name'] );
	if ( ! $aid ) {
		$aid = wc_create_attribute( array( 'name' => $at['label'], 'slug' => $at['name'], 'type' => 'select', 'order_by' => 'menu_order', 'has_archives' => false ) );
		if ( is_wp_error( $aid ) ) { $fail( "attribute {$at['name']}: " . $aid->get_error_message() ); }
	}
	if ( ! taxonomy_exists( $tax ) ) {
		register_taxonomy( $tax, array( 'product' ), array( 'hierarchical' => false, 'show_ui' => false, 'query_var' => true, 'rewrite' => false ) );
	}
	$tids = array();
	$slugs = array();
	foreach ( $at['terms'] as $t ) {
		$f = get_term_by( 'slug', $t['slug'], $tax );
		$tid = $f ? $f->term_id : wp_insert_term( $t['name'], $tax, array( 'slug' => $t['slug'] ) );
		if ( is_wp_error( $tid ) ) { $fail( "term {$t['slug']}: " . $tid->get_error_message() ); }
		$tid = is_array( $tid ) ? (int) $tid['term_id'] : (int) $tid;
		foreach ( ( $t['meta'] ?? array() ) as $mk => $mv ) { update_term_meta( $tid, $mk, $mv ); }
		$tids[] = $tid;
		$slugs[] = $t['slug'];
	}
	$a = new WC_Product_Attribute();
	$a->set_id( (int) $aid );
	$a->set_name( $tax );
	$a->set_options( $tids );
	$a->set_position( $pos );
	$a->set_visible( true );
	$a->set_variation( ! empty( $at['variation'] ) );
	$wc_attrs[] = $a;
	wp_set_object_terms( $pid, $tids, $tax );
	if ( ! empty( $at['variation'] ) ) { $axes[ $tax ] = $slugs; }
}
$img = (int) ( $ids['media']['image']['id'] ?? 0 );
$placeholder = (int) get_option( 'woocommerce_placeholder_image', 0 );
$p = new WC_Product_Variable( $pid );
$p->set_name( $P['title'] );
$p->set_image_id( $placeholder );
$p->set_gallery_image_ids( array() );
$p->set_status( 'publish' );
$p->set_attributes( $wc_attrs );
$p->set_default_attributes( array_map( function ( $s ) { return $s[0]; }, $axes ) );
$p->save();
update_post_meta( $pid, '_sgs_rrp', $P['rrp'] );
$brand_tax = function_exists( 'sgs_brand_logo_taxonomy' ) ? sgs_brand_logo_taxonomy() : 'product_brand';
if ( taxonomy_exists( $brand_tax ) ) {
	$bids = array();
	foreach ( $P['brands'] as $b ) {
		$f = get_term_by( 'slug', $b['slug'], $brand_tax );
		$bid = $f ? $f->term_id : wp_insert_term( $b['name'], $brand_tax, array( 'slug' => $b['slug'] ) );
		if ( is_wp_error( $bid ) ) { $fail( "brand {$b['slug']}: " . $bid->get_error_message() ); }
		$bids[] = is_array( $bid ) ? (int) $bid['term_id'] : (int) $bid;
	}
	wp_set_object_terms( $pid, $bids, $brand_tax );
	if ( $img ) { update_term_meta( $bids[0], 'thumbnail_id', $img ); }
}
$have = array();
foreach ( $p->get_children() as $vid ) {
	$v = wc_get_product( $vid );
	if ( ! $v ) { continue; }
	$va = $v->get_attributes();
	ksort( $va );
	$have[ wp_json_encode( $va ) ] = $v;
}
$combos = array( array() );
foreach ( $axes as $tax => $slugs ) {
	$next = array();
	foreach ( $combos as $c ) { foreach ( $slugs as $s ) { $next[] = $c + array( $tax => $s ); } }
	$combos = $next;
}
foreach ( $combos as $c ) {
	ksort( $c );
	$v = $have[ wp_json_encode( $c ) ] ?? new WC_Product_Variation();
	$v->set_parent_id( $pid );
	$v->set_attributes( $c );
	$v->set_regular_price( $P['regular'] );
	$v->set_sale_price( $P['sale'] );
	$v->set_stock_status( 'instock' );
	$v->set_image_id( 0 );
	$v->delete_meta_data( '_sgs_variation_gallery' );
	$v->set_status( 'publish' );
	$v->save();
}
WC_Product_Variable::sync( $pid );
wc_delete_product_transients( $pid );
update_post_meta( $pid, '_sgs_cr_fixture', $P['key'] );
$ids['product'] = $pid;`;
}
