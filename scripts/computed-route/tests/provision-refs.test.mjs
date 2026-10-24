// Proves provision-calibration-refs.mjs's planning (Spec 48 Appendix A step 13) on fake site states: an empty site gets
// every object planned and an existing image role kept; a provisioned site plans nothing and gives the same refs
// (idempotent); a partly provisioned site plans only what is missing; an unsupplied role is reported; the refs written
// after a run come from what the site printed. Offline: no site is read or written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planProvision, refsFromResult, applyPhp, MENU_ITEMS, MENU_ITEM_ROLE_KEY, CURRENT_ITEM_KEY } from '../lib/provision-refs.mjs';
import { parseArgs, describePlan } from '../provision-calibration-refs.mjs';
import { PRODUCT_SPEC, PRODUCT_SPEC_KEY, BASKET_VARIATION, productApplyPhp } from '../lib/provision-product.mjs';

const empty = { woocommerce: false, menu: null, items: [], posts: { panel: null, drawer: null }, media: { image: null, logo: null }, product: null };
// The target's calibration page (calibration-targets.json postId).
const PAGE = 15;
const image = { id: 18, url: 'https://site.test/wp-content/uploads/cr-overlay.png' };
// A site where a previous run created everything: item ids 101.. in MENU_ITEMS order, parents by key.
function provisioned() {
	const ids = Object.fromEntries( MENU_ITEMS.map( ( it, i ) => [ it.key, 101 + i ] ) );
	return {
		woocommerce: true,
		menu: 50,
		items: MENU_ITEMS.map( ( it ) => ( { id: ids[ it.key ], title: it.title, description: it.description ?? '', parent: it.parent ? ids[ it.parent ] : 0, object: it.post ? 'sgs_mega_menu' : it.page ? 'page' : 'custom', objectId: it.page ? PAGE : 0 } ) ),
		posts: { panel: 60, drawer: 61 },
		media: { image: null, logo: { id: 70, url: 'https://site.test/logo.png' } },
		product: 80,
		productReady: true,
	};
}

test( 'an empty site plans the menu, its items, the panel and drawer, keeps an existing image and reports an unsupplied product', () => {
	const plan = planProvision( empty, { refs: { image }, kept: { image: true }, page: PAGE } );
	assert.equal( plan.actions.filter( ( a ) => a.startsWith( 'add menu item' ) ).length, MENU_ITEMS.length );
	assert.ok( plan.actions.includes( 'create menu "CR calibration"' ) );
	assert.ok( plan.actions.some( ( a ) => a.startsWith( 'create sgs_drawer' ) ) && plan.actions.some( ( a ) => a.startsWith( 'create sgs_mega_menu' ) ) );
	assert.deepEqual( plan.refs, { menu: 'new', menuItem: 'new', drawer: 'new', image, logo: 'same-as-image' } );
	assert.deepEqual( plan.unsupplied.map( ( u ) => u.role ), [ 'product' ] );
	const lines = describePlan( 'site-x', empty, plan ).join( '\n' );
	assert.match( lines, /menu none yet; WooCommerce not active/ );
	assert.match( lines, /not supplied: product \(WooCommerce is not active on the site\)/ );
} );

test( 'the menu item role is a plain top-level link fourth among the top-level items, after a submenu and a mega item', () => {
	const top = MENU_ITEMS.filter( ( i ) => ! i.parent );
	assert.equal( top.length, 7 );
	assert.equal( top.indexOf( top.find( ( i ) => i.key === MENU_ITEM_ROLE_KEY ) ), 3 );
	assert.equal( MENU_ITEMS.find( ( i ) => i.key === MENU_ITEM_ROLE_KEY ).url, '#' );
	assert.ok( MENU_ITEMS.some( ( i ) => i.parent ) && MENU_ITEMS.some( ( i ) => i.post ) );
	assert.ok( ! MENU_ITEMS.some( ( i ) => i.parent === MENU_ITEM_ROLE_KEY ), 'the role item has no children' );
} );

test( 'idempotent: a provisioned site plans nothing and gives the refs it already holds', () => {
	const plan = planProvision( provisioned(), { refs: { image }, kept: { image: true }, page: PAGE } );
	assert.deepEqual( plan.actions, [] );
	assert.deepEqual( plan.refs, { menu: 50, menuItem: 101 + MENU_ITEMS.findIndex( ( i ) => i.key === MENU_ITEM_ROLE_KEY ), drawer: 61, image, logo: 70, product: 80 } );
	assert.deepEqual( plan.unsupplied, [] );
} );

