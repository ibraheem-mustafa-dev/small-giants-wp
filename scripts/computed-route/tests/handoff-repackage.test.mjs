// Repackaging an export made before MANIFEST.json existed (handoff-repackage.mjs): the old MANIFEST.md's sizes and
// hashes must still match before anything is written; the result passes the Spec 48A check. MUST FAIL cases: a file
// changed after export, a changed support.js, a MANIFEST.md with no hash table, and an export already in the current
// format; each leaves the folder untouched.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { checkHandoff, loadAjv, sha256, walkFolder, MASTER_SCHEMAS } from '../lib/handoff.mjs';
import { main, parseArgs, readOldManifest, repackage } from '../handoff-repackage.mjs';

const ajv = loadAjv();
const SUPPORT = '/* a synthetic runtime build for the repackage tests */\n';
const KNOWN = { runtimes: [ { sha256: sha256( Buffer.from( SUPPORT ) ), added: '2026-10-11', source: 'test', probe: 'pass' } ] };
const page = ( body ) => `<!DOCTYPE html>\n<html><head><script src="./support.js"></script></head><body>\n<x-dc>\n${ body }\n</x-dc>\n</body></html>\n`;
const OPTS = { project: 'Test project', entries: [ 'Home.dc.html' ], generated: '2026-10-11' };
const roots = [];
const count = () => ( { by_dc: {}, total: 0, record_ids: [] } );

// An export in the old format: every required file except MANIFEST.json and the two schema files added since, plus
// MANIFEST.md (a backticked hash table and the runtime line) and the trace harness.
function oldExport() {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'handoff-repackage-' ) );
	roots.push( root );
	const files = {
		'README.md': '# Test project\n\n## Pages\n\nHome.\n', 'support.js': SUPPORT, 'Home.dc.html': page( '<p>home</p>' ),
		'tokens/colors.css': ':root{--ink:#111}\n', 'tokens/typography.css': ':root{--f:serif}\n', 'tokens/spacing.css': ':root{--s:8px}\n',
		'READING-DC-FILES.md': '# Reading\n', 'handoff-schema/trace/trace-harness.html': '<p>trace</p>\n',
	};
	for ( const f of fs.readdirSync( MASTER_SCHEMAS ) ) {
		if ( ! [ 'manifest.schema.json', 'README.template.md' ].includes( f ) ) {
			files[ `handoff-schema/${ f }` ] = fs.readFileSync( path.join( MASTER_SCHEMAS, f ) );
		}
	}
	for ( const [ f, body ] of Object.entries( files ) ) {
		fs.mkdirSync( path.dirname( path.join( root, f ) ), { recursive: true } );
		fs.writeFileSync( path.join( root, f ), body );
	}
	const rt = sha256( Buffer.from( SUPPORT ) );
	fs.writeFileSync( path.join( root, 'animations.json' ), JSON.stringify( {
		schema_version: '1.0', project: 'Test project', runtime_sha256: rt,
		drafts: [ { dc: 'Home', file: 'Home.dc.html', sha256: sha256( fs.readFileSync( path.join( root, 'Home.dc.html' ) ) ) } ], records: [],
		counts: { animate_calls: count(), inline_transitions: count(), pseudo_rules: count(), css_animations: count(), js_style_writers: count() },
		unresolved: [],
	} ) );
	fs.writeFileSync( path.join( root, 'surfaces.json' ), JSON.stringify( {
		schema_version: '1.0', project: 'Test project', runtime_sha256: rt, records: [],
		counts: { routes: { by_dc: {}, total: 0, covered_by: {} }, toggling_sc_ifs: { by_dc: {}, total: 0, covered_by: {} } }, unresolved: [],
	} ) );
	const rows = walkFolder( root ).files.map( ( f ) => {
		const buf = fs.readFileSync( path.join( root, f ) );
		return `| \`${ f }\` | ${ buf.length } | \`${ sha256( buf ) }\` |`;
	} );
	fs.writeFileSync( path.join( root, 'MANIFEST.md' ), `# Handoff manifest\n\nsupport.js SHA-256: \`${ rt }\`\n\n| File | Bytes | SHA-256 |\n|---|---|---|\n${ rows.join( '\n' ) }\n` );
	return root;
}
const snapshot = ( root ) => walkFolder( root ).files.map( ( f ) => `${ f }:${ sha256( fs.readFileSync( path.join( root, f ) ) ) }` );

