// Proves a setting's slot is the element its own css_element names: when one marker changes the same property on
// nested elements, an ancestor that only grows with the element (the nav root hugging its burger) is not the slot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { slotFor, WIDTHS } from '../lib/calibrate.mjs';

const WRAP = '.sgs-nav-bar-menu__toggle-wrap';
const BURGER = `${ WRAP } > .sgs-nav-bar-menu__burger`;
const ICON = `${ BURGER } > .sgs-nav-bar-menu__burger-icon`;
const row = { attr_name: 'burgerSize', css_property: 'height', css_element: 'burger', tier_shape: null, css_state: null };
const marker = { label: 'len', attrs: { burgerSize: '37px' }, expect: Object.fromEntries( WIDTHS.map( ( w ) => [ w, '37px' ] ) ) };
const at = ( map ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, Object.fromEntries( Object.entries( map ).map( ( [ p, h ] ) => [ p, { height: h } ] ) ) ] ) );

// The root, its wrapper and the burger all end at the marker's height: the ancestors hug the burger.
const def = at( { '': '44px', [ WRAP ]: '44px', [ BURGER ]: '44px', [ ICON ]: '18px' } );
const mark = at( { '': '37px', [ WRAP ]: '37px', [ BURGER ]: '37px', [ ICON ]: '18px' } );

test( 'MUST FAIL: a hugging ancestor is not the slot of a part setting', () => {
	const s = slotFor( row, marker, def, mark, { own: BURGER } );
	assert.equal( s.slot, BURGER );
	assert.deepEqual( s.slots, [ BURGER ] );
} );

test( 'MUST FAIL: without an own element the shallowest hit is still the slot (a wrapper setting)', () => {
	assert.equal( slotFor( row, marker, def, mark, { own: null } ).slot, '' );
	assert.equal( slotFor( row, marker, def, mark ).slot, '' );
} );

test( 'MUST FAIL: an own element the marker never reached leaves the ancestors as they were', () => {
	const only = at( { '': '37px', [ WRAP ]: '37px', [ BURGER ]: '44px', [ ICON ]: '18px' } );
	assert.equal( slotFor( row, marker, def, only, { own: BURGER } ).slot, '' );
} );

test( 'MUST FAIL: the own element is matched with its nth-of-type steps dropped and at any depth', () => {
	const bar = `${ ICON } > .sgs-nav-bar-menu__burger-bar:nth-of-type(2)`;
	const d = at( { '': '9px', [ ICON ]: '9px', [ bar ]: '2px' } );
	const m = at( { '': '37px', [ ICON ]: '37px', [ bar ]: '37px' } );
	const s = slotFor( { ...row, attr_name: 'burgerBarThickness', css_element: 'burger-bar' }, marker, d, m, { own: '.sgs-nav-bar-menu__burger-bar' } );
	assert.equal( s.slot, bar );
} );

test( 'MUST FAIL: a descendant of the own element that carries the value stays a slot', () => {
	const d = at( { '': '44px', [ BURGER ]: '44px', [ ICON ]: '44px' } );
	const m = at( { '': '37px', [ BURGER ]: '37px', [ ICON ]: '37px' } );
	assert.deepEqual( slotFor( row, marker, d, m, { own: BURGER } ).slots, [ BURGER, ICON ] );
} );
