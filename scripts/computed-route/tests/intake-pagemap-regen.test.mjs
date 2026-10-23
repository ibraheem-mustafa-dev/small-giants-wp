// Spec 48 FR-48-30: `intake.mjs --page-map <client>` (lib/intake-pagemap-regen.mjs) rebuilds only the page map,
// offline: Bean's page-map review marks re-applied by row id, the current map's ids carried by row key, the result
// validated before it is written, and every changed row printed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyMarks, carryIds, mapChanges, runPageMap } from '../lib/intake-pagemap-regen.mjs';
import { parseArgs } from '../lib/intake-run.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = path.join( HERE, 'fixtures', 'intake-pagemap', 'shop-files' );
const rowOf = ( slug, extra = {} ) => ( { slug, title: slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...extra } );
const mark = ( rowId, m ) => ( { rowId, rowType: 'page-map', contentHash: 'h', mark: m, markedOn: '2026-10-23', carriedFrom: null } );

function repo( { current = null, review = null } = {} ) {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'pagemap-regen-' ) );
	const site = path.join( root, 'sites', 'c' );
	fs.cpSync( FIX, path.join( site, 'handoff' ), { recursive: true } );
	fs.mkdirSync( path.join( site, 'build', 'intake' ), { recursive: true } );
	current && fs.writeFileSync( path.join( site, 'build', 'page-map.json' ), JSON.stringify( current ) );
	review && fs.writeFileSync( path.join( site, 'build', 'intake', 'intake.json' ), JSON.stringify( { review } ) );
	return { root, map: path.join( site, 'build', 'page-map.json' ) };
}

test( 'MUST FAIL: --page-map is a mode of intake.mjs', () => {
	assert.deepEqual( [ parseArgs( [ '--page-map', 'c' ] ).mode, parseArgs( [ '--page-map', 'c' ] ).client ], [ 'page-map', 'c' ] );
} );

test( 'MUST FAIL: marks apply by row id (drop removes, edit sets a field, "" clears a parent); a mark naming no row is reported', () => {
	const marks = new Map( [ [ 'page:page:a', 'drop' ], [ 'page:page:b', 'edit:slug=bee' ], [ 'page:page:c', 'edit:parent=' ], [ 'page:page:gone', 'edit:title=X' ], [ 'page:page:old', 'accept' ] ] );
	const out = applyMarks( [ rowOf( 'a' ), rowOf( 'b' ), rowOf( 'c', { parent: 'b' } ) ], marks );
	assert.deepEqual( out.rows.map( ( r ) => `${ r.slug }:${ r.parent }` ), [ 'bee:null', 'c:null' ] );
	assert.deepEqual( out.unapplied, [ 'page:page:gone' ], 'an accept for a vanished row needs nothing' );
} );

test( 'MUST FAIL: ids carry by row key only; changes name every added, removed and changed row', () => {
	const rows = carryIds( [ rowOf( 'a' ), rowOf( 'b', { postType: 'sgs_form' } ) ], [ rowOf( 'a', { id: 7 } ), rowOf( 'b', { id: 8 } ) ] );
	assert.deepEqual( rows.map( ( r ) => r.id ), [ 7, null ], 'page:b is not sgs_form:b' );
	assert.deepEqual( mapChanges( [ rowOf( 'a', { id: 7 } ), rowOf( 'gone' ) ], [ rowOf( 'a', { id: 7, title: 'A' } ), rowOf( 'new' ) ] ),
		[ 'page:a: title "a" -> "A"', 'added page:new "new"', 'removed page:gone "gone"' ] );
} );

test( 'MUST FAIL: the run writes the regenerated map with marks and ids, and prints its changes', () => {
	const { root, map } = repo( { current: [ rowOf( 'shop', { postType: 'shop', template: 'archive-product', collection: 'live', id: 6 } ), rowOf( 'basket', { id: 9 } ) ],
		review: [ mark( 'page:page:contact', 'edit:title=Get in touch' ) ] } );
	const lines = [];
	assert.equal( runPageMap( { client: 'c', repo: root }, { log: ( l ) => lines.push( l ) } ), 0 );
	const rows = JSON.parse( fs.readFileSync( map, 'utf8' ) );
	assert.equal( rows.find( ( r ) => 'shop' === r.postType ).id, 6 );
	assert.equal( rows.find( ( r ) => 'contact' === r.slug ).title, 'Get in touch' );
	const said = lines.join( '\n' );
	assert.match( said, /1 review marks matched/ );
	assert.match( said, /removed page:basket/ );
	assert.match( said, /added page:cart/ );
} );

test( 'MUST FAIL: a map that does not validate is refused and nothing is written', () => {
	const { root, map } = repo( { current: [ rowOf( 'keep' ) ], review: [ mark( 'page:page:contact', 'edit:slug=Not A Slug' ) ] } );
	const lines = [];
	assert.equal( runPageMap( { client: 'c', repo: root }, { log: ( l ) => lines.push( l ) } ), 1 );
	assert.match( lines.join( '\n' ), /does not validate, nothing written/ );
	assert.deepEqual( JSON.parse( fs.readFileSync( map, 'utf8' ) ), [ rowOf( 'keep' ) ] );
} );
