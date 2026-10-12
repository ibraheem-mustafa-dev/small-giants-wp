// Spec 48 FR-48-26 (three routing adapters, precedence) and FR-48-30 (embedded manifest reader), lib/intake-routing.mjs:
// each adapter passes on a fixture of its kind and refuses the other two kinds; a hybrid copying the hash-route
// pattern with a go() link helper resolves to `hash`; a go() that also sets state.page fails loudly; an unresolved
// link is a gap row (R-48-3). The real exports are read last, read-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ADAPTERS, loadExport, pickAdapter, readRouting, embeddedManifest } from '../lib/intake-routing.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = ( name ) => path.join( HERE, 'fixtures', 'intake-routing', name );
const SITES = path.resolve( HERE, '../../../sites' );
const adapter = ( name ) => ADAPTERS.find( ( a ) => a.name === name );
const KINDS = { hash: 'hash', 'state-page': 'state-page', files: 'files' };

test( 'MUST FAIL: each adapter matches its own kind of fixture and refuses the other two kinds', () => {
	for ( const [ kind, fixture ] of Object.entries( KINDS ) ) {
		const exp = loadExport( FIX( fixture ) );
		for ( const a of ADAPTERS ) {
			const m = a.matches( exp );
			assert.equal( m.match, a.name === kind, `${ a.name } on the ${ kind } fixture: ${ m.evidence.join( '; ' ) }` );
			assert.ok( m.evidence.length, `${ a.name } names its evidence` );
		}
		assert.equal( pickAdapter( exp ).name, kind );
	}
} );

test( 'hash adapter: routes are the pages getter keys; #/<key> and data-driven hrefs resolve; the empty hash is the default page', () => {
	const r = readRouting( { folder: FIX( 'hash' ) } );
	assert.equal( r.adapter, 'hash' );
	assert.deepEqual( r.routes.map( ( x ) => x.key ), [ 'home', 'about', 'our-story' ] );
	const to = ( href ) => r.links.filter( ( l ) => l.href === href && ! l.partial ).map( ( l ) => l.route );
	assert.deepEqual( to( '#/' ), [ 'home' ] );
	assert.deepEqual( to( '#/our-story' ), [ 'our-story' ], 'the {{ item.href }} binding resolves through the nav array literal' );
	assert.ok( r.links.find( ( l ) => '#/our-story' === l.href ).boundBy[ 0 ].includes( '{{ item.href }}' ) );
	assert.equal( r.links.find( ( l ) => 'tel:0100' === l.href ).external, true );
} );

test( 'MUST FAIL: a link no adapter resolves is a gap row with construct, draft ID and error, never dropped', () => {
	const r = readRouting( { folder: FIX( 'hash' ) } );
	const nope = r.gaps.find( ( g ) => g.error.includes( '#/nope' ) );
	assert.ok( nope, JSON.stringify( r.gaps ) );
	assert.equal( nope.construct, 'link' );
	assert.match( nope.draftId, /^Site\.dc\.html:7:3 <a>/ );
	assert.ok( r.links.some( ( l ) => '#/nope' === l.href && null === l.route ), 'the link itself is kept with route null' );
	assert.ok( r.gaps.some( ( g ) => g.error.includes( 'built at run time' ) ), "'#/' + slug is a gap row naming the binding" );
	const files = readRouting( { folder: FIX( 'files' ) } );
	assert.ok( files.gaps.some( ( g ) => g.error.includes( 'Missing.dc.html is not a page file' ) ) );
	assert.ok( files.gaps.some( ( g ) => g.draftId.startsWith( 'Card.dc.html' ) && g.error.includes( 'not a page' ) ), 'an in-page fragment in a component is a gap row' );
} );

test( 'MUST FAIL: a hybrid (pages getter + hashchange + a go() that only writes location.hash) resolves to hash; go() arguments are links', () => {
	const exp = loadExport( FIX( 'hybrid' ) );
	assert.deepEqual( ADAPTERS.filter( ( a ) => a.matches( exp ).match ).map( ( a ) => a.name ), [ 'hash', 'state-page' ], 'the hybrid matches two adapters' );
	const r = readRouting( { folder: FIX( 'hybrid' ) } );
	assert.equal( r.adapter, 'hash' );
	assert.deepEqual( r.routes.map( ( x ) => x.key ), [ 'home', 'apply', 'contact' ], 'the memoised this._pages literal gives the keys' );
	const viaGo = r.links.filter( ( l ) => l.boundBy?.some( ( b ) => b.includes( 'this.go(mn.href)' ) ) );
	assert.deepEqual( viaGo.map( ( l ) => l.route ).sort(), [ 'contact', 'home' ] );
	assert.deepEqual( r.gaps, [] );
} );

test( 'MUST FAIL: a go() that also sets state.page beside a pages getter and hashchange listener fails loudly', () => {
	assert.throws( () => readRouting( { folder: FIX( 'hybrid-sets-page' ) } ), ( e ) => {
		assert.match( e.message, /ambiguous: hash and state-page both match/ );
		assert.match( e.message, /go\(\) sets state\.page/ );
		assert.equal( e.gap.construct, 'routing' );
		assert.equal( e.gap.draftId, 'Site.dc.html' );
		return true;
	} );
} );

