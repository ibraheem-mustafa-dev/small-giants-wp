// Proves FR-47-6 items 6 and 7 at unit level (the planted live faults are in GAP-CHECKLIST.md section 16): the
// element path the walker stamps, its row stamping, and divergence matching. Reads the walker's own libraries.
import test from 'node:test';
import assert from 'node:assert/strict';
import { elementPath, stampRefs } from '../../parity/lib/ref-trace.mjs';
import { judgeDivergence } from '../../parity/lib/divergences.mjs';

// A minimal element: classList, tagName, parentElement, children.
const el = ( tag, cls = [], parent = null ) => {
	const e = { tagName: tag.toUpperCase(), classList: Object.assign( [ ...cls ], { contains( c ) { return this.includes( c ); } } ), parentElement: parent, children: [] };
	if ( parent ) {
		parent.children.push( e );
	}
	return e;
};

test( 'path: BEM classes from the ref element, nth-of-type only where siblings share a step', () => {
	const ref = el( 'div', [ 'sgs-container', 'cr-ref-footer-2', 'sgs-container--flex' ] );
	const inner = el( 'div', [ 'sgs-container__inner' ], ref );
	const a = el( 'p', [], inner );
	el( 'p', [], inner );
	const h = el( 'h4', [ 'sgs-heading-1a2b3c4d', 'sgs-heading', 'sgs-heading--level-4' ], inner );
	assert.equal( elementPath( ref, ref ), '' );
	assert.equal( elementPath( h, ref ), '.sgs-container__inner > .sgs-heading' );
	assert.equal( elementPath( a, ref ), '.sgs-container__inner > p:nth-of-type(1)' );
} );

test( 'stamping: text properties take the text carrier path, others the element path', () => {
	const diffs = [ { kind: 'style', key: 'font-size' }, { kind: 'style', key: 'padding-top' }, { kind: 'text', key: 'text' } ];
	stampRefs( diffs, { ref: 'cr-ref-footer-2', block: 'sgs-container', path: '.sgs-container__inner', textPath: '.sgs-container__inner > p:nth-of-type(1)' } );
	assert.equal( diffs[ 0 ].path, '.sgs-container__inner > p:nth-of-type(1)' );
	assert.equal( diffs[ 1 ].path, '.sgs-container__inner' );
	assert.equal( diffs[ 2 ].ref, undefined );
} );

test( 'MUST FAIL TO ACCEPT: a value divergence reopens when live drifts from the expected value', () => {
	const entries = [ { id: 'D-1', node: 'cr-ref-footer-3', state: '*', property: 'min-height', expected: { value: '44px' }, reason: 'tap target' } ];
	const ctx = { state: 'opening', width: 1440 };
	assert.match( judgeDivergence( entries, ctx, { key: 'min-height', ref: 'cr-ref-footer-3', live: '44px', draft: '21px' }, 0.5 ), /D-1/ );
	const drifted = { key: 'min-height', ref: 'cr-ref-footer-3', live: '40px', draft: '21px' };
	assert.equal( judgeDivergence( entries, ctx, drifted, 0.5 ), null );
	assert.equal( drifted.draft, '44px (D-1)' );
} );

// The identity transform paints exactly as none (a finished reveal leaves matrix(1, 0, 0, 1, 0, 0) on one side): no
// row. Any other matrix still compares (About and Lenses read 56 and 24 identity rows on 2026-10-03).
import { sameValue } from '../../parity/lib/compare.mjs';

test( 'the identity matrix and none are the same transform', () => {
	assert.equal( sameValue( 'transform', 'matrix(1, 0, 0, 1, 0, 0)', 'none', 0.5 ), true );
	assert.equal( sameValue( 'transform', 'none', 'matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)', 0.5 ), true );
} );

test( 'MUST FAIL TO MATCH: a lift, a half-pixel shift or a scale is still a difference', () => {
	assert.equal( sameValue( 'transform', 'matrix(1, 0, 0, 1, 0, -3)', 'none', 0.5 ), false );
	assert.equal( sameValue( 'transform', 'matrix(1, 0, 0, 1, 0, 0.5)', 'none', 0.5 ), false );
	assert.equal( sameValue( 'transform', 'matrix(1.02, 0, 0, 1.02, 0, -1)', 'none', 0.5 ), false );
} );

// F1: a pair's place in the page's flow. About at 1440 (2026-10-03): the eyebrow sat at y 168 on the draft and 225 on
// live (the page container's 104px top padding against the draft's 48px), and no row reported it.
import { flowOffsets } from '../../parity/lib/compare-state.mjs';

const at = ( y, h = 20 ) => ( { box: { x: 222, y, w: 400, h } } );
const flowPairs = [ { name: 'eyebrow' }, { name: 'name' }, { name: 'intro' } ];
const draftSnap = { eyebrow: at( 168 ), name: at( 200 ), intro: at( 260 ) };

test( 'MUST FAIL TO MISS: a whole page sitting 57px low is one row, on the first pair, from the top of main', () => {
	const live = { eyebrow: at( 225 ), name: at( 257 ), intro: at( 317 ) };
	const out = flowOffsets( flowPairs, draftSnap, live, { draft: 120, live: 120 }, { box: 2 } );
	assert.deepEqual( out, { eyebrow: [ { kind: 'box', key: 'y-in-main', draft: 48, live: 105 } ] } );
} );

test( 'a gap that changes between two pairs is one row on the later pair; a matching page has none', () => {
	const live = { eyebrow: at( 168 ), name: at( 216 ), intro: at( 276 ) };
	assert.deepEqual( flowOffsets( flowPairs, draftSnap, live, { draft: 120, live: 120 }, { box: 2 } ), { name: [ { kind: 'box', key: 'y-after-eyebrow', draft: 32, live: 48 } ] } );
	assert.deepEqual( flowOffsets( flowPairs, draftSnap, { ...draftSnap }, { draft: 120, live: 120 }, { box: 2 } ), {} );
} );

test( 'a pair with a configured anchor keeps its own distance row and gets no flow row', () => {
	const live = { eyebrow: at( 225 ), name: at( 257 ), intro: at( 317 ) };
	assert.deepEqual( flowOffsets( [ { name: 'eyebrow', anchor: 'x' }, ...flowPairs.slice( 1 ) ], draftSnap, live, { draft: 120, live: 120 }, { box: 2 } ), {} );
} );
