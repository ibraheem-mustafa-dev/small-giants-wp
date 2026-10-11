// Spec 48A handoff folder check (lib/handoff.mjs::checkHandoff, handoff-check.mjs): FR-48A-2 required files, FR-48A-3
// allowed files and reachability (dc-import names with spaces, one file per page linked by href), FR-48A-4 the manifest
// in both directions with sizes, hashes and runtime_sha256, FR-48A-5 an unknown runtime, FR-48A-6 a differing schema copy
// (warning), FR-48A-7 a stale inventory, FR-48A-8 a block-mapping README heading (warning), FR-48A-10 an unsafe SVG.
// Every MUST FAIL case breaks one rule of an otherwise valid synthetic folder built in the temp folder.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { checkHandoff, buildManifest, loadAjv, sha256, draftRefs, resolveRef, MASTER_SCHEMAS } from '../lib/handoff.mjs';
import { main, parseArgs } from '../handoff-check.mjs';

const ajv = loadAjv();
const SUPPORT = '/* a synthetic runtime build for the handoff check tests */\n';
const SUPPORT_SHA = sha256( Buffer.from( SUPPORT ) );
const KNOWN = { runtimes: [ { sha256: SUPPORT_SHA, added: '2026-10-11', source: 'test', probe: 'pass' } ] };
const page = ( body ) => `<!DOCTYPE html>\n<html><head><script src="./support.js"></script></head><body>\n<x-dc>\n${ body }\n</x-dc>\n</body></html>\n`;
const roots = [];

const count = () => ( { by_dc: {}, total: 0, record_ids: [] } );
function animations( root, drafts ) {
	return {
		schema_version: '1.0', project: 'Test project', runtime_sha256: sha256( fs.readFileSync( path.join( root, 'support.js' ) ) ),
		drafts: drafts.map( ( f ) => ( { dc: f.replace( /\.dc\.html$/, '' ), file: f, sha256: sha256( fs.readFileSync( path.join( root, f ) ) ) } ) ),
		records: [],
		counts: { animate_calls: count(), inline_transitions: count(), pseudo_rules: count(), css_animations: count(), js_style_writers: count() },
		unresolved: [],
	};
}
const surfaces = ( root ) => ( {
	schema_version: '1.0', project: 'Test project', runtime_sha256: sha256( fs.readFileSync( path.join( root, 'support.js' ) ) ), records: [],
	counts: { routes: { by_dc: {}, total: 0, covered_by: {} }, toggling_sc_ifs: { by_dc: {}, total: 0, covered_by: {} } },
	unresolved: [],
} );

