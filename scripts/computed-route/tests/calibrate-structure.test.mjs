// Proves Spec 48 §3.2's structure presence read (FR-47-2): an enum with no CSS property in the layout or
// select-from-enum role (business-info hoursLayout first) gets one presence instance per value, keyed `<attr>=<value>`
// in the cache file's presence map, the shape Fill's variant reading and fill-unread's structure check already consume.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { contentRowsFor, planContentInstances, structurePresenceValues, collectContent, STRUCTURE_ROLES } from '../lib/calibrate-content.mjs';
import { structureRowsFor } from '../lib/fill-unread.mjs';

const db = openDb();
const row = ( attr, values, extra = {} ) => ( { attr_name: attr, attr_type: 'string', css_property: null, role: 'layout', enum_values: JSON.stringify( values ), ...extra } );

test( 'MUST FAIL: contentRowsFor returns the structure enums the unread check lists', () => {
	const rows = contentRowsFor( db, 'sgs/business-info' );
	assert.ok( rows.structure.some( ( r ) => 'hoursLayout' === r.attr_name ), 'hoursLayout is a structure row' );
	assert.deepEqual( STRUCTURE_ROLES.slice().sort(), [ 'layout', 'select-from-enum' ] );
	for ( const r of rows.structure ) {
		assert.equal( r.css_property, null, `${ r.attr_name } paints no CSS property` );
		assert.ok( STRUCTURE_ROLES.includes( r.role ) );
	}
} );

test( 'MUST FAIL: the planned structure rows are exactly the rows fill-unread lists, for every block', () => {
	const blocks = db.prepare( 'SELECT DISTINCT block_slug b FROM block_attributes' ).all().map( ( r ) => r.b );
	let total = 0;
	for ( const b of blocks ) {
		const planned = contentRowsFor( db, b ).structure.map( ( r ) => r.attr_name ).sort();
		const listed = structureRowsFor( db, b ).map( ( r ) => r.attr_name ).sort();
		assert.deepEqual( planned, listed, `${ b }: calibration plans what Fill lists as unread` );
		total += planned.length;
	}
	assert.ok( total > 50, `a DB-derived list of ${ total } structure settings` );
} );

test( 'MUST FAIL: one presence instance per value but the empty and the resting one', () => {
	const schema = { hoursLayout: { type: 'string', enum: [ 'rows', 'condensed' ], default: 'rows' } };
	const contentRows = { presence: [], text: [], link: [], structure: [ row( 'hoursLayout', [ 'rows', 'condensed' ] ) ] };
	const { instances } = planContentInstances( 'sgs/business-info', { contentRows, variant: {}, schema, fixture: {}, ctx: {} } );
	const reads = instances.filter( ( i ) => 'hoursLayout' === i.content?.attr );
	assert.deepEqual( reads.map( ( i ) => i.content.value ), [ 'condensed' ] );
	assert.equal( reads[ 0 ].attrs.hoursLayout, 'condensed' );
	assert.equal( 'presence', reads[ 0 ].content.kind );
	assert.equal( null, reads[ 0 ].content.needle, 'presence needs no needle' );
	const three = row( 'layout', [ '', 'flex', 'stack', 'grid' ] );
	assert.deepEqual( structurePresenceValues( three, {}, {}, { layout: 'grid' } ), [ 'flex', 'stack' ], 'empty is unset and the fixture value is the baseline' );
	assert.deepEqual( structurePresenceValues( three, {}, {} ), [ 'flex', 'stack', 'grid' ], 'with no default the three real values are read' );
} );

test( 'the variant setting is not planned twice, and a non-string setting takes no marker', () => {
	const variant = { variantAttr: 'layout', variantSlots: [ { variant_value: 'list', unique_slot: 'x' } ] };
	assert.deepEqual( structurePresenceValues( row( 'layout', [ 'grid', 'list' ] ), {}, variant ), [] );
	const sizing = row( 'sgsChildSizing', [ 'fit', 'fill', 'fixed' ], { attr_type: 'object' } );
	assert.deepEqual( structurePresenceValues( sizing, {}, {} ), [] );
} );

test( 'a structure instance carries the preconditions its element needs, against its own baseline', () => {
	const schema = { showHours: { type: 'boolean', default: false }, hoursLayout: { type: 'string', enum: [ 'rows', 'condensed' ], default: 'rows' } };
	const contentRows = { presence: [], text: [], link: [], structure: [ row( 'hoursLayout', [ 'rows', 'condensed' ], { css_element: '.sgs-business-info__hours' } ) ] };
	const { instances } = planContentInstances( 'sgs/business-info', { contentRows, variant: {}, schema, fixture: {}, ctx: {} } );
	const inst = instances.find( ( i ) => 'condensed' === i.content?.value );
	assert.ok( inst, 'planned' );
	assert.ok( null === inst.baseKey || instances.some( ( i ) => i.isBase && i.baseKey === inst.baseKey ), 'its baseline exists whenever it needs one' );
} );

test( 'collectContent keys a structure value like a variant and drops a value that changes nothing', () => {
	const shown = { 1440: { '': { shown: true }, '.a': { shown: true } }, 768: { '': { shown: true } }, 375: { '': { shown: true } } };
	const after = { 1440: { '': { shown: true }, '.b': { shown: true } }, 768: { '': { shown: true } }, 375: { '': { shown: true } } };
	const out = collectContent( [
		{ content: { attr: 'hoursLayout', kind: 'presence', needle: null, value: 'condensed' }, contentDef: shown, contentRead: after },
		{ content: { attr: 'hoursLayout', kind: 'presence', needle: null, value: 'same' }, contentDef: shown, contentRead: shown },
	] );
	assert.deepEqual( out.presence, { 'hoursLayout=condensed': { shows: [ '.b' ], hides: [ '.a' ] } } );
} );
