// Proves FR-47-5 / R-47-8: divergences are data; unknown rules fail; stale entries fail the run; accepts migrate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { validate, match, stale, migrateAccepts, entryFromRow, RULES } from '../lib/ledger.mjs';
import { judgeDivergence } from '../../parity/lib/divergences.mjs';

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

test( 'MUST FAIL: an every-property entry covers every property of its node at every width, and no other node', () => {
	const report = { runs: [ { state: 'opening', width: 768, pairs: { map: { diffs: [ { id: 'ef56ab78', kind: 'style', key: 'font-size', draft: '11px', live: '16px', ref: 'cr-ref-contact-25' } ] } } } ] };
	const e = entryFromRow( report, 'ef56ab78', { reason: 'register 418: the real Google Map replaces the draft sketch', scope: 'contact', entries: [ entry() ], everyWidth: true, everyProperty: true } );
	assert.ok( validate( [ entry(), e ] ) );
	assert.deepEqual( [ e.property, e.widths, e.expected ], [ '*', undefined, { rule: 'bean-choice' } ] );
	const mapRow = { ...row, ref: 'cr-ref-contact-25', block: 'sgs-business-map', property: 'border-top-width', width: 375 };
	assert.equal( match( [ e ], mapRow ).id, 'D-2' );
	assert.equal( judgeDivergence( [ e ], { state: 'opening', width: 1440 }, { key: 'painted-ground', ref: 'cr-ref-contact-25', live: 'none' }, 0.5 ), `D-2 (bean-choice): ${ e.reason }` );
	assert.equal( match( [ e ], { ...mapRow, ref: 'cr-ref-contact-26' } ), null );
	assert.throws( () => entryFromRow( { runs: [ { state: 'opening', width: 768, pairs: { x: { diffs: [ { id: 'aa', key: 'w' } ] } } } ] }, 'aa', { reason: 'no node here at all', scope: 'contact', entries: [], everyProperty: true } ), /names no node/ );
} );

test( 'a rule accept for every width keeps its property', () => {
	const report = { runs: [ { state: 'opening', width: 375, pairs: { phone: { diffs: [ { id: 'cd34ef56', kind: 'style', key: 'padding-top', draft: '0px', live: '7.5px', ref: 'cr-ref-contact-9' } ] } } } ] };
	const e = entryFromRow( report, 'cd34ef56', { reason: 'the 44px touch target pads the phone link', scope: 'contact', entries: [], rule: 'touch-target', everyWidth: true } );
	assert.deepEqual( [ e.property, e.widths, e.expected ], [ 'padding-top', undefined, { rule: 'touch-target' } ] );
	assert.equal( match( [ e ], { ...row, ref: 'cr-ref-contact-9', property: 'padding-top', width: 1440 } ).id, 'D-1' );
	assert.equal( match( [ e ], { ...row, ref: 'cr-ref-contact-9', property: 'padding-left', width: 1440 } ), null );
} );
