// The mechanism census (census-all.mjs, lib/census-mechanism.mjs): rows group by mechanism signature across surfaces and
// clients, a nested pair's repeat of a row counts once, and a row no signature covers fails the check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { blockLookup, walkerItems, surfaceRows, groupRows, propertyFamily, tierPattern, blockFamily, signatureOf } from '../lib/census-mechanism.mjs';
import { censusAll } from '../census-all.mjs';

const ROOT = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const FIXTURE = path.join( ROOT, 'tests', 'fixtures', 'census-all', 'root' );

const BLOCKS = { 'sgs/box': { slug: 'sgs/box', parent_block: null }, 'sgs/box-row': { slug: 'sgs/box-row', parent_block: 'sgs/box' }, 'sgs/pill': { slug: 'sgs/pill', parent_block: null } };
const lookup = ( slug ) => BLOCKS[ slug ] ?? null;

// A walker report from rows: [ state, width, pair, diff ].
const report = ( rows ) => {
	const runs = new Map();
	for ( const [ state, width, pair, d ] of rows ) {
		const key = `${ state }@${ width }`;
		runs.has( key ) || runs.set( key, { state, width, pairs: {} } );
		( runs.get( key ).pairs[ pair ] ??= { diffs: [] } ).diffs.push( d );
	}
	return { runs: [ ...runs.values() ] };
};
const style = ( ref, key, draft, live, extra = {} ) => ( { kind: 'style', key, draft, live, ref, path: '', block: 'sgs-box', ...extra } );
const fillRun = ( unmapped = [], extra = {} ) => ( { unmapped, held: [], writes: [], confirm: [], tree: [], ...extra } );
const unmapped = ( node, property, block = 'sgs/pill', reason = `no-setting: ${ block } has no setting for ${ property }` ) => ( { property, value: '1px', node, reason, block, slot: '' } );
const census = ( client, surface, rep, run ) => surfaceRows( { client, surface, report: rep, run, lookup } ).rows;

test( 'the real header data: every row has a signature and the groups name the known mechanisms', () => {
	const db = openDb();
	const result = censusAll( { root: FIXTURE, clients: [ 'alpha' ], db } );
	assert.equal( result.unclassified.length, 0 );
	const rows = result.groups.reduce( ( n, g ) => n + g.total, 0 );
	assert.equal( rows, 330 );
	const has = ( parts ) => result.groups.some( ( g ) => Object.entries( parts ).every( ( [ k, v ] ) => g.parts[ k ] === v ) );
	// A transform spelled as separate longhands on the live page and as a matrix in the draft is one property family.
	assert.ok( has( { block: 'sgs/icon', property: 'transform', state: 'hover', side: 'walker-only' } ) );
	// A paint on an inner part reads as a width and height difference of the icon at two widths only.
	assert.ok( has( { block: 'sgs/icon', property: 'box:w', tier: '768+1440' } ) );
	// Rows with no element are the surface's own.
	assert.ok( has( { block: '(surface)', property: 'presence:element' } ) && has( { block: '(surface)', property: 'link:missing' } ) );
	// A setting the framework lacks, and an inherited hold, keep their Fill reason class.
	assert.ok( has( { block: 'sgs/site-header', property: 'z-index', side: 'fill-unwritten', reason: 'no-setting' } ) );
	assert.ok( has( { block: 'sgs/site-header', property: 'font-size', side: 'fill-held', reason: 'held-inherited' } ) );
	assert.ok( has( { side: 'both' } ) );
} );

test( 'MUST FAIL: a row with no signature is unclassified, whichever part is missing', () => {
	const unknownBlock = census( 'a', 's', null, fillRun( [ unmapped( 'cr-ref-s-1', 'color', 'sgs/ghost' ) ] ) );
	assert.equal( groupRows( unknownBlock ).unclassified.length, 1 );
	const unknownReason = census( 'a', 's', null, fillRun( [ unmapped( 'cr-ref-s-1', 'color', 'sgs/pill', 'a reason nobody has named' ) ] ) );
	assert.equal( groupRows( unknownReason ).unclassified.length, 1 );
	const joined = census( 'a', 's', report( [ [ 'x', 375, 'p', style( 'cr-ref-s-1', 'color', 'a', 'b' ) ] ] ), fillRun( [ unmapped( 'cr-ref-s-1', 'color', 'sgs/pill', 'a reason nobody has named' ) ] ) );
	assert.equal( groupRows( joined ).unclassified.length, 1, 'a joined walker row too' );
	const noKey = census( 'a', 's', report( [ [ 'x', 375, '(auto)', { kind: 'auto', key: '', draft: 'a', live: 'b' } ] ] ), null );
	assert.equal( groupRows( noKey ).unclassified.length, 1 );
	const named = census( 'a', 's', null, fillRun( [ unmapped( 'cr-ref-s-1', 'color' ) ] ) );
	assert.equal( groupRows( named ).unclassified.length, 0, 'control: a named block and reason is classified' );
} );

