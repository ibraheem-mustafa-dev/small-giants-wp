// A settled `equal` row says which baseline made the draft's value equal (lib/fill-resolve-state.mjs::baselineSourceFn,
// equalBaseline): the block's own paint, the theme, the node's own element, the parent, a flex default, the fixture's unstyled
// value, the calibrated default (with the context calibration measured it in) or the page gutter. Before this the row
// carried one fixed sentence for all of them, so a verdict made against a default measured in another context could not be
// told from one made against the parent. The verdicts themselves are unchanged: baselineFn returns baselineSourceFn's value.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fillTree } from '../lib/fill-resolve.mjs';
import { skeletonNodes, cleanTree } from '../lib/fill-skeleton.mjs';
import { addRefs } from '../lib/tree.mjs';
import { openDb } from '../lib/db.mjs';
import { baselineFn, baselineSourceFn, equalBaseline, BASELINE_SOURCES } from '../lib/fill-resolve-state.mjs';

const db = openDb();
const FIVE = [ 375, 768, 1024, 1440, 1920 ];
const THREE = [ 375, 768, 1440 ];
const INNER = '.sgs-container__inner';
const PAINT = { _parentDisplay: 'block', display: 'block', 'flex-wrap': 'nowrap', 'flex-direction': 'row', color: 'rgb(20, 20, 20)', 'font-size': '16px', 'line-height': '24px', opacity: '1' };
const calFor = ( paint = PAINT ) => ( {
	block: 'sgs/container',
	elements: { '': Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) ), [ INNER ]: Object.fromEntries( THREE.map( ( w ) => [ w, { ...paint } ] ) ) },
	settings: {
		flexWrap: { slot: INNER, slots: [ INNER ], property: 'flex-wrap', state: null, reachedAt: THREE, effects: [] },
		flexDirection: { slot: INNER, slots: [ INNER ], property: 'flex-direction', state: null, reachedAt: THREE, effects: [] },
	},
	discovered: {},
} );
const stub = ( page = { own: () => false, value: () => undefined } ) => ( { page: () => page, flat: [ { attributes: {} } ], nodes: [ { index: 0, parent: null, name: 'sgs/container' } ], db, fixtures: null } );

test( 'baselineSourceFn names the source of each answer', () => {
	const st = stub();
	const rec = st.nodes[ 0 ];
	assert.deepEqual( baselineSourceFn( st, rec, calFor(), 'color' )( '', 1440 ), { value: 'rgb(20, 20, 20)', source: 'calibrated-default' } );
	assert.deepEqual( baselineSourceFn( st, rec, calFor(), 'opacity' )( '', 1440 ), { value: '1', source: 'calibrated-default' } );
	assert.deepEqual( baselineSourceFn( st, rec, calFor(), 'flex-wrap' )( '', 1440 ), { value: 'wrap', source: 'flex-default' } );
	const themed = stub( { own: ( p ) => 'color' === p, value: () => 'rgb(1, 2, 3)' } );
	assert.deepEqual( baselineSourceFn( themed, themed.nodes[ 0 ], calFor(), 'color' )( '', 1440 ), { value: 'rgb(1, 2, 3)', source: 'theme' } );
	// The theme also answers an inherited property nothing nearer holds, after the parent and before the calibrated default.
	const fallback = stub( { own: () => false, value: ( p ) => ( 'color' === p ? 'rgb(9, 9, 9)' : undefined ) } );
	assert.deepEqual( baselineSourceFn( fallback, fallback.nodes[ 0 ], calFor(), 'color' )( '', 1440 ), { value: 'rgb(9, 9, 9)', source: 'theme' } );
	// Nothing holds the property: no value and no source.
	assert.deepEqual( baselineSourceFn( st, rec, calFor(), 'text-indent' )( '', 1440 ), { value: undefined, source: null } );
	assert.ok( [ 'calibrated-default', 'flex-default', 'theme' ].every( ( s ) => BASELINE_SOURCES.includes( s ) ) );
} );

test( 'baselineFn is baselineSourceFn\'s value for every property, slot and width (the verdicts do not move)', () => {
	const st = stub();
	const rec = st.nodes[ 0 ];
	for ( const cal of [ calFor(), calFor( { ...PAINT, display: 'flex' } ), { elements: {}, settings: {} } ] ) {
		for ( const prop of [ 'color', 'font-size', 'line-height', 'display', 'flex-wrap', 'flex-direction', 'opacity', 'text-indent', 'padding-left' ] ) {
			// A part's inherited property is read from the node's own element, which needs a run's reads: the runs below cover it.
			for ( const slot of [ 'color', 'font-size', 'line-height' ].includes( prop ) ? [ '' ] : [ '', INNER ] ) {
				for ( const w of THREE ) {
					assert.equal( baselineFn( st, rec, cal, prop, () => 16 )( slot, w ), baselineSourceFn( st, rec, cal, prop, () => 16 )( slot, w ).value, `${ prop } ${ slot } ${ w }` );
				}
			}
		}
	}
} );

