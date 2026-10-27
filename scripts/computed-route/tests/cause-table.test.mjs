// Proves tools/cause-table.mjs on a hand-made census (tests/fixtures/cause-table/census.json: 3 clients; 14 single-class F-setting groups
// whose smallest three tie; one group split W-route 5 / held 3 across alpha 4, beta 3, gamma 1; one row with no signature).
// MUST FAIL: a class total that differs from the census's, a 13th signature in a class, a tie ordered by anything but the signature,
// a multi-class group whose per-client split is not the class share, an unquoted comma, quote or line break.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { apportion, buildTables, causeTable, csvCell, csvLine } from '../tools/cause-table.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURE = path.join( HERE, 'fixtures', 'cause-table', 'census.json' );
const census = JSON.parse( fs.readFileSync( FIXTURE, 'utf8' ) );
const classTable = JSON.parse( fs.readFileSync( path.join( HERE, '..', 'data', 'census-classes.json' ), 'utf8' ) ).classes;
const tables = buildTables( census, classTable );

test( 'every class total in the table equals the census total, and the grand total is the census row total', () => {
	for ( const r of tables.classRows ) {
		assert.equal( r.total, census.classes.counts[ r.class ] ?? 0, r.class );
		assert.equal( Object.values( r.byClient ).reduce( ( a, b ) => a + b, 0 ), r.total );
	}
	assert.equal( tables.classRows.reduce( ( n, r ) => n + r.total, 0 ), census.classes.total );
	assert.deepEqual( tables.classRows.find( ( r ) => 'unassessed' === r.class ).byClient, { alpha: 0, beta: 0, gamma: 1 } );
} );

test( 'client columns come from the census client list, in its order', () => {
	assert.deepEqual( tables.clients, [ 'alpha', 'beta', 'gamma' ] );
	const out = fs.mkdtempSync( path.join( os.tmpdir(), 'cause-table-' ) );
	causeTable( FIXTURE, out );
	const head = ( f ) => fs.readFileSync( path.join( out, f ), 'utf8' ).split( '\n' )[ 0 ];
	assert.equal( head( 'cause-classes.csv' ), 'class,meaning,owner,alpha,beta,gamma,total' );
	assert.equal( head( 'cause-mechanisms.csv' ), 'class,block,property,state,tier,reason,owner_fr,alpha,beta,gamma,total,example' );
	assert.equal( fs.readFileSync( path.join( out, 'cause-classes.csv' ), 'utf8' ).trim().split( '\n' ).length, 1 + Object.keys( classTable ).length );
} );

test( 'a class keeps its 12 largest signatures, largest first, a tie broken by the signature', () => {
	const rows = tables.mechanismRows.filter( ( r ) => 'F-setting' === r.class );
	assert.equal( rows.length, 12 );
	assert.deepEqual( rows.map( ( r ) => r.total ), [ 9, 7, 5, 5, 4, 4, 3, 3, 2, 2, 2, 1 ] );
	assert.deepEqual( rows.map( ( r ) => r.block ).slice( 2, 4 ), [ 'sgs/b03', 'sgs/b04' ] );
	assert.equal( rows[ 11 ].block, 'sgs/b12', 'the first of the three tied smallest signatures survives; b13 and b14 are cut' );
	assert.equal( tables.mechanismRows.filter( ( r ) => 'W-route' === r.class ).length, 1 );
} );

test( 'a multi-class group is split per client by class share and every margin holds', () => {
	const split = apportion( { 'W-route': 5, held: 3 }, { alpha: 4, beta: 3, gamma: 1 } );
	assert.deepEqual( split, { 'W-route': { alpha: 2, beta: 2, gamma: 1 }, held: { alpha: 2, beta: 1 } } );
	const route = tables.mechanismRows.find( ( r ) => 'W-route' === r.class );
	assert.deepEqual( route.byClient, { alpha: 2, beta: 2, gamma: 1 } );
	assert.equal( tables.mechanismRows.find( ( r ) => 'held' === r.class ).total, 3 );
} );

test( 'apportion keeps both margins for awkward shapes', () => {
	for ( const [ c, k ] of [ [ { a: 1, b: 1, c: 1 }, { x: 2, y: 1 } ], [ { a: 7, b: 5, c: 3 }, { x: 5, y: 5, z: 5 } ], [ { a: 1 }, { x: 1 } ] ] ) {
		const s = apportion( c, k );
		for ( const cls of Object.keys( c ) ) {
			assert.equal( Object.values( s[ cls ] ).reduce( ( a, b ) => a + b, 0 ), c[ cls ] );
		}
		for ( const cl of Object.keys( k ) ) {
			assert.equal( Object.keys( s ).reduce( ( n, cls ) => n + ( s[ cls ][ cl ] ?? 0 ), 0 ), k[ cl ] );
		}
	}
	assert.throws( () => apportion( { a: 2 }, { x: 1 } ) );
} );

test( 'a class the table does not name, or a client outside the list, is refused', () => {
	assert.throws( () => buildTables( { ...census, classes: { ...census.classes, counts: { zzz: 1 } } }, classTable ), /zzz/ );
	assert.throws( () => buildTables( { ...census, clients: [ 'alpha', 'beta' ] }, classTable ), /gamma/ );
} );

test( 'CSV cells quote commas, quotes and line breaks', () => {
	assert.equal( csvCell( 'plain' ), 'plain' );
	assert.equal( csvCell( 'a,b' ), '"a,b"' );
	assert.equal( csvCell( 'say "hi"' ), '"say ""hi"""' );
	assert.equal( csvCell( 'one\ntwo' ), '"one\ntwo"' );
	assert.equal( csvCell( 'one\r\ntwo' ), '"one\r\ntwo"' );
	assert.equal( csvCell( null ), '' );
	assert.equal( csvLine( [ 'a', 'b,c', 3 ] ), 'a,"b,c",3' );
	const out = fs.mkdtempSync( path.join( os.tmpdir(), 'cause-table-' ) );
	causeTable( FIXTURE, out );
	assert.ok( fs.readFileSync( path.join( out, 'cause-mechanisms.csv' ), 'utf8' ).includes( '"Spec ""32"", tokens, presets"' ) );
} );

test( 'causeTable refuses totals that do not reconcile with the census', () => {
	const bad = JSON.parse( fs.readFileSync( FIXTURE, 'utf8' ) );
	bad.classes.counts[ 'F-setting' ] += 1;
	const file = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'cause-table-' ) ), 'census.json' );
	fs.writeFileSync( file, JSON.stringify( bad ) );
	assert.throws( () => causeTable( file, path.dirname( file ) ), /do not reconcile/ );
} );
