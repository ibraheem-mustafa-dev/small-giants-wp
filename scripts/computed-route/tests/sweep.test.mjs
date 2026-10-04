// Proves the sweep: a surface's issue total is wholePage's distinct count, a row two surfaces share counts once on the
// site, a surface with no report is listed, and another surface's block is never counted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { issueRows, aggregate } from '../lib/sweep.mjs';
import { wholePage } from '../lib/solve-report.mjs';

const row = ( over = {} ) => ( { kind: 'style', key: 'padding-top', draft: '10px', live: '0px', ref: 'cr-ref-a-1', path: '0', block: 'sgs/hero', pair: 'hero', state: 'rest', width: 375, reason: 'no setting', ...over } );
const widths = ( over = {} ) => [ 375, 768, 1440 ].map( ( width ) => row( { width, ...over } ) );
const report = ( classes, after ) => ( { classes: { hardcode: [], missing: [], unresolved: [], derived: [], other: [], ...classes }, wholePage: { after } } );
const walk = ( rows ) => ( { runs: [ { state: 'rest', width: 375, pairs: Object.fromEntries( rows.map( ( r, i ) => [ r.pair + i, { diffs: [ r ] } ] ) ) } ] } );

test( 'three widths on one ref and property are one issue, matching wholePage', () => {
	const rows = [ ...widths(), row( { key: 'margin-top' } ), row( { kind: 'hover', key: 'color', state: 'hover' } ) ];
	const rep = report( { missing: rows, other: [ row( { kind: 'text', key: 'content' } ) ] } );
	const { rows: out, otherRows } = issueRows( rep, 'a', 'r.json' );
	assert.equal( out.length, 3 );
	assert.equal( otherRows, 1 );
	assert.deepEqual( out.find( ( x ) => 'padding-top' === x.row.property ).row.widths, [ 375, 768, 1440 ] );
	assert.equal( out.length, wholePage( walk( [] ), walk( rows ), rep.classes, 'cr-ref-a-' ).after );
	const agg = aggregate( [ { surface: 'a', reportPath: 'r.json', report: rep } ] );
	assert.equal( agg.surfaces.a.issues, 3 );
	assert.equal( agg.total, 3 );
	assert.equal( agg.rows[ 0 ].class, 'missing' );
	assert.equal( agg.rows[ 0 ].report, 'r.json' );
} );

test( 'a row two surfaces share counts once on the site and names the later surface', () => {
	const shared = row( { ref: null, path: 'x', pair: 'footer' } );
	const entries = [ 'a', 'b' ].map( ( surface ) => ( { surface, config: 'qa/parity/shared.mjs', reportPath: `${ surface }.json`, report: report( { hardcode: [ shared ] } ) } ) );
	const agg = aggregate( entries );
	assert.equal( agg.surfaces.a.issues, 1 );
	assert.equal( agg.surfaces.b.issues, 1 );
	assert.equal( agg.total, 1 );
	assert.equal( agg.byClass.hardcode, 1 );
	assert.equal( agg.rows.length, 1 );
	assert.equal( agg.rows[ 0 ].surface, 'a' );
	assert.deepEqual( agg.rows[ 0 ].alsoIn, [ 'b' ] );
} );

test( 'a surface with no report is listed as unmeasured', () => {
	const agg = aggregate( [ { surface: 'a', reportPath: 'a.json', report: report( {} ) } ], [ 'b' ], '2026-10-05' );
	assert.deepEqual( agg.unmeasured, [ 'b' ] );
	assert.equal( agg.date, '2026-10-05' );
	assert.equal( agg.total, 0 );
} );

test( 'another surface\'s block is not counted, and a row with no block is', () => {
	const rep = report( { missing: [ row( { ref: 'cr-ref-other-3' } ), row( { ref: 'cr-ref-a-12' } ), row( { ref: null, pair: 'nav', key: 'gap' } ) ] } );
	assert.equal( issueRows( rep, 'a', 'r.json' ).rows.length, 2 );
	assert.equal( aggregate( [ { surface: 'a', reportPath: 'r.json', report: rep } ] ).total, 2 );
} );

test( 'states fold to a string when one and an array when several', () => {
	const rep = report( { missing: [ row(), row( { state: 'scrolled' } ), row( { key: 'gap', state: 'open' } ) ] } );
	const byProp = Object.fromEntries( issueRows( rep, 'a', 'r.json' ).rows.map( ( x ) => [ x.row.property, x.row ] ) );
	assert.deepEqual( byProp[ 'padding-top' ].state, [ 'rest', 'scrolled' ] );
	assert.equal( byProp.gap.state, 'open' );
} );

test( 'MUST FAIL TO MERGE: block-less rows of the same pair name from two different configs are two issues', () => {
	const same = row( { ref: null, path: 'x', pair: 'heading' } );
	const entries = [ 'a', 'b' ].map( ( surface ) => ( { surface, config: `qa/parity/${ surface }.mjs`, reportPath: `${ surface }.json`, report: report( { missing: [ same ] } ) } ) );
	assert.equal( aggregate( entries ).total, 2 );
	assert.equal( aggregate( entries ).rows[ 0 ].path, 'x' );
} );
