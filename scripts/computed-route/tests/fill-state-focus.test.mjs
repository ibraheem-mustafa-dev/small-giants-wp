// Fill's state pass and keyboard focus (Spec 48 FR-48-81, plan decision 1 of 2026-10-24) against the real framework DB: an
// element that takes the ring and declares no focus outline gets the browser's ring tokens, its auto style and ringOnly; a
// hover look written to a setting that also paints focus sets sgsFocusRests where the draft keeps its resting look on
// focus; and the state pass compares context-decided keywords (text-align start, min-height auto) in the element's context.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { fillStates, holdDefaults, defaultStateLook, focusSharesHover, stateContext } from '../lib/fill-state.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const WIDTHS = [ 375, 768, 1440 ];
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: WIDTHS, effects: [], variants: [ 0 ], ...extra } );
const look = ( states, declared ) => ( { states, declared, rendered: declared } );
const readsOf = ( looks, snap = null, declared = null ) => ( {
	states: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { looks: { t: looks } } ] ) ),
	...( snap ? { widths: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { t: snap } ] ) ) } : {} ),
	...( declared ? { declared: Object.fromEntries( WIDTHS.map( ( w ) => [ w, { t: declared } ] ) ) } : {} ),
} );
const run = ( block, cal, looks, snap, declared = null ) => {
	const tree = [ { name: block, attributes: { className: 'cr-ref-x-0' }, innerBlocks: [] } ];
	return fillStates( { tree, nodes: [ { index: 0, name: block, targets: [ { id: 't', slot: '' } ] } ], reads: readsOf( looks, snap, declared ), calFor: () => cal, db, snapshot } );
};
const plainCal = { elements: { '': {} }, settings: { textColour: setting( 'color' ) } };
const buttonCal = { elements: { '': {} }, settings: { colourTextHover: setting( 'color', { state: 'hover' } ), colourText: setting( 'color' ) } };

test( 'MUST FAIL WITHOUT THE RING WIRING: a link with no focus outline writes the browser ring\'s width, colour and offset, and raises its auto style as pending', () => {
	const r = run( 'sgs/text', plainCal, [], { tag: 'a', href: '/x', styles: {} } );
	assert.equal( r.patch.settings?.custom?.focus?.width, '1px' );
	assert.equal( r.patch.settings.custom.focus.offset, '1px', 'a link takes the browser\'s 1px offset' );
	assert.equal( r.patch.settings.custom.focus.ring, '#101010' );
	assert.equal( r.patch.settings.custom.focus.ringOnDark, '#101010' );
	assert.equal( r.patch.settings.custom.focus.style, 'auto' );
	assert.equal( r.patch.settings.custom.focus.ringOnly, '1', 'the browser ring draws no hairline or glow' );
	assert.deepEqual( r.unmapped.filter( ( u ) => 'outline-style' === u.property && 'focus' === u.state ), [], 'the style is written, not raised' );
} );

test( 'MUST FAIL: a draft that clears the outline at rest and declares no focus look is raised as focus-invisible, with no ring written', () => {
	const r = run( 'sgs/text', plainCal, [], { tag: 'button', styles: {} }, { 'outline-style': 'none' } );
	assert.equal( r.patch.settings, undefined );
	assert.ok( r.unmapped.some( ( u ) => /^focus-invisible/.test( u.reason ) ) );
} );

test( 'MUST FAIL WITHOUT THE FOCUS-SHARES-HOVER WIRING: a hover colour written to a setting on a focusable element with no draft focus look sets sgsFocusRests', () => {
	const r = run( 'sgs/button', buttonCal, [ look( [ 'hover' ], { color: 'rgb(200, 0, 0)' } ) ], { tag: 'a', href: '/x', styles: { color: 'rgb(1, 2, 3)' } } );
	assert.ok( r.writes.some( ( w ) => 'colourTextHover' === w.attr ) );
	const rests = r.writes.filter( ( w ) => 'sgsFocusRests' === w.attr );
	assert.deepEqual( rests.map( ( w ) => [ w.after, w.state, w.prop, w.how ] ), [ [ true, 'focus', 'color', 'fill-state-focus-rests' ] ] );
	assert.ok( ! r.unmapped.some( ( u ) => /^focus-shares-hover/.test( u.reason ) ), 'the row is settled by the switch' );
} );

