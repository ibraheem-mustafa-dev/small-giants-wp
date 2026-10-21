// check-approved measures an approval against every copy of the template element it names, and a verdict is 'exact' only
// when a fingerprint was compared (Spec 48 FR-48-6, FR-48-7; lib/approved-check.mjs, lib/approved-identity.mjs). Each test
// is a MUST FAIL: its mutation (tools/mutate.mjs) turns it red.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkApproval } from '../lib/approved-check.mjs';
import { resolveApproval } from '../lib/approved-identity.mjs';

const row = ( key, block, extra = {} ) => ( { key, surface: 's', tag: 'span', block, ...extra } );
const rowsOf = ( list ) => Object.fromEntries( list.map( ( r ) => [ `skeleton:s:${ r.key }`, r ] ) );
const FP = { tag: 'span', cls: '', styleHash: 'h', parentTags: [ 'a' ], textHash: 't' };

test( 'MUST FAIL an approval is checked against every copy of its template element, and each copy that disagrees is listed', () => {
	const rows = rowsOf( [ row( 'Root/5#0', 'sgs/text' ), row( 'Root/5#1', 'sgs/button' ), row( 'Root/5#2', 'sgs/text' ), row( 'Root/6#0', 'sgs/button' ) ] );
	const approval = { rowId: 'skeleton:s:Root/5#0', approvedBlock: 'sgs/text' };
	const res = checkApproval( approval, { rows, fingerprints: {} } );
	assert.equal( res.match, undefined, 'one copy is a button, so the approval does not match' );
	assert.equal( res.mismatches.length, 1 );
	assert.match( res.mismatches[ 0 ], /^s:Root\/5#1 <span> want sgs\/text got sgs\/button/ );
	const agreeing = rowsOf( [ row( 'Root/5#0', 'sgs/text' ), row( 'Root/5#1', 'sgs/text' ), row( 'Root/6#0', 'sgs/button' ) ] );
	assert.equal( checkApproval( approval, { rows: agreeing, fingerprints: {} } ).match, true, 'every copy agrees; a different template element is not a copy' );
} );

test( 'MUST FAIL resolveApproval names every copy of the element, and a key that is not an instance key names only its own row', () => {
	const rows = rowsOf( [ row( 'Root/5#0', 'sgs/text' ), row( 'Root/5#1', 'sgs/text' ), row( 'Root/>5#0', 'sgs/text' ) ] );
	assert.deepEqual( resolveApproval( { rowId: 'skeleton:s:Root/5#1' }, { rows } ).copies.map( ( r ) => r.key ), [ 'Root/5#0', 'Root/5#1' ] );
	const odd = { 'plain id': row( 'x', 'sgs/text' ), 'plain id 2': row( 'y', 'sgs/text' ) };
	assert.equal( resolveApproval( { rowId: 'plain id' }, { rows: odd } ).copies.length, 1 );
} );

test( 'MUST FAIL a named row with no current fingerprint is unchecked, never exact', () => {
	const rows = rowsOf( [ row( 'Root/5#0', 'sgs/text' ) ] );
	const approval = { rowId: 'skeleton:s:Root/5#0', fingerprint: FP };
	assert.equal( resolveApproval( approval, { rows, fingerprints: {} } ).how, 'unchecked', 'the surface holds no fingerprints' );
	assert.equal( resolveApproval( approval, { rows, fingerprints: { s: { 'Root/9#0': FP } } } ).how, 'unchecked', 'the named element holds none' );
	assert.equal( resolveApproval( { rowId: 'not a skeleton row', fingerprint: FP }, { rows: { 'not a skeleton row': row( 'k', 'sgs/text' ) }, fingerprints: {} } ).how, 'unchecked', 'not a skeleton row' );
	assert.equal( resolveApproval( approval, { rows, fingerprints: { s: { 'Root/5#0': FP } } } ).how, 'exact', 'a compared fingerprint that agrees is exact' );
} );
