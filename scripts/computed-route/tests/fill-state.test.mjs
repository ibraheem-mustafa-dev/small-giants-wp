// Fill's state pass (Spec 48 FR-48-81) against the real framework DB: a state look is written through the setting that
// holds that state, focus that paints like hover is left to the hover setting, and every other look is a named gap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, settingStates, statesVocabulary } from '../lib/db.mjs';
import { fillStates, stateDrafts, stateGap } from '../lib/fill-state.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state: null, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ], ...extra } );
const cal = { elements: { '': {} }, settings: { colourTextHover: setting( 'color', { state: 'hover' } ), colourText: setting( 'color' ) } };
const at3 = ( looks ) => ( { states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { looks: { t: looks } } ] ) ) } );
const look = ( states, color ) => ( { states, declared: { color }, rendered: { color } } );
const run = ( looks ) => {
	const tree = [ { name: 'sgs/button', attributes: { className: 'cr-ref-x-0' }, innerBlocks: [] } ];
	const result = fillStates( { tree, nodes: [ { index: 0, name: 'sgs/button', targets: [ { id: 't', slot: '' } ] } ], reads: at3( looks ), calFor: () => cal, db, snapshot } );
	return { ...result, attrs: tree[ 0 ].attributes };
};

test( 'MUST FAIL WITHOUT THE STATE PASS: a hover look is written to the hover setting, never the resting one', () => {
	const r = run( [ look( [ 'hover' ], 'rgb(200, 0, 0)' ) ] );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.state ] ), [ [ 'colourTextHover', 'hover' ] ] );
	assert.ok( r.attrs.colourTextHover, 'the tree holds the value' );
	assert.equal( r.attrs.colourText, undefined, 'the resting colour is untouched' );
} );

test( 'focus that paints like hover is left to the hover setting; a different focus look is a named gap', () => {
	const like = run( [ look( [ 'hover' ], 'rgb(200, 0, 0)' ), look( [ 'focus' ], 'rgb(200, 0, 0)' ) ] );
	assert.equal( like.writes.length, 1 );
	assert.deepEqual( like.held.map( ( h ) => h.state ), [ 'focus' ] );
	const unlike = run( [ look( [ 'hover' ], 'rgb(200, 0, 0)' ), look( [ 'focus' ], 'rgb(0, 0, 200)' ) ] );
	assert.match( unlike.unmapped[ 0 ].reason, /^focus-differs/ );
} );

test( 'a state no setting holds, and a combination of states, are named gaps', () => {
	const r = run( [ look( [ 'closing' ], 'rgb(1, 1, 1)' ), look( [ 'hover', 'current' ], 'rgb(2, 2, 2)' ) ] );
	assert.deepEqual( r.unmapped.map( ( u ) => u.reason.split( ':' )[ 0 ] ).sort(), [ 'combined-state', 'no-state-setting' ] );
	assert.equal( r.writes.length, 0 );
} );

test( 'the setting states come from the DB, not a list in code', () => {
	const held = settingStates( db );
	assert.ok( held.has( 'hover' ) && held.has( 'current' ), 'hover and current are tagged today' );
	assert.equal( stateGap( 'current', held ), null );
	assert.match( stateGap( 'current', new Set( [ 'hover' ] ) ), /^no-state-setting/, 'negative control: without the DB row it is a gap' );
	assert.match( stateGap( 'active', held ), /^press/ );
} );

test( 'stateDrafts gathers each state and property across the read widths', () => {
	const d = stateDrafts( at3( [ look( [ 'hover' ], 'rgb(9, 9, 9)' ) ] ), 't' );
	assert.deepEqual( d.get( 'hover|color' ).perWidth, { 375: 'rgb(9, 9, 9)', 768: 'rgb(9, 9, 9)', 1440: 'rgb(9, 9, 9)' } );
} );

test( 'the vocabulary reader names a missing states table instead of returning nothing silently', () => {
	const v = statesVocabulary( db );
	assert.ok( v.rows.length > 0 || /no states table/.test( v.missing ) );
} );
