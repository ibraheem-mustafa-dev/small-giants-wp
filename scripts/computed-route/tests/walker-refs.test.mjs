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