test.after( () => roots.forEach( ( r ) => fs.rmSync( r, { recursive: true, force: true } ) ) );

test( 'an unchanged old-format export repackages and then passes the handoff check', () => {
	const root = oldExport();
	const r = repackage( root, OPTS );
	assert.deepEqual( r.problems, [] );
	assert.ok( ! fs.existsSync( path.join( root, 'MANIFEST.md' ) ) );
	assert.ok( ! fs.existsSync( path.join( root, 'handoff-schema', 'trace' ) ) );
	const c = checkHandoff( root, { known: KNOWN, ajv } );
	assert.deepEqual( c.errors, [] );
} );

test( 'a dry run lists the actions and writes nothing', () => {
	const root = oldExport();
	const before = snapshot( root );
	const r = repackage( root, { ...OPTS, dryRun: true } );
	assert.ok( r.actions.some( ( a ) => /^write MANIFEST\.json/.test( a ) ) );
	assert.deepEqual( snapshot( root ), before );
} );

test( 'MUST FAIL: a draft changed after export stops the run and leaves the folder untouched', () => {
	const root = oldExport();
	fs.appendFileSync( path.join( root, 'Home.dc.html' ), '<!-- edited -->\n' );
	const before = snapshot( root );
	const r = repackage( root, OPTS );
	assert.ok( r.problems.some( ( p ) => /^Home\.dc\.html: changed since export/.test( p ) ), r.problems.join( '\n' ) );
	assert.deepEqual( snapshot( root ), before );
} );

test( 'MUST FAIL: a support.js differing from the stated runtime hash stops the run', () => {
	const root = oldExport();
	const md = path.join( root, 'MANIFEST.md' );
	fs.writeFileSync( md, fs.readFileSync( md, 'utf8' ).replace( /^\| `support\.js`.*\n/m, '' ) );
	fs.appendFileSync( path.join( root, 'support.js' ), '/* edited */\n' );
	assert.ok( repackage( root, OPTS ).problems.some( ( p ) => /^support\.js: differs from the runtime hash/.test( p ) ) );
} );

test( 'MUST FAIL: a MANIFEST.md with no hash table, a missing MANIFEST.md, and a current-format export are refused', () => {
	const noTable = oldExport();
	fs.writeFileSync( path.join( noTable, 'MANIFEST.md' ), '# Handoff manifest\n\nNo table.\n' );
	assert.ok( repackage( noTable, OPTS ).problems.some( ( p ) => /lists no file/.test( p ) ) );
	const missing = oldExport();
	fs.rmSync( path.join( missing, 'MANIFEST.md' ) );
	assert.ok( repackage( missing, OPTS ).problems.some( ( p ) => /MANIFEST\.md is missing/.test( p ) ) );
	const current = oldExport();
	assert.deepEqual( repackage( current, OPTS ).problems, [] );
	assert.ok( repackage( current, OPTS ).problems.some( ( p ) => /already in the current format/.test( p ) ) );
} );

test( 'readOldManifest reads backticked and plain rows and the runtime line', () => {
	const h = 'a'.repeat( 64 );
	const r = readOldManifest( `support.js SHA-256 (runtime version): \`${ h }\`\n| \`A b.dc.html\` | 12 | \`${ h }\` |\n| c.js | 3 | ${ h } |\n|---|---|---|\n` );
	assert.deepEqual( r.rows.map( ( x ) => x.path ), [ 'A b.dc.html', 'c.js' ] );
	assert.equal( r.runtime, h );
} );

test( 'the command line: usage errors exit 2, a refused folder exits 1', () => {
	assert.ok( parseArgs( [ 'a' ] ).error );
	assert.ok( parseArgs( [ 'a', '--project', 'P', '--entry', 'H.dc.html', '--generated', '11-10-2026' ] ).error );
	assert.ok( parseArgs( [ 'a', '--bogus' ] ).error );
	assert.equal( main( [ path.join( os.tmpdir(), 'no-such-handoff-folder-repack' ), '--project', 'P', '--entry', 'H.dc.html', '--generated', '2026-10-11' ], () => {} ), 2 );
	const root = oldExport();
	fs.rmSync( path.join( root, 'MANIFEST.md' ) );
	assert.equal( main( [ root, '--project', 'P', '--entry', 'Home.dc.html', '--generated', '2026-10-11' ], () => {} ), 1 );
} );
