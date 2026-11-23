// Proves a draft walk kept in a --draft-cache file may be reused by a later run only while its inputs are unchanged (the walk stage
// of site-run.mjs keeps one per surface): a changed draft file, a changed walker module (the walker's own file, a module it imports
// statically or by import(), however deep) and a changed draft-side config each give a different key, so the draft is walked afresh;
// an unchanged draft, code and config give the same key. The walk stage passes --draft-cache and --draft-dir, and --fresh-draft leaves
// both out. No browser and no site: the keys and the argument list are pure.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { draftCacheKey, currentEntries, storeEntry, hashTree, codeHash, draftSideHash, cacheParts } from '../../parity/lib/draft-cache.mjs';
import { walkArgs, draftCacheFile } from '../lib/site-run-walk.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const PARITY = path.resolve( ROUTE, '..', 'parity' );
const tmp = ( name ) => fs.mkdtempSync( path.join( os.tmpdir(), `sgs-dcc-${ name }-` ) );
const put = ( root, rel, text ) => {
	fs.mkdirSync( path.dirname( path.join( root, rel ) ), { recursive: true } );
	fs.writeFileSync( path.join( root, rel ), text );
};
const base = { config: 'home', width: 1440 };

// A draft folder and a walker with a static import, a deeper static import and an import() call.
function fixture() {
	const draft = tmp( 'draft' );
	put( draft, 'Home.dc.html', '<h1>Home</h1>' );
	put( draft, 'assets/site.css', 'h1{color:red}' );
	const code = tmp( 'code' );
	put( code, 'walker.mjs', "import { a } from './lib/a.mjs';\nconst h = await import( './lib/dynamic.mjs' );\nexport default [ a, h ];\n" );
	put( code, 'lib/a.mjs', "import { deep } from './deep/deep.mjs';\nexport const a = deep;\n" );
	put( code, 'lib/deep/deep.mjs', 'export const deep = 1;\n' );
	put( code, 'lib/dynamic.mjs', 'export default 1;\n' );
	put( code, 'lib/unrelated.mjs', 'export default 0;\n' );
	return { draft, code, walker: path.join( code, 'walker.mjs' ) };
}
const keyOf = ( { draft, walker }, cfg = { name: 'home', draft: { url: 'http://127.0.0.1:5000/' }, pairs: [] } ) => draftCacheKey( { ...base, ...cacheParts( { cfg, draftDir: draft, walker, self: null } ) } );

test( 'negative control: an unchanged draft, walker and config give the same key, and a different port the same one', () => {
	const f = fixture();
	assert.equal( keyOf( f ), keyOf( f ) );
	assert.equal( keyOf( f, { name: 'home', draft: { url: 'http://127.0.0.1:5000/' }, pairs: [] } ), keyOf( f, { name: 'home', draft: { url: 'http://127.0.0.1:61234/' }, pairs: [] } ) );
	assert.equal( JSON.parse( keyOf( f ) ).snapshot, JSON.parse( draftCacheKey( base ) ).snapshot );
} );

test( 'MUST FAIL: a changed, added or removed draft file gives a different key', () => {
	const f = fixture();
	const before = keyOf( f );
	put( f.draft, 'assets/site.css', 'h1{color:blue}' );
	assert.notEqual( keyOf( f ), before, 'a changed file' );
	const changed = keyOf( f );
	put( f.draft, 'assets/new.png', 'x' );
	assert.notEqual( keyOf( f ), changed, 'an added file' );
	fs.rmSync( path.join( f.draft, 'assets', 'new.png' ) );
	assert.equal( keyOf( f ), changed, 'the file removed again' );
	fs.rmSync( path.join( f.draft, 'Home.dc.html' ) );
	assert.notEqual( keyOf( f ), changed, 'a removed file' );
	assert.notEqual( hashTree( f.draft ), hashTree( fixture().draft ).replace( /./, 'x' ) );
} );

test( 'MUST FAIL: a changed walker file, or any module it imports (static, nested or import()), gives a different key; an unimported file does not', () => {
	for ( const rel of [ 'walker.mjs', 'lib/a.mjs', 'lib/deep/deep.mjs', 'lib/dynamic.mjs' ] ) {
		const f = fixture();
		const before = keyOf( f );
		fs.appendFileSync( path.join( f.code, rel ), '// edited\n' );
		assert.notEqual( keyOf( f ), before, `${ rel } changed` );
	}
	const f = fixture();
	const before = keyOf( f );
	fs.appendFileSync( path.join( f.code, 'lib/unrelated.mjs' ), '// edited\n' );
	assert.equal( keyOf( f ), before, 'a file the walker does not import is not part of the key' );
} );

