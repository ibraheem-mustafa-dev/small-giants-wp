// tools/recover-review-decisions.mjs::recoverDecisions: Bean's accepted skeleton choices are recovered from the committed
// intake history, never onto a renumbered element, never over a later Bean ruling and never over a saved decision.
import test from 'node:test';
import assert from 'node:assert/strict';
import { recoverDecisions } from '../tools/recover-review-decisions.mjs';

const row = ( key, words, extra = {} ) => ( { rowId: `skeleton:footer:${ key }`, key, tag: 'div', words, block: 'sgs/site-footer-row', confidence: 0.8, ...extra } );
const version = ( rows, mark = 'accept' ) => ( { date: '2026-10-26', intake: { skeletons: { footer: { rows } }, review: rows.map( ( r ) => ( { rowId: r.rowId, rowType: 'skeleton-block', mark, markedOn: '2026-10-26' } ) ) } } );
const now = ( rows ) => ( { skeletons: { footer: { rows } } } );

test( 'MUST FAIL: an accepted choice the rules later replaced is recovered as a decision carrying the proposal it was made on', () => {
	const out = recoverDecisions( { versions: [ version( [ row( 'F/3#0', 'Shop' ) ] ) ], current: now( [ row( 'F/3#0', 'Shop', { block: 'sgs/container' } ) ] ) } );
	assert.equal( out.length, 1 );
	assert.equal( out[ 0 ].decision.block, 'sgs/site-footer-row' );
	assert.equal( out[ 0 ].decision.signature, 'div|Shop' );
	assert.equal( out[ 0 ].decision.proposed, 'sgs/site-footer-row' );
} );

test( 'negative control: a key now on another element (a re-export renumbered it) is not recovered', () => {
	assert.equal( recoverDecisions( { versions: [ version( [ row( 'F/3#0', 'Shop' ) ] ) ], current: now( [ row( 'F/3#0', 'Help' ) ] ) } ).length, 0 );
} );

test( 'negative control: a proposal that follows a Bean ruling dated after the mark keeps the ruling', () => {
	const current = now( [ row( 'F/3#0', 'Shop', { block: 'sgs/label', reason: '1: a kicker is sgs/label (Bean, 2026-10-31)' } ) ] );
	assert.equal( recoverDecisions( { versions: [ version( [ row( 'F/3#0', 'Shop' ) ] ) ], current } ).length, 0 );
} );

test( 'negative control: a decision already saved for the key is never replaced', () => {
	const saved = { footer: { 'F/3#0': { block: 'sgs/heading', signature: 'div|Shop' } } };
	assert.equal( recoverDecisions( { versions: [ version( [ row( 'F/3#0', 'Shop' ) ] ) ], saved, current: now( [ row( 'F/3#0', 'Shop' ) ] ) } ).length, 0 );
} );