test( 'focus-shares-hover is not raised where the draft has a focus look, or on an element that never takes focus', () => {
	const drafts = new Map( [ [ 'focus||color', { state: 'focus', prop: 'color', pseudo: '' } ] ] );
	assert.equal( focusSharesHover( { drafts, prop: 'color', snap: { tag: 'a' }, attrs: [ 'x' ] } ), null );
	assert.equal( focusSharesHover( { drafts: new Map( [ [ 'focus-visible+hover||color', { state: 'focus-visible+hover', prop: 'color', pseudo: '' } ] ] ), prop: 'color', snap: { tag: 'a' }, attrs: [ 'x' ] } ), null );
	assert.equal( focusSharesHover( { drafts: new Map(), prop: 'color', snap: { tag: 'div' }, attrs: [ 'x' ] } ), null );
	assert.match( focusSharesHover( { drafts: new Map(), prop: 'color', snap: { tag: 'div', role: 'button' }, attrs: [ 'x' ] } ), /^focus-shares-hover/ );
	assert.match( focusSharesHover( { drafts, prop: 'background-color', snap: { tag: 'button' }, attrs: [ 'y' ] } ), /^focus-shares-hover/, 'a focus look of another property does not cover this one' );
	const same = run( 'sgs/button', buttonCal, [ look( [ 'hover' ], { color: 'rgb(200, 0, 0)' } ), look( [ 'focus' ], { color: 'rgb(200, 0, 0)' } ) ], { tag: 'a', href: '/x', styles: { color: 'rgb(1, 2, 3)' } } );
	assert.ok( ! same.unmapped.some( ( u ) => /^focus-shares-hover/.test( u.reason ) ), 'focus painted as hover in the draft too' );
} );

// A block whose hover settings govern text-align and min-height, calibrated as painting `left` and `0px` on hover.
const keywordCal = { elements: { '': {} }, settings: {
	alignHover: setting( 'text-align', { state: 'hover', look: { '': { 'text-align': { 375: 'left', 768: 'left', 1440: 'left' } } } } ),
	heightHover: setting( 'min-height', { state: 'hover', look: { '': { 'min-height': { 375: '0px', 768: '0px', 1440: '0px' } } } } ),
} };

test( 'MUST FAIL WITHOUT THE CANON CONTEXT: the state pass reads text-align start as left in an ltr element and min-height auto as 0px out of flow', () => {
	const snap = { tag: 'div', position: 'absolute', styles: { 'text-align': 'start', 'min-height': 'auto', direction: 'ltr' } };
	const reads = readsOf( [], snap );
	const rest = { 'text-align': { 1440: 'start' }, 'min-height': { 1440: 'auto' } };
	assert.deepEqual( defaultStateLook( keywordCal, 'hover', rest, stateContext( reads, 't' ).at ), {} );
	assert.deepEqual( [ ...( defaultStateLook( keywordCal, 'hover', rest )[ '' ] || [] ) ].sort(), [ 'min-height', 'text-align' ], 'without context both stay undecided and differ' );
	const node = { name: 'sgs/text', attributes: { className: 'cr-ref-x-0' }, innerBlocks: [] };
	const out = holdDefaults( { node, ref: 'cr-ref-x-0', rec: { index: 0, name: 'sgs/text' }, target: { id: 't', slot: '' }, cal: keywordCal, db, snapshot, reads, drafts: new Map(), held: new Set( [ 'hover' ] ), interaction: new Set( [ 'hover' ] ) } );
	assert.deepEqual( [ out.writes, out.unmapped ], [ [], [] ], 'the block paints what the draft rests at: nothing is held' );
	const rtl = stateContext( readsOf( [], { styles: { direction: 'rtl' } } ), 't' );
	assert.deepEqual( defaultStateLook( keywordCal, 'hover', { 'text-align': { 1440: 'start' } }, rtl.at ), { '': new Set( [ 'text-align' ] ) }, 'start is right in rtl, which differs from left' );
} );