test( 'the key is the same wherever the walker folder sits (the hash reads relative paths)', () => {
	assert.equal( codeHash( fixture().walker ), codeHash( fixture().walker ) );
} );

test( 'MUST FAIL: a changed draft-side config gives a different key; a live-side change does not', () => {
	const f = fixture();
	const cfg = ( over ) => ( { name: 'home', draft: { url: 'http://127.0.0.1:5000/' }, live: { url: 'http://localhost:8084/' }, states: [ { name: 'rest', draft: '.a', live: '.cr-ref-0' } ], pairs: [ { name: 'hero', draft: '.hero', live: '.cr-ref-1', props: [ 'color' ] } ], ...over } );
	const same = keyOf( f, cfg() );
	assert.equal( keyOf( f, cfg( { live: { url: 'http://localhost:9000/other' }, pairs: [ { name: 'hero', draft: '.hero', live: '.cr-ref-9', props: [ 'color' ] } ] } ) ), same, 'live-only fields' );
	assert.notEqual( keyOf( f, cfg( { pairs: [ { name: 'hero', draft: '.hero2', live: '.cr-ref-1', props: [ 'color' ] } ] } ) ), same, 'a draft finder' );
	assert.notEqual( keyOf( f, cfg( { pairs: [ { name: 'hero', draft: '.hero', live: '.cr-ref-1', props: [ 'color', 'gap' ] } ] } ) ), same, 'a pair property' );
	assert.notEqual( keyOf( f, cfg( { draft: { url: 'http://127.0.0.1:5000/#other' } } ) ), same, 'the draft address beyond the port' );
	assert.notEqual( draftSideHash( cfg() ), draftSideHash( cfg( { refPrefix: 'cr-ref-' } ) ), 'a top-level draft-side field' );
} );

test( 'a --self live walk keeps the live half of the config in its key', () => {
	const cfg = ( live ) => ( { name: 'home', draft: { url: 'http://x/' }, pairs: [ { name: 'a', draft: '.a', live } ] } );
	assert.notEqual( draftSideHash( cfg( '.x' ), { keepLive: true } ), draftSideHash( cfg( '.y' ), { keepLive: true } ) );
	assert.equal( draftSideHash( cfg( '.x' ) ), draftSideHash( cfg( '.y' ) ) );
	const parts = ( live ) => cacheParts( { cfg: cfg( live ), draftDir: null, walker: fileURLToPath( import.meta.url ), self: 'live' } ).configHash;
	assert.notEqual( parts( '.x' ), parts( '.y' ) );
} );

test( 'a walk with --self live carries no draft hash, and with no draft folder given the draft part is null', () => {
	const f = fixture();
	const cfg = { name: 'home', draft: { url: 'http://x/' } };
	assert.equal( cacheParts( { cfg, draftDir: f.draft, walker: f.walker, self: 'live' } ).draft, null );
	assert.equal( cacheParts( { cfg, draftDir: null, walker: f.walker, self: null } ).draft, null );
	assert.equal( cacheParts( { cfg, draftDir: f.draft, walker: f.walker, self: 'draft' } ).draft, hashTree( f.draft ) );
} );

test( 'a cache file kept across runs holds one entry per walk: storing a walk of new inputs replaces the old one only', () => {
	const old = draftCacheKey( { ...base, draft: 'a', code: 'a', configHash: 'a' } );
	const other = draftCacheKey( { ...base, width: 768, draft: 'a', code: 'a', configHash: 'a' } );
	const fresh = draftCacheKey( { ...base, draft: 'b', code: 'a', configHash: 'a' } );
	const cache = storeEntry( storeEntry( {}, old, 'old1440' ), other, 'old768' );
	storeEntry( cache, fresh, 'new1440' );
	assert.deepEqual( cache, { [ other ]: 'old768', [ fresh ]: 'new1440' } );
	assert.deepEqual( Object.keys( currentEntries( cache ) ).sort(), [ other, fresh ].sort() );
	assert.deepEqual( storeEntry( { [ fresh ]: 'x' }, fresh, 'y' ), { [ fresh ]: 'y' }, 'the same key is overwritten' );
} );

