// Register C2 RL-4: the side gutter a block wrapper adds to its root (`has-global-padding`, SGS_Container_Wrapper) survives a
// draft padding of 0 because the calibrated default paint (0, measured where the gutter is nested away) judged it equal.
// The judge is lib/fill-prop.mjs::resolveProperty over lib/fill-resolve-state.mjs::baselineFn's value; a block whose
// padding paints its content band has no known baseline for its root's side padding, so a draft 0 differs and is written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { baselineFn } from '../lib/fill-resolve-state.mjs';
import { tiersDiffering } from '../lib/fill-prop.mjs';

const CAL = { elements: { '': { 1440: { 'padding-left': '0px', 'padding-right': '0px', 'padding-top': '0px' }, 768: { 'padding-left': '0px' }, 375: { 'padding-left': '0px' } }, '.sgs-container__inner': { 1440: { 'padding-left': '0px' } } } };
function state( name, attributes = {} ) {
	return { page: () => ( { own: () => false, value: () => undefined } ), flat: [ { attributes } ], nodes: [ { index: 0, parent: null, name } ], shown: new Map() };
}
const baseline = ( name, attributes, prop, slot = '' ) => {
	const st = state( name, attributes );
	return baselineFn( st, st.nodes[ 0 ], CAL, prop )( slot, 1440 );
};

test( 'MUST FAIL: a container root\'s side padding has no known baseline, so a draft 0 is written over the gutter', () => {
	assert.equal( baseline( 'sgs/container', {}, 'padding-left' ), undefined, 'the default content width has a band, so the root takes the gutter' );
	assert.equal( baseline( 'sgs/container', {}, 'padding-right' ), undefined );
	const st = state( 'sgs/container' );
	const base = baselineFn( st, st.nodes[ 0 ], CAL, 'padding-left' );
	assert.deepEqual( tiersDiffering( 'padding-left', { 1440: '0px', 768: '0px', 375: '0px' }, ( w ) => base( '', w ) ), { 1440: '0px' }, 'a draft 0 differs from an unknown baseline' );
	assert.equal( baseline( 'sgs/container', { contentWidth: { desktop: 'wide' } }, 'padding-left' ), undefined, 'a stated band width keeps it' );
} );

test( 'negative control: other sides, other elements, a full-bleed block and a block with no band keep the calibrated paint', () => {
	assert.equal( baseline( 'sgs/container', {}, 'padding-top' ), '0px', 'only the side padding takes the gutter' );
	assert.equal( baseline( 'sgs/container', {}, 'padding-left', '.sgs-container__inner' ), '0px', 'the band itself carries no gutter' );
	assert.equal( baseline( 'sgs/container', { contentWidth: { desktop: 'full', tablet: 'full' } }, 'padding-left' ), '0px', 'a full-bleed content width takes no gutter' );
	assert.equal( baseline( 'sgs/container', { contentWidth: '' }, 'padding-left' ), '0px' );
	assert.equal( baseline( 'sgs/text', {}, 'padding-left' ), '0px', 'a block whose padding does not paint a content band has no wrapper gutter' );
	const st = state( 'sgs/container' );
	const base = baselineFn( st, st.nodes[ 0 ], CAL, 'padding-left' );
	assert.deepEqual( tiersDiffering( 'padding-left', { 1440: '40px' }, ( w ) => base( '', w ) ), { 1440: '40px' }, 'a stated gutter value is still written' );
} );
