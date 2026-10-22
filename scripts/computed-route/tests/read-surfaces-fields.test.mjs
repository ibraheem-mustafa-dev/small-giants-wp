// Spec 48 FR-48-7, lib/read-surfaces.mjs: the surfaces.json fields beyond the roots and the sc-if lists reach the
// record as stated: each state's `state_keys` and `animation_ids`, whether the element is in the state's
// `sc_if_tpl_ids`, the record's `closed_by`, `time_dependent` and `unresolved`, and a page record's `blocks`.
// Mutations: tests/fixtures/read-surfaces-fields/mutations.json (tools/mutate.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readSurfaces } from '../lib/read-surfaces.mjs';

// Header H (tpl 1) holds a CTA (2) and a nav (3) under it; the CTA is the only element the "scrolled" state lists.
const element = ( n, parentChain ) => ( { n: String( n ), parentChain } );
const template = {
	order: [ 'Home/1', 'Home/2', 'Home/3', 'Home/9' ],
	elements: { 'Home/1': element( 1, [] ), 'Home/2': element( 2, [ 'Home/1' ] ), 'Home/3': element( 3, [ 'Home/1' ] ), 'Home/9': element( 9, [] ) },
};
const records = [
	{
		id: 'S-01', kind: 'header', name: 'Header', dc: 'Home', template_tpl_id: '1', route: '*', parent: null, closed_by: 'never',
		time_dependent: { value: true, reason: 'polls the width' }, unresolved: 'the sticky offset',
		states: [
			{ name: 'scrolled', state_keys: { scrolled: true, w: '>= 1024' }, sc_if_tpl_ids: [ '2' ], animation_ids: [ 'J-02' ] },
			{ name: 'hover', state_keys: {} },
		],
	},
	{ id: 'S-02', kind: 'page', name: 'home', dc: 'Home', template_tpl_id: '9', route: '/', parent: null, closed_by: 'navigating away', time_dependent: { value: false, reason: '' }, blocks: [ 'hero', 'cards' ], states: [] },
	{ id: 'S-03', kind: 'page', name: 'empty', dc: 'Home', template_tpl_id: null, route: '/empty', parent: null, closed_by: 'never', time_dependent: { value: false, reason: '' }, blocks: [], states: [] },
];
const out = readSurfaces( { records, template } );
const member = ( key, id = 'S-01' ) => out.byElement[ key ].find( ( m ) => m.id === id );

test( 'MUST FAIL (state fields): the element a state lists is marked in that state and its sibling is not', () => {
	const cta = member( 'Home/2' );
	assert.deepEqual( cta.states.map( ( s ) => [ s.name, s.in_sc_if ] ), [ [ 'scrolled', true ] ] );
	assert.deepEqual( cta.otherStates.map( ( s ) => [ s.name, s.in_sc_if ] ), [ [ 'hover', false ] ] );
	const nav = member( 'Home/3' );
	assert.deepEqual( nav.states, [], 'the sibling is in no state\'s sc-if list' );
	assert.deepEqual( nav.otherStates.map( ( s ) => [ s.name, s.in_sc_if ] ), [ [ 'scrolled', false ], [ 'hover', false ] ] );
} );

test( 'MUST FAIL (state fields): state_keys and animation_ids are carried as stated', () => {
	const [ scrolled ] = member( 'Home/2' ).states;
	assert.deepEqual( scrolled.state_keys, { scrolled: true, w: '>= 1024' } );
	assert.deepEqual( scrolled.animation_ids, [ 'J-02' ] );
	assert.deepEqual( member( 'Home/3' ).otherStates[ 1 ], { name: 'hover', state_keys: {}, in_sc_if: false, animation_ids: [] } );
	assert.deepEqual( out.surfaces[ 'S-01' ].states[ 0 ].animation_ids, [ 'J-02' ] );
} );

test( 'MUST FAIL (record fields): closed_by, time_dependent and unresolved reach the surface and every member', () => {
	for ( const m of [ member( 'Home/1' ), member( 'Home/3' ) ] ) {
		assert.equal( m.closed_by, 'never' );
		assert.deepEqual( m.time_dependent, { value: true, reason: 'polls the width' } );
		assert.equal( m.unresolved, 'the sticky offset' );
	}
	assert.equal( out.surfaces[ 'S-01' ].closed_by, 'never' );
	assert.deepEqual( out.surfaces[ 'S-01' ].time_dependent, { value: true, reason: 'polls the width' } );
	assert.equal( out.surfaces[ 'S-02' ].unresolved, null, 'an absent field stays null' );
	assert.equal( member( 'Home/9', 'S-02' ).closed_by, 'navigating away' );
} );

test( 'MUST FAIL (pages): each page record lists its blocks with its route, a record without blocks is no page entry', () => {
	assert.deepEqual( out.pages, [ { surface: 'S-02', route: '/', blocks: [ 'hero', 'cards' ] }, { surface: 'S-03', route: '/empty', blocks: [] } ] );
	assert.ok( ! out.pages.some( ( p ) => p.surface === 'S-01' ) );
} );
