// lib/intake-run-collapse.mjs::collapseSkeletons: one template element shown on several surfaces is one review row only
// while every copy's rules agree. A saved choice applied to both copies (Indus's trade-application grid, kept as a
// container on the Apply page) can hide that the rules now want one surface otherwise (unwrapped in the saved form);
// those copies stay apart, so one mark never settles both (lib/intake-run-finalise.mjs::reviewDecisions writes a row's
// choice to every surface in its `alsoIn`).
import test from 'node:test';
import assert from 'node:assert/strict';
import { collapseSkeletons } from '../lib/intake-run-collapse.mjs';

const KEY = 'Root>TradeApplication@466#0/6#0';
const row = ( ruleWould ) => ( { key: KEY, block: 'sgs/container', ...( ruleWould ? { ruleWould: { label: ruleWould, reason: 'r', decision: { label: 'sgs/container' } } } : {} ) } );

test( 'MUST FAIL: copies whose rules now propose different things stay two rows', () => {
	const out = collapseSkeletons( [ { surface: 'page-apply', rows: [ row( null ) ] }, { surface: 'form-trade-application', rows: [ row( 'unwrap' ) ] } ] );
	assert.equal( out.skeletons[ 'page-apply' ].rows[ 0 ].alsoIn, undefined );
	assert.equal( out.skeletons[ 'form-trade-application' ].rows.length, 1 );
	assert.equal( out.skeletons[ 'form-trade-application' ].rows[ 0 ].ruleWould.label, 'unwrap' );
} );

test( 'negative control: copies whose rules agree are still one row', () => {
	const same = collapseSkeletons( [ { surface: 'page-apply', rows: [ row( 'unwrap' ) ] }, { surface: 'form-trade-application', rows: [ row( 'unwrap' ) ] } ] );
	assert.equal( same.skeletons[ 'page-apply' ].rows[ 0 ].copies, 2 );
	const plain = collapseSkeletons( [ { surface: 'a', rows: [ row( null ) ] }, { surface: 'b', rows: [ row( null ) ] } ] );
	assert.deepEqual( plain.skeletons.a.rows[ 0 ].alsoIn, [ { surface: 'b', keys: [ KEY ] } ] );
} );
