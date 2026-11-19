// Spacing ownership with a child whose own draft element is not drawn at a width but which holds a block drawn there
// (lib/fill-resolve-state.mjs::planSpacing): a header's compact-bar wrapper the menu block was placed into (lib/skeleton-part-slots.mjs::placePart)
// renders the menu at desktop, where the wrapper's own element is hidden. The child stands at that width as the box of its
// drawn descendants, so the gaps are measured between the three boxes the page lays out, not across the missing one.
import test from 'node:test';
import assert from 'node:assert/strict';
import { planSpacing } from '../lib/fill-resolve-state.mjs';
import { READ_WIDTHS } from '../lib/fill-read.mjs';

// Node 0 is the row; 1 (logo), 2 (the wrapper, holding node 4, the menu, and node 5, a label before it), 3 (icons) its children.
// At every read width the logo is 0-180, the label 204-264 and the menu 300-1056 (together 204-1056) and the icons 1080-1240
// (24px gaps, declared 24px); the wrapper's own element is missing.
const box = ( x, w ) => ( { x, y: 0, w, h: 84 } );
function world( { menuDrawn = true, declared = '24px' } = {} ) {
	const kids = { 0: [ 1, 2, 3 ], 2: [ 4, 5 ] };
	const nodes = [ 0, 1, 2, 3, 4, 5 ].map( ( i ) => ( { index: i, name: 'sgs/container', targets: [ { id: `${ i }:`, slot: '' } ], children: kids[ i ] || [] } ) );
	const at = { '0:': { rect: box( 0, 1240 ) }, '1:': { rect: box( 0, 180 ), inFlow: true }, '2:': { missing: true }, '3:': { rect: box( 1080, 160 ), inFlow: true }, '4:': menuDrawn ? { rect: box( 300, 756 ), inFlow: true } : { missing: true }, '5:': menuDrawn ? { rect: box( 204, 60 ), inFlow: true } : { missing: true } };
	return {
		nodes,
		flat: nodes.map( ( n ) => ( { name: n.name, attributes: { className: `n${ n.index }` } } ) ),
		calFor: () => null,
		reads: { widths: Object.fromEntries( READ_WIDTHS.map( ( w ) => [ w, at ] ) ), declared: Object.fromEntries( READ_WIDTHS.map( ( w ) => [ w, { '0:': { display: 'grid', 'column-gap': declared } } ] ) ) },
		out: { spacing: [] }, gapSet: new Map(), margins: new Map(),
	};
}

test( 'MUST FAIL: a child whose own element is not drawn but which holds a drawn block stands as that block\'s box, so the declared 24px gap is confirmed', () => {
	const st = world();
	planSpacing( st, st.nodes[ 0 ] );
	assert.equal( st.gapSet.get( '0|column-gap' )[ 1440 ], '24px' );
	assert.equal( st.out.spacing.find( ( s ) => 1440 === s.width ).count, 3, 'three boxes laid out' );
} );

test( 'a child with nothing drawn inside it stays out of the measurement (the gap is measured between the others, as before)', () => {
	const st = world( { menuDrawn: false, declared: '896px' } );
	planSpacing( st, st.nodes[ 0 ] );
	assert.equal( st.out.spacing.find( ( s ) => 1440 === s.width ).count, 2 );
	assert.equal( st.gapSet.get( '0|column-gap' )[ 1440 ], '900px', 'the rendered gap between logo and icons' );
} );
