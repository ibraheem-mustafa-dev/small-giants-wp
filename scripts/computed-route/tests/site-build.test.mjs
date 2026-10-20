// FR-48-55 against an in-memory WordPress: the site build's plan and its writer (each MUST FAIL when its rule breaks).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { orderRows, readPageMap, rowKey, writePageMap } from '../lib/site-build-map.mjs';
import { PHASES, planBuild, tally } from '../lib/site-build-plan.mjs';
import { applyPhase } from '../lib/site-build-apply.mjs';
import { ROW_META, TREE_META } from '../lib/site-build-state.mjs';
import { megaPanelLabel, megaPanelTitle } from '../lib/page-map-names.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const ROWS = () => [
	row( { slug: 'home', title: 'Home', route: 'home', menus: [ { menu: 'header', position: 1, parentItem: null } ] } ),
	row( { slug: 'story', title: 'Our Story', parent: 'about', menus: [ { menu: 'drawer', position: 1, parentItem: 'About' } ] } ),
	row( { slug: 'about', title: 'About Us', menus: [ { menu: 'header', position: 2, parentItem: null }, { menu: 'footer', position: 1, parentItem: null } ] } ),
	row( { slug: 'blog', title: 'Blog', collection: 'live', menus: [ { menu: 'drawer', position: 2, parentItem: 'About' } ] } ),
	row( { slug: 'first-post', title: 'First post', route: 'post-1', postType: 'post', collection: 'live' } ),
	row( { slug: 'header', title: 'Header', route: undefined, postType: 'sgs_header' } ),
	row( { slug: 'site-menu', title: 'Site menu', route: undefined, postType: 'sgs_drawer' } ),
	row( { slug: 'footer', title: 'Footer', route: undefined, postType: 'sgs_footer' } ),
	row( { slug: 'about', title: megaPanelTitle( 'About' ), route: undefined, postType: 'sgs_mega_menu', menus: [ { menu: 'header', position: 2, parentItem: null } ] } ),
	row( { slug: 'enquiry', title: 'Enquiry', route: undefined, postType: 'sgs_form' } ),
].map( ( r ) => Object.fromEntries( Object.entries( r ).filter( ( [ , v ] ) => undefined !== v ) ) );

