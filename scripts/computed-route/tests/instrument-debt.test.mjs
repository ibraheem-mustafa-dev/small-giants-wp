// Proves FR-48-67 (lib/instrument-debt.mjs, lib/census-gap-class.mjs): every I-class row is written grouped by owner with its
// block, attribute and evidence; a row with no evidence is refused; the known items appear only when their inputs say so; the
// census gives each row its FR-48-65 class.
import test from 'node:test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { debtRow, debtRows, knownRows, unroutedKnown, staleSlotMaps, writeDebt } from '../lib/instrument-debt.mjs';
import { classifyRows, classCounts, baseClass } from '../lib/census-gap-class.mjs';

const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'debt-' ) );
const chainRow = ( over = {} ) => ( { key: 'k1', class: 'I-unrouted', gate: 'G3', block: 'sgs/container', attribute: 'maxWidth', property: 'max-width', evidence: 'sgs/container maxWidth fits max-width but carries no css_property', ...over } );

test( 'MUST FAIL: a debt row needs an I-class and gate evidence; structured evidence passes through unchanged', () => {
	assert.throws( () => debtRow( chainRow( { evidence: '' } ), { surface: 's' } ), /no gate evidence/ );
	assert.throws( () => debtRow( chainRow( { evidence: null } ), { surface: 's' } ), /no gate evidence/ );
	assert.throws( () => debtRow( chainRow( { evidence: {} } ), { surface: 's' } ), /no gate evidence/ );
	assert.throws( () => debtRow( chainRow( { class: 'F-setting' } ), { surface: 's' } ), /not an I-class row/ );
	const shaped = { file: 'a.json', key: 'x' };
	assert.equal( debtRow( chainRow( { evidence: shaped } ), { surface: 's' } ).evidence, shaped );
	assert.deepEqual( debtRows( [ chainRow(), chainRow( { key: 'k2', class: 'W-route' } ) ], { surface: 's' } ).map( ( r ) => r.id ), [ 's:k1' ] );
} );

test( 'MUST FAIL: writeDebt groups by owner, refuses a bare or duplicate row, replaces its own surface and keeps another', () => {
	const file = path.join( tmp(), 'qa', 'instrument-debt.json' );
	const a = debtRow( chainRow(), { surface: 's1' } );
	const b = debtRow( chainRow( { key: 'k2', class: 'I-calibration', gate: 'G4', attribute: 'x' } ), { surface: 's1' } );
	const w = writeDebt( { file, rows: [ a, b ], surface: 's1', publishedOn: '2026-10-23' } );
	assert.deepEqual( w.byOwner, { 'calibration (§3.2)': 1, 'sgs-update-v2.py': 1 } );
	const onDisk = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	assert.deepEqual( onDisk.groups.map( ( g ) => [ g.owner, g.rows[ 0 ].block, g.rows[ 0 ].attribute ] ), [ [ 'calibration (§3.2)', 'sgs/container', 'x' ], [ 'sgs-update-v2.py', 'sgs/container', 'maxWidth' ] ] );
	assert.throws( () => writeDebt( { file, rows: [ { ...a, evidence: '' } ], surface: 's1', publishedOn: 'd' } ), /no gate evidence/ );
	assert.throws( () => writeDebt( { file, rows: [ a, a ], surface: 's1', publishedOn: 'd' } ), /same id/ );
	writeDebt( { file, rows: [ debtRow( chainRow( { key: 'k3' } ), { surface: 's2' } ) ], surface: 's2', publishedOn: 'd' } );
	const ids = JSON.parse( fs.readFileSync( file, 'utf8' ) ).groups.flatMap( ( g ) => g.rows.map( ( r ) => r.id ) ).sort();
	assert.deepEqual( ids, [ 's1:k1', 's1:k2', 's2:k3' ] );
	writeDebt( { file, rows: [], surface: 's1', publishedOn: 'd' } );
	assert.deepEqual( JSON.parse( fs.readFileSync( file, 'utf8' ) ).groups.flatMap( ( g ) => g.rows.map( ( r ) => r.id ) ), [ 's2:k3' ] );
} );

const db = ( css ) => {
	const d = new DatabaseSync( ':memory:' );
	d.exec( 'CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT )' );
	d.prepare( 'INSERT INTO block_attributes VALUES ( ?, ?, ?, ?, ?, ? )' ).run( 'sgs/choice-flow', 'skipAddsToBag', css, null, 'boolean-visibility', 'sgs' );
	return d;
};

