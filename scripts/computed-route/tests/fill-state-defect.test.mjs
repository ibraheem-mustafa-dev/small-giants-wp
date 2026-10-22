// FR-48-69: a state declaration the draft never paints (intake.json `draftDefects`: a `style-hover` value whose binding the
// runtime leaves unresolved, so the declaration is dropped) is built from the code value the fact record's logic reader
// resolved, written through the setting that holds the state by lib/fill-state.mjs::fillStates, and listed. Run against the
// real framework DB. MUST FAIL: without lib/fill-state-defect.mjs the hover colour is never written.
import test from 'node:test';
import assert from 'node:assert/strict';
import { addDefectLooks, droppedStateDecls, holeValue } from '../lib/fill-state-defect.mjs';
import { fillStates } from '../lib/fill-state.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
// The shape of intake's defect group for Indus (rows hold the evidence).
const DEFECTS = [ { rowId: 'g', draftId: 'Page:87', rows: [
	{ draftId: 'Page:87', test: 'unresolved-binding', kind: 'style-hover', verdict: 'dropped', evidence: { pseudo: 'hover', declared: 'transform:translateY(-6px);color:{{ card.textColor }}', decls: [ { prop: 'color', declared: '{{ card.textColor }}', compiled: '', state: 'dropped' }, { prop: 'transform', declared: 'translateY(-6px)', compiled: 'translateY(-6px)', state: 'compiled' } ] } },
	{ draftId: 'Page:90', test: 'unreached', kind: 'style-hover', verdict: 'dropped', evidence: { pseudo: 'hover', decls: [ { prop: 'color', declared: '{{ x }}', compiled: '', state: 'dropped' } ] } },
] } ];
const answer = ( ...strings ) => ( { v: strings.map( ( v ) => ( { t: 'string', v } ) ), n: strings.length, loop: true } );
const factsWith = ( holes ) => ( { elements: { 'Page/87': { template: { holes: [ { id: 'style-hover:color#3', where: 'style-hover:color', expr: 'card.textColor' }, { id: 'style-hover:transform#2', where: 'style-hover:transform' } ] }, logic: { holes } } } } );
const HOLES = { 'style-hover:color#3': { 375: answer( '#ffffff', '#00cc00' ), 768: answer( '#ffffff', '#00cc00' ), 1440: answer( '#ffffff', '#00cc00' ) } };
const readsOf = () => ( { states: Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, { looks: {} } ] ) ) } );
const JOBS = [ { id: '0:', finder: { tpl: 'Page/87#1' } } ];
const run = ( over = {} ) => {
	const reads = readsOf();
	const r = addDefectLooks( { reads, jobs: JOBS, facts: factsWith( HOLES ), draftDefects: DEFECTS, rootComponent: 'Page', ...over } );
	return { reads: over.reads || reads, ...r };
};

test( 'only a dropped declaration of an unresolved-binding row is a state declaration to build', () => {
	assert.deepEqual( droppedStateDecls( DEFECTS ), [ { draftId: 'Page:87', pseudo: 'hover', prop: 'color', declared: '{{ card.textColor }}' } ] );
	assert.deepEqual( droppedStateDecls( [] ), [] );
} );

test( 'a hole resolves to one string for the copy Fill reads; undefined, an error or a missing copy is a gap', () => {
	assert.deepEqual( holeValue( answer( 'a', 'b' ), 1 ), { value: 'b' } );
	assert.deepEqual( holeValue( { v: [ { t: 'string', v: 'x' } ], n: 1, loop: false }, 3 ), { value: 'x' }, 'outside a loop there is one value' );
	assert.match( holeValue( { v: [ { t: 'undefined' } ], loop: true }, 0 ).gap, /undefined/ );
	assert.match( holeValue( { err: 'boom', v: [] }, 0 ).gap, /boom/ );
	assert.match( holeValue( answer( 'a' ), 4 ).gap, /no value for copy 4/ );
} );

