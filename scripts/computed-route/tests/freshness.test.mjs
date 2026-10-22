// lib/freshness.mjs: a record the route saved (intake.json, a saved inventory) carries the sha256 of every draft, the
// runtime, surfaces.json, animations.json and the token stylesheets; assertCurrent refuses a record when the export on disk
// no longer matches, and passes a record written before `sources` existed with one warning.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { sourcesOf, assertCurrent, changedSources, StaleRecordError } from '../lib/freshness.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const roots = [];
function folder() {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'freshness-' ) );
	roots.push( root );
	const files = { 'support.js': '// runtime\n', 'surfaces.json': '{"records":[]}\n', 'animations.json': '{"records":[]}\n', 'tokens/colors.css': ':root{--a:#111}\n', 'Home.dc.html': '<x-dc>home</x-dc>\n', 'NOTES.md': 'not a source\n' };
	for ( const [ f, body ] of Object.entries( files ) ) {
		fs.mkdirSync( path.dirname( path.join( root, f ) ), { recursive: true } );
		fs.writeFileSync( path.join( root, f ), body );
	}
	return root;
}
const write = ( root, f, body ) => fs.writeFileSync( path.join( root, f ), body );
test.after( () => roots.forEach( ( r ) => fs.rmSync( r, { recursive: true, force: true } ) ) );

test( 'sources hold the sha256 of every draft, the runtime, both inventories and the tokens, and the route commit', () => {
	const s = sourcesOf( folder(), { commit: 'abc' } );
	assert.deepEqual( Object.keys( s.files ).sort(), [ 'Home.dc.html', 'animations.json', 'support.js', 'surfaces.json', 'tokens/colors.css' ] );
	assert.ok( Object.values( s.files ).every( ( h ) => /^[0-9a-f]{64}$/.test( h ) ) );
	assert.deepEqual( s.route, { commit: 'abc' } );
} );

test( 'a current record passes', () => {
	const root = folder();
	assert.deepEqual( assertCurrent( { sources: sourcesOf( root ) }, root ), { checked: true } );
} );

test( 'MUST FAIL a record whose support.js hash differs is refused, naming the file', () => {
	const root = folder();
	const record = { sources: sourcesOf( root ) };
	write( root, 'support.js', '// a newer runtime\n' );
	assert.throws( () => assertCurrent( record, root, { label: 'intake.json' } ), ( e ) => e instanceof StaleRecordError && 'StaleRecordError' === e.name && /intake\.json is stale/.test( e.message ) && /support\.js changed/.test( e.message ) && 1 === e.changed.length );
} );

test( 'MUST FAIL every changed, added and removed source is listed', () => {
	const root = folder();
	const record = { sources: sourcesOf( root ) };
	write( root, 'Home.dc.html', '<x-dc>edited</x-dc>\n' );
	write( root, 'Extra.dc.html', '<x-dc/>\n' );
	write( root, 'tokens/spacing.css', ':root{}\n' );
	fs.rmSync( path.join( root, 'surfaces.json' ) );
	write( root, 'NOTES.md', 'still not a source\n' );
	assert.deepEqual( changedSources( record.sources, root ).sort(), [ 'Extra.dc.html added', 'Home.dc.html changed', 'surfaces.json removed', 'tokens/spacing.css added' ] );
	assert.throws( () => assertCurrent( record, root ), StaleRecordError );
} );

test( 'a record with no sources passes with one warning, never silently', () => {
	const warned = [];
	assert.deepEqual( assertCurrent( { client: 'x' }, folder(), { label: 'old.json', warn: ( l ) => warned.push( l ) } ), { checked: false } );
	assert.equal( warned.length, 1 );
	assert.match( warned[ 0 ], /old\.json has no sources/ );
} );

test( 'MUST FAIL a changed token stylesheet is refused, naming the file', () => {
	const root = folder();
	const record = { sources: sourcesOf( root ) };
	write( root, 'tokens/colors.css', ':root{--a:#222}\n' );
	assert.throws( () => assertCurrent( record, root ), ( e ) => e instanceof StaleRecordError && /tokens\/colors\.css changed/.test( e.message ) && 1 === e.changed.length );
} );

test( 'MUST FAIL every source kind is hashed: a script at any depth, an asset, a README, the runtime and both inventories', () => {
	const root = folder();
	for ( const [ f, body ] of Object.entries( { 'store.js': '//a\n', 'lib/deep/helper.js': '//b\n', 'assets/a.svg': '<svg/>\n', 'README.md': '# r\n', 'handoff-schema/x.js': '//c\n' } ) ) {
		fs.mkdirSync( path.dirname( path.join( root, f ) ), { recursive: true } );
		write( root, f, body );
	}
	const record = { sources: sourcesOf( root ) };
	assert.deepEqual( Object.keys( record.sources.files ).sort(), [ 'Home.dc.html', 'README.md', 'animations.json', 'assets/a.svg', 'handoff-schema/x.js', 'lib/deep/helper.js', 'store.js', 'support.js', 'surfaces.json', 'tokens/colors.css' ] );
	for ( const f of Object.keys( record.sources.files ) ) {
		const was = fs.readFileSync( path.join( root, f ), 'utf8' );
		write( root, f, `${ was }changed\n` );
		assert.deepEqual( changedSources( record.sources, root ), [ `${ f } changed` ], f );
		write( root, f, was );
	}
	write( root, 'Extra.dc.html', '<x-dc/>\n' );
	fs.rmSync( path.join( root, 'surfaces.json' ) );
	assert.deepEqual( changedSources( record.sources, root ).sort(), [ 'Extra.dc.html added', 'surfaces.json removed' ] );
} );

test( 'MUST FAIL the readers of an intake record call assertCurrent', () => {
	for ( const f of [ 'skeleton.mjs', 'check-approved.mjs', 'fill.mjs', 'lib/skeleton-rerun.mjs' ] ) {
		assert.match( fs.readFileSync( path.join( ROUTE, f ), 'utf8' ), /assertCurrent\(/, f );
	}
} );

test( 'intake writes sources into intake.json and into each saved inventory', () => {
	assert.match( fs.readFileSync( path.join( ROUTE, 'lib/intake-skeletons.mjs' ), 'utf8' ), /\{ \.\.\.inventory, sources \}/ );
	const run = fs.readFileSync( path.join( ROUTE, 'lib/intake-run.mjs' ), 'utf8' );
	assert.match( run, /const hashed = sourcesOf\( at\.folder \);/ );
	assert.match( run, /sources: hashed \}/ );
	assert.ok( run.indexOf( 'const hashed = sourcesOf' ) < run.indexOf( 'await runIsolated(' ), 'the inputs are hashed before the worker reads any of them' );
} );
