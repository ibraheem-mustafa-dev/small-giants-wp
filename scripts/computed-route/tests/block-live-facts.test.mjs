// Proves lib/block-live-facts.mjs, the live read of the identification facts the code read leaves unknown (Spec 48 F1
// step A2b): an instance's facts are its own markup, never a child block's; a value lands only where the code row is
// unknown; a code no seen live is a conflict, never a yes; a block found on no page is listed and gets no facts.
// MUST FAIL: a child block's role (or a block pulled from another post) attributed to its parent, a classless paragraph's tag attributed to its container,
// a code `no` value written as yes, a lost yes value not reported as drift.
import assert from 'node:assert/strict';
import test from 'node:test';
import { THEME_SCRIPT, absorb, blocksToRead, compareLive, liveFile, readInstances, targetsFor, wrapperClass, yesKeys } from '../lib/block-live-facts.mjs';

// A minimal element: what readInstances touches (localName, classList, attributes, children, parentElement).
function h( tag, attrs = {}, children = [] ) {
	const el = {
		localName: tag,
		classList: String( attrs.class || '' ).split( /\s+/ ).filter( Boolean ),
		getAttribute: ( n ) => ( n in attrs ? attrs[ n ] : null ),
		getAttributeNames: () => Object.keys( attrs ),
		children,
		parentElement: null,
	};
	children.forEach( ( c ) => ( c.parentElement = el ) );
	return el;
}
const all = ( root ) => [ root, ...root.children.flatMap( all ) ];
function withDocument( body, fn ) {
	const prev = globalThis.document;
	globalThis.document = { getElementsByClassName: ( c ) => all( body ).filter( ( e ) => e.classList.includes( c ) ) };
	try {
		return fn();
	} finally {
		globalThis.document = prev;
	}
}

// A hero printing a core image (img, aria-hidden) with a saved sgs/button inside it (role=button is the button's), a
// saved core/paragraph (classless: its `p` and `strong` are the paragraph's, not the hero's) and an sgs/media pulled in
// from another post (a mega-menu panel's content: saved on the site, though not inside the hero).
const page = h( 'body', {}, [
	h( 'section', { class: 'wp-block-sgs-hero', 'aria-label': 'Intro' }, [
		h( 'figure', { class: 'sgs-hero__media' }, [ h( 'img', { 'aria-hidden': 'true' } ) ] ),
		h( 'div', { class: 'wp-block-sgs-button' }, [ h( 'a', { role: 'button', 'aria-describedby': 'x' } ) ] ),
		h( 'p', {}, [ h( 'strong' ) ] ),
		h( 'figure', { class: 'wp-block-sgs-media' }, [ h( 'video', { 'aria-label': 'clip' } ) ] ),
		h( 'table', {} ),
	] ),
] );
const inventory = { saved: { 'core/paragraph': 2, 'sgs/button': 1, 'sgs/hero': 1, 'sgs/media': 1 }, unmarked: { 'renders-tag': [ 'p', 'strong' ] } };
const code = {
	'sgs/hero': {
		'renders-tag': { section: 'yes', figure: 'unknown', video: 'unknown', img: 'unknown', a: 'unknown', p: 'unknown', strong: 'unknown', table: 'no' },
		'renders-role': { button: 'unknown' },
		'renders-aria': { 'aria-label': 'unknown', 'aria-hidden': 'unknown', 'aria-describedby': 'unknown' },
	},
	'sgs/tabs': { 'renders-tag': { div: 'unknown' } },
	'sgs/plain': { 'renders-tag': { div: 'yes' } },
};

function readHero() {
	const targets = targetsFor( [ 'sgs/hero' ], inventory );
	const read = withDocument( page, () => readInstances( targets ) );
	const acc = absorb( { blocks: {}, conflicts: {}, outside: {} }, read, { site: 'local-x', path: '/', width: 375 }, code, inventory );
	return liveFile( acc, { sites: { 'local-x': { pages: [ { path: '/' } ] } }, toRead: blocksToRead( code ), readOn: '2026-10-30' } );
}