// A WordPress that answers the state read and the writer's WP-CLI calls.
function fakeSite() {
	const s = { posts: {}, meta: {}, menus: [], items: [], locations: {}, options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '' }, pointers: { header: 0, footer: 0, drawer: 5 }, next: 100, calls: [] };
	s.state = ( rows ) => {
		const ids = rows.map( ( r ) => r.id ).filter( Number.isInteger );
		const marked = Object.keys( s.posts ).map( Number ).filter( ( id ) => s.meta[ id ]?.[ ROW_META ] );
		const view = ( id ) => ( s.posts[ id ] ? { ...s.posts[ id ], rowKey: s.meta[ id ]?.[ ROW_META ] || '', treeHash: s.meta[ id ]?.[ TREE_META ] || '' } : null );
		const holders = Object.fromEntries( rows.filter( ( r ) => ! Number.isInteger( r.id ) ).map( ( r ) => [ rowKey( r ), Object.values( s.posts ).filter( ( p ) => p.type === r.postType && p.slug === r.slug ).map( ( p ) => p.id ) ] ).filter( ( [ , v ] ) => v.length ) );
		return {
			holders,
			posts: Object.fromEntries( [ ...ids, ...marked ].map( ( id ) => [ String( id ), view( id ) ] ) ),
			marked: marked.reduce( ( m, id ) => ( { ...m, [ s.meta[ id ][ ROW_META ] ]: [ ...( m[ s.meta[ id ][ ROW_META ] ] || [] ), id ] } ), {} ),
			menus: s.menus.map( ( m ) => ( { ...m, items: s.items.filter( ( i ) => i.menu === m.id ).map( ( i ) => ( { ...i } ) ) } ) ),
			locations: { ...s.locations }, registeredLocations: [ 'primary', 'footer' ], templates: [], options: { ...s.options }, pointers: { ...s.pointers },
		};
	};
	const flag = ( args, name ) => args.find( ( a ) => a.startsWith( `--${ name }=` ) )?.slice( name.length + 3 );
	s.wp = ( args ) => {
		s.calls.push( args.join( ' ' ) );
		const [ a, b, c ] = args;
		if ( 'term' === a && 'meta' === b ) {
			s.menus.find( ( m ) => m.id === Number( args[ 3 ] ) ).owner = args[ 5 ];
		} else if ( 'post' === a && 'meta' === b ) {
			s.meta[ args[ 3 ] ] = { ...s.meta[ args[ 3 ] ], [ args[ 4 ] ]: args[ 5 ] };
		} else if ( 'post' === a && 'update' === b ) {
			const p = s.posts[ c ];
			args.slice( 3 ).forEach( ( f ) => {
				const [ , k, v ] = /^--([a-z_]+)=(.*)$/.exec( f );
				p[ { post_title: 'title', post_name: 'slug', post_status: 'status', post_parent: 'parent', page_template: 'template' }[ k ] ] = 'post_parent' === k ? Number( v ) : v;
			} );
		} else if ( 'menu' === a && 'create' === b ) {
			const id = s.next++;
			s.menus.push( { id, slug: c, name: c } );
			return `${ id }\n`;
		} else if ( 'menu' === a && 'item' === b && c.startsWith( 'add-' ) ) {
			const id = s.next++;
			const post = 'add-post' === c ? s.posts[ args[ 4 ] ] : null;
			s.items.push( { id, menu: Number( args[ 3 ] ), title: post ? flag( args, 'title' ) || '' : args[ 4 ], object: post ? post.type : 'custom', objectId: post ? post.id : id, type: post ? 'post_type' : 'custom', parent: Number( flag( args, 'parent-id' ) || 0 ), order: Number( flag( args, 'position' ) ), url: post ? '' : args[ 5 ] } );
			return `${ id }\n`;
		} else if ( 'menu' === a && 'item' === b && 'update' === c ) {
			const it = s.items.find( ( i ) => i.id === Number( args[ 3 ] ) );
			it.order = Number( flag( args, 'position' ) );
			it.parent = Number( flag( args, 'parent-id' ) );
			it.title = flag( args, 'title' ) ?? it.title;
		} else if ( 'menu' === a && 'item' === b && 'delete' === c ) {
			s.items = s.items.filter( ( i ) => i.id !== Number( args[ 3 ] ) );
		} else if ( 'menu' === a && 'location' === b ) {
			s.locations[ args[ 4 ] ] = Number( args[ 3 ] );
		} else if ( 'option' === a ) {
			s.options[ c ] = args[ 3 ];
		} else if ( 'rewrite' === a && 'structure' === b ) {
			s.options.permalink_structure = c;
		} else if ( 'sgs' === a ) {
			s.pointers[ b ] = Number( args[ 3 ] );
		}
		return '';
	};
	s.build = ( target, tree ) => {
		if ( target.postId ) {
			s.posts[ target.postId ].content = JSON.stringify( tree );
			return target.postId;
		}
		const id = s.next++;
		s.posts[ id ] = { id, type: target.create, slug: target.slug, title: target.title, status: 'publish', parent: 0, template: '', content: JSON.stringify( tree ) };
		return id;
	};
	return s;
}

const tmpMap = ( rows ) => {
	const file = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'site-build-' ) ), 'page-map.json' );
	fs.writeFileSync( file, `${ JSON.stringify( rows, null, 2 ) }\n` );
	return file;
};

// One --apply over the fake site, phase by phase with a fresh read before each, as site-build.mjs runs it.
function run( site, file ) {
	const original = readPageMap( file );
	let rows = original;
	const ids = {};
	const refs = {};
	for ( const phase of PHASES ) {
		const p = planBuild( { rows, state: site.state( rows ), repo: os.tmpdir(), client: 'none' } );
		assert.deepEqual( p.problems, [] );
		applyPhase( p.actions, phase, { wp: site.wp, build: site.build, refs, onId: ( k, id ) => {
			ids[ k ] = id;
			rows = writePageMap( file, original, ids );
		} } );
	}
	return rows;
}

