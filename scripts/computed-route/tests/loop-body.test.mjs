// FR-48-14: the ancestor hop writes a parent setting that reaches several measured descendants when every one is a copy of one
// `sc-for` loop body and the property is static in it; a descendant outside the loop, in another loop, or with a value that
// varies across copies keeps the write on the child. Run against the real framework DB and the real hop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveViaAncestor } from '../lib/resolve.mjs';
import { loopBodyCheck, loopKeyOf, staticIn, identityFromOrigin } from '../lib/loop-body.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const PATHS = [ '.t > h3:nth-of-type(1)', '.t > h3:nth-of-type(2)', '.t > h3:nth-of-type(3)' ];
const REFS = { [ PATHS[ 0 ] ]: 'r0', [ PATHS[ 1 ] ]: 'r1', [ PATHS[ 2 ] ]: 'r2' };
const container = ( refs = REFS ) => ( { ref: 'cr-ref-p', block: 'sgs/container', path: PATHS[ 0 ], tag: 'h3', attributes: {}, measuredRefs: refs,
	calibration: { settings: { textColour: { property: 'color', slot: '', slots: [ '' ], reaches: [ '', ...PATHS ] } } } } );
const ROW = { block: 'sgs/heading', slot: '', prop: 'color', state: null, perWidth: { 1440: 'rgb(138, 130, 120)' } };
const el = ( loop, holes = [], logic = {} ) => ( { template: { membership: { scFor: loop ? [ { key: loop } ] : [] }, holes }, logic: { holes: logic } } );
const FACTS = { elements: {
	'A/10': el( 'A/9' ), 'A/11': el( 'A/9' ), 'A/12': el( null ), 'A/13': el( 'A/20' ),
	'A/14': el( 'A/9', [ { id: 'style:color#1', where: 'style:color' } ], { 'style:color#1': { 1440: { v: [ { t: 'string', v: '#fff' }, { t: 'string', v: '#000' } ] } } } ),
	'A/15': el( 'A/9', [ { id: 'style:color#1', where: 'style:color' } ], { 'style:color#1': { 1440: { v: [ { t: 'string', v: '#fff' }, { t: 'string', v: '#fff' } ] } } } ),
} };
const origin = ( ...tpls ) => Object.fromEntries( tpls.map( ( t, i ) => [ `r${ i }`, { tpl: `Root/${ t }#${ i }` } ] ) );
const hop = ( tpls, over = {} ) => resolveViaAncestor( ROW, { db, snapshot, canvas: true, ancestors: [ container() ], measuredSlots: PATHS, loopBody: loopBodyCheck( { facts: FACTS, identityOf: identityFromOrigin( origin( ...tpls ), 'A' ) } ), ...over } );

test( 'MUST FAIL WITHOUT THE LOOP CHECK: three copies of one loop body get one parent write, citing the loop', () => {
	const r = hop( [ 10, 10, 11 ] );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'textColour' ] );
	assert.equal( r.on.block, 'sgs/container' );
	assert.equal( r.cite.loop, 'A/9' );
	assert.equal( r.cite.measuredDescendants.length, 3 );
	assert.equal( hop( [ 10, 10, 15 ] ).writes?.[ 0 ].attr, 'textColour', 'a bound property that answers the same in every copy is static' );
} );

test( 'MUST FAIL WITHOUT THE REFUSALS: a descendant outside the loop, in another loop, or with a varying value keeps the write on the child', () => {
	for ( const tpls of [ [ 10, 10, 12 ], [ 12, 12, 12 ], [ 10, 10, 13 ], [ 10, 10, 14 ] ] ) {
		const r = hop( tpls );
		assert.equal( r.writes, undefined, tpls.join() );
		assert.equal( r.gap, 'canvas-settable' );
		assert.equal( r.cite.loop, undefined );
	}
	assert.equal( hop( [ 10, 10, 11 ], { loopBody: undefined } ).writes, undefined, 'with no loop check the hop writes only for one descendant, as before' );
	const unknown = hop( [ 10, 10, 11 ], { ancestors: [ container( { ...REFS, [ PATHS[ 2 ] ]: 'nope' } ) ] } );
	assert.equal( unknown.writes, undefined, 'a descendant the runtime names no element for is not in a loop' );
} );

test( 'loop membership and static properties come from the fact record', () => {
	assert.equal( loopKeyOf( FACTS, 'A/10' ), 'A/9' );
	assert.equal( loopKeyOf( FACTS, 'A/12' ), null );
	assert.equal( staticIn( FACTS, 'A/10', 'color' ), true, 'no binding: the same in every copy' );
	assert.equal( staticIn( FACTS, 'A/14', 'color' ), false );
	assert.equal( staticIn( FACTS, 'A/14', 'padding-top' ), true, 'another property is unaffected' );
	assert.equal( staticIn( FACTS, 'A/nope', 'color' ), false );
	const ancestor = { measuredRefs: { p: 'r' } };
	assert.equal( identityFromOrigin( { r: { tpl: 'Root/220#0' } }, 'Main' )( ancestor, 'p' ), 'Main/220', 'the served root is named by the entry component' );
	assert.equal( identityFromOrigin( { r: { tpl: 'Main>Card@3#1/12#4' } } )( ancestor, 'p' ), 'Card/12' );
	assert.equal( identityFromOrigin( { r: { tpl: 'x' } } )( ancestor, 'p' ), null );
	assert.equal( identityFromOrigin( {} )( ancestor, 'p' ), null );
} );