test( 'wrapper classes follow WordPress: core drops its namespace', () => {
	assert.equal( wrapperClass( 'sgs/hero' ), 'wp-block-sgs-hero' );
	assert.equal( wrapperClass( 'core/paragraph' ), 'wp-block-paragraph' );
} );

test( 'theme scripts are refused, block modules and theme styles are not', () => {
	assert.ok( THEME_SCRIPT.test( '/wp-content/themes/sgs-theme/assets/js/sgs-shop-filters.js' ) );
	assert.ok( ! THEME_SCRIPT.test( '/wp-content/plugins/sgs-blocks/build/blocks/hero/view.js' ) );
	assert.ok( ! THEME_SCRIPT.test( '/wp-content/themes/sgs-theme/style.css' ) );
} );

test( 'only blocks with an unknown markup value are read', () => {
	assert.deepEqual( blocksToRead( code ), [ 'sgs/hero', 'sgs/tabs' ] );
} );

test( 'the instance holds its own core image markup and wrapper aria-label, with evidence', () => {
	const f = readHero();
	const tags = f.blocks[ 'sgs/hero' ].facts[ 'renders-tag' ];
	assert.deepEqual( Object.keys( tags ), [ 'figure', 'img' ] );
	assert.match( tags.img.evidence[ 0 ], /^local-x \/ @375 \.wp-block-sgs-hero\[0\] figure\.sgs-hero__media > img$/ );
	assert.deepEqual( Object.keys( f.blocks[ 'sgs/hero' ].facts[ 'renders-aria' ] ), [ 'aria-hidden', 'aria-label' ] );
} );

test( 'MUST FAIL: a saved child block\'s markup is never the parent\'s', () => {
	const f = readHero();
	assert.equal( f.blocks[ 'sgs/hero' ].facts[ 'renders-role' ], undefined, 'role=button belongs to sgs/button' );
	assert.ok( ! f.blocks[ 'sgs/hero' ].facts[ 'renders-tag' ].a, 'the button\'s <a>' );
	assert.ok( ! f.blocks[ 'sgs/hero' ].facts[ 'renders-aria' ][ 'aria-describedby' ] );
	assert.ok( ! f.blocks[ 'sgs/hero' ].facts[ 'renders-tag' ].video, 'a block pulled from another post is cut too' );
} );

test( 'MUST FAIL: a classless saved paragraph\'s tags are never the container\'s', () => {
	const tags = readHero().blocks[ 'sgs/hero' ].facts[ 'renders-tag' ];
	assert.ok( ! tags.p && ! tags.strong );
} );

test( 'MUST FAIL: a code no seen live is a conflict, never a yes; a code yes adds nothing', () => {
	const f = readHero();
	assert.ok( ! f.blocks[ 'sgs/hero' ].facts[ 'renders-tag' ].table );
	assert.ok( ! f.blocks[ 'sgs/hero' ].facts[ 'renders-tag' ].section );
	assert.deepEqual( Object.keys( f.conflicts[ 'sgs/hero' ] ), [ 'renders-tag=table' ] );
} );

test( 'a block found on no page is listed and carries no facts', () => {
	const f = readHero();
	assert.deepEqual( f.notSeen, [ 'sgs/tabs' ] );
	assert.equal( f.blocks[ 'sgs/tabs' ], undefined );
} );

test( 'MUST FAIL: the check reports a yes lost or gained, not moved evidence', () => {
	const a = readHero();
	const moved = structuredClone( a );
	moved.blocks[ 'sgs/hero' ].facts[ 'renders-tag' ].img.evidence = [ 'elsewhere' ];
	assert.deepEqual( compareLive( a, moved ), { gained: [], lost: [], notSeenNow: [], seenNow: [] } );
	const lost = structuredClone( a );
	delete lost.blocks[ 'sgs/hero' ].facts[ 'renders-tag' ].img;
	assert.deepEqual( compareLive( a, lost ).lost, [ 'sgs/hero|renders-tag|img' ] );
	assert.ok( yesKeys( a ).includes( 'sgs/hero|renders-aria|aria-label' ) );
} );