test( 'MUST FAIL: the known NULL css_property item appears from the DB; a routed or discovered one does not', () => {
	const rows = unroutedKnown( { db: db( null ) } );
	assert.deepEqual( rows.map( ( r ) => [ r.class, r.block, r.attribute ] ), [ [ 'I-unrouted', 'sgs/choice-flow', 'skipAddsToBag' ] ] );
	assert.ok( rows[ 0 ].evidence.file && rows[ 0 ].evidence.key );
	assert.equal( unroutedKnown( { db: db( 'display' ) } ).length, 0 );
	assert.equal( unroutedKnown( { db: db( null ), isDiscovered: ( r ) => 'skipAddsToBag' === r.attr_name } ).length, 0 );
} );

test( 'MUST FAIL: a slot map keyed to another build or read key is I-stale; a missing input is reported, never read as current', () => {
	const dir = tmp();
	const put = ( name, o ) => fs.writeFileSync( path.join( dir, name ), JSON.stringify( o ) );
	put( 'media.json', { block: 'sgs/media', slotKey: 'old', readKey: 'rk' } );
	put( 'text.json', { block: 'sgs/text', slotKey: 'h-text', readKey: 'rk' } );
	put( 'hero.json', { block: 'sgs/hero', slotKey: 'h-hero', readKey: 'older' } );
	put( 'ghost.json', { block: 'sgs/ghost', slotKey: 'x', readKey: 'rk' } );
	put( 'media.paint.json', { block: 'sgs/media', slotKey: 'ignored' } );
	const r = staleSlotMaps( { cacheDir: dir, readKey: 'rk', localHash: ( s ) => ( { media: 'h-media', text: 'h-text', hero: 'h-hero' }[ s ] ?? null ) } );
	assert.deepEqual( r.rows.map( ( x ) => x.block ).sort(), [ 'sgs/hero', 'sgs/media' ] );
	assert.match( r.rows.find( ( x ) => 'sgs/media' === x.block ).evidence.key, /slotKey old is not the local build hash h-media/ );
	assert.match( r.rows.find( ( x ) => 'sgs/hero' === x.block ).evidence.key, /readKey older is not the current rk/ );
	assert.deepEqual( r.missing, [ 'sgs/ghost: no local build to hash' ] );
	assert.match( staleSlotMaps( { cacheDir: path.join( dir, 'nope' ), readKey: 'rk', localHash: () => null } ).missing[ 0 ], /does not exist/ );
} );

const rowsDb = () => {
	const d = new DatabaseSync( ':memory:' );
	d.exec( `CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT );
		CREATE TABLE roles ( role_name TEXT, classification TEXT );
		CREATE TABLE blocks ( slug TEXT, parent_block TEXT );
		INSERT INTO roles VALUES ( 'spacing-token', 'styling-behaviour' );
		INSERT INTO blocks VALUES ( 'sgs/container', NULL );
		INSERT INTO block_attributes VALUES ( 'sgs/container', 'maxWidth', NULL, NULL, 'spacing-token', 'sgs' );` );
	return d;
};
const census = ( over = {} ) => ( { client: 'c', surface: 's', slug: 'sgs/container', kind: 'style', key: 'max-width', state: 'default', fillClass: null, fillCandidate: false, ...over } );
const fresh = () => ( { pass: true, class: null, evidence: 'fresh' } );

test( 'MUST FAIL: a census row on a NULL-routed fitting setting is I-unrouted, never F or unassessed; a held row and an unknown block are not', () => {
	const d = rowsDb();
	const calFor = () => ( {} );
	const out = classifyRows( [ census(), census( { fillClass: 'F-setting', fillCandidate: true } ), census( { fillClass: 'held' } ), census( { slug: 'sgs/has-hover' } ), census( { key: 'walker:x' } ), census( { fillClass: 'W-walker' } ) ], { db: d, calFor, freshness: fresh } );
	assert.deepEqual( out.map( ( r ) => r.gapClass ), [ 'I-unrouted', 'I-unrouted', 'held', 'unassessed', 'unassessed', 'W-walker' ] );
	assert.equal( out[ 0 ].gapAttribute, 'maxWidth' );
	const discovered = classifyRows( [ census( { fillClass: 'F-setting', fillCandidate: true } ) ], { db: d, calFor: () => ( { discovered: { maxWidth: { 'max-width': {} } } } ), freshness: fresh } );
	assert.deepEqual( [ discovered[ 0 ].gapClass, discovered[ 0 ].gapCandidate ], [ 'F-setting', true ] );
	const stale = classifyRows( [ census( { fillClass: 'W-walker' } ) ], { db: d, calFor, freshness: () => ( { pass: false, class: 'I-stale', evidence: 'old' } ) } );
	assert.equal( stale[ 0 ].gapClass, 'I-stale' );
	const counts = classCounts( out );
	assert.deepEqual( [ counts.counts[ 'I-unrouted' ], counts.instrument.length, counts.instrument[ 0 ].attribute ], [ 2, 2, 'maxWidth' ] );
	assert.throws( () => baseClass( census( { fillClass: 'bogus' } ) ), /not one of FR-48-65/ );
} );