// A valid handoff folder: `drafts` maps file to body, `entries` are the entry drafts, `extra` adds or replaces files
// before the inventories and the manifest are written.
function folder( { drafts = { 'Home.dc.html': page( '<div><dc-import name="Frame Card"></dc-import></div>\n<script src="store.js"></script>' ), 'Frame Card.dc.html': page( '<p>card</p>' ) }, entries = [ 'Home.dc.html' ], extra = {} } = {} ) {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'handoff-check-' ) );
	roots.push( root );
	const files = {
		'README.md': '# Test project\n\n## Pages\n\nHome.\n', 'support.js': SUPPORT, 'store.js': 'window.store = {};\n',
		'tokens/colors.css': ':root{--ink:#111}\n', 'tokens/typography.css': ':root{--f:serif}\n', 'tokens/spacing.css': ':root{--s:8px}\n',
		'READING-DC-FILES.md': '# Reading\n', 'assets/logo.svg': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1"/></svg>\n',
		...drafts, ...extra,
	};
	for ( const f of fs.readdirSync( MASTER_SCHEMAS ) ) {
		files[ `handoff-schema/${ f }` ] = fs.readFileSync( path.join( MASTER_SCHEMAS, f ) );
	}
	for ( const [ f, body ] of Object.entries( files ) ) {
		if ( null === body ) {
			continue;
		}
		fs.mkdirSync( path.dirname( path.join( root, f ) ), { recursive: true } );
		fs.writeFileSync( path.join( root, f ), body );
	}
	fs.writeFileSync( path.join( root, 'animations.json' ), JSON.stringify( animations( root, Object.keys( drafts ) ) ) );
	fs.writeFileSync( path.join( root, 'surfaces.json' ), JSON.stringify( surfaces( root ) ) );
	writeManifest( root, entries );
	return root;
}
const writeManifest = ( root, entries ) => fs.writeFileSync( path.join( root, 'MANIFEST.json' ), JSON.stringify( buildManifest( root, { project: 'Test project', entryDrafts: entries, generated: '2026-10-11' } ), null, 2 ) );
const editManifest = ( root, fn ) => {
	const m = JSON.parse( fs.readFileSync( path.join( root, 'MANIFEST.json' ), 'utf8' ) );
	fn( m );
	fs.writeFileSync( path.join( root, 'MANIFEST.json' ), JSON.stringify( m ) );
};
const check = ( root, known = KNOWN ) => checkHandoff( root, { known, ajv } );
const failsWith = ( r, re ) => assert.ok( r.errors.some( ( e ) => re.test( e ) ), `expected a failure matching ${ re }, got:\n${ r.errors.join( '\n' ) }` );

test.after( () => roots.forEach( ( r ) => fs.rmSync( r, { recursive: true, force: true } ) ) );

test( 'a complete folder passes with no warnings, through the function and the command line', async () => {
	const root = folder();
	const r = check( root );
	assert.deepEqual( r.errors, [] );
	assert.deepEqual( r.warnings, [] );
	const known = path.join( root, '..', `${ path.basename( root ) }-known.json` );
	roots.push( known );
	fs.writeFileSync( known, JSON.stringify( KNOWN ) );
	const out = [];
	assert.equal( await main( [ root, '--known', known ], ( l ) => out.push( l ) ), 0, out.join( '\n' ) );
} );

test( 'the command line: usage errors exit 2', async () => {
	assert.ok( parseArgs( [] ).error );
	assert.ok( parseArgs( [ 'a', '--bogus' ] ).error );
	assert.ok( parseArgs( [ 'a', '--known' ] ).error );
	assert.equal( await main( [ path.join( os.tmpdir(), 'no-such-handoff-folder-48a' ) ], () => {} ), 2 );
} );

test( 'MUST FAIL FR-48A-2: a missing required file is named', () => {
	const root = folder( { extra: { 'tokens/spacing.css': null } } );
	failsWith( check( root ), /^FR-48A-2 tokens\/spacing\.css: required file is missing/ );
} );

test( 'MUST FAIL FR-48A-3: an unknown extra file and a script no draft loads are named with "remove it"', () => {
	const root = folder( { extra: { 'notes.txt': 'planning notes', 'unused.js': '1;' } } );
	const r = check( root );
	failsWith( r, /^FR-48A-3 notes\.txt: .*remove it/ );
	failsWith( r, /^FR-48A-3 unused\.js: .*remove it/ );
	assert.ok( ! r.errors.some( ( e ) => / store\.js:/.test( e ) ), 'a script a reachable draft loads is allowed' );
} );

test( 'MUST FAIL FR-48A-3: a draft no entry draft reaches is named', () => {
	const root = folder( { drafts: { 'Home.dc.html': page( '<p>home</p>' ), 'Home v1.dc.html': page( '<p>old</p>' ) } } );
	failsWith( check( root ), /^FR-48A-3 Home v1\.dc\.html: draft is not reachable/ );
} );

