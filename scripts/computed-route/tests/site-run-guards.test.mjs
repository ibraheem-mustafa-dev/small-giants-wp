// Safety guards of the cloning route (critique council 2026-10-29, findings 4 to 7 and the single-reviewer list): built equals
// reviewed (lib/site-run-reviewed.mjs), every placed block calibrated before Fill (lib/site-run-blocks.mjs), the walk status
// counts (lib/site-run-walk.mjs), the site build's secrets path and catalogue order (lib/site-build-apply.mjs::siteEnv,
// lib/site-build-menus.mjs::desiredMenus), the certifi discovery (lib/site-run-certs.mjs) and the push build comparison
// (lib/build-compare.mjs, build-compare.mjs). Tests marked MUST FAIL turn red under a mutation in
// tests/site-run-guards.mutations.json (node scripts/computed-route/tools/mutate.mjs scripts/computed-route scripts/computed-route/tests/site-run-guards.mutations.json tests/site-run-guards.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { reviewedChanges, reviewedVerdict } from '../lib/site-run-reviewed.mjs';
import { calibrationVerdict, proposedBlocks } from '../lib/site-run-blocks.mjs';
import { walkCounts, walkVerdict } from '../lib/site-run-walk.mjs';
import { certsPath, certifiPath } from '../lib/site-run-certs.mjs';
import { siteEnv } from '../lib/site-build-apply.mjs';
import { desiredMenus } from '../lib/site-build-menus.mjs';
import { menuLinksFor } from '../lib/site-build-menu-links.mjs';
import { linkContext } from '../lib/draft-link.mjs';
import { compareBuilds, parseListing, refusal } from '../lib/build-compare.mjs';
import { main as compareMain } from '../build-compare.mjs';
import { writeSlotMap } from '../lib/cache.mjs';
import { READ_KEY } from '../lib/calibrate-props.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROUTE = path.join( HERE, '..' );
const tmp = ( p ) => fs.mkdtempSync( path.join( os.tmpdir(), p ) );

// ---- built equals reviewed
const rev = ( key, block, extra = {} ) => ( { key, block, action: null, ...extra } );
const REVIEWED = [ rev( 'a', 'sgs/hero' ), rev( 'b', 'sgs/heading' ), rev( 'c', null, { action: 'remove' } ) ];

test( 'MUST FAIL: a row whose block changed with no saved decision fails the surface and is named', () => {
	const proposed = [ rev( 'a', 'sgs/hero' ), rev( 'b', 'sgs/text' ), rev( 'c', null, { action: 'remove' } ) ];
	assert.throws( () => reviewedVerdict( { surface: 'home', reviewed: REVIEWED, proposed } ), /1 row\(s\) of home differ.*b was sgs\/heading, now sgs\/text/ );
	assert.deepEqual( reviewedChanges( { reviewed: REVIEWED, proposed } ).changed.map( ( c ) => c.key ), [ 'b' ] );
} );

test( 'MUST FAIL: a removed row that is now kept is a change', () => {
	assert.throws( () => reviewedVerdict( { surface: 'home', reviewed: REVIEWED, proposed: [ rev( 'a', 'sgs/hero' ), rev( 'b', 'sgs/heading' ), rev( 'c', 'sgs/text' ) ] } ), /c was remove, now sgs\/text/ );
	assert.throws( () => reviewedVerdict( { surface: 'home', reviewed: [ rev( 'a', 'sgs/text', { action: 'remove' } ) ], proposed: [ rev( 'a', 'sgs/text' ) ] } ), /a was remove sgs\/text, now sgs\/text/ );
} );

test( 'MUST FAIL: no reviewed rows, or no key in common, cannot be compared and fails', () => {
	assert.throws( () => reviewedVerdict( { surface: 'home', reviewed: [], proposed: REVIEWED } ), /saved no reviewed rows/ );
	assert.throws( () => reviewedVerdict( { surface: 'home', reviewed: REVIEWED, proposed: [ rev( 'z', 'sgs/hero' ) ] } ), /has the key of a reviewed row/ );
} );

