// How many answers a choice-flow question takes (Spec 43 FR-43-27, lib/choice-flow-limit.mjs): read from the draft's logic, written as
// answersMin/answersMax on the question. Tests marked MUST FAIL fail without the reader; each carries its negative controls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { answerLimits } from '../lib/choice-flow-limit.mjs';
import { FLOW, run } from './fixtures/choice-flow-fixture.mjs';

// The FLOW draft with its first question drawing the render binding `flavs` and no price words.
const LIST = FLOW.map( ( x ) => ( 17 === x.n ? { ...x, binds: 'flavs' } : 21 === x.n ? { ...x, text: [ 'Mild', 'Spicy' ] } : x ) );
const logic = ( toggle ) => `class Root { state = { flav: [ 'a' ], how: 'later' };
	render() {
		const L = [ { id: 'a', name: 'A' }, { id: 'b', name: 'B' } ];
		${ toggle }
		return { flavs: L.map( ( o ) => ( { ...o, pick: () => togFlav( o.id ) } ) ), xs: L.map( ( m ) => ( { pick: () => this.setState( { how: m.id } ) } ) ) };
	}
}`;
const CAP_3 = logic( 'const togFlav = ( id ) => { let f = this.state.flav.slice(); if ( f.includes( id ) ) { if ( f.length > 1 ) f = f.filter( ( x ) => x !== id ); } else { f.push( id ); if ( f.length > 3 ) f.shift(); } this.setState( { flav: f } ); };' );
const WORDS_ONLY = logic( 'const togFlav = ( id ) => { this.setState( { flav: [ id ] } ); };' );
const questions = ( skeleton ) => skeleton[ 0 ].innerBlocks.flatMap( ( s ) => s.innerBlocks ).filter( ( b ) => 'sgs/choice-flow-question' === b.name ).map( ( b ) => b.attributes );
const answers = ( script ) => questions( run( LIST, { scriptOf: () => script } ).skeleton ).map( ( q ) => [ q.answersMin ?? null, q.answersMax ?? null ] );

test( 'MUST FAIL: a handler that drops a pick past three gives the question answersMax 3, and only that question', () => {
	assert.deepEqual( answers( CAP_3 ), [ [ null, 3 ], [ null, null ] ] );
} );

test( 'negative control: a handler that writes one value gives no count, and a cap in words only (no logic) writes nothing', () => {
	assert.deepEqual( answers( WORDS_ONLY ), [ [ null, null ], [ null, null ] ] );
	assert.deepEqual( answers( null ), [ [ null, null ], [ null, null ] ] );
	assert.deepEqual( answers( logic( '' ).replace( 'togFlav( o.id )', 'null' ) ), [ [ null, null ], [ null, null ] ] );
} );

test( 'the reader: a refusing guard, an add-while-below test, a removal floor above one, and a cap over twelve', () => {
	const read = ( toggle ) => answerLimits( logic( toggle ), { binding: 'flavs', handler: 'pick' } );
	assert.deepEqual( read( 'const togFlav = ( id ) => { const f = this.state.flav.slice(); if ( f.length >= 4 ) return; f.push( id ); this.setState( { flav: f } ); };' ), { answersMax: 4 } );
	assert.deepEqual( read( 'const togFlav = ( id ) => { let f = this.state.flav.slice(); if ( f.length < 2 ) f.push( id ); this.setState( { flav: f } ); };' ), { answersMax: 2 } );
	assert.deepEqual( read( 'const togFlav = ( id ) => { let f = this.state.flav.slice(); if ( f.length > 2 ) f = f.filter( ( x ) => x !== id ); else f.push( id ); if ( f.length > 5 ) f.shift(); this.setState( { flav: f } ); };' ), { answersMax: 5, answersMin: 2 } );
	assert.equal( read( 'const togFlav = ( id ) => { let f = this.state.flav.slice(); f.push( id ); if ( f.length > 40 ) f.shift(); this.setState( { flav: f } ); };' ), null, 'the block holds at most twelve' );
	assert.equal( read( 'const togFlav = ( id ) => { let n = this.state.flav.slice(); if ( n.length > 3 ) n.shift(); this.setState( { flav: [ id ] } ); };' ), null, 'a length test on a list the handler never writes is no rule' );
	assert.equal( answerLimits( CAP_3, { binding: 'xs', handler: 'pick' } ), null );
	assert.equal( answerLimits( '(((', { binding: 'flavs', handler: 'pick' } ), null );
} );
