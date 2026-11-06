// The state and form families. Run: node --test tests/apply-state-form.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { state } from '../lib/apply-family-state.mjs';
import { form } from '../lib/apply-family-form.mjs';
import { recordIndex } from '../lib/apply-records.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const calFor = () => null;
const target = { ref: 'cr-ref-x-1', tpl: 'Root/9#0' };
const rec = ( type, props ) => ( { id: 'TR-1', element: { dc: 'Root', template_tpl_id: '9' }, trigger: { type }, properties: props, duration_ms: 200 } );
const recordsIndex = recordIndex( [ rec( 'hover', [ { property: 'color', to: 'red' } ] ), { ...rec( 'active', [ { property: 'box-shadow', to: 'none' }, { property: 'transform', to: 'scale(0.97)' } ] ), id: 'PS-1' } ], 'Root' );
const at = ( f ) => ( { 1440: f } );
const hover = ( h ) => at( { styles: {}, hover: h } );
const ctx = ( o ) => ( { target, block: 'sgs/button', saved: {}, recordsIndex, calFor, db, snapshot: null, ...o } );

test( 'state: an equal hover and a motion-only difference write nothing', () => {
	const same = { color: 'rgb(1, 2, 3)', transform: 'none' };
	assert.deepEqual( state.decide( ctx( { draft: hover( same ), live: hover( same ), recordsIndex: new Map() } ) ), [] );
	const items = state.decide( ctx( { draft: hover( { transform: 'matrix(1.05,0,0,1.05,0,0)' } ), live: hover( { transform: 'none' } ), recordsIndex: new Map() } ) );
	assert.deepEqual( items, [] );
} );

test( 'state: an unreachable element is reported, never read as unchanged', () => {
	const [ item ] = state.decide( ctx( { draft: hover( { unreached: true } ), live: hover( { color: 'red' } ), recordsIndex: new Map() } ) );
	assert.equal( item.status, 'no-setting' );
} );

test( 'state: a hover colour difference becomes an op or a named gap, with a hover check', () => {
	const items = state.decide( ctx( { draft: hover( { color: 'rgb(10, 126, 168)' } ), live: hover( { color: 'rgb(0, 0, 0)' } ) } ) );
	const item = items.find( ( i ) => 'hover' === i.state );
	assert.ok( item );
	if ( 'op' === item.status ) {
		assert.equal( item.checks[ 0 ].state, 'hover' );
		assert.equal( item.record, 'TR-1' );
	} else {
		assert.equal( item.status, 'no-setting' );
	}
} );

test( 'state: a button press look is a snapshot row with the token values, never a block write', () => {
	const items = state.decide( ctx( { draft: hover( {} ), live: hover( {} ) } ) );
	const press = items.find( ( i ) => 'active' === i.state );
	assert.equal( press.status, 'no-setting' );
	assert.match( press.why, /snapshot: press look/ );
	assert.equal( press.tokens[ 'active-transform' ], 'scale(0.97)' );
	assert.equal( items.filter( ( i ) => 'op' === i.status ).length, 0 );
} );

test( 'state: a block that does not read the press tokens gets no press row', () => {
	const items = state.decide( ctx( { block: 'sgs/container', draft: hover( {} ), live: hover( {} ) } ) );
	assert.equal( items.find( ( i ) => 'active' === i.state ), undefined );
} );

const fieldOf = ( field, label ) => ( { fields: [ { field, label } ], steps: 1, focus: { 'background-color': 'rgb(255, 255, 255)' } } );
const probe = ( field = { 'background-color': 'rgb(255, 255, 255)', color: 'rgb(0, 0, 0)' }, label = { color: 'rgb(0, 0, 0)' }, focus = 'rgb(255, 255, 255)' ) => ( { probes: { ...fieldOf( field, label ), focus: { 'background-color': focus } } } );

test( 'form: identical fields write nothing; another block or no probe is skipped', () => {
	assert.deepEqual( form.decide( ctx( { block: 'sgs/form', draft: at( probe() ), live: at( probe() ) } ) ), [] );
	assert.deepEqual( form.decide( ctx( { block: 'sgs/container', draft: at( probe() ), live: at( probe( { color: 'red' } ) ) } ) ), [] );
	assert.deepEqual( form.decide( ctx( { block: 'sgs/form', draft: at( {} ), live: at( probe() ) } ) ), [] );
} );

test( 'form: a different field background and label colour reach their form settings; the focus one is in the focus state', () => {
	const draft = at( probe( { 'background-color': 'rgb(240, 240, 240)', color: 'rgb(0, 0, 0)' }, { color: 'rgb(10, 126, 168)' }, 'rgb(250, 250, 200)' ) );
	const items = form.decide( ctx( { block: 'sgs/form', draft, live: at( probe() ) } ) );
	const by = ( p ) => items.find( ( i ) => i.prop === p );
	for ( const p of [ 'fieldBackground', 'labelColour', 'fieldFocusBackground' ] ) {
		assert.ok( by( p ), p + ' in ' + items.map( ( i ) => i.prop ).join() );
	}
	assert.equal( by( 'fieldFocusBackground' ).state, 'focus' );
	assert.equal( by( 'fieldTextColour' ), undefined );
} );

test( 'form: fields that differ within the form are one no-setting row naming the values', () => {
	const draft = at( { probes: { fields: [ { field: { 'background-color': 'red' }, label: null }, { field: { 'background-color': 'blue' }, label: null } ], steps: 2, focus: null } } );
	const live = at( { probes: { fields: [ { field: { 'background-color': 'white' }, label: null } ], steps: 1, focus: null } } );
	const [ item ] = form.decide( ctx( { block: 'sgs/form', draft, live } ) );
	assert.equal( item.status, 'no-setting' );
	assert.match( item.why, /red | blue/ );
} );