test( 'equalBaseline gives one name where every width agrees, a map where they differ, and the gutter where it was substituted', () => {
	const sourceAt = ( slot, w ) => ( 375 === w ? { value: '0px', source: 'calibrated-default' } : { value: '24px', source: 'parent' } );
	assert.equal( equalBaseline( () => ( { value: 'a', source: 'parent' } ), () => 'a', '', THREE ), 'parent' );
	assert.deepEqual( equalBaseline( sourceAt, ( slot, w ) => sourceAt( slot, w ).value, '', THREE ), { 375: 'calibrated-default', 768: 'parent', 1440: 'parent' } );
	assert.deepEqual( equalBaseline( sourceAt, ( slot, w ) => ( 375 === w ? '20px' : sourceAt( slot, w ).value ), '', THREE ), { 375: 'page-gutter', 768: 'parent', 1440: 'parent' } );
	assert.equal( equalBaseline( () => ( { value: undefined, source: null } ), () => undefined, '', THREE ), 'none' );
	assert.equal( equalBaseline( () => ( { value: 'a', source: 'theme' } ), () => 'a', '', [] ), null, 'no width, no name' );
} );

function run( styles, { child = null, cal = calFor() } = {} ) {
	const skeleton = [ { name: 'sgs/container', draftRef: '.a', attributes: {}, ...( child ? { innerBlocks: [ { name: 'sgs/container', draftRef: '.b', attributes: {} } ] } : {} ) } ];
	const tree = cleanTree( skeleton );
	addRefs( tree, 'fx' );
	const read = ( st ) => ( { styles: { ...PAINT, ...st }, layoutDisplay: 'block', pseudo: {}, rect: { x: 0, y: 0, w: 300, h: 40 }, inFlow: true, words: 'A', href: null } );
	const widths = Object.fromEntries( FIVE.map( ( w ) => [ w, { '0:': read( styles ), ...( child ? { '1:': read( child ) } : {} ) } ] ) );
	return fillTree( { tree, nodes: skeletonNodes( skeleton ), reads: { widths, declared: {}, sweep: {}, origin: 'http://127.0.0.1:1' }, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calFor: () => cal, ledger: [], ledgerStates: [], origin: 'http://127.0.0.1:1' } );
}
const equalRow = ( out, node, property ) => out.settled.find( ( r ) => 'equal' === r.reason && r.property === property && r.node.endsWith( node ) );

test( 'MUST FAIL without the record: an equal row against the calibrated default names it and the context it was measured in', () => {
	const out = run( {} );
	const row = equalRow( out, '-0', 'opacity' );
	assert.ok( row, 'the draft\'s opacity equals the default paint and is settled equal' );
	assert.equal( row.baseline, 'calibrated-default' );
	assert.deepEqual( row.measured, { parentDisplay: 'block' } );
	assert.match( row.detail, /already shows this value/, 'the sentence stays' );
} );

test( 'an equal row a child settles against its parent names the parent, and carries no measured context (negative control)', () => {
	// The parent shows a line height of its own; the child shows the same one, which differs from the calibrated default.
	const out = run( { 'font-size': '20px', 'line-height': '30px' }, { child: { 'font-size': '20px', 'line-height': '30px' } } );
	const row = equalRow( out, '-1', 'line-height' );
	assert.ok( row, 'the child\'s line height equals what it inherits' );
	assert.equal( row.baseline, 'parent' );
	assert.equal( row.measured, undefined );
} );

test( 'every equal row carries a baseline from the named sources', () => {
	const out = run( { 'font-size': '20px', 'line-height': '30px' }, { child: { 'font-size': '20px', 'line-height': '30px' } } );
	const rows = out.settled.filter( ( r ) => 'equal' === r.reason );
	assert.ok( rows.length >= 4 );
	for ( const r of rows ) {
		const names = 'string' === typeof r.baseline ? [ r.baseline ] : Object.values( r.baseline ?? {} );
		assert.ok( names.length && names.every( ( n ) => [ ...BASELINE_SOURCES, 'equivalent', 'none' ].includes( n ) ), `${ r.property }: ${ JSON.stringify( r.baseline ) }` );
	}
} );
