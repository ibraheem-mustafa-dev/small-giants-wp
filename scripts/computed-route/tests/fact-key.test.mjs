// The two key levels live in lib/fact-key.mjs and nowhere else: a template key `<dc file>/<tpl>` and an instance key
// `<chain>/<tpl>#<copy>` (the format scripts/parity/lib/collect.mjs::tplKeyOf stamps). A module that builds such a key
// with a template literal is a second place the format can drift, so the scan below fails it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseInstanceKey, instanceKey, withCopy, parseTemplateKey, templateKey, templateKeyOf, copylessKey, renameHost, renameRootHost } from '../lib/fact-key.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const LIB = path.join( ROUTE, 'lib' );

// The template literals of a source text that build a key: an interpolation naming a chain, tpl, copy or dc, followed by
// `/` or `#` and another interpolation; or `#` then an interpolation naming a copy or tpl.
const KEYWORD = '(?:chain|tpl|copy|\\bdc\\b|template_tpl_id|rootComponent|SERVED_ROOT)';
const BUILDERS = [
	new RegExp( '`[^`]*\\$\\{[^}]*' + KEYWORD + '[^}]*\\}[#/]\\$\\{[^}]*\\}[^`]*`', 'g' ),
	new RegExp( '`[^`]*#\\$\\{[^}]*(?:copy|tpl)[^}]*\\}[^`]*`', 'g' ),
];
const keyLiterals = ( source ) => [ ...new Set( BUILDERS.flatMap( ( re ) => source.match( re ) || [] ) ) ];

test( 'an instance key round-trips, including Root and nested import chains', () => {
	for ( const key of [ 'Root/14#0', 'Root>Header@12#0/34#1', 'Page>Nav@3#2>Item@7#0/9#4' ] ) {
		const p = parseInstanceKey( key );
		assert.ok( p, key );
		assert.equal( instanceKey( p ), key );
	}
	assert.deepEqual( parseInstanceKey( 'Root>Header@12#0/34#1' ), { chain: [ 'Root', 'Header@12#0' ], tpl: 34, copy: 1 } );
	for ( const bad of [ 'Root/14', 'Root>Header/3#0', '/3#0', 'Root>/3#0', null, 7 ] ) {
		assert.equal( parseInstanceKey( bad ), null, String( bad ) );
	}
} );

test( 'a template key is the host and the tpl, with no copy', () => {
	assert.equal( templateKey( { dc: 'Indus Foods Website v2', tpl: 68 } ), 'Indus Foods Website v2/68' );
	assert.deepEqual( parseTemplateKey( 'Indus Foods Website v2/68' ), { dc: 'Indus Foods Website v2', tpl: '68' } );
	assert.equal( parseTemplateKey( 'Root/14#0' ), null );
	assert.equal( templateKeyOf( 'Root>Child@12#0/34#1' ), 'Child/34' );
	assert.equal( templateKeyOf( 'Root/34#1', 'Site' ), 'Site/34' );
	assert.equal( templateKeyOf( 'Root/34#1' ), 'Root/34' );
	assert.equal( templateKeyOf( 'no key' ), null );
} );

test( 'a copy-less key drops every copy index and keeps the host stamps', () => {
	assert.equal( copylessKey( 'Root>H@1#0/5#3' ), 'Root>H@1/5' );
	assert.equal( copylessKey( 'Root/5#2' ), 'Root/5' );
	assert.equal( copylessKey( 'nope' ), null );
} );

test( 'copy and host renames touch only what they name', () => {
	assert.equal( withCopy( 'Root>H@1#0/5#3', 0 ), 'Root>H@1#0/5#0' );
	assert.equal( withCopy( 'not a key', 0 ), 'not a key' );
	assert.equal( renameRootHost( 'Site/5#1', 'Site', 'Root' ), 'Root/5#1' );
	assert.equal( renameRootHost( 'Site>H@1#0/5#1', 'Site', 'Root' ), 'Site>H@1#0/5#1' );
	assert.equal( renameHost( 'Site/5', 'Site', 'Root' ), 'Root/5' );
	assert.equal( renameHost( 'Other/5', 'Site', 'Root' ), 'Other/5' );
} );

test( 'MUST FAIL a key built from a template literal is found; the key shapes in prose and urls are not', () => {
	assert.equal( keyLiterals( 'const k = `${ chain.join( ">" ) }/${ tpl }#${ copy }`;' ).length, 1 );
	assert.equal( keyLiterals( 'const k = `${ a.element.dc }/${ id }`;' ).length, 1 );
	assert.equal( keyLiterals( 'const k = `${ base }#${ copy }`;' ).length, 1 );
	assert.equal( keyLiterals( 'const u = `${ origin }/${ file }`; const r = `${ r.rowId }#${ n }`; const h = `${ v.file }#${ v.hash }`;' ).length, 0 );
} );

test( 'no module outside lib/fact-key.mjs builds a template or instance key with a template literal', () => {
	const files = [ ...fs.readdirSync( LIB ).filter( ( f ) => f.endsWith( '.mjs' ) && 'fact-key.mjs' !== f ).map( ( f ) => path.join( LIB, f ) ), ...fs.readdirSync( ROUTE ).filter( ( f ) => f.endsWith( '.mjs' ) ).map( ( f ) => path.join( ROUTE, f ) ) ];
	const hits = files.flatMap( ( f ) => keyLiterals( fs.readFileSync( f, 'utf8' ) ).map( ( h ) => `${ path.relative( ROUTE, f ) }: ${ h }` ) );
	assert.deepEqual( hits, [] );
} );