test( 'the walker reads the draft cache through the key parts and stores through storeEntry (the real walker file is hashed too)', () => {
	const src = fs.readFileSync( path.join( PARITY, 'draft-live-walk.mjs' ), 'utf8' );
	assert.match( src, /cacheParts\( \{ cfg, draftDir: flag\( '--draft-dir' \), walker: fileURLToPath\( import\.meta\.url \), self: flag\( '--self' \) \} \)/ );
	assert.ok( src.indexOf( 'cacheParts( {' ) < src.indexOf( 'cfg.draft = cfg.live = cfg[ self ]' ), 'the key parts are taken before the walk changes the config' );
	assert.match( src, /draftCacheKey\( \{[^}]*\.\.\.parts \} \)/ );
	assert.match( src, /storeEntry\( cached, cacheKey\( width \), draft \);\s*fs\.mkdirSync\( path\.dirname\( draftCache \), \{ recursive: true \} \);\s*fs\.writeFileSync\( draftCache,/ );
	assert.equal( 64, codeHash( path.join( PARITY, 'draft-live-walk.mjs' ) ).length );
} );

test( 'MUST FAIL: the walk stage passes the draft cache and the draft folder, and --fresh-draft passes neither', () => {
	const args = { build: path.join( 'sites', 'c', 'build' ), key: 'home', parity: path.join( 'sites', 'c', 'build', 'qa', 'parity' ), walkerFull: 'x/home.fill.mjs', draftDir: path.join( 'sites', 'c', 'handoff' ), widths: '1440,768,375', headless: [ '--headless' ] };
	const kept = walkArgs( args );
	assert.equal( kept[ kept.indexOf( '--draft-cache' ) + 1 ], path.join( 'sites', 'c', 'build', 'qa', 'parity', 'draft-cache', 'home.json' ) );
	assert.equal( kept[ kept.indexOf( '--draft-dir' ) + 1 ], args.draftDir );
	assert.equal( kept[ 0 ], 'scripts/parity/draft-live-walk.mjs' );
	assert.deepEqual( kept.slice( kept.indexOf( '--widths' ), kept.indexOf( '--widths' ) + 2 ), [ '--widths', '1440,768,375' ] );
	assert.ok( kept.includes( '--headless' ) && kept.includes( '--no-review' ) );
	const fresh = walkArgs( { ...args, fresh: true } );
	assert.ok( ! fresh.includes( '--draft-cache' ) && ! fresh.includes( '--draft-dir' ) );
	assert.deepEqual( fresh, kept.slice( 0, kept.indexOf( '--draft-cache' ) ) );
	assert.equal( draftCacheFile( { build: 'b', key: 'k' } ), path.join( 'b', 'qa', 'parity', 'draft-cache', 'k.json' ) );
} );

test( 'site-run.mjs builds the walk command through walkArgs with --fresh-draft, and its usage names the flag', () => {
	const src = fs.readFileSync( path.join( ROUTE, 'site-run.mjs' ), 'utf8' );
	assert.match( src, /const freshDraft = argv\.includes\( '--fresh-draft' \);/ );
	assert.match( src, /walkArgs\( \{[^}]*draftDir: path\.join\( REPO, entry\.draftDir \)[^}]*fresh: freshDraft \} \)/ );
	assert.match( src, /usage: site-run\.mjs[^']*\[--fresh-draft\]/ );
} );

// Code review 2026-11-23: walker configs hold their state actions and openers as functions, which JSON.stringify drops.
test( 'MUST FAIL: an edited draft action function gives a different key; an edited live action does not', () => {
	const cfg = ( draft, live ) => ( { name: 'home', states: [ { name: 'open', draft, live } ] } );
	const before = draftSideHash( cfg( async ( h ) => h.click( '.a' ), async () => {} ) );
	assert.notEqual( draftSideHash( cfg( async ( h ) => h.click( '.b' ), async () => {} ) ), before );
	assert.equal( draftSideHash( cfg( async ( h ) => h.click( '.a' ), async ( h ) => h.click( '.z' ) ) ), before );
	assert.notEqual( draftSideHash( { name: 'x', open: () => 1 } ), draftSideHash( { name: 'x', open: () => 2 } ) );
} );

// Code review 2026-11-23: a linked folder in the draft reads as a non-directory entry, and reading it as a file threw EISDIR.
test( 'MUST FAIL: a draft folder holding a linked folder is hashed through the link, and a change behind it moves the key', () => {
	const d = tmp( 'link' );
	const target = tmp( 'link-target' );
	put( d, 'index.html', '<p>a</p>' );
	put( target, 'logo.svg', '<svg/>' );
	try {
		fs.symlinkSync( target, path.join( d, 'assets' ), 'junction' );
	} catch {
		return; // the machine refuses links: nothing to prove here
	}
	const first = hashTree( d );
	put( target, 'logo.svg', '<svg id="x"/>' );
	assert.notEqual( hashTree( d ), first );
} );
