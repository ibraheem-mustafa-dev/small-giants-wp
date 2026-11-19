// A block that draws a list takes its items' arrangement from the draft's geometry (lib/skeleton-arrangement.mjs, data/
// skeleton-decisions.json `rules.listArrangement`): a timeline whose entries the draft sets side by side in one row is the
// timeline's horizontal orientation. The Indus homepage's "Family-run since 1962." draws four year circles along a line, each with a
// title and a line of words beneath; the clone drew the block's default, a vertical zig-zag with no year circles, because nothing
// wrote the block's orientation (2026-11-19). Pure functions and a temporary folder only: no command, no site.
// Mutation list: tests/skeleton-list-arrangement.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decisionsProblems } from '../lib/skeleton-facts.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { inOneRow, listArrangement } from '../lib/skeleton-arrangement.mjs';
import { facts, N, run, row, find, REPO } from './fixtures/skeleton-widgets/build.mjs';

const RULE = JSON.parse( fs.readFileSync( path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'skeleton-decisions.json' ), 'utf8' ) ).rules.listArrangement;
const box = ( x, y, w = 150, h = 195 ) => ( { x, y, w, h } );
const el = ( b ) => ( { b } );
const boxOf = ( e ) => e.b;

test( 'the rule names a setting the timeline has and one of its values', () => {
	assert.deepEqual( RULE.blocks, [ { block: 'sgs/timeline', setting: 'orientation', value: 'horizontal' } ] );
	assert.deepEqual( decisionsProblems( facts( REPO ) ).filter( ( p ) => /listArrangement/.test( p ) ), [] );
} );

test( 'MUST FAIL: a rule naming a value the setting does not have, or a setting the block does not have, is a decisions problem', () => {
	const bad = ( blocks ) => {
		const f = facts( REPO );
		f.decisions.rules.listArrangement = { blocks };
		return decisionsProblems( f ).filter( ( p ) => /listArrangement/.test( p ) );
	};
	assert.equal( bad( [ { block: 'sgs/timeline', setting: 'orientation', value: 'sideways' } ] ).length, 1 );
	assert.equal( bad( [ { block: 'sgs/timeline', setting: 'noSuchSetting', value: 'horizontal' } ] ).length, 1 );
	assert.equal( bad( [ { block: 'sgs/timeline', setting: 'orientation', value: 'horizontal' } ] ).length, 0 );
} );

test( 'MUST FAIL: units that sit side by side in one row are in one row; stacked, wrapped, single and unboxed units are not', () => {
	assert.equal( inOneRow( [ el( box( 569, 2551 ) ), el( box( 747, 2551 ) ), el( box( 924, 2551 ) ), el( box( 1102, 2551 ) ) ], boxOf ), true );
	assert.equal( inOneRow( [ el( box( 0, 0 ) ), el( box( 0, 200 ) ), el( box( 0, 400 ) ) ], boxOf ), false, 'stacked' );
	assert.equal( inOneRow( [ el( box( 0, 0 ) ), el( box( 160, 0 ) ), el( box( 0, 200 ) ), el( box( 160, 200 ) ) ], boxOf ), false, 'a grid wrapped onto a second row' );
	assert.equal( inOneRow( [ el( box( 0, 0 ) ) ], boxOf ), false, 'one unit is no row' );
	assert.equal( inOneRow( [ el( box( 0, 0 ) ), {} ], boxOf ), false, 'a unit with no box is not placed' );
	assert.equal( inOneRow( [ el( box( 0, 0 ) ), el( box( 100, 0 ) ) ], boxOf ), false, 'overlapping boxes are not a row of separate units' );
	assert.equal( inOneRow( [ el( box( 0, 0 ) ), el( box( 160, 400 ) ) ], boxOf ), false, 'a staircase (each further right and further down) is no row' );
} );

test( 'MUST FAIL: the real Indus homepage rows: the four milestones under Root/258 are in one row, so the timeline takes horizontal', () => {
	const inv = JSON.parse( fs.readFileSync( path.join( REPO, 'sites', 'indus-foods', 'build', 'skeleton', 'home.inventory.json' ), 'utf8' ) );
	const m = inventoryModel( inv );
	const items = m.blockKids( m.byKey[ 'Root/258#0' ] );
	assert.equal( items.length, 4 );
	assert.deepEqual( listArrangement( { rule: RULE, block: 'sgs/timeline', items, box: m.box } ), { orientation: 'horizontal' } );
	assert.deepEqual( listArrangement( { rule: RULE, block: 'sgs/process-steps', items, box: m.box } ), {}, 'a block the rule does not list is left alone' );
	assert.deepEqual( listArrangement( { rule: null, block: 'sgs/timeline', items, box: m.box } ), {}, 'no rule, no write' );
	const stacked = m.blockKids( m.byKey[ 'Root/258#0' ] ).map( ( e, i ) => ( { ...e, box: { 1440: box( 0, i * 200 ) } } ) );
	assert.deepEqual( listArrangement( { rule: RULE, block: 'sgs/timeline', items: stacked, box: m.box } ), {}, 'the same four units stacked keep the default' );
} );

// ---- through the skeleton writer ----
const LOGIC = `class Component { renderVals() { return { ms: [ { year: '1962', title: 'A shop' }, { year: '1972', title: 'Formed' }, { year: '1975', title: 'Packing' }, { year: 'Now', title: 'Customers' } ] }; } }`;
const page = ( row ) => N( 'section', {}, [ N( 'div', { style: 'display:grid' }, [ N( 'div', { loop: { list: 'ms', as: 'm', copies: 4 }, row, box: [ 150, 100 ] }, [
	N( 'span', { words: ( c ) => [ '1962', '1972', '1975', 'Now' ][ c ], text: 'm.year' } ), N( 'span', { words: ( c ) => [ 'A shop', 'Formed', 'Packing', 'Customers' ][ c ], text: 'm.title' } ),
] ) ] ) ] );
const decided = ( attributes ) => ( { surfaces: { fixture: { 'Root/2#0': { block: 'sgs/timeline', ...( attributes ? { attributes } : {} ) } } } } );

test( 'MUST FAIL: the proposal writes horizontal on a client-decided timeline whose units sit in a row; stacked units keep the default; a decision\'s own value wins', () => {
	const side = run( page( true ), LOGIC, { clientDecisions: decided() } );
	assert.equal( row( side, 'Root/2#0' ).block, 'sgs/timeline' );
	assert.equal( find( side.skeleton, ( x ) => 'sgs/timeline' === x.name )[ 0 ].attributes.orientation, 'horizontal' );
	const stack = run( page( false ), LOGIC, { clientDecisions: decided() } );
	assert.equal( find( stack.skeleton, ( x ) => 'sgs/timeline' === x.name )[ 0 ].attributes.orientation, undefined );
	const own = run( page( true ), LOGIC, { clientDecisions: decided( { orientation: 'vertical' } ) } );
	assert.equal( find( own.skeleton, ( x ) => 'sgs/timeline' === x.name )[ 0 ].attributes.orientation, 'vertical' );
	const off = run( page( true ), LOGIC, { clientDecisions: decided(), off: [ 'listArrangement' ] } );
	assert.equal( find( off.skeleton, ( x ) => 'sgs/timeline' === x.name )[ 0 ].attributes.orientation, undefined );
} );
