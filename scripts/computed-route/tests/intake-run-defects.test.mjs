// Spec 48 FR-48-34, lib/intake-run-defects.mjs::twoPassDefects with a fake test-2 run (no browser): pass B decides again
// every pass-A not-defect that holds only while the row stays unreached, so a row reached on a later route is decided there.
import test from 'node:test';
import assert from 'node:assert/strict';
import { twoPassDefects } from '../lib/intake-run-defects.mjs';

const row = ( id, n ) => ( { id, draftId: `Home:${ n }`, component: 'Home', kind: 'transition', unreached: true, detail: {} } );
const census = { rows: [ row( 'c1', 651 ), row( 'c2', 652 ) ], sources: [] };
const visits = [ 'd.html#/home', 'd.html#/shop', 'd.html#/cart', 'd.html#/about' ];

// Row c1 renders only on #/about, behind a prop no parent mounts; row c2 renders nowhere and is gated the same way.
const fake = async ( { visits: seen, only } ) => {
	const out = { rows: [], notDefects: [], gaps: [], blocked: [] };
	for ( const r of census.rows.filter( ( x ) => ! only || only.has( x.id ) ) ) {
		const reached = 'c1' === r.id && seen.some( ( v ) => v.endsWith( '#/about' ) );
		out.notDefects.push( reached
			? { draftId: r.draftId, censusId: r.id, why: 'reached-when-forced', widths: [ 375, 768, 1440 ] }
			: { draftId: r.draftId, censusId: r.id, why: 'prop-variant', props: [ 'variant' ] } );
	}
	return out;
};

test( 'MUST FAIL (FR-48-34): a row unreached on pass A\'s visits and reached on a later route is decided by pass B', async () => {
	const out = await twoPassDefects( { folder: '', entry: 'd.html', harPath: '', census, visits, widths: [ 375, 768, 1440 ], run: fake } );
	const why = Object.fromEntries( out.notDefects.map( ( n ) => [ n.censusId, n.why ] ) );
	assert.equal( why.c1, 'reached-when-forced', 'the row reached on #/about is no prop variant' );
	assert.equal( why.c2, 'prop-variant', 'the row reached nowhere keeps its verdict' );
	assert.equal( out.notDefects.length, 2, 'each row decided once' );
	assert.equal( out.passes.b.candidates, 2 );
} );