test( 'a second run plans zero creates and zero changes', () => {
	const site = fakeSite();
	const file = tmpMap( ROWS() );
	const rows = run( site, file );
	assert.ok( rows.every( ( r ) => Number.isInteger( r.id ) ) );
	const again = planBuild( { rows: readPageMap( file ), state: site.state( rows ), repo: os.tmpdir(), client: 'none' } );
	assert.deepEqual( again.actions.map( ( a ) => a.say ), [] );
	assert.deepEqual( tally( again.actions ), { creates: 0, changes: 0, adopts: 0 } );
	assert.equal( Object.keys( site.posts ).length, ROWS().length );
	assert.equal( site.options.page_on_front, String( rows.find( ( r ) => 'home' === r.slug ).id ) );
	assert.equal( site.options.page_for_posts, String( rows.find( ( r ) => 'blog' === r.slug ).id ) );
	assert.equal( site.options.permalink_structure, '/%postname%/' );
	assert.equal( site.pointers.drawer, rows.find( ( r ) => 'sgs_drawer' === r.postType ).id );
	// The header and drawer placeholders bind their own menus.
	const menuId = ( n ) => site.menus.find( ( m ) => m.slug === n ).id;
	assert.match( site.posts[ rows.find( ( r ) => 'sgs_header' === r.postType ).id ].content, new RegExp( `"ref":${ menuId( 'header' ) }` ) );
	assert.match( site.posts[ rows.find( ( r ) => 'sgs_drawer' === r.postType ).id ].content, new RegExp( `"ref":${ menuId( 'drawer' ) }` ) );
	assert.equal( site.locations.primary, menuId( 'header' ) );
} );

test( 'a page map whose ids an intake rerun cleared adopts its posts instead of creating them again', () => {
	const site = fakeSite();
	const file = tmpMap( ROWS() );
	run( site, file );
	const cleared = ROWS();
	const p = planBuild( { rows: cleared, state: site.state( cleared ), repo: os.tmpdir(), client: 'none' } );
	assert.deepEqual( tally( p.actions ), { creates: 0, changes: 0, adopts: cleared.length } );
} );

test( 'a missing stored id stops the run and names the row', () => {
	const site = fakeSite();
	const rows = ROWS();
	rows[ 2 ].id = 999;
	const p = planBuild( { rows, state: site.state( rows ), repo: os.tmpdir(), client: 'none' } );
	assert.deepEqual( p.actions, [] );
	assert.equal( p.problems.length, 1 );
	assert.match( p.problems[ 0 ], /^page:about: its stored id 999 no longer exists/ );
} );

test( 'a child row before its parent is reordered and gets the parent\'s new id', () => {
	const rows = ROWS();
	const order = orderRows( rows ).map( rowKey );
	assert.ok( order.indexOf( 'page:about' ) < order.indexOf( 'page:story' ) );
	assert.ok( order.indexOf( 'sgs_mega_menu:about' ) < order.indexOf( 'sgs_header:header' ) );
	const site = fakeSite();
	const done = run( site, tmpMap( rows ) );
	assert.equal( site.posts[ done.find( ( r ) => 'story' === r.slug ).id ].parent, done.find( ( r ) => 'about' === r.slug && 'page' === r.postType ).id );
} );

test( 'a mega-menu item points at its panel\'s post id and carries the panel\'s label', () => {
	const site = fakeSite();
	const rows = run( site, tmpMap( ROWS() ) );
	const header = site.menus.find( ( m ) => 'header' === m.slug ).id;
	const panel = rows.find( ( r ) => 'sgs_mega_menu' === r.postType );
	const slot = site.items.filter( ( i ) => i.menu === header && 2 === i.order );
	assert.equal( slot.length, 1 );
	assert.deepEqual( { object: slot[ 0 ].object, objectId: slot[ 0 ].objectId, title: slot[ 0 ].title }, { object: 'sgs_mega_menu', objectId: panel.id, title: 'About' } );
	assert.equal( megaPanelLabel( panel.title ), 'About' );
	// The drawer's parent label names no item, so it is a custom disclosure item holding both children in order.
	const drawer = site.menus.find( ( m ) => 'drawer' === m.slug ).id;
	const parent = site.items.find( ( i ) => i.menu === drawer && 'custom' === i.type );
	assert.deepEqual( { title: parent.title, url: parent.url }, { title: 'About', url: '#' } );
	assert.deepEqual( site.items.filter( ( i ) => i.parent === parent.id ).sort( ( a, b ) => a.order - b.order ).map( ( i ) => site.posts[ i.objectId ].slug ), [ 'story', 'blog' ] );
} );

test( 'the page map keeps every field but id, byte for byte', () => {
	const rows = ROWS();
	const file = tmpMap( rows );
	const before = fs.readFileSync( file, 'utf8' );
	const done = run( fakeSite(), file );
	const after = fs.readFileSync( file, 'utf8' );
	assert.equal( after, `${ JSON.stringify( done, null, 2 ) }\n` );
	assert.equal( after.replace( /"id": \d+/g, '"id": null' ), before );
	// A map edited while the run builds is never overwritten.
	fs.writeFileSync( file, before.replace( '"title": "Home"', '"title": "Start"' ) );
	assert.throws( () => writePageMap( file, rows, { [ rowKey( rows[ 0 ] ) ]: 1 } ), /changed while the site build ran/ );
} );