test( 'FR-48A-3: one file per page linked by plain href passes (query, fragment, ./ and %20 handled)', () => {
	const root = folder( { drafts: {
		'Home.dc.html': page( '<a href="Shop.dc.html?id=1#top">Shop</a> <a href="./About%20Us.dc.html">About</a> <a href="{{ dyn }}">x</a> <a href="https://example.com/Other.dc.html">ext</a><script src="store.js"></script>' ),
		'Shop.dc.html': page( '<a href="Basket.dc.html#items">Basket</a>' ),
		'Basket.dc.html': page( '<a href="Home.dc.html">Home</a>' ),
		'About Us.dc.html': page( '<p>about</p>' ),
	} } );
	assert.deepEqual( check( root ).errors, [] );
} );

test( 'FR-48A-3: a draft mounted by dc-import with a space in its name passes; the name is case-sensitive', () => {
	assert.deepEqual( check( folder() ).errors, [] );
	const wrongCase = folder( { drafts: { 'Home.dc.html': page( '<dc-import name="frame card"></dc-import>' ), 'Frame Card.dc.html': page( '<p>card</p>' ) } } );
	failsWith( check( wrongCase ), /^FR-48A-3 Frame Card\.dc\.html: draft is not reachable/ );
} );

test( 'MUST FAIL FR-48A-4: the manifest lists a file not on disk', () => {
	const root = folder();
	editManifest( root, ( m ) => m.files.push( { path: 'assets/gone.png', bytes: 1, sha256: '0'.repeat( 64 ) } ) );
	failsWith( check( root ), /^FR-48A-4 assets\/gone\.png: listed in MANIFEST\.json but not in the folder/ );
} );

test( 'MUST FAIL FR-48A-4: a file on disk the manifest does not list', () => {
	const root = folder();
	fs.writeFileSync( path.join( root, 'assets', 'late.png' ), 'png' );
	failsWith( check( root ), /^FR-48A-4 assets\/late\.png: in the folder but not listed/ );
} );

test( 'MUST FAIL FR-48A-4: a file whose content no longer matches its recorded hash', () => {
	const root = folder();
	fs.writeFileSync( path.join( root, 'tokens', 'colors.css' ), ':root{--ink:#222}\n' );
	failsWith( check( root ), /^FR-48A-4 tokens\/colors\.css: SHA-256 does not match/ );
} );

test( 'MUST FAIL FR-48A-4: runtime_sha256 that is not support.js', () => {
	const root = folder();
	editManifest( root, ( m ) => ( m.runtime_sha256 = 'a'.repeat( 64 ) ) );
	failsWith( check( root ), /^FR-48A-4 MANIFEST\.json: runtime_sha256 a{64} is not the SHA-256 of support\.js/ );
} );

test( 'MUST FAIL FR-48A-4: a manifest that breaks the master schema', () => {
	const root = folder();
	editManifest( root, ( m ) => ( m.files[ 0 ].path = './README.md' ) );
	failsWith( check( root ), /^FR-48A-4 MANIFEST\.json: \/files\/0\/path/ );
} );

test( 'MUST FAIL FR-48A-5: an unknown runtime build names --probe-runtime', () => {
	failsWith( check( folder(), { runtimes: [] } ), /^FR-48A-5 support\.js: unknown runtime build .*--probe-runtime/ );
} );

test( 'MUST FAIL FR-48A-7: an inventory recorded against an older draft is stale', () => {
	const root = folder();
	fs.appendFileSync( path.join( root, 'Frame Card.dc.html' ), '<!-- edited after the inventory -->\n' );
	writeManifest( root, [ 'Home.dc.html' ] );
	const r = check( root );
	failsWith( r, /^FR-48A-7 animations\.json: inventory is stale: Frame Card\.dc\.html has changed/ );
	assert.equal( r.errors.length, 1, r.errors.join( '\n' ) );
} );