test( 'MUST FAIL: known-item rows are keyed to the surface that found them: replaced on that surface\'s next write, kept across another surface\'s', () => {
	const file = path.join( tmp(), 'instrument-debt.json' );
	const stale = ( block ) => ( { key: `${ block }:slot-map`, class: 'I-stale', gate: 'G0', block, attribute: null, property: null, evidence: { file: 'cache/x.json', key: 'slotKey' } } );
	const ids = () => JSON.parse( fs.readFileSync( file, 'utf8' ) ).groups.flatMap( ( g ) => g.rows.map( ( r ) => r.id ) ).sort();
	writeDebt( { file, rows: knownRows( { rows: [ stale( 'sgs/a' ), stale( 'sgs/b' ) ], inTree: new Set( [ 'sgs/a', 'sgs/b' ] ), surface: 's1' } ), surface: 's1', publishedOn: 'd' } );
	writeDebt( { file, rows: knownRows( { rows: [ stale( 'sgs/a' ), stale( 'sgs/b' ) ], inTree: new Set( [ 'sgs/c' ] ), surface: 's2' } ), surface: 's2', publishedOn: 'd' } );
	assert.deepEqual( ids(), [ 's1:known:sgs/a:slot-map', 's1:known:sgs/b:slot-map' ] );
	writeDebt( { file, rows: knownRows( { rows: [ stale( 'sgs/a' ) ], inTree: new Set( [ 'sgs/a', 'sgs/b' ] ), surface: 's1' } ), surface: 's1', publishedOn: 'd' } );
	assert.deepEqual( ids(), [ 's1:known:sgs/a:slot-map' ] );
	assert.equal( JSON.parse( fs.readFileSync( file, 'utf8' ) ).groups[ 0 ].rows[ 0 ].known, true );
	assert.throws( () => debtRow( stale( 'sgs/a' ), { surface: null } ), /names no surface/ );
} );

test( 'MUST FAIL: the known NULL css_property items and the stale slot maps are filtered by the surface\'s tree alike', () => {
	const unrouted = unroutedKnown( { db: db( null ) } );
	assert.equal( unrouted.length, 1 );
	assert.deepEqual( knownRows( { rows: unrouted, inTree: new Set( [ 'sgs/container' ] ), surface: 's1' } ), [] );
	assert.deepEqual( knownRows( { rows: unrouted, inTree: new Set( [ 'sgs/choice-flow' ] ), surface: 's1' } ).map( ( r ) => r.id ), [ 's1:known:sgs/choice-flow:skipAddsToBag' ] );
	// the command passes both kinds, unfiltered, through knownRows for its own surface
	const src = fs.readFileSync( new URL( '../gate-chain.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /knownRows\( \{ rows: \[ \.\.\.unroutedKnown\( .* \), \.\.\.stale\.rows \], inTree, surface: report\.surface \} \)/ );
} );

test( 'negative control: a routed fitting setting on the resting state keeps an F candidate; a stale unknown block or a non-property key is not probed', () => {
	const d = rowsDb();
	d.exec( "DELETE FROM block_attributes; INSERT INTO block_attributes VALUES ( 'sgs/container', 'maxWidth', 'max-width', NULL, 'spacing-token', 'sgs' )" );
	const stale = () => ( { pass: false, class: 'I-stale', evidence: 'old' } );
	const f = { fillClass: 'F-setting', fillCandidate: true };
	assert.equal( classifyRows( [ census( f ) ], { db: d, calFor: () => ( {} ), freshness: fresh } )[ 0 ].gapClass, 'F-setting' );
	const out = classifyRows( [ census( { slug: 'sgs/has-hover' } ), census( { key: 'walker:x' } ) ], { db: d, calFor: () => ( {} ), freshness: stale } );
	assert.deepEqual( out.map( ( r ) => r.gapClass ), [ 'unassessed', 'unassessed' ] );
} );
