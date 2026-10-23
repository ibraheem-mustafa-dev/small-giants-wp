// A ceiling equal to the draft's `none` by effect (lib/fill-dimensions.mjs, Spec 48 FR-48-8): a setting that stores a number
// beside a unit cannot print `max-width: none`, so the block's own ceiling stays in force; a ceiling at the element's
// unconstrained size paints the same as none, and under none the draft's rendered size is that size. The generic resolver is
// stood in for by a fixture that writes per-tier px.
import test from 'node:test';
import assert from 'node:assert/strict';
import { dimensionWrites } from '../lib/fill-dimensions.mjs';

const WIDTHS = [ 375, 768, 1440 ];
const resolver = ( { draft } ) => {
	const tiers = {};
	let carried = null;
	for ( const [ w, tier ] of [ [ 1440, 'desktop' ], [ 768, 'tablet' ], [ 375, 'mobile' ] ] ) {
		if ( undefined !== draft[ w ] && draft[ w ] !== carried ) {
			tiers[ tier ] = draft[ w ];
			carried = draft[ w ];
		}
	}
	return { status: 'written', writes: [ { attr: 'maxWidth', value: tiers, merge: 'deep' } ], included: draft };
};
// The setting holds at most 240px.
const capped = ( q ) => {
	const res = resolver( q );
	return { ...res, writes: res.writes.map( ( x ) => ( { ...x, value: Object.fromEntries( Object.entries( x.value ).map( ( [ t, v ] ) => [ t, `${ Math.min( 240, parseFloat( v ) ) }px` ] ) ) } ) ) };
};

// One node whose root box is `own` px wide per width.
function world( own ) {
	const flat = [ { name: 'sgs/logo', attributes: {}, ref: 'n0' } ];
	const nodes = [ { index: 0, name: 'sgs/logo', parent: null, node: flat[ 0 ], children: [], targets: [ { id: '0:', index: 0, slot: '', finder: 'x' } ] } ];
	const widths = Object.fromEntries( WIDTHS.map( ( w ) => [ w, { '0:': { rect: { x: 0, y: 0, w: own[ w ], h: 54 }, tag: 'div', styles: {} } } ] ) );
	return { flat, nodes, reads: { widths, declared: {} }, refOf: ( n ) => n.ref };
}
const paintOf = ( v ) => ( { elements: { '': Object.fromEntries( WIDTHS.map( ( x ) => [ x, { 'max-width': v } ] ) ) } } );
const LOGO = { 375: 238.219, 768: 247.047, 1440: 279.5 };
const row = { node: 'n0', block: 'sgs/logo', slot: '', property: 'max-width', value: 'none', reason: 'shape: the setting stores a number beside a unit, so the keyword is not printed' };
const run = ( w, paint, o = {} ) => dimensionWrites( { nodes: w.nodes, flat: w.flat, refOf: w.refOf, reads: w.reads, db: null, unmapped: [ row ], calFor: () => paint, scope: 'header', resolver, date: '2026-10-23', ...o } );

test( 'MUST FAIL: max-width none under the block\'s 100% ceiling is written as the draft\'s rendered width at each width', () => {
	const w = world( LOGO );
	const r = run( w, paintOf( '100%' ) );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( w.flat[ 0 ].attributes.maxWidth, { desktop: '279.5px', tablet: '247.05px', mobile: '238.22px' } );
	assert.match( r.writes[ 0 ].note, /paints max-width 100% \/ 100% \/ 100% where the draft renders 238px \/ 247px \/ 280px .*as the ceiling \(a ceiling at the unconstrained size paints the same as none\)/ );
} );

test( 'a px ceiling below the draft is still written as the rendered size', () => {
	const w = world( LOGO );
	assert.deepEqual( run( w, paintOf( '206px' ) ).unmapped, [] );
	assert.deepEqual( w.flat[ 0 ].attributes.maxWidth, { desktop: '279.5px', tablet: '247.05px', mobile: '238.22px' } );
} );

test( 'MUST FAIL: a setting that would hold a ceiling narrower than the draft\'s box is refused and the row stays', () => {
	const w = world( LOGO );
	const r = run( w, paintOf( '200px' ), { resolver: capped } );
	assert.equal( w.flat[ 0 ].attributes.maxWidth, undefined );
	assert.equal( r.unmapped.length, 1 );
	assert.match( r.unmapped[ 0 ].reason, /dimension: the max-width the setting would hold \(240 at 768, 240 at 1440\) is below the draft's rendered 247.05px \/ 279.5px/ );
} );

test( 'MUST FAIL: no ceiling is written when the draft\'s rendered size is unknown at a width the element is read at', () => {
	const w = world( LOGO );
	w.reads.widths[ 1440 ][ '0:' ].rect = null;
	const r = run( w, paintOf( '100%' ) );
	assert.equal( w.flat[ 0 ].attributes.maxWidth, undefined );
	assert.match( r.unmapped[ 0 ].reason, /the draft's rendered size is unknown at 1440/ );
} );

test( 'a ceiling of none, or a px ceiling above the draft, writes nothing', () => {
	for ( const v of [ 'none', '400px' ] ) {
		const w = world( LOGO );
		run( w, paintOf( v ) );
		assert.equal( w.flat[ 0 ].attributes.maxWidth, undefined, v );
	}
} );

test( 'MUST FAIL: a tier the setting carries down from a wider tier counts as the ceiling held there', () => {
	const w = world( { 375: 238.219, 768: 279.5, 1440: 279.5 } );
	const r = run( w, paintOf( '100%' ) );
	assert.deepEqual( r.unmapped, [] );
	assert.deepEqual( w.flat[ 0 ].attributes.maxWidth, { desktop: '279.5px', mobile: '238.22px' } );
} );
