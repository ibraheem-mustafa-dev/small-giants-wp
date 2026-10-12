// Proves provision-calibration-refs.mjs's planning (Spec 48 Appendix A step 13) on fake site states: an empty site gets
// every object planned and an existing image role kept; a provisioned site plans nothing and gives the same refs
// (idempotent); a partly provisioned site plans only what is missing; an unsupplied role is reported; the refs written
// after a run come from what the site printed. Offline: no site is read or written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planProvision, refsFromResult, applyPhp, MENU_ITEMS, MENU_ITEM_ROLE_KEY } from '../lib/provision-refs.mjs';
import { parseArgs, describePlan } from '../provision-calibration-refs.mjs';

const empty = { woocommerce: false, menu: null, items: [], posts: { panel: null, drawer: null }, media: { image: null, logo: null }, product: null };
const image = { id: 18, url: 'https://site.test/wp-content/uploads/cr-overlay.png' };
// A site where a previous run created everything: item ids 101.. in MENU_ITEMS order, parents by key.
function provisioned() {
	const ids = Object.fromEntries( MENU_ITEMS.map( ( it, i ) => [ it.key, 101 + i ] ) );
	return {
		woocommerce: true,
		menu: 50,
		items: MENU_ITEMS.map( ( it ) => ( { id: ids[ it.key ], title: it.title, parent: it.parent ? ids[ it.parent ] : 0, object: it.post ? 'sgs_mega_menu' : 'custom', objectId: 0 } ) ),
		posts: { panel: 60, drawer: 61 },
		media: { image: null, logo: { id: 70, url: 'https://site.test/logo.png' } },
		product: 80,
	};
}

test( 'an empty site plans the menu, its items, the panel and drawer, keeps an existing image and reports an unsupplied product', () => {
	const plan = planProvision( empty, { refs: { image }, kept: { image: true } } );
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
	assert.equal( top.length, 6 );
	assert.equal( top.indexOf( top.find( ( i ) => i.key === MENU_ITEM_ROLE_KEY ) ), 3 );
	assert.equal( MENU_ITEMS.find( ( i ) => i.key === MENU_ITEM_ROLE_KEY ).url, '#' );
	assert.ok( MENU_ITEMS.some( ( i ) => i.parent ) && MENU_ITEMS.some( ( i ) => i.post ) );
	assert.ok( ! MENU_ITEMS.some( ( i ) => i.parent === MENU_ITEM_ROLE_KEY ), 'the role item has no children' );
} );

test( 'idempotent: a provisioned site plans nothing and gives the refs it already holds', () => {
	const plan = planProvision( provisioned(), { refs: { image }, kept: { image: true } } );
	assert.deepEqual( plan.actions, [] );
	assert.deepEqual( plan.refs, { menu: 50, menuItem: 101 + MENU_ITEMS.findIndex( ( i ) => i.key === MENU_ITEM_ROLE_KEY ), drawer: 61, image, logo: 70, product: 80 } );
	assert.deepEqual( plan.unsupplied, [] );
} );

test( 'a partly provisioned site plans only what is missing; a stale image ref is not kept', () => {
	const s = provisioned();
	s.items = s.items.filter( ( i ) => 'Child two' !== i.title );
	s.posts.drawer = null;
	const plan = planProvision( s, { refs: { image: { id: 999, url: 'x' } }, kept: { image: 'no post 999' }, files: { image: 'img/a.png' } } );
	assert.deepEqual( plan.actions, [ 'add menu item "Child two" under "Shop" (/shop/two/)', 'create sgs_drawer "cr-calibration-drawer" (CR calibration drawer)', 'import img/a.png as "CR calibration image"' ] );
	assert.equal( plan.refs.image, 'new' );
	assert.equal( plan.known.items.shop, 101 );
	// The written refs come from what the site printed.
	const written = refsFromResult( plan, { menu: 50, items: { featured: 106 }, posts: { panel: 60, drawer: 77 }, media: { image: { id: 90, url: 'u' } }, product: 80 } );
	assert.deepEqual( written, { menu: 50, menuItem: 106, drawer: 77, image: { id: 90, url: 'u' }, logo: 70, product: 80 } );
} );

test( 'a logo with no file reuses the image, a new image included', () => {
	const plan = planProvision( empty, { files: { image: 'a.png' } } );
	assert.equal( plan.refs.logo, 'same-as-image' );
	const written = refsFromResult( plan, { menu: 1, items: { featured: 2 }, posts: { drawer: 3 }, media: { image: { id: 4, url: 'u' } } } );
	assert.deepEqual( written, { menu: 1, menuItem: 2, drawer: 3, image: { id: 4, url: 'u' }, logo: 4 } );
	const none = planProvision( empty );
	assert.deepEqual( none.unsupplied.map( ( u ) => u.role ), [ 'image', 'logo', 'product' ] );
} );

test( 'the apply PHP carries the plan and finds before it creates', () => {
	const php = applyPhp( { known: planProvision( empty ).known, media: {}, product: false } );
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