test( 'no adapter matching throws naming what was looked for; a go() that sets only a form step is not a router', () => {
	assert.throws( () => readRouting( { folder: FIX( 'none' ) } ), /no routing adapter matches; looked for a pages getter.*a go\(\)\/state\.page setter.*several page files/ );
} );

test( 'state-page adapter: routes are go() values through curried helpers; links are the handlers that reach go()', () => {
	const r = readRouting( { folder: FIX( 'state-page' ) } );
	assert.equal( r.adapter, 'state-page' );
	assert.deepEqual( r.routes.map( ( x ) => x.key ).sort(), [ 'about', 'account', 'home', 'shop' ] );
	const byCall = ( c ) => r.links.filter( ( l ) => l.call?.includes( c ) ).map( ( l ) => l.route );
	assert.deepEqual( byCall( 'goHome' ), [ 'home' ], 'nav(\'home\') binds the curried parameter to its own call' );
	assert.deepEqual( byCall( 'goAbout' ), [ 'about' ] );
	assert.deepEqual( byCall( 'c.go' ), [ 'shop' ] );
	assert.equal( r.links.find( ( l ) => l.call?.includes( 'openBag' ) ).control, true, 'a # anchor opening a panel is a control, not a route' );
	assert.ok( r.gaps.some( ( g ) => g.draftId.startsWith( 'Shop.dc.html:9:3 <a>' ) && g.error.includes( 'no handler' ) ), 'a bare # anchor is a gap row' );
	assert.ok( r.gaps.some( ( g ) => 'route' === g.construct && g.error.includes( 'this.state.returnTo' ) ), 'a dynamic go() argument is a gap row' );
} );

test( 'files adapter: routes are the page files; links keep query and fragment as detail; data and script links resolve', () => {
	const r = readRouting( { folder: FIX( 'files' ) } );
	assert.equal( r.adapter, 'files' );
	assert.deepEqual( r.routes.map( ( x ) => x.key ), [ 'About.dc.html', 'Home.dc.html' ], 'the mounted component is not a route' );
	const about = r.links.find( ( l ) => './About.dc.html?tab=team#people' === l.href );
	assert.deepEqual( [ about.route, about.detail ], [ 'About.dc.html', '?tab=team#people' ] );
	assert.equal( r.links.find( ( l ) => '#offers' === l.href ).route, 'Home.dc.html' );
	assert.equal( r.links.find( ( l ) => l.from.startsWith( 'Card.dc.html' ) && l.href.startsWith( 'About.dc.html?id=' ) ).route, 'About.dc.html' );
	assert.ok( r.links.some( ( l ) => l.call?.startsWith( 'location.href' ) && 'Home.dc.html' === l.route ) );
	assert.ok( r.links.some( ( l ) => l.boundBy?.[ 0 ].includes( '{{ backHref }}' ) && 'Home.dc.html' === l.route ) );
} );

test( 'embeddedManifest parses the data-sgs-manifest block; absent is null; malformed is a gap row', () => {
	const text = fs.readFileSync( path.join( FIX( 'state-page' ), 'Shop.dc.html' ), 'utf8' );
	assert.deepEqual( embeddedManifest( text ).manifest, { pages: [ { slug: 'home' }, { slug: 'about' } ] } );
	assert.deepEqual( embeddedManifest( '<x-dc></x-dc>' ), { manifest: null, gaps: [] } );
	const bad = embeddedManifest( '<script type="application/json" data-sgs-manifest>{ nope </script>', 'X.dc.html' );
	assert.equal( bad.manifest, null );
	assert.equal( bad.gaps[ 0 ].construct, 'embedded-manifest' );
	assert.equal( bad.gaps[ 0 ].draftId, 'X.dc.html' );
} );

const real = ( slug ) => path.join( SITES, slug, 'handoff' );
test( 'real exports: each picks its adapter; every link resolves or is a gap row', { skip: ! fs.existsSync( real( 'indus-foods' ) ) && 'no client exports in this checkout' }, () => {
	const accounted = ( r ) => r.links.every( ( l ) => l.route || l.external || l.control || r.gaps.some( ( g ) => g.draftId === l.from ) );
	const a = readRouting( { folder: real( 'indus-foods' ) } );
	assert.equal( a.adapter, 'hash' );
	assert.equal( a.routes.length, 23 );
	assert.ok( accounted( a ) );
	const b = readRouting( { folder: real( 'mamas-munches-redesign' ) } );
	assert.equal( b.adapter, 'files' );
	assert.equal( b.routes.length, 11 );
	assert.ok( accounted( b ) );
	const c = readRouting( { folder: real( 'eye-care-ward-end' ) } );
	assert.equal( c.adapter, 'state-page' );
	assert.ok( [ 'home', 'shop', 'product', 'lenses', 'checkout' ].every( ( k ) => c.routes.some( ( x ) => x.key === k ) ) );
	assert.ok( accounted( c ) );
	const manifest = embeddedManifest( fs.readFileSync( path.join( real( 'eye-care-ward-end' ), 'Eye Care Birmingham.dc.html' ), 'utf8' ) );
	assert.ok( manifest.manifest && ! manifest.gaps.length );
} );