test( 'a partly provisioned site plans only what is missing; a stale image ref is not kept', () => {
	const s = provisioned();
	s.items = s.items.filter( ( i ) => 'Child two' !== i.title );
	s.posts.drawer = null;
	const plan = planProvision( s, { refs: { image: { id: 999, url: 'x' } }, kept: { image: 'no post 999' }, files: { image: 'img/a.png' }, page: PAGE } );
	assert.deepEqual( plan.actions, [ 'add menu item "Child two" under "Shop" (/shop/two/)', 'create sgs_drawer "cr-calibration-drawer" (CR calibration drawer)', 'import img/a.png as "CR calibration image"' ] );
	assert.equal( plan.refs.image, 'new' );
	assert.equal( plan.known.items.shop, 101 );
	// The written refs come from what the site printed.
	const written = refsFromResult( plan, { menu: 50, items: { featured: 106 }, posts: { panel: 60, drawer: 77 }, media: { image: { id: 90, url: 'u' } }, product: 80 } );
	assert.deepEqual( written, { menu: 50, menuItem: 106, drawer: 77, image: { id: 90, url: 'u' }, logo: 70, product: 80 } );
} );

test( 'a logo with no file reuses the image, a new image included', () => {
	const plan = planProvision( empty, { files: { image: 'a.png' }, page: PAGE } );
	assert.equal( plan.refs.logo, 'same-as-image' );
	const written = refsFromResult( plan, { menu: 1, items: { featured: 2 }, posts: { drawer: 3 }, media: { image: { id: 4, url: 'u' } } } );
	assert.deepEqual( written, { menu: 1, menuItem: 2, drawer: 3, image: { id: 4, url: 'u' }, logo: 4 } );
	const none = planProvision( empty, { page: PAGE } );
	assert.deepEqual( none.unsupplied.map( ( u ) => u.role ), [ 'image', 'logo', 'product' ] );
} );

