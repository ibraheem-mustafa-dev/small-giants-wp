// A discovered property every value of the setting paints alike (lib/resolve.mjs::valueBlind). A split hero's content column
// reads min-width 0px under layout flex, stack and grid alike (a side effect of the setting being on), and the draft's
// own 0px there was answered `layout: stack` by the sibling tie-break; stack's column rule then beat the hero's grid and the
// two-column hero printed as a stack (an Indus homepage, 2026-11-19). The calibration below is the hero's discovery.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDiscovered, valueBlind } from '../lib/resolve.mjs';

const THREE = [ 375, 768, 1440 ];
const every = ( v ) => Object.fromEntries( THREE.map( ( w ) => [ w, v ] ) );
const CONTENT = '.sgs-hero__content';
const cal = {
	elements: { '': every( { display: 'grid' } ), [ CONTENT ]: every( { 'min-width': 'auto', 'min-height': 'auto', 'flex-direction': 'row' } ) },
	discovered: { layout: {
		'min-width': { slots: [ CONTENT ], values: { flex: every( '0px' ), stack: every( '0px' ), grid: every( '0px' ) } },
		'min-height': { slots: [ CONTENT ], values: { flex: every( '0px' ), stack: every( '0px' ), grid: every( '0px' ) } },
		'flex-direction': { slots: [ CONTENT ], values: { stack: every( 'column' ) } },
		display: { slots: [ '' ], values: { flex: every( 'flex' ), stack: every( 'flex' ), grid: every( 'grid' ) } },
	} },
};
// The content column as the draft renders it: a column flex item that reads min-width 0px.
const siblings = { 'flex-direction': every( 'column' ), 'min-height': every( '0px' ) };
const ask = ( prop, perWidth, sib = siblings, c = cal ) => resolveDiscovered( { slot: CONTENT, prop, perWidth, siblings: sib }, c );

test( 'MUST FAIL: a property all three layout values paint alike never writes a layout value', () => {
	const r = ask( 'min-width', every( '0px' ) );
	assert.ok( ! r?.writes, `wrote ${ JSON.stringify( r?.writes ) }` );
	assert.ok( ! ask( 'min-height', every( '0px' ) )?.writes );
} );

test( 'MUST FAIL: valueBlind is true for three identical records and false for fewer, differing or empty ones', () => {
	assert.equal( valueBlind( cal.discovered.layout[ 'min-width' ] ), true );
	assert.equal( valueBlind( cal.discovered.layout.display ), false, 'grid paints apart' );
	assert.equal( valueBlind( cal.discovered.layout[ 'flex-direction' ] ), false, 'one recorded value' );
	assert.equal( valueBlind( { values: { flex: every( '0px' ), stack: every( '0px' ) } } ), false, 'two identical values still decide' );
	assert.equal( valueBlind( undefined ), false );
	assert.equal( valueBlind( { values: {} } ), false );
} );

test( 'negative control: a property one value alone paints, and a display that tells grid from flex and stack, still write', () => {
	assert.deepEqual( ask( 'flex-direction', every( 'column' ) ).writes, [ { attr: 'layout', value: 'stack', merge: 'replace' } ] );
	const grid = resolveDiscovered( { slot: '', prop: 'display', perWidth: every( 'grid' ), siblings: {} }, cal );
	assert.deepEqual( grid.writes, [ { attr: 'layout', value: 'grid', merge: 'replace' } ] );
} );

test( 'negative control: a value-blind record whose three values differ at one width is not blind', () => {
	const c = { ...cal, discovered: { layout: { 'min-width': { slots: [ CONTENT ], values: { flex: every( '0px' ), stack: every( '0px' ), grid: { ...every( '0px' ), 1440: '12px' } } } } } };
	assert.equal( valueBlind( c.discovered.layout[ 'min-width' ] ), false );
	assert.deepEqual( ask( 'min-width', { 1440: '12px' }, {}, c ).writes, [ { attr: 'layout', value: 'grid', merge: 'replace' } ] );
} );