test( 'MUST FAIL: the check exits 1 on a client folder holding a row with no signature, 0 without it', () => {
	const make = ( reason ) => {
		const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'census-all-' ) );
		const run = path.join( dir, 'sites', 'c1', 'build', 'qa', 'fill', 's', '2026-01-01T00-00-00' );
		fs.mkdirSync( run, { recursive: true } );
		fs.writeFileSync( path.join( run, 'unmapped.json' ), JSON.stringify( [ unmapped( 'cr-ref-s-1', 'color', 'sgs/button', reason ) ] ) );
		return dir;
	};
	const cli = ( dir ) => spawnSync( process.execPath, [ path.join( ROOT, 'census-all.mjs' ), '--root', dir, '--check' ], { encoding: 'utf8' } ).status;
	assert.equal( cli( make( 'a reason nobody has named' ) ), 1 );
	assert.equal( cli( make( 'no-setting: sgs/button has no setting for color' ) ), 0 );
} );

test( 'MUST FAIL: a row a nested pair repeats counts once, and a differing value does not merge', () => {
	const row = style( 'cr-ref-s-1', 'font-size', '17px', '15px' );
	const nested = report( [ [ 'x', 375, 'outer', row ], [ 'x', 375, 'inner', { ...row } ] ] );
	const w = walkerItems( nested );
	assert.equal( w.items.length, 1 );
	assert.equal( w.duplicates, 1 );
	const differs = walkerItems( report( [ [ 'x', 375, 'outer', row ], [ 'x', 375, 'inner', { ...row, live: '14px' } ] ] ) );
	assert.equal( differs.duplicates, 0, 'control: another live value is not a repeat' );
	assert.equal( differs.items[ 0 ].cells.length, 2 );
	const otherElement = walkerItems( report( [ [ 'x', 375, 'outer', row ], [ 'x', 375, 'inner', { ...row, path: '.a > .b' } ] ] ) );
	assert.equal( otherElement.items.length, 2, 'control: a descendant of the same ref is another element' );
	const total = groupRows( census( 'a', 's', nested, null ) ).groups.reduce( ( n, g ) => n + g.total, 0 );
	assert.equal( total, 1 );
} );

test( 'MUST FAIL: two clients\' identical-mechanism rows land in one group, with a count each', () => {
	const rep = report( [ [ 'x', 375, 'p', style( 'cr-ref-s-1', 'font-size', '17px', '15px' ) ] ] );
	const run = fillRun( [ unmapped( 'cr-ref-s-1', 'font-size', 'sgs/pill' ) ] );
	const rows = [ ...census( 'client-a', 'header', rep, run ), ...census( 'client-b', 'footer', rep, run ) ];
	const { groups } = groupRows( rows );
	assert.equal( groups.length, 1 );
	assert.deepEqual( groups[ 0 ].byClient, { 'client-a': 1, 'client-b': 1 } );
	assert.equal( groups[ 0 ].parts.side, 'both' );
	const other = census( 'client-b', 'footer', report( [ [ 'x', 375, 'p', style( 'cr-ref-s-1', 'font-weight', '600', '700' ) ] ] ), null );
	assert.equal( groupRows( [ ...rows, ...other ] ).groups.length, 2, 'control: a different property is a different group' );
} );

test( 'run states that read the same collapse, and a row in one state only is marked some', () => {
	const row = style( 'cr-ref-s-1', 'color', 'a', 'b' );
	const both = report( [ [ 'top', 375, 'p', row ], [ 'scrolled', 375, 'p', { ...row } ], [ 'top', 375, 'q', { kind: 'motion', key: 'transition', draft: 'x', live: 'y' } ] ] );
	const w = walkerItems( both );
	assert.equal( w.items.filter( ( i ) => 'color' === i.key )[ 0 ].runStates.length, 2 );
	const rows = census( 'a', 's', both, null );
	assert.equal( rows.find( ( r ) => 'color' === r.key ).runStates, 'all' );
	assert.equal( rows.find( ( r ) => 'transition' === r.key ).runStates, 'some' );
} );

test( 'sides: a row both sources hold is both, a walker-only row stays walker-only, a Fill-only row keeps its origin', () => {
	const rep = report( [ [ 'x', 375, 'p', style( 'cr-ref-s-1', 'color', 'a', 'b' ) ], [ 'x', 375, 'p', style( 'cr-ref-s-2', 'gap', '1px', '2px' ) ] ] );
	const run = fillRun( [ unmapped( 'cr-ref-s-1', 'color' ), unmapped( 'cr-ref-s-3', 'z-index' ) ], { held: [ { property: 'display', value: 'flex', node: 'cr-ref-s-3', block: 'sgs/pill', slot: '', state: null, reason: 'default' } ], tree: [ { name: 'sgs/box-row', attributes: { className: 'cr-ref-s-2' }, innerBlocks: [] } ] } );
	const bySide = Object.fromEntries( census( 'a', 's', rep, run ).map( ( r ) => [ r.key, r.side ] ) );
	assert.deepEqual( bySide, { color: 'both', gap: 'walker-only', 'z-index': 'fill-unwritten', display: 'fill-held' } );
	const gap = census( 'a', 's', rep, run ).find( ( r ) => 'gap' === r.key );
	assert.equal( gap.block, 'sgs/box', 'a block with a parent in the framework DB is its parent\'s family; the tree names the block' );
} );

