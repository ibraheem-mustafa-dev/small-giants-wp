// lib/site-run-layout.mjs: after a site run builds a header, footer or drawer surface it points that area's active
// layout at the post it built (Spec 48 FR-48-55), whatever post the pointer named before. Each test MUST FAIL when its rule breaks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { pointAfterBuild, pointLayout } from '../lib/site-run-layout.mjs';
import { runKeys } from '../site-run.mjs';

const ROWS = [
	{ slug: 'home', postType: 'page', id: 10 },
	{ slug: 'header', postType: 'sgs_header', id: 178 },
	{ slug: 'footer', postType: 'sgs_footer', id: 176 },
	{ slug: 'drawer-menu', postType: 'sgs_drawer', id: 180 },
	{ slug: 'form-send', postType: 'sgs_form', id: 157 },
];
const SURFACES = {
	home: { target: { postId: 10 } },
	header: { target: { postId: 178 } },
	footer: { target: { postId: 176 } },
	'drawer-menu': { target: { postId: 180 } },
	'form-send': { target: { postId: 157 } },
	'template-page': { target: { template: 'page' } },
};

// A wp-cli stand-in holding the three pointers: `eval` reads one, `sgs <area> set-active <id>` writes it.
function fakeWp( pointers, { refuse = false } = {} ) {
	const calls = [];
	const wp = ( args ) => {
		calls.push( args );
		if ( 'eval' === args[ 0 ] ) {
			const area = args[ 1 ].match( /sgs_active_(\w+)_cpt_id/ )[ 1 ];
			return `Notice: something chatty\n${ pointers[ area ] ?? 0 }\n`;
		}
		if ( 'sgs' === args[ 0 ] && 'set-active' === args[ 2 ] ) {
			refuse || ( pointers[ args[ 1 ] ] = Number( args[ 3 ] ) );
			return 'Success.';
		}
		throw new Error( `unexpected wp ${ args.join( ' ' ) }` );
	};
	return { wp, calls, sets: () => calls.filter( ( a ) => 'set-active' === a[ 2 ] ) };
}

test( 'MUST FAIL: a built footer and drawer move their pointers off a stale post onto the built post, and say so', () => {
	const pointers = { header: 178, footer: 19, drawer: 5 };
	const { wp, sets } = fakeWp( pointers );
	assert.equal( pointAfterBuild( { entry: SURFACES.footer, rows: ROWS, wp } ), 'active footer: 19 -> 176' );
	assert.equal( pointAfterBuild( { entry: SURFACES[ 'drawer-menu' ], rows: ROWS, wp } ), 'active drawer: 5 -> 180' );
	assert.deepEqual( pointers, { header: 178, footer: 176, drawer: 180 } );
	assert.deepEqual( sets(), [ [ 'sgs', 'footer', 'set-active', '176' ], [ 'sgs', 'drawer', 'set-active', '180' ] ] );
} );

test( 'MUST FAIL: an empty pointer is set; a pointer already on the built post is read, not written', () => {
	const pointers = { header: 0, footer: 176, drawer: 0 };
	const { wp, sets } = fakeWp( pointers );
	assert.equal( pointAfterBuild( { entry: SURFACES.header, rows: ROWS, wp } ), 'active header: none -> 178' );
	assert.equal( pointAfterBuild( { entry: SURFACES.footer, rows: ROWS, wp } ), 'active footer: 176 (already)' );
	assert.deepEqual( sets(), [ [ 'sgs', 'header', 'set-active', '178' ] ] );
} );

test( 'MUST FAIL: a pointer that does not read back as the built post fails the step', () => {
	const { wp } = fakeWp( { header: 0, footer: 19, drawer: 0 }, { refuse: true } );
	assert.throws( () => pointLayout( { area: 'footer', id: 176, wp } ), /active footer: set to 176, but it reads back 19/ );
} );

test( 'MUST FAIL: only a layout area is ever pointed', () => {
	assert.throws( () => pointLayout( { area: 'form', id: 1, wp: fakeWp( {} ).wp } ), /not a layout area/ );
} );

test( 'negative control: a page, a form and a template surface set nothing and call no wp-cli at all', () => {
	const { wp, calls } = fakeWp( { header: 1, footer: 2, drawer: 3 } );
	for ( const key of [ 'home', 'form-send', 'template-page' ] ) {
		assert.equal( pointAfterBuild( { entry: SURFACES[ key ], rows: ROWS, wp } ), null, key );
	}
	assert.equal( pointAfterBuild( { entry: { target: { postId: 999 } }, rows: ROWS, wp } ), null, 'a post id no layout row holds' );
	const unbuilt = [ { slug: 'header', postType: 'sgs_header' } ];
	assert.equal( pointAfterBuild( { entry: SURFACES[ 'template-page' ], rows: unbuilt, wp } ), null, 'a template surface (no post id) never matches a layout row that has no id yet' );
	assert.deepEqual( calls, [] );
} );

test( 'negative control: a run whose --only leaves out the layout surfaces sets no pointer', () => {
	const { wp, calls } = fakeWp( { header: 1, footer: 2, drawer: 3 } );
	const keys = runKeys( SURFACES, [ 'home', 'form-send' ] );
	assert.deepEqual( keys, [ 'home', 'form-send' ] );
	keys.forEach( ( k ) => pointAfterBuild( { entry: SURFACES[ k ], rows: ROWS, wp } ) );
	assert.deepEqual( calls, [] );
	const withFooter = fakeWp( { header: 1, footer: 2, drawer: 3 } );
	runKeys( SURFACES, [ 'footer' ] ).forEach( ( k ) => pointAfterBuild( { entry: SURFACES[ k ], rows: ROWS, wp: withFooter.wp } ) );
	assert.deepEqual( withFooter.sets(), [ [ 'sgs', 'footer', 'set-active', '176' ] ], 'positive control: --only footer sets the footer only' );
} );