const planOn = ( site, rows ) => planBuild( { rows, state: site.state( rows ), repo: os.tmpdir(), client: 'none' } );

test( 'an unmarked post already holding a row\'s slug stops the run instead of a second post or a renamed slug', () => {
	const site = fakeSite();
	site.build( { create: 'page', title: 'About Us', slug: 'about' }, [] );
	const p = planOn( site, ROWS() );
	assert.deepEqual( p.actions, [] );
	assert.equal( p.problems.length, 1 );
	assert.match( p.problems[ 0 ], /^page:about: post 100 already holds this page slug and carries no site-build row key/ );
} );

test( 'a stored id naming a post the site build did not make for that row stops the run', () => {
	const site = fakeSite();
	const theirs = site.build( { create: 'page', title: 'Fixture', slug: 'fixture' }, [] );
	const rows = ROWS();
	rows[ 0 ].id = theirs;
	const p = planOn( site, rows );
	assert.deepEqual( p.actions, [] );
	assert.match( p.problems[ 0 ], /^page:home: its stored id 100 is a post the site build did not make for this row \(it carries no row key\)/ );
} );

test( 'a same-slug menu the site build did not make stops the run; an unasked item in its own menu is noted, never deleted', () => {
	const site = fakeSite();
	site.menus.push( { id: 50, slug: 'footer', name: 'footer' } );
	const blocked = planOn( site, ROWS() );
	assert.deepEqual( blocked.actions, [] );
	assert.match( blocked.problems[ 0 ], /^menu "footer" \(50\) exists but the site build did not make it/ );
	const ours = fakeSite();
	const rows = run( ours, tmpMap( ROWS() ) );
	const footer = ours.menus.find( ( m ) => 'footer' === m.slug ).id;
	ours.items.push( { id: 999, menu: footer, title: 'Hand-added', object: 'custom', objectId: 999, type: 'custom', parent: 0, order: 9, url: '/x/' } );
	const again = planOn( ours, rows );
	assert.deepEqual( again.actions, [] );
	assert.ok( again.notes.some( ( n ) => /item 999 "Hand-added" is not one any page-map row asks for; it is left in place/.test( n ) ) );
} );

test( 'a hand-moved menu item is moved back, not added again', () => {
	const site = fakeSite();
	const rows = run( site, tmpMap( ROWS() ) );
	const drawer = site.menus.find( ( m ) => 'drawer' === m.slug ).id;
	const story = site.items.find( ( i ) => i.menu === drawer && i.objectId === rows.find( ( r ) => 'story' === r.slug ).id );
	const parent = story.parent;
	story.parent = 0;
	const p = planOn( site, rows );
	assert.deepEqual( p.actions.map( ( a ) => a.type ), [ 'item-update' ] );
	applyPhase( p.actions, 'menus', { wp: site.wp, build: site.build, onId: () => {} } );
	assert.equal( story.parent, parent );
	assert.equal( site.items.filter( ( i ) => i.objectId === story.objectId && i.menu === drawer ).length, 1 );
} );

test( 'the posts page is the one live page other than the front page; two leave page_for_posts with a note', () => {
	const site = fakeSite();
	const rows = ROWS().map( ( r ) => ( 'home' === r.slug ? { ...r, collection: 'live' } : r ) );
	const one = planOn( site, rows );
	assert.ok( one.actions.some( ( a ) => 'page_for_posts' === a.name && 'post:page:blog' === a.value.ref ) );
	const two = planOn( site, [ ...rows, row( { slug: 'news', title: 'News', collection: 'live' } ) ] );
	assert.ok( ! two.actions.some( ( a ) => 'page_for_posts' === a.name ) );
	assert.ok( two.notes.some( ( n ) => /page:blog and page:news all list live items; page_for_posts is left/.test( n ) ) );
} );

test( 'clearing a page template sends "default", which WordPress stores, never an empty value it ignores', () => {
	const calls = [];
	applyPhase( [ { phase: 'posts', type: 'update', key: 'page:x', id: 7, fields: { page_template: '' }, say: '' } ], 'posts', { wp: ( a ) => calls.push( a.join( ' ' ) ), build: () => 0, onId: () => {} } );
	assert.deepEqual( calls, [ 'post update 7 --page_template=default' ] );
} );
