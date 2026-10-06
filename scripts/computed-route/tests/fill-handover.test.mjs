// FR-47-4 step 5 / §3.3: the handover list names one of exactly five owners, and carries its evidence row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HANDOVER_OWNERS, HANDOVER_KINDS, handoverEntry, handoverProblems, handoverCounts } from '../lib/fill-handover.mjs';

test( 'MUST FAIL: an owner outside the five, a kind outside the four, or an entry with no evidence is refused', () => {
	const ok = { owner: 'site-info', kind: 'text', node: 'cr-ref-x-3', evidence: { key: 'text', draft: '1 High Street' }, reason: 'address lives in Site Info' };
	assert.doesNotThrow( () => handoverEntry( ok ) );
	assert.throws( () => handoverEntry( { ...ok, owner: 'marketing' } ), /not one of site-info, product-data, content-page, behaviour, woocommerce-text/ );
	assert.throws( () => handoverEntry( { ...ok, kind: 'style' } ), /kind "style"/ );
	assert.throws( () => handoverEntry( { ...ok, evidence: undefined } ), /evidence row/ );
	assert.throws( () => handoverEntry( { ...ok, owner: undefined } ), /owner "undefined"/ );
} );

test( 'the five owners are exactly the ones Solve\'s handover list uses, in the spec\'s order', () => {
	assert.deepEqual( HANDOVER_OWNERS, [ 'site-info', 'product-data', 'content-page', 'behaviour', 'woocommerce-text' ] );
	assert.deepEqual( HANDOVER_KINDS, [ 'text', 'presence', 'link', 'behaviour' ] );
} );

test( 'an entry carries owner, kind, node, block, slot, evidence and reason, and the evidence names its node and element', () => {
	const e = handoverEntry( { owner: 'woocommerce-text', kind: 'text', node: 'cr-ref-x-7', block: 'sgs/text', slot: '.sgs-text__inner', evidence: { key: 'text', draft: 'Royal Mail 48' }, reason: 'shipping titles are WooCommerce settings' } );
	assert.deepEqual( Object.keys( e ), [ 'owner', 'kind', 'node', 'block', 'slot', 'evidence', 'reason' ] );
	assert.deepEqual( e.evidence, { key: 'text', draft: 'Royal Mail 48', kind: 'text', ref: 'cr-ref-x-7', path: '.sgs-text__inner' } );
} );

test( 'handoverProblems names a bad owner, a bad kind and a missing detail, and accepts a sound list or none', () => {
	assert.deepEqual( handoverProblems( undefined, 'n' ), [] );
	assert.deepEqual( handoverProblems( [ { owner: 'product-data', kind: 'presence', detail: 'spec values' } ], 'n' ), [] );
	const p = handoverProblems( [ { owner: 'nobody', kind: 'colour' } ], 'node 3' ).join( '\n' );
	assert.match( p, /node 3 handover owner "nobody"/ );
	assert.match( p, /handover #0 kind "colour"/ );
	assert.match( p, /handover #0 needs a detail/ );
	assert.match( handoverProblems( 'x', 'n' )[ 0 ], /must be a list/ );
} );

test( 'handoverCounts lists every owner, zero included', () => {
	const mk = ( owner ) => handoverEntry( { owner, kind: 'text', evidence: { key: 'text' }, reason: '' } );
	assert.deepEqual( handoverCounts( [ mk( 'site-info' ), mk( 'site-info' ), mk( 'behaviour' ) ] ), { 'site-info': 2, 'product-data': 0, 'content-page': 0, behaviour: 1, 'woocommerce-text': 0 } );
} );