test( 'MUST FAIL FR-48A-10: an SVG under assets/ holding a script, an event attribute or foreignObject', () => {
	const root = folder( { extra: {
		'assets/a.svg': '<svg><SCRIPT>alert(1)</SCRIPT></svg>',
		'assets/icons/b.svg': '<svg><rect onload="x()"/></svg>',
		'assets/c.svg': '<svg><foreignobject></foreignobject></svg>',
	} } );
	const r = check( root );
	failsWith( r, /^FR-48A-10 assets\/a\.svg: SVG holds a <script>/ );
	failsWith( r, /^FR-48A-10 assets\/icons\/b\.svg: SVG holds an on…= event attribute/ );
	failsWith( r, /^FR-48A-10 assets\/c\.svg: SVG holds a <foreignObject>/ );
} );

test( 'MUST FAIL FR-48A-10: SVG screen bypasses (slash-led event, javascript: URL, link-rewriting animate, external link)', () => {
	const root = folder( { extra: {
		'assets/d.svg': '<svg/onload=x()></svg>',
		'assets/e.svg': '<svg><a href="javascript:x()"><rect/></a></svg>',
		'assets/f.svg': '<svg><a><animate attributeName="href" to="#x"/></a></svg>',
		'assets/g.svg': '<svg><use xlink:href="https://evil.example/s.svg#a"/></svg>',
	} } );
	const r = check( root );
	failsWith( r, /^FR-48A-10 assets\/d\.svg: SVG holds an on…= event attribute/ );
	failsWith( r, /^FR-48A-10 assets\/e\.svg: SVG holds a javascript: URL/ );
	failsWith( r, /^FR-48A-10 assets\/f\.svg: SVG holds an <animate> or <set> that rewrites a link/ );
	failsWith( r, /^FR-48A-10 assets\/g\.svg: SVG holds a link to https:\/\/evil\.example/ );
} );

test( 'FR-48A-10: a same-document #fragment link, a data:image link and an xmlns URL pass', () => {
	const root = folder( { extra: {
		'assets/h.svg': '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><use href="#a"/><image xlink:href="data:image/png;base64,AA=="/></svg>',
	} } );
	const r = check( root );
	assert.ok( ! r.errors.some( ( e ) => e.includes( 'assets/h.svg' ) ), r.errors.join( '\n' ) );
} );

test( 'FR-48A-8: a README heading that maps the design to SGS blocks passes with a warning', () => {
	const root = folder( { extra: { 'README.md': '# Test project\n\n## Block mapping (SGS)\n\nHero.\n' } } );
	const r = check( root );
	assert.deepEqual( r.errors, [] );
	assert.ok( r.warnings.some( ( w ) => /^FR-48A-8 README\.md: heading "Block mapping \(SGS\)"/.test( w ) ), r.warnings.join( '\n' ) );
} );

test( 'FR-48A-6: a handoff-schema copy that differs from the master passes with a warning naming it', () => {
	const root = folder();
	fs.appendFileSync( path.join( root, 'handoff-schema', 'METHOD.md' ), '\nA local edit.\n' );
	writeManifest( root, [ 'Home.dc.html' ] );
	const r = check( root );
	assert.deepEqual( r.errors, [] );
	assert.deepEqual( r.warnings.map( ( w ) => w.split( ':' )[ 0 ] ), [ 'FR-48A-6 handoff-schema/METHOD.md' ] );
} );

test( 'reference resolution: dc-import, href, src, script and x-import values', () => {
	assert.equal( resolveRef( './a%20b.dc.html?x=1#y' ), 'a b.dc.html' );
	assert.equal( resolveRef( 'mailto:a@b.c' ), null );
	assert.equal( resolveRef( '../outside.js' ), null );
	assert.equal( resolveRef( '#top' ), null );
	const refs = draftRefs( '<dc-import name="Site Header"></dc-import><a data-src="x.dc.html" href="P.dc.html"></a><script src="lib/s.js"></script><x-import from="./m.js"></x-import>' );
	assert.deepEqual( refs.drafts.sort(), [ 'P.dc.html', 'Site Header.dc.html' ] );
	assert.deepEqual( refs.scripts.sort(), [ 'lib/s.js', 'm.js' ] );
} );
