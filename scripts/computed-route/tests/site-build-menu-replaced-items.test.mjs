// Spec 48 FR-48-55 part 3: a menu built before a row's slot became a custom link (a draft link with a fragment or a query,
// lib/site-build-menus.mjs::desiredMenus) still holds that row's old post item. The plan removes it before the link takes the
// slot, keeps every other item no row asks for after the page map's items, and plans positions WordPress then holds, so a
// fresh read after the plan has run plans nothing (lib/site-build-plan.mjs::planBuild, lib/site-build-apply.mjs::applyPhase,
// lib/site-build-menus-step.mjs::menusStep). The site is a fake WP-CLI menu that renumbers on add, move and removal the way
// wp-cli/entity-command's Menu_Item_Command does (both its current reorder-on-update and the older raw position write).
// Each MUST FAIL test turns red under a mutation in tests/site-build-menu-replaced-items.mutations.json
// (node scripts/computed-route/tools/mutate.mjs scripts/computed-route scripts/computed-route/tests/site-build-menu-replaced-items.mutations.json tests/site-build-menu-replaced-items.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { linkContext } from '../lib/draft-link.mjs';
import { menuLinksFor } from '../lib/site-build-menu-links.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';
import { applyPhase } from '../lib/site-build-apply.mjs';
import { menusStep } from '../lib/site-build-menus-step.mjs';

const row = ( o ) => ( { route: null, parent: null, template: null, menus: [], collection: 'static', flags: [], id: null, ...o } );
const at = ( menu, position ) => ( { menu, position, parentItem: null } );
const ROWS = () => [
	row( { route: 'Home.dc.html', slug: 'home', title: 'Home', postType: 'page', template: 'front-page', id: 10, menus: [ at( 'footer', 2 ) ] } ),
	row( { route: 'Shop.dc.html', slug: 'shop', title: 'Shop', postType: 'page', id: 11, menus: [ at( 'footer', 4 ) ] } ),
	row( { route: 'Help.dc.html', slug: 'help', title: 'Help', postType: 'page', id: 12, menus: [ at( 'footer', 1 ) ] } ),
];
const item = ( label, target, position ) => ( { label, targets: [ target ], children: [], position, parentItem: null } );
const MENUS = [ { menu: 'footer', region: 'footer', file: 'SiteFooter.dc.html', items: [
	item( 'FAQs', 'Help.dc.html', 1 ),
	item( 'Build your box', 'Home.dc.html#build', 2 ),
	item( 'Delivery', 'Help.dc.html#delivery', 3 ),
	item( 'Gift ideas', 'Shop.dc.html?cat=gifts', 4 ) ] } ];

// The footer as a site build made it before page links with a fragment or query were custom links: the home and shop slots
// are post items, and a person added "Press" by hand.
const BEFORE = () => [
	{ id: 60, type: 'post_type', object: 'page', objectId: 12, title: 'FAQs', parent: 0, order: 1, url: '', description: '' },
	{ id: 61, type: 'post_type', object: 'page', objectId: 10, title: 'Build your box', parent: 0, order: 2, url: '', description: '' },
	{ id: 62, type: 'post_type', object: 'page', objectId: 11, title: 'Gift ideas', parent: 0, order: 3, url: '', description: '' },
	{ id: 63, type: 'custom', object: 'custom', objectId: 63, title: 'Press', parent: 0, order: 4, url: 'https://press.example/', description: '' },
];

const stateOf = ( items ) => ( {
	holders: {},
	posts: Object.fromEntries( ROWS().map( ( r ) => [ r.id, { id: r.id, type: 'page', slug: r.slug, title: r.title, status: 'publish', parent: 0, template: '', rowKey: `page:${ r.slug }`, treeHash: '', sectionPage: 0 } ] ) ),
	marked: Object.fromEntries( ROWS().map( ( r ) => [ `page:${ r.slug }`, [ r.id ] ] ) ),
	menus: [ { id: 30, slug: 'footer', name: 'footer', owner: 'footer', items: items.map( ( e ) => ( { ...e } ) ) } ],
	pointerKeys: {}, locations: {}, registeredLocations: [], options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '' }, templates: {},
} );
const planFor = ( items, menuItems = MENUS ) => {
	const rows = ROWS();
	const menuLinks = menuLinksFor( { rows, ctx: linkContext( { rows, menuItems } ), catalogue: null, site: 'local' } );
	return planBuild( { rows, state: stateOf( items ), repo: 'none', client: 'none', menuLinks, menuItems } );
};
const itemActs = ( plan ) => plan.actions.filter( ( a ) => 'menus' === a.phase && /^item-/.test( a.type ) );

