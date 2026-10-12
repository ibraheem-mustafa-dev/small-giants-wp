// Proves Spec 48 §3.2's portable fixtures: tokens resolve per target and a mirror inherits its test site's refs; a block
// whose token the target does not supply is never built and is reported (MUST FAIL); a reference the site reports
// missing blocks its block with the site's reason (MUST FAIL); Eye Care's references resolve to the literal values the
// fixtures carried before they were tokenised; the fixture detector's self-test passes and the real fixtures pass its
// check. Offline: the site's existence check is injected.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { refsFor, resolveFixture, tokensIn, fixtureRoles, refGate, checkRefsExist, refsProblem, existencePhp, hostedRoot } from '../lib/calibration-refs.mjs';
import { checkFixtureRefs } from '../lib/fixture-refs.mjs';
import { selfTest } from '../fixture-refs.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROOT = path.join( HERE, '..' );
const fixtures = JSON.parse( fs.readFileSync( path.join( ROOT, 'calibration-fixtures.json' ), 'utf8' ) );
const targets = JSON.parse( fs.readFileSync( path.join( ROOT, 'calibration-targets.json' ), 'utf8' ) );

test( 'a mirror inherits its test site\'s refs, and its own refs win', () => {
	const t = { site: { refs: { menu: 1, drawer: 2 } }, mirror: { mirrorOf: 'site', refs: { drawer: 9 } }, bare: {} };
	assert.deepEqual( refsFor( t, 'mirror' ), { menu: 1, drawer: 9 } );
	assert.deepEqual( refsFor( t, 'bare' ), {} );
	assert.deepEqual( refsFor( targets, 'local-eye-care' ), targets[ 'eye-care-test' ].refs );
	assert.deepEqual( refsFor( targets, 'local-indus' ), targets[ 'indus-test' ].refs );
} );

test( 'tokens resolve in every shape: whole value, text, URL, inside a string and inside a key', () => {
	const f = { attributes: { ref: '{{menu}}', ids: [ 'id:{{menuItem}}' ], picked: [ '{{product:text}}' ], imageId: '{{image}}', imageUrl: '{{image.url}}', icons: { 'id:{{menuItem}}': { name: 'x' } }, plain: 'no token', n: 4 } };
	const refs = { menu: 96, menuItem: 195, product: 71, image: { id: 202, url: 'https://x.test/a.jpg' } };
	assert.deepEqual( tokensIn( f ), [ 'image', 'image.url', 'menu', 'menuItem', 'product' ] );
	assert.deepEqual( fixtureRoles( f ), [ 'image', 'menu', 'menuItem', 'product' ] );
	const { fixture, missing } = resolveFixture( f, refs );
	assert.deepEqual( missing, [] );
	assert.deepEqual( fixture.attributes, { ref: 96, ids: [ 'id:195' ], picked: [ '71' ], imageId: 202, imageUrl: 'https://x.test/a.jpg', icons: { 'id:195': { name: 'x' } }, plain: 'no token', n: 4 } );
	assert.equal( f.attributes.ref, '{{menu}}', 'the fixture itself is not changed' );
} );

test( 'MUST FAIL: a token the target does not supply leaves the block unresolved, reported and not built', () => {
	const f = { 'sgs/nav': { attributes: { ref: '{{menu}}', drawerRef: '{{drawer}}' } }, 'sgs/text': { attributes: { text: 'x' } }, 'sgs/img': { attributes: { imageUrl: '{{image.url}}' } } };
	const r = resolveFixture( f[ 'sgs/nav' ], { menu: 3 } );
	assert.equal( r.fixture, null, 'no fixture is returned with a token left in it' );
	assert.deepEqual( r.missing, [ 'drawer' ] );
	assert.deepEqual( resolveFixture( f[ 'sgs/img' ], { image: 5 } ).missing, [ 'image.url' ], 'a media role written as a bare id has no URL' );
	assert.deepEqual( resolveFixture( { a: '{{nonsense}}' }, { nonsense: 1 } ).missing, [ 'nonsense' ], 'a role outside the vocabulary never resolves' );
	const gate = refGate( [ 'sgs/nav', 'sgs/text', 'sgs/img', 'sgs/none' ], f, { menu: 3 }, { menu: true }, 'site-x' );
	assert.deepEqual( Object.keys( gate.ready ), [ 'sgs/text' ] );
	assert.deepEqual( gate.blocked.map( ( b ) => b.block ), [ 'sgs/nav', 'sgs/img' ] );
	assert.match( gate.blocked[ 0 ].error, /needs references site-x does not supply: drawer/ );
	assert.ok( ! JSON.stringify( gate.ready ).includes( '{{' ), 'no built fixture carries a token' );
} );

