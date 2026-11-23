// Spec 48 §3.2's structure presence read (FR-47-2) for a setting that chooses among numbers: sgs/nav-bar-menu's
// burgerBarCount (2 or 3 lines, no CSS property) is calibrated value by value like a layout enum, so its reading says which
// parts each value shows and hides (lib/calibrate-content.mjs::isStructureRow, structureValues, structurePresenceValues).
// Before, the structure rows took string enums only, the setting got no reading and the clone drew three lines for the
// draft's two. Plans and readings built here from the framework database, the block's own block.json and the calibration
// fixture (no site).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { contentRowsFor, planContentInstances, collectContent, isStructureRow, structureValues, structurePresenceValues } from '../lib/calibrate-content.mjs';
import { structureRowsFor, unreadOf } from '../lib/fill-unread.mjs';
import { recordFixtures } from '../lib/setting-record.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const db = openDb();
const fixture = recordFixtures()[ 'sgs/nav-bar-menu' ];
const BAR = ( n ) => `.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon > .sgs-nav-bar-menu__burger-bar:nth-of-type(${ n })`;
// A content read: every width shows the given burger bars.
const readOf = ( bars ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, Object.fromEntries( bars.map( ( n ) => [ BAR( n ), { shown: true } ] ) ) ] ) );

test( 'MUST FAIL: a choice among numbers with no CSS property is a structure row of the block, for calibration and for the unread list', () => {
	assert.ok( contentRowsFor( db, 'sgs/nav-bar-menu' ).structure.some( ( r ) => 'burgerBarCount' === r.attr_name ), 'calibration plans burgerBarCount' );
	assert.ok( structureRowsFor( db, 'sgs/nav-bar-menu' ).some( ( r ) => 'burgerBarCount' === r.attr_name ), 'Fill lists it when unread' );
	assert.deepEqual( structureValues( { attr_name: 'burgerBarCount', attr_type: 'number', enum_values: '[2, 3]' } ), [ 2, 3 ] );
} );

test( 'MUST FAIL: the plan reads each other value of burgerBarCount against the default instance, from the real schema and fixture', () => {
	const contentRows = contentRowsFor( db, 'sgs/nav-bar-menu' );
	const { instances } = planContentInstances( 'sgs/nav-bar-menu', { contentRows, variant: { variantAttr: null, variantSlots: [] }, schema: blockSchema( 'sgs/nav-bar-menu' ), fixture, ctx: {} } );
	const bars = instances.filter( ( i ) => 'burgerBarCount' === i.content?.attr );
	assert.deepEqual( bars.map( ( i ) => [ i.key, i.content.kind, i.content.value, i.attrs.burgerBarCount ] ), [ [ 'content-presence-burgerBarCount-2', 'presence', 2, 2 ] ] );
} );

test( 'MUST FAIL: the reading of burgerBarCount=2 says the third bar is removed, and Fill no longer lists the setting as unread', () => {
	const inst = { content: { attr: 'burgerBarCount', kind: 'presence', needle: null, value: 2 }, contentDef: readOf( [ 1, 2, 3 ] ), contentRead: readOf( [ 1, 2 ] ) };
	const { presence } = collectContent( [ inst ] );
	assert.deepEqual( presence, { 'burgerBarCount=2': { shows: [], hides: [ BAR( 3 ) ] } } );
	const unread = ( cal ) => unreadOf( { db, block: 'sgs/nav-bar-menu', cal, attributes: {}, slots: [] } ).filter( ( u ) => 'structure' === u.kind && u.settings.includes( 'burgerBarCount' ) );
	assert.equal( unread( { settings: {}, presence: {} } ).length, 1, 'with no reading it is named as unread, with its values' );
	assert.match( unread( { settings: {}, presence: {} } )[ 0 ].reason, /\(2, 3\)/ );
	assert.equal( unread( { settings: {}, presence } ).length, 0 );
} );

test( 'negative controls: a number with no value list, a CSS-painting number list, a string setting listing numbers and a string enum outside the structure roles stay out', () => {
	assert.equal( isStructureRow( { attr_name: 'starSize', attr_type: 'number', enum_values: null, css_property: null, role: 'select-from-enum' } ), false );
	assert.equal( isStructureRow( { attr_name: 'cols', attr_type: 'number', enum_values: '[1, 2]', css_property: 'grid-template-columns', role: 'layout' } ), false );
	assert.equal( isStructureRow( { attr_name: 'count', attr_type: 'string', enum_values: '[1, 2]', css_property: null, role: 'select-from-enum' } ), false );
	assert.equal( isStructureRow( { attr_name: 'triggerMode', attr_type: 'string', enum_values: '["icon", "text"]', css_property: null, role: 'enum-mode' } ), false );
	assert.equal( isStructureRow( { attr_name: 'hoursLayout', attr_type: 'string', enum_values: '["rows", "condensed"]', css_property: null, role: 'layout' } ), true, 'a string layout enum still is' );
	const zero = { attr_name: 'n', attr_type: 'integer', enum_values: '[0, 1]', css_property: null, role: 'enum-mode' };
	assert.deepEqual( structurePresenceValues( zero, {}, {}, { n: 1 } ), [ 0 ], 'a value of 0 is read' );
	const { instances } = planContentInstances( 'sgs/x', { contentRows: { presence: [], text: [], link: [], structure: [ zero ] }, variant: {}, schema: {}, fixture: { attributes: { n: 1 } }, ctx: {} } );
	assert.deepEqual( instances.filter( ( i ) => 'n' === i.content?.attr ).map( ( i ) => i.key ), [ 'content-presence-n-0' ], 'its instance key names the 0' );
} );