// A fake menu answering the WP-CLI calls applyPhase makes. `reorderOnUpdate` is the current entity-command (an update moves
// the item to its rank and shifts the items between); without it an update writes the raw menu_order, as older versions do.
// Add and delete renumber the items at or after the position in both.
function fakeWp( items, { reorderOnUpdate } ) {
	let next = 100;
	const flag = ( args, k ) => args.find( ( a ) => a.startsWith( `--${ k }=` ) )?.slice( k.length + 3 );
	const shift = ( from, by, except ) => items.filter( ( e ) => e.order >= from && e.id !== except ).forEach( ( e ) => ( e.order += by ) );
	return ( args ) => {
		const [ , , cmd ] = args;
		if ( 'add-post' === cmd || 'add-custom' === cmd ) {
			const id = next++;
			const position = Number( flag( args, 'position' ) );
			const e = 'add-post' === cmd
				? { id, type: 'post_type', object: 'page', objectId: Number( args[ 4 ] ), title: flag( args, 'title' ) || '', parent: Number( flag( args, 'parent-id' ) || 0 ), order: position, url: '', description: flag( args, 'description' ) || '' }
				: { id, type: 'custom', object: 'custom', objectId: id, title: args[ 4 ], parent: Number( flag( args, 'parent-id' ) || 0 ), order: position, url: args[ 5 ], description: flag( args, 'description' ) || '' };
			items.push( e );
			shift( position, 1, id );
			return `${ id }\n`;
		}
		if ( 'update' === cmd ) {
			const e = items.find( ( x ) => x.id === Number( args[ 3 ] ) );
			let position = Number( flag( args, 'position' ) );
			if ( reorderOnUpdate ) {
				const sorted = [ ...items ].sort( ( a, b ) => a.order - b.order );
				position = Math.min( position, sorted.length );
				const old = sorted.indexOf( e ) + 1;
				if ( position < old ) {
					sorted.slice( position - 1, old - 1 ).forEach( ( x, i ) => ( x.order = position + i + 1 ) );
				} else if ( position > old ) {
					sorted.slice( old, position ).forEach( ( x, i ) => ( x.order = old + i ) );
				}
			}
			Object.assign( e, { order: position, parent: Number( flag( args, 'parent-id' ) || 0 ) }, flag( args, 'title' ) ? { title: flag( args, 'title' ) } : {}, flag( args, 'link' ) ? { url: flag( args, 'link' ) } : {} );
			return '';
		}
		if ( 'delete' === cmd ) {
			const i = items.findIndex( ( x ) => x.id === Number( args[ 3 ] ) );
			const [ e ] = items.splice( i, 1 );
			shift( e.order, -1, 0 );
			return '';
		}
		throw new Error( `unexpected wp call ${ args.join( ' ' ) }` );
	};
}

const run = ( reorderOnUpdate ) => {
	const items = BEFORE();
	const plan = planFor( items );
	applyPhase( plan.actions.filter( ( a ) => 'menus' === a.phase ), 'menus', { wp: fakeWp( items, { reorderOnUpdate } ), build: () => 0, onId: () => {}, log: () => {}, refs: {} } );
	return { plan, items };
};

test( 'MUST FAIL: the row\'s old post item for a slot now drawn as a custom link is removed before the link is added', () => {
	const acts = itemActs( planFor( BEFORE() ) );
	assert.deepEqual( acts.filter( ( a ) => 'item-delete' === a.type ).map( ( a ) => a.id ), [ 61, 62 ], 'the home and shop post items go; the hand-added item stays' );
	assert.ok( acts.findIndex( ( a ) => 'item-delete' === a.type ) < acts.findIndex( ( a ) => 'item-add' === a.type ), 'removals run before the adds' );
	assert.match( acts.find( ( a ) => 61 === a.id ).say, /remove \(a custom link to the same post's address holds its slot\)/ );
} );

test( 'MUST FAIL: an item no row asks for stays in the menu after the page map\'s items, and the plan says so', () => {
	const plan = planFor( BEFORE() );
	const press = itemActs( plan ).find( ( a ) => 63 === a.id );
	assert.equal( press.type, 'item-update' );
	assert.equal( press.position, 5, 'after the four items the page map asks for' );
	assert.ok( plan.notes.some( ( n ) => /item 63 "Press" is not one any page-map row asks for; it is left in place, after the page map's items/.test( n ) ) );
} );

for ( const reorderOnUpdate of [ true, false ] ) {
	test( `MUST FAIL: after the plan runs, a fresh read plans no menu step (WP-CLI ${ reorderOnUpdate ? 'reordering on update' : 'writing the raw position' })`, () => {
		const { items } = run( reorderOnUpdate );
		assert.deepEqual( [ ...items ].sort( ( a, b ) => a.order - b.order ).map( ( e ) => [ e.order, e.title, e.url || e.objectId ] ), [
			[ 1, 'FAQs', 12 ], [ 2, 'Build your box', '/#build' ], [ 3, 'Delivery', '/help/#delivery' ], [ 4, 'Gift ideas', '/shop/?cat=gifts' ], [ 5, 'Press', 'https://press.example/' ],
		] );
		assert.deepEqual( itemActs( planFor( items ) ).map( ( a ) => a.say ), [], 'the read-back converges' );
	} );
}

test( 'MUST FAIL: the menus step removes an item once when the mega rule and the plan both name it', () => {
	const plan = { actions: [ { phase: 'menus', type: 'item-delete', id: 61, say: 'plan' }, { phase: 'menus', type: 'item-update', id: 60, say: 'move' } ], options: [] };
	const step = menusStep( plan, [ { phase: 'menus', type: 'item-delete', id: 61, say: 'superseded' } ] );
	assert.deepEqual( step.actions.map( ( a ) => a.say ), [ 'superseded', 'move' ] );
} );

test( 'MUST FAIL: an external address is matched whole, so a site link with the same path is not taken for it', () => {
	const menuItems = [ { ...MENUS[ 0 ], items: [ ...MENUS[ 0 ].items, item( 'Instagram', 'https://social.example/', 5 ) ] } ];
	const home = { id: 64, type: 'custom', object: 'custom', objectId: 64, title: 'Home', parent: 0, order: 5, url: '/', description: '' };
	const acts = itemActs( planFor( [ ...BEFORE().slice( 0, 1 ), home ], menuItems ) );
	assert.ok( acts.some( ( a ) => 'item-add' === a.type && 'https://social.example/' === a.url ), 'the external link is added' );
	assert.ok( ! acts.some( ( a ) => 64 === a.id && a.url ), 'the site\'s own home link keeps its address' );
} );