test( 'MUST FAIL: the guard blocks a block whose referenced object the site reports missing', () => {
	const f = { 'sgs/nav': { attributes: { ref: '{{menu}}', drawerRef: '{{drawer}}' } } };
	const refs = { menu: 3, drawer: 4 };
	let sent = '';
	const exists = checkRefsExist( refs, [ 'menu', 'drawer' ], ( php ) => {
		sent = php;
		return 'Notice: something\n{"menu":true,"drawer":"post 4 has post type attachment, not sgs_drawer"}';
	} );
	assert.match( sent, /base64_decode/ );
	assert.deepEqual( exists, { menu: true, drawer: 'post 4 has post type attachment, not sgs_drawer' } );
	const gate = refGate( [ 'sgs/nav' ], f, refs, exists, 'site-x' );
	assert.deepEqual( gate.ready, {} );
	assert.match( gate.blocked[ 0 ].error, /referenced objects missing on site-x: drawer 4: post 4 has post type attachment, not sgs_drawer/ );
	// A site that cannot be asked blocks every reference instead of passing it.
	const down = checkRefsExist( refs, [ 'menu' ], () => {
		throw new Error( 'ssh: connect timed out' );
	} );
	assert.match( down.menu, /could not run \(ssh: connect timed out\)/ );
	assert.match( refsProblem( f[ 'sgs/nav' ], refs, down ), /menu 3: the existence check could not run/ );
	// Present on the site: the block is built with its resolved fixture.
	assert.deepEqual( refGate( [ 'sgs/nav' ], f, refs, { menu: true, drawer: true }, 'site-x' ).ready, { 'sgs/nav': { attributes: { ref: 3, drawerRef: 4 } } } );
} );

test( 'the existence PHP checks each role\'s kind, and a menu item\'s menu', () => {
	const php = existencePhp( { menuItem: { id: 6, kind: 'post', postType: 'nav_menu_item', menu: 5 } } );
	const data = JSON.parse( Buffer.from( php.match( /base64_decode\( '([^']+)'/ )[ 1 ], 'base64' ).toString() );
	assert.deepEqual( data, { menuItem: { id: 6, kind: 'post', postType: 'nav_menu_item', menu: 5 } } );
	assert.match( php, /is_object_in_term\( \$id, 'nav_menu'/ );
	assert.match( php, /get_term\( \$id, \$r\['taxonomy'\] \)/ );
} );

test( 'Eye Care\'s refs resolve every fixture to the literal ids it carried before tokenising', () => {
	const refs = refsFor( targets, 'eye-care-test' );
	const r = ( b ) => resolveFixture( fixtures[ b ], refs );
	for ( const b of Object.keys( fixtures ) ) {
		assert.deepEqual( r( b ).missing, [], `${ b } resolves on eye-care-test` );
	}
	const nav = r( 'sgs/nav-bar-menu' ).fixture.attributes;
	assert.deepEqual( [ nav.ref, nav.splitAfterItemId, nav.disabledItemIds, nav.drawerRef ], [ 96, 'id:195', [ 'id:195' ], 203 ] );
	assert.deepEqual( r( 'sgs/nav-drawer-menu' ).fixture.variants[ 1 ].itemTrailingIcons, { 'id:195': { source: 'lucide', name: 'arrow-right' } } );
	const media = r( 'sgs/media' ).fixture.attributes;
	assert.deepEqual( [ media.imageId, media.imageUrl ], [ 202, 'https://darkcyan-grouse-898606.hostingersite.com/wp-content/uploads/2026/09/aboutstrip.jpg' ] );
	assert.deepEqual( r( 'sgs/buybox' ).fixture.parents[ 0 ].attributes.query.woocommerceHandPickedProducts, [ '71' ] );
	assert.equal( r( 'sgs/buybox' ).fixture.parents[ 0 ].attributes.queryId, 91, 'a query loop\'s own number is not a reference' );
	assert.equal( r( 'sgs/product-card' ).fixture.attributes.productId, 71 );
	assert.equal( r( 'sgs/responsive-logo' ).fixture.attributes.logoId, 198 );
} );

test( 'the fixtures carry no bare reference, and the detector\'s own cases pass', () => {
	assert.deepEqual( checkFixtureRefs( fixtures ), [] );
	assert.deepEqual( selfTest(), [] );
	// Negative control: one literal id put back is caught.
	const broken = structuredClone( fixtures );
	broken[ 'sgs/nav-bar-menu' ].attributes.ref = 96;
	assert.equal( checkFixtureRefs( broken ).length, 1 );
} );

test( 'a hosted site\'s WordPress root comes from build-deploy.py TARGETS', () => {
	assert.equal( hostedRoot( 'indus-test', path.resolve( ROOT, '../..' ) ), 'domains/lavender-dinosaur-183533.hostingersite.com/public_html' );
	assert.throws( () => hostedRoot( 'no-such-site', path.resolve( ROOT, '../..' ) ), /no wp_content/ );
} );