test( 'a walker row for a property Fill wrote carries the written reason', () => {
	const rep = report( [ [ 'x', 375, 'p', style( 'cr-ref-s-1', 'color', 'a', 'b' ) ] ] );
	const row = census( 'a', 's', rep, fillRun( [], { writes: [ { node: 'cr-ref-s-1', slot: '', prop: 'color', widths: [ 375 ] } ], tree: [ { name: 'sgs/pill', attributes: { className: 'cr-ref-s-1' } } ] } ) )[ 0 ];
	assert.equal( row.reason, 'fill-wrote' );
} );

test( 'property families and tier patterns', () => {
	assert.equal( propertyFamily( 'style', 'padding-top' ), 'padding' );
	assert.equal( propertyFamily( 'style', 'border-top-left-radius' ), 'border-radius' );
	assert.equal( propertyFamily( 'style', 'font-size' ), 'font-size', 'a mixed shorthand\'s longhands stay apart' );
	assert.equal( propertyFamily( 'hover', 'scale' ), 'transform' );
	assert.equal( propertyFamily( 'box', 'h' ), 'box:h' );
	assert.equal( propertyFamily( 'auto', 'text-missing "0121 771"' ), 'auto:text-missing' );
	assert.equal( propertyFamily( 'style', 'motion', 'TR-009' ), 'motion-record' );
	assert.equal( propertyFamily( 'style', 'painted-ground' ), 'walker:painted-ground' );
	assert.equal( propertyFamily( 'style', '' ), null );
	assert.equal( tierPattern( [ 375, 768, 1440 ], [ 375, 768, 1440 ] ), 'all' );
	assert.equal( tierPattern( [ 1440, 768 ], [ 375, 768, 1440 ] ), '768+1440' );
	assert.equal( tierPattern( null, [ 375 ] ), 'flat' );
} );

test( 'the block family is the root of the parent chain in the framework DB', () => {
	const db = openDb();
	const real = blockLookup( db );
	assert.equal( blockFamily( 'sgs/site-header-row', real ), 'sgs/site-header' );
	assert.equal( blockFamily( 'sgs/button', real ), 'sgs/button' );
	assert.equal( blockFamily( 'sgs/not-a-block', real ), null );
} );

test( "MUST FAIL: part and effect rows group by what differs, not by the client's part label, and keep their pointer state and missing side", () => {
	const part = ( name, prop, draft, live ) => ( { kind: 'part', key: `${ name } hover:${ prop }`, part: name, draft, live } );
	const effect = ( name, st, draft, live ) => ( { kind: 'effect', key: `${ name } ${ st }`, part: name, draft, live } );
	const of = ( client, d ) => census( client, 'header', report( [ [ 'x', 1440, 'p', d ] ] ), null );
	const [ a ] = of( 'client-a', part( 'Book now', 'color', 'red', 'blue' ) );
	const [ b ] = of( 'client-b', part( 'Reserve', 'color', 'red', 'blue' ) );
	assert.equal( a.property, 'part:color' );
	assert.equal( a.state, 'hover', 'a hover row is read in the hover state' );
	assert.equal( signatureOf( a ), signatureOf( b ), 'two labels, one mechanism' );
	assert.equal( groupRows( [ a, b ] ).groups.length, 1 );
	const [ layers ] = of( 'client-a', { kind: 'part', key: 'Book now rest:layers', part: 'Book now', draft: '::before', live: 'none' } );
	assert.deepEqual( [ layers.property, layers.state ], [ 'part:rest-layers', 'default' ] );
	const [ liveLacks ] = of( 'client-a', effect( 'Book now', 'hover', 'sheen', 'none' ) );
	const [ draftLacks ] = of( 'client-a', effect( 'Book now', 'hover', 'none', 'sheen' ) );
	const [ press ] = of( 'client-b', effect( 'Reserve', 'press', 'ripple', 'none' ) );
	assert.equal( liveLacks.property, 'effect:hover:live-lacks' );
	assert.equal( draftLacks.property, 'effect:hover:draft-lacks' );
	assert.notEqual( signatureOf( liveLacks ), signatureOf( draftLacks ), 'live lacks the effect and draft lacks it are two mechanisms' );
	assert.deepEqual( [ press.property, press.state ], [ 'effect:press:live-lacks', 'active' ] );
	assert.equal( groupRows( [ liveLacks, draftLacks, press ] ).groups.length, 3 );
} );