test( 'MUST FAIL: intake rows keyed by the entry draft component are compared with the served proposal Root keys', () => {
	const reviewed = [ rev( 'Home Draft/1#0', 'sgs/hero' ), rev( 'Home Draft/2#0', 'sgs/heading' ), rev( 'Home Draft>Card@3#0/4#0', 'sgs/text' ) ];
	const proposed = [ rev( 'Root/1#0', 'sgs/hero' ), rev( 'Root/2#0', 'sgs/text' ), rev( 'Home Draft>Card@3#0/4#0', 'sgs/text' ) ];
	assert.throws( () => reviewedVerdict( { surface: 'home', reviewed, proposed, rootComponent: 'Home Draft' } ), /1 row\(s\) of home differ.*Root\/2#0 was sgs\/heading, now sgs\/text/ );
	assert.equal( reviewedChanges( { reviewed, proposed, rootComponent: 'Home Draft' } ).common, 3 );
	// Negative control: with no root component the spaces stay apart, so only the imported element is in common.
	assert.equal( reviewedChanges( { reviewed, proposed } ).common, 1 );
} );

test( 'NEGATIVE: identical rows, a change a saved decision made and a stale row shown all pass, and the explanation is in the result', () => {
	assert.match( reviewedVerdict( { surface: 'home', reviewed: REVIEWED, proposed: REVIEWED } ), /^3 rows match the reviewed proposal$/ );
	const said = reviewedVerdict( { surface: 'home', reviewed: REVIEWED, proposed: [ rev( 'a', 'sgs/hero' ), rev( 'b', 'sgs/text', { source: 'client decision' } ), rev( 'c', null, { action: 'remove' } ) ] } );
	assert.match( said, /1 changed and explained: b sgs\/heading -> sgs\/text \(saved decision \(client decision\)\)/ );
	assert.match( reviewedVerdict( { surface: 'home', reviewed: REVIEWED, proposed: [ rev( 'a', 'sgs/hero' ), rev( 'b', 'sgs/text', { stale: 'decision for b was made for "p|x"' } ), rev( 'c', null, { action: 'remove' } ) ] } ), /\(stale: decision for b/ );
	assert.match( reviewedVerdict( { surface: 'home', reviewed: REVIEWED, proposed: [ ...REVIEWED, rev( 'd', 'sgs/text' ) ] } ), /1 added, 0 removed/ );
} );

// ---- every placed block calibrated
const slot = ( block, slotKey ) => ( { block, site: 's', slotKey, readKey: READ_KEY, playwrightVersion: '1', browserVersion: '1', measured: '2026-10-12T10:00:00.000Z', settings: {}, dead: [], noMarker: [], oneWidth: [], untestedStates: [] } );
const world = ( keys ) => {
	const cacheDir = path.join( tmp( 'guards-cache-' ), 'cache' );
	Object.entries( keys ).forEach( ( [ b, k ] ) => writeSlotMap( cacheDir, b, slot( b, k ) ) );
	return cacheDir;
};
const HASH = ( b ) => ( { deployed: `H-${ b }`, local: `H-${ b }` } );
const FIX = new Proxy( {}, { get: () => ( {} ) } );
const call = ( cacheDir, rows ) => calibrationVerdict( { surface: 'home', rows, client: 'cl', site: 'local-x', cacheDir, hashesOf: HASH, fixtures: FIX } );

test( 'MUST FAIL: a placed block with no slot map, or a stale one, fails before Fill naming the block and the calibrate command', () => {
	const cacheDir = world( { 'sgs/hero': 'H-sgs/hero', 'sgs/card-grid': 'OLD' } );
	const rows = [ rev( 'a', 'sgs/hero' ), rev( 'b', 'sgs/card-grid' ), rev( 'c', 'sgs/trust-bar' ) ];
	assert.throws( () => call( cacheDir, rows ), ( e ) => /home places 2 block\(s\)/.test( e.message ) && /sgs\/card-grid \(stale/.test( e.message ) && /sgs\/trust-bar \(missing/.test( e.message ) && /calibrate\.mjs --site local-x --client cl --blocks sgs\/card-grid,sgs\/trust-bar --slot-map-only --recalibrate/.test( e.message ) && ! /sgs\/hero \(/.test( e.message ) );
} );

test( 'NEGATIVE: calibrated blocks pass; removed, unwrapped and non-sgs rows place nothing', () => {
	const cacheDir = world( { 'sgs/hero': 'H-sgs/hero' } );
	const rows = [ rev( 'a', 'sgs/hero' ), rev( 'b', 'sgs/trust-bar', { action: 'remove' } ), rev( 'c', 'core/group' ), rev( 'd', null ) ];
	assert.deepEqual( proposedBlocks( rows ), [ 'sgs/hero' ] );
	assert.equal( call( cacheDir, rows ), '1 placed blocks, each with a current slot map' );
} );

// ---- walk status
const diff = ( accepted = null ) => ( { kind: 'style', key: 'color', accepted } );
const report = ( o = {} ) => ( { runs: [ { state: 'default', width: 1440, pairs: { root: { draft: {}, live: {}, diffs: [ diff(), diff(), diff( 'ok' ) ] } } } ], errors: { 1440: { draft: [], live: [] } }, ...o } );
const file = ( r ) => {
	const f = path.join( tmp( 'guards-walk-' ), 'report.json' );
	fs.writeFileSync( f, JSON.stringify( r ) );
	return f;
};

test( 'MUST FAIL: the walk result carries the open and unreviewed counts, and a live console error fails the step', () => {
	assert.deepEqual( walkCounts( report(), 'x: 2 open, 1 accepted, 4 shots unreviewed, 0 live console errors' ), { open: 2, accepted: 1, liveErrors: 0, firstLiveError: null, unreviewed: 4 } );
	assert.equal( walkVerdict( 'report written', file( report() ) ), 'report written [2 open, 0 unreviewed, 0 live errors]' );
	assert.equal( walkVerdict( 'w: 2 open, 1 accepted, 3 shots unreviewed', file( report() ) ), 'w: 2 open, 1 accepted, 3 shots unreviewed [2 open, 3 unreviewed, 0 live errors]' );
	assert.throws( () => walkVerdict( 'w', file( report( { errors: { 1440: { draft: [], live: [ 'TypeError: x is undefined' ] } } } ) ) ), /logged 1 console error\(s\) \(first: TypeError: x is undefined\); 2 open/ );
} );

test( 'NEGATIVE: draft-side console errors do not fail the walk', () => {
	assert.match( walkVerdict( 'w', file( report( { errors: { 1440: { draft: [ 'draft only' ], live: [] } } } ) ) ), /0 live errors\]$/ );
} );

// ---- the site build's secrets path and catalogue order
test( 'MUST FAIL: the site build takes envFile and envKey from the target, and falls back to the site name only for a site with no entry', () => {
	assert.deepEqual( siteEnv( { envFile: '.claude/secrets/local-indus.env', envKey: 'LOCALINDUS' }, 'local-indus' ), { envFile: '.claude/secrets/local-indus.env', envKey: 'LOCALINDUS' } );
	assert.deepEqual( siteEnv( { envFile: '.claude/secrets/shared.env', envKey: 'ODDKEY' }, 'renamed-site' ), { envFile: '.claude/secrets/shared.env', envKey: 'ODDKEY' } );
	assert.deepEqual( siteEnv( {}, 'new-site' ), { envFile: path.join( '.claude', 'secrets', 'new-site.env' ), envKey: 'NEWSITE' } );
} );

const PROD = { postType: 'product', slug: 'p', title: 'P', route: 'P.dc.html', menus: [ { menu: 'header', position: 1, parentItem: null } ], id: null };
const keyOf = ( r ) => `${ r.postType }:${ r.slug }`;

test( 'MUST FAIL: a menu entry waiting for the catalogue step is a problem naming --catalogue --apply, not a note; other waits stay notes', () => {
	const why = 'the product at /p/ is not recorded as built on s (catalogue.json sites.s); run site-build.mjs --catalogue --apply first, then the menus';
	const wait = ( needs ) => ( { links: {}, pending: [ { rowKey: keyOf( PROD ), menu: 'header', text: 'Buy', why, ...( needs ? { needs } : {} ) } ] } );
	const hard = desiredMenus( [ PROD ], {}, {}, wait( 'catalogue' ) );
	assert.equal( hard.problems.length, 1 );
	assert.match( hard.problems[ 0 ], /--catalogue --apply first/ );
	assert.equal( hard.notes.filter( ( n ) => /adds no item yet/.test( n ) ).length, 0 );
	const soft = desiredMenus( [ PROD ], {}, {}, wait( null ) );
	assert.equal( soft.problems.length, 0 );
	assert.equal( soft.notes.filter( ( n ) => /adds no item yet/.test( n ) ).length, 1 );
} );

test( 'MUST FAIL: menuLinksFor marks a product the catalogue has not recorded on the site as needing the catalogue step, and a recorded one as linked', () => {
	const rows = [
		{ route: 'Home.dc.html', slug: 'home', title: 'Home', postType: 'page', template: 'front-page', id: 10, menus: [], collection: 'static', flags: [] },
		{ route: 'Product.dc.html', slug: 'product', title: 'Product', postType: 'product', template: 'single-product', menus: [ { menu: 'header', position: 1, parentItem: null } ], collection: 'live', flags: [], id: null },
	];
	const menuItems = [ { menu: 'header', region: 'header', file: 'SiteHeader.dc.html', items: [ { label: 'Buy', targets: [ 'Product.dc.html?id=zookies' ], position: 1, parentItem: null, children: [] } ] } ];
	const catalogue = ( sites ) => ( { productBase: 'product', products: [ { draftId: 'zookies', slug: 'zookies', attributes: [] } ], dropped: [], sites } );
	const resolve = ( c ) => menuLinksFor( { rows, ctx: linkContext( { rows, catalogue: c, menuItems } ), catalogue: c, site: 'local' } );
	const none = resolve( catalogue( {} ) );
	assert.equal( none.pending.length, 1 );
	assert.equal( none.pending[ 0 ].needs, 'catalogue' );
	const done = resolve( catalogue( { local: { products: { zookies: { id: 40, permalink: 'http://localhost/product/zookies/' } } } } ) );
	assert.equal( done.pending.length, 0 );
	assert.equal( done.links[ 'product:product' ]?.length ?? Object.values( done.links ).flat().length, 1 );
} );

// ---- certifi discovery
test( 'MUST FAIL: NODE_EXTRA_CA_CERTS wins, else the certifi path a Python prints, else null', () => {
	const never = () => assert.fail( 'discovery must not run when the variable is set' );
	assert.equal( certsPath( { NODE_EXTRA_CA_CERTS: '/set.pem' }, never ), '/set.pem' );
	assert.equal( certsPath( {}, () => '/found.pem' ), '/found.pem' );
	const run = ( cmd ) => ( 'py' === cmd ? { status: 0, stdout: '/c/cacert.pem\n' } : { status: 1, stdout: '' } );
	assert.equal( certifiPath( { run, exists: () => true } ), '/c/cacert.pem' );
	assert.equal( certifiPath( { run: ( cmd ) => ( 'py' === cmd ? { status: 0, stdout: '/good.pem' } : { status: 1, stdout: '/bad.pem' } ), exists: () => true } ), '/good.pem', 'an interpreter that failed is not believed' );
	assert.equal( certifiPath( { run, exists: () => false } ), null );
	assert.equal( certifiPath( { run: () => ( { status: 1, stdout: '' } ), exists: () => true } ), null );
} );

test( 'MUST FAIL: site-run.mjs wires the three checks and no machine path', () => {
	const t = fs.readFileSync( path.join( ROUTE, 'site-run.mjs' ), 'utf8' );
	assert.match( t, /reviewedVerdict\( \{ surface: key, reviewed: skel\.rows, proposed: r\.proposal\.rows, rootComponent: skel\.inventory\?\.checks\?\.rootName \?\? null \} \)/ );
	assert.match( t, /calibrationVerdict\( \{ surface: key, rows: r\.proposal\.rows,/ );
	assert.match( t, /const certs = certsPath\(\);/ );
	assert.doesNotMatch( t, /AppData|Python313/ );
	const b = fs.readFileSync( path.join( ROUTE, 'site-build.mjs' ), 'utf8' );
	assert.match( b, /wpBuildPage\( repo, site, target \)/ );
	assert.doesNotMatch( b, /secrets', `\$\{ site \}\.env`/ );
	assert.ok( t.indexOf( 'calibrationVerdict(' ) < t.indexOf( "step( 'fill'" ), 'the block check runs before Fill' );
} );

// ---- push build comparison
const L = { './hero/block.json': 'a', './hero/render.php': 'b', './hero/view.js': 'v1' };

test( 'MUST FAIL: a differing, missing or extra block file is a mismatch naming the block and the build-deploy fix; bundles compare by presence only', () => {
	assert.equal( compareBuilds( L, { ...L, './hero/view.js': 'v2' } ).same, true, 'a bundle id difference is not a build difference' );
	const d = compareBuilds( L, { ...L, './hero/render.php': 'X' } );
	assert.deepEqual( d.differ, [ './hero/render.php' ] );
	assert.match( refusal( d, 'indus-test' ), /differ: hero.*build-deploy\.py --target indus-test/ );
	assert.deepEqual( compareBuilds( L, { './hero/block.json': 'a', './hero/render.php': 'b' } ).missing, [ './hero/view.js' ] );
	assert.deepEqual( compareBuilds( L, { ...L, './new/block.json': 'n' } ).extra, [ './new/block.json' ] );
} );

test( 'NEGATIVE: identical builds match; editor bundles and asset files are not listed', () => {
	assert.equal( compareBuilds( L, { ...L } ).same, true );
	assert.deepEqual( parseListing( `${ 'a'.repeat( 32 ) }  ./hero/block.json\n${ 'b'.repeat( 32 ) }  ./hero/index.js\n${ 'c'.repeat( 32 ) }  ./hero/index.asset.php\n` ), { './hero/block.json': 'a'.repeat( 32 ) } );
} );

test( 'MUST FAIL: build-compare exits 1 on a mismatch, 2 when a build cannot be read or is empty, 0 on a match', () => {
	const targets = { 'local-x': { pluginDir: '/mirror' } };
	const run = ( local, remote ) => {
		const said = [];
		const code = compareMain( [ '--local', 'local-x', '--target', 't' ], { targets, local: () => local, remote: () => ( 'throw' === remote ? ( () => { throw new Error( 'ssh refused' ); } )() : remote ), log: ( m ) => said.push( m ), error: ( m ) => said.push( m ) } );
		return { code, said: said.join( '\n' ) };
	};
	assert.equal( run( L, { ...L } ).code, 0 );
	assert.deepEqual( [ run( L, { ...L, './hero/render.php': 'X' } ).code, run( L, 'throw' ).code, run( {}, L ).code ], [ 1, 2, 2 ] );
	assert.match( run( L, 'throw' ).said, /ssh refused/ );
	assert.equal( compareMain( [ '--local', 'nope', '--target', 't' ], { targets, error: () => {} } ), 2 );
} );

test( 'MUST FAIL: push-to-remote.sh runs the build comparison before any write and ends with the site check', () => {
	const sh = fs.readFileSync( path.join( ROUTE, '..', 'local-wp', 'push-to-remote.sh' ), 'utf8' );
	assert.ok( sh.indexOf( 'build-compare.mjs' ) > 0 && sh.indexOf( 'build-compare.mjs' ) < sh.indexOf( 'step "dump the mirror database"' ) );
	assert.match( sh, /build-compare\.mjs" --local "\$LOCAL" --target "\$REMOTE" \|\| \{ [^}]*exit 1; \}/ );
	assert.match( sh, /site-check\.mjs "\$CLIENT" --site "\$REMOTE"/ );
	assert.match( sh, /Last step, not run here/ );
} );
