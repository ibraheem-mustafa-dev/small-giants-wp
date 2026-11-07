// The process steps' connector line: a gradient background writes connectorColourGradient, a dashed or dotted border writes connectorLineStyle,
// and a plain solid line writes neither (the negative controls). The timeline's rail takes the same style rule.
import assert from 'node:assert/strict';
import test from 'node:test';
import { chrome } from '../lib/apply-family-chrome.mjs';
import { recordIndex } from '../lib/apply-records.mjs';

const target = { ref: 'cr-ref-x-1', key: 'cr-ref-x-1', tpl: 'Root/9#0', owns: [], reach: [ 5 ] };
const CLEAR = 'rgba(0, 0, 0, 0)';
const NONE = { 'border-top-width': '0px', 'border-top-style': 'none', 'border-bottom-width': '0px', 'border-bottom-style': 'none' };
const GRADIENT = 'linear-gradient(90deg, rgb(216, 202, 80), rgb(46, 173, 226))';
const line = ( styles ) => ( { styles: { display: 'block', height: '2px', 'background-color': CLEAR, 'background-image': 'none', ...NONE, ...styles }, box: { w: 600, h: 2, x: 0, y: 28 } } );
const steps = { styles: { display: 'grid' }, box: { w: 800, h: 200, x: 0, y: 0 } };
const run = ( drawn, saved = {} ) => chrome.decide( {
	target, block: 'sgs/process-steps', saved, recordsIndex: recordIndex( [], 'D' ), clientData: {},
	draft: { 1440: steps, 768: steps, 375: steps }, live: { 1440: steps, 768: steps, 375: steps },
	aux: { 'Root/5#0': { 1440: drawn, 768: drawn, 375: drawn } },
} ).find( ( i ) => 'connectorLine' === i.prop )?.writes ?? [];
const attrs = ( writes ) => Object.fromEntries( writes.map( ( w ) => [ w.attr, w.unset ? undefined : w.value ] ) );

test( 'connector: a gradient line writes the gradient with hex stops and no flat colour', () => {
	const w = attrs( run( line( { 'background-image': GRADIENT } ) ) );
	assert.equal( w.connectorColourGradient, 'linear-gradient(90deg, #D8CA50, #2EADE2)' );
	assert.ok( ! ( 'connectorColour' in w ) && ! ( 'connectorLineStyle' in w ) );
} );

test( 'connector: a dashed border line writes the dashed style and its colour', () => {
	const w = attrs( run( line( { 'border-top-width': '2px', 'border-top-style': 'dashed', 'border-top-color': 'rgb(216, 202, 80)' } ) ) );
	assert.equal( w.connectorLineStyle, 'dashed' );
	assert.ok( ! ( 'connectorStyle' in w ) );
	assert.equal( w.connectorColour, '#D8CA50' );
	assert.ok( ! ( 'connectorColourGradient' in w ) );
} );

test( 'connector negative control: a solid line writes neither, and clears a stale gradient or dashed style', () => {
	const solid = line( { 'background-color': 'rgb(216, 202, 80)' } );
	const plain = attrs( run( solid ) );
	assert.ok( ! ( 'connectorColourGradient' in plain ) && ! ( 'connectorLineStyle' in plain ) );
	assert.equal( plain.connectorColour, '#D8CA50' );
	const stale = run( solid, { connectorColourGradient: GRADIENT, connectorLineStyle: 'dashed' } );
	assert.ok( stale.some( ( w ) => 'connectorColourGradient' === w.attr && w.unset ) );
	assert.ok( stale.some( ( w ) => 'connectorLineStyle' === w.attr && 'solid' === w.value ) );
} );

test( 'connector: a dotted border line writes the dotted style', () => {
	const w = attrs( run( line( { 'border-top-width': '3px', 'border-top-style': 'dotted', 'border-top-color': 'rgb(216, 202, 80)' } ) ) );
	assert.equal( w.connectorLineStyle, 'dotted' );
} );

const timeline = ( drawn, saved = {} ) => chrome.decide( {
	target, block: 'sgs/timeline', saved, recordsIndex: recordIndex( [], 'D' ), clientData: {},
	draft: { 1440: steps, 768: steps, 375: steps }, live: { 1440: steps, 768: steps, 375: steps },
	aux: { 'Root/5#0': { 1440: drawn, 768: drawn, 375: drawn } },
} ).find( ( i ) => 'connectorLineStyle' === i.prop )?.writes ?? [];

test( 'timeline rail: a dashed left border writes the dashed style, a solid rail writes nothing and clears a stale style', () => {
	const rail = { styles: { display: 'block', height: '400px', ...NONE, 'background-color': CLEAR, 'background-image': 'none', 'border-left-width': '2px', 'border-left-style': 'dashed' }, box: { w: 2, h: 400, x: 0, y: 0 } };
	assert.equal( attrs( timeline( rail ) ).connectorLineStyle, 'dashed' );
	const solid = { ...rail, styles: { ...rail.styles, 'border-left-width': '0px', 'border-left-style': 'none', 'background-color': 'rgb(216, 202, 80)' }, box: { w: 2, h: 400, x: 0, y: 0 } };
	assert.deepEqual( timeline( solid ), [] );
	assert.deepEqual( timeline( solid, { connectorLineStyle: 'dotted' } ).map( ( w ) => w.value ), [ 'solid' ] );
} );