test( 'the apply PHP carries the plan and finds before it creates', () => {
	const php = applyPhp( { known: planProvision( empty, { page: PAGE } ).known, media: {}, product: false } );
	const data = JSON.parse( Buffer.from( php.match( /base64_decode\( '([^']+)'/ )[ 1 ], 'base64' ).toString() );
	assert.deepEqual( data.items.map( ( i ) => i.key ), MENU_ITEMS.map( ( i ) => i.key ) );
	assert.match( php, /get_page_by_path\( \$p\['slug'\]/ );
	assert.match( php, /wp_get_nav_menu_object\( \$a\['menuName'\] \)/ );
	assert.match( php, /wp_slash\(/ );
} );

test( 'arguments: a site is required, files must be images, unknown flags are refused', () => {
	assert.deepEqual( parseArgs( [ '--site', 'indus-test', '--dry-run' ] ), { site: 'indus-test', dryRun: true, files: {} } );
	assert.deepEqual( parseArgs( [ '--site', 's', '--logo', 'a/b.png' ] ).files, { logo: 'a/b.png' } );
	assert.match( parseArgs( [ '--dry-run' ] ).error, /--site is required/ );
	assert.match( parseArgs( [ '--site', 's', '--image', 'x.wav' ] ).error, /an image file/ );
	assert.match( parseArgs( [ '--site', 's', '--wipe' ] ).error, /unknown argument/ );
} );

test( 'the featured item carries the description the badge settings render, and create/set/no-op actions follow the site state', () => {
	const featured = MENU_ITEMS.find( ( i ) => i.key === MENU_ITEM_ROLE_KEY );
	assert.equal( featured.description, 'SOON' );
	// Creating it names the description.
	const created = planProvision( empty, { page: PAGE } ).actions.find( ( a ) => a.startsWith( 'add menu item "Featured"' ) );
	assert.match( created, /with description "SOON"/ );
	// An existing item with no description is reported, and only that item.
	const s = provisioned();
	s.items.find( ( i ) => 'Featured' === i.title ).description = '';
	assert.deepEqual( planProvision( s, { page: PAGE } ).actions, [ 'set description of menu item "Featured" to "SOON"' ] );
	// A state read from an older script (no description field) is also reported; a matching one is not.
	delete s.items.find( ( i ) => 'Featured' === i.title ).description;
	assert.equal( planProvision( s, { page: PAGE } ).actions.length, 1 );
	assert.deepEqual( planProvision( provisioned(), { page: PAGE } ).actions, [] );
	// The apply PHP creates with the description and syncs an existing item's post_content.
	const php = applyPhp( { known: planProvision( s, { page: PAGE } ).known } );
	assert.match( php, /'menu-item-description' => \$it\['description'\]/ );
	assert.match( php, /wp_update_post\( wp_slash\( array\( 'ID' => \$ids\['items'\]\[ \$it\['key'\] \], 'post_content' => \$it\['description'\]/ );
} );

test( 'MUST FAIL: the menu holds an item linked to the target\'s own calibration page, so a menu renders a current-page item there', () => {
	const item = MENU_ITEMS.find( ( i ) => i.key === CURRENT_ITEM_KEY );
	assert.ok( item && item.page && ! item.parent && ! item.url, 'a top-level post_type item, no fixed URL' );
	assert.ok( planProvision( empty, { page: PAGE } ).actions.includes( `add menu item "${ item.title }" linking to post ${ PAGE } (the calibration page)` ) );
	// An item left pointing at another post is relinked; the plan carries the page to apply.
	const s = provisioned();
	s.items.find( ( i ) => i.title === item.title ).objectId = 99;
	const plan = planProvision( s, { page: PAGE } );
	assert.deepEqual( plan.actions, [ `relink menu item "${ item.title }" to post ${ PAGE } (the calibration page)` ] );
	assert.equal( plan.known.page, PAGE );
	const php = applyPhp( { known: plan.known } );
	assert.match( php, /'menu-item-type' => 'post_type', 'menu-item-object' => get_post_type\( \$ids\['page'\] \), 'menu-item-object-id' => \$ids\['page'\]/ );
	assert.match( php, /if \( ! empty\( \$it\['page'\] \) \) \{\s*\$args \+= \$page_args;/, 'a new current-page item is created as a post_type item' );
	assert.match( php, /wp_update_nav_menu_item\( \$ids\['menu'\], \$ids\['items'\]\[ \$it\['key'\] \]/, 'an existing item is updated in place' );
	assert.throws( () => planProvision( empty ), /calibration page/, 'no page: refused, never an item linked to nothing' );
} );

test( 'MUST FAIL (product-card 62 settings, buybox and filter-search render nothing): a found product below the calibration spec is completed in place; one at the spec plans nothing', () => {
	const below = { ...provisioned(), productReady: false };
	const plan = planProvision( below, { refs: { product: 80 }, kept: { product: true }, page: PAGE } );
	assert.equal( plan.productDue, true );
	assert.equal( plan.refs.product, 80, 'completed in place: the ref keeps its ID' );
	assert.ok( plan.actions.some( ( a ) => a.startsWith( 'complete product "CR calibration product" (80)' ) ) );
	assert.ok( applyPhp( { known: plan.known, product: plan.productDue } ).includes( 'WC_Product_Variable' ) );
	assert.deepEqual( refsFromResult( plan, { menu: 50, items: {}, posts: {}, product: 80 } ).product, 80 );
	const ready = planProvision( provisioned(), { refs: { product: 80 }, kept: { product: true }, page: PAGE } );
	assert.equal( ready.productDue, false );
	assert.deepEqual( ready.actions, [] );
	const fresh = planProvision( { ...empty, woocommerce: true }, { page: PAGE } );
	assert.equal( fresh.productDue, true );
	assert.equal( fresh.refs.product, 'new' );
} );

test( 'MUST FAIL (the spec exercises every product setting): variable colour and size axes with swatch hexes and size measures, a non-variation tag attribute, an RRP above a sale price, two brands', () => {
	const axes = PRODUCT_SPEC.attributes.filter( ( a ) => a.variation );
	assert.equal( axes.length, 2 );
	const colour = axes.find( ( a ) => a.terms.every( ( t ) => /^#[0-9a-f]{6}$/i.test( t.meta?._sgs_swatch_color || '' ) ) );
	assert.ok( colour && colour.terms.length > 4, 'more colours than the fixture swatchMaxVisible (4)' );
	const size = axes.find( ( a ) => a.terms.every( ( t ) => t.meta?._sgs_size_measure && /^\d+$/.test( t.slug ) ) );
	assert.ok( size, 'numeric size slugs with a size measure' );
	assert.ok( PRODUCT_SPEC.attributes.some( ( a ) => ! a.variation && a.terms.length ) );
	assert.ok( Number( PRODUCT_SPEC.rrp ) > Number( PRODUCT_SPEC.regular ) && Number( PRODUCT_SPEC.sale ) < Number( PRODUCT_SPEC.regular ) );
	assert.ok( PRODUCT_SPEC.brands.length >= 2 );
	assert.deepEqual( Object.keys( BASKET_VARIATION ).sort(), axes.map( ( a ) => `pa_${ a.name }` ).sort() );
	assert.match( PRODUCT_SPEC_KEY, /^[0-9a-f]{12}$/ );
	const php = productApplyPhp();
	for ( const needle of [ "get_posts( array( 'post_type' => 'product', 'title' => $P['title']", "update_post_meta( $pid, '_sgs_rrp'", 'set_sale_price', "get_option( 'woocommerce_placeholder_image', 0 )", '$p->set_image_id( $placeholder );', '$v->set_image_id( 0 );', "update_post_meta( $pid, '_sgs_cr_fixture'", "update_term_meta( $bids[0], 'thumbnail_id'" ] ) {
		assert.ok( php.includes( needle ), needle );
	}
} );
