// Proves FR-47-5 / R-47-8: divergences are data; unknown rules fail; stale entries fail the run; accepts migrate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, match, stale, migrateAccepts, entryFromRow, RULES } from '../lib/ledger.mjs';

const entry = ( over = {} ) => ( { id: 'D-1', scope: 'footer', node: 'cr-ref-footer-3', state: '*', property: 'min-height', widths: [ 1440 ], expected: { rule: 'touch-target' }, reason: 'Phone link keeps the 44px tap target', decided: '2026-10-03 Bean', ...over } );
const row = { ref: 'cr-ref-footer-3', block: 'sgs-business-info', property: 'min-height', state: 'opening', width: 1440, draft: '21px', live: '44px' };

test( 'a valid entry passes and matches its row, by ref or by block slug', () => {
	assert.ok( validate( [ entry() ] ) );
	assert.equal( match( [ entry() ], row ).id, 'D-1' );
	assert.equal( match( [ entry( { node: 'sgs/business-info' } ) ], row ).id, 'D-1' );
	assert.equal( match( [ entry() ], { ...row, width: 375 } ), null );
	assert.ok( RULES[ 'touch-target' ] );
} );

test( 'an unknown rule or a missing date fails validation', () => {
	assert.throws( () => validate( [ entry( { expected: { rule: 'because' } } ) ] ), /unknown rule/ );
	assert.throws( () => validate( [ entry( { decided: 'yesterday' } ) ] ), /YYYY-MM-DD/ );
} );

test( 'MUST FAIL THE RUN: an entry whose live value now equals the draft is stale; so is a removed node', () => {
	const fixed = { ...row, live: '21px' };
	assert.deepEqual( stale( [ entry() ], { refs: new Set( [ 'cr-ref-footer-3' ] ), rows: [ fixed ] } ).map( ( s ) => s.id ), [ 'D-1' ] );
	assert.equal( stale( [ entry() ], { refs: new Set(), rows: [] } )[ 0 ].why, 'node cr-ref-footer-3 no longer exists' );
	assert.deepEqual( stale( [ entry() ], { refs: new Set( [ 'cr-ref-footer-3' ] ), rows: [ row ] } ), [] );
} );

test( 'plain accepts migrate one to one; when/notPainted accepts stay', () => {
	const { migrated, unmigrated } = migrateAccepts( [ { pair: 'p', key: 'min-height', width: 1440, reason: 'kept 44px tap target' }, { pair: 'p', key: 'x', when: () => true, reason: 'r' } ], { scope: 'footer', decided: '2026-10-03 migration' } );
	assert.equal( migrated.length, 1 );
	assert.equal( unmigrated.length, 1 );
	assert.ok( validate( migrated ) );
} );

test( 'accept builds an entry from a report row id', () => {
	const report = { runs: [ { state: 'opening', width: 1440, pairs: { 'link-phone': { diffs: [ { id: 'ab12cd34', kind: 'style', key: 'min-height', draft: '21px', live: '44px', ref: 'cr-ref-footer-3' } ] } } } ] };
	const e = entryFromRow( report, 'ab12cd34', { reason: 'kept the 44px tap target', scope: 'footer', entries: [ entry() ] } );
	assert.equal( e.id, 'D-2' );
	assert.deepEqual( e.expected, { value: '44px' } );
	assert.ok( validate( [ entry(), e ] ) );
} );