test( 'MUST FAIL WITHOUT THE DEFECT PATH: the dropped hover colour becomes a code look of the copy Fill reads, and is listed', () => {
	const { reads, listed, gaps } = run();
	assert.deepEqual( gaps, [] );
	for ( const w of [ 375, 768, 1440 ] ) {
		const look = reads.states[ w ].looks[ '0:' ];
		assert.equal( look.length, 1 );
		assert.deepEqual( [ look[ 0 ].states, look[ 0 ].declared, look[ 0 ].read, look[ 0 ].rendered, look[ 0 ].draftDefect ], [ [ 'hover' ], { color: '#00cc00' }, 'code', null, 'Page:87' ] );
	}
	assert.deepEqual( listed.map( ( d ) => [ d.draftId, d.state, d.prop, d.built ] ), [ [ 'Page:87', 'hover', 'color', { 375: '#00cc00', 768: '#00cc00', 1440: '#00cc00' } ] ] );
} );

test( 'MUST FAIL WITHOUT THE WRITE: fillStates writes the built hover colour to the setting that holds it, marked as a draft defect', () => {
	const { reads } = run();
	const setting = ( property, state ) => ( { slot: '', slots: [ '' ], reaches: [ '' ], property, state, forms: [], transform: null, reachedAt: [ 375, 768, 1440 ], effects: [], variants: [ 0 ] } );
	const rows = db.prepare( "SELECT attr_name, css_property, css_state FROM block_attributes WHERE block_slug = 'sgs/button' AND attr_name = 'colourTextHover'" ).all();
	const cal = { elements: { '': {} }, settings: Object.fromEntries( rows.map( ( r ) => [ r.attr_name, setting( r.css_property, r.css_state ) ] ) ) };
	const tree = [ { name: 'sgs/button', attributes: { className: 'cr-ref-d-0' }, innerBlocks: [] } ];
	const nodes = [ { index: 0, name: 'sgs/button', targets: [ { id: '0:', slot: '' } ] } ];
	const res = fillStates( { tree, nodes, reads, calFor: () => cal, db, snapshot } );
	assert.equal( res.writes.length, 1, JSON.stringify( res.unmapped ) );
	assert.deepEqual( [ res.writes[ 0 ].attr, res.writes[ 0 ].state, res.writes[ 0 ].read, res.writes[ 0 ].draftDefect ], [ 'colourTextHover', 'hover', 'code', 'Page:87' ] );
	assert.equal( tree[ 0 ].attributes.colourTextHover, res.writes[ 0 ].after );
} );

test( 'a look the page did paint is kept as read; an unresolved binding, a missing hole or an unrelated row builds nothing', () => {
	const reads = readsOf();
	reads.states[ 375 ].looks[ '0:' ] = [ { states: [ 'hover' ], declared: { color: 'rgb(1, 2, 3)' }, rendered: { color: 'rgb(1, 2, 3)' }, read: 'entered' } ];
	run( { reads } );
	assert.equal( reads.states[ 375 ].looks[ '0:' ].length, 1, 'the entered look stands' );
	assert.equal( reads.states[ 768 ].looks[ '0:' ].length, 1 );
	const none = run( { facts: factsWith( { 'style-hover:color#3': { 375: { v: [ { t: 'undefined' } ], loop: true }, 768: answer( '#fff', '#eee' ), 1440: answer( '#fff', '#eee' ) } } ) } );
	assert.equal( none.gaps.length, 1 );
	assert.equal( none.gaps[ 0 ].width, 375 );
	assert.equal( none.reads.states[ 375 ].looks[ '0:' ], undefined );
	const noHole = run( { facts: { elements: { 'Page/87': { template: { holes: [] }, logic: { holes: {} } } } } } );
	assert.match( noHole.gaps[ 0 ].reason, /no hover binding for color/ );
	const other = run( { jobs: [ { id: '1:', finder: { tpl: 'Page/12#0' } } ] } );
	assert.deepEqual( [ other.listed, other.gaps ], [ [], [] ] );
	assert.deepEqual( run( { draftDefects: [] } ).listed, [] );
} );
