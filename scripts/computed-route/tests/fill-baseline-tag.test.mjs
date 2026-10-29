// Register C2 PI-5: the baseline an inherited property is judged against is what the node's own tag shows on the site, not
// the calibration fixture's tag (lib/fill-resolve-state.mjs::baselineFn). A heading calibrated as an h4 and written with
// the block's default level (h2) renders the theme's h2 style; the fixture's h4 paint is never its baseline.
import test from 'node:test';
import assert from 'node:assert/strict';
import { baselineFn } from '../lib/fill-resolve-state.mjs';
import { pageBaseline } from '../lib/fill-page.mjs';

// A theme that sizes every heading with a fluid clamp() and sets the h4 at a fixed 20px with its own weight.
const RAW = { settings: {}, styles: { typography: { fontSize: '16px' }, elements: { heading: { typography: { fontSize: 'clamp(32px, 4vw, 46px)' } }, h4: { typography: { fontSize: '20px', fontWeight: '500' } } } } };
const HEADING = { elements: { '': { 1440: { _tag: 'h4', '_own:font-size': '20px', '_own:font-weight': '500', _fs: '20px' }, 375: { _tag: 'h4', '_own:font-size': '20px', _fs: '20px' } }, '.sgs-heading__text': { 1440: { _tag: 'h4', '_own:font-size': '17px', _fs: '17px' } } } };

function state( attributes = {}, name = 'sgs/heading' ) {
	return {
		page: ( tag ) => pageBaseline( RAW, tag ),
		flat: [ { attributes } ],
		nodes: [ { index: 0, parent: null, name } ],
		shown: new Map(),
	};
}

test( 'MUST FAIL: a heading written with the block default level (h2) is not judged against the fixture h4\'s 20px', () => {
	const st = state();
	const base = baselineFn( st, st.nodes[ 0 ], HEADING, 'font-size', () => 20 );
	assert.equal( base( '', 1440 ), undefined, 'the theme sets an h2 size the route cannot evaluate (a clamp), so no baseline equals the draft 20px' );
	assert.equal( base( '', 375 ), undefined );
	// The h4's own weight (500) is the fixture's theme paint, not the h2's, which the theme leaves unset.
	const weight = baselineFn( st, st.nodes[ 0 ], HEADING, 'font-weight' );
	assert.notEqual( weight( '', 1440 ), '500' );
} );

test( 'negative control: the same tag as the fixture, a paint the theme does not set on the fixture tag, and an inner part keep the fixture paint', () => {
	const same = state( { level: 'h4' } );
	assert.equal( baselineFn( same, same.nodes[ 0 ], HEADING, 'font-size', () => 20 )( '', 1440 ), '20px', 'an h4 node is the fixture\'s tag' );
	const st = state();
	assert.equal( baselineFn( st, st.nodes[ 0 ], { elements: { '': { 1440: { _tag: 'h4', '_own:letter-spacing': '0.5px' } } } }, 'letter-spacing' )( '', 1440 ), '0.5px', 'the theme sets no letter spacing on h4, so the fixture paint is the block\'s own' );
	assert.equal( baselineFn( st, st.nodes[ 0 ], HEADING, 'font-size', () => 17 )( '.sgs-heading__text', 1440 ), '17px', 'a part inside the block keeps its own paint: the node\'s tag is not that element\'s' );
	assert.equal( baselineFn( state( { level: 'h2' } ), { index: 0, parent: null, name: 'sgs/heading' }, HEADING, 'font-size', () => 20 )( '', 1440 ), undefined, 'a written level decides the same way as the default one' );
} );

test( 'a block with no level or tag default falls back to the tag calibration saw', () => {
	const st = state( {}, 'sgs/text' );
	const cal = { elements: { '': { 1440: { _tag: 'h4', '_own:font-size': '20px' } } } };
	assert.equal( baselineFn( st, st.nodes[ 0 ], cal, 'font-size', () => 20 )( '', 1440 ), '20px', 'the fixture tag is the node tag, so the fixture paint stands' );
	const unowned = { elements: { '': { 1440: { _tag: 'h4' } } } };
	assert.equal( baselineFn( st, st.nodes[ 0 ], unowned, 'font-weight' )( '', 1440 ), '500', 'with no own paint the fixture tag still decides which theme element style applies' );
} );
